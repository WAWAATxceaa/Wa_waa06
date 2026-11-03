import React from 'react';
import { CheckCircle2, Copy, ExternalLink, Calendar, Clock, MapPin, Users, FileText, ArrowRight } from 'lucide-react';
import { Booking } from '../../types';
import { formatThaiDate } from '../../utils/dateUtils';

interface BookingSuccessModalProps {
  booking: Booking;
  onClose: () => void;
  onTrackStatus: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  booking,
  onClose,
  onTrackStatus,
}) => {
  const [copied, setCopied] = React.useState(false);
  const manageUrl = `${window.location.origin}${window.location.pathname}#/manage/${booking.bookingCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-4xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20 animate-bounce">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white">
          ยื่นคำขอจองห้องสำเร็จ! ✨
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
          ระบบได้บันทึกคำขอของคุณเรียบร้อยแล้ว และกำลังส่งต่อไปยังสายอนุมัติ 4 ขั้น
        </p>

        {/* Booking Code Card */}
        <div className="p-4 rounded-3xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/60 mb-5 text-left">
          <div className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-1">
            รหัสติดตามคำขอ (Booking Code)
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-violet-900 dark:text-violet-100 tracking-wider">
              {booking.bookingCode}
            </span>
            <button
              onClick={() => copyToClipboard(booking.bookingCode)}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-violet-600/30"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
            *โปรดบันทึกรหัสนี้ไว้ เพื่อใช้ตรวจสอบสถานะการอนุมัติ 4 ขั้น หรือยกเลิกคำขอ
          </p>
        </div>

        {/* Summary Info */}
        <div className="space-y-2 text-xs text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-violet-500 shrink-0" />
            <span><strong>ห้อง:</strong> {booking.otherRoomName || booking.roomName}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
            <span><strong>วันที่:</strong> {formatThaiDate(booking.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-cyan-500 shrink-0" />
            <span><strong>เวลา:</strong> {booking.startTime} - {booking.endTime} น.</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Users className="w-4 h-4 text-emerald-500 shrink-0" />
            <span><strong>ผู้ขอใช้:</strong> {booking.bookerName} ({booking.department})</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <FileText className="w-4 h-4 text-amber-500 shrink-0" />
            <span><strong>สถานะ:</strong> <span className="text-amber-600 font-bold">รอตรวจความพร้อมห้อง/โสตฯ (ขั้น 2)</span></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => copyToClipboard(manageUrl)}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            คัดลอกลิงก์ติดตามคำขอ
          </button>
          <button
            onClick={onTrackStatus}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-bold shadow-lg shadow-violet-500/25 hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>ดูสถานะคำขอ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
