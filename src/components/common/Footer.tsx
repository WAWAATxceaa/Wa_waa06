import React from 'react';
import { Sparkles, Heart } from 'lucide-react';
import { SYSTEM_INFO } from '../../config/constants';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-[#0B0F19]/50 backdrop-blur-md py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-violet-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-display font-bold text-xs text-slate-800 dark:text-slate-200">
                {SYSTEM_INFO.appName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {SYSTEM_INFO.departmentName} • {SYSTEM_INFO.orgName}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>มาตรฐานระบบราชการไทย ๔.๐</span>
            <span className="text-pink-500 font-bold">•</span>
            <span>ปีงบประมาณ พ.ศ. {new Date().getFullYear() + 543}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
