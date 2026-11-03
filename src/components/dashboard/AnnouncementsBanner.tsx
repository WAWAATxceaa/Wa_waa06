import React from 'react';
import { Megaphone, AlertCircle, Info, Flame, ChevronRight } from 'lucide-react';
import { Announcement } from '../../types';

interface AnnouncementsBannerProps {
  announcements: Announcement[];
}

export const AnnouncementsBanner: React.FC<AnnouncementsBannerProps> = ({ announcements }) => {
  const activeAnnouncements = announcements.filter((a) => a.isActive);

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="mb-6 space-y-2.5">
      {activeAnnouncements.map((item) => (
        <div
          key={item.id}
          className={`p-4 rounded-3xl border flex items-start gap-3 shadow-sm transition-all ${
            item.type === 'urgent'
              ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
              : item.type === 'warning'
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
              : 'bg-violet-50/90 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900 text-violet-900 dark:text-violet-200'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {item.type === 'urgent' && <Flame className="w-5 h-5 text-rose-600 animate-pulse" />}
            {item.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600" />}
            {item.type === 'info' && <Megaphone className="w-5 h-5 text-violet-600" />}
          </div>

          <div className="flex-1 text-xs sm:text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>{item.title}</span>
              {item.date && (
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/30">
                  {item.date}
                </span>
              )}
            </div>
            <p className="mt-0.5 opacity-90 text-xs">{item.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
