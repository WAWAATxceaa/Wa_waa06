import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Plus,
  Edit2,
  Building2,
  Users,
  Settings,
  Tv,
  Video,
  Projector,
  CheckCircle2,
  Power,
  PowerOff,
  FileSpreadsheet,
  Check,
  ExternalLink,
  Copy,
  AlertCircle,
  HelpCircle,
  Calendar,
  Save,
  Send,
  Database,
} from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';
import { ADMIN_PIN } from '../../config/constants';
import { getWebhookUrl, setWebhookUrl, testSheetConnection } from '../../services/sheetsService';
import { Room, SystemSettings } from '../../types';
import { showSuccessAlert, showErrorAlert, showLoadingAlert, closeAlert } from '../../utils/alertUtils';

export const RoomsManagementView: React.FC = () => {
  const { rooms, settings, addToast, refreshData } = useBookingContext();

  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'settings' | 'webhook'>('rooms');

  // Edit Room Modal state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number | ''>(10);
  const [floor, setFloor] = useState(1);
  const [status, setStatus] = useState<Room['status']>('active');
  const [maintenanceStart, setMaintenanceStart] = useState('');
  const [maintenanceEnd, setMaintenanceEnd] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings form state
  const [staffName, setStaffName] = useState(settings.staffAudiovisual.name);
  const [staffPosition, setStaffPosition] = useState(settings.staffAudiovisual.position);
  const [staffPin, setStaffPin] = useState(settings.staffAudiovisual.pin);

  const [chiefName, setChiefName] = useState(settings.chiefDigital.name);
  const [chiefPosition, setChiefPosition] = useState(settings.chiefDigital.position);
  const [chiefPin, setChiefPin] = useState(settings.chiefDigital.pin);

  const [deputyName, setDeputyName] = useState(settings.deputyDirector.name);
  const [deputyPosition, setDeputyPosition] = useState(settings.deputyDirector.position);
  const [deputyPin, setDeputyPin] = useState(settings.deputyDirector.pin);

  const [eq1Label, setEq1Label] = useState(settings.customEquipment1Label || 'โพเดียม / ป้ายข้อความ');
  const [eq2Label, setEq2Label] = useState(settings.customEquipment2Label || 'ปลั๊กพ่วง / จุดจ่ายไฟ');

  // Google Sheets Webhook State
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState('');
  const [testingSheet, setTestingSheet] = useState(false);
  const [sheetTestResult, setSheetTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    setSheetWebhookUrl(getWebhookUrl());
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN || pin === settings.admin.pin) {
      setIsAuthenticated(true);
      setPinError(false);
      addToast('success', 'เข้าสู่ระบบสำเร็จ 🔓', 'ปลดล็อคหน้าจัดการระบบเรียบร้อย');
    } else {
      setPinError(true);
      addToast('error', 'รหัส PIN ไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง (ค่าเริ่มต้น: 8888)');
    }
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setCapacity(room.capacity || '');
    setFloor(room.floor);
    setStatus(room.status);
    setMaintenanceStart(room.maintenanceStartDate || '');
    setMaintenanceEnd(room.maintenanceEndDate || '');
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    editingRoom.name = name;
    editingRoom.capacity = Number(capacity) || 0;
    editingRoom.floor = floor;
    editingRoom.status = status;
    editingRoom.maintenanceStartDate = maintenanceStart;
    editingRoom.maintenanceEndDate = maintenanceEnd;

    setEditingRoom(null);
    showSuccessAlert('บันทึกข้อมูลห้องสำเร็จ ✨', `อัปเดตข้อมูลห้อง "${name}" เรียบร้อยแล้ว`);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    settings.staffAudiovisual.name = staffName;
    settings.staffAudiovisual.position = staffPosition;
    settings.staffAudiovisual.pin = staffPin;

    settings.chiefDigital.name = chiefName;
    settings.chiefDigital.position = chiefPosition;
    settings.chiefDigital.pin = chiefPin;

    settings.deputyDirector.name = deputyName;
    settings.deputyDirector.position = deputyPosition;
    settings.deputyDirector.pin = deputyPin;

    settings.customEquipment1Label = eq1Label;
    settings.customEquipment2Label = eq2Label;

    showSuccessAlert('บันทึกการตั้งค่าสำเร็จ ✨', 'อัปเดตข้อมูลผู้ลงนาม 4 ขั้นและรายการครุภัณฑ์เรียบร้อยแล้ว');
  };

  const handleSaveSheetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookUrl(sheetWebhookUrl);
    showSuccessAlert('บันทึก URL สำเร็จ 📑', 'ระบบจะเชื่อมต่อ Google Apps Script Web App อัตโนมัติ');
  };

  const handleTestSheetConnection = async () => {
    if (!sheetWebhookUrl.trim()) {
      showErrorAlert('ยังไม่ได้ระบุ URL', 'กรุณากรอก Webhook URL ของ Google Apps Script');
      return;
    }
    setTestingSheet(true);
    setSheetTestResult(null);
    const res = await testSheetConnection(sheetWebhookUrl);
    setTestingSheet(false);
    setSheetTestResult(res);

    if (res.success) {
      setWebhookUrl(sheetWebhookUrl);
      showSuccessAlert('เชื่อมต่อสำเร็จ! 🚀', res.message);
    } else {
      showErrorAlert('เชื่อมต่อไม่สำเร็จ', res.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-4 shadow-md">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white">
          เข้าสู่ระบบผู้ดูแลระบบ (Admin PIN) 🔒
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ (รหัสเริ่มต้น: 8888)
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className={`w-full text-center tracking-widest text-2xl py-3 rounded-2xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 ${
              pinError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
            }`}
          />
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-display font-bold text-sm shadow-md hover:opacity-95"
          >
            ปลดล็อคเข้าสู่ระบบ 🚀
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-violet-500" />
            <span>จัดการห้องประชุม & ตั้งค่าระบบผู้ลงนาม ⚙️</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ (งานศูนย์ดิจิทัลและสื่อสารองค์กร)
          </p>
        </div>

        <button
          onClick={() => setIsAuthenticated(false)}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
        >
          ออกจากระบบ Admin
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-bold w-fit">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'rooms'
              ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          🏢 ห้องประชุม ({rooms.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          ✍️ ผู้ลงนาม ๔ ขั้น & PIN
        </button>
        <button
          onClick={() => setActiveTab('webhook')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'webhook'
              ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          📑 Google Sheets Webhook
        </button>
      </div>

      {/* Tab 1: Rooms */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const isActive = room.status === 'active';
              return (
                <div
                  key={room.id}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: room.color }} />
                        <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                          {room.name}
                        </h3>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {isActive ? '🟢 เปิดใช้งาน' : '🔴 ปิดปรับปรุง'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 my-3">
                      <div>
                        {room.isOther ? (
                          <span>ความจุ: <strong>ยังไม่ได้ระบุ (ให้กรอกในฟอร์ม)</strong></span>
                        ) : (
                          <span>ความจุ: <strong>{room.capacity}</strong> คน • ชั้น {room.floor}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {room.description || '-'}
                      </div>
                      {room.status === 'maintenance' && (
                        <div className="text-[11px] text-rose-600 font-bold">
                          ปิดปรับปรุง: {room.maintenanceStartDate || '-'} ถึง {room.maintenanceEndDate || '-'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(room)}
                      className="flex-1 py-2 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>แก้ไขห้อง / ช่วงปิดปรับปรุง</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Settings (4 Signers & PIN) */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white/80 dark:bg-slate-900/80 rounded-4xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-500" />
            <span>ตั้งค่ารายชื่อ ตำแหน่ง และรหัส PIN ผู้ลงนาม ๔ ขั้นตอน (ไม่ฝังในโค้ด)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 2 Signer */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-pink-100 text-pink-700">
                ขั้นที่ ๒: ตรวจความพร้อมโสตฯ
              </span>
              <div>
                <label className="text-[11px] text-slate-500 block">ชื่อ-นามสกุล:</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">ตำแหน่ง:</label>
                <input
                  type="text"
                  value={staffPosition}
                  onChange={(e) => setStaffPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">รหัส PIN เข้าสู่ระบบ:</label>
                <input
                  type="text"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            {/* Step 3 Signer */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-cyan-100 text-cyan-700">
                ขั้นที่ ๓: รับรองคำขอ (หัวหน้างาน)
              </span>
              <div>
                <label className="text-[11px] text-slate-500 block">ชื่อ-นามสกุล:</label>
                <input
                  type="text"
                  value={chiefName}
                  onChange={(e) => setChiefName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">ตำแหน่ง:</label>
                <input
                  type="text"
                  value={chiefPosition}
                  onChange={(e) => setChiefPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">รหัส PIN เข้าสู่ระบบ:</label>
                <input
                  type="text"
                  value={chiefPin}
                  onChange={(e) => setChiefPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            {/* Step 4 Signer */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-700">
                ขั้นที่ ๔: พิจารณาอนุมัติ (รอง ผอ.)
              </span>
              <div>
                <label className="text-[11px] text-slate-500 block">ชื่อ-นามสกุล:</label>
                <input
                  type="text"
                  value={deputyName}
                  onChange={(e) => setDeputyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">ตำแหน่ง:</label>
                <input
                  type="text"
                  value={deputyPosition}
                  onChange={(e) => setDeputyPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">รหัส PIN เข้าสู่ระบบ:</label>
                <input
                  type="text"
                  value={deputyPin}
                  onChange={(e) => setDeputyPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 font-mono tracking-wider"
                  required
                />
              </div>
            </div>
          </div>

          {/* Custom Equipment Settings */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
              ชื่อครุภัณฑ์เสริมที่กำหนดเองได้ (๒ รายการ):
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-500 block">ครุภัณฑ์เสริม ๑:</label>
                <input
                  type="text"
                  value={eq1Label}
                  onChange={(e) => setEq1Label(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">ครุภัณฑ์เสริม ๒:</label>
                <input
                  type="text"
                  value={eq2Label}
                  onChange={(e) => setEq2Label(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/25 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าทั้งหมด</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Google Sheets Webhook */}
      {activeTab === 'webhook' && (
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-4xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Google Apps Script Web App (Single Source of Truth)</span>
              </h2>
              <p className="text-xs text-slate-500">
                ระบบใช้ Google Sheets ๕ แท็บเป็นฐานข้อมูลกลาง ไม่เก็บใน localStorage
              </p>
            </div>

            <button
              onClick={() => setShowGuideModal(true)}
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200"
            >
              <HelpCircle className="w-4 h-4" />
              <span>วิธีติดตั้ง & สิทธิ์ Anyone</span>
            </button>
          </div>

          <form onSubmit={handleSaveSheetUrl} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="url"
                placeholder="วาง Webhook URL ของ Google Apps Script (ลงท้ายด้วย /exec)"
                value={sheetWebhookUrl}
                onChange={(e) => setSheetWebhookUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={testingSheet || !sheetWebhookUrl.trim()}
                  onClick={handleTestSheetConnection}
                  className="px-4 py-2.5 rounded-2xl border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {testingSheet ? 'กำลังทดสอบ...' : '⚡ ทดสอบเชื่อมต่อ'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  บันทึก URL
                </button>
              </div>
            </div>

            {sheetWebhookUrl.trim() && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}${window.location.pathname}#/?sheet=${encodeURIComponent(sheetWebhookUrl.trim())}`;
                    navigator.clipboard.writeText(shareUrl);
                    addToast('success', 'คัดลอกลิงก์สำเร็จ 📱', 'ส่งลิงก์นี้ไปเปิดบนมือถือเพื่อเชื่อมต่อและซิงค์ข้อมูลเรียลไทม์ทันที!');
                  }}
                  className="text-xs px-3.5 py-1.5 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 font-semibold hover:bg-violet-100 flex items-center gap-1.5"
                >
                  📱 คัดลอกลิงก์แชร์สำหรับเปิดบนมือถือ (ให้มือถือซิงค์อัตโนมัติ)
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-4xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-4">
              แก้ไขข้อมูลห้อง: {editingRoom.name}
            </h3>

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อห้องประชุม
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ความจุ (คน) {editingRoom.isOther && '(ค่าว่างได้)'}
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชั้นที่ตั้ง
                  </label>
                  <input
                    type="number"
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  สถานะห้องประชุม
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                >
                  <option value="active">🟢 เปิดใช้งานปกติ</option>
                  <option value="maintenance">🔴 ปิดปรับปรุง</option>
                  <option value="inactive">⚪ ปิดถาวร</option>
                </select>
              </div>

              {status === 'maintenance' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
                  <span className="font-bold text-xs text-rose-800 dark:text-rose-200">
                    กำหนดช่วงวันที่ปิดปรับปรุง (ระบบจะบล็อกไม่ให้จองช่วงนี้):
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">เริ่มวันที่:</label>
                      <input
                        type="date"
                        value={maintenanceStart}
                        onChange={(e) => setMaintenanceStart(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-rose-300 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">ถึงวันที่:</label>
                      <input
                        type="date"
                        value={maintenanceEnd}
                        onChange={(e) => setMaintenanceEnd(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-rose-300 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20"
                >
                  บันทึกข้อมูลห้อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
