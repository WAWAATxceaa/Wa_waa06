/**
 * =========================================================================
 * TTC Smart Meeting Room Booking System - Google Apps Script Webhook
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ (งานศูนย์ดิจิทัลและสื่อสารองค์กร)
 * =========================================================================
 * 
 * คุณสมบัติ:
 * 1. รับข้อมูลแบบทางเดียว (Web -> Google Sheet) ผ่าน doPost(e) Content-Type: text/plain
 * 2. ใช้แท็บชื่อ "การจอง" (สร้างอัตโนมัติหากยังไม่มี ห้ามอ้างอิง Sheet1)
 * 3. จองใหม่ = เพิ่มแถวใหม่ / แก้ไข ยกเลิก หรือเปลี่ยนสถานะ = ค้นหาแถวจาก Booking Code แล้วอัปเดตแถวเดิม
 * 4. บันทึก วันที่ และ เวลา เป็นข้อความ (yyyy-MM-dd, HH:mm) ไม่ให้ชีตแปลงเป็นวันที่อัตโนมัติ
 * 5. ป้องกัน Concurrency ด้วย LockService (10 วินาที)
 * 6. ป้องกัน Formula Injection: หากค่าขึ้นต้นด้วย = + - @ ให้เติม ' นำหน้า
 * 7. ตรวจสอบ Secret Token จาก Script Properties
 * 8. มีฟังก์ชัน testWrite() เพื่อกดรันทดสอบได้ทันทีใน Apps Script
 */

const SHEET_NAME = 'การจอง';

// 14 คอลัมน์หลักตามที่กำหนด + คอลัมน์เสริมสำหรับสายอนุมัติราชการ
const HEADERS = [
  'Booking Code',       // 0
  'สถานะ',              // 1
  'ห้อง',               // 2
  'วันที่',             // 3 (yyyy-MM-dd)
  'เวลาเริ่ม',          // 4 (HH:mm)
  'เวลาสิ้นสุด',        // 5 (HH:mm)
  'จำนวนผู้เข้าร่วม',    // 6
  'อุปกรณ์',            // 7
  'ชื่อผู้จอง',         // 8
  'แผนก',               // 9
  'เบอร์โทร/อีเมล',     // 10
  'หัวข้อ',             // 11
  'สร้างเมื่อ',          // 12
  'แก้ไขล่าสุด',         // 13
  'ตำแหน่งผู้จอง',       // 14 (เสริม)
  'ขั้นตอนสายอนุมัติ',   // 15 (เสริม)
  'หมายเหตุ',           // 16 (เสริม)
  'ลิงก์ไฟล์แนบ'         // 17 (เสริม)
];

/**
 * ดึงหรือสร้างแท็บ "การจอง" อัตโนมัติ (ไม่พึ่งพา Sheet1 หรือชื่อภาษาอังกฤษ)
 */
function getBookingSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // ตรวจดูว่าชีตแรกยังว่างอยู่หรือไม่ (เช่น ชีตเริ่มต้นชื่อ "ชีต1")
    const sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0 && sheets[0].getLastColumn() === 0) {
      sheet = sheets[0];
      sheet.setName(SHEET_NAME);
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }

  // หากยังไม่มีหัวตาราง ให้สร้างหัวตารางและจัดรูปแบบ
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#8B5CF6'); // ม่วง Cyber Purple
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // กำหนดคอลัมน์ วันที่, เวลาเริ่ม, เวลาสิ้นสุด ให้เป็น Plain Text (@)
    sheet.getRange(2, 4, Math.max(10, sheet.getMaxRows() - 1), 3).setNumberFormat('@');
  }

  return sheet;
}

