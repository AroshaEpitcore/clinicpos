import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Mail, MapPin, Clock, Facebook,
  MessageCircle, ExternalLink, Stethoscope,
  ChevronRight, ArrowRight, CheckCircle, Menu, X,
} from 'lucide-react';
import { portalApi } from '../../api/portal';
import { mediaUrl }  from '../../utils/mediaUrl';

// Default hero — high quality free medical photo (Unsplash)
const DEFAULT_HERO = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1920&q=80';

// ── Floating → sticky navbar ──────────────────────────────────────────────────
function Navbar({ clinic, scrolled, mobileOpen, setMobileOpen }) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white shadow-md border-b border-gray-100'
        : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-4">

        {/* Brand */}
        <a href="/" className="flex items-center gap-3 shrink-0">
          {clinic.logo_url
            ? <img src={mediaUrl(clinic.logo_url)} alt={clinic.name} className="h-10 w-auto object-contain" />
            : <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scrolled ? 'bg-blue-600' : 'bg-white/20 border border-white/30'}`}>
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
          }
          <span className={`font-bold text-lg tracking-tight transition-colors duration-300 ${scrolled ? 'text-gray-900' : 'text-white'}`}>
            {clinic.name}
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {[
            clinic.about    && { label: 'About',    href: '#about'    },
            { label: 'Doctors',   href: '#doctors'  },
            { label: 'Services',  href: '#services' },
            { label: 'Contact',   href: '#contact'  },
          ].filter(Boolean).map(link => (
            <a key={link.href} href={link.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                scrolled ? 'text-gray-600 hover:text-blue-600' : 'text-white/80 hover:text-white'
              }`}>
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a href="/login" className={`text-sm font-medium transition-colors duration-300 ${
            scrolled ? 'text-gray-500 hover:text-gray-800' : 'text-white/70 hover:text-white'
          }`}>
            Staff Login
          </a>
          {clinic.portal_enabled && (
            <a href="/book" className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:-translate-y-px ${
              scrolled
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                : 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg shadow-black/15'
            }`}>
              Book Appointment <ChevronRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMobileOpen(o => !o)}
          className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg px-5 py-4 space-y-3">
          {[
            clinic.about   && { label: 'About',    href: '#about'    },
            { label: 'Doctors',  href: '#doctors'  },
            { label: 'Services', href: '#services' },
            { label: 'Contact',  href: '#contact'  },
          ].filter(Boolean).map(link => (
            <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-gray-700 py-1.5 hover:text-blue-600 transition-colors">
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {clinic.portal_enabled && (
              <a href="/book" className="block text-center py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                Book Appointment
              </a>
            )}
            <a href="/login" className="block text-center py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Staff Login
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ eyebrow, title, light = false }) {
  return (
    <div className="mb-12">
      {eyebrow && (
        <span className={`inline-block text-xs font-bold uppercase tracking-[0.15em] mb-3 ${light ? 'text-blue-300' : 'text-blue-600'}`}>
          — {eyebrow}
        </span>
      )}
      <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight ${light ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h2>
      <div className="mt-4 w-12 h-1 rounded-full bg-blue-600" />
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function PublicClinicPage() {
  const navigate = useNavigate();
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('clinic_token');
    if (token) { navigate('/dashboard', { replace: true }); return; }
    portalApi.getWebsite()
      .then(r => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

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

      <Navbar clinic={clinic} scrolled={scrolled} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* Photo background */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="Clinic" className="w-full h-full object-cover object-center" />
          {/* Gradient overlay — left heavy for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/92 via-slate-900/75 to-slate-900/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-28 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">

          {/* Left — text */}
          <div className="space-y-7">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Trusted Healthcare
            </div>

            {/* Clinic name */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight">
              {clinic.name}
            </h1>

            {/* Tagline */}
            {clinic.tagline && (
              <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-lg">
                {clinic.tagline}
              </p>
            )}

            {/* Address */}
            {clinic.address && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                {clinic.address}
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              {clinic.portal_enabled && (
                <a href="/book"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-blue-900/30 hover:shadow-blue-800/40 transition-all hover:-translate-y-0.5">
                  Book an Appointment <ArrowRight className="w-4 h-4" />
                </a>
              )}
              {clinic.phone && (
                <a href={`tel:${clinic.phone}`}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/18 text-white font-semibold rounded-xl text-sm border border-white/25 backdrop-blur-sm transition-all hover:-translate-y-0.5">
                  <Phone className="w-4 h-4" /> {clinic.phone}
                </a>
              )}
            </div>

          </div>

          {/* Right — info card */}
          <div className="hidden lg:flex justify-end">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-7 w-72 space-y-5 shadow-2xl shadow-black/30">

              {/* Logo */}
              {clinic.logo_url && (
                <div className="flex justify-center pb-2 border-b border-white/15">
                  <img src={mediaUrl(clinic.logo_url)} alt={clinic.name} className="h-14 w-auto object-contain" />
                </div>
              )}

              {/* Quick info */}
              <div className="space-y-3">
                {clinic.phone && (
                  <a href={`tel:${clinic.phone}`} className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-gray-400 uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{clinic.phone}</p>
                    </div>
                  </a>
                )}
                {clinic.email && (
                  <a href={`mailto:${clinic.email}`} className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-gray-400 uppercase tracking-wider">Email</p>
                      <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors truncate max-w-[160px]">{clinic.email}</p>
                    </div>
                  </a>
                )}
                {clinic.hours && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-600/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-teal-300" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-gray-400 uppercase tracking-wider">Hours</p>
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line mt-0.5">{clinic.hours}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Doctors count chip */}
              {doctors.length > 0 && (
                <div className="pt-2 border-t border-white/15 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'} Available</span>
                  <div className="flex -space-x-2">
                    {doctors.slice(0, 3).map(doc => (
                      <div key={doc.id} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white/20 flex items-center justify-center text-xs font-bold text-white">
                        {doc.full_name.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 text-gray-500 opacity-60">
          <div className="w-[1.5px] h-10 bg-gradient-to-b from-transparent via-gray-400 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────────────────────── */}
      {clinic.about && (
        <section id="about" className="py-20 px-5 bg-white">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <SectionHeading eyebrow="Who We Are" title={`About ${clinic.name}`} />
            <p className="text-gray-500 leading-[1.95] text-base whitespace-pre-line lg:-mt-6">
              {clinic.about}
            </p>
          </div>
        </section>
      )}

      {/* ── DOCTORS ────────────────────────────────────────────────────────── */}
      {doctors.length > 0 && (
        <section id="doctors" className="py-20 px-5 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <SectionHeading eyebrow="Medical Team" title="Meet Our Doctors" />
            <div className={`grid gap-6 ${
              doctors.length === 1 ? 'grid-cols-1 max-w-sm' :
              doctors.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {doctors.map(doc => (
                <div key={doc.id}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
                  {/* Photo area */}
                  <div className="relative h-52 bg-gradient-to-br from-blue-50 to-blue-100 flex items-end justify-center overflow-hidden">
                    {doc.avatar_url
                      ? <img src={mediaUrl(doc.avatar_url)} alt={doc.full_name} className="h-full w-full object-cover object-top" />
                      : <div className="w-28 h-28 mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-5xl font-black shadow-xl">
                          {doc.full_name.charAt(0)}
                        </div>
                    }
                    {/* Gradient fade at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent" />
                  </div>
                  {/* Info */}
                  <div className="px-6 pb-6 pt-4 space-y-3">
                    <div>
                      <p className="font-bold text-gray-900 text-lg leading-tight">{doc.full_name}</p>
                      {doc.specialization && (
                        <p className="text-sm text-blue-600 font-medium mt-0.5">{doc.specialization}</p>
                      )}
                    </div>
                    {clinic.portal_enabled && (
                      <a href="/book"
                        className="block w-full text-center py-2.5 rounded-xl border-2 border-blue-600 text-blue-600 text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                        Book Appointment
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES ───────────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="services" className="py-20 px-5 bg-white">
          <div className="max-w-6xl mx-auto">
            <SectionHeading eyebrow="What We Offer" title="Our Services" />
            {(() => {
              const grouped = services.reduce((acc, s) => {
                const cat = s.category || 'General';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(s);
                return acc;
              }, {});
              return Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-10">
                  {Object.keys(grouped).length > 1 && (
                    <div className="flex items-center gap-4 mb-5">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">{cat}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((svc, i) => (
                      <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm transition-all duration-200 group">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors duration-200">
                          <CheckCircle className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors duration-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 text-sm leading-tight">{svc.name}</p>
                          {svc.description && (
                            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{svc.description}</p>
                          )}
                          {svc.price > 0 && (
                            <p className="text-sm font-bold text-blue-600 mt-2">
                              LKR {Number(svc.price).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {/* ── CONTACT + HOURS ────────────────────────────────────────────────── */}
      {(clinic.hours || clinic.address || clinic.phone || clinic.email || clinic.map_url) && (
        <section id="contact" className="py-20 px-5 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <SectionHeading eyebrow="Find Us" title="Contact & Hours" />
            <div className={`grid gap-6 ${clinic.hours ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 max-w-lg'}`}>

              {/* Contact */}
              <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${clinic.hours ? 'lg:col-span-2' : ''}`}>
                <div className="px-7 py-5 bg-blue-600">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Get in Touch</p>
                  <h3 className="text-xl font-bold text-white mt-1">{clinic.name}</h3>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    clinic.phone    && { href:`tel:${clinic.phone}`,           icon:Phone,         label:clinic.phone,         sub:'Call Us' },
                    clinic.email    && { href:`mailto:${clinic.email}`,        icon:Mail,          label:clinic.email,         sub:'Email Us' },
                    clinic.address  && { href:null,                            icon:MapPin,        label:clinic.address,       sub:'Address' },
                    whatsappUrl     && { href:whatsappUrl, target:'_blank',    icon:MessageCircle, label:'WhatsApp Chat',       sub:'Message Us', green:true },
                    clinic.facebook && { href:clinic.facebook, target:'_blank',icon:Facebook,      label:'Facebook Page',      sub:'Follow Us' },
                    clinic.map_url  && { href:clinic.map_url,  target:'_blank',icon:ExternalLink,  label:'View on Google Maps',sub:'Directions' },
                  ].filter(Boolean).map((item, i) => {
                    const Icon = item.icon;
                    const content = (
                      <div className={`flex items-center gap-3.5 p-3.5 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50 transition-all ${item.href ? 'cursor-pointer' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.green ? 'bg-green-100' : 'bg-blue-100'}`}>
                          <Icon className={`w-5 h-5 ${item.green ? 'text-green-600' : 'text-blue-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[0.65rem] text-gray-400 uppercase tracking-wider">{item.sub}</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                        </div>
                      </div>
                    );
                    return item.href
                      ? <a key={i} href={item.href} target={item.target} rel={item.target ? 'noopener noreferrer' : undefined}>{content}</a>
                      : <div key={i}>{content}</div>;
                  })}
                </div>
              </div>

              {/* Hours */}
              {clinic.hours && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-7 py-5 bg-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Working Hours</p>
                    <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" /> Schedule
                    </h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-600 leading-[2.2] whitespace-pre-line">{clinic.hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── BOOKING CTA BANNER ─────────────────────────────────────────────── */}
      {clinic.portal_enabled && (
        <section className="relative py-16 px-5 overflow-hidden bg-blue-700">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="relative max-w-3xl mx-auto text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Ready to book your visit?</h2>
            <p className="text-blue-200 text-sm">Online booking available 24/7 — no phone call required.</p>
            <a href="/book"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-50 transition-all shadow-xl shadow-blue-900/30 hover:-translate-y-0.5">
              Book Appointment Now <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 pt-14 pb-8 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pb-10 border-b border-slate-800">

            {/* Brand col */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {clinic.logo_url
                  ? <img src={mediaUrl(clinic.logo_url)} alt={clinic.name} className="h-10 w-auto object-contain brightness-0 invert opacity-80" />
                  : <Stethoscope className="w-6 h-6 text-slate-500" />
                }
                <span className="font-bold text-slate-200 text-base">{clinic.name}</span>
              </div>
              {clinic.tagline && <p className="text-sm text-slate-500 leading-relaxed">{clinic.tagline}</p>}
              {clinic.address && (
                <p className="flex items-start gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-600" /> {clinic.address}
                </p>
              )}
            </div>

            {/* Quick links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Quick Links</p>
              <ul className="space-y-2.5 text-sm">
                {clinic.portal_enabled && <li><a href="/book" className="hover:text-white transition-colors">Book Appointment</a></li>}
                {clinic.about   && <li><a href="#about"   className="hover:text-white transition-colors">About Us</a></li>}
                <li><a href="#doctors"  className="hover:text-white transition-colors">Our Doctors</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="#contact"  className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/login"    className="hover:text-white transition-colors">Staff Login</a></li>
              </ul>
            </div>

            {/* Contact col */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Contact</p>
              <ul className="space-y-3 text-sm">
                {clinic.phone && (
                  <li><a href={`tel:${clinic.phone}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <Phone className="w-4 h-4 text-slate-600 shrink-0" /> {clinic.phone}
                  </a></li>
                )}
                {clinic.email && (
                  <li><a href={`mailto:${clinic.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <Mail className="w-4 h-4 text-slate-600 shrink-0" /> {clinic.email}
                  </a></li>
                )}
                {whatsappUrl && (
                  <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-green-400 transition-colors">
                    <MessageCircle className="w-4 h-4 text-slate-600 shrink-0" /> WhatsApp
                  </a></li>
                )}
                {clinic.facebook && (
                  <li><a href={clinic.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                    <Facebook className="w-4 h-4 text-slate-600 shrink-0" /> Facebook
                  </a></li>
                )}
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>© {new Date().getFullYear()} {clinic.name}. All rights reserved.</span>
            <span>Powered by <a href="https://healthcenter.lk" className="text-slate-500 hover:text-white transition-colors">ClinicPOS</a></span>
          </div>
        </div>
      </footer>

    </div>
  );
}
