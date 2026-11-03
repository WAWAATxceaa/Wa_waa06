import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Room, Booking, SystemSettings, Announcement, NotificationItem, ApproverRole } from '../types';
import { fetchFullData, getWebhookUrl } from '../services/sheetsService';
import { INITIAL_ROOMS, DEFAULT_SYSTEM_SETTINGS } from '../config/constants';
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
  settings: SystemSettings;
  announcements: Announcement[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  loading: boolean;
  isBackendConnected: boolean;
  webhookUrl: string;
  refreshData: () => Promise<void>;

  // Authentication & Roles
  currentRole: ApproverRole;
  currentRoleTitle: string;
  currentActorName: string;
  loginRole: (role: ApproverRole, pin: string) => boolean;
  logoutRole: () => void;

  // Real-time Summary Cards
  todayBookingCount: number;      // 1. จองวันนี้
  pendingApprovalCount: number;   // 2. รออนุมัติ
  approvedBookingCount: number;   // 3. อนุมัติแล้ว
  totalAttendeesCount: number;    // 4. ผู้เข้าใช้รวม
  activeMeetingCount: number;
  availableRoomCount: number;
  upcomingBookings: Booking[];
  isFirebaseConnected: boolean;

  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const BookingContext = createContext<BookingContextType | null>(null);

const ROLE_STORAGE_KEY = 'ttc_active_role';
const ACTOR_STORAGE_KEY = 'ttc_active_actor';

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Current logged in role
  const [currentRole, setCurrentRole] = useState<ApproverRole>(() => {
    return (sessionStorage.getItem(ROLE_STORAGE_KEY) as ApproverRole) || 'requester';
  });
  const [currentActorName, setCurrentActorName] = useState<string>(() => {
    return sessionStorage.getItem(ACTOR_STORAGE_KEY) || '';
  });

  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // โหลดข้อมูลแบบเรียลไทม์จาก Google Apps Script Backend
  const refreshData = useCallback(async () => {
    try {
      const data = await fetchFullData();
      if (data.rooms && data.rooms.length > 0) {
        setRooms(data.rooms);
      }
      setBookings(data.bookings);
      if (data.settings && Object.keys(data.settings).length > 0) {
        setSettings((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }
      setAnnouncements(data.announcements);
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('refreshData error:', err);
      setIsBackendConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling ทุก 12 วินาที ตามข้อกำหนด (10-15 วินาที)
  useEffect(() => {
    refreshData();
    const timer = setInterval(() => {
      refreshData();
    }, 12000);
    return () => clearInterval(timer);
  }, [refreshData]);

  // ตรวจจับ URL parameter เพื่อ Auto-Login ผ่าน Role Token ประจำตำแหน่ง
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role') as ApproverRole;
      const tokenParam = params.get('token');

      if (roleParam && tokenParam) {
        if (roleParam === 'staff_audiovisual' && tokenParam === settings.staffAudiovisual.pin) {
          loginRole('staff_audiovisual', tokenParam);
        } else if (roleParam === 'chief_digital' && tokenParam === settings.chiefDigital.pin) {
          loginRole('chief_digital', tokenParam);
        } else if (roleParam === 'deputy_director' && tokenParam === settings.deputyDirector.pin) {
          loginRole('deputy_director', tokenParam);
        } else if (roleParam === 'admin' && tokenParam === settings.admin.pin) {
          loginRole('admin', tokenParam);
        }
      }
    } catch (e) {}
  }, [settings]);

  // ตรวจสอบความถูกต้องของสิทธิ์การเข้าสู่ระบบ
  const loginRole = useCallback((role: ApproverRole, pin: string): boolean => {
    if (role === 'staff_audiovisual' && pin === settings.staffAudiovisual.pin) {
      setCurrentRole('staff_audiovisual');
      setCurrentActorName(settings.staffAudiovisual.name);
      sessionStorage.setItem(ROLE_STORAGE_KEY, 'staff_audiovisual');
      sessionStorage.setItem(ACTOR_STORAGE_KEY, settings.staffAudiovisual.name);
      return true;
    }
    if (role === 'chief_digital' && pin === settings.chiefDigital.pin) {
      setCurrentRole('chief_digital');
      setCurrentActorName(settings.chiefDigital.name);
      sessionStorage.setItem(ROLE_STORAGE_KEY, 'chief_digital');
      sessionStorage.setItem(ACTOR_STORAGE_KEY, settings.chiefDigital.name);
      return true;
    }
    if (role === 'deputy_director' && pin === settings.deputyDirector.pin) {
      setCurrentRole('deputy_director');
      setCurrentActorName(settings.deputyDirector.name);
      sessionStorage.setItem(ROLE_STORAGE_KEY, 'deputy_director');
      sessionStorage.setItem(ACTOR_STORAGE_KEY, settings.deputyDirector.name);
      return true;
    }
    if (role === 'admin' && pin === settings.admin.pin) {
      setCurrentRole('admin');
      setCurrentActorName('ผู้ดูแลระบบ (Admin)');
      sessionStorage.setItem(ROLE_STORAGE_KEY, 'admin');
      sessionStorage.setItem(ACTOR_STORAGE_KEY, 'ผู้ดูแลระบบ (Admin)');
      return true;
    }
    return false;
  }, [settings]);

  const logoutRole = useCallback(() => {
    setCurrentRole('requester');
    setCurrentActorName('');
    sessionStorage.removeItem(ROLE_STORAGE_KEY);
    sessionStorage.removeItem(ACTOR_STORAGE_KEY);
  }, []);

  const currentRoleTitle = useMemo(() => {
    switch (currentRole) {
      case 'staff_audiovisual':
        return 'ตรวจความพร้อมห้อง/โสตฯ (ขั้น 2)';
      case 'chief_digital':
        return 'รับรองคำขอ (ขั้น 3)';
      case 'deputy_director':
        return 'พิจารณาอนุมัติ (ขั้น 4)';
      case 'admin':
        return 'ผู้ดูแลระบบส่วนกลาง (Admin)';
      default:
        return 'ผู้ขอใช้ห้องประชุม';
    }
  }, [currentRole]);

  // คำนวณสถานะห้องแบบ Live
  const today = getTodayString();
  const currentTime = getCurrentTimeString();

  const computedRooms = useMemo(() => {
    return rooms.map((room) => {
      if (room.status !== 'active') {
        return { ...room, isAvailableNow: false, currentBooking: null };
      }
      const activeMeeting = bookings.find(
        (b) =>
          b.roomId === room.id &&
          b.status === 'approved' &&
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
  }, [rooms, bookings, today, currentTime]);

  // 1. การ์ดสรุป 4 ค่า (ตรงตามฟังก์ชัน 1, 2, 3)
  const todayBookingCount = useMemo(() => {
    return bookings.filter((b) => b.date === today && b.status !== 'cancelled' && b.status !== 'rejected').length;
  }, [bookings, today]);

  const pendingApprovalCount = useMemo(() => {
    return bookings.filter((b) =>
      b.status === 'pending_step2' || b.status === 'pending_step3' || b.status === 'pending_step4'
    ).length;
  }, [bookings]);

  const approvedBookingCount = useMemo(() => {
    return bookings.filter((b) => b.status === 'approved').length;
  }, [bookings]);

  const totalAttendeesCount = useMemo(() => {
    return bookings
      .filter((b) => b.status === 'approved')
      .reduce((sum, b) => sum + (Number(b.participantCount) || 0), 0);
  }, [bookings]);

  const activeMeetingCount = useMemo(() => {
    return computedRooms.filter((r) => r.currentBooking !== null).length;
  }, [computedRooms]);

  const availableRoomCount = useMemo(() => {
    return computedRooms.filter((r) => r.isAvailableNow && r.status === 'active').length;
  }, [computedRooms]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((b) => (b.status === 'approved' || b.status === 'confirmed') && b.date >= today)
      .slice(0, 5);
  }, [bookings, today]);

  return (
    <BookingContext.Provider
      value={{
        rooms: computedRooms,
        bookings,
        settings,
        announcements,
        notifications,
        unreadNotificationCount,
        loading,
        isBackendConnected,
        isFirebaseConnected: isBackendConnected,
        upcomingBookings,
        webhookUrl: getWebhookUrl(),
        refreshData,
        currentRole,
        currentRoleTitle,
        currentActorName,
        loginRole,
        logoutRole,
        todayBookingCount,
        pendingApprovalCount,
        approvedBookingCount,
        totalAttendeesCount,
        activeMeetingCount,
        availableRoomCount,
        toasts,
        addToast,
        removeToast,
        markAsRead,
        markAllAsRead,
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
