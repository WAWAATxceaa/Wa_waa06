import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  runTransaction,
  Firestore,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { Booking, Room, NotificationItem } from '../types';
import { INITIAL_ROOMS } from '../config/constants';
import { isTimeSlotConflicting } from '../utils/dateUtils';
import { syncToGoogleSheet, fetchBookingsFromGoogleSheet, getWebhookUrl } from './sheetsService';

const LS_BOOKINGS_KEY = 'smart_meeting_bookings_v3';
const LS_ROOMS_KEY = 'smart_meeting_rooms_v3';
const LS_NOTIFICATIONS_KEY = 'smart_meeting_notifications_v3';

const localEventBus = new EventTarget();

const getActiveDb = (): Firestore => db as Firestore;

function getStoredLocalData<T>(key: string, defaultData: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultData;
  } catch (e) {
    return defaultData;
  }
}

function saveLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localEventBus.dispatchEvent(new CustomEvent('datachange', { detail: { key } }));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

/**
 * Initialize sample rooms to Firestore if configured
 */
export async function seedInitialRoomsIfEmpty(): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(getActiveDb(), 'rooms'));
      if (snap.empty) {
        for (const room of INITIAL_ROOMS) {
          await setDoc(doc(getActiveDb(), 'rooms', room.id), room);
        }
      }
    } catch (e) {
      console.warn('Firestore seeding check error:', e);
    }
  } else {
    const localRooms = getStoredLocalData<Room[]>(LS_ROOMS_KEY, []);
    if (localRooms.length === 0) {
      saveLocalData(LS_ROOMS_KEY, INITIAL_ROOMS);
    }
  }
}

/**
 * Real-time listener for Rooms
 */
