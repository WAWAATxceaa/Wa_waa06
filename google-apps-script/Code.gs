/**
 * =========================================================================
 * TTC Smart Meeting Room Booking & Analytics Dashboard
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ (งานศูนย์ดิจิทัลและสื่อสารองค์กร)
 * Google Apps Script Web App Backend & API
 * =========================================================================
 * 
 * คุณสมบัติหลัก:
 * 1. Single Source of Truth ผ่าน Google Sheets 5 แท็บ:
 *    - Bookings (คำขอและสายอนุมัติ 4 ขั้น)
 *    - Rooms (ข้อมูลห้อง ความจุ อุปกรณ์ และช่วงปิดปรับปรุง)
 *    - Settings (ผู้ลงนาม 4 ขั้น, รหัส PIN, การตั้งค่าการแจ้งเตือน)
 *    - Announcements (ประกาศข่าวสารหน้าแรก)
 *    - AuditLogs (ประวัติการกระทำทั้งหมด)
 * 2. ป้องกัน Concurrency ด้วย LockService (10 วินาที)
 * 3. ตรวจสอบเวลาชนกัน (Overlap Check) และช่วงปิดปรับปรุงที่เซิร์ฟเวอร์
 * 4. สายอนุมัติ 4 ขั้นตอน (ห้ามข้ามขั้นตอนเด็ดขาด):
 *    - ขั้น 1: ผู้ขอยื่นคำขอ
 *    - ขั้น 2: นายวัชรพงศ์ โสภา (ตรวจความพร้อมห้อง/โสตฯ)
 *    - ขั้น 3: นายเอกราช เขียวทอง (รับรอง)
 *    - ขั้น 4: นายชาตรี เริงชัยภูมิ (พิจารณาอนุมัติ)
 * 5. ป้องกัน Formula Injection ใน Sheet (ค่าที่ขึ้นต้นด้วย = + - @ จะเติม ' นำหน้า)
 * 6. รองรับการแนบไฟล์กำหนดการขึ้น Google Drive อัตโนมัติ
 * 7. ส่งการแจ้งเตือน Telegram / Line Notify ทันทีเมื่อมีคำขอหรือเปลี่ยนสถานะ
 * 8. ฟังก์ชันสำรองข้อมูลอัตโนมัติรายวัน (Daily Backup)
 */

const SHEET_BOOKINGS = 'Bookings';
const SHEET_ROOMS = 'Rooms';
const SHEET_SETTINGS = 'Settings';
const SHEET_ANNOUNCEMENTS = 'Announcements';
const SHEET_AUDIT = 'AuditLogs';

// หัวตารางคำขอจอง (Bookings) ครบ 36 คอลัมน์
const BOOKING_HEADERS = [
  'Booking Code',         // 0
  'สถานะคำขอ',            // 1: pending_step2, pending_step3, pending_step4, approved, rejected, cancelled
  'สถานะภาษาไทย',          // 2
  'รหัสห้อง',             // 3
  'ชื่อห้องประชุม',        // 4
  'ห้องอื่นๆ (ระบุ)',      // 5
  'วันที่ขอใช้',           // 6 YYYY-MM-DD
  'เวลาเริ่ม',             // 7 HH:mm
  'เวลาสิ้นสุด',           // 8 HH:mm
  'จำนวนผู้เข้าร่วม',       // 9
  'ชื่อผู้ขอใช้',          // 10
  'ตำแหน่ง',              // 11
  'หน่วยงาน/แผนกวิชา',     // 12
  'เบอร์โทรศัพท์',         // 13
  'หัวข้อ/วัตถุประสงค์',    // 14
  'รายละเอียดเพิ่มเติม',    // 15
  'รายการครุภัณฑ์',        // 16
  'จำนวนโต๊ะเสริม',       // 17
  'จำนวนเก้าอี้เสริม',      // 18
  'ลิงก์ไฟล์แนบ Drive',    // 19
  'ชื่อไฟล์แนบ',          // 20
  'ยืนยันดูแลทรัพย์สิน',    // 21
  'ขั้นตอนปัจจุบัน (1-4)',  // 22
  'เวลาที่ยื่นคำขอ',       // 23
  'ผู้ตรวจความพร้อม (ขั้น 2)',// 24
  'ผลตรวจความพร้อม',      // 25
  'หมายเหตุขั้น 2',       // 26
  'เวลาขั้น 2',           // 27
  'ผู้รับรอง (ขั้น 3)',    // 28
  'ผลการรับรอง',          // 29
  'หมายเหตุขั้น 3',       // 30
  'เวลาขั้น 3',           // 31
  'ผู้อนุมัติ (ขั้น 4)',    // 32
  'ผลการอนุมัติ',         // 33
  'หมายเหตุขั้น 4',       // 34
  'เวลาขั้น 4',           // 35
  'ประวัติการอนุมัติ (JSON)',// 36
  'สร้างเมื่อ',            // 37
  'แก้ไขล่าสุด'            // 38
];

