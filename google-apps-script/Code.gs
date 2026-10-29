/**
 * =========================================================================
 * Google Apps Script: Smart Meeting Room Booking System Webhook
 * =========================================================================
 * คุณสมบัติ:
 * 1. doPost รับข้อมูลแบบ JSON (จาก Content-Type: text/plain)
 * 2. ตรวจสอบ Shared Secret Token ป้องกันคำขอแปลกปลอม
 * 3. ใช้ LockService ป้องกัน Concurrency / แย่งกันเขียนข้อมูล
 * 4. สร้างหัวตาราง (Header) อัตโนมัติหากชีตยังว่างอยู่
 * 5. อัปเดตแถวเดิมหากมี Booking Code ตรงกัน (In-Place Update) ไม่เพิ่มแถวซ้ำ
 * 6. ตรวจสอบและจำกัดความยาวข้อมูล (Data Sanitation) ป้องกันข้อความขยะ
 */

// รหัสความปลอดภัย (ต้องตรงกับ VITE_SHEETS_SECRET_TOKEN ในไฟล์ .env ของเว็บ)
const SHARED_SECRET_TOKEN = 'SMART_MEETING_2026_SECURE_KEY';

// ชื่อชีตที่ต้องการบันทึกข้อมูล
const SHEET_NAME = 'Bookings';

// หัวตารางทั้ง 14 คอลัมน์
const HEADERS = [
  'Booking Code',
  'สถานะ',
  'ห้องประชุม',
  'วันที่',
  'เวลาเริ่ม',
  'เวลาสิ้นสุด',
  'จำนวนผู้เข้าร่วม',
  'อุปกรณ์ที่ใช้',
  'ชื่อผู้จอง',
  'แผนก',
  'อีเมล/เบอร์โทร',
  'หัวข้อประชุม',
  'สร้างเมื่อ',
  'แก้ไขล่าสุด'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  // รอคิวไม่เกิน 10 วินาที
  try {
    lock.waitLock(10000);
  } catch (err) {
    return createJsonResponse({ success: false, error: 'Server busy, lock acquisition timeout' }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'No POST data provided' }, 400);
    }

    // แกะ JSON จากเนื้อหา POST
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
    }

    // 1. ตรวจสอบ Secret Token
    if (!data.secretToken || data.secretToken !== SHARED_SECRET_TOKEN) {
      return createJsonResponse({ success: false, error: 'Unauthorized: Invalid Secret Token' }, 401);
    }

    // รองรับคำขอ Ping / ทดสอบการเชื่อมต่อ
    if (data.action === 'ping') {
      return createJsonResponse({
        success: true,
        message: 'เชื่อมต่อ Google Apps Script Webhook สำเร็จพร้อมบันทึกข้อมูล! 🚀'
      });
    }

    // 2. ตรวจสอบข้อมูลบังคับและทำความสะอาด (Sanitization)
    const bookingCode = sanitizeText(data.bookingCode, 10);
    if (!bookingCode) {
      return createJsonResponse({ success: false, error: 'Missing bookingCode' }, 400);
    }

    const rowData = [
      bookingCode,
      sanitizeText(data.status, 20) || 'จองสำเร็จ',
      sanitizeText(data.roomName, 80),
      sanitizeText(data.date, 20),
      sanitizeText(data.startTime, 10),
      sanitizeText(data.endTime, 10),
      Number(data.participantCount) || 1,
      sanitizeText(data.amenities, 200),
      sanitizeText(data.bookerName, 100),
      sanitizeText(data.department, 80),
      sanitizeText(data.contact, 100),
      sanitizeText(data.title, 200),
      sanitizeText(data.createdAt, 40),
      sanitizeText(data.updatedAt, 40)
    ];

    // 3. เข้าถึง Spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // 4. ถ้าแถวแรกว่าง ให้สร้าง Header ทันทีพร้อมจัดรูปแบบให้สวยงาม
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground('#8B5CF6'); // Gen Z Purple
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // 5. ค้นหา Booking Code เพื่ออัปเดตแถวเดิม หรือเพิ่มแถวใหม่
    const lastRow = sheet.getLastRow();
    let targetRow = -1;

    if (lastRow > 1) {
      // ดึงคอลัมน์ A (Booking Code) มาเช็คทั้งหมด
      const codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < codes.length; i++) {
        if (String(codes[i][0]).trim() === bookingCode) {
          targetRow = i + 2; // +2 เพราะเริ่มจากแถวที่ 2
          break;
        }
      }
    }

    if (targetRow !== -1) {
      // อัปเดตแถวเดิม
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
      return createJsonResponse({
        success: true,
        action: 'updated',
        bookingCode: bookingCode,
        row: targetRow
      });
    } else {
      // เพิ่มแถวใหม่
      sheet.appendRow(rowData);
      return createJsonResponse({
        success: true,
        action: 'created',
        bookingCode: bookingCode,
        row: sheet.getLastRow()
      });
    }

  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return createJsonResponse({
    status: 'online',
    message: 'Smart Meeting Room Booking System Apps Script Webhook is ready! 🚀',
    timestamp: new Date().toISOString()
  });
}

function sanitizeText(val, maxLength) {
  if (val === undefined || val === null) return '';
  const str = String(val).trim().replace(/[\r\n\t]/g, ' ');
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

function createJsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
