import { Booking, Room, SystemSettings, Announcement, ApprovalStepLog } from '../types';
import { INITIAL_ROOMS, DEFAULT_SYSTEM_SETTINGS } from '../config/constants';

export const SECRET_TOKEN = import.meta.env.VITE_SHEETS_SECRET_TOKEN || 'TTC_SECURE_KEY_2026';
const LS_WEBHOOK_KEY = 'ttc_sheets_webhook_url';

export async function fetchBookingsFromGoogleSheet(): Promise<Booking[]> {
  const full = await fetchFullData();
  return full.bookings;
}

export async function syncToGoogleSheet(booking: Booking, action: 'create' | 'update' | 'cancel') {
  if (action === 'cancel') {
    return apiCancelBooking(booking.bookingCode, 'ยกเลิกคำขอ');
  }
  return apiCreateBooking(booking);
}

export function getWebhookUrl(): string {
  try {
    const checkParam = (queryStr: string) => {
      const params = new URLSearchParams(queryStr);
      return params.get('sheet') || params.get('sheetUrl') || params.get('api');
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
 * ดึงข้อมูลทั้งหมดจาก Google Sheet (Single Source of Truth)
 */
export async function fetchFullData(): Promise<{
  bookings: Booking[];
  rooms: Room[];
  settings: Partial<SystemSettings>;
  announcements: Announcement[];
}> {
  const url = getWebhookUrl();
  if (!url) {
    return {
      bookings: [],
      rooms: INITIAL_ROOMS,
      settings: DEFAULT_SYSTEM_SETTINGS,
      announcements: [],
    };
  }

  try {
    const res = await fetch(`${url}?type=all&_t=${Date.now()}`, {
      method: 'GET',
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();

    const bookings: Booking[] = Array.isArray(data.bookings) ? data.bookings : [];
    const rooms: Room[] = (Array.isArray(data.rooms) && data.rooms.length > 0) ? data.rooms : INITIAL_ROOMS;
    const settings: Partial<SystemSettings> = data.settings || {};
    const announcements: Announcement[] = Array.isArray(data.announcements) ? data.announcements : [];

    return { bookings, rooms, settings, announcements };
  } catch (err) {
    console.warn('fetchFullData error:', err);
    return {
      bookings: [],
      rooms: INITIAL_ROOMS,
      settings: DEFAULT_SYSTEM_SETTINGS,
      announcements: [],
    };
  }
}

/**
 * ส่งคำขอ POST ไปยัง Google Apps Script Web App
 */
async function sendPostRequest(payload: any, maxRetries = 3): Promise<{ success: boolean; data?: any; error?: string }> {
  const url = getWebhookUrl();
  if (!url) {
    return { success: false, error: 'ยังไม่ได้ระบุ Webhook URL ของ Google Apps Script' };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({ success: true }));
        return { success: true, data: json };
      }
    } catch (err) {
      console.warn(`POST attempt ${attempt}/${maxRetries} failed:`, err);
      // Fallback for CORS redirect
      if (attempt === maxRetries) {
        try {
          await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload),
          });
          return { success: true, data: { success: true, noCors: true } };
        } catch (noCorsErr) {
          return { success: false, error: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ Google Apps Script ได้' };
        }
      }
    }
  }

  return { success: false, error: 'หมดเวลาการเชื่อมต่อ (ลองครบ 3 ครั้ง)' };
}

/**
 * 1. ยื่นคำขอจองห้องใหม่ (ขั้นที่ 1)
 */
export async function apiCreateBooking(bookingData: Partial<Booking>): Promise<{ success: boolean; bookingCode?: string; error?: string }> {
  const res = await sendPostRequest({
    action: 'create_booking',
    ...bookingData,
  });

  if (res.success) {
    return {
      success: true,
      bookingCode: res.data?.bookingCode || bookingData.bookingCode,
    };
  }

  return { success: false, error: res.data?.error || res.error || 'เกิดข้อผิดพลาดในการส่งคำขอ' };
}

/**
 * 2. บันทึกผลการพิจารณาตามสายอนุมัติ 4 ขั้น (ห้ามข้ามขั้น)
 */
export async function apiApproveStep(params: {
  bookingCode: string;
  step: 2 | 3 | 4;
  stepAction: string;
  actorName: string;
  actorRole: string;
  note?: string;
}): Promise<{ success: boolean; status?: string; statusThai?: string; error?: string }> {
  const res = await sendPostRequest({
    action: 'approve_step',
    ...params,
  });

  if (res.success && res.data?.success !== false) {
    return {
      success: true,
      status: res.data?.status,
      statusThai: res.data?.statusThai,
    };
  }

  return { success: false, error: res.data?.error || res.error || 'ไม่สามารถบันทึกผลการพิจารณาได้' };
}

/**
 * 3. ยกเลิกคำขอโดยผู้ขอ
 */
export async function apiCancelBooking(bookingCode: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const res = await sendPostRequest({
    action: 'cancel_booking',
    bookingCode,
    reason,
  });

  if (res.success && res.data?.success !== false) {
    return { success: true };
  }

  return { success: false, error: res.data?.error || res.error || 'ไม่สามารถยกเลิกคำขอได้' };
}

/**
 * 4. อัปโหลดไฟล์กำหนดการเข้า Google Drive
 */
export async function apiUploadAttachment(file: File): Promise<{ success: boolean; fileUrl?: string; fileName?: string; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const res = await sendPostRequest({
        action: 'upload_attachment',
        fileName: file.name,
        mimeType: file.type,
        base64Data: base64Data,
      });

      if (res.success && res.data?.fileUrl) {
        resolve({
          success: true,
          fileUrl: res.data.fileUrl,
          fileName: file.name,
        });
      } else {
        resolve({
          success: false,
          error: res.data?.error || 'อัปโหลดไฟล์ไปยัง Google Drive ไม่สำเร็จ',
        });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, error: 'ไม่สามารถอ่านไฟล์ได้' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 5. ทดสอบการเชื่อมต่อ Apps Script
 */
export async function testSheetConnection(targetUrl?: string): Promise<{ success: boolean; message: string }> {
  const url = targetUrl || getWebhookUrl();
  if (!url) {
    return { success: false, message: 'กรุณากรอก Webhook URL' };
  }

  try {
    const res = await fetch(`${url}?type=ping&_t=${Date.now()}`);
    if (res.ok) {
      return {
        success: true,
        message: 'เชื่อมต่อ Google Apps Script Web App สำเร็จพร้อมใช้งาน! 🚀',
      };
    }
  } catch (err) {}

  // Try POST
  try {
    const postRes = await sendPostRequest({ action: 'ping' });
    if (postRes.success) {
      return {
        success: true,
        message: 'เชื่อมต่อ Google Apps Script Web App สำเร็จพร้อมใช้งาน! 🚀',
      };
    }
  } catch (err) {}

  return {
    success: false,
    message: 'เชื่อมต่อไม่สำเร็จ โปรดตรวจว่าตั้งค่าการ Deploy สิทธิ์เป็น "ทุกคน (Anyone)" แล้วหรือไม่',
  };
}