/**
 * doPost(e): รับคำขอแบบ POST (JSON payload ผ่าน text/plain ป้องกัน CORS Preflight)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return createJsonResponse({ success: false, error: 'ระบบไม่ว่างเนื่องจากมีผู้ใช้งานพร้อมกัน กรุณาลองใหม่อีกครั้ง' }, 503);
  }

  try {
    ensureAllSheets();
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'ไม่พบข้อมูลคำขอ' }, 400);
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, error: 'รูปแบบข้อมูล JSON ไม่ถูกต้อง' }, 400);
    }

    const action = payload.action;

    // 1. Ping / ทดสอบการเชื่อมต่อ
    if (action === 'ping') {
      return createJsonResponse({
        success: true,
        message: 'เชื่อมต่อ TTC Smart Meeting Room API สำเร็จพร้อมใช้งาน! 🚀',
        org: 'วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์',
        time: new Date().toISOString()
      });
    }

    // 2. อัปโหลดไฟล์กำหนดการเข้า Google Drive
    if (action === 'upload_attachment') {
      return handleUploadAttachment(payload);
    }

    // 3. ยื่นคำขอจองห้องใหม่ (ขั้นที่ 1)
    if (action === 'create_booking') {
      return handleCreateBooking(payload);
    }

    // 4. บันทึกผลการพิจารณาตามสายอนุมัติ (ขั้น 2, 3, 4) - ห้ามข้ามขั้น
    if (action === 'approve_step') {
      return handleApproveStep(payload);
    }

    // 5. ยกเลิกคำขอโดยผู้ขอ (ทำได้ก่อนอนุมัติขั้นสุดท้าย)
    if (action === 'cancel_booking') {
      return handleCancelBooking(payload);
    }

    // 6. อัปเดตข้อมูลห้อง (จัดการจากหลังบ้าน)
    if (action === 'update_room') {
      return handleUpdateRoom(payload);
    }

    // 7. จัดการประกาศข่าวสาร (Announcements)
    if (action === 'save_announcement' || action === 'delete_announcement') {
      return handleAnnouncementAction(payload);
    }

    // 8. อัปเดตการตั้งค่าระบบ (Settings)
    if (action === 'update_settings') {
      return handleUpdateSettings(payload);
    }

    return createJsonResponse({ success: false, error: 'Unknown action: ' + action }, 400);

  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * doGet(e): อ่านข้อมูลสำหรับหน้าเว็บแบบ Real-time (Polling 10-15s)
 */
function doGet(e) {
  try {
    ensureAllSheets();
    const type = (e && e.parameter && e.parameter.type) || 'all';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const result = {
      status: 'online',
      system: 'TTC Smart Meeting Room Booking & Analytics Dashboard',
      timestamp: new Date().toISOString()
    };

    if (type === 'all' || type === 'bookings') {
      result.bookings = getBookingsList(ss);
    }
    if (type === 'all' || type === 'rooms') {
      result.rooms = getRoomsList(ss);
    }
    if (type === 'all' || type === 'settings') {
      result.settings = getSettingsMap(ss);
    }
    if (type === 'all' || type === 'announcements') {
      result.announcements = getAnnouncementsList(ss);
    }

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: 'error', error: err.toString() }, 500);
  }
}

/**
 * ตรวจสอบความพร้อมของทุกชีต และสร้างหัวตารางเริ่มต้น
 */
function ensureAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('ไม่พบ Google Sheet โปรดเปิดจากส่วนขยายของ Google Sheets');

  // 1. Bookings Sheet
  let bSheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!bSheet) {
    bSheet = ss.insertSheet(SHEET_BOOKINGS);
  }
  if (bSheet.getLastRow() === 0) {
    bSheet.appendRow(BOOKING_HEADERS);
    styleHeaderRow(bSheet, BOOKING_HEADERS.length, '#8B5CF6');
  }

  // 2. Rooms Sheet
  let rSheet = ss.getSheetByName(SHEET_ROOMS);
  if (!rSheet) {
    rSheet = ss.insertSheet(SHEET_ROOMS);
  }
  if (rSheet.getLastRow() === 0) {
    const rHeaders = ['id', 'name', 'capacity', 'floor', 'description', 'amenities', 'status', 'maintenanceStart', 'maintenanceEnd', 'color', 'order', 'isOther'];
    rSheet.appendRow(rHeaders);
    styleHeaderRow(rSheet, rHeaders.length, '#06B6D4');
    seedDefaultRooms(rSheet);
  }

  // 3. Settings Sheet
  let sSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sSheet) {
    sSheet = ss.insertSheet(SHEET_SETTINGS);
  }
  if (sSheet.getLastRow() === 0) {
    const sHeaders = ['Key', 'Value', 'Description'];
    sSheet.appendRow(sHeaders);
    styleHeaderRow(sSheet, sHeaders.length, '#EC4899');
    seedDefaultSettings(sSheet);
  }

  // 4. Announcements Sheet
  let aSheet = ss.getSheetByName(SHEET_ANNOUNCEMENTS);
  if (!aSheet) {
    aSheet = ss.insertSheet(SHEET_ANNOUNCEMENTS);
  }
  if (aSheet.getLastRow() === 0) {
    const aHeaders = ['id', 'title', 'content', 'date', 'isActive', 'type', 'createdAt'];
    aSheet.appendRow(aHeaders);
    styleHeaderRow(aHeaders, aHeaders.length, '#F59E0B');
  }

  // 5. AuditLogs Sheet
  let auditSheet = ss.getSheetByName(SHEET_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(SHEET_AUDIT);
  }
  if (auditSheet.getLastRow() === 0) {
    const auditHeaders = ['Timestamp', 'Action', 'Actor', 'Role', 'BookingCode', 'Details'];
    auditSheet.appendRow(auditHeaders);
    styleHeaderRow(auditSheet, auditHeaders.length, '#64748B');
  }
}

