import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OfflineBanner } from '../ui/OfflineBanner';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function PageLayout({ children, title }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleToggle() {
    if (isMobile) {
      setMobileOpen(o => !o);
    } else {
      const next = !collapsed;
      setCollapsed(next);
      localStorage.setItem('sidebar-collapsed', String(next));
    }
  }

  function handleMobileClose() {
    setMobileOpen(false);
  }

  const sidebarWidth = isMobile ? 0 : (collapsed ? 64 : 240);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <OfflineBanner />

      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={handleMobileClose}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />
      <TopBar title={title} sidebarWidth={sidebarWidth} onToggle={handleToggle} />
      <main
        className="pt-[var(--topbar-height)] transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
