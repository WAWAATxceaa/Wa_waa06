import * as XLSX from 'xlsx';
import { Booking } from '../types';
import { formatThaiDate } from '../utils/dateUtils';

/**
 * แปลงข้อมูลการจองเป็นตารางสำหรับส่งออกราชการ
 */
function mapBookingToExportRow(b: Booking) {
  let statusText = b.statusThai || b.status;
  if (b.status === 'approved') statusText = 'อนุมัติเรียบร้อย';
  else if (b.status === 'pending_step2') statusText = 'รอตรวจความพร้อมห้อง/โสตฯ';
  else if (b.status === 'pending_step3') statusText = 'รอรับรอง (หัวหน้าศูนย์ดิจิทัลฯ)';
  else if (b.status === 'pending_step4') statusText = 'รอพิจารณาอนุมัติ (รอง ผอ.)';
  else if (b.status === 'rejected') statusText = 'ไม่อนุมัติ/ส่งกลับ';
  else if (b.status === 'cancelled') statusText = 'ยกเลิกคำขอ';

  return {
    'รหัสคำขอ (Booking Code)': b.bookingCode,
    'สถานะคำขอ': statusText,
    'ขั้นตอนปัจจุบัน': b.currentStep || 1,
    'ห้องประชุม': b.otherRoomName || b.roomName,
    'วันที่ขอใช้': b.date,
    'เวลาเริ่ม': b.startTime,
    'เวลาสิ้นสุด': b.endTime,
    'จำนวนผู้เข้าร่วม (คน)': b.participantCount,
    'ผู้ขอใช้': b.bookerName,
    'ตำแหน่ง': b.bookerPosition || 'บุคลากร',
    'หน่วยงาน/แผนกวิชา': b.department,
    'เบอร์โทรศัพท์': b.bookerContact,
    'หัวข้อ/วัตถุประสงค์': b.title,
    'รายละเอียดเพิ่มเติม': b.description || '-',
    'ครุภัณฑ์ที่ขอใช้': b.amenitiesText || '-',
    'โต๊ะเสริม (ตัว)': b.extraTableCount || 0,
    'เก้าอี้เสริม (ตัว)': b.extraChairCount || 0,
    'ไฟล์แนบ Google Drive': b.attachmentUrl || '-',
    'ตรวจความพร้อมโสตฯ (ขั้น 2)': b.step2StaffStatus === 'ready' ? `พร้อม (${b.step2StaffName || ''})` : '-',
    'รับรองคำขอ (ขั้น 3)': b.step3ChiefStatus === 'endorsed' ? `รับรองแล้ว (${b.step3ChiefName || ''})` : '-',
    'การอนุมัติ (ขั้น 4)': b.step4DeputyStatus === 'approved' ? `อนุมัติแล้ว (${b.step4DeputyName || ''})` : '-',
    'วันที่ยื่นคำขอ': formatThaiDate(b.createdAt),
  };
}

/**
 * 1. Export Bookings to Excel (.xlsx) using SheetJS
 */
export function exportToExcel(bookings: Booking[], fileName = 'ttc-meeting-room-report.xlsx') {
  const data = bookings.map(mapBookingToExportRow);
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานการใช้ห้องประชุม TTC');

  // Column auto widths
  const colWidths = [
    { wch: 16 }, // Code
    { wch: 22 }, // Status
    { wch: 10 }, // Step
    { wch: 26 }, // Room
    { wch: 14 }, // Date
    { wch: 10 }, // Start
    { wch: 10 }, // End
    { wch: 18 }, // Attendees
    { wch: 22 }, // Booker
    { wch: 20 }, // Position
    { wch: 25 }, // Department
    { wch: 18 }, // Contact
    { wch: 30 }, // Topic
    { wch: 25 }, // Note
    { wch: 25 }, // Amenities
    { wch: 12 }, // Extra tables
    { wch: 12 }, // Extra chairs
    { wch: 30 }, // Attachment URL
    { wch: 22 }, // Step 2
    { wch: 22 }, // Step 3
    { wch: 22 }, // Step 4
    { wch: 20 }, // Created
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, fileName);
}

/**
 * 2. Export Bookings to CSV with UTF-8 BOM (\uFEFF)
 * รับประกันภาษาไทยไม่เพี้ยน ไม่เป็นภาษาต่างดาวเมื่อเปิดใน Microsoft Excel
 */
export function exportToCSV(bookings: Booking[], fileName = 'ttc-meeting-room-report.csv') {
  const data = bookings.map(mapBookingToExportRow);
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row: any) => {
    return headers
      .map((header) => {
        let val = String(row[header] || '').replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(',');
  });

  // ใส่ UTF-8 BOM (\uFEFF) นำหน้าไฟล์ CSV เสมอ!
  const csvContent = '\uFEFF' + headers.map((h) => `"${h}"`).join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 3. Export complete system backup to JSON file (สำรองข้อมูล)
 */
export function exportSystemBackup(data: {
  bookings: any[];
  rooms: any[];
  settings: any;
}, fileName = `ttc-backup-${new Date().toISOString().slice(0, 10)}.json`) {
  const payload = {
    ...data,
    backupVersion: '2.0',
    system: 'TTC Smart Meeting Room Booking',
    exportedAt: new Date().toISOString(),
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
