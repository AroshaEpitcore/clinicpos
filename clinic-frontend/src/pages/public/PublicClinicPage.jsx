import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Mail, MapPin, Clock, Facebook,
  MessageCircle, ExternalLink, Stethoscope,
  ChevronRight, ArrowRight, CheckCircle, Menu, X,
  Star, Shield, Award, Users, Heart, Activity,
  Eye, Zap, Baby, FlaskConical, Microscope,
  CalendarCheck, Sparkles, HeartPulse,
} from 'lucide-react';
import { portalApi } from '../../api/portal';
import { mediaUrl }  from '../../utils/mediaUrl';

const DEFAULT_HERO = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1920&q=80';

const HERO_STATS = [
  { n: '5,000+', label: 'Patients Served'  },
  { n: '98%',    label: 'Satisfaction Rate' },
  { n: '24/7',   label: 'Online Booking'   },
  { n: '10+',    label: 'Specialists'       },
];

const WHY_US = [
  { icon: HeartPulse,    title: 'Expert Care',       desc: 'Qualified specialists committed to your health and wellbeing.' },
  { icon: Sparkles,      title: 'Modern Facility',   desc: 'Equipped with the latest medical technology and equipment.' },
  { icon: CalendarCheck, title: 'Easy Booking',      desc: 'Book appointments online anytime, 24/7, in seconds.' },
];

// Map service name keywords to an icon + accent colour
function svcIcon(name = '') {
  const n = name.toLowerCase();
  if (/heart|cardio/.test(n))           return { Icon: Heart,        bg: 'bg-red-50',    ring: 'ring-red-100',    text: 'text-red-500'    };
  if (/eye|vision|optic/.test(n))       return { Icon: Eye,          bg: 'bg-teal-50',   ring: 'ring-teal-100',   text: 'text-teal-500'   };
  if (/lab|blood|test|micro/.test(n))   return { Icon: FlaskConical, bg: 'bg-purple-50', ring: 'ring-purple-100', text: 'text-purple-500' };
  if (/child|baby|ped/.test(n))         return { Icon: Baby,         bg: 'bg-pink-50',   ring: 'ring-pink-100',   text: 'text-pink-500'   };
  if (/neuro|brain/.test(n))            return { Icon: Activity,     bg: 'bg-indigo-50', ring: 'ring-indigo-100', text: 'text-indigo-500' };
  if (/surg|proced|laser/.test(n))      return { Icon: Zap,          bg: 'bg-amber-50',  ring: 'ring-amber-100',  text: 'text-amber-500'  };
  if (/xray|scan|radio|imag/.test(n))   return { Icon: Microscope,   bg: 'bg-cyan-50',   ring: 'ring-cyan-100',   text: 'text-cyan-500'   };
  return                                       { Icon: CheckCircle,  bg: 'bg-blue-50',   ring: 'ring-blue-100',   text: 'text-blue-500'   };
}

const KEYFRAMES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to   { opacity: 1; transform: translateX(0);     }
  }
  @keyframes fadeInRight {
    from { opacity: 0; transform: translateX(30px); }
    to   { opacity: 1; transform: translateX(0);    }
  }
  @keyframes floatY {
    0%, 100% { transform: translateY(0);    }
    50%      { transform: translateY(-10px); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.93); }
    to   { opacity: 1; transform: scale(1);    }
  }
  .reveal        { opacity: 0; }
  .reveal.in     { animation: fadeInUp   0.65s cubic-bezier(.22,1,.36,1) both; }
  .reveal-l.in   { animation: fadeInLeft  0.65s cubic-bezier(.22,1,.36,1) both; }
  .reveal-r.in   { animation: fadeInRight 0.65s cubic-bezier(.22,1,.36,1) both; }
  .reveal-s.in   { animation: scaleIn    0.55s cubic-bezier(.22,1,.36,1) both; }
