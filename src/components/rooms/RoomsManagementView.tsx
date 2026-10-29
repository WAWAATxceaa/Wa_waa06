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
  PenTool,
  CheckCircle2,
  Power,
  PowerOff,
  FileSpreadsheet,
  Check,
  ExternalLink,
  Copy,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';
import { ADMIN_PIN, AMENITIES_LIST } from '../../config/constants';
import { updateRoom } from '../../services/firestoreService';
import { getWebhookUrl, setWebhookUrl, testSheetConnection, SECRET_TOKEN } from '../../services/sheetsService';
import { Room } from '../../types';

export const RoomsManagementView: React.FC = () => {
  const { rooms, addToast } = useBookingContext();

  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Edit Room Modal state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [floor, setFloor] = useState(1);
  const [status, setStatus] = useState<Room['status']>('active');
  const [amenities, setAmenities] = useState<Room['amenities']>([]);
  const [saving, setSaving] = useState(false);

  // Google Sheets Webhook State
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState('');
  const [testingSheet, setTestingSheet] = useState(false);
  const [sheetTestResult, setSheetTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    setSheetWebhookUrl(getWebhookUrl());
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      addToast('success', 'เข้าสู่ระบบสำเร็จ 🔓', 'ปลดล็อคหน้าจัดการห้องประชุมเรียบร้อย');
    } else {
      setPinError(true);
      addToast('error', 'รหัส PIN ไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง (ค่าเริ่มต้นคือ 8888)');
    }
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setCapacity(room.capacity);
    setFloor(room.floor);
    setStatus(room.status);
    setAmenities(room.amenities || []);
  };

  const handleToggleAmenity = (amenityId: any) => {
    setAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((a) => a !== amenityId) : [...prev, amenityId]
    );
  };

  const handleToggleStatus = async (room: Room) => {
    const newStatus = room.status === 'active' ? 'maintenance' : 'active';
    await updateRoom(room.id, { status: newStatus });
    addToast('info', 'เปลี่ยนสถานะห้องแล้ว', `ห้อง ${room.name} ปรับเป็น ${newStatus === 'active' ? 'เปิดใช้งาน' : 'ปิดปรับปรุง'}`);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setSaving(true);
    await updateRoom(editingRoom.id, {
      name,
      capacity: Number(capacity),
      floor: Number(floor),
      status,
      amenities,
    });
    setSaving(false);
    setEditingRoom(null);
    addToast('success', 'บันทึกสำเร็จ ✨', `อัปเดตข้อมูลห้อง "${name}" เรียบร้อยแล้ว`);
  };

  const handleSaveSheetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookUrl(sheetWebhookUrl);
    addToast('success', 'บันทึก URL สำเร็จ 📑', 'ระบบจะส่งข้อมูลการจองไปยัง Google Sheets นี้โดยอัตโนมัติ');
  };

  const handleTestSheetConnection = async () => {
    if (!sheetWebhookUrl.trim()) {
      addToast('warning', 'ยังไม่ได้ระบุ URL', 'กรุณากรอก Webhook URL ของ Apps Script');
      return;
    }
    setTestingSheet(true);
    setSheetTestResult(null);
    const res = await testSheetConnection(sheetWebhookUrl);
    setTestingSheet(false);
    setSheetTestResult(res);

    if (res.success) {
      setWebhookUrl(sheetWebhookUrl);
      addToast('success', 'เชื่อมต่อสำเร็จ! 🚀', res.message);
    } else {
      addToast('error', 'เชื่อมต่อไม่สำเร็จ', res.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-4 shadow-md">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white">
          เข้าสู่ระบบผู้ดูแล (Admin PIN) 🔒
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          หน้านี้สำหรับเจ้าหน้าที่จัดการห้องประชุมและระบบ Google Sheets (รหัสเริ่มต้น: 8888)
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
            ปลดล็อค 🚀
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            โหมดผู้ดูแลระบบ (Admin Mode)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
            จัดการระบบและผังห้องประชุม 🏢
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            เชื่อมต่อ Google Sheets, เปิด/ปิดห้องประชุม และแก้ไขรายละเอียดห้อง
          </p>
        </div>
      </div>

      {/* Google Sheets Webhook Card */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-4xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                เชื่อมต่อบันทึกข้อมูลลง Google Sheets 📑
                {sheetWebhookUrl ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                    เปิดใช้งานแล้ว
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-semibold">
                    ยังไม่ได้เชื่อมต่อ
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ทุกครั้งที่มีการจองใหม่ แก้ไข หรือยกเลิก ข้อมูลจะถูกส่งไปที่ Google Sheet อัตโนมัติทันที
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGuideModal(true)}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start sm:self-auto bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800"
          >
            <HelpCircle className="w-4 h-4" />
            วิธีติดตั้ง & กดยืนยันสิทธิ์อนุญาตเข้าถึงไฟล์
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSaveSheetUrl} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="url"
              placeholder="วาง Webhook URL ของ Google Apps Script (ลงท้ายด้วย /exec)"
              value={sheetWebhookUrl}
              onChange={(e) => setSheetWebhookUrl(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={testingSheet || !sheetWebhookUrl.trim()}
                onClick={handleTestSheetConnection}
                className="px-4 py-2.5 rounded-2xl border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition-all disabled:opacity-50"
              >
                {testingSheet ? 'กำลังทดสอบ...' : '⚡ ทดสอบเชื่อมต่อ'}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
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
                className="text-xs px-3.5 py-1.5 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-semibold hover:bg-violet-100 flex items-center gap-1.5"
              >
                📱 คัดลอกลิงก์แชร์สำหรับเปิดบนมือถือ (ให้มือถือซิงค์อัตโนมัติ)
              </button>
            </div>
          )}

          {sheetTestResult && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                sheetTestResult.success
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              {sheetTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{sheetTestResult.message}</span>
            </div>
          )}
        </form>
      </div>

      {/* Room Cards Section */}
      <div>
        <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-4">
          ห้องประชุมทั้งหมด ({rooms.length} ห้อง)
        </h2>
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
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {isActive ? '🟢 เปิดใช้งาน' : '🔴 ปิดปรับปรุง'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 my-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>ความจุ: <strong>{room.capacity}</strong> คน</span>
                      <span>• ชั้น {room.floor}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {room.description}
                    </div>
                  </div>

                  {/* Amenities Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {room.amenities?.map((am) => (
                      <span
                        key={am}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-medium"
                      >
                        {am === 'projector' && '📽️ โปรเจกเตอร์'}
                        {am === 'tv' && '📺 ทีวี'}
                        {am === 'videoconference' && '📹 Video Conf'}
                        {am === 'whiteboard' && '🖊️ ไวท์บอร์ด'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openEditModal(room)}
                    className="flex-1 py-2.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    แก้ไขห้อง
                  </button>
                  <button
                    onClick={() => handleToggleStatus(room)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    {isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    {isActive ? 'ปิดห้อง' : 'เปิดห้อง'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guide Modal for Google Sheets */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-4xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              วิธีติดตั้ง Google Sheets Webhook (3 นาที)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              ทำตาม 3 ขั้นตอนนี้ ข้อมูลการจองจะส่งเข้า Google Sheets อัตโนมัติทันที
            </p>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <strong>1. สร้าง Google Sheet:</strong>
                <p className="mt-1 text-xs text-slate-500">
                  ไปที่ <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-600 underline">sheets.new</a> ตั้งชื่อชีตตามต้องการ
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <strong>2. เปิด Apps Script และวางโค้ด:</strong>
                <p className="mt-1 text-xs text-slate-500">
                  คลิกเมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong> ลบโค้ดเดิมทั้งหมด แล้วนำโค้ดในไฟล์ <code>google-apps-script/Code.gs</code> มาวาง
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <strong>3. Deploy เป็น Web App:</strong>
                <p className="mt-1 text-xs text-slate-500">
                  คลิกปุ่มสีน้ำเงิน <strong>การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้รายการใหม่ (New deployment)</strong> &gt; เลือกประเภทรูปฟันเฟืองเป็น <strong>เว็บแอป (Web app)</strong>
                  <br />• เรียกใช้ในฐานะ (Execute as): <strong>ฉัน (Me - บัญชีของคุณ)</strong>
                  <br />• ผู้ที่มีสิทธิ์เข้าถึง (Who has access): <strong className="text-pink-600 bg-pink-50 dark:bg-pink-950/40 px-1 py-0.5 rounded">ทุกคน (Anyone)</strong> ⚠️ <em>(จำเป็นต้องเลือก Anyone ไม่งั้นหน้าเว็บจะส่งข้อมูลเข้าไม่ได้)</em>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                <strong className="text-amber-800 dark:text-amber-300">4. กดยืนยันสิทธิ์อนุญาตเข้าถึงไฟล์ (สำคัญมาก!):</strong>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  เมื่อกด Deploy จะมีหน้าต่างขึ้นมาขอสิทธิ์ ให้ทำตามนี้:
                  <br />1. กดปุ่ม <strong>"ให้สิทธิ์" (Authorize access)</strong> แล้วเลือกบัญชี Google ของคุณ
                  <br />2. จะเจอหน้าเตือน <em>"Google ไม่ได้ยืนยันแอปนี้" (Google hasn't verified this app)</em>
                  <br />3. ให้กดคลิกลิงก์คำว่า <strong>"ขั้นสูง" (Advanced)</strong> ที่มุมซ้ายล่าง
                  <br />4. คลิก <strong>"ไปยัง ... (ไม่ปลอดภัย)" (Go to ... unsafe)</strong>
                  <br />5. เลื่อนลงล่างสุดแล้วกด <strong>"อนุญาต" (Allow)</strong>
                  <br />6. คัดลอก URL เว็บแอป (ที่ลงท้ายด้วย <code>/exec</code>) มาวางในช่องด้านบนได้เลย!
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="py-2.5 px-6 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs"
              >
                เข้าใจแล้ว ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                    ความจุ (คน)
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    required
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
                  สถานะ
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                >
                  <option value="active">เปิดใช้งาน (Active)</option>
                  <option value="maintenance">ปิดปรับปรุง (Maintenance)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  อุปกรณ์ประจำห้อง
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITIES_LIST.map((am) => (
                    <label
                      key={am.id}
                      className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={amenities.includes(am.id as any)}
                        onChange={() => handleToggleAmenity(am.id)}
                        className="rounded text-violet-600"
                      />
                      <span>{am.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-400 text-white font-bold"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
