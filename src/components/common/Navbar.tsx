import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sparkles,
  LayoutDashboard,
  Calendar,
  PlusCircle,
  FileText,
  Search,
  Settings,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useBookingContext } from '../../context/BookingContext';
import { RoleLoginModal } from './RoleLoginModal';
import { GoogleSheetModal } from './GoogleSheetModal';
import { getWebhookUrl } from '../../services/sheetsService';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const {
    currentRole,
    currentRoleTitle,
    currentActorName,
    logoutRole,
    pendingApprovalCount,
  } = useBookingContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);

  const isSheetConfigured = !!getWebhookUrl() && getWebhookUrl().trim().startsWith('http');

  const navLinks = [
    { to: '/', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { to: '/calendar', label: 'ปฏิทิน', icon: Calendar },
    { to: '/book', label: 'ยื่นคำขอจองห้อง ✨', icon: PlusCircle, highlight: true },
    { to: '/manage', label: 'ติดตามคำขอ', icon: Search },
    {
      to: '/approve',
      label: 'สายอนุมัติ 4 ขั้น',
      icon: ShieldCheck,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined,
    },
    { to: '/reports', label: 'รายงานราชการ', icon: FileText },
    { to: '/rooms', label: 'จัดการห้อง/ระบบ', icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-[#0B0F19]/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-pink-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-base sm:text-lg bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-500 bg-clip-text text-transparent leading-tight">
                  TTC Smart Room
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                  วท.ท่าหลวงซิเมนต์ไทยอนุสรณ์
                </span>
              </div>
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `relative px-3 py-1.5 rounded-2xl font-display text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        link.highlight
                          ? 'bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-500 text-white shadow-md shadow-pink-500/20 hover:opacity-95 hover:scale-[1.02]'
                          : isActive
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                    {link.badge !== undefined && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-pink-500 text-white animate-pulse">
                        {link.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Right Action Icons: Role Switcher + Theme Toggle + Mobile Menu */}
            <div className="flex items-center gap-2">
              {/* Role Indicator / Login Button */}
              {currentRole === 'requester' ? (
                <button
                  onClick={() => setRoleModalOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-bold hover:bg-violet-100 transition-all"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบเจ้าหน้าที่ (PIN)</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden md:inline max-w-[140px] truncate">{currentActorName}</span>
                  <button
                    onClick={logoutRole}
                    title="ออกจากสิทธิ์นี้"
                    className="p-1 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition-all"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Google Sheet Connection Button */}
              <button
                onClick={() => setSheetModalOpen(true)}
                title="ตั้งค่าเชื่อมต่อ Google Sheet"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Google Sheet</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSheetConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                aria-label="สลับธีม"
                className="p-2 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in">
            {currentRole === 'requester' ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setRoleModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold text-xs border border-violet-200 dark:border-violet-800 mb-3"
              >
                <UserCheck className="w-4 h-4" />
                เข้าสู่ระบบเจ้าหน้าที่/ผู้ลงนาม (PIN)
              </button>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs mb-3">
                <div>
                  <div className="font-bold text-emerald-800 dark:text-emerald-200">
                    {currentActorName}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {currentRoleTitle}
                  </div>
                </div>
                <button
                  onClick={logoutRole}
                  className="px-2.5 py-1 rounded-xl bg-emerald-200/60 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold"
                >
                  ออก
                </button>
              </div>
            )}

            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2.5 rounded-2xl font-display text-sm font-semibold flex items-center justify-between transition-all ${
                      link.highlight
                        ? 'bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-500 text-white shadow-md'
                        : isActive
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-pink-500 text-white">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      {/* Role PIN Login Modal */}
      <RoleLoginModal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} />

      {/* Google Sheet Connection Modal */}
      <GoogleSheetModal isOpen={sheetModalOpen} onClose={() => setSheetModalOpen(false)} />
    </>
  );
};
