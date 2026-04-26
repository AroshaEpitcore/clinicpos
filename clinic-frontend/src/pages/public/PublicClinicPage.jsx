import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Mail, MapPin, Clock, Facebook,
  MessageCircle, ExternalLink, Stethoscope,
  ChevronRight, ArrowRight, CheckCircle,
} from 'lucide-react';
import { portalApi } from '../../api/portal';
import { mediaUrl }  from '../../utils/mediaUrl';

// ── Floating → sticky nav ─────────────────────────────────────────────────────
function Navbar({ clinic, whatsappUrl }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
      scrolled
        ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100 py-0'
        : 'bg-transparent py-2'
    }`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">

        {/* Logo + name */}
        <div className="flex items-center gap-3 min-w-0">
          {clinic.logo_url
            ? <img src={mediaUrl(clinic.logo_url)} alt={clinic.name}
                className="h-9 w-auto object-contain shrink-0" />
            : <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                scrolled ? 'bg-blue-600' : 'bg-white/20 border border-white/30'
              }`}>
                <Stethoscope className={`w-5 h-5 ${scrolled ? 'text-white' : 'text-white'}`} />
              </div>
          }
          <span className={`font-bold text-base truncate transition-colors duration-300 ${
            scrolled ? 'text-gray-900' : 'text-white'
          }`}>{clinic.name}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="/login" className={`text-sm font-medium transition-colors duration-300 hidden sm:block ${
            scrolled ? 'text-gray-500 hover:text-gray-800' : 'text-white/80 hover:text-white'
          }`}>
            Staff Login
          </a>
          {clinic.portal_enabled && (
            <a href="/book" className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              scrolled
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg shadow-black/10'
            }`}>
              Book <span className="hidden sm:inline">Appointment</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ eyebrow, title }) {
  return (
    <div className="text-center mb-14">
      {eyebrow && (
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
      <div className="mt-4 mx-auto w-10 h-1 rounded-full bg-gradient-to-r from-blue-500 to-teal-400" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicClinicPage() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('clinic_token');
    if (token) { navigate('/dashboard', { replace: true }); return; }

    portalApi.getWebsite()
      .then(r => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
        <Stethoscope className="w-10 h-10 text-slate-600" />
        <p className="text-slate-400">Unable to load clinic information.</p>
        <a href="/login" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">Staff Login →</a>
      </div>
    );
  }

  const { clinic, doctors, services } = data;

  if (!clinic.website_enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-3">
        <h1 className="text-xl font-bold text-white">{clinic.name}</h1>
        <p className="text-slate-400 text-sm">This clinic's website is not currently available.</p>
        <a href="/login" className="text-blue-400 text-sm hover:text-blue-300 transition-colors mt-2">Staff Login →</a>
      </div>
    );
  }

  const whatsappUrl = clinic.whatsapp
    ? `https://wa.me/${clinic.whatsapp.replace(/\D/g, '')}`
    : null;

  return (
    <div className="min-h-screen bg-white antialiased">

      {/* Floating → sticky navbar */}
      <Navbar clinic={clinic} whatsappUrl={whatsappUrl} />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">

        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.18),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(20,184,166,0.12),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
        />

        {/* Glow circles */}
        <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 pt-28 pb-24 text-center">

          {/* Logo */}
          {clinic.logo_url && (
            <div className="mb-8 flex justify-center">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-black/40">
                <img src={mediaUrl(clinic.logo_url)} alt={clinic.name}
                  className="h-16 sm:h-20 w-auto object-contain" />
              </div>
            </div>
          )}

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-xs font-semibold tracking-wide mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Accepting new patients
          </div>

          {/* Name */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-5">
            {clinic.name}
          </h1>

          {/* Tagline */}
          {clinic.tagline && (
            <p className="text-xl sm:text-2xl text-blue-200/80 font-light max-w-2xl mx-auto mb-4 leading-relaxed">
              {clinic.tagline}
            </p>
          )}

          {/* Address chip */}
          {clinic.address && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-400 mb-10">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              {clinic.address}
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {clinic.portal_enabled && (
              <a href="/book"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-blue-900/40 hover:shadow-blue-800/50 transition-all duration-200 hover:-translate-y-0.5">
                Book an Appointment <ArrowRight className="w-4 h-4" />
              </a>
            )}
            {clinic.phone && (
              <a href={`tel:${clinic.phone}`}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-sm border border-white/20 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5">
                <Phone className="w-4 h-4" /> {clinic.phone}
              </a>
            )}
            {whatsappUrl && !clinic.phone && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 font-semibold rounded-xl text-sm border border-green-400/30 transition-all duration-200 hover:-translate-y-0.5">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
          </div>

          {/* Quick stats row */}
          {(doctors.length > 0 || services.length > 0) && (
            <div className="mt-16 flex flex-wrap justify-center gap-8">
              {doctors.length > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{doctors.length}</div>
                  <div className="text-xs text-slate-400 mt-1">{doctors.length === 1 ? 'Doctor' : 'Doctors'}</div>
                </div>
              )}
              {services.length > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{services.length}</div>
                  <div className="text-xs text-slate-400 mt-1">Services</div>
                </div>
              )}
              {clinic.hours && (
                <div className="text-center">
                  <div className="text-3xl font-black text-white">
                    <Clock className="w-7 h-7 text-blue-400 mx-auto" />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Open Now</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-500 animate-bounce">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-slate-600" />
          <div className="w-1 h-1 rounded-full bg-slate-600" />
        </div>
      </section>

      {/* ── ABOUT ── */}
      {clinic.about && (
        <section className="py-20 px-5 bg-white">
          <div className="max-w-3xl mx-auto">
            <SectionHeading eyebrow="Who We Are" title="About Us" />
            <p className="text-gray-600 leading-[1.9] text-base whitespace-pre-line text-center max-w-2xl mx-auto">
              {clinic.about}
            </p>
          </div>
        </section>
      )}

      {/* ── DOCTORS ── */}
      {doctors.length > 0 && (
        <section className="py-20 px-5 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <SectionHeading eyebrow="Meet the Team" title="Our Doctors" />
            <div className={`grid gap-5 ${
              doctors.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
              doctors.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {doctors.map(doc => (
                <div key={doc.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  {/* Top color bar */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-teal-400" />
                  <div className="p-7 flex flex-col items-center text-center gap-4 flex-1">
                    {doc.avatar_url
                      ? <img src={mediaUrl(doc.avatar_url)} alt={doc.full_name}
                          className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-50" />
                      : <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 text-3xl font-black ring-4 ring-blue-50">
                          {doc.full_name.charAt(0)}
                        </div>
                    }
                    <div className="space-y-1">
                      <p className="font-bold text-gray-900 text-lg">{doc.full_name}</p>
                      {doc.specialization && (
                        <p className="text-sm text-blue-600 font-medium">{doc.specialization}</p>
                      )}
                    </div>
                    {clinic.portal_enabled && (
                      <a href="/book"
                        className="mt-auto w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white text-sm font-semibold transition-all duration-200 border border-blue-100 hover:border-blue-600">
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

      {/* ── SERVICES ── */}
      {services.length > 0 && (
        <section className="py-20 px-5 bg-white">
          <div className="max-w-5xl mx-auto">
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
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{cat}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((svc, i) => (
                      <div key={i}
                        className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/40 transition-all duration-200 group">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 transition-colors duration-200">
                          <CheckCircle className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors duration-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 text-sm">{svc.name}</p>
                          {svc.description && (
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{svc.description}</p>
                          )}
                        </div>
                        {svc.price > 0 && (
                          <span className="text-sm font-bold text-blue-600 shrink-0 ml-2">
                            LKR {Number(svc.price).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {/* ── CONTACT + HOURS ── */}
      {(clinic.hours || clinic.address || clinic.phone || clinic.email || clinic.map_url) && (
        <section className="py-20 px-5 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <SectionHeading eyebrow="Find Us" title="Contact & Hours" />
            <div className={`grid gap-6 ${clinic.hours ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1 max-w-lg mx-auto'}`}>

              {/* Contact card — wider */}
              <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${clinic.hours ? 'lg:col-span-3' : ''}`}>
                <div className="px-6 pt-5 pb-2 border-b border-gray-50">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Get in Touch</p>
                </div>
                <div className="p-6 space-y-3">
                  {[
                    clinic.phone    && { href: `tel:${clinic.phone}`,         icon: Phone,          label: clinic.phone,          cls: 'text-gray-700 hover:text-blue-600' },
                    clinic.email    && { href: `mailto:${clinic.email}`,       icon: Mail,           label: clinic.email,          cls: 'text-gray-700 hover:text-blue-600' },
                    clinic.address  && { href: null,                           icon: MapPin,         label: clinic.address,        cls: 'text-gray-600' },
                    whatsappUrl     && { href: whatsappUrl,  target:'_blank',  icon: MessageCircle,  label: 'Chat on WhatsApp',    cls: 'text-green-600 hover:text-green-700' },
                    clinic.facebook && { href: clinic.facebook, target:'_blank', icon: Facebook,     label: 'Facebook Page',       cls: 'text-blue-700 hover:text-blue-800' },
                    clinic.map_url  && { href: clinic.map_url,  target:'_blank', icon: ExternalLink, label: 'View on Google Maps', cls: 'text-blue-600 hover:text-blue-700' },
                  ].filter(Boolean).map((item, i) => {
                    const Icon = item.icon;
                    const inner = (
                      <div key={i} className={`flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50 transition-colors ${item.cls} ${item.href ? 'cursor-pointer' : ''}`}>
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    );
                    return item.href
                      ? <a key={i} href={item.href} target={item.target} rel={item.target ? 'noopener noreferrer' : undefined}>{inner}</a>
                      : <div key={i}>{inner}</div>;
                  })}
                </div>
              </div>

              {/* Hours card */}
              {clinic.hours && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:col-span-2">
                  <div className="px-6 pt-5 pb-2 border-b border-gray-50 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Working Hours</p>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-600 leading-[2] whitespace-pre-line">{clinic.hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── BOOKING CTA STRIP ── */}
      {clinic.portal_enabled && (
        <section className="py-16 px-5 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Ready to book your appointment?</h2>
            <p className="text-blue-200 text-sm">Available 24/7 online. No phone call needed.</p>
            <a href="/book"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-lg shadow-blue-900/20">
              Book Appointment Now <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 text-slate-500 py-10 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {clinic.logo_url
                ? <img src={mediaUrl(clinic.logo_url)} alt={clinic.name} className="h-8 w-auto object-contain opacity-70" />
                : <Stethoscope className="w-5 h-5 text-slate-600" />
              }
              <span className="font-bold text-slate-300 text-sm">{clinic.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <a href="/login"   className="hover:text-slate-300 transition-colors">Staff Login</a>
              {clinic.portal_enabled && <a href="/book" className="hover:text-slate-300 transition-colors">Book Appointment</a>}
              {clinic.phone  && <a href={`tel:${clinic.phone}`}  className="hover:text-slate-300 transition-colors">{clinic.phone}</a>}
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>© {new Date().getFullYear()} {clinic.name}. All rights reserved.</span>
            <span>Powered by <a href="https://healthcenter.lk" className="text-slate-500 hover:text-slate-300 transition-colors">ClinicPOS</a></span>
          </div>
        </div>
      </footer>

    </div>
  );
}
