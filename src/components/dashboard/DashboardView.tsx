import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Plus,
  Hourglass,
  Layers,
  FileCheck,
  Building2,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useBookingContext } from '../../context/BookingContext';
import { formatThaiDate } from '../../utils/dateUtils';
import { AnnouncementsBanner } from './AnnouncementsBanner';

const CHART_COLORS = ['#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F59E0B', '#3B82F6', '#10B981'];

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const {
    rooms,
    bookings,
    announcements,
    todayBookingCount,
    pendingApprovalCount,
    approvedBookingCount,
    totalAttendeesCount,
    activeMeetingCount,
    availableRoomCount,
    loading,
  } = useBookingContext();

  // Filter State: 'all' | 'fiscal_current' | 'fiscal_prev' | 'this_month'
  const [timeFilter, setTimeFilter] = useState<'all' | 'fiscal_current' | 'fiscal_prev' | 'this_month'>('all');

  // คำนวณช่วงวันที่ของปีงบประมาณ (1 ต.ค. - 30 ก.ย.)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // ปีงบประมาณปัจจุบัน (พ.ศ.)
  const currentFiscalYearBE = currentMonth >= 10 ? currentYear + 544 : currentYear + 543;
  const currentFiscalStart = currentMonth >= 10 ? `${currentYear}-10-01` : `${currentYear - 1}-10-01`;
  const currentFiscalEnd = currentMonth >= 10 ? `${currentYear + 1}-09-30` : `${currentYear}-09-30`;

  const prevFiscalYearBE = currentFiscalYearBE - 1;
  const prevFiscalStart = currentMonth >= 10 ? `${currentYear - 1}-10-01` : `${currentYear - 2}-10-01`;
  const prevFiscalEnd = currentMonth >= 10 ? `${currentYear}-09-30` : `${currentYear - 1}-09-30`;

  const thisMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // กรอง Bookings ตามตัวกรองเวลา
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (timeFilter === 'all') return true;
      if (timeFilter === 'fiscal_current') {
        return b.date >= currentFiscalStart && b.date <= currentFiscalEnd;
      }
      if (timeFilter === 'fiscal_prev') {
        return b.date >= prevFiscalStart && b.date <= prevFiscalEnd;
      }
      if (timeFilter === 'this_month') {
        return b.date.startsWith(thisMonthPrefix);
      }
      return true;
    });
  }, [bookings, timeFilter, currentFiscalStart, currentFiscalEnd, prevFiscalStart, prevFiscalEnd, thisMonthPrefix]);

  // Chart 1: จัดอันดับห้องยอดนิยม (จำนวนครั้งที่อนุมัติ)
  const roomStats = useMemo(() => {
    return rooms.map((r) => {
      const count = filteredBookings.filter(
        (b) => b.roomId === r.id && (b.status === 'approved' || b.status === 'confirmed')
      ).length;
      return {
        name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
        fullName: r.name,
        count,
        color: r.color,
      };
    }).sort((a, b) => b.count - a.count);
  }, [rooms, filteredBookings]);

  // Chart 2: จัดอันดับแผนกวิชาที่ใช้ห้องมากที่สุด
  const departmentStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBookings.forEach((b) => {
      if (b.status === 'approved' || b.status === 'confirmed') {
        const dept = b.department || 'ไม่ระบุ';
        map[dept] = (map[dept] || 0) + 1;
      }
    });

    return Object.entries(map)
      .map(([name, count], index) => ({
        name: name.replace('แผนกวิชา', '').trim(),
        fullName: name,
        count,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredBookings]);

  // Chart 3: ชั่วโมงการใช้งานรายห้อง (Usage Hours per Room)
  const roomUsageHours = useMemo(() => {
    return rooms.map((r) => {
      let totalMinutes = 0;
      filteredBookings.forEach((b) => {
        if (b.roomId === r.id && (b.status === 'approved' || b.status === 'confirmed') && b.startTime && b.endTime) {
          const [sh, sm] = b.startTime.split(':').map(Number);
          const [eh, em] = b.endTime.split(':').map(Number);
          const diffMin = (eh * 60 + em) - (sh * 60 + sm);
          if (diffMin > 0) totalMinutes += diffMin;
        }
      });
      return {
        name: r.name.length > 12 ? r.name.substring(0, 12) + '...' : r.name,
        hours: Number((totalMinutes / 60).toFixed(1)),
        color: r.color,
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [rooms, filteredBookings]);

  // Chart 4: สถิติการขอใช้ครุภัณฑ์ 4 ประเภทหลัก
  const equipmentStats = useMemo(() => {
    let projectorCount = 0;
    let soundCount = 0;
    let micCount = 0;
    let tableChairCount = 0;

    filteredBookings.forEach((b) => {
      if (b.status === 'approved' || b.status === 'confirmed') {
        if (b.equipment?.projector) projectorCount++;
        if (b.equipment?.soundSystem) soundCount++;
        if (b.equipment?.microphone) micCount++;
        if (b.equipment?.extraTableChair) tableChairCount++;
      }
    });

    return [
      { name: 'โปรเจกเตอร์', count: projectorCount, color: '#8B5CF6' },
      { name: 'ระบบเสียง', count: soundCount, color: '#EC4899' },
      { name: 'ไมโครโฟน', count: micCount, color: '#06B6D4' },
      { name: 'โต๊ะ/เก้าอี้เสริม', count: tableChairCount, color: '#10B981' },
    ];
  }, [filteredBookings]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      {/* Announcements Banner */}
      <AnnouncementsBanner announcements={announcements} />

      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-500 rounded-4xl p-6 sm:p-10 text-white shadow-xl shadow-pink-500/15 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>วท.ท่าหลวงซิเมนต์ไทยอนุสรณ์ • งานศูนย์ดิจิทัลและสื่อสารองค์กร</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight">
            TTC Smart Meeting Room & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-2 font-medium">
            ระบบจองห้องประชุมออนไลน์อัจฉริยะ ตรวจสอบเวลาชนกันอัตโนมัติ พร้อมสายอนุมัติ ๔ ขั้นตอนตามระเบียบราชการ
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/book')}
              className="px-6 py-3 rounded-2xl bg-white text-violet-900 font-display font-bold text-xs sm:text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-pink-500" />
              <span>ยื่นคำขอจองห้องทันที</span>
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 font-display font-bold text-xs sm:text-sm transition-all flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>ดูปฏิทินการใช้ห้อง</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar (Fiscal Year & Month) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Filter className="w-4 h-4 text-violet-500" />
          <span>ตัวกรองสถิติและข้อมูล:</span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeFilter === 'all'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setTimeFilter('fiscal_current')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeFilter === 'fiscal_current'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ปีงบประมาณ {currentFiscalYearBE} (ปัจจุบัน)
          </button>
          <button
            onClick={() => setTimeFilter('fiscal_prev')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeFilter === 'fiscal_prev'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ปีงบประมาณ {prevFiscalYearBE}
          </button>
          <button
            onClick={() => setTimeFilter('this_month')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeFilter === 'this_month'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            รายเดือนนี้
          </button>
        </div>
      </div>

      {/* 4 Summary Cards (ฟังก์ชัน 1, 2, 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: จองวันนี้ */}
        <div className="p-6 rounded-4xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">จองวันนี้</span>
            <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">
            {todayBookingCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            กำลังใช้งานขณะนี้: <strong className="text-violet-600">{activeMeetingCount}</strong> ห้อง
          </p>
        </div>

        {/* Card 2: รออนุมัติ */}
        <div className="p-6 rounded-4xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">รออนุมัติ</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Hourglass className="w-5 h-5 animate-spin" />
            </div>
          </div>
          <div className="font-display font-black text-3xl sm:text-4xl text-amber-600">
            {pendingApprovalCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            อยู่ในสายอนุมัติ ๔ ขั้นตอน
          </p>
        </div>

        {/* Card 3: อนุมัติแล้ว */}
        <div className="p-6 rounded-4xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">อนุมัติแล้ว</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="font-display font-black text-3xl sm:text-4xl text-emerald-600">
            {approvedBookingCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            พร้อมเข้าใช้งานตามกำหนด
          </p>
        </div>

        {/* Card 4: ผู้เข้าใช้รวม */}
        <div className="p-6 rounded-4xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ผู้เข้าใช้รวม (คน)</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">
            {totalAttendeesCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            ห้องว่างพร้อมจอง: <strong className="text-emerald-600">{availableRoomCount}</strong> ห้อง
          </p>
        </div>
      </div>

      {/* Live Room Status Indicator */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            สถานะห้องประชุมแบบเรียลไทม์ (Live Room Status)
          </h2>
          <span className="text-xs text-slate-500 font-medium">อัปเดตอัตโนมัติทุก ๑๒ วินาที</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {rooms.map((r) => {
            const isOcc = !r.isAvailableNow && r.status === 'active';
            const isMaint = r.status === 'maintenance';
            return (
              <div
                key={r.id}
                className="p-3.5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isMaint
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                        : isOcc
                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                    }`}>
                      {isMaint ? '🔴 ปิดปรับปรุง' : isOcc ? '🔴 กำลังใช้งาน' : '🟢 ว่าง'}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {r.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {r.isOther ? 'ระบุสถานที่' : (r.amenities && r.amenities[0]) || 'อุปกรณ์พร้อมใช้งาน'}
                  </div>
                </div>

                {isOcc && r.currentBooking && (
                  <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-300 font-medium border-t border-slate-200 dark:border-slate-700 pt-1.5 truncate">
                    {r.currentBooking.title}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: อันดับห้องยอดนิยม */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              จัดอันดับห้องประชุมยอดนิยม (จำนวนครั้ง)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomStats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {roomStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: อันดับแผนกวิชาที่ใช้มากที่สุด */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-pink-500" />
              การใช้ห้องประชุมแยกตามแผนกวิชา
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#EC4899" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: ชั่วโมงการใช้งานรายห้อง */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500" />
              ชั่วโมงการใช้งานรายห้อง (ชั่วโมง)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomUsageHours}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]} fill="#06B6D4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: สถิติการขอใช้ครุภัณฑ์ 4 ประเภทหลัก */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              สถิติการขอรับการสนับสนุนครุภัณฑ์โสตฯ
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equipmentStats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {equipmentStats.map((entry, index) => (
                    <Cell key={`cell-eq-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
