import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import FadeIn from '../components/ui/FadeIn';
import { Mail, Phone } from 'lucide-react';

export default function CtaSection() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetch('/api/v1/public/platform-info')
      .then(r => r.json())
      .then(j => setInfo(j.data || null))
      .catch(() => {});
  }, []);

  const email     = info?.sales_email || info?.support_email || 'info@healthcenter.lk';
  const phone     = info?.phone_primary || null;
  const whatsapp  = info?.phone_whatsapp || null;
  const addr      = [info?.address_line1, info?.address_line2, info?.city, info?.country].filter(Boolean).join(', ');
  const suppEmail = info?.support_email || null;

  return (
    <section id="contact" className="py-16 md:py-20 lg:py-24 bg-surface-alt text-center relative">
      <div className="absolute inset-0 pointer-events-none cta-radial" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <FadeIn>
          <div className="eyebrow justify-center mb-3">Ready to get started?</div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4 text-ink">
            Modernise your clinic <span className="gradient-text">today</span>
          </h2>
          <p className="text-base max-w-[460px] mx-auto mb-9 leading-relaxed text-ink-light">
            Join clinics across Sri Lanka already saving time and growing with HealthCenter.lk. Contact us for a free demo and personalised setup.
          </p>

          <div className="flex justify-center flex-wrap gap-3 mb-10">
            <motion.a
              href={`mailto:${email}`}
              whileHover={{ translateY: -2, boxShadow:'0 12px 30px rgba(7,84,142,0.35)' }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-br from-primary to-primary-dark shadow-soft-md"
            >
              <Mail size={16} /> {email}
            </motion.a>
            {phone && (
              <motion.a
                href={`tel:${phone}`}
                whileHover={{ translateY: -2 }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm border bg-ink/5 text-ink border-ink/10 hover:bg-ink/10 transition-colors"
              >
                <Phone size={16} /> {phone}
              </motion.a>
            )}
          </div>

          {(phone || suppEmail || addr) && (
            <div className="border-t border-primary/10 pt-8">
              <div className="flex justify-center flex-wrap gap-4 sm:gap-5">
                {(phone || whatsapp) && (
                  <div className="bg-white border border-primary/10 shadow-soft-sm rounded-2xl py-4.5 px-6 text-left min-w-[180px]">
                    <div className="text-[0.72rem] uppercase tracking-widest mb-2 text-ink-light">Phone</div>
                    {phone && <a href={`tel:${phone}`} className="block font-bold text-ink hover:text-primary transition-colors">{phone}</a>}
                    {whatsapp && whatsapp !== phone && (
                      <a href={`https://wa.me/${whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                         className="block text-sm mt-1 text-ink-light hover:text-primary transition-colors">
                        WhatsApp: {whatsapp}
                      </a>
                    )}
                  </div>
                )}
                {(suppEmail || email) && (
                  <div className="bg-white border border-primary/10 shadow-soft-sm rounded-2xl py-4.5 px-6 text-left min-w-[220px]">
                    <div className="text-[0.72rem] uppercase tracking-widest mb-2 text-ink-light">Email</div>
                    <a href={`mailto:${suppEmail || email}`} className="block font-bold text-ink hover:text-primary transition-colors">{suppEmail || email}</a>
                    {info?.sales_email && info?.sales_email !== suppEmail && (
                      <a href={`mailto:${info.sales_email}`} className="block text-sm mt-1 text-ink-light hover:text-primary transition-colors">{info.sales_email}</a>
                    )}
                  </div>
                )}
                {addr && (
                  <div className="bg-white border border-primary/10 shadow-soft-sm rounded-2xl py-4.5 px-6 text-left max-w-[260px]">
                    <div className="text-[0.72rem] uppercase tracking-widest mb-2 text-ink-light">Address</div>
                    <p className="text-sm leading-relaxed text-ink-light">{addr}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
