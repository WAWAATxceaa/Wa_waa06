/**
 * =========================================================================
 * Google Apps Script: Smart Meeting Room Booking System
 * ระบบจองห้องประชุมออนไลน์ (เชื่อมต่อ Google Sheets)
 * =========================================================================
 * 
 * วิธีติดตั้ง (ทำเพียงครั้งเดียว):
 * 1. เปิด Google Sheet เปล่าขึ้นมา
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดไฟล์นี้ลงไปทั้งหมด
 * 4. กดปุ่มบันทึก (Save ไอคอนรูปแผ่นดิสก์)
 * 5. กดปุ่มสีน้ำเงิน "การทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภทเป็น "เว็บแอป" (Web app)
 *    - คำอธิบาย: Meeting Room Booking
 *    - เรียกใช้ในฐานะ (Execute as): "ฉัน" (Me - อีเมลของคุณ)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone)  <--- สำคัญที่สุด!
 * 7. กด "ทำให้ใช้งานได้" (Deploy)
 * 8. จะมีหน้าต่างขึ้นมาขอสิทธิ์ (Authorization Required):
 *    - กด "ให้สิทธิ์" (Authorize access) แล้วเลือกบัญชี Google ของคุณ
 *    - จะเห็นหน้าเตือนสีแดง "Google ไม่ได้ยืนยันแอปนี้" (Google hasn't verified this app)
 *    - ให้กดลิงก์ "ขั้นสูง" (Advanced) ที่มุมซ้ายล่าง
 *    - กดลิงก์ "ไปยัง ... (ไม่ปลอดภัย)" (Go to ... unsafe)
 *    - เลื่อนลงแล้วกด "อนุญาต" (Allow)
 * 9. คัดลอก "URL เว็บแอป" (ที่ลงท้ายด้วย /exec) นำไปใส่ในเว็บระบบจองห้องประชุมได้เลย!
 */

const SHEET_NAME = 'Bookings';
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

/**
 * ดึงหรือสร้าง Sheet สำหรับบันทึกข้อมูล
 */
function getTargetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('ไม่พบ Google Sheet กรุณาเปิด Apps Script จากเมนู ส่วนขยาย > Apps Script ในชีต');
  }

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const firstSheet = ss.getSheets()[0];
    // ถ้าแผ่นงานแรกยังว่างอยู่ ให้เปลี่ยนชื่อเป็น Bookings ทันที
    if (firstSheet && firstSheet.getLastRow() === 0) {
      firstSheet.setName(SHEET_NAME);
      sheet = firstSheet;
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }

  // สร้าง Header และจัดรูปแบบอัตโนมัติหากยังไม่มีข้อมูล
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const hRange = sheet.getRange(1, 1, 1, HEADERS.length);
    hRange.setBackground('#8B5CF6'); // ม่วง Cyber Purple
    hRange.setFontColor('#FFFFFF');
    hRange.setFontWeight('bold');
    hRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }

  return sheet;
}

/**
 * doPost(e): รับข้อมูลการจองใหม่ / แก้ไข / ยกเลิก แล้วบันทึกลง Sheet ทันที
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // ป้องกัน Race Condition แย่งเขียนพร้อมกัน
  } catch (err) {
    return createJsonResponse({ success: false, error: 'Server busy' }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'No data received' }, 400);
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
    }

    // รองรับการทดสอบเชื่อมต่อ (Ping)
    if (data.action === 'ping') {
      const sheet = getTargetSheet();
      return createJsonResponse({
        success: true,
        message: 'เชื่อมต่อ Google Apps Script Webhook สำเร็จพร้อมใช้งาน! 🚀',
        totalBookings: Math.max(0, sheet.getLastRow() - 1)
      });
    }

    const bookingCode = sanitizeText(data.bookingCode, 20);
    if (!bookingCode) {
      return createJsonResponse({ success: false, error: 'Missing bookingCode' }, 400);
    }

    const rowData = [
      bookingCode,
      sanitizeText(data.status, 20) || 'จองสำเร็จ',
      sanitizeText(data.roomName, 100),
      sanitizeText(data.date, 20),
      sanitizeText(data.startTime, 10),
      sanitizeText(data.endTime, 10),
      Number(data.participantCount) || 1,
      sanitizeText(data.amenities, 250),
      sanitizeText(data.bookerName, 100),
      sanitizeText(data.department, 100),
      sanitizeText(data.contact, 100),
      sanitizeText(data.title, 250),
      sanitizeText(data.createdAt, 40) || new Date().toISOString(),
      sanitizeText(data.updatedAt, 40) || new Date().toISOString()
    ];

    const sheet = getTargetSheet();
    const lastRow = sheet.getLastRow();
    let targetRow = -1;

    // ค้นหาแถวที่มี Booking Code เดียวกันเพื่ออัปเดตแถวเดิม (In-Place Update)
    if (lastRow > 1) {
      const codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < codes.length; i++) {
        if (String(codes[i][0]).trim() === bookingCode) {
          targetRow = i + 2;
          break;
        }
      }
    }

    if (targetRow !== -1) {
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
      return createJsonResponse({
        success: true,
        action: 'updated',
        bookingCode: bookingCode,
        row: targetRow
      });
    } else {
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

/**
 * doGet(e): อ่านรายการจองทั้งหมดใน Sheet ส่งกลับให้หน้าเว็บแสดงผลแบบ Real-time ข้ามเครื่อง
 */
