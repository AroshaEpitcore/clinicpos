import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-teal shadow-md">
        <svg viewBox="0 0 20 20" fill="none" width={20} height={20}>
          <path d="M10 2v16M2 10h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-base font-bold tracking-tight text-ink">
        Health<em className="not-italic text-primary">Center</em>.lk
      </span>
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  const location = useLocation();
  const isGuide  = location.pathname === '/guide';

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setOpen(false); }, [location]);

  const links = [
    { label: 'Features',     href: '/#features'    },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Pricing',      href: '/#pricing'      },
    { label: 'User Guide',   href: '/guide'         },
    { label: 'Contact',      href: '/#contact'      },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-sticky transition-all duration-300 backdrop-blur-xl ${scrolled ? 'bg-surface/95 shadow-soft-sm border-b border-primary/10' : 'bg-surface/80'}`}>
      <div className="flex items-center justify-between h-[68px] max-w-6xl mx-auto px-4 sm:px-6">
        <Logo />

        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <Link key={l.label} to={l.href}
              className={`text-sm font-medium transition-colors duration-150 hover:text-primary ${isGuide && l.href === '/guide' ? 'text-primary' : 'text-ink-light'}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <Link to="/#contact"
          className="hidden md:inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-primary to-primary-dark shadow-soft-md hover:-translate-y-0.5 transition-transform duration-150">
          Get Started →
        </Link>

        <button className="md:hidden p-1 bg-transparent border-none cursor-pointer" onClick={() => setOpen(v => !v)} aria-label="Menu">
          {open ? <X size={22} className="text-ink-light" /> : <Menu size={22} className="text-ink-light" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed top-[68px] left-0 right-0 bottom-0 bg-surface/99 backdrop-blur-xl flex flex-col px-6 py-4 z-sticky">
          {links.map(l => (
            <Link key={l.label} to={l.href}
              className="py-4 text-lg font-semibold text-ink-light border-b border-primary/8">
              {l.label}
            </Link>
          ))}
          <Link to="/#contact"
            className="mt-6 text-center py-3.5 rounded-xl font-bold text-white bg-gradient-to-br from-primary to-primary-dark">
            Get Started →
          </Link>
        </div>
      )}
    </nav>
  );
}