function styleHeaderRow(sheet, numCols, bgColor) {
  const range = sheet.getRange(1, 1, 1, numCols);
  range.setBackground(bgColor);
  range.setFontColor('#FFFFFF');
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

/**
 * 3. จัดการคำขอจองห้องใหม่ (ขั้นที่ 1)
 */
function handleCreateBooking(data) {
  const bookingCode = sanitizeFormula(data.bookingCode || generateCode());
  const roomId = sanitizeFormula(data.roomId);
  const roomName = sanitizeFormula(data.roomName);
  const otherRoomName = sanitizeFormula(data.otherRoomName || '');
  const date = sanitizeFormula(data.date);
  const startTime = sanitizeFormula(data.startTime);
  const endTime = sanitizeFormula(data.endTime);

  // 1. ตรวจสอบการจองชนกันฝั่งเซิร์ฟเวอร์
  const conflict = checkConflictOnServer(roomId, roomName, otherRoomName, date, startTime, endTime, null);
  if (conflict.hasConflict) {
    return createJsonResponse({
      success: false,
      error: 'ขออภัย ไม่สามารถจองห้องได้เนื่องจากเวลาทับซ้อนกับรายการจองอื่น: ' + conflict.reason
    }, 409);
  }

  // 2. ตรวจสอบว่าห้องอยู่ในช่วงปิดปรับปรุงหรือไม่
  const maintenance = checkRoomMaintenance(roomId, date);
  if (maintenance.isUnderMaintenance) {
    return createJsonResponse({
      success: false,
      error: 'ขออภัย ห้องประชุมนี้ถูกตั้งปิดปรับปรุงในช่วงเวลาดังกล่าว (' + maintenance.reason + ')'
    }, 400);
  }

  const now = new Date().toISOString();
  const initialLogs = [{
    step: 1,
    title: 'ยื่นคำขอใช้ห้องประชุม',
    actorName: sanitizeFormula(data.bookerName),
    actorRole: 'requester',
    action: 'submit',
    statusThai: 'ยื่นคำขอแล้ว',
    note: sanitizeFormula(data.description || ''),
    timestamp: now
  }];

  const row = [
    bookingCode,
    'pending_step2',
    'รอตรวจความพร้อมห้อง/โสตฯ',
    roomId,
    roomName,
    otherRoomName,
    date,
    startTime,
    endTime,
    Number(data.participantCount) || 1,
    sanitizeFormula(data.bookerName),
    sanitizeFormula(data.bookerPosition || 'บุคลากร'),
    sanitizeFormula(data.department),
    sanitizeFormula(data.bookerContact),
    sanitizeFormula(data.title),
    sanitizeFormula(data.description || '-'),
    sanitizeFormula(data.amenitiesText || ''),
    Number(data.extraTableCount) || 0,
    Number(data.extraChairCount) || 0,
    sanitizeFormula(data.attachmentUrl || ''),
    sanitizeFormula(data.attachmentName || ''),
    data.assetCareConfirmed ? 'ยินยอม' : 'ไม่ยินยอม',
    2, // ขั้นตอนปัจจุบัน: รอขั้น 2
    now,
    '', '', '', '', // Step 2 fields
    '', '', '', '', // Step 3 fields
    '', '', '', '', // Step 4 fields
    JSON.stringify(initialLogs),
    now,
    now
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  sheet.appendRow(row);

  addAuditLog('CREATE_BOOKING', data.bookerName, 'requester', bookingCode, 'ยื่นคำขอ: ' + data.title);

  // ส่งการแจ้งเตือนไปยังเจ้าหน้าที่โสตฯ ทันที
  notifyTelegramNewBooking(data, bookingCode);

  return createJsonResponse({
    success: true,
    bookingCode: bookingCode,
    message: 'ยื่นคำขอจองห้องประชุมสำเร็จ รหัสการจอง: ' + bookingCode
  });
}

/**
 * 4. สายอนุมัติ 4 ขั้นตอน (ห้ามข้ามขั้น)
 */
function handleApproveStep(data) {
  const bookingCode = sanitizeFormula(data.bookingCode);
  const step = Number(data.step); // 2, 3, or 4
  const action = data.stepAction; // step2: 'ready'|'not_ready', step3: 'endorsed'|'returned', step4: 'approved'|'rejected'
  const actorName = sanitizeFormula(data.actorName);
  const actorRole = sanitizeFormula(data.actorRole);
  const note = sanitizeFormula(data.note || '');
  const now = new Date().toISOString();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return createJsonResponse({ success: false, error: 'ไม่พบรายการจอง' }, 404);

  const codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < codes.length; i++) {
    if (String(codes[i][0]).trim() === bookingCode) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex === -1) {
    return createJsonResponse({ success: false, error: 'ไม่พบรหัสการจอง ' + bookingCode }, 404);
  }

  const rowData = sheet.getRange(rowIndex, 1, 1, BOOKING_HEADERS.length).getValues()[0];
  const currentStep = Number(rowData[22]);
  const currentStatus = String(rowData[1]);

  if (currentStatus === 'cancelled') {
    return createJsonResponse({ success: false, error: 'คำขอนี้ถูกยกเลิกแล้ว ไม่สามารถดำเนินการต่อได้' }, 400);
  }

  // ตรวจสอบห้ามข้ามขั้น!
  if (step !== currentStep) {
    return createJsonResponse({
      success: false,
      error: 'ไม่สามารถดำเนินการข้ามขั้นตอนได้ (ปัจจุบันอยู่ในขั้นตอนที่ ' + currentStep + ' แต่ส่งการพิจารณาขั้นตอนที่ ' + step + ')'
    }, 400);
  }

  let logs = [];
  try {
    logs = JSON.parse(rowData[36] || '[]');
  } catch (e) {
    logs = [];
  }

  let newStatus = currentStatus;
  let newStatusThai = String(rowData[2]);
  let nextStep = currentStep;

  if (step === 2) {
    // ขั้น 2: ตรวจความพร้อมห้องและโสตฯ (นายวัชรพงศ์ โสภา)
    rowData[24] = actorName;
    rowData[25] = action === 'ready' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน';
    rowData[26] = note;
    rowData[27] = now;

    if (action === 'ready') {
      newStatus = 'pending_step3';
      newStatusThai = 'รอรับรอง (หัวหน้าศูนย์ดิจิทัลฯ)';
      nextStep = 3;
    } else {
      newStatus = 'rejected';
      newStatusThai = 'ไม่พร้อมใช้งาน (ส่งกลับ)';
    }

    logs.push({
      step: 2,
      title: 'ตรวจความพร้อมห้องและอุปกรณ์โสตฯ',
      actorName: actorName,
      actorRole: 'staff_audiovisual',
      action: action,
      statusThai: rowData[25],
      note: note,
      timestamp: now
    });
  } else if (step === 3) {
    // ขั้น 3: รับรอง (นายเอกราช เขียวทอง หัวหน้างานศูนย์ดิจิทัลฯ)
    rowData[28] = actorName;
    rowData[29] = action === 'endorsed' ? 'รับรอง' : 'ส่งกลับแก้ไข';
    rowData[30] = note;
    rowData[31] = now;

    if (action === 'endorsed') {
      newStatus = 'pending_step4';
      newStatusThai = 'รอพิจารณาอนุมัติ (รอง ผอ.)';
      nextStep = 4;
    } else {
      newStatus = 'rejected';
      newStatusThai = 'ไม่รับรอง/ส่งกลับแก้ไข';
    }

    logs.push({
      step: 3,
      title: 'รับรองคำขอใช้ห้องประชุม',
      actorName: actorName,
      actorRole: 'chief_digital',
      action: action,
      statusThai: rowData[29],
      note: note,
      timestamp: now
    });
  } else if (step === 4) {
    // ขั้น 4: พิจารณาอนุมัติ (นายชาตรี เริงชัยภูมิ รอง ผอ.)
    rowData[32] = actorName;
    rowData[33] = action === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ';
    rowData[34] = note;
    rowData[35] = now;

    if (action === 'approved') {
      newStatus = 'approved';
      newStatusThai = 'อนุมัติเรียบร้อย';
    } else {
      newStatus = 'rejected';
      newStatusThai = 'ไม่อนุมัติ';
    }

    logs.push({
      step: 4,
      title: 'พิจารณาอนุมัติขั้นสุดท้าย',
      actorName: actorName,
      actorRole: 'deputy_director',
      action: action,
      statusThai: rowData[33],
      note: note,
      timestamp: now
    });
  }

  rowData[1] = newStatus;
  rowData[2] = newStatusThai;
  rowData[22] = nextStep;
  rowData[36] = JSON.stringify(logs);
  rowData[38] = now;

  sheet.getRange(rowIndex, 1, 1, BOOKING_HEADERS.length).setValues([rowData]);

  addAuditLog('APPROVE_STEP_' + step, actorName, actorRole, bookingCode, 'ผล: ' + action + ' (' + note + ')');

  notifyTelegramStepChange(bookingCode, step, action, actorName, note, newStatusThai);

  return createJsonResponse({
    success: true,
    bookingCode: bookingCode,
    status: newStatus,
    statusThai: newStatusThai,
    currentStep: nextStep,
    message: 'บันทึกผลการพิจารณาขั้นตอนที่ ' + step + ' เรียบร้อยแล้ว'
  });
}

/**
 * 5. ยกเลิกคำขอโดยผู้ขอ
 */
function handleCancelBooking(data) {
  const bookingCode = sanitizeFormula(data.bookingCode);
  const reason = sanitizeFormula(data.reason || 'ผู้ขอยกเลิกคำขอ');
  const now = new Date().toISOString();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return createJsonResponse({ success: false, error: 'ไม่พบรายการจอง' }, 404);

  const codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < codes.length; i++) {
    if (String(codes[i][0]).trim() === bookingCode) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex === -1) return createJsonResponse({ success: false, error: 'ไม่พบรหัสการจอง' }, 404);

  const rowData = sheet.getRange(rowIndex, 1, 1, BOOKING_HEADERS.length).getValues()[0];
  if (rowData[1] === 'approved') {
    return createJsonResponse({ success: false, error: 'คำขอนี้ได้รับการอนุมัติแล้ว หากต้องการยกเลิกกรุณาติดต่อเจ้าหน้าที่' }, 400);
  }

  rowData[1] = 'cancelled';
  rowData[2] = 'ยกเลิกคำขอแล้ว';

  let logs = [];
  try { logs = JSON.parse(rowData[36] || '[]'); } catch (e) {}
  logs.push({
    step: rowData[22],
    title: 'ยกเลิกคำขอ',
    actorName: String(rowData[10]),
    actorRole: 'requester',
    action: 'cancelled',
    statusThai: 'ยกเลิกคำขอแล้ว',
    note: reason,
    timestamp: now
  });

  rowData[36] = JSON.stringify(logs);
  rowData[38] = now;

  sheet.getRange(rowIndex, 1, 1, BOOKING_HEADERS.length).setValues([rowData]);
  addAuditLog('CANCEL_BOOKING', String(rowData[10]), 'requester', bookingCode, 'เหตุผล: ' + reason);

  return createJsonResponse({ success: true, message: 'ยกเลิกคำขอเรียบร้อยแล้ว ช่วงเวลานี้สามารถจองใหม่ได้ทันที' });
}