function doGet(e) {
  try {
    const sheet = getTargetSheet();
    if (sheet.getLastRow() <= 1) {
      return createJsonResponse({ status: 'online', bookings: [] });
    }

    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);

    const bookings = rows.map(function(r) {
      var d = r[3];
      var dateStr = '';
      if (d instanceof Date) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        dateStr = y + '-' + m + '-' + day;
      } else {
        dateStr = String(d || '');
      }

      var sTime = r[4];
      if (sTime instanceof Date) {
        sTime = String(sTime.getHours()).padStart(2, '0') + ':' + String(sTime.getMinutes()).padStart(2, '0');
      } else {
        sTime = String(sTime || '');
      }

      var eTime = r[5];
      if (eTime instanceof Date) {
        eTime = String(eTime.getHours()).padStart(2, '0') + ':' + String(eTime.getMinutes()).padStart(2, '0');
      } else {
        eTime = String(eTime || '');
      }

      var st = String(r[1] || '').trim();
      var status = (st === 'ยกเลิก' || st === 'cancelled') ? 'cancelled' : 'confirmed';
      var rName = String(r[2] || '');

      // แมป roomName เป็น roomId สำหรับ Calendar และ Dashboard
      var roomId = 'room-1';
      if (rName.indexOf('Cyber Neon') !== -1 || rName.indexOf('ห้องใหญ่') !== -1) roomId = 'room-1';
      else if (rName.indexOf('Pink') !== -1 || rName.indexOf('ห้องกลาง') !== -1) roomId = 'room-2';
      else if (rName.indexOf('Cyan') !== -1 || rName.indexOf('บรีฟ') !== -1) roomId = 'room-3';
      else if (rName.indexOf('Lime') !== -1 || rName.indexOf('ระดม') !== -1) roomId = 'room-4';
      else if (rName.indexOf('Sunset') !== -1 || rName.indexOf('โฟกัส') !== -1) roomId = 'room-5';

      var startDateTime = dateStr ? (dateStr + 'T' + sTime + ':00') : '';
      var endDateTime = dateStr ? (dateStr + 'T' + eTime + ':00') : '';

      return {
        id: 'gs-' + String(r[0]),
        bookingCode: String(r[0] || '').trim(),
        status: status,
        roomId: roomId,
        roomName: rName,
        date: dateStr,
        startTime: sTime,
        endTime: eTime,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        participantCount: Number(r[6]) || 1,
        amenities: String(r[7] || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean),
        bookerName: String(r[8] || ''),
        department: String(r[9] || ''),
        bookerContact: String(r[10] || ''),
        title: String(r[11] || ''),
        createdAt: String(r[12] || ''),
        updatedAt: String(r[13] || '')
      };
    }).filter(function(b) {
      return b.bookingCode && b.bookingCode.length > 0;
    });

    return createJsonResponse({ status: 'online', bookings: bookings });
  } catch (err) {
    return createJsonResponse({ status: 'error', error: err.toString(), bookings: [] });
  }
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
