import React, { useState } from 'react';
import { ShieldCheck, Lock, X, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBookingContext } from '../../context/BookingContext';
import { ApproverRole } from '../../types';

interface RoleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: ApproverRole;
}

export const RoleLoginModal: React.FC<RoleLoginModalProps> = ({ isOpen, onClose, defaultRole = 'staff_audiovisual' }) => {
  const { settings, loginRole, currentRole, logoutRole, addToast } = useBookingContext();
  const [selectedRole, setSelectedRole] = useState<ApproverRole>(defaultRole);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const rolesList: { role: ApproverRole; label: string; name: string; position: string; pinHint: string }[] = [
    {
      role: 'staff_audiovisual',
      label: 'ขั้น 2: ตรวจความพร้อมห้อง/โสตฯ',
      name: settings.staffAudiovisual.name,
      position: settings.staffAudiovisual.position,
      pinHint: 'PIN ค่าเริ่มต้น: 1111',
    },
    {
      role: 'chief_digital',
      label: 'ขั้น 3: รับรองคำขอ',
      name: settings.chiefDigital.name,
      position: settings.chiefDigital.position,
      pinHint: 'PIN ค่าเริ่มต้น: 2222',
    },
    {
      role: 'deputy_director',
      label: 'ขั้น 4: พิจารณาอนุมัติ',
      name: settings.deputyDirector.name,
      position: settings.deputyDirector.position,
      pinHint: 'PIN ค่าเริ่มต้น: 3333',
    },
    {
      role: 'admin',
      label: 'ผู้ดูแลระบบส่วนกลาง (Admin)',
      name: 'ผู้ดูแลระบบวิทยาลัยฯ',
      position: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
      pinHint: 'PIN ค่าเริ่มต้น: 8888',
    },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    const success = loginRole(selectedRole, pin.trim());
    if (success) {
      addToast('success', 'เข้าสู่ระบบสำเร็จ ✨', `ยินดีต้อนรับสู่ระบบการพิจารณาคำขอ`);
      setPin('');
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-4xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-500/25">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
            เข้าสู่ระบบผู้พิจารณา & ผู้ดูแล 🔒
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            เลือกตำแหน่งผู้ลงนาม:
          </label>
          <div className="grid grid-cols-1 gap-2">
            {rolesList.map((item) => {
              const isSelected = selectedRole === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(item.role);
                    setError(false);
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all flex items-start justify-between ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {item.pinHint}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Input */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              รหัส PIN ประจำตำแหน่ง:
            </label>
            <input
              type="password"
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              className={`w-full text-center tracking-widest text-2xl py-2.5 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 ${
                error ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
              }`}
              autoFocus
            />
            {error && (
              <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1 justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
                รหัส PIN ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-display font-bold text-sm shadow-md hover:opacity-95 transition-all"
          >
            ยืนยันรหัส PIN เข้าสู่ระบบ ✨
          </button>
        </form>
      </div>
    </div>
  );
};