/**
 * 2. อัปโหลดไฟล์กำหนดการเข้า Google Drive
 */
function handleUploadAttachment(data) {
  try {
    const fileName = sanitizeFormula(data.fileName || 'schedule_' + Date.now() + '.pdf');
    const base64Data = data.base64Data;
    const mimeType = data.mimeType || 'application/pdf';

    if (!base64Data) {
      return createJsonResponse({ success: false, error: 'ไม่พบข้อมูลไฟล์' }, 400);
    }

    const decoded = Utilities.base64Decode(base64Data.split(',')[1] || base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);

    const folderName = 'TTC_Meeting_Attachments';
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return createJsonResponse({
      success: true,
      fileUrl: file.getUrl(),
      fileDownloadUrl: file.getDownloadUrl(),
      fileName: fileName
    });
  } catch (err) {
    return createJsonResponse({ success: false, error: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + err.toString() }, 500);
  }
}

/**
 * ตรวจสอบการทับซ้อนของเวลา (Server-Side Overlap Check)
 */
function checkConflictOnServer(roomId, roomName, otherRoomName, date, newStart, newEnd, excludeCode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet || sheet.getLastRow() <= 1) return { hasConflict: false };

  const data = sheet.getDataRange().getValues().slice(1);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const bCode = String(row[0]).trim();
    const bStatus = String(row[1]).trim();
    const bRoomId = String(row[3]).trim();
    const bOther = String(row[5]).trim();
    const bDate = formatDateValue(row[6]);
    const bStart = formatTimeValue(row[7]);
    const bEnd = formatTimeValue(row[8]);

    // ข้ามรายการที่ยกเลิก หรือถูกปฏิเสธ หรือเป็นรายการเดียวกัน
    if (bStatus === 'cancelled' || bStatus === 'rejected') continue;
    if (excludeCode && bCode === excludeCode) continue;

    // เช็คห้องเดียวกัน และวันเดียวกัน
    const isSameRoom = (roomId === 'room-other' && otherRoomName)
      ? (bRoomId === 'room-other' && bOther.toLowerCase() === otherRoomName.toLowerCase())
      : (bRoomId === roomId);

    if (isSameRoom && bDate === date) {
      // เงื่อนไขเวลาชนกัน: (newStart < existingEnd) && (newEnd > existingStart)
      if (newStart < bEnd && newEnd > bStart) {
        return {
          hasConflict: true,
          reason: 'มีการจองห้อง "' + (roomName || bRoomId) + '" ในวันที่ ' + date + ' เวลา ' + bStart + ' - ' + bEnd + ' น. (รหัส ' + bCode + ')'
        };
      }
    }
  }

  return { hasConflict: false };
}

