import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OfflineBanner } from '../ui/OfflineBanner';

export function PageLayout({ children, title }) {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebar-collapsed') === 'true'
  );

  function handleToggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  }

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <OfflineBanner />
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <TopBar title={title} sidebarWidth={sidebarWidth} onToggle={handleToggle} />
      <main
        className="pt-[var(--topbar-height)] transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
