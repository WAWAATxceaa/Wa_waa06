import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Printer,
  ExternalLink,
  Settings,
  Send,
  Loader2,
  Database,
} from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';
import { formatThaiDate } from '../../utils/dateUtils';
import { exportToExcel, exportToCSV, exportSystemBackup } from '../../services/exportService';
import { getWebhookUrl, sendBookingToGoogleSheet } from '../../services/sheetsService';
import { GoogleSheetModal } from '../common/GoogleSheetModal';
import { showSuccessAlert, showErrorAlert, showLoadingAlert, closeAlert, showConfirmAlert } from '../../utils/alertUtils';
import { DEPARTMENTS } from '../../config/constants';
import { Booking } from '../../types';
import { OfficialRequestPrintModal } from './OfficialRequestPrintModal';

export const ReportsView: React.FC = () => {
  const { rooms, bookings, settings } = useBookingContext();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'title' | 'roomName' | 'bookerName'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedBookingForPrint, setSelectedBookingForPrint] = useState<Booking | null>(null);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [syncingToSheet, setSyncingToSheet] = useState(false);

  const isSheetConnected = !!getWebhookUrl() && getWebhookUrl().trim().startsWith('http');

  const handleSyncToGoogleSheet = async () => {
    const url = getWebhookUrl();
    if (!url || !url.trim().startsWith('http')) {
      setSheetModalOpen(true);
      return;
    }

    if (filteredBookings.length === 0) {
      showErrorAlert('ไม่พบข้อมูล', 'ไม่มีรายการคำขอในตารางให้ส่งออก');
      return;
    }

    const confirm = await showConfirmAlert(
      'ยืนยันส่งข้อมูลเข้า Google Sheet?',
      `คุณต้องการส่งข้อมูลคำขอที่กำลังแสดงอยู่ในตารางทั้งหมด <b>${filteredBookings.length} รายการ</b> เข้าแท็บ "การจอง" ใน Google Sheet ใช่หรือไม่?`,
      'ยืนยันส่งข้อมูล',
      'ยกเลิก'
    );

    if (!confirm.isConfirmed) return;

    setSyncingToSheet(true);
    showLoadingAlert(`กำลังส่งข้อมูล ${filteredBookings.length} รายการเข้า Google Sheet...`);

    try {
      let successCount = 0;
      for (const b of filteredBookings) {
        const res = await sendBookingToGoogleSheet(b, 'update');
        if (res.success) successCount++;
      }

      closeAlert();
      await showSuccessAlert(
        'ส่งข้อมูลเข้า Google Sheet สำเร็จ! ✨',
        `บันทึกข้อมูลเรียบร้อยแล้วทั้งหมด <b>${successCount}/${filteredBookings.length} รายการ</b> ในแท็บ "การจอง"`
      );
    } catch (err: any) {
      closeAlert();
      showErrorAlert('ส่งข้อมูลไม่สำเร็จ', err.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    } finally {
      setSyncingToSheet(false);
    }
  };

  const handleBackupData = () => {
    exportSystemBackup({
      bookings,
      rooms,
      settings,
    });
    showSuccessAlert(
      'สำรองข้อมูลสำเร็จ ✨',
      `ดาวน์โหลดไฟล์ Backup (.json) บันทึกคำขอทั้งหมด ${bookings.length} รายการ, ผังห้อง และการตั้งค่าระบบเรียบร้อยแล้ว`
    );
  };

  // Filtered & Sorted Data
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        if (roomFilter !== 'all' && b.roomId !== roomFilter) return false;
        if (departmentFilter !== 'all' && b.department !== departmentFilter) return false;
        if (statusFilter !== 'all' && b.status !== statusFilter) return false;
        if (startDate && b.date < startDate) return false;
        if (endDate && b.date > endDate) return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchCode = b.bookingCode?.toLowerCase().includes(q);
          const matchTitle = b.title?.toLowerCase().includes(q);
          const matchBooker = b.bookerName?.toLowerCase().includes(q);
          const matchRoom = (b.otherRoomName || b.roomName)?.toLowerCase().includes(q);
          const matchDept = b.department?.toLowerCase().includes(q);
          if (!matchCode && !matchTitle && !matchBooker && !matchRoom && !matchDept) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [bookings, roomFilter, departmentFilter, statusFilter, startDate, endDate, searchTerm, sortField, sortOrder]);

  const handleSort = (field: 'date' | 'title' | 'roomName' | 'bookerName') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            <span>รายงานสถิติ & ส่งออกข้อมูลราชการ 📑</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ • คัดกรอง ค้นหา และพิมพ์ใบคำขอ A4 หรือส่งออก Excel/CSV
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportToCSV.bind(null, filteredBookings, `ttc-report-${Date.now()}.csv`)}
            disabled={filteredBookings.length === 0}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 text-cyan-600" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            onClick={exportToExcel.bind(null, filteredBookings, `ttc-report-${Date.now()}.xlsx`)}
            disabled={filteredBookings.length === 0}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>
          <button
            onClick={handleBackupData}
            className="px-3.5 py-2.5 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
            title="ดาวน์โหลดไฟล์สำรองข้อมูลทั้งหมด (Backup JSON)"
          >
            <Database className="w-4 h-4 text-violet-600" />
            <span>สำรองข้อมูล (Backup)</span>
          </button>
          <button
            onClick={handleSyncToGoogleSheet}
            disabled={syncingToSheet}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {syncingToSheet ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-white" />
            )}
            <span>ส่งเข้า Google Sheet</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isSheetConnected ? 'bg-white animate-pulse' : 'bg-amber-300'
              }`}
              title={isSheetConnected ? 'เชื่อมต่อ Google Sheet แล้ว' : 'ยังไม่ได้เชื่อมต่อ (คลิกเพื่อตั้งค่า)'}
            />
          </button>
          <button
            onClick={() => setSheetModalOpen(true)}
            title="ตั้งค่า Webhook Google Sheet"
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs shadow-sm transition-all"
          >
            <Settings className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search box */}
          <div className="lg:col-span-2">
            <label className="text-[11px] text-slate-500 mb-1 block">ค้นหา (รหัส/หัวข้อ/ชื่อผู้ขอ/แผนก):</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="พิมพ์คำค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Room filter */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">ห้องประชุม:</label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            >
              <option value="all">ทุกห้องประชุม</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Department filter */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">แผนกวิชา/ฝ่าย:</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            >
              <option value="all">ทุกแผนกวิชา</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">สถานะ:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="pending_step2">รอตรวจความพร้อม (ขั้น 2)</option>
              <option value="pending_step3">รอรับรอง (ขั้น 3)</option>
              <option value="pending_step4">รออนุมัติ (ขั้น 4)</option>
              <option value="rejected">ไม่อนุมัติ/ส่งกลับ</option>
              <option value="cancelled">ยกเลิกแล้ว</option>
            </select>
          </div>
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">ช่วงวันที่ขอใช้:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <span className="text-slate-400">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="text-slate-500">
            แสดงผล <strong>{filteredBookings.length}</strong> จาก {bookings.length} รายการ
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
              <tr>
                <th className="py-3.5 px-4">รหัสคำขอ</th>
                <th className="py-3.5 px-4 cursor-pointer" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    <span>วันที่ & เวลา</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer" onClick={() => handleSort('roomName')}>
                  <div className="flex items-center gap-1">
                    <span>ห้องประชุม</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1">
                    <span>หัวข้อ/วัตถุประสงค์</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer" onClick={() => handleSort('bookerName')}>
                  <div className="flex items-center gap-1">
                    <span>ผู้ขอใช้</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id || b.bookingCode} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-violet-700 dark:text-violet-400">
                      {b.bookingCode}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>{formatThaiDate(b.date)}</div>
                      <div className="text-[11px] text-slate-400">{b.startTime} - {b.endTime} น.</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {b.otherRoomName || b.roomName}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate font-medium">
                      {b.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{b.bookerName}</div>
                      <div className="text-[11px] text-slate-400">{b.department}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        b.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : b.status === 'cancelled' || b.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {b.statusThai || b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedBookingForPrint(b)}
                        className="px-3 py-1 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/60 dark:text-violet-300 text-xs font-semibold inline-flex items-center gap-1 shadow-sm"
                        title="พิมพ์ใบคำขอ A4"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>พิมพ์ A4</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official A4 Request Print Modal */}
      {selectedBookingForPrint && (
        <OfficialRequestPrintModal
          booking={selectedBookingForPrint}
          settings={settings}
          onClose={() => setSelectedBookingForPrint(null)}
        />
      )}

      {/* Google Sheet Connection / Sync Modal */}
      <GoogleSheetModal
        isOpen={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
      />
    </div>
  );
};