/**
 * ตรวจสอบช่วงปิดปรับปรุงของห้อง
 */
function checkRoomMaintenance(roomId, bookingDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ROOMS);
  if (!sheet || sheet.getLastRow() <= 1) return { isUnderMaintenance: false };

  const rows = sheet.getDataRange().getValues().slice(1);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]) === roomId) {
      const status = String(r[6]);
      const mStart = formatDateValue(r[7]);
      const mEnd = formatDateValue(r[8]);

      if (status === 'maintenance') {
        if (!mStart && !mEnd) {
          return { isUnderMaintenance: true, reason: 'ปิดปรับปรุงชั่วคราว' };
        }
        if (mStart && mEnd && bookingDate >= mStart && bookingDate <= mEnd) {
          return { isUnderMaintenance: true, reason: 'ปิดปรับปรุงระหว่าง ' + mStart + ' ถึง ' + mEnd };
        }
      }
    }
  }

  return { isUnderMaintenance: false };
}

/**
 * บันทึก Audit Log
 */
function addAuditLog(action, actor, role, bookingCode, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_AUDIT);
    if (sheet) {
      sheet.appendRow([
        new Date().toISOString(),
        sanitizeFormula(action),
        sanitizeFormula(actor),
        sanitizeFormula(role),
        sanitizeFormula(bookingCode),
        sanitizeFormula(details)
      ]);
    }
  } catch (e) {}
}

