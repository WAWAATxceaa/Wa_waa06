import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Link,
  HelpCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { getWebhookUrl, setWebhookUrl, testSheetConnection } from '../../services/sheetsService';
import { showSuccessAlert, showErrorAlert } from '../../utils/alertUtils';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({ isOpen, onClose }) => {
  const [webhookUrl, setWebhookUrlState] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWebhookUrlState(getWebhookUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = !!webhookUrl && webhookUrl.trim().startsWith('http');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = webhookUrl.trim();
    setWebhookUrl(trimmed);
    showSuccessAlert('บันทึกสำเร็จ ✨', 'บันทึก Webhook URL ของ Google Sheet เรียบร้อยแล้ว');
  };

  const handleTest = async () => {
    const trimmed = webhookUrl.trim();
    if (!trimmed) {
      showErrorAlert('โปรดระบุ URL', 'กรุณากรอก Webhook URL ของ Google Apps Script ก่อนทดสอบ');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSheetConnection(trimmed);
      setTestResult(res);
      if (res.success) {
        setWebhookUrl(trimmed);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'เชื่อมต่อล้มเหลว: ' + (err.message || 'โปรดตรวจสอบการเชื่อมต่อ'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyShareLink = () => {
    const trimmed = webhookUrl.trim();
    if (!trimmed) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?sheet=${encodeURIComponent(trimmed)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-violet-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                เชื่อมต่อ Google Sheet
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isConnected
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {isConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ระบุ URL'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ส่งข้อมูลการจองห้องประชุมเข้า Google Sheet อัตโนมัติ (เว็บ → ชีต)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status Box */}
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
              isConnected
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold">
                {isConnected
                  ? 'ระบบพร้อมส่งข้อมูลเข้า Google Sheet ทันที!'
                  : 'ยังไม่ได้ระบุ Webhook URL ของ Google Apps Script'}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                {isConnected
                  ? 'ทุกครั้งที่มีการจองใหม่, แก้ไข, ยกเลิก หรือเปลี่ยนสถานะ ระบบจะส่งสำเนาไปอัปเดตในแท็บ "การจอง" อัตโนมัติ'
                  : 'กรุณาวาง Webhook URL ที่ได้จากการ Deploy Google Apps Script ในช่องด้านล่าง'}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Google Apps Script Web App URL (ลงท้ายด้วย <code className="text-violet-600 dark:text-violet-400">/exec</code>)
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrlState(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !webhookUrl.trim()}
                className="flex-1 min-w-[140px] px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>กำลังทดสอบ...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-emerald-500" />
                    <span>ทดสอบการเชื่อมต่อ</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={!webhookUrl.trim()}
                className="flex-1 min-w-[140px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>บันทึก URL</span>
              </button>
            </div>
          </form>

          {/* Shareable Link Button */}
          {isConnected && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Link className="w-4 h-4 text-violet-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 truncate">
                  ลิงก์สำหรับแชร์ให้เครื่องอื่นเชื่อมต่อได้ทันที
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="px-3 py-1.5 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 font-bold text-xs flex items-center gap-1.5 hover:bg-violet-200 shrink-0 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
              </button>
            </div>
          )}

          {/* Instructions Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 text-left font-display font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>วิธีติดตั้ง Google Apps Script (3 ขั้นตอนง่ายๆ)</span>
              </div>
              <span className="text-slate-400 text-xs">{showGuide ? '▲ ซ่อน' : '▼ ดูวิธี'}</span>
            </button>

            {showGuide && (
              <div className="p-4 bg-white dark:bg-slate-900 text-xs space-y-3 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">1</span>
                  <p>เปิด Google Sheets ของคุณ &gt; เมนู <b>ส่วนขยาย (Extensions)</b> &gt; <b>Apps Script</b></p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">2</span>
                  <p>วางโค้ดจากไฟล์ <code>google-apps-script/Code.gs</code> แล้วกดปุ่มบันทึก</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p>กด <b>การทำให้ใช้งานได้ (Deploy)</b> &gt; <b>การทำให้ใช้งานได้รายการใหม่ (New deployment)</b></p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-500 dark:text-slate-400">
                      <li>ประเภท: <b>เว็บแอป (Web app)</b></li>
                      <li>เรียกใช้ในฐานะ: <b>ฉัน (Me)</b></li>
                      <li>ผู้มีสิทธิ์เข้าถึง: <b>ทุกคน (Anyone)</b> <i>(สำคัญมาก)</i></li>
                    </ul>
                    <p className="mt-1">คัดลอก Web App URL (ลงท้ายด้วย <code>/exec</code>) มาวางในช่องด้านบนนี้</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
          <span>ข้อมูลเก็บในแท็บ <b>"การจอง"</b> ของ Google Sheet</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white font-semibold transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
