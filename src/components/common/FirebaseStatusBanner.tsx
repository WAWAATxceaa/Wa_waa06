import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';

export const FirebaseStatusBanner: React.FC = () => {
  const { isFirebaseConnected } = useBookingContext();

  if (isFirebaseConnected) return null;

  return (
    <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>ยังไม่ได้เชื่อมต่อ Firebase Firestore:</strong> ระบบกำหนดให้ Firestore เป็นแหล่งข้อมูลเดียว (Single Source of Truth) เพื่อให้มือถือและคอมพิวเตอร์อัปเดตแบบเรียลไทม์ได้พร้อมกัน โปรดระบุ Firebase Config ในไฟล์ <code>.env</code> หรือใน GitHub Secrets
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-100 shrink-0">
          <Database className="w-3 h-3" />
          <span>Firestore Required</span>
        </div>
      </div>
    </div>
  );
};