`;

const anim = (delay, dur = '0.65s') => ({
  animation: `fadeInUp ${dur} cubic-bezier(.22,1,.36,1) both`,
  animationDelay: delay,
});

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal(cls = 'reveal') {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('in'); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, className: cls };
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ clinic, scrolled, mobileOpen, setMobileOpen }) {
  const links = [
    clinic.about && { label: 'About',    href: '#about'    },
    { label: 'Doctors',   href: '#doctors'  },
    { label: 'Services',  href: '#services' },
    { label: 'Contact',   href: '#contact'  },
  ].filter(Boolean);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4">

        <a href="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
          {clinic.logo_url
            ? <img src={mediaUrl(clinic.logo_url)} alt={clinic.name} className="h-9 w-auto object-contain shrink-0" />
            : <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                scrolled ? 'bg-blue-600' : 'bg-white/15 border border-white/30'
              }`}><Stethoscope className="w-5 h-5 text-white" /></div>
          }
          <span className={`font-bold text-base sm:text-lg tracking-tight truncate transition-colors duration-300 ${
            scrolled ? 'text-gray-900' : 'text-white'
          }`}>{clinic.name}</span>
        </a>

        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {links.map(link => (
            <a key={link.href} href={link.href}
              className={`relative text-sm font-medium transition-colors duration-300 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-blue-500 after:transition-all after:duration-200 hover:after:w-full ${
                scrolled ? 'text-gray-600 hover:text-blue-600' : 'text-white/80 hover:text-white'
              }`}>{link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <a href="/login" className={`text-sm font-medium transition-colors duration-300 ${
            scrolled ? 'text-gray-500 hover:text-gray-800' : 'text-white/70 hover:text-white'
          }`}>Staff Login</a>
          {clinic.portal_enabled && (
            <a href="/book" className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 ${
              scrolled ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md' : 'bg-white text-blue-700 hover:bg-blue-50 shadow-xl shadow-black/20'
            }`}>Book Now <ChevronRight className="w-3.5 h-3.5" /></a>
          )}
        </div>

        <button onClick={() => setMobileOpen(o => !o)}
          className={`md:hidden p-2 rounded-lg transition-colors touch-manipulation ${
            scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
          }`}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
        mobileOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      } bg-white/97 backdrop-blur-md border-t border-gray-100 shadow-2xl`}>
        <div className="px-4 py-3 flex flex-col gap-1">
          {links.map(link => (
            <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 text-sm font-medium text-gray-700 py-3 px-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors active:bg-blue-100">
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />{link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2 mt-1">
            {clinic.portal_enabled && (
              <a href="/book" className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors">
                Book Appointment <ArrowRight className="w-4 h-4" />
              </a>
            )}
            <a href="/login" className="flex items-center justify-center py-2.5 text-sm text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition-colors">
              Staff Login
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ eyebrow, title, subtitle, center = false, light = false }) {
  return (
    <div className={`mb-10 sm:mb-14 ${center ? 'text-center' : ''}`}>
      {eyebrow && (
        <span className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] mb-3 ${light ? 'text-blue-300' : 'text-blue-600'}`}>
          {!center && <span className={`w-5 h-[2px] rounded-full ${light ? 'bg-blue-400' : 'bg-blue-500'}`} />}
          {eyebrow}
        </span>
      )}
      <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight ${light ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h2>
      {subtitle && <p className={`mt-3 text-sm sm:text-base leading-relaxed max-w-2xl ${center ? 'mx-auto' : ''} ${light ? 'text-blue-200' : 'text-gray-500'}`}>{subtitle}</p>}
      <div className={`mt-4 h-1 rounded-full bg-blue-600 ${center ? 'w-12 mx-auto' : 'w-12'}`} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PublicClinicPage() {
  const navigate = useNavigate();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready,      setReady]      = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('clinic_token');
    if (token) { navigate('/dashboard', { replace: true }); return; }
    portalApi.getWebsite()
      .then(r => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { if (data) setTimeout(() => setReady(true), 80); }, [data]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-9 h-9 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 text-center px-4">
      <Stethoscope className="w-12 h-12 text-gray-300" />
      <p className="text-gray-500">Unable to load clinic information.</p>
      <a href="/login" className="text-sm text-blue-600 hover:underline">Staff Login →</a>
    </div>
  );

  const { clinic, doctors, services } = data;

  if (!clinic.website_enabled) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3 text-center px-4">
      <h1 className="text-xl font-bold text-gray-800">{clinic.name}</h1>
      <p className="text-gray-400 text-sm">This clinic's website is currently unavailable.</p>
      <a href="/login" className="text-sm text-blue-600 hover:underline mt-1">Staff Login →</a>
    </div>
  );

  const whatsappUrl = clinic.whatsapp ? `https://wa.me/${clinic.whatsapp.replace(/\D/g, '')}` : null;
  const heroBg      = clinic.hero_url || DEFAULT_HERO;

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <style>{KEYFRAMES}</style>

      <Navbar clinic={clinic} scrolled={scrolled} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Clinic hero" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-900/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/25" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-700/25 blur-3xl"
            style={{ animation: 'floatY 8s ease-in-out infinite' }} />
          <div className="absolute top-1/3 right-10 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl"
            style={{ animation: 'floatY 6s ease-in-out infinite', animationDelay: '3s' }} />
        </div>

        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-20 sm:pt-24 pb-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">

              <div className="flex flex-col gap-5 sm:gap-6">
                <div style={ready ? anim('0s') : { opacity: 0 }}
                  className="inline-flex items-center gap-2.5 self-start px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                  </span>
                  <span className="text-xs font-semibold text-white/90 tracking-wide">Now Accepting Patients</span>
                </div>

                <div style={ready ? anim('0.12s') : { opacity: 0 }}>
                  <h1 className="text-3xl sm:text-5xl xl:text-[3.5rem] font-black text-white leading-[1.06] tracking-tight">{clinic.name}</h1>
                  {clinic.tagline && (
                    <p className="mt-3 text-base sm:text-lg text-gray-300/90 leading-relaxed max-w-xl">{clinic.tagline}</p>
                  )}
                </div>

                <div style={ready ? anim('0.24s') : { opacity: 0 }} className="flex flex-wrap gap-2">
                  {clinic.address && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs text-gray-300">
                      <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-sm">{clinic.address}</span>
                    </span>
                  )}
                  {clinic.hours && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs text-gray-300">
                      <Clock className="w-3 h-3 text-teal-400 shrink-0" /> Open Today
                    </span>
                  )}
                  {doctors.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs text-gray-300">
                      <Users className="w-3 h-3 text-purple-400 shrink-0" />
                      {doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'} Available
                    </span>
                  )}
                </div>

                <div style={ready ? anim('0.36s') : { opacity: 0 }} className="flex flex-wrap gap-3">
                  {clinic.portal_enabled && (
                    <a href="/book"
                      className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-2xl shadow-blue-900/50 hover:shadow-blue-700/50 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
                      Book Appointment <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                  {clinic.phone && (
                    <a href={`tel:${clinic.phone}`}
                      className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-white/10 hover:bg-white/18 text-white font-semibold rounded-xl text-sm border border-white/25 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
                      <Phone className="w-4 h-4" /> {clinic.phone}
                    </a>
                  )}
                </div>

                <div style={ready ? anim('0.48s') : { opacity: 0 }} className="flex flex-wrap items-center gap-5 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400"><Shield className="w-3.5 h-3.5 text-green-400 shrink-0" /> Verified Clinic</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" /> Top Rated</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400"><Award className="w-3.5 h-3.5 text-blue-400 shrink-0" /> MOH Registered</div>
                </div>
              </div>

              {/* Right card — desktop */}
              <div className={`hidden lg:block transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative">
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400/50" />
                    <span className="relative w-3 h-3 rounded-full bg-teal-400 border-2 border-slate-900" />
                  </span>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-[270px] xl:w-[290px] shadow-2xl shadow-black/40"
                    style={{ animation: 'floatY 5s ease-in-out infinite', animationDelay: '0.8s' }}>
                    {clinic.logo_url && (
                      <div className="flex justify-center pb-4 mb-4 border-b border-white/15">
                        <img src={mediaUrl(clinic.logo_url)} alt={clinic.name} className="h-12 w-auto object-contain" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {clinic.phone && (
                        <a href={`tel:${clinic.phone}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4 text-blue-300" />
                          </div>
                          <div><p className="text-[0.6rem] text-gray-400 uppercase tracking-widest">Call Us</p>
                            <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{clinic.phone}</p></div>
                        </a>
                      )}
                      {clinic.email && (
                        <a href={`mailto:${clinic.email}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4 text-blue-300" />
                          </div>
                          <div className="min-w-0"><p className="text-[0.6rem] text-gray-400 uppercase tracking-widest">Email</p>
                            <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors truncate max-w-[165px]">{clinic.email}</p></div>
                        </a>
                      )}
                      {clinic.hours && (
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="w-4 h-4 text-teal-300" />
                          </div>
                          <div><p className="text-[0.6rem] text-gray-400 uppercase tracking-widest">Hours</p>
                            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line mt-0.5">{clinic.hours}</p></div>
                        </div>
                      )}
                    </div>
                    {doctors.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/15 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'}</span>
                        <div className="flex -space-x-2">
                          {doctors.slice(0, 4).map((doc, i) => (
                            <div key={doc.id}
                              className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-white/20 flex items-center justify-center text-xs font-bold text-white"
                              style={{ zIndex: 10 - i }}>{doc.full_name.charAt(0)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-5">
            <div className="flex items-center overflow-x-auto scrollbar-none gap-0">
              {HERO_STATS.map((s, i) => (
                <div key={i} className={`flex-1 min-w-[80px] flex flex-col items-center px-4 py-1 ${i < HERO_STATS.length - 1 ? 'border-r border-white/15' : ''}`}
                  style={ready ? anim(`${0.6 + i * 0.1}s`, '0.5s') : { opacity: 0 }}>
                  <span className="text-lg sm:text-2xl font-black text-white leading-none">{s.n}</span>
                  <span className="text-[0.58rem] sm:text-[0.65rem] text-gray-400 uppercase tracking-wide mt-0.5 whitespace-nowrap">{s.label}</span>
                </div>
              ))}
              <div className="hidden sm:flex flex-col items-center gap-1 ml-6 shrink-0 opacity-50">
                <div className="w-5 h-8 rounded-full border-2 border-white/40 flex items-start justify-center p-1">
                  <div className="w-1 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDuration: '1.2s' }} />
                </div>
                <span className="text-[0.55rem] text-gray-500 uppercase tracking-wider">Scroll</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────────────────────── */}
      {clinic.about && (
        <section id="about" className="py-16 sm:py-24 bg-white overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">

            {/* Top: heading + text */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start mb-14 sm:mb-16">
              <RevealBlock cls="reveal-l">
                <SectionHeading eyebrow="Who We Are" title={`About ${clinic.name}`} />
              </RevealBlock>
              <RevealBlock cls="reveal-r" delay={100}>
                <p className="text-gray-500 leading-[1.95] text-base whitespace-pre-line mt-2">{clinic.about}</p>
                {clinic.portal_enabled && (
                  <a href="/book" className="inline-flex items-center gap-2 mt-6 text-sm font-bold text-blue-600 hover:text-blue-700 group">
                    Book an Appointment
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                )}
              </RevealBlock>
            </div>

            {/* Why Us cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {WHY_US.map((w, i) => (
                <RevealBlock key={i} cls="reveal-s" delay={i * 120}>
                  <div className="group relative bg-gray-50 hover:bg-blue-600 border border-gray-100 hover:border-blue-600 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/20 hover:-translate-y-1 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-white/20 flex items-center justify-center mb-4 transition-colors duration-300">
                        <w.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h3 className="font-bold text-gray-900 group-hover:text-white text-base mb-1.5 transition-colors duration-300">{w.title}</h3>
                      <p className="text-sm text-gray-500 group-hover:text-blue-100 leading-relaxed transition-colors duration-300">{w.desc}</p>
                    </div>
                  </div>
                </RevealBlock>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* ── DOCTORS ────────────────────────────────────────────────────────── */}
      {doctors.length > 0 && (
        <section id="doctors" className="py-16 sm:py-24 bg-slate-900 overflow-hidden relative">
          {/* Background texture */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-8">
            <RevealBlock>
              <SectionHeading
                eyebrow="Medical Team"
                title="Meet Our Doctors"
                subtitle="Our experienced specialists are dedicated to providing you with the highest quality care."
                center light
              />
            </RevealBlock>

            <div className={`grid gap-5 sm:gap-6 ${
              doctors.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
              doctors.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {doctors.map((doc, i) => (
                <RevealBlock key={doc.id} cls="reveal-s" delay={i * 100}>
                  <div className="group relative bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/30 hover:-translate-y-1.5 transition-all duration-300">

                    {/* Photo */}
                    <div className="relative h-56 sm:h-60 bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
                      {doc.avatar_url
                        ? <img src={mediaUrl(doc.avatar_url)} alt={doc.full_name} className="h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                        : <div className="flex items-center justify-center h-full">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-5xl font-black shadow-2xl">
                              {doc.full_name.charAt(0)}
                            </div>
                          </div>
                      }
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-transparent to-transparent opacity-80" />
                      {/* Available badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-green-500/90 backdrop-blur-sm rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[0.6rem] font-bold text-white uppercase tracking-wide">Available</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-5 pt-3 pb-5">
                      <p className="font-bold text-white text-lg leading-tight">{doc.full_name}</p>
                      {doc.specialization && (
                        <span className="inline-block mt-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                          {doc.specialization}
                        </span>
                      )}
                      {clinic.portal_enabled && (
                        <a href="/book"
                          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-semibold group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-300">
                          Book Appointment <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </RevealBlock>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES ───────────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="services" className="py-16 sm:py-24 bg-white overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <RevealBlock>
              <SectionHeading
                eyebrow="What We Offer"
                title="Our Services"
                subtitle="We provide a comprehensive range of medical services to support your health journey."
                center
              />
            </RevealBlock>

            {(() => {
              const grouped = services.reduce((acc, s) => {
                const cat = s.category || 'General';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(s);
                return acc;
              }, {});

              return Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-12 last:mb-0">
                  {Object.keys(grouped).length > 1 && (
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400 whitespace-nowrap">{cat}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((svc, i) => {
                      const { Icon, bg, ring, text } = svcIcon(svc.name);
                      return (
                        <RevealBlock key={i} cls="reveal-s" delay={i * 80}>
                          <div className="group flex gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:border-transparent hover:-translate-y-0.5 transition-all duration-300">
                            <div className={`w-11 h-11 rounded-xl ${bg} ring-1 ${ring} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                              <Icon className={`w-5 h-5 ${text}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-800 text-sm leading-tight">{svc.name}</p>
                              {svc.description && (
                                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">{svc.description}</p>
                              )}
                              {svc.price > 0 && (
                                <span className="inline-block mt-2 text-xs font-bold text-white bg-blue-600 px-2.5 py-0.5 rounded-full">
                                  LKR {Number(svc.price).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </RevealBlock>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {/* ── CONTACT ────────────────────────────────────────────────────────── */}
      {(clinic.hours || clinic.address || clinic.phone || clinic.email || clinic.map_url) && (
        <section id="contact" className="py-16 sm:py-24 bg-gray-50 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <RevealBlock>
              <SectionHeading
                eyebrow="Find Us"
                title="Contact & Hours"
                subtitle="Get in touch or visit us — we're here to help."
              />
            </RevealBlock>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

              {/* Contact cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  clinic.phone    && { href:`tel:${clinic.phone}`,            Icon:Phone,         label:clinic.phone,          sub:'Call Us',         color:'blue'  },
                  clinic.email    && { href:`mailto:${clinic.email}`,         Icon:Mail,          label:clinic.email,          sub:'Send Email',      color:'blue'  },
                  clinic.address  && { href:clinic.map_url||null,             Icon:MapPin,        label:clinic.address,        sub:'Our Address',     color:'teal'  },
                  whatsappUrl     && { href:whatsappUrl, target:'_blank',     Icon:MessageCircle, label:'WhatsApp Chat',        sub:'Message Us',      color:'green' },
                  clinic.facebook && { href:clinic.facebook, target:'_blank', Icon:Facebook,      label:'Facebook Page',        sub:'Follow Us',       color:'indigo'},
                  clinic.map_url  && { href:clinic.map_url,  target:'_blank', Icon:ExternalLink,  label:'Open in Google Maps',  sub:'Get Directions',  color:'orange'},
                ].filter(Boolean).map((item, i) => {
                  const colorMap = {
                    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'hover:border-blue-200'   },
                    teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   border: 'hover:border-teal-200'   },
                    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'hover:border-green-200'  },
                    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'hover:border-indigo-200' },
                    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'hover:border-orange-200' },
                  };
                  const c = colorMap[item.color] || colorMap.blue;
                  const inner = (
                    <RevealBlock key={i} cls="reveal-s" delay={i * 70}>
                      <div className={`flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 ${c.border} hover:shadow-md transition-all duration-200 h-full ${item.href ? 'cursor-pointer group' : ''}`}>
                        <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center shrink-0`}>
                          <item.Icon className={`w-5 h-5 ${c.icon}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.62rem] text-gray-400 uppercase tracking-wider font-medium">{item.sub}</p>
                          <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate mt-0.5">{item.label}</p>
                        </div>
                        {item.href && <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />}
                      </div>
                    </RevealBlock>
                  );
                  return item.href
                    ? <a key={i} href={item.href} target={item.target} rel={item.target ? 'noopener noreferrer' : undefined}>{inner}</a>
                    : <div key={i}>{inner}</div>;
                })}
              </div>

              {/* Hours card */}
              <RevealBlock cls="reveal-r">
                <div className="bg-slate-900 rounded-2xl overflow-hidden h-full flex flex-col shadow-xl">
                  <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-700">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-200" />
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Working Hours</p>
                    </div>
                    <h3 className="text-xl font-bold text-white">Our Schedule</h3>
                  </div>
                  <div className="p-6 flex-1">
                    {clinic.hours
                      ? <p className="text-sm text-slate-300 leading-[2.3] whitespace-pre-line">{clinic.hours}</p>
                      : <div className="space-y-3 text-sm text-slate-400">
                          <div className="flex justify-between"><span>Mon – Fri</span><span className="text-white font-medium">8:00 AM – 6:00 PM</span></div>
                          <div className="flex justify-between"><span>Saturday</span><span className="text-white font-medium">9:00 AM – 4:00 PM</span></div>
                          <div className="flex justify-between"><span>Sunday</span><span className="text-slate-500">Closed</span></div>
                        </div>
                    }
                  </div>
                  {clinic.portal_enabled && (
                    <div className="px-6 pb-6">
                      <a href="/book"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors">
                        Book Appointment <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </RevealBlock>

            </div>
          </div>
        </section>
      )}

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
      {clinic.portal_enabled && (
        <section className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <RevealBlock cls="reveal-l">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-200 mb-4">
                    <span className="w-4 h-[2px] rounded-full bg-blue-300" /> Online Booking
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                    Ready to book <br className="hidden sm:block" />your appointment?
                  </h2>
                  <p className="mt-3 text-blue-200 text-sm sm:text-base leading-relaxed">
                    Book in minutes. Available 24/7 — no phone call needed.
                  </p>
                </div>
              </RevealBlock>

              <RevealBlock cls="reveal-r" delay={150}>
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center gap-4">
                  <a href="/book"
                    className="inline-flex items-center gap-2.5 px-7 sm:px-9 py-3.5 sm:py-4 bg-white text-blue-700 font-black rounded-2xl text-sm sm:text-base shadow-2xl shadow-blue-900/40 hover:bg-blue-50 hover:-translate-y-0.5 transition-all whitespace-nowrap">
                    Book Appointment Now <ArrowRight className="w-5 h-5" />
                  </a>
                  {clinic.phone && (
                    <a href={`tel:${clinic.phone}`}
                      className="inline-flex items-center gap-2 px-6 py-3.5 border-2 border-white/30 text-white font-semibold rounded-2xl text-sm hover:bg-white/10 transition-all whitespace-nowrap">
                      <Phone className="w-4 h-4" /> Call Us
                    </a>
                  )}
                </div>
              </RevealBlock>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">

          {/* Top */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 py-12 sm:py-16 border-b border-slate-800">

            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-3">
                {clinic.logo_url
                  ? <img src={mediaUrl(clinic.logo_url)} alt={clinic.name} className="h-9 w-auto object-contain brightness-0 invert opacity-70" />
                  : <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5 text-blue-400" />
                    </div>
                }
                <span className="font-bold text-slate-200 text-base">{clinic.name}</span>
              </div>
              {clinic.tagline && <p className="text-sm text-slate-500 leading-relaxed">{clinic.tagline}</p>}
              {/* Socials */}
              {(whatsappUrl || clinic.facebook) && (
                <div className="flex items-center gap-2 pt-1">
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-green-600 flex items-center justify-center transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  {clinic.facebook && (
                    <a href={clinic.facebook} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors">
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Quick Links</p>
              <ul className="space-y-2.5 text-sm">
                {clinic.portal_enabled && <li><a href="/book"      className="hover:text-white hover:translate-x-1 inline-block transition-all">Book Appointment</a></li>}
                {clinic.about          && <li><a href="#about"     className="hover:text-white hover:translate-x-1 inline-block transition-all">About Us</a></li>}
                <li><a href="#doctors"  className="hover:text-white hover:translate-x-1 inline-block transition-all">Our Doctors</a></li>
                <li><a href="#services" className="hover:text-white hover:translate-x-1 inline-block transition-all">Services</a></li>
                <li><a href="#contact"  className="hover:text-white hover:translate-x-1 inline-block transition-all">Contact</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Contact</p>
              <ul className="space-y-3 text-sm">
                {clinic.phone && (
                  <li><a href={`tel:${clinic.phone}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />{clinic.phone}
                  </a></li>
                )}
                {clinic.email && (
                  <li><a href={`mailto:${clinic.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />{clinic.email}
                  </a></li>
                )}
                {clinic.address && (
                  <li className="flex items-start gap-2 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />{clinic.address}
                  </li>
                )}
              </ul>
            </div>

            {/* Hours */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Hours</p>
              {clinic.hours
                ? <p className="text-sm text-slate-500 leading-[2] whitespace-pre-line">{clinic.hours}</p>
                : <div className="space-y-2 text-sm text-slate-500">
                    <div className="flex justify-between gap-3"><span>Mon – Fri</span><span className="text-slate-400">8am – 6pm</span></div>
                    <div className="flex justify-between gap-3"><span>Saturday</span><span className="text-slate-400">9am – 4pm</span></div>
                    <div className="flex justify-between gap-3"><span>Sunday</span><span className="text-slate-600">Closed</span></div>
                  </div>
              }
            </div>

          </div>

          {/* Bottom */}
          <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
            <span>© {new Date().getFullYear()} {clinic.name}. All rights reserved.</span>
            <span>Powered by <a href="https://healthcenter.lk" className="text-slate-600 hover:text-white transition-colors">ClinicPOS</a></span>
          </div>

        </div>
      </footer>

    </div>
  );
}

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────
function RevealBlock({ children, cls = 'reveal', delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add('in'), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={cls}>{children}</div>;
}