/**
 * ป้องกัน Formula Injection: ถ้าขึ้นต้นด้วย = + - @ ให้เติม ' นำหน้า
 */
function sanitizeFormula(val) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim().replace(/[\r\n\t]/g, ' ');
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return str;
}

/**
 * ส่งแจ้งเตือน Telegram เมื่อมีคำขอใหม่
 */
function notifyTelegramNewBooking(data, bookingCode) {
  try {
    const settings = getSettingsMap(SpreadsheetApp.getActiveSpreadsheet());
    const botToken = settings.telegramBotToken || PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = settings.telegramChatId || PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) return;

    const text =
      '📢 *มีคำขอใช้ห้องประชุมใหม่ (TTC)*\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      '🔑 *รหัสการจอง:* `' + bookingCode + '`\n' +
      '🏢 *ห้อง:* ' + (data.otherRoomName || data.roomName) + '\n' +
      '📅 *วันที่:* ' + data.date + '\n' +
      '⏰ *เวลา:* ' + data.startTime + ' - ' + data.endTime + ' น.\n' +
      '👤 *ผู้ขอใช้:* ' + data.bookerName + ' (' + data.department + ')\n' +
      '📌 *หัวข้อ:* ' + data.title + '\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      '👉 *ขั้นตอนถัดไป:* รอเจ้าหน้าที่โสตฯ ตรวจความพร้อมห้องและอุปกรณ์';

    sendTelegramMessage(botToken, chatId, text);
  } catch (e) {
    console.warn('Telegram notify error:', e);
  }
}

/**
 * ส่งแจ้งเตือน Telegram เมื่อสถานะเปลี่ยน
 */
function notifyTelegramStepChange(bookingCode, step, action, actorName, note, statusThai) {
  try {
    const settings = getSettingsMap(SpreadsheetApp.getActiveSpreadsheet());
    const botToken = settings.telegramBotToken || PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = settings.telegramChatId || PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) return;

    let icon = '🔔';
    if (action === 'ready' || action === 'endorsed' || action === 'approved') icon = '✅';
    if (action === 'not_ready' || action === 'returned' || action === 'rejected') icon = '❌';

    const text =
      icon + ' *อัปเดตสถานะการอนุมัติห้องประชุม (TTC)*\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      '🔑 *รหัสการจอง:* `' + bookingCode + '`\n' +
      '📍 *ขั้นตอนที่:* ' + step + ' (' + statusThai + ')\n' +
      '👤 *ผู้ดำเนินการ:* ' + actorName + '\n' +
      (note ? ('📝 *หมายเหตุ:* ' + note + '\n') : '') +
      '━━━━━━━━━━━━━━━━━━';

    sendTelegramMessage(botToken, chatId, text);
  } catch (e) {
    console.warn('Telegram step notify error:', e);
  }
}

function sendTelegramMessage(botToken, chatId, text) {
  const url = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) break;
    } catch (err) {
      Utilities.sleep(1000);
    }
  }
}

/**
 * สำรองข้อมูลอัตโนมัติรายวัน (Daily Backup)
 */
