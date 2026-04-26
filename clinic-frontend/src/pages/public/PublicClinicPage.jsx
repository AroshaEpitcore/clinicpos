import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Facebook, MessageCircle, ExternalLink, Stethoscope, Layers, ChevronRight } from 'lucide-react';
import { portalApi } from '../../api/portal';
import { mediaUrl } from '../../utils/mediaUrl';

export default function PublicClinicPage() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  // If already logged in, skip the public page
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-500">Unable to load clinic information.</p>
        <a href="/login" className="text-blue-600 text-sm hover:underline">Staff Login</a>
      </div>
    );
  }

  const { clinic, doctors, services } = data;

  if (!clinic.website_enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <h1 className="text-xl font-bold text-gray-700">{clinic.name}</h1>
        <p className="text-gray-400 text-sm">This clinic's website is not available.</p>
        <a href="/login" className="text-blue-600 text-sm hover:underline">Staff Login →</a>
      </div>
    );
  }

  const whatsappUrl = clinic.whatsapp
    ? `https://wa.me/${clinic.whatsapp.replace(/\D/g, '')}`
    : null;

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {clinic.logo_url
              ? <img src={mediaUrl(clinic.logo_url)} alt={clinic.name} className="h-9 w-auto object-contain shrink-0" />
              : <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
            }
            <span className="font-bold text-gray-900 text-base truncate">{clinic.name}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {clinic.portal_enabled && (
              <a href="/book"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Book Appointment
              </a>
            )}
            <a href="/login"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Staff Login
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {clinic.logo_url && (
            <img src={mediaUrl(clinic.logo_url)} alt={clinic.name}
              className="h-20 w-auto object-contain mx-auto" />
          )}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
            {clinic.name}
          </h1>
          {clinic.tagline && (
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">{clinic.tagline}</p>
          )}
          {clinic.address && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-gray-400">
              <MapPin className="w-4 h-4 shrink-0" /> {clinic.address}
            </p>
          )}
          {clinic.portal_enabled && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <a href="/book"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md">
                Book Appointment <ChevronRight className="w-4 h-4" />
              </a>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors shadow-md">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── ABOUT ── */}
      {clinic.about && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">About Us</h2>
            <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
            <p className="text-gray-600 leading-relaxed text-base whitespace-pre-line">{clinic.about}</p>
          </div>
        </section>
      )}

      {/* ── DOCTORS ── */}
      {doctors.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">Our Doctors</h2>
              <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
            </div>
            <div className={`grid gap-6 ${
              doctors.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
              doctors.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-lg mx-auto' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {doctors.map(doc => (
                <div key={doc.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow">
                  {doc.avatar_url
                    ? <img src={mediaUrl(doc.avatar_url)} alt={doc.full_name}
                        className="w-20 h-20 rounded-full object-cover border-2 border-blue-100" />
                    : <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                        {doc.full_name.charAt(0)}
                      </div>
                  }
                  <div>
                    <p className="font-semibold text-gray-900">{doc.full_name}</p>
                    {doc.specialization && (
                      <p className="text-sm text-blue-600 mt-0.5">{doc.specialization}</p>
                    )}
                  </div>
                  {clinic.portal_enabled && (
                    <a href="/book"
                      className="mt-1 text-xs px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                      Book Appointment
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES ── */}
      {services.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">Our Services</h2>
              <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
            </div>
            {/* Group by category */}
            {(() => {
              const grouped = services.reduce((acc, s) => {
                const cat = s.category || 'General';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(s);
                return acc;
              }, {});
              return Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-8">
                  {Object.keys(grouped).length > 1 && (
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{cat}</h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((svc, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Layers className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 text-sm">{svc.name}</p>
                          {svc.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{svc.description}</p>
                          )}
                        </div>
                        {svc.price > 0 && (
                          <span className="text-sm font-semibold text-blue-600 shrink-0">
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

      {/* ── HOURS + CONTACT (side by side) ── */}
      {(clinic.hours || clinic.address || clinic.phone || clinic.email || clinic.map_url) && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">Contact & Hours</h2>
              <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
            </div>
            <div className={`grid gap-6 ${clinic.hours ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'}`}>

              {/* Contact card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Get in Touch</h3>
                {clinic.phone && (
                  <a href={`tel:${clinic.phone}`}
                    className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    {clinic.phone}
                  </a>
                )}
                {clinic.email && (
                  <a href={`mailto:${clinic.email}`}
                    className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    {clinic.email}
                  </a>
                )}
                {clinic.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    {clinic.address}
                  </div>
                )}
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-green-600 hover:text-green-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    Chat on WhatsApp
                  </a>
                )}
                {clinic.facebook && (
                  <a href={clinic.facebook} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-blue-700 hover:text-blue-800 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Facebook className="w-4 h-4 text-blue-700" />
                    </div>
                    Facebook Page
                  </a>
                )}
                {clinic.map_url && (
                  <a href={clinic.map_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </div>
                    View on Google Maps
                  </a>
                )}
              </div>

              {/* Hours card */}
              {clinic.hours && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Working Hours
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{clinic.hours}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="text-white font-semibold">{clinic.name}</p>
          {clinic.address && <p className="text-xs">{clinic.address}</p>}
          <div className="pt-3 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} {clinic.name}. All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <a href="/login" className="hover:text-gray-300 transition-colors">Staff Login</a>
            {clinic.portal_enabled && (
              <>
                <span className="hidden sm:inline">·</span>
                <a href="/book" className="hover:text-gray-300 transition-colors">Book Appointment</a>
              </>
            )}
            <span className="hidden sm:inline">·</span>
            <span>Powered by <a href="https://healthcenter.lk" className="text-blue-400 hover:text-blue-300">ClinicPOS</a></span>
          </div>
        </div>
      </footer>

    </div>
  );
}