/**
 * doPost(e): รับข้อมูลการจองใหม่ / แก้ไข / ยกเลิก / เปลี่ยนสถานะ แล้วบันทึกลง Google Sheet
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // รอคิวไม่เกิน 10 วินาที
  } catch (err) {
    return createJsonResponse({ ok: false, error: 'ระบบไม่ว่างเนื่องจากมีคำขอพร้อมกัน กรุณาลองใหม่อีกครั้ง' }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ ok: false, error: 'ไม่พบข้อมูลคำขอ (No POST data)' }, 400);
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ ok: false, error: 'รูปแบบ JSON ไม่ถูกต้อง: ' + parseErr.message }, 400);
    }

    // 1. ตรวจสอบ Secret Token กับ Script Properties (ถ้ามีการตั้งค่าไว้)
    const scriptToken = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN');
    if (scriptToken && scriptToken.trim() !== '') {
      if (!data.secretToken || String(data.secretToken).trim() !== scriptToken.trim()) {
        return createJsonResponse({ ok: false, error: 'Unauthorized: Secret Token ไม่ถูกต้อง' }, 401);
      }
    }

    // 2. รองรับการ Ping ทดสอบการเชื่อมต่อ
    if (data.action === 'ping') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = getBookingSheet(ss);
      return createJsonResponse({
        ok: true,
        message: 'เชื่อมต่อ Google Apps Script Webhook สำเร็จพร้อมใช้งาน! 🚀',
        sheetName: sheet.getName(),
        totalRows: Math.max(0, sheet.getLastRow() - 1)
      });
    }

    // 3. บันทึกหรืออัปเดตข้อมูลการจองลงแท็บ "การจอง"
    const result = writeBookingToSheet(data);
    return createJsonResponse(result);

  } catch (err) {
    return createJsonResponse({ ok: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * บันทึกแถวใหม่ หรืออัปเดตแถวเดิมตาม Booking Code
 */
function writeBookingToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getBookingSheet(ss);

  const rawBookingCode = data.bookingCode || '';
  const bookingCode = sanitizeText(rawBookingCode, 30);

  if (!bookingCode) {
    return { ok: false, error: 'ไม่พบรหัสการจอง (Missing bookingCode)' };
  }

  // แปลงสถานะเป็นภาษาไทยให้อ่านง่าย
  let statusThai = sanitizeText(data.statusThai || data.status || 'ยื่นคำขอแล้ว', 50);
  if (data.status === 'approved') statusThai = 'อนุมัติเรียบร้อย';
  else if (data.status === 'cancelled') statusThai = 'ยกเลิกคำขอ';
  else if (data.status === 'rejected') statusThai = 'ไม่อนุมัติ/ส่งกลับ';
  else if (data.status === 'pending_step2') statusThai = 'รอตรวจความพร้อมห้อง/โสตฯ (ขั้น 2)';
  else if (data.status === 'pending_step3') statusThai = 'รอรับรอง (ขั้น 3)';
  else if (data.status === 'pending_step4') statusThai = 'รอพิจารณาอนุมัติ (ขั้น 4)';

  const roomName = sanitizeText(data.otherRoomName || data.roomName || 'ไม่ระบุห้อง', 100);
  
  // บังคับให้ วันที่ และ เวลา เป็นข้อความล้วน (Plain Text) ไม่ให้ชีตแปลงเอง
  const dateStr = forcePlainText(data.date || '');
  const startTimeStr = forcePlainText(data.startTime || '');
  const endTimeStr = forcePlainText(data.endTime || '');

  const participantCount = Number(data.participantCount) || 1;
  const amenities = sanitizeText(data.amenitiesText || (Array.isArray(data.amenities) ? data.amenities.join(', ') : data.amenities) || '-', 250);
  const bookerName = sanitizeText(data.bookerName || '-', 100);
  const department = sanitizeText(data.department || '-', 100);
  const contact = sanitizeText(data.bookerContact || data.contact || '-', 100);
  const title = sanitizeText(data.title || '-', 250);
  const createdAt = sanitizeText(data.createdAt || new Date().toISOString(), 40);
  const updatedAt = sanitizeText(data.updatedAt || new Date().toISOString(), 40);

  // คอลัมน์เสริม
  const position = sanitizeText(data.bookerPosition || 'บุคลากร', 100);
  const currentStep = sanitizeText(data.currentStep ? `ขั้นตอนที่ ${data.currentStep}` : '-', 40);
  const note = sanitizeText(data.cancelledReason || data.note || data.description || '-', 250);
  const attachmentUrl = sanitizeText(data.attachmentUrl || '-', 300);

  const rowData = [
    bookingCode,       // 0: Booking Code
    statusThai,        // 1: สถานะ
    roomName,          // 2: ห้อง
    dateStr,           // 3: วันที่
    startTimeStr,      // 4: เวลาเริ่ม
    endTimeStr,        // 5: เวลาสิ้นสุด
    participantCount,  // 6: จำนวนผู้เข้าร่วม
    amenities,         // 7: อุปกรณ์
    bookerName,        // 8: ชื่อผู้จอง
    department,        // 9: แผนก
    contact,           // 10: เบอร์โทร/อีเมล
    title,             // 11: หัวข้อ
    createdAt,         // 12: สร้างเมื่อ
    updatedAt,         // 13: แก้ไขล่าสุด
    position,          // 14: ตำแหน่งผู้จอง
    currentStep,       // 15: ขั้นตอนสายอนุมัติ
    note,              // 16: หมายเหตุ
    attachmentUrl      // 17: ลิงก์ไฟล์แนบ
  ];

  const lastRow = sheet.getLastRow();
  let targetRow = -1;

  // ค้นหาแถวเดิมจาก Booking Code (คอลัมน์ A) เพื่ออัปเดตแถวเดิม ไม่สร้างแถวซ้ำ
  if (lastRow > 1) {
    const codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < codes.length; i++) {
      if (String(codes[i][0]).trim().toUpperCase() === bookingCode.toUpperCase()) {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow !== -1) {
    // รักษาค่า "สร้างเมื่อ" เดิมไว้หากมีอยู่แล้ว
    const oldCreatedAt = sheet.getRange(targetRow, 13).getValue();
    if (oldCreatedAt) {
      rowData[12] = oldCreatedAt;
    }
    // อัปเดตแถวเดิม
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    return {
      ok: true,
      action: 'updated',
      bookingCode: bookingCode,
      row: targetRow
    };
  } else {
    // เพิ่มแถวใหม่
    sheet.appendRow(rowData);
    return {
      ok: true,
      action: 'created',
      bookingCode: bookingCode,
      row: sheet.getLastRow()
    };
  }
}