export function subscribeRooms(callback: (rooms: Room[]) => void): () => void {
  seedInitialRoomsIfEmpty();

  if (isFirebaseConfigured && db) {
    return onSnapshot(
      collection(getActiveDb(), 'rooms'),
      (snapshot) => {
        const rooms: Room[] = [];
        snapshot.forEach((docItem) => {
          rooms.push({ ...(docItem.data() as Room), id: docItem.id });
        });
        rooms.sort((a, b) => (a.order || 0) - (b.order || 0));
        callback(rooms.length > 0 ? rooms : INITIAL_ROOMS);
      },
      (error) => {
        console.warn('Firestore room error:', error);
        callback(getStoredLocalData<Room[]>(LS_ROOMS_KEY, INITIAL_ROOMS));
      }
    );
  }

  const emit = () => {
    const rooms = getStoredLocalData<Room[]>(LS_ROOMS_KEY, INITIAL_ROOMS);
    callback(rooms.sort((a, b) => (a.order || 0) - (b.order || 0)));
  };
  emit();

  const listener = () => emit();
  localEventBus.addEventListener('datachange', listener);
  window.addEventListener('storage', listener);

  return () => {
    localEventBus.removeEventListener('datachange', listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * Real-time listener for Bookings
 * Supports Firebase Firestore onSnapshot, OR Google Sheets real-time polling sync!
 */
export function subscribeBookings(callback: (bookings: Booking[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    return onSnapshot(
      collection(getActiveDb(), 'bookings'),
      (snapshot) => {
        const bookings: Booking[] = [];
        snapshot.forEach((docItem) => {
          bookings.push({ ...(docItem.data() as Booking), id: docItem.id });
        });
        callback(bookings);
      },
      (error) => {
        console.warn('Firestore bookings error:', error);
      }
    );
  }

  // 1. Emit local cache immediately
  const emitLocal = () => {
    const local = getStoredLocalData<Booking[]>(LS_BOOKINGS_KEY, []);
    callback(local);
  };
  emitLocal();

  // 2. Poll Google Sheet for live updates across devices
  const syncFromGoogleSheet = async () => {
    if (!getWebhookUrl()) return;
    const sheetBookings = await fetchBookingsFromGoogleSheet();
    if (sheetBookings && sheetBookings.length > 0) {
      // Merge with any local bookings
      const local = getStoredLocalData<Booking[]>(LS_BOOKINGS_KEY, []);
      const mergedMap = new Map<string, Booking>();
      local.forEach((b) => mergedMap.set(b.bookingCode, b));
      sheetBookings.forEach((b) => {
        if (!b.bookingCode) return;
        if (!b.roomId) {
          const foundRoom = INITIAL_ROOMS.find((r) => r.name === b.roomName) || INITIAL_ROOMS[0];
          b.roomId = foundRoom.id;
        }
        if (!b.roomColor) {
          const foundRoom = INITIAL_ROOMS.find((r) => r.id === b.roomId);
          b.roomColor = foundRoom?.color || '#8B5CF6';
        }
        if (!b.startDateTime && b.date && b.startTime) {
          b.startDateTime = `${b.date}T${b.startTime}:00`;
        }
        if (!b.endDateTime && b.date && b.endTime) {
          b.endDateTime = `${b.date}T${b.endTime}:00`;
        }
        mergedMap.set(b.bookingCode, b);
      });
      const merged = Array.from(mergedMap.values());
      saveLocalData(LS_BOOKINGS_KEY, merged);
      callback(merged);
    }
  };

  syncFromGoogleSheet();
  const pollInterval = setInterval(syncFromGoogleSheet, 4000); // Poll Google Sheet every 4s for cross-device real-time sync

  const listener = () => emitLocal();
  localEventBus.addEventListener('datachange', listener);
  window.addEventListener('storage', listener);

  return () => {
    clearInterval(pollInterval);
    localEventBus.removeEventListener('datachange', listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * Real-time listener for Notifications
 */
export function subscribeNotifications(callback: (notifications: NotificationItem[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    return onSnapshot(
      collection(getActiveDb(), 'notifications'),
      (snapshot) => {
        const items: NotificationItem[] = [];
        snapshot.forEach((docItem) => {
          items.push({ ...(docItem.data() as NotificationItem), id: docItem.id });
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (error) => {
        console.warn('Firestore notifications error:', error);
      }
    );
  }

  const emit = () => {
    const items = getStoredLocalData<NotificationItem[]>(LS_NOTIFICATIONS_KEY, []);
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(items);
  };
  emit();

  const listener = () => emit();
  localEventBus.addEventListener('datachange', listener);
  window.addEventListener('storage', listener);

  return () => {
    localEventBus.removeEventListener('datachange', listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * Add a notification
 */
export async function addNotification(
  type: NotificationItem['type'],
  title: string,
  message: string,
  bookingId?: string,
  bookingCode?: string
): Promise<void> {
  const newNotif: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    title,
    message,
    bookingId,
    bookingCode,
    createdAt: new Date().toISOString(),
    read: false,
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(getActiveDb(), 'notifications', newNotif.id), newNotif);
      return;
    } catch (e) {}
  }

  const items = getStoredLocalData<NotificationItem[]>(LS_NOTIFICATIONS_KEY, []);
  items.unshift(newNotif);
  saveLocalData(LS_NOTIFICATIONS_KEY, items);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(getActiveDb(), 'notifications', id), { read: true });
      return;
    } catch (e) {}
  }
  const items = getStoredLocalData<NotificationItem[]>(LS_NOTIFICATIONS_KEY, []);
  const updated = items.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveLocalData(LS_NOTIFICATIONS_KEY, updated);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(query(collection(getActiveDb(), 'notifications'), where('read', '==', false)));
      for (const d of snap.docs) {
        await updateDoc(doc(getActiveDb(), 'notifications', d.id), { read: true });
      }
      return;
    } catch (e) {}
  }
  const items = getStoredLocalData<NotificationItem[]>(LS_NOTIFICATIONS_KEY, []);
  const updated = items.map((n) => ({ ...n, read: true }));
  saveLocalData(LS_NOTIFICATIONS_KEY, updated);
}

/**
 * Client-Side Conflict Check Helper
 */
export function checkBookingConflict(
  existingBookings: Booking[],
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingCode?: string
): { hasConflict: boolean; conflictingBooking?: Booking; message?: string } {
  const matching = existingBookings.filter(
    (b) =>
      b.roomId === roomId &&
      b.date === date &&
      b.status !== 'cancelled' &&
      (!excludeBookingCode || b.bookingCode !== excludeBookingCode)
  );

  for (const b of matching) {
    if (isTimeSlotConflicting(startTime, endTime, b.startTime, b.endTime)) {
      return {
        hasConflict: true,
        conflictingBooking: b,
        message: `ช่วงเวลา ${b.startTime} - ${b.endTime} น. ถูกจองแล้ว (${b.title} โดย ${b.bookerName}) กรุณาเลือกช่วงเวลาอื่น`,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Create a new booking
 * 1. Checks conflict inside transaction
 * 2. Saves to Firebase Firestore or Google Sheets
 * 3. Syncs across all devices
 */
export async function createBooking(
  bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const now = new Date().toISOString();
  const id = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newBooking: Booking = {
    ...bookingData,
    id,
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
  };

  // 1. If Firebase is configured: run Firestore Transaction
  if (isFirebaseConfigured && db) {
    const firestore = getActiveDb();
    try {
      await runTransaction(firestore, async (transaction) => {
        const bookingsRef = collection(firestore, 'bookings');
        const q = query(
          bookingsRef,
          where('roomId', '==', newBooking.roomId),
          where('date', '==', newBooking.date),
          where('status', '==', 'confirmed')
        );

        const querySnapshot = await getDocs(q);
        const existingList: Booking[] = [];
        querySnapshot.forEach((d) => existingList.push(d.data() as Booking));

        for (const existing of existingList) {
          if (
            existing.status !== 'cancelled' &&
            isTimeSlotConflicting(newBooking.startTime, newBooking.endTime, existing.startTime, existing.endTime)
          ) {
            throw new Error(
              `ช่วงเวลา ${existing.startTime} - ${existing.endTime} น. ถูกจองแล้ว (${existing.title} โดย ${existing.bookerName}) กรุณาเลือกช่วงเวลาอื่น`
            );
          }
        }

        const docRef = doc(firestore, 'bookings', id);
        transaction.set(docRef, newBooking);
      });

      await addNotification(
        'new_booking',
        '🎉 มีการจองห้องใหม่',
        `${newBooking.bookerName} ได้จอง "${newBooking.roomName}" วันที่ ${newBooking.date} เวลา ${newBooking.startTime}-${newBooking.endTime} น.`,
        newBooking.id,
        newBooking.bookingCode
      );

      syncToGoogleSheet(newBooking, 'create').catch(console.warn);
      return { success: true, booking: newBooking };
    } catch (err: any) {
      return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  // 2. Google Sheets / Local Real-Time Sync Mode
  let currentBookings = getStoredLocalData<Booking[]>(LS_BOOKINGS_KEY, []);

  // Check conflict: Same room, same date, start < otherEnd && end > otherStart, not cancelled
  const conflict = checkBookingConflict(
    currentBookings,
    newBooking.roomId,
    newBooking.date,
    newBooking.startTime,
    newBooking.endTime
  );

  if (conflict.hasConflict) {
    return { success: false, error: conflict.message || 'ช่วงเวลานี้มีการจองห้องแล้ว' };
  }

  currentBookings.push(newBooking);
  saveLocalData(LS_BOOKINGS_KEY, currentBookings);

  // Sync to Google Sheet immediately via no-cors
  syncToGoogleSheet(newBooking, 'create').catch(console.warn);

  await addNotification(
    'new_booking',
    '🎉 มีการจองห้องใหม่',
    `${newBooking.bookerName} ได้จอง "${newBooking.roomName}" วันที่ ${newBooking.date} เวลา ${newBooking.startTime}-${newBooking.endTime} น.`,
    newBooking.id,
    newBooking.bookingCode
  );

  return { success: true, booking: newBooking };
}

/**
 * Update an existing booking
 */
export async function updateBooking(
  bookingCode: string,
  updatedFields: Partial<Booking>
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const now = new Date().toISOString();

  if (isFirebaseConfigured && db) {
    const firestore = getActiveDb();
    try {
      let updatedBookingResult: Booking | null = null;
      await runTransaction(firestore, async (transaction) => {
        const q = query(collection(firestore, 'bookings'), where('bookingCode', '==', bookingCode));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error(`ไม่พบรหัสการจอง "${bookingCode}"`);

        const docItem = snap.docs[0];
        const current = docItem.data() as Booking;

        const targetRoomId = updatedFields.roomId || current.roomId;
        const targetDate = updatedFields.date || current.date;
        const targetStartTime = updatedFields.startTime || current.startTime;
        const targetEndTime = updatedFields.endTime || current.endTime;

        if (
          (updatedFields.roomId && updatedFields.roomId !== current.roomId) ||
          (updatedFields.date && updatedFields.date !== current.date) ||
          (updatedFields.startTime && updatedFields.startTime !== current.startTime) ||
          (updatedFields.endTime && updatedFields.endTime !== current.endTime)
        ) {
          const checkQ = query(
            collection(firestore, 'bookings'),
            where('roomId', '==', targetRoomId),
            where('date', '==', targetDate),
            where('status', '==', 'confirmed')
          );
          const checkSnap = await getDocs(checkQ);
          for (const d of checkSnap.docs) {
            const other = d.data() as Booking;
            if (
              other.bookingCode !== bookingCode &&
              other.status !== 'cancelled' &&
              isTimeSlotConflicting(targetStartTime, targetEndTime, other.startTime, other.endTime)
            ) {
              throw new Error(
                `ช่วงเวลาใหม่ ${other.startTime} - ${other.endTime} น. ซ้อนกับการจองอื่น (${other.title} โดย ${other.bookerName}) กรุณาเลือกช่วงเวลาอื่น`
              );
            }
          }
        }

        const merged: Booking = { ...current, ...updatedFields, updatedAt: now };
        transaction.update(doc(firestore, 'bookings', docItem.id), merged as any);
        updatedBookingResult = merged;
      });

      if (updatedBookingResult) {
        await addNotification(
          'booking_updated',
          '✏️ อัปเดตข้อมูลการจอง',
          `รหัส ${bookingCode} ได้รับการแก้ไขข้อมูลเรียบร้อยแล้ว`,
          (updatedBookingResult as Booking).id,
          bookingCode
        );
        syncToGoogleSheet(updatedBookingResult as Booking, 'update').catch(console.warn);
      }

      return { success: true, booking: updatedBookingResult || undefined };
    } catch (err: any) {
      return { success: false, error: err.message || 'ไม่สามารถอัปเดตการจองได้' };
    }
  }

  // Google Sheets / Local mode
  let list = getStoredLocalData<Booking[]>(LS_BOOKINGS_KEY, []);
  const idx = list.findIndex((b) => b.bookingCode === bookingCode);
  if (idx === -1) return { success: false, error: 'ไม่พบรหัสการจองนี้' };

  const current = list[idx];
  const merged: Booking = { ...current, ...updatedFields, updatedAt: now };

  const conflict = checkBookingConflict(
    list,
    merged.roomId,
    merged.date,
    merged.startTime,
    merged.endTime,
    bookingCode
  );

  if (conflict.hasConflict) {
    return { success: false, error: conflict.message || 'ช่วงเวลาใหม่ทับซ้อนกับการจองอื่น' };
  }

  list[idx] = merged;
  saveLocalData(LS_BOOKINGS_KEY, list);
  syncToGoogleSheet(merged, 'update').catch(console.warn);

  await addNotification(
    'booking_updated',
    '✏️ อัปเดตข้อมูลการจอง',
    `รหัส ${bookingCode} ได้รับการแก้ไขข้อมูลเรียบร้อยแล้ว`,
    merged.id,
    bookingCode
  );

  return { success: true, booking: merged };
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingCode: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  if (isFirebaseConfigured && db) {
    const firestore = getActiveDb();
    try {
      const q = query(collection(firestore, 'bookings'), where('bookingCode', '==', bookingCode));
      const snap = await getDocs(q);
      if (snap.empty) return { success: false, error: `ไม่พบรหัสการจอง "${bookingCode}"` };

      const docItem = snap.docs[0];
      const current = docItem.data() as Booking;

      const cancelledBooking: Booking = {
        ...current,
        status: 'cancelled',
        cancelledReason: reason || 'ยกเลิกโดยผู้จอง',
        cancelledAt: now,
        updatedAt: now,
      };

      await updateDoc(doc(firestore, 'bookings', docItem.id), cancelledBooking as any);

      await addNotification(
        'booking_cancelled',
        '❌ ยกเลิกการจองห้อง',
        `รหัส ${bookingCode} ("${current.roomName}") ได้รับการยกเลิกแล้ว`,
        current.id,
        bookingCode
      );

      syncToGoogleSheet(cancelledBooking, 'cancel').catch(console.warn);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'ไม่สามารถยกเลิกการจองได้' };
    }
  }

  // Google Sheets / Local mode
  let list = getStoredLocalData<Booking[]>(LS_BOOKINGS_KEY, []);
  const idx = list.findIndex((b) => b.bookingCode === bookingCode);
  if (idx === -1) return { success: false, error: 'ไม่พบรหัสการจองนี้' };

  const current = list[idx];
  const cancelledBooking: Booking = {
    ...current,
    status: 'cancelled',
    cancelledReason: reason || 'ยกเลิกโดยผู้จอง',
    cancelledAt: now,
    updatedAt: now,
  };

  list[idx] = cancelledBooking;
  saveLocalData(LS_BOOKINGS_KEY, list);
  syncToGoogleSheet(cancelledBooking, 'cancel').catch(console.warn);

  await addNotification(
    'booking_cancelled',
    '❌ ยกเลิกการจองห้อง',
    `รหัส ${bookingCode} ("${current.roomName}") ได้รับการยกเลิกแล้ว`,
    current.id,
    bookingCode
  );

  return { success: true };
}

/**
 * Update room details
 */
export async function updateRoom(
  roomId: string,
  updatedFields: Partial<Room>
): Promise<{ success: boolean; error?: string }> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(getActiveDb(), 'rooms', roomId), updatedFields as any);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  const rooms = getStoredLocalData<Room[]>(LS_ROOMS_KEY, INITIAL_ROOMS);
  const idx = rooms.findIndex((r) => r.id === roomId);
  if (idx !== -1) {
    rooms[idx] = { ...rooms[idx], ...updatedFields };
    saveLocalData(LS_ROOMS_KEY, rooms);
  }
  return { success: true };
}
