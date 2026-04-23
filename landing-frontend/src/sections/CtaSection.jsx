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
    <section id="contact" className="py-16 md:py-20 lg:py-24 bg-ink text-white text-center relative">
      <div className="absolute inset-0 pointer-events-none cta-radial" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <FadeIn>
          <div className="eyebrow justify-center mb-3">Ready to get started?</div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4">
            Modernise your clinic <span className="gradient-text">today</span>
          </h2>
          <p className="text-base max-w-[460px] mx-auto mb-9 leading-relaxed text-white/60">
            Join clinics across Sri Lanka already saving time and growing with HealthCenter.lk. Contact us for a free demo and personalised setup.
          </p>

          <div className="flex justify-center flex-wrap gap-3 mb-10">
            <motion.a
              href={`mailto:${email}`}
              whileHover={{ translateY: -2, boxShadow:'0 12px 30px rgba(99,102,241,0.5)' }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-br from-indigo-500 to-violet-700 shadow-[0_8px_25px_rgba(99,102,241,0.4)]"
            >
              <Mail size={16} /> {email}
            </motion.a>
            {phone && (
              <motion.a
                href={`tel:${phone}`}
                whileHover={{ translateY: -2 }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm border bg-white/[0.06] text-white border-white/[0.12] hover:bg-white/10 transition-colors"
              >
                <Phone size={16} /> {phone}
              </motion.a>
            )}
          </div>

          {(phone || suppEmail || addr) && (
            <div className="border-t border-white/[0.08] pt-8">
              <div className="flex justify-center flex-wrap gap-4 sm:gap-5">
                {(phone || whatsapp) && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl py-4.5 px-6 text-left min-w-[180px]">
                    <div className="text-[0.72rem] uppercase tracking-widest mb-2 text-white/60">Phone</div>
                    {phone && <a href={`tel:${phone}`} className="block font-bold hover:text-white/80 transition-colors">{phone}</a>}
                    {whatsapp && whatsapp !== phone && (
                      <a href={`https://wa.me/${whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                         className="block text-sm mt-1 text-white/60 hover:text-white/80 transition-colors">
                        WhatsApp: {whatsapp}
                      </a>
                    )}
                  </div>
                )}
                {(suppEmail || email) && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl py-4.5 px-6 text-left min-w-[220px]">
                    <div className="text-[0.72rem] uppercase tracking-widest mb-2 text-white/60">Email</div>
                    <a href={`mailto:${suppEmail || email}`} className="block font-bold hover:text-white/80 transition-colors">{suppEmail || email}</a>
                    {info?.sales_email && info?.sales_email !== suppEmail && (
                      <a href={`mailto:${info.sales_email}`} className="block text-sm mt-1 text-white/60 hover:text-white/80 transition-colors">{info.sales_email}</a>
                    )}
                  </div>
                )}
                {addr && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl py-4.5 px-6 text-left max-w-[260px]">
                    <div className="text-[0.72rem] uppercase tracking-widest mb-2 text-white/60">Address</div>
                    <p className="text-sm leading-relaxed text-white/60">{addr}</p>
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
