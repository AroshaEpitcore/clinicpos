import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="w-full bg-[var(--color-danger)] text-white text-sm px-4 py-2 flex items-center gap-2 z-50">
      <WifiOff className="w-4 h-4 shrink-0" />
      No internet connection — changes may not be saved. Please reconnect before submitting any data.
    </div>
  );
}
