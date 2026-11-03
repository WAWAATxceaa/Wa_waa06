import { Booking } from '../types';

export const SECRET_TOKEN = import.meta.env.VITE_SHEETS_SECRET_TOKEN || 'TTC_SHEET_SECRET_2026';
const LS_WEBHOOK_KEY = 'ttc_sheets_webhook_url';

/**
 * ดึง Webhook URL ของ Google Apps Script:
 * 1. ตรวจสอบจาก URL Param e.g. ?sheet=https://script.google.com/macros/s/.../exec
 * 2. ตรวจสอบจาก localStorage (ที่ผู้ใช้กรอกในหน้าจัดการ)
 * 3. ตรวจสอบจากตัวแปรแวดล้อม VITE_SHEETS_WEBHOOK_URL (.env / GitHub Secrets)
 */
export function getWebhookUrl(): string {
  try {
    const checkParam = (queryStr: string) => {
      const params = new URLSearchParams(queryStr);
      return params.get('sheet') || params.get('sheetUrl') || params.get('api') || params.get('webhook');
    };

    let fromUrl = checkParam(window.location.search);
    if (!fromUrl && window.location.hash.includes('?')) {
      const qIndex = window.location.hash.indexOf('?');
      fromUrl = checkParam(window.location.hash.substring(qIndex));
    }

    if (fromUrl && fromUrl.trim().startsWith('http')) {
      const decoded = decodeURIComponent(fromUrl.trim());
      localStorage.setItem(LS_WEBHOOK_KEY, decoded);
      return decoded;
    }

    const saved = localStorage.getItem(LS_WEBHOOK_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {}

  return import.meta.env.VITE_SHEETS_WEBHOOK_URL || '';
}

export function setWebhookUrl(url: string): void {
  try {
    localStorage.setItem(LS_WEBHOOK_KEY, url.trim());
  } catch (e) {}
}

/**
 * แปลงข้อมูลการจองเป็น Payload สำหรับส่งเข้า Google Sheet แท็บ "การจอง"
 */
export function createSheetPayload(
  booking: Booking,
  eventType: 'create' | 'update' | 'cancel' | 'status_change'
) {
  let statusThai = booking.statusThai || booking.status || 'ยื่นคำขอแล้ว';
  if (booking.status === 'approved') statusThai = 'อนุมัติเรียบร้อย';
  else if (booking.status === 'cancelled') statusThai = 'ยกเลิกคำขอ';
  else if (booking.status === 'rejected') statusThai = 'ไม่อนุมัติ/ส่งกลับ';
  else if (booking.status === 'pending_step2') statusThai = 'รอตรวจความพร้อมห้อง/โสตฯ (ขั้น 2)';
  else if (booking.status === 'pending_step3') statusThai = 'รอรับรอง (ขั้น 3)';
  else if (booking.status === 'pending_step4') statusThai = 'รอพิจารณาอนุมัติ (ขั้น 4)';

  const amenities =
    booking.amenitiesText ||
    (Array.isArray(booking.amenities) ? booking.amenities.join(', ') : '') ||
    '-';

  return {
    action: eventType,
    secretToken: SECRET_TOKEN,
    bookingCode: booking.bookingCode,
    status: booking.status,
    statusThai: statusThai,
    roomName: booking.roomName || 'ไม่ระบุห้อง',
    otherRoomName: booking.otherRoomName || '',
    date: booking.date || '',
    startTime: booking.startTime || '',
    endTime: booking.endTime || '',
    participantCount: Number(booking.participantCount) || 1,
    amenities: amenities,
    amenitiesText: amenities,
    bookerName: booking.bookerName || '-',
    bookerPosition: booking.bookerPosition || 'บุคลากร',
    department: booking.department || '-',
    contact: booking.bookerContact || '-',
    bookerContact: booking.bookerContact || '-',
    title: booking.title || '-',
    description: booking.description || '-',
    currentStep: booking.currentStep || 1,
    createdAt: booking.createdAt || new Date().toISOString(),
    updatedAt: booking.updatedAt || new Date().toISOString(),
    note: booking.cancelledReason || '',
    attachmentUrl: booking.attachmentUrl || '',
  };
}

/**
 * =========================================================================
 * ส่งสำเนาข้อมูลการจองเข้า Google Sheet (ทางเดียว: เว็บ -> ชีต)
 * =========================================================================
 * - ทำงานในเบื้องหลังแบบ Asynchronous (ห้ามผู้ใช้ต้องรอ)
 * - ส่งทุกเหตุการณ์: จองใหม่ (create), แก้ไข (update), ยกเลิก (cancel), เปลี่ยนสถานะ (status_change)
 * - ป้องกันปัญหา CORS Preflight ด้วย Content-Type: text/plain
 * - ลองส่งซ้ำสูงสุด 3 ครั้งพร้อม Exponential Backoff
 * - ไม่ทำให้การทำงานหลักของเว็บล้มเหลว
 * - แสดงสถานะชัดเจนใน Console (DevTools)
 */
export async function sendBookingToGoogleSheet(
  booking: Booking,
  eventType: 'create' | 'update' | 'cancel' | 'status_change',
  onFailureWarning?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
  const url = getWebhookUrl();

  if (!url || !url.trim().startsWith('http')) {
    console.log(
      `ℹ️ [Google Sheet Sync] ยังไม่ได้ระบุ VITE_SHEETS_WEBHOOK_URL หรือ Webhook URL ในระบบ (บันทึกในเว็บเรียบร้อยแล้ว) | Booking Code: ${booking.bookingCode}`
    );
    return { success: false, error: 'ยังไม่ได้ระบุ Webhook URL' };
  }

  const payload = createSheetPayload(booking, eventType);
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `⏳ [Google Sheet Sync] กำลังส่งข้อมูลไปยัง Google Sheet (ครั้งที่ ${attempt}/${maxRetries}) | Code: ${booking.bookingCode} | เหตุการณ์: ${eventType}`
      );

      // ใช้ Content-Type: text/plain;charset=utf-8 และ mode: no-cors เพื่อเลี่ยงปัญหา CORS preflight & 302 redirect
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      console.log(
        `%c✅ [Google Sheet Sync] ส่งข้อมูลเข้า Google Sheet สำเร็จ! | Booking Code: ${booking.bookingCode} | สถานะ: ${payload.statusThai} | เหตุการณ์: ${eventType}`,
        'color: #10B981; font-weight: bold; font-size: 11px;'
      );

      return { success: true };
    } catch (err: any) {
      console.warn(
        `⚠️ [Google Sheet Sync] การส่งครั้งที่ ${attempt}/${maxRetries} ล้มเหลว:`,
        err?.message || err
      );

      if (attempt < maxRetries) {
        // รอ 1 วินาทีก่อนลองส่งซ้ำ
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  const errorMsg = `ไม่สามารถส่งข้อมูลไปยัง Google Sheet ได้ (ลองครบ 3 ครั้ง) | รหัส: ${booking.bookingCode}`;
  console.warn(
    `%c${errorMsg}`,
    'color: #F43F5E; font-weight: bold; font-size: 11px;'
  );

  if (onFailureWarning) {
    onFailureWarning('ส่งข้อมูลไปยัง Google Sheet ล้มเหลว (ข้อมูลในเว็บยังบันทึกครบถ้วน)');
  }

  return { success: false, error: errorMsg };
}

export const syncToGoogleSheet = sendBookingToGoogleSheet;

/**
 * อัปโหลดไฟล์กำหนดการเข้า Base64 / Google Drive (ไม่บล็อกการจอง)
 */
export async function apiUploadAttachment(file: File): Promise<{ success: boolean; fileUrl?: string; fileName?: string; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        success: true,
        fileUrl: reader.result as string,
        fileName: file.name,
      });
    };
    reader.onerror = () => {
      resolve({ success: false, error: 'ไม่สามารถอ่านไฟล์ได้' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * ฟังก์ชันทดสอบการเชื่อมต่อ Google Sheets Webhook
 */
export async function testSheetConnection(targetUrl?: string): Promise<{ success: boolean; message: string }> {
  const url = targetUrl || getWebhookUrl();
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, message: 'กรุณากรอก Webhook URL ของ Google Apps Script (ลงท้ายด้วย /exec)' };
  }

  try {
    const testPayload = {
      action: 'ping',
      secretToken: SECRET_TOKEN,
      timestamp: new Date().toISOString(),
    };

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(testPayload),
    });

    return {
      success: true,
      message: 'ส่งคำขอทดสอบไปยัง Google Apps Script สำเร็จ! ตรวจสอบแท็บ "การจอง" ได้เลยครับ 🚀',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'เชื่อมต่อไม่สำเร็จ: ' + (err?.message || 'โปรดตรวจสอบสิทธิ์ Anyone ในการ Deploy'),
    };
  }
}
