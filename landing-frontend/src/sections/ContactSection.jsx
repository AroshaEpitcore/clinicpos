import { useState, useEffect } from 'react';
import { Mail, Phone, MessageCircle, CheckCircle, Send, MapPin } from 'lucide-react';

export default function ContactSection() {
  const [info,    setInfo]    = useState(null);
  const [form,    setForm]    = useState({ name: '', email: '', phone: '', clinic_name: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch('/api/v1/public/platform-info')
      .then(r => r.json())
      .then(j => setInfo(j.data || null))
      .catch(() => {});
  }, []);

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in all required fields (Name, Email, Message).');
      return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/v1/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.message || 'Failed');
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSent(false);
    setForm({ name: '', email: '', phone: '', clinic_name: '', message: '' });
    setError('');
  }

  const email     = info?.support_email || info?.sales_email || '';
  const phone     = info?.phone_primary || '';
  const whatsapp  = info?.phone_whatsapp || '';
  const city      = info?.city || '';
  const country   = info?.country || 'Sri Lanka';
  const address   = [info?.address_line1, info?.address_line2, city, country].filter(Boolean).join(', ');

  const contactItems = [
    email    && { icon: Mail,          color: 'primary', label: 'Email Us',   value: email,    href: `mailto:${email}`,                          hoverBg: 'hover:border-primary/30' },
    phone    && { icon: Phone,         color: 'teal',    label: 'Call Us',    value: phone,    href: `tel:${phone}`,                             hoverBg: 'hover:border-teal/30' },
    whatsapp && { icon: MessageCircle, color: 'green',   label: 'WhatsApp',   value: whatsapp, href: `https://wa.me/${whatsapp.replace(/\D/g,'')}`, hoverBg: 'hover:border-green-400/40', external: true },
    address  && { icon: MapPin,        color: 'ink',     label: 'Find Us',    value: address,  href: null,                                       hoverBg: 'hover:border-primary/20' },
  ].filter(Boolean);

  const colorMap = {
    primary: { bg: 'bg-primary/10', icon: 'text-primary', hoverBg: 'group-hover:bg-primary/20' },
    teal:    { bg: 'bg-teal/10',    icon: 'text-teal',    hoverBg: 'group-hover:bg-teal/20' },
    green:   { bg: 'bg-green-50',   icon: 'text-green-600', hoverBg: 'group-hover:bg-green-100' },
    ink:     { bg: 'bg-ink/5',      icon: 'text-ink-light', hoverBg: 'group-hover:bg-ink/10' },
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors bg-white';
  const labelCls = 'block text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5';

  return (
    <section id="contact" className="py-20 sm:py-24 relative overflow-hidden bg-[#F6F9FD]">
      {/* Background texture */}
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
      <div className="absolute inset-0 cta-radial pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">

        {/* Heading */}
        <div className="text-center mb-14">
          <span className="eyebrow mb-3">Contact Us</span>
          <h2 className="text-3xl sm:text-4xl font-black text-ink mt-3 mb-4 leading-tight">
            Let's talk about{' '}
            <span className="gradient-text">your clinic</span>
          </h2>
          <p className="text-ink-light max-w-lg mx-auto text-base leading-relaxed">
            Interested in HealthCenter.lk? Have a question or want a live demo?
            Send us a message — we reply within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8 lg:gap-12 items-start">

          {/* Left — contact info */}
          <div className="md:col-span-2 space-y-4">
            {contactItems.length > 0 ? (
              contactItems.map(({ icon: Icon, color, label, value, href, hoverBg, external }) => {
                const c = colorMap[color];
                const inner = (
                  <div className={`flex items-start gap-4 p-4 rounded-2xl bg-white border border-primary/8 ${hoverBg} hover:shadow-md transition-all group cursor-default`}>
                    <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.hoverBg} flex items-center justify-center shrink-0 transition-colors`}>
                      <Icon className={`w-5 h-5 ${c.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-ink break-all">{value}</p>
                    </div>
                  </div>
                );
                return href ? (
                  <a key={label} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{inner}</a>
                ) : (
                  <div key={label}>{inner}</div>
                );
              })
            ) : (
              /* Fallback when no platform info configured */
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-primary/8">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-0.5">Email Us</p>
                  <p className="text-sm font-medium text-ink">We'll respond within 24 hours</p>
                </div>
              </div>
            )}

            {/* Assurance strip */}
            <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-semibold text-primary mb-1">What to expect</p>
              <ul className="space-y-1">
                {['Response within 24 hours', 'Free personalised demo', 'No commitment required'].map(t => (
                  <li key={t} className="flex items-center gap-2 text-xs text-ink-light">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — form */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-3xl border border-primary/10 shadow-xl shadow-primary/5 p-7 sm:p-8">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-ink mb-2">Message Sent!</h3>
                  <p className="text-ink-light text-sm max-w-xs leading-relaxed">
                    Thank you for reaching out. Our team will get back to you within 24 hours.
                  </p>
                  <button
                    onClick={reset}
                    className="mt-6 text-sm text-primary font-semibold hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                      <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="Your full name" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Email <span className="text-red-400">*</span></label>
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                        placeholder="your@email.com" className={inputCls} />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                        placeholder="07X XXX XXXX" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Clinic / Practice</label>
                      <input type="text" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)}
                        placeholder="Clinic name (optional)" className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Message <span className="text-red-400">*</span></label>
                    <textarea value={form.message} onChange={e => set('message', e.target.value)}
                      placeholder="Tell us what you're looking for — questions, demo request, pricing enquiry..."
                      rows={5} className={`${inputCls} resize-none`} />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-[#03467C] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                      : <><Send className="w-4 h-4" /> Send Message</>
                    }
                  </button>

                  <p className="text-center text-[11px] text-ink-faint">
                    We'll never share your information with third parties.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
