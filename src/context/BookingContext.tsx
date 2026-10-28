import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Room, Booking, NotificationItem } from '../types';
import {
  subscribeRooms,
  subscribeBookings,
  subscribeNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/firestoreService';
import { isFirebaseConfigured } from '../config/firebase';
import { getTodayString, getCurrentTimeString } from '../utils/dateUtils';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface BookingContextType {
  rooms: Room[];
  bookings: Booking[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  loading: boolean;
  isFirebaseConnected: boolean;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  activeMeetingCount: number;
  todayBookingCount: number;
  availableRoomCount: number;
  upcomingBookings: Booking[];
}

const BookingContext = createContext<BookingContextType | null>(null);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawRooms, setRawRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [alerted15MinCodes, setAlerted15MinCodes] = useState<Set<string>>(new Set());

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Subscriptions exclusively via Firestore onSnapshot
  useEffect(() => {
    const unsubRooms = subscribeRooms((rooms) => {
      setRawRooms(rooms);
    });

    const unsubBookings = subscribeBookings((bks) => {
      setBookings(bks);
      setLoading(false);
    });

    const unsubNotifs = subscribeNotifications((notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubRooms();
      unsubBookings();
      unsubNotifs();
    };
  }, []);

  // Compute Live Room Status (Active, Occupied, Current Meeting)
  const today = getTodayString();
  const currentTime = getCurrentTimeString();

  const rooms = useMemo(() => {
    return rawRooms.map((room) => {
      if (room.status !== 'active') {
        return { ...room, isAvailableNow: false, currentBooking: null };
      }

      // Find if there is an active meeting in this room right now
      const activeMeeting = bookings.find(
        (b) =>
          b.roomId === room.id &&
          b.status === 'confirmed' &&
          b.date === today &&
          b.startTime <= currentTime &&
          b.endTime > currentTime
      );

      return {
        ...room,
        isAvailableNow: !activeMeeting,
        currentBooking: activeMeeting
          ? {
              id: activeMeeting.id,
              title: activeMeeting.title,
              bookerName: activeMeeting.bookerName,
              startTime: activeMeeting.startTime,
              endTime: activeMeeting.endTime,
            }
          : null,
      };
    });
  }, [rawRooms, bookings, today, currentTime]);

  // Upcoming meetings today
  const todayBookings = useMemo(() => {
    return bookings.filter((b) => b.date === today && b.status === 'confirmed');
  }, [bookings, today]);

  const activeMeetingCount = useMemo(() => {
    return rooms.filter((r) => !r.isAvailableNow && r.status === 'active').length;
  }, [rooms]);

  const availableRoomCount = useMemo(() => {
    return rooms.filter((r) => r.isAvailableNow && r.status === 'active').length;
  }, [rooms]);

  const upcomingBookings = useMemo(() => {
    return todayBookings
      .filter((b) => b.startTime > currentTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [todayBookings, currentTime]);

  // 15-Minute reminder checker (runs every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      todayBookings.forEach((b) => {
        const [h, m] = b.startTime.split(':').map(Number);
        const meetingMinutes = h * 60 + m;
        const diffMinutes = meetingMinutes - currentMinutes;

        // If meeting starts in 10-15 minutes and hasn't alerted yet
        if (diffMinutes > 0 && diffMinutes <= 15 && !alerted15MinCodes.has(b.bookingCode)) {
          setAlerted15MinCodes((prev) => new Set(prev).add(b.bookingCode));
          addToast(
            'warning',
            `⏰ การประชุมใกล้จะเริ่มใน ${diffMinutes} นาที`,
            `ห้อง "${b.roomName}" หัวข้อ: "${b.title}" (เวลา ${b.startTime} น.)`
          );
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [todayBookings, alerted15MinCodes]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAsRead = (id: string) => {
    markNotificationAsRead(id);
  };

  const markAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  return (
    <BookingContext.Provider
      value={{
        rooms,
        bookings,
        notifications,
        unreadNotificationCount,
        loading,
        isFirebaseConnected: isFirebaseConfigured,
        toasts,
        addToast,
        removeToast,
        markAsRead,
        markAllAsRead,
        activeMeetingCount,
        todayBookingCount: todayBookings.length,
        availableRoomCount,
        upcomingBookings,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookingContext = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }
  return context;
};
