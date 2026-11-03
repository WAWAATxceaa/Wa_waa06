import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  Plus,
  Filter,
  CheckCircle2,
  X,
  Printer,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';
import { formatThaiDate, getTodayString, toBuddhistYear } from '../../utils/dateUtils';
import { Booking } from '../../types';
import { DEPARTMENTS } from '../../config/constants';
import { OfficialRequestPrintModal } from '../reports/OfficialRequestPrintModal';

type ViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const { rooms, bookings, settings } = useBookingContext();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Advanced 4-criteria filters
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [printModalBooking, setPrintModalBooking] = useState<Booking | null>(null);

  // Filtered bookings by all 4 criteria
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status === 'cancelled') return false;

      // 1. Room Filter
      if (roomFilter !== 'all' && b.roomId !== roomFilter) return false;

      // 2. Department Filter
      if (departmentFilter !== 'all' && b.department !== departmentFilter) return false;

      // 3. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'approved' && b.status !== 'approved' && b.status !== 'confirmed') return false;
        if (statusFilter === 'pending' && b.status !== 'pending_step2' && b.status !== 'pending_step3' && b.status !== 'pending_step4') return false;
        if (statusFilter === 'pending_step2' && b.status !== 'pending_step2') return false;
        if (statusFilter === 'pending_step3' && b.status !== 'pending_step3') return false;
        if (statusFilter === 'pending_step4' && b.status !== 'pending_step4') return false;
      }

      // 4. Date Range Filter
      if (startDateFilter && b.date < startDateFilter) return false;
      if (endDateFilter && b.date > endDateFilter) return false;

      return true;
    });
  }, [bookings, roomFilter, departmentFilter, statusFilter, startDateFilter, endDateFilter]);

  // Date Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const headerTitle = useMemo(() => {
    const monthsThai = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];
    const m = monthsThai[currentDate.getMonth()];
    const y = toBuddhistYear(currentDate.getFullYear());

    if (viewMode === 'day') {
      return `${currentDate.getDate()} ${m} พ.ศ. ${y}`;
    }
    return `${m} พ.ศ. ${y}`;
  }, [currentDate, viewMode]);

  // Calendar Days generator for Month View
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({ dayNumber: i, dateStr, isCurrentMonth: true });
    }

    // Next month padding to fill complete grid of 35 or 42
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({ dayNumber: i, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const todayStr = getTodayString();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-violet-500" />
            <span>ปฏิทินการใช้ห้องประชุม 📅</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ • คลิกช่องว่างเพื่อจองทันที หรือคลิกรายการเพื่อดูรายละเอียด
          </p>
        </div>

        <button
          onClick={() => navigate('/book')}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-500 text-white font-display font-bold text-xs sm:text-sm shadow-md hover:scale-105 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>ยื่นคำขอจองห้อง</span>
        </button>
      </div>

      {/* Advanced 4-Criteria Filters Bar */}
      <div className="p-4 sm:p-5 rounded-4xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-violet-500" />
          <span>ค้นหาขั้นสูง ๔ เงื่อนไข (ใช้ร่วมกันได้):</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Room Filter */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">๑. ห้องประชุม:</label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">ทุกห้องประชุม</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Department Filter */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">๒. แผนกวิชา/หน่วยงาน:</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">ทุกแผนกวิชา</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">๓. สถานะการอนุมัติ:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="approved">✅ อนุมัติแล้ว</option>
              <option value="pending">⏳ อยู่ระหว่างสายอนุมัติ</option>
              <option value="pending_step2">รอตรวจความพร้อม (ขั้น 2)</option>
              <option value="pending_step3">รอรับรอง (ขั้น 3)</option>
              <option value="pending_step4">รออนุมัติ (ขั้น 4)</option>
            </select>
          </div>

          {/* 4. Date Range Filter */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[11px] text-slate-500 mb-1 block">๔. ตั้งแต่วันที่:</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-slate-500 mb-1 block">ถึงวันที่:</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>
          </div>
        </div>

        {(roomFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all' || startDateFilter || endDateFilter) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-violet-600 font-semibold">
              ผลการกรอง: พบ <strong>{filteredBookings.length}</strong> รายการ
            </span>
            <button
              onClick={() => {
                setRoomFilter('all');
                setDepartmentFilter('all');
                setStatusFilter('all');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="text-rose-500 hover:underline font-bold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Calendar Navigation & View Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 rounded-2xl p-1 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              วันนี้
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white">
            {headerTitle}
          </span>
        </div>

        {/* View Mode Toggle: Day / Week / Month */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              viewMode === 'month'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            เดือน
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              viewMode === 'week'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            สัปดาห์
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              viewMode === 'day'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            วัน
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold py-3 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500">
            <span className="text-rose-500">อาทิตย์</span>
            <span>จันทร์</span>
            <span>อังคาร</span>
            <span>พุธ</span>
            <span>พฤหัสบดี</span>
            <span>ศุกร์</span>
            <span className="text-violet-500">เสาร์</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {calendarDays.map((cd, index) => {
              const isToday = cd.dateStr === todayStr;
              const dayBookings = filteredBookings.filter((b) => b.date === cd.dateStr);

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (cd.isCurrentMonth && dayBookings.length === 0) {
                      navigate(`/book?date=${cd.dateStr}`);
                    }
                  }}
                  className={`min-h-[110px] p-2 transition-all flex flex-col justify-between ${
                    cd.isCurrentMonth
                      ? 'bg-transparent hover:bg-violet-50/20 dark:hover:bg-violet-950/20 cursor-pointer'
                      : 'bg-slate-50/40 dark:bg-slate-900/40 opacity-40'
                  } ${isToday ? 'bg-violet-50/40 dark:bg-violet-950/30' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cd.dayNumber}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>

                  {/* Booking Badges */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                    {dayBookings.slice(0, 3).map((b) => {
                      const roomObj = rooms.find((r) => r.id === b.roomId);
                      const bgColor = roomObj?.color || '#8B5CF6';

                      return (
                        <div
                          key={b.id || b.bookingCode}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(b);
                          }}
                          className="text-[11px] p-1.5 rounded-xl font-medium text-white truncate shadow-sm transition-transform hover:scale-102 cursor-pointer flex items-center gap-1"
                          style={{ backgroundColor: bgColor }}
                          title={`${b.title} (${b.startTime}-${b.endTime} น.)`}
                        >
                          <span className="font-bold text-[9px] bg-black/20 px-1 py-0.2 rounded">
                            {b.startTime}
                          </span>
                          <span className="truncate">{b.title}</span>
                        </div>
                      );
                    })}

                    {dayBookings.length > 3 && (
                      <div className="text-[10px] text-center text-slate-500 font-bold py-0.5">
                        +{dayBookings.length - 3} รายการอื่น
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week / Day View simple list presentation */}
      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            รายการประชุมช่วงนี้ ({filteredBookings.length} รายการ)
          </h3>

          {filteredBookings.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">ไม่มีรายการประชุมตามเงื่อนไขที่เลือก</p>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((b) => {
                const roomObj = rooms.find((r) => r.id === b.roomId);
                return (
                  <div
                    key={b.id || b.bookingCode}
                    onClick={() => setSelectedBooking(b)}
                    className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-violet-400 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-3.5 h-3.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: roomObj?.color || '#8B5CF6' }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                            {b.bookingCode}
                          </span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{b.title}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {b.otherRoomName || b.roomName} • {formatThaiDate(b.date)} เวลา {b.startTime} - {b.endTime} น.
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 text-right">
                      <div>ผู้ขอ: <strong>{b.bookerName}</strong> ({b.department})</div>
                      <div className="text-[11px] text-violet-600 font-bold mt-0.5">{b.statusThai || b.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected Booking Pop-up Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-4xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold">
                {selectedBooking.bookingCode}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {selectedBooking.statusThai || selectedBooking.status}
              </span>
            </div>

            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-4">
              {selectedBooking.title}
            </h3>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl mb-6">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-500" />
                <span><strong>ห้อง:</strong> {selectedBooking.otherRoomName || selectedBooking.roomName}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-pink-500" />
                <span><strong>วันที่:</strong> {formatThaiDate(selectedBooking.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                <span><strong>เวลา:</strong> {selectedBooking.startTime} - {selectedBooking.endTime} น.</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" />
                <span><strong>ผู้ขอใช้:</strong> {selectedBooking.bookerName} ({selectedBooking.department})</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span><strong>จำนวนผู้ร่วม:</strong> {selectedBooking.participantCount} คน</span>
              </div>
              {selectedBooking.amenitiesText && (
                <div className="pt-1 text-slate-600 dark:text-slate-400">
                  <strong>ครุภัณฑ์:</strong> {selectedBooking.amenitiesText}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => {
                  setPrintModalBooking(selectedBooking);
                  setSelectedBooking(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ใบคำขอ A4</span>
              </button>
              <button
                onClick={() => {
                  navigate(`/manage/${selectedBooking.bookingCode}`);
                }}
                className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>ดูประวัติ & สายอนุมัติ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official A4 Print Modal */}
      {printModalBooking && (
        <OfficialRequestPrintModal
          booking={printModalBooking}
          settings={settings}
          onClose={() => setPrintModalBooking(null)}
        />
      )}
    </div>
  );
};
