import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Logo = () => (
  <Link to="/" className="flex items-center gap-2.5 no-underline">
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 20px rgba(99,102,241,0.4)',
      flexShrink: 0,
    }}>
      <svg viewBox="0 0 20 20" fill="none" width={20} height={20}>
        <path d="M10 2v16M2 10h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
    <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)' }}>
      Health<em style={{ fontStyle: 'normal', color: '#a5b4fc' }}>Center</em>.lk
    </span>
  </Link>
);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isGuide = location.pathname === '/guide';

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setOpen(false); }, [location]);

  const links = [
    { label: 'Features',     href: '/#features' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Pricing',      href: '/#pricing' },
    { label: 'User Guide',   href: '/guide' },
    { label: 'Contact',      href: '/#contact' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(6,13,31,0.96)' : 'rgba(6,13,31,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      transition: 'background 0.3s',
    }}>
      <div className="flex items-center justify-between h-[68px] max-w-[1140px] mx-auto px-6">
        <Logo />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <Link
              key={l.label}
              to={l.href}
              style={{
                fontSize: '0.875rem', fontWeight: 500,
                color: (isGuide && l.href === '/guide') ? 'var(--text)' : 'var(--text-sub)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--text)'}
              onMouseLeave={e => {
                e.target.style.color = (isGuide && l.href === '/guide') ? 'var(--text)' : 'var(--text-sub)';
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <Link
          to="/#contact"
          className="hidden md:inline-flex"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff', padding: '9px 22px', borderRadius: 9,
            fontSize: '0.875rem', fontWeight: 600,
            boxShadow: '0 4px 15px rgba(99,102,241,0.35)',
            transition: 'opacity 0.15s, transform 0.1s',
            whiteSpace: 'nowrap',
          }}
        >
          Get Started →
        </Link>

        <button
          className="md:hidden flex flex-col gap-1.5 p-1 bg-transparent border-none cursor-pointer"
          onClick={() => setOpen(v => !v)}
          aria-label="Menu"
        >
          {open
            ? <X size={22} color="var(--text-sub)" />
            : <>
                <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text-sub)', borderRadius: 2 }} />
                <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text-sub)', borderRadius: 2 }} />
                <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text-sub)', borderRadius: 2 }} />
              </>
          }
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: 'fixed', top: 68, left: 0, right: 0, bottom: 0,
          background: 'rgba(6,13,31,0.98)', backdropFilter: 'blur(20px)',
          padding: '24px', zIndex: 999, display: 'flex', flexDirection: 'column',
        }}>
          {links.map(l => (
            <Link
              key={l.label}
              to={l.href}
              style={{
                padding: '16px 0', fontSize: '1.1rem', fontWeight: 600,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--text-sub)',
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/#contact"
            style={{
              marginTop: 24,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', textAlign: 'center',
              borderRadius: 12, padding: 14, fontWeight: 700,
            }}
          >
            Get Started →
          </Link>
        </div>
      )}
    </nav>
  );
}
