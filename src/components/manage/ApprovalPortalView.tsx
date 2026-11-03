import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  Building2,
  MapPin,
  Lock,
  Filter,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';
import { formatThaiDate } from '../../utils/dateUtils';
import { Booking, ApproverRole } from '../../types';
import { approveBookingStep as apiApproveStep } from '../../services/firestoreService';
import { showSuccessAlert, showErrorAlert, showPromptAlert, showLoadingAlert, closeAlert } from '../../utils/alertUtils';
import { RoleLoginModal } from '../common/RoleLoginModal';
import { OfficialRequestPrintModal } from '../reports/OfficialRequestPrintModal';

export const ApprovalPortalView: React.FC = () => {
  const {
    bookings,
    currentRole,
    currentRoleTitle,
    currentActorName,
    settings,
    refreshData,
  } = useBookingContext();

  const [activeTab, setActiveTab] = useState<'my_pending' | 'all_pending' | 'approved' | 'rejected'>('my_pending');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedBookingForPrint, setSelectedBookingForPrint] = useState<Booking | null>(null);

  // กรองคำขอที่รอการพิจารณาตามบทบาทปัจจุบัน
  const myPendingStep = useMemo(() => {
    switch (currentRole) {
      case 'staff_audiovisual':
        return 2;
      case 'chief_digital':
        return 3;
      case 'deputy_director':
        return 4;
      default:
        return 0; // requester or admin
    }
  }, [currentRole]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status === 'cancelled') return false;

      if (activeTab === 'my_pending') {
        if (myPendingStep === 2) return b.status === 'pending_step2';
        if (myPendingStep === 3) return b.status === 'pending_step3';
        if (myPendingStep === 4) return b.status === 'pending_step4';
        // If admin or requester, show all pending
        return b.status === 'pending_step2' || b.status === 'pending_step3' || b.status === 'pending_step4';
      }

      if (activeTab === 'all_pending') {
        return b.status === 'pending_step2' || b.status === 'pending_step3' || b.status === 'pending_step4';
      }

      if (activeTab === 'approved') {
        return b.status === 'approved';
      }

      if (activeTab === 'rejected') {
        return b.status === 'rejected';
      }

      return true;
    });
  }, [bookings, activeTab, myPendingStep]);

  // จัดการการอนุมัติตามสายอนุมัติ 4 ขั้น
  const handleAction = async (booking: Booking, step: 2 | 3 | 4, action: string, actionLabel: string) => {
    // ตรวจสอบสิทธิ์
    const isStep2 = step === 2 && (currentRole === 'staff_audiovisual' || currentRole === 'admin');
    const isStep3 = step === 3 && (currentRole === 'chief_digital' || currentRole === 'admin');
    const isStep4 = step === 4 && (currentRole === 'deputy_director' || currentRole === 'admin');

    if (!isStep2 && !isStep3 && !isStep4) {
      showErrorAlert('ไม่มีสิทธิ์ดำเนินการ', `คุณไม่มีสิทธิ์ในการพิจารณาขั้นตอนที่ ${step} กรุณาเข้าสู่ระบบด้วย PIN ประจำตำแหน่ง`);
      setRoleModalOpen(true);
      return;
    }

    // ขอให้กรอกหมายเหตุ
    const prompt = await showPromptAlert(
      `ยืนยันการ${actionLabel}`,
      'กรอกหมายเหตุ หรือข้อความบันทึกเพิ่มเติม (ไม่บังคับ)...',
      `ยืนยัน ${actionLabel}`
    );

    if (!prompt.isConfirmed) return;

    const note = prompt.value || '';
    showLoadingAlert('กำลังบันทึกผลการพิจารณา...');

    try {
      let actorName = currentActorName;
      if (!actorName) {
        if (step === 2) actorName = settings.staffAudiovisual.name;
        if (step === 3) actorName = settings.chiefDigital.name;
        if (step === 4) actorName = settings.deputyDirector.name;
      }

      const res = await apiApproveStep({
        bookingCode: booking.bookingCode,
        step,
        stepAction: action,
        actorName,
        actorRole: currentRole,
        note,
      });

      closeAlert();

      if (res.success) {
        await showSuccessAlert(
          'บันทึกผลสำเร็จ! ✨',
          `บันทึกผลการพิจารณาคำขอ <b>${booking.bookingCode}</b> (${actionLabel}) เรียบร้อยแล้ว`
        );
        await refreshData();
      } else {
        showErrorAlert('บันทึกไม่สำเร็จ', res.error || 'เกิดข้อผิดพลาดในการบันทึกผล');
      }
    } catch (err: any) {
      closeAlert();
      showErrorAlert('เกิดข้อผิดพลาด', err.message || 'โปรดตรวจสอบการเชื่อมต่อ');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 rounded-4xl p-6 sm:p-8 text-white shadow-xl shadow-violet-500/15 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>ระบบพิจารณาคำขอตามสายอนุมัติ 4 ขั้นตอน (ห้ามข้ามขั้นตอน)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold">
              ศูนย์พิจารณาอนุมัติคำขอใช้ห้องประชุม 🏛️
            </h1>
            <p className="text-xs sm:text-sm text-violet-100 mt-1 max-w-2xl">
              วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ • ลำดับการอนุมัติ: 1. ผู้ขอยื่น ➔ 2. ตรวจความพร้อมห้อง/โสตฯ ➔ 3. รับรองคำขอ ➔ 4. พิจารณาอนุมัติ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentRole === 'requester' ? (
              <button
                onClick={() => setRoleModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-white text-violet-900 font-display font-bold text-xs shadow-lg hover:bg-slate-100 transition-all flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-violet-600" />
                <span>เข้าสู่ระบบผู้ลงนาม (PIN)</span>
              </button>
            ) : (
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{currentActorName}</span>
                </div>
                <div className="text-[11px] text-violet-200 mt-0.5">{currentRoleTitle}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow 4 Steps Visual Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {/* Step 1 */}
        <div className="p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 font-bold text-xs flex items-center justify-center">1</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">ยื่นคำขอ</span>
          </div>
          <div className="text-[11px] text-slate-500">ผู้ขอใช้ห้อง (บุคลากร/แผนก)</div>
          <div className="text-[10px] text-violet-600 font-medium mt-1">✓ กรอกข้อมูล & แนบเอกสาร</div>
        </div>

        {/* Step 2 */}
        <div className={`p-4 rounded-3xl border shadow-sm transition-all ${
          currentRole === 'staff_audiovisual'
            ? 'bg-violet-50/80 border-violet-500 dark:bg-violet-950/40'
            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 font-bold text-xs flex items-center justify-center">2</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">ตรวจความพร้อม</span>
          </div>
          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">{settings.staffAudiovisual.name}</div>
          <div className="text-[10px] text-slate-500 mt-1">เจ้าหน้าที่งานโสตทัศนูปกรณ์</div>
        </div>

        {/* Step 3 */}
        <div className={`p-4 rounded-3xl border shadow-sm transition-all ${
          currentRole === 'chief_digital'
            ? 'bg-violet-50/80 border-violet-500 dark:bg-violet-950/40'
            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 font-bold text-xs flex items-center justify-center">3</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">รับรองคำขอ</span>
          </div>
          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">{settings.chiefDigital.name}</div>
          <div className="text-[10px] text-slate-500 mt-1">หัวหน้างานศูนย์ดิจิทัลฯ</div>
        </div>

        {/* Step 4 */}
        <div className={`p-4 rounded-3xl border shadow-sm transition-all ${
          currentRole === 'deputy_director'
            ? 'bg-violet-50/80 border-violet-500 dark:bg-violet-950/40'
            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-xs flex items-center justify-center">4</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">พิจารณาอนุมัติ</span>
          </div>
          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">{settings.deputyDirector.name}</div>
          <div className="text-[10px] text-slate-500 mt-1">รองผู้อำนวยการวิทยาลัยฯ</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('my_pending')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'my_pending'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📋 งานที่รอฉันพิจารณา
          </button>
          <button
            onClick={() => setActiveTab('all_pending')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'all_pending'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ⏳ รอพิจารณาทั้งหมด
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'approved'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ✅ อนุมัติแล้ว
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'rejected'
                ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ❌ ไม่อนุมัติ/ส่งกลับ
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          พบคำขอทั้งหมด <strong>{filteredBookings.length}</strong> รายการ
        </div>
      </div>

      {/* Bookings Card List */}
      {filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-white/60 dark:bg-slate-900/60 rounded-4xl border border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">ไม่มีคำขอที่ค้างพิจารณาในหน้านี้</h3>
          <p className="text-xs text-slate-500 mt-1">คำขอทั้งหมดได้รับการดำเนินการเรียบร้อยแล้ว หรือยังไม่มีคำขอเข้ามาในขั้นตอนนี้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const isStep2Pending = b.status === 'pending_step2';
            const isStep3Pending = b.status === 'pending_step3';
            const isStep4Pending = b.status === 'pending_step4';
            const isApproved = b.status === 'approved';

            return (
              <div
                key={b.id || b.bookingCode}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-4xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-300 font-bold">
                        {b.bookingCode}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : b.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                      }`}>
                        {b.statusThai || b.status}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white">
                      {b.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedBookingForPrint(b)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>พิมพ์ใบคำขอ A4</span>
                    </button>
                    {b.attachmentUrl && (
                      <a
                        href={b.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-violet-100"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>เปิดไฟล์แนบ</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-300 my-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-violet-500 shrink-0" />
                    <span><strong>ห้อง:</strong> {b.otherRoomName || b.roomName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
                    <span><strong>วันที่:</strong> {formatThaiDate(b.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span><strong>เวลา:</strong> {b.startTime} - {b.endTime} น.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>ผู้ขอ:</strong> {b.bookerName} ({b.department})</span>
                  </div>
                </div>

                {/* Equipment & Description */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1 mb-4">
                  <div><strong>ครุภัณฑ์ที่ขอใช้:</strong> {b.amenitiesText || 'ไม่มี'}</div>
                  {b.description && <div><strong>รายละเอียด:</strong> {b.description}</div>}
                </div>

                {/* Stepped Progress Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                    ความคืบหน้าสายอนุมัติ 4 ขั้นตอน:
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] mb-4">
                    <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold">
                      ✓ 1. ยื่นคำขอแล้ว
                    </div>
                    <div className={`p-2 rounded-xl font-bold ${
                      b.step2StaffStatus === 'ready'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : isStep2Pending
                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {b.step2StaffStatus === 'ready' ? '✓ 2. ห้องพร้อม' : '2. ตรวจความพร้อม'}
                    </div>
                    <div className={`p-2 rounded-xl font-bold ${
                      b.step3ChiefStatus === 'endorsed'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : isStep3Pending
                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {b.step3ChiefStatus === 'endorsed' ? '✓ 3. รับรองแล้ว' : '3. รับรองคำขอ'}
                    </div>
                    <div className={`p-2 rounded-xl font-bold ${
                      isApproved
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : isStep4Pending
                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {isApproved ? '✓ 4. อนุมัติแล้ว' : '4. พิจารณาอนุมัติ'}
                    </div>
                  </div>

                  {/* Action Buttons for Authorized Roles */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    {/* Step 2 Action: Watcharaphong Sopa */}
                    {isStep2Pending && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                          การพิจารณาขั้นที่ 2 ({settings.staffAudiovisual.name}):
                        </span>
                        <button
                          onClick={() => handleAction(b, 2, 'not_ready', 'ไม่อนุมัติ/ห้องไม่พร้อม')}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-all"
                        >
                          ❌ ไม่พร้อมใช้งาน
                        </button>
                        <button
                          onClick={() => handleAction(b, 2, 'ready', 'รับรองห้องและอุปกรณ์พร้อมใช้งาน')}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                        >
                          ✅ ห้องและโสตฯ พร้อมใช้งาน
                        </button>
                      </div>
                    )}

                    {/* Step 3 Action: Ekarat Khiaothong */}
                    {isStep3Pending && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                          การพิจารณาขั้นที่ 3 ({settings.chiefDigital.name}):
                        </span>
                        <button
                          onClick={() => handleAction(b, 3, 'returned', 'ส่งกลับแก้ไข')}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-all"
                        >
                          ↩️ ส่งกลับแก้ไข
                        </button>
                        <button
                          onClick={() => handleAction(b, 3, 'endorsed', 'รับรองคำขอใช้ห้อง')}
                          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all"
                        >
                          ✅ รับรองคำขอ (ส่งต่อรอง ผอ.)
                        </button>
                      </div>
                    )}

                    {/* Step 4 Action: Chatri Rengchaiyaphum */}
                    {isStep4Pending && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                          การพิจารณาขั้นที่ 4 ({settings.deputyDirector.name}):
                        </span>
                        <button
                          onClick={() => handleAction(b, 4, 'rejected', 'ไม่อนุมัติคำขอ')}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-all"
                        >
                          ❌ ไม่อนุมัติ
                        </button>
                        <button
                          onClick={() => handleAction(b, 4, 'approved', 'อนุมัติการใช้ห้องประชุม')}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all"
                        >
                          ✨ อนุมัติการใช้ห้องประชุม
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role Login Modal */}
      <RoleLoginModal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} />

      {/* Official A4 Request Print Modal */}
      {selectedBookingForPrint && (
        <OfficialRequestPrintModal
          booking={selectedBookingForPrint}
          settings={settings}
          onClose={() => setSelectedBookingForPrint(null)}
        />
      )}
    </div>
  );
};
