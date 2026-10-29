import { Booking, SheetWebhookPayload } from '../types';

export const SECRET_TOKEN = import.meta.env.VITE_SHEETS_SECRET_TOKEN || 'SMART_MEETING_2026_SECURE_KEY';
const LS_WEBHOOK_KEY = 'smart_room_sheets_webhook_url';

export function getWebhookUrl(): string {
  try {
    // 1. Check if URL param exists in search or hash (e.g. ?sheet=https://script.google.com/macros/s/.../exec)
    const checkParam = (queryStr: string) => {
      const params = new URLSearchParams(queryStr);
      return params.get('sheet') || params.get('sheetUrl');
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

    const custom = localStorage.getItem(LS_WEBHOOK_KEY);
    if (custom && custom.trim()) return custom.trim();
  } catch (e) {}
  return import.meta.env.VITE_SHEETS_WEBHOOK_URL || '';
}

export function setWebhookUrl(url: string): void {
  try {
    localStorage.setItem(LS_WEBHOOK_KEY, url.trim());
  } catch (e) {}
}

/**
 * Maps Booking object to Google Sheets Webhook payload format
 */
export function createSheetPayload(
  booking: Booking,
  action: 'create' | 'update' | 'cancel'
): SheetWebhookPayload {
  const statusThai =
    action === 'cancel' || booking.status === 'cancelled'
      ? 'ยกเลิก'
      : action === 'update'
      ? 'แก้ไข'
      : 'จองสำเร็จ';

  return {
    action,
    bookingCode: booking.bookingCode,
    status: statusThai,
    roomName: booking.roomName,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    participantCount: booking.participantCount,
    amenities: (booking.amenities || []).join(', ') || '-',
    bookerName: booking.bookerName,
    department: booking.department,
    contact: booking.bookerContact,
    title: booking.title,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt || booking.createdAt,
    secretToken: SECRET_TOKEN,
  };
}

/**
 * Reads all bookings directly from Google Sheet via doGet
 */
export async function fetchBookingsFromGoogleSheet(): Promise<Booking[]> {
  const url = getWebhookUrl();
  if (!url) return [];

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    if (data && Array.isArray(data.bookings)) {
      return data.bookings;
    }
  } catch (err) {
    // Silently ignore network or offline
  }
  return [];
}

/**
 * Sends a test ping to the Google Sheets Webhook URL to verify connection
 */
export async function testSheetConnection(urlToTest?: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = urlToTest?.trim() || getWebhookUrl();
  if (!targetUrl) {
    return { success: false, message: 'กรุณากรอก URL ของ Google Apps Script Web App' };
  }

  try {
    // 1. Try reading via GET first
    const getRes = await fetch(targetUrl, { method: 'GET' }).catch(() => null);
    if (getRes && getRes.ok) {
      return {
        success: true,
        message: 'เชื่อมต่อ Google Sheets Webhook สำเร็จพร้อมซิงค์ข้อมูล! 🚀',
      };
    }

    // 2. Try POST with no-cors fallback
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'ping',
        secretToken: SECRET_TOKEN,
      }),
    });

    return {
      success: true,
      message: 'ส่งคำขอไปยัง Google Apps Script สำเร็จ! ตรวจสอบสิทธิ์ใน Google Sheet ได้เลยครับ',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `ไม่สามารถเรียก Webhook ได้: ${err.message || 'Network Error'}`,
    };
  }
}

/**
 * Sends booking update to Google Sheet Webhook via fetch POST.
 * Uses mode: 'no-cors' to avoid browser CORS redirect blocking from Google Apps Script.
 * Retries up to 3 times on failure.
 */
export async function syncToGoogleSheet(
  booking: Booking,
  action: 'create' | 'update' | 'cancel' = 'create'
): Promise<{ success: boolean; message?: string }> {
  const url = getWebhookUrl();
  if (!url) {
    console.log('ℹ️ Google Sheets Webhook URL is not configured. Skipping sheet sync.');
    return { success: false, message: 'ไม่ได้ตั้งค่า URL Webhook' };
  }

  const payload = createSheetPayload(booking, action);
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // mode: 'no-cors' is essential so browser doesn't block Google Apps Script 302 redirect!
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      console.log(`✅ Google Sheet synced successfully on attempt ${attempt}`);
      return { success: true };
    } catch (err) {
      console.warn(`⚠️ Google Sheet sync attempt ${attempt}/${maxRetries} failed:`, err);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  console.warn('⚠️ Google Sheet sync failed after 3 attempts.');
  return { success: false, message: 'ไม่สามารถส่งข้อมูลไปยัง Google Sheet ได้ (ลองครบ 3 ครั้ง)' };
}