/**
 * ป้องกัน Formula Injection: หากขึ้นต้นด้วย = + - @ ให้เติม ' นำหน้า
 * จำกัดความยาวและตัดอักขระควบคุม
 */
function sanitizeText(val, maxLength) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim().replace(/[\r\n\t]/g, ' ');
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * บังคับให้เป็น Plain Text โดยขึ้นต้นด้วย ' (Single Quote)
 * เพื่อไม่ให้ Google Sheets แปลงวันที่และเวลาเป็นตัวเลขหรือฟอร์แมตอื่น
 */
function forcePlainText(val) {
  if (!val) return '';
  let str = String(val).trim();
  if (!str.startsWith("'")) {
    str = "'" + str;
  }
  return str;
}

function createJsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * =========================================================================
 * ฟังก์ชันทดสอบการเขียนข้อมูล (testWrite)
 * =========================================================================
 * วิธีใช้งาน:
 * 1. ใน Apps Script เลือกฟังก์ชัน "testWrite" ที่เมนูด้านบน
 * 2. กดปุ่ม "เรียกใช้" (Run)
 * 3. ตรวจดูในแท็บ "การจอง" จะมีแถวรหัส TEST-9999 เพิ่มขึ้นมาทันที
 */
function testWrite() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const testData = {
    action: 'test',
    bookingCode: 'TEST-9999',
    status: 'อนุมัติเรียบร้อย',
    statusThai: 'อนุมัติเรียบร้อย',
    roomName: 'หอประชุมอดิเรกสาร',
    date: '2026-11-05',
    startTime: '09:00',
    endTime: '11:00',
    participantCount: 50,
    amenitiesText: 'โปรเจกเตอร์, ระบบเสียงห้องประชุม, ไมโครโฟนไร้สาย',
    bookerName: 'นายทดสอบ บันทึกระบบ',
    bookerPosition: 'เจ้าหน้าที่งานศูนย์ดิจิทัลฯ',
    department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
    bookerContact: '081-234-5678',
    title: 'ทดสอบการส่งข้อมูลเข้า Google Sheet (แท็บ การจอง)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    secretToken: PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || 'TTC_SHEET_SECRET_2026'
  };

  const result = writeBookingToSheet(testData);
  Logger.log('==============================================');
  Logger.log('ผลการทดสอบ testWrite: ' + JSON.stringify(result));
  Logger.log('เปิด Google Sheet ดูแท็บ "การจอง" ได้เลยครับ 🚀');
  Logger.log('==============================================');
  return result;
}