function createDailyBackup() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const backupFolderName = 'TTC_Meeting_Backups';
    let folder;
    const folders = DriveApp.getFoldersByName(backupFolderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(backupFolderName);
    }

    const todayStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd_HHmm');
    const backupName = 'Backup_TTC_Meeting_' + todayStr;
    const file = DriveApp.getFileById(ss.getId());
    file.makeCopy(backupName, folder);

    addAuditLog('SYSTEM_BACKUP', 'System Automation', 'admin', 'BACKUP', 'สำรองข้อมูลสำเร็จ: ' + backupName);
    return { success: true, backupName: backupName };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * ดึงรายการการจองทั้งหมด (Bookings) ส่งกลับให้เว็บ
 */
function getBookingsList(ss) {
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const rows = sheet.getDataRange().getValues().slice(1);
  return rows.map(function(r) {
    const dateStr = formatDateValue(r[6]);
    const sTime = formatTimeValue(r[7]);
    const eTime = formatTimeValue(r[8]);

    let logs = [];
    try { logs = JSON.parse(r[36] || '[]'); } catch (e) {}

    return {
      id: 'gs-' + String(r[0]),
      bookingCode: String(r[0] || ''),
      status: String(r[1] || 'pending_step2'),
      statusThai: String(r[2] || 'รอตรวจความพร้อมห้อง/โสตฯ'),
      roomId: String(r[3] || 'room-adireksarn'),
      roomName: String(r[4] || ''),
      otherRoomName: String(r[5] || ''),
      date: dateStr,
      startTime: sTime,
      endTime: eTime,
      startDateTime: dateStr ? (dateStr + 'T' + sTime + ':00') : '',
      endDateTime: dateStr ? (dateStr + 'T' + eTime + ':00') : '',
      participantCount: Number(r[9]) || 1,
      bookerName: String(r[10] || ''),
      bookerPosition: String(r[11] || ''),
      department: String(r[12] || ''),
      bookerContact: String(r[13] || ''),
      title: String(r[14] || ''),
      description: String(r[15] || ''),
      amenitiesText: String(r[16] || ''),
      extraTableCount: Number(r[17]) || 0,
      extraChairCount: Number(r[18]) || 0,
      attachmentUrl: String(r[19] || ''),
      attachmentName: String(r[20] || ''),
      assetCareConfirmed: r[21] === 'ยินยอม',
      currentStep: Number(r[22]) || 2,
      step1SubmittedAt: String(r[23] || ''),
      step2StaffName: String(r[24] || ''),
      step2StaffStatus: String(r[25] || ''),
      step2StaffNote: String(r[26] || ''),
      step2StaffTimestamp: String(r[27] || ''),
      step3ChiefName: String(r[28] || ''),
      step3ChiefStatus: String(r[29] || ''),
      step3ChiefNote: String(r[30] || ''),
      step3ChiefTimestamp: String(r[31] || ''),
      step4DeputyName: String(r[32] || ''),
      step4DeputyStatus: String(r[33] || ''),
      step4DeputyNote: String(r[34] || ''),
      step4DeputyTimestamp: String(r[35] || ''),
      logs: logs,
      createdAt: String(r[37] || ''),
      updatedAt: String(r[38] || '')
    };
  }).filter(function(b) { return b.bookingCode && b.bookingCode.length > 0; });
}

/**
 * ดึงรายการห้อง (Rooms)
 */
function getRoomsList(ss) {
  const sheet = ss.getSheetByName(SHEET_ROOMS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const rows = sheet.getDataRange().getValues().slice(1);
  return rows.map(function(r) {
    return {
      id: String(r[0]),
      name: String(r[1]),
      capacity: Number(r[2]) || 0,
      floor: Number(r[3]) || 1,
      description: String(r[4] || ''),
      amenities: String(r[5] || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean),
      status: String(r[6] || 'active'),
      maintenanceStartDate: formatDateValue(r[7]),
      maintenanceEndDate: formatDateValue(r[8]),
      color: String(r[9] || '#8B5CF6'),
      order: Number(r[10]) || 1,
      isOther: r[11] === true || String(r[11]) === 'true'
    };
  });
}

/**
 * ดึงการตั้งค่า (Settings)
 */
function getSettingsMap(ss) {
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  const map = {};
  if (!sheet || sheet.getLastRow() <= 1) return map;

  const rows = sheet.getDataRange().getValues().slice(1);
  for (let i = 0; i < rows.length; i++) {
    const k = String(rows[i][0]).trim();
    const v = String(rows[i][1]).trim();
    if (k) map[k] = v;
  }
  return map;
}

/**
 * ดึงประกาศ (Announcements)
 */
function getAnnouncementsList(ss) {
  const sheet = ss.getSheetByName(SHEET_ANNOUNCEMENTS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const rows = sheet.getDataRange().getValues().slice(1);
  return rows.map(function(r) {
    return {
      id: String(r[0]),
      title: String(r[1]),
      content: String(r[2]),
      date: formatDateValue(r[3]),
      isActive: r[4] === true || String(r[4]) === 'true',
      type: String(r[5] || 'info'),
      createdAt: String(r[6] || '')
    };
  });
}

function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(val).trim();
}

function formatTimeValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
  return String(val).trim();
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'TTC-' + rand;
}

