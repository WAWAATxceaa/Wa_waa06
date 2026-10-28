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
import { syncToGoogleSheet } from './sheetsService';

const getActiveDb = (): Firestore => {
  if (!db) {
    throw new Error('Firebase Firestore ยังไม่ได้เชื่อมต่อ กรุณาระบุ Firebase Config ในไฟล์ .env');
  }
  return db;
};

/**
 * Initialize sample rooms to Firestore if collection is empty
 */
export async function seedInitialRoomsIfEmpty(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const firestore = getActiveDb();
    const snap = await getDocs(collection(firestore, 'rooms'));
    if (snap.empty) {
      console.log('🌱 Seeding initial 5 rooms into Firestore (Single Source of Truth)...');
      for (const room of INITIAL_ROOMS) {
        await setDoc(doc(firestore, 'rooms', room.id), room);
      }
    }
  } catch (e) {
    console.warn('⚠️ Firestore room check/seeding warning:', e);
  }
}

/**
 * Real-time listener for Rooms (Single Source of Truth via onSnapshot)
 */
export function subscribeRooms(callback: (rooms: Room[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    console.warn('⚠️ Firebase not configured: Rooms listener inactive.');
    // Show static room templates if offline, but no local storage mutations
    callback(INITIAL_ROOMS);
    return () => {};
  }

  seedInitialRoomsIfEmpty();
  const firestore = getActiveDb();

  return onSnapshot(
    collection(firestore, 'rooms'),
    (snapshot) => {
      const rooms: Room[] = [];
      snapshot.forEach((docItem) => {
        rooms.push({ ...(docItem.data() as Room), id: docItem.id });
      });
      rooms.sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(rooms.length > 0 ? rooms : INITIAL_ROOMS);
    },
    (error) => {
      console.error('❌ Firestore rooms onSnapshot error:', error);
    }
  );
}

/**
 * Real-time listener for Bookings (Single Source of Truth via onSnapshot)
 */
export function subscribeBookings(callback: (bookings: Booking[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    console.warn('⚠️ Firebase not configured: Bookings listener inactive.');
    callback([]);
    return () => {};
  }

  const firestore = getActiveDb();

  return onSnapshot(
    collection(firestore, 'bookings'),
    (snapshot) => {
      const bookings: Booking[] = [];
      snapshot.forEach((docItem) => {
        bookings.push({ ...(docItem.data() as Booking), id: docItem.id });
      });
      callback(bookings);
    },
    (error) => {
      console.error('❌ Firestore bookings onSnapshot error:', error);
    }
  );
}

/**
 * Real-time listener for Notifications (Single Source of Truth via onSnapshot)
 */
export function subscribeNotifications(callback: (notifications: NotificationItem[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }

  const firestore = getActiveDb();

  return onSnapshot(
    collection(firestore, 'notifications'),
    (snapshot) => {
      const items: NotificationItem[] = [];
      snapshot.forEach((docItem) => {
        items.push({ ...(docItem.data() as NotificationItem), id: docItem.id });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (error) => {
      console.error('❌ Firestore notifications onSnapshot error:', error);
    }
  );
}

/**
 * Add a notification to Firestore
 */
export async function addNotification(
  type: NotificationItem['type'],
  title: string,
  message: string,
  bookingId?: string,
  bookingCode?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

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

  try {
    const firestore = getActiveDb();
    await setDoc(doc(firestore, 'notifications', newNotif.id), newNotif);
  } catch (e) {
    console.warn('⚠️ Firestore notification write error:', e);
  }
}

/**
 * Mark notification as read in Firestore
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const firestore = getActiveDb();
    await updateDoc(doc(firestore, 'notifications', id), { read: true });
  } catch (e) {
    console.warn('⚠️ Firestore notification update error:', e);
  }
}

/**
 * Mark all notifications as read in Firestore
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const firestore = getActiveDb();
    const snap = await getDocs(query(collection(firestore, 'notifications'), where('read', '==', false)));
    for (const d of snap.docs) {
      await updateDoc(doc(firestore, 'notifications', d.id), { read: true });
    }
  } catch (e) {
    console.warn('⚠️ Firestore markAllNotifications error:', e);
  }
}

/**
 * Client-Side Conflict Check Helper (Fast UI feedback before submitting)
 * Condition:
 * - Same room
 * - Same date
 * - Overlap: newStart < existingEnd && newEnd > existingStart
 * - Except cancelled bookings
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
 * Create a new booking with Firestore Transaction
 * 1. Checks conflict inside transaction
 * 2. Writes to Firestore atomically
 * 3. Dispatches notifications & Google Sheet sync
 */
export async function createBooking(
  bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      error: 'ยังไม่ได้เชื่อมต่อ Firebase Firestore: กรุณาใส่ Firebase Config ใน .env หรือ GitHub Secrets เพื่อบันทึกข้อมูลแบบเรียลไทม์',
    };
  }

  const firestore = getActiveDb();
  const now = new Date().toISOString();
  const id = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newBooking: Booking = {
    ...bookingData,
    id,
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
  };

  try {
    // 🛡️ Firestore Transaction for strict Double-Booking Prevention
    await runTransaction(firestore, async (transaction) => {
      // 1. Query all existing confirmed bookings for this room on this date
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

      // 2. Strict Overlap Condition:
      // newStart < existingEnd && newEnd > existingStart
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

      // 3. Atomically save the new booking
      const docRef = doc(firestore, 'bookings', id);
      transaction.set(docRef, newBooking);
    });

    // Post-booking operations
    await addNotification(
      'new_booking',
      '🎉 มีการจองห้องใหม่',
      `${newBooking.bookerName} ได้จอง "${newBooking.roomName}" วันที่ ${newBooking.date} เวลา ${newBooking.startTime}-${newBooking.endTime} น.`,
      newBooking.id,
      newBooking.bookingCode
    );

    // Non-blocking sync to Google Sheet
    syncToGoogleSheet(newBooking, 'create').catch(console.warn);

    return { success: true, booking: newBooking };
  } catch (err: any) {
    console.error('❌ Firestore transaction failed:', err);
    return {
      success: false,
      error: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
    };
  }
}

/**
 * Update an existing booking by bookingCode via Firestore Transaction
 */
export async function updateBooking(
  bookingCode: string,
  updatedFields: Partial<Booking>
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      error: 'ยังไม่ได้เชื่อมต่อ Firebase Firestore: กรุณาใส่ Firebase Config ใน .env',
    };
  }

  const firestore = getActiveDb();
  const now = new Date().toISOString();

  try {
    let updatedBookingResult: Booking | null = null;

    await runTransaction(firestore, async (transaction) => {
      const q = query(collection(firestore, 'bookings'), where('bookingCode', '==', bookingCode));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`ไม่พบรหัสการจอง "${bookingCode}" ในระบบ`);
      }

      const docItem = snap.docs[0];
      const current = docItem.data() as Booking;

      const targetRoomId = updatedFields.roomId || current.roomId;
      const targetDate = updatedFields.date || current.date;
      const targetStartTime = updatedFields.startTime || current.startTime;
      const targetEndTime = updatedFields.endTime || current.endTime;

      // Check conflict if room, date, or time changed
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
        `รหัส ${bookingCode} (${(updatedBookingResult as Booking).roomName}) ได้รับการแก้ไขข้อมูลเรียบร้อยแล้ว`,
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

/**
 * Cancel a booking by bookingCode
 * Sets status to 'cancelled' (Security rules prevent deletion)
 */
export async function cancelBooking(
  bookingCode: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      error: 'ยังไม่ได้เชื่อมต่อ Firebase Firestore: กรุณาใส่ Firebase Config ใน .env',
    };
  }

  const firestore = getActiveDb();
  const now = new Date().toISOString();

  try {
    const q = query(collection(firestore, 'bookings'), where('bookingCode', '==', bookingCode));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { success: false, error: `ไม่พบรหัสการจอง "${bookingCode}"` };
    }

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

/**
 * Update room details in Firestore (for Admin)
 */
export async function updateRoom(
  roomId: string,
  updatedFields: Partial<Room>
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: 'Firebase Firestore ยังไม่ได้เชื่อมต่อ' };
  }

  try {
    const firestore = getActiveDb();
    await updateDoc(doc(firestore, 'rooms', roomId), updatedFields as any);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
