import { useState, useEffect } from 'react';
import { X, Megaphone, AlertTriangle, Info } from 'lucide-react';
import { announcementsApi } from '../../api/announcements';

const PRIORITY_STYLES = {
  urgent: {
    wrapper: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800',
    icon:    'text-red-500',
    title:   'text-red-800 dark:text-red-300',
    body:    'text-red-700 dark:text-red-400',
    dismiss: 'text-red-400 hover:text-red-600',
    Icon:    AlertTriangle,
  },
  normal: {
    wrapper: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800',
    icon:    'text-blue-500',
    title:   'text-blue-800 dark:text-blue-300',
    body:    'text-blue-700 dark:text-blue-400',
    dismiss: 'text-blue-400 hover:text-blue-600',
    Icon:    Megaphone,
  },
  info: {
    wrapper: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
    icon:    'text-emerald-500',
    title:   'text-emerald-800 dark:text-emerald-300',
    body:    'text-emerald-700 dark:text-emerald-400',
    dismiss: 'text-emerald-400 hover:text-emerald-600',
    Icon:    Info,
  },
};

export function AnnouncementBanner() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    announcementsApi.list()
      .then(res => setItems(res.data?.data || []))
      .catch(() => {});
  }, []);

  async function dismiss(id) {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await announcementsApi.dismiss(id);
    } catch {
      // silently ignore — already removed from UI
    }
  }

  if (!items.length) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {items.map(item => {
        const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.normal;
        const { Icon } = style;
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-[var(--radius-lg)] border ${style.wrapper}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.icon}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${style.title}`}>{item.title}</p>
              <p className={`text-sm mt-0.5 ${style.body}`}>{item.message}</p>
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className={`shrink-0 mt-0.5 ${style.dismiss} transition-colors`}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
