import { Booking, SheetWebhookPayload } from '../types';

export const SECRET_TOKEN = import.meta.env.VITE_SHEETS_SECRET_TOKEN || 'SMART_MEETING_2026_SECURE_KEY';
const LS_WEBHOOK_KEY = 'smart_room_sheets_webhook_url';

export function getWebhookUrl(): string {
  try {
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
 * Sends a test ping to the Google Sheets Webhook URL to verify connection
 */
export async function testSheetConnection(urlToTest?: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = urlToTest?.trim() || getWebhookUrl();
  if (!targetUrl) {
    return { success: false, message: 'กรุณากรอก URL ของ Google Apps Script Web App' };
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'ping',
        secretToken: SECRET_TOKEN,
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: true,
        message: data?.message || 'เชื่อมต่อ Google Sheets Webhook สำเร็จพร้อมบันทึกข้อมูล! 🚀',
      };
    } else {
      return {
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ (HTTP Status: ${res.status}) ตรวจสอบว่าเลือกสิทธิ์เป็น 'Anyone' แล้วหรือยัง`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `ไม่สามารถเรียก Webhook ได้: ${err.message || 'Network Error'}`,
    };
  }
}

/**
 * Sends booking update to Google Sheet Webhook via fetch POST (Content-Type: text/plain).
 * Retries up to 3 times with exponential backoff on failure.
 * Non-blocking: will never crash the main booking flow.
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
      // Content-Type: text/plain is used deliberately to prevent CORS Preflight OPTIONS in Google Apps Script
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`✅ Google Sheet synced successfully on attempt ${attempt}`);
        return { success: true };
      }
    } catch (err) {
      console.warn(`⚠️ Google Sheet sync attempt ${attempt}/${maxRetries} failed:`, err);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  console.warn('⚠️ Google Sheet sync failed after 3 attempts. Local & Cloud data remains intact.');
  return { success: false, message: 'ไม่สามารถส่งข้อมูลไปยัง Google Sheet ได้ (ลองครบ 3 ครั้ง)' };
}
