import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  KeyRound,
  Calendar,
  Clock,
  User,
  Building2,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  MapPin,
  FileText,
  Printer,
  History,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';
import { formatThaiDate } from '../../utils/dateUtils';
import { cancelBooking as apiCancelBooking } from '../../services/firestoreService';
import { Booking } from '../../types';
import { showSuccessAlert, showErrorAlert, showConfirmAlert, showLoadingAlert, closeAlert } from '../../utils/alertUtils';
import { OfficialRequestPrintModal } from '../reports/OfficialRequestPrintModal';

export const ManageBookingView: React.FC = () => {
  const { code: urlCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { bookings, settings, refreshData } = useBookingContext();

  const [searchCode, setSearchCode] = useState(urlCode || '');
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  useEffect(() => {
    if (urlCode) {
      setSearchCode(urlCode);
      const found = bookings.find(
        (b) => b.bookingCode.toUpperCase() === urlCode.trim().toUpperCase()
      );
      if (found) {
        setActiveBooking(found);
      }
    }
  }, [urlCode, bookings]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    const found = bookings.find(
      (b) => b.bookingCode.toUpperCase() === searchCode.trim().toUpperCase()
    );

    if (found) {
      setActiveBooking(found);
      navigate(`/manage/${found.bookingCode}`, { replace: true });
    } else {
      showErrorAlert('ไม่พบข้อมูลการจอง', `ไม่พบรหัสการจอง "${searchCode.trim()}" ในระบบ โปรดตรวจสอบรหัสอีกครั้ง`);
    }
  };

  const handleCancelBooking = async () => {
    if (!activeBooking) return;

    if (activeBooking.status === 'approved') {
      showErrorAlert('ไม่สามารถยกเลิกได้', 'คำขอนี้ได้รับการอนุมัติแล้ว หากต้องการยกเลิกกรุณาติดต่อเจ้าหน้าที่งานศูนย์ดิจิทัลฯ');
      return;
    }

    const confirm = await showConfirmAlert(
      'ยืนยันการยกเลิกคำขอ?',
      `คุณต้องการยกเลิกคำขอ "${activeBooking.title}" (รหัส ${activeBooking.bookingCode}) ใช่หรือไม่? เมื่อยกเลิกแล้วช่วงเวลานี้จะเปิดว่างให้ผู้อื่นจองได้ทันที`,
      'ยืนยันยกเลิกคำขอ',
      'ไม่ยกเลิก'
    );

    if (!confirm.isConfirmed) return;

    showLoadingAlert('กำลังยกเลิกคำขอ...');
    try {
      const res = await apiCancelBooking(activeBooking.bookingCode, 'ผู้ขอยกเลิกคำขอผ่านหน้าเว็บ');
      closeAlert();

      if (res.success) {
        await showSuccessAlert('ยกเลิกคำขอสำเร็จ ✨', 'คำขอถูกยกเลิกแล้ว และห้องประชุมกลับมาว่างพร้อมให้จองใหม่ทันที');
        await refreshData();
      } else {
        showErrorAlert('ยกเลิกไม่สำเร็จ', res.error || 'เกิดข้อผิดพลาดในการยกเลิก');
      }
    } catch (err: any) {
      closeAlert();
      showErrorAlert('เกิดข้อผิดพลาด', err.message || 'โปรดตรวจสอบการเชื่อมต่อ');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
          ติดตามสถานะคำขอ & แบบฟอร์มราชการ 🔍
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          กรอกรหัสติดตามคำขอ (Booking Code) เพื่อตรวจสอบสถานะสายอนุมัติ 4 ขั้น หรือพิมพ์แบบฟอร์ม A4
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="กรอกรหัสการจอง เช่น TTC-8429"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 rounded-3xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-display font-bold text-sm shadow-md shadow-violet-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>ค้นหาคำขอ</span>
          </button>
        </div>
      </form>

      {/* Active Booking Detail Card */}
      {activeBooking && (
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            {/* Header with Code & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 font-extrabold tracking-wider">
                    {activeBooking.bookingCode}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                    activeBooking.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : activeBooking.status === 'cancelled' || activeBooking.status === 'rejected'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                  }`}>
                    {activeBooking.statusThai || activeBooking.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                  {activeBooking.title}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPrintModalOpen(true)}
                  className="px-4 py-2 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/25 flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบคำขอ A4 (ราชการ)</span>
                </button>

                {activeBooking.status !== 'approved' && activeBooking.status !== 'cancelled' && (
                  <button
                    onClick={handleCancelBooking}
                    className="px-4 py-2 rounded-2xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ยกเลิกคำขอ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stepped Progress Bar 4 Steps */}
            <div className="my-6">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                สถานะความคืบหน้า ๔ ขั้นตอนตามสายอนุมัติ:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                {/* Step 1 */}
                <div className="p-3 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-200 font-bold border border-violet-200 dark:border-violet-800">
                  <div className="text-[10px] text-violet-600">ขั้นตอนที่ ๑</div>
                  <div>✓ ยื่นคำขอสำเร็จ</div>
                </div>

                {/* Step 2 */}
                <div className={`p-3 rounded-2xl font-bold border ${
                  activeBooking.step2StaffStatus === 'ready'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300'
                    : activeBooking.status === 'pending_step2'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="text-[10px]">{activeBooking.step2StaffStatus === 'ready' ? '✓ ขั้นตอนที่ ๒' : 'ขั้นตอนที่ ๒'}</div>
                  <div>ตรวจความพร้อมโสตฯ</div>
                </div>

                {/* Step 3 */}
                <div className={`p-3 rounded-2xl font-bold border ${
                  activeBooking.step3ChiefStatus === 'endorsed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300'
                    : activeBooking.status === 'pending_step3'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="text-[10px]">{activeBooking.step3ChiefStatus === 'endorsed' ? '✓ ขั้นตอนที่ ๓' : 'ขั้นตอนที่ ๓'}</div>
                  <div>รับรองคำขอ</div>
                </div>

                {/* Step 4 */}
                <div className={`p-3 rounded-2xl font-bold border ${
                  activeBooking.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300'
                    : activeBooking.status === 'pending_step4'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="text-[10px]">{activeBooking.status === 'approved' ? '✓ ขั้นตอนที่ ๔' : 'ขั้นตอนที่ ๔'}</div>
                  <div>พิจารณาอนุมัติ</div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-700 dark:text-slate-300 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div><strong>ห้องประชุม:</strong> {activeBooking.otherRoomName || activeBooking.roomName}</div>
              <div><strong>วันที่:</strong> {formatThaiDate(activeBooking.date)}</div>
              <div><strong>เวลา:</strong> {activeBooking.startTime} - {activeBooking.endTime} น.</div>
              <div><strong>ผู้ขอใช้:</strong> {activeBooking.bookerName}</div>
              <div><strong>ตำแหน่ง:</strong> {activeBooking.bookerPosition || 'บุคลากร'}</div>
              <div><strong>หน่วยงาน/แผนก:</strong> {activeBooking.department}</div>
              <div><strong>เบอร์โทรติดต่อ:</strong> {activeBooking.bookerContact}</div>
              <div><strong>จำนวนผู้ร่วม:</strong> {activeBooking.participantCount} คน</div>
              <div><strong>ครุภัณฑ์ที่ขอใช้:</strong> {activeBooking.amenitiesText || 'ไม่มี'}</div>
            </div>

            {/* Attachment File */}
            {activeBooking.attachmentUrl && (
              <div className="mt-4 p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2 text-violet-800 dark:text-violet-200 font-semibold">
                  <FileText className="w-4 h-4 text-violet-500" />
                  ไฟล์แนบกำหนดการ: {activeBooking.attachmentName || 'ดาวน์โหลดเอกสาร'}
                </span>
                <a
                  href={activeBooking.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-xl bg-violet-600 text-white font-bold text-[11px] hover:bg-violet-700"
                >
                  เปิดไฟล์
                </a>
              </div>
            )}
          </div>

          {/* Audit Trail Log Table */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold font-display text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-violet-500" />
              <span>ประวัติการดำเนินงาน (Audit Trail)</span>
            </h3>

            {(!activeBooking.logs || activeBooking.logs.length === 0) ? (
              <p className="text-xs text-slate-500">ยังไม่มีบันทึกประวัติการดำเนินงาน</p>
            ) : (
              <div className="space-y-3">
                {activeBooking.logs.map((log, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {log.title} — <span className="text-violet-600 dark:text-violet-400">{log.statusThai}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        ผู้ดำเนินการ: <strong>{log.actorName}</strong> ({log.actorRole})
                        {log.note && <span className="ml-2 text-slate-700 dark:text-slate-300 italic">"{log.note}"</span>}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 shrink-0">
                      {formatThaiDate(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Print Modal */}
      {printModalOpen && activeBooking && (
        <OfficialRequestPrintModal
          booking={activeBooking}
          settings={settings}
          onClose={() => setPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