function seedDefaultRooms(sheet) {
  const defaultRooms = [
    ['room-adireksarn', 'หอประชุมอดิเรกสาร', 500, 1, 'หอประชุมใหญ่สำหรับพิธีการ งานกิจกรรมวิทยาลัย อบรมสัมมนาขนาดใหญ่', 'โปรเจกเตอร์ 4K, ระบบเสียงเต็มรูปแบบ, ไมโครโฟนไร้สาย, เวที', 'active', '', '', '#8B5CF6', 1, false],
    ['room-sakthong', 'ห้องประชุมสักทอง', 60, 2, 'ห้องประชุมขนาดกลาง รองรับการประชุมคณะกรรมการ อบรมเชิงปฏิบัติการ', 'โปรเจกเตอร์, ระบบเสียงห้องประชุม, ไมโครโฟนตั้งโต๊ะ, สมาร์ททีวี', 'active', '', '', '#EC4899', 2, false],
    ['room-coffee', 'ห้องประชุมกาแฟ', 25, 1, 'ห้องประชุมบรรยากาศผ่อนคลาย เหมาะสำหรับบรีฟงานกลุ่มย่อยและการประสานงาน', 'สมาร์ททีวี, ไมโครโฟน, ไวท์บอร์ด', 'active', '', '', '#F59E0B', 3, false],
    ['room-dome', 'อาคารโดมเอนกประสงค์', 1000, 1, 'อาคารกิจกรรมกลางแจ้ง/ในร่ม รองรับการจัดงานนิทรรศการ กีฬา และรวมนักเรียนนักศึกษา', 'ระบบเสียงกลางแจ้ง, เวทียกพื้น, ไมโครโฟนลอย', 'active', '', '', '#06B6D4', 4, false],
    ['room-director-front', 'ห้องประชุมหน้าห้องผู้อำนวยการ', 15, 2, 'ห้องประชุมรับรองผู้บริหาร แขกผู้ใหญ่ และการประชุมระดับนโยบาย', 'สมาร์ททีวี, ระบบ Video Conference, ไมโครโฟนคอนเฟอเรนซ์', 'active', '', '', '#3B82F6', 5, false],
    ['room-av-computer', 'ห้องคอมพิวเตอร์กลาง/ห้องโสต', 40, 2, 'ห้องปฏิบัติการคอมพิวเตอร์และสื่อมัลติมีเดีย พร้อมระบบเครือข่ายความเร็วสูง', 'เครื่องคอมพิวเตอร์ 40 ชุด, โปรเจกเตอร์, ระบบเสียงห้องโสตฯ', 'active', '', '', '#10B981', 6, false],
    ['room-other', 'อื่นๆ (ระบุ)', 0, 0, 'สถานที่หรือห้องอื่นๆ ภายในวิทยาลัยที่ต้องการขอใช้เป็นกรณีพิเศษ', '', 'active', '', '', '#64748B', 7, true]
  ];
  sheet.getRange(2, 1, defaultRooms.length, defaultRooms[0].length).setValues(defaultRooms);
}

function seedDefaultSettings(sheet) {
  const defaultSettings = [
    ['staffAudiovisualName', 'นายวัชรพงศ์ โสภา', 'ชื่อเจ้าหน้าที่ตรวจความพร้อมห้อง/โสตฯ (ขั้น 2)'],
    ['staffAudiovisualPosition', 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร (งานโสตทัศนูปกรณ์)', 'ตำแหน่งขั้น 2'],
    ['staffAudiovisualPin', '1111', 'PIN ขั้น 2'],
    ['chiefDigitalName', 'นายเอกราช เขียวทอง', 'ชื่อหัวหน้างานศูนย์ดิจิทัลฯ (ขั้น 3)'],
    ['chiefDigitalPosition', 'หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร', 'ตำแหน่งขั้น 3'],
    ['chiefDigitalPin', '2222', 'PIN ขั้น 3'],
    ['deputyDirectorName', 'นายชาตรี เริงชัยภูมิ', 'ชื่อรองผู้อำนวยการฯ (ขั้น 4)'],
    ['deputyDirectorPosition', 'รองผู้อำนวยการวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์', 'ตำแหน่งขั้น 4'],
    ['deputyDirectorPin', '3333', 'PIN ขั้น 4'],
    ['adminPin', '8888', 'PIN ผู้ดูแลระบบ'],
    ['customEquipment1Label', 'โพเดียม / ป้ายข้อความ', 'ชื่อครุภัณฑ์เสริม 1'],
    ['customEquipment2Label', 'ปลั๊กพ่วง / จุดจ่ายไฟ', 'ชื่อครุภัณฑ์เสริม 2'],
    ['telegramBotToken', '', 'Token ของ Telegram Bot'],
    ['telegramChatId', '', 'Chat ID ของกลุ่ม Telegram']
  ];
  sheet.getRange(2, 1, defaultSettings.length, 3).setValues(defaultSettings);
}

function createJsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
