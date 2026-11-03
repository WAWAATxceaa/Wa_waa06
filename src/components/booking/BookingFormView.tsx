import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Sparkles,
  Building2,
  Phone,
  User,
  Tv,
  Video,
  Projector,
  Mic,
  Volume2,
  Table,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';
import { DEPARTMENTS, DEFAULT_EQUIPMENT } from '../../config/constants';
import { formatThaiDate, getTodayString } from '../../utils/dateUtils';
import { generateBookingCode } from '../../utils/codeGenerator';
import { createBooking } from '../../services/firestoreService';
import { sendBookingToGoogleSheet, apiUploadAttachment } from '../../services/sheetsService';
import { BookingSuccessModal } from './BookingSuccessModal';
import { Booking, EquipmentSelection } from '../../types';
import { showErrorAlert, showLoadingAlert, closeAlert } from '../../utils/alertUtils';

export const BookingFormView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { rooms, bookings, settings, refreshData } = useBookingContext();

  const preselectedRoomId = searchParams.get('roomId') || (rooms[0]?.id ?? 'room-1');
  const preselectedDate = searchParams.get('date') || getTodayString();
  const preselectedStart = searchParams.get('startTime') || '09:00';
  const preselectedEnd = searchParams.get('endTime') || '11:00';

  // Form State
  const [roomId, setRoomId] = useState(preselectedRoomId);
  const [otherRoomName, setOtherRoomName] = useState('');
  const [date, setDate] = useState(preselectedDate);
  const [startTime, setStartTime] = useState(preselectedStart);
  const [endTime, setEndTime] = useState(preselectedEnd);
  const [participantCount, setParticipantCount] = useState<number | ''>(20);

  // Requester Info
  const [bookerName, setBookerName] = useState('');
  const [bookerPosition, setBookerPosition] = useState('ครู/บุคลากรทางการศึกษา');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [customDepartment, setCustomDepartment] = useState('');
  const [bookerContact, setBookerContact] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Equipment Selection (6 items)
  const [equipment, setEquipment] = useState<EquipmentSelection>({
    projector: true,
    soundSystem: true,
    microphone: true,
    extraTableChair: false,
    customItem1: '',
    customItem2: '',
    extraTableCount: 0,
    extraChairCount: 0,
  });

  // Schedule Attachment File
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);

  // Compulsory Official Asset Care Checkbox
  const [assetCareConfirmed, setAssetCareConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!roomId && rooms.length > 0) {
      setRoomId(rooms[0].id);
    }
  }, [rooms, roomId]);

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === roomId) || rooms[0];
  }, [rooms, roomId]);

  const isOtherRoom = selectedRoom?.isOther || roomId === 'room-other';

  // ตรวจสอบการทับซ้อนเวลาฝั่ง Client ล่วงหน้า
  const conflictWarning = useMemo(() => {
    if (!date || !startTime || !endTime) return null;
    if (startTime >= endTime) {
      return 'เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด';
    }

    const conflicts = bookings.filter((b) => {
      if (b.status === 'cancelled' || b.status === 'rejected') return false;
      if (b.date !== date) return false;

      const isSame = isOtherRoom
        ? b.roomId === 'room-other' && b.otherRoomName?.toLowerCase() === otherRoomName.trim().toLowerCase()
        : b.roomId === roomId;

      if (!isSame) return false;

      // Overlap: (newStart < existingEnd) && (newEnd > existingStart)
      return startTime < b.endTime && endTime > b.startTime;
    });

    if (conflicts.length > 0) {
      const c = conflicts[0];
      return `ช่วงเวลานี้ซ้อนทับกับการจองอื่น: "${c.title}" (${c.startTime} - ${c.endTime} น.)`;
    }

    // Check maintenance range
    if (selectedRoom?.status === 'maintenance') {
      const mStart = selectedRoom.maintenanceStartDate;
      const mEnd = selectedRoom.maintenanceEndDate;
      if (!mStart && !mEnd) {
        return `ห้อง "${selectedRoom.name}" ปิดปรับปรุงชั่วคราว`;
      }
      if (mStart && mEnd && date >= mStart && date <= mEnd) {
        return `ห้อง "${selectedRoom.name}" ปิดปรับปรุงระหว่าง ${formatThaiDate(mStart)} ถึง ${formatThaiDate(mEnd)}`;
      }
    }

    return null;
  }, [date, startTime, endTime, roomId, otherRoomName, isOtherRoom, bookings, selectedRoom]);

  const handleEquipmentChange = (key: keyof EquipmentSelection, value: any) => {
    setEquipment((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Limit to 10MB
      if (file.size > 10 * 1024 * 1024) {
        showErrorAlert('ไฟล์มีขนาดใหญ่เกินไป', 'กรุณาเลือกไฟล์เอกสารหรือรูปภาพขนาดไม่เกิน 10 MB');
        return;
      }
      setAttachmentFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookerName.trim()) {
      showErrorAlert('กรุณากรอกข้อมูลให้ครบ', 'โปรดระบุชื่อ-นามสกุลของผู้ขอใช้ห้อง');
      return;
    }
    if (!bookerContact.trim()) {
      showErrorAlert('กรุณากรอกข้อมูลให้ครบ', 'โปรดระบุเบอร์โทรศัพท์สำหรับติดต่อ');
      return;
    }
    if (!title.trim()) {
      showErrorAlert('กรุณากรอกข้อมูลให้ครบ', 'โปรดระบุหัวข้อหรือวัตถุประสงค์การประชุม');
      return;
    }
    if (isOtherRoom && !otherRoomName.trim()) {
      showErrorAlert('กรุณากรอกข้อมูลให้ครบ', 'โปรดระบุชื่อห้องหรือสถานที่ที่ต้องการขอใช้');
      return;
    }
    if (conflictWarning) {
      showErrorAlert('เวลาซ้อนทับหรือห้องไม่ว่าง', conflictWarning);
      return;
    }
    if (!assetCareConfirmed) {
      showErrorAlert(
        'เงื่อนไขการใช้ห้องราชการ',
        'โปรดทำเครื่องหมายถูกที่ช่อง "ยืนยันการดูแลรักษาทรัพย์สินของทางราชการ" ก่อนกดยื่นคำขอ'
      );
      return;
    }

    setSubmitting(true);
    showLoadingAlert('กำลังบันทึกและส่งคำขอไปยังระบบ...');

    try {
      let uploadedAttachmentUrl = '';
      let uploadedAttachmentName = '';

      // Upload file to Google Drive if selected
      if (attachmentFile) {
        setAttachmentUploading(true);
        const uploadRes = await apiUploadAttachment(attachmentFile);
        if (uploadRes.success && uploadRes.fileUrl) {
          uploadedAttachmentUrl = uploadRes.fileUrl;
          uploadedAttachmentName = uploadRes.fileName || attachmentFile.name;
        }
        setAttachmentUploading(false);
      }

      // Format equipment text summary
      const eqItems: string[] = [];
      if (equipment.projector) eqItems.push('โปรเจกเตอร์');
      if (equipment.soundSystem) eqItems.push('ระบบเสียง');
      if (equipment.microphone) eqItems.push('ไมโครโฟน');
      if (equipment.extraTableChair) {
        eqItems.push(`โต๊ะ/เก้าอี้เสริม (โต๊ะ ${equipment.extraTableCount || 0} ตัว, เก้าอี้ ${equipment.extraChairCount || 0} ตัว)`);
      }
      if (equipment.customItem1) eqItems.push(equipment.customItem1);
      if (equipment.customItem2) eqItems.push(equipment.customItem2);

      const resolvedDepartment = department === 'อื่นๆ (ระบุ)' && customDepartment.trim()
        ? customDepartment.trim()
        : department;

      const code = generateBookingCode();
      const newBookingPayload = {
        bookingCode: code,
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        otherRoomName: isOtherRoom ? otherRoomName.trim() : '',
        roomColor: selectedRoom.color || '#8B5CF6',
        date,
        startTime,
        endTime,
        startDateTime: `${date}T${startTime}:00`,
        endDateTime: `${date}T${endTime}:00`,
        participantCount: Number(participantCount) || 1,
        bookerName: bookerName.trim(),
        bookerPosition: bookerPosition.trim(),
        department: resolvedDepartment,
        bookerContact: bookerContact.trim(),
        title: title.trim(),
        description: description.trim(),
        equipment,
        amenitiesText: eqItems.join(', '),
        extraTableCount: equipment.extraTableCount || 0,
        extraChairCount: equipment.extraChairCount || 0,
        attachmentUrl: uploadedAttachmentUrl,
        attachmentName: uploadedAttachmentName,
        assetCareConfirmed: true,
        status: 'pending_step2' as const,
        statusThai: 'รอตรวจความพร้อมห้อง/โสตฯ (ขั้น 2)',
        currentStep: 2 as const,
        step1SubmittedAt: new Date().toISOString(),
        logs: [{
          step: 1 as const,
          title: 'ยื่นคำขอใช้ห้องประชุม',
          actorName: bookerName.trim(),
          actorRole: 'requester' as const,
          action: 'submit' as const,
          statusThai: 'ยื่นคำขอแล้ว',
          timestamp: new Date().toISOString(),
        }],
      };

      const result = await createBooking(newBookingPayload);
      closeAlert();

      if (result.success && result.booking) {
        setCreatedBooking(result.booking);
        // ส่งสำเนาไปยัง Google Sheet ในเบื้องหลัง (ไม่ให้ผู้ใช้ต้องรอ)
        sendBookingToGoogleSheet(result.booking, 'create').catch(console.warn);
        await refreshData();
      } else {
        showErrorAlert('ไม่สามารถยื่นคำขอได้', result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      closeAlert();
      showErrorAlert('เกิดข้อผิดพลาด', err.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Title Header */}
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-spin" />
          <span>แบบฟอร์มขออนุญาตใช้ห้องประชุมราชการ</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
          ยื่นคำขอใช้ห้องประชุมและโสตทัศนูปกรณ์ ✨
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ (งานศูนย์ดิจิทัลและสื่อสารองค์กร)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: ข้อมูลห้องประชุมและวัน-เวลา */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-xl bg-violet-500 text-white flex items-center justify-center text-xs">1</span>
            เลือกห้องประชุม วันที่ และเวลา
          </h2>

          <div className="space-y-4">
            {/* Room Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ห้องประชุมที่ต้องการขอใช้ <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {rooms.map((r) => {
                  const isSelected = roomId === r.id;
                  const isMaint = r.status === 'maintenance';
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoomId(r.id)}
                      className={`p-3 rounded-2xl text-left border transition-all relative ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                          {r.name}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {r.isOther ? 'ระบุสถานที่เอง' : `ความจุ: ${r.capacity} คน • ชั้น ${r.floor}`}
                      </div>
                      {isMaint && (
                        <div className="text-[10px] text-rose-500 font-bold mt-1">
                          ⚠️ ปิดปรับปรุง
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Other Room Name Input */}
            {isOtherRoom && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 animate-fade-in">
                <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  ระบุชื่อห้อง หรือสถานที่ที่ต้องการใช้ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น ห้องประชุมแผนกช่างยนต์, ลานกิจกรรมหน้าอาคาร 3"
                  value={otherRoomName}
                  onChange={(e) => setOtherRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            )}

            {/* Date and Time Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  วันที่ขอใช้ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  เวลาเริ่ม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  เวลาสิ้นสุด <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>
            </div>

            {/* Attendees & Conflict Warning */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                จำนวนผู้เข้าร่วมประชุม (คน) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={2000}
                value={participantCount}
                onChange={(e) => setParticipantCount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full sm:w-1/3 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            {conflictWarning && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{conflictWarning}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: ข้อมูลผู้ขอใช้ห้อง */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-xl bg-pink-500 text-white flex items-center justify-center text-xs">2</span>
            ข้อมูลผู้ขอใช้ห้อง (ผู้ประสานงาน)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                ชื่อ - นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น นายวัชรพงศ์ โสภา"
                value={bookerName}
                onChange={(e) => setBookerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ตำแหน่งทางราชการ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น ครู, หัวหน้าแผนกวิชา, เจ้าหน้าที่"
                value={bookerPosition}
                onChange={(e) => setBookerPosition(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                หน่วยงาน / แผนกวิชา <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {department === 'อื่นๆ (ระบุ)' && (
                <input
                  type="text"
                  placeholder="ระบุชื่อหน่วยงาน/โครงการ"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="เช่น 081-234-5678"
                value={bookerContact}
                onChange={(e) => setBookerContact(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                หัวข้อ / วัตถุประสงค์การใช้ห้อง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น ประชุมวางแผนการสอนประจำภาคเรียนที่ 1/2569"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                รายละเอียดเพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                rows={2}
                placeholder="ระบุรูปแบบการจัดโต๊ะ หรือรายละเอียดเฉพาะ..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: ครุภัณฑ์และอุปกรณ์ที่ขอใช้ (6 รายการ) */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-xl bg-cyan-500 text-white flex items-center justify-center text-xs">3</span>
            เลือกครุภัณฑ์และอุปกรณ์โสตทัศนูปกรณ์ที่ต้องการใช้ (6 รายการ)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. โปรเจกเตอร์ */}
            <label className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={equipment.projector}
                onChange={(e) => handleEquipmentChange('projector', e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Projector className="w-4 h-4 text-violet-500" />
                <span>โปรเจกเตอร์ / จอภาพ</span>
              </div>
            </label>

            {/* 2. ระบบเสียง */}
            <label className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={equipment.soundSystem}
                onChange={(e) => handleEquipmentChange('soundSystem', e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Volume2 className="w-4 h-4 text-pink-500" />
                <span>ระบบเสียงห้องประชุม</span>
              </div>
            </label>

            {/* 3. ไมโครโฟน */}
            <label className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={equipment.microphone}
                onChange={(e) => handleEquipmentChange('microphone', e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Mic className="w-4 h-4 text-cyan-500" />
                <span>ไมโครโฟน (ตั้งโต๊ะ / ไร้สาย)</span>
              </div>
            </label>

            {/* 4. โต๊ะ/เก้าอี้เสริม */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={equipment.extraTableChair}
                  onChange={(e) => handleEquipmentChange('extraTableChair', e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Table className="w-4 h-4 text-emerald-500" />
                  <span>โต๊ะ / เก้าอี้เสริม</span>
                </div>
              </label>

              {equipment.extraTableChair && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">โต๊ะเสริม (ตัว):</label>
                    <input
                      type="number"
                      min={0}
                      value={equipment.extraTableCount || 0}
                      onChange={(e) => handleEquipmentChange('extraTableCount', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">เก้าอี้เสริม (ตัว):</label>
                    <input
                      type="number"
                      min={0}
                      value={equipment.extraChairCount || 0}
                      onChange={(e) => handleEquipmentChange('extraChairCount', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. อุปกรณ์เสริม 1 (ตั้งค่าได้จากหลังบ้าน) */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {settings.customEquipment1Label || 'โพเดียม / ป้ายข้อความ'}
              </label>
              <input
                type="text"
                placeholder="ระบุรายละเอียด (ถ้าต้องการ)"
                value={equipment.customItem1 || ''}
                onChange={(e) => handleEquipmentChange('customItem1', e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* 6. อุปกรณ์เสริม 2 (ตั้งค่าได้จากหลังบ้าน) */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {settings.customEquipment2Label || 'ปลั๊กพ่วง / จุดจ่ายไฟ'}
              </label>
              <input
                type="text"
                placeholder="ระบุรายละเอียด (ถ้าต้องการ)"
                value={equipment.customItem2 || ''}
                onChange={(e) => handleEquipmentChange('customItem2', e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 4: แนบไฟล์กำหนดการ & ยืนยันการดูแลทรัพย์สินราชการ */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs">4</span>
            แนบไฟล์กำหนดการ & การยืนยันของทางราชการ
          </h2>

          {/* File Upload to Google Drive */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-slate-400" />
              แนบไฟล์กำหนดการ / หนังสือขอใช้ (PDF หรือรูปภาพ ไม่เกิน 10 MB):
            </label>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-violet-950/60 dark:file:text-violet-300"
            />
            {attachmentFile && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" />
                เลือกไฟล์: {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(0)} KB) — ระบบจะบันทึกลง Google Drive อัตโนมัติ
              </p>
            )}
          </div>

          {/* Compulsory Official Property Care Checkbox */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={assetCareConfirmed}
                onChange={(e) => setAssetCareConfirmed(e.target.checked)}
                className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 mt-0.5"
                required
              />
              <div>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ข้าพเจ้ายืนยันการดูแลรักษาทรัพย์สินของทางราชการ <span className="text-rose-500">*</span>
                </span>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-1">
                  ผู้ขอใช้ห้องและผู้เข้าร่วมยินดีปฏิบัติตามระเบียบการใช้สถานที่ของวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ โดยจะดูแลรักษาอุปกรณ์โสตฯ และความสะอาดเรียบร้อยของห้องประชุม หากมีความเสียหายเกิดขึ้นพร้อมรับผิดชอบตามระเบียบของทางราชการ
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !!conflictWarning || !assetCareConfirmed}
            className="w-full py-4 rounded-3xl bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-500 text-white font-display font-bold text-sm sm:text-base shadow-xl shadow-pink-500/20 hover:opacity-95 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>{submitting ? 'กำลังส่งคำขอเข้าสู่ระบบ...' : 'ส่งคำขอจองห้องประชุม (เข้าสู่สายอนุมัติ 4 ขั้น) ✨'}</span>
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {createdBooking && (
        <BookingSuccessModal
          booking={createdBooking}
          onClose={() => setCreatedBooking(null)}
          onTrackStatus={() => {
            navigate(`/manage/${createdBooking.bookingCode}`);
          }}
        />
      )}
    </div>
  );
};
