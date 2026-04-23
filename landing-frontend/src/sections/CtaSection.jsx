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

  const email      = info?.sales_email || info?.support_email || 'info@healthcenter.lk';
  const phone      = info?.phone_primary || null;
  const whatsapp   = info?.phone_whatsapp || null;
  const addr       = [info?.address_line1, info?.address_line2, info?.city, info?.country].filter(Boolean).join(', ');
  const suppEmail  = info?.support_email || null;

  return (
    <section id="contact" style={{
      padding:'100px 0', textAlign:'center', position:'relative',
      background:'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)',
    }}>
      <div style={{ maxWidth:1140, margin:'0 auto', padding:'0 24px', position:'relative', zIndex:1 }}>
        <FadeIn>
          <div className="eyebrow justify-center mb-3">Ready to get started?</div>
          <h2 style={{ fontSize:'clamp(1.8rem,3vw,2.8rem)', fontWeight:900, marginBottom:16, letterSpacing:'-1px' }}>
            Modernise your clinic <span className="gradient-text">today</span>
          </h2>
          <p style={{ fontSize:'1.05rem', color:'var(--text-sub)', maxWidth:460, margin:'0 auto 36px', lineHeight:1.75 }}>
            Join clinics across Sri Lanka already saving time and growing with HealthCenter.lk. Contact us for a free demo and personalised setup.
          </p>

          <div className="flex justify-center flex-wrap gap-3 mb-10">
            <motion.a
              href={`mailto:${email}`}
              whileHover={{ translateY: -2, boxShadow:'0 12px 30px rgba(99,102,241,0.5)' }}
              style={{
                background:'linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)',
                color:'#fff', padding:'14px 32px', borderRadius:12,
                fontWeight:700, fontSize:'0.95rem',
                boxShadow:'0 8px 25px rgba(99,102,241,0.4)',
                display:'inline-flex', alignItems:'center', gap:8,
              }}
            >
              <Mail size={16} /> {email}
            </motion.a>
            {phone && (
              <motion.a
                href={`tel:${phone}`}
                whileHover={{ translateY: -2 }}
                style={{
                  background:'rgba(255,255,255,0.06)', color:'var(--text)',
                  padding:'14px 32px', borderRadius:12,
                  fontWeight:600, fontSize:'0.95rem',
                  border:'1px solid rgba(255,255,255,0.12)',
                  display:'inline-flex', alignItems:'center', gap:8,
                }}
              >
                <Phone size={16} /> {phone}
              </motion.a>
            )}
          </div>

          {/* Contact cards strip */}
          {(phone || suppEmail || addr) && (
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:32 }}>
              <div className="flex justify-center flex-wrap gap-5">
                {(phone || whatsapp) && (
                  <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'18px 24px', textAlign:'left', minWidth:180 }}>
                    <div style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:1, color:'var(--text-sub)', marginBottom:8 }}>Phone</div>
                    {phone && <a href={`tel:${phone}`} style={{ display:'block', fontWeight:700 }}>{phone}</a>}
                    {whatsapp && whatsapp !== phone && (
                      <a href={`https://wa.me/${whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                         style={{ display:'block', fontSize:'0.82rem', color:'var(--text-sub)', marginTop:4 }}>
                        WhatsApp: {whatsapp}
                      </a>
                    )}
                  </div>
                )}
                {(suppEmail || email) && (
                  <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'18px 24px', textAlign:'left', minWidth:220 }}>
                    <div style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:1, color:'var(--text-sub)', marginBottom:8 }}>Email</div>
                    <a href={`mailto:${suppEmail || email}`} style={{ display:'block', fontWeight:700 }}>{suppEmail || email}</a>
                    {info?.sales_email && info?.sales_email !== suppEmail && (
                      <a href={`mailto:${info.sales_email}`} style={{ display:'block', fontSize:'0.82rem', color:'var(--text-sub)', marginTop:4 }}>{info.sales_email}</a>
                    )}
                  </div>
                )}
                {addr && (
                  <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'18px 24px', textAlign:'left', maxWidth:260 }}>
                    <div style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:1, color:'var(--text-sub)', marginBottom:8 }}>Address</div>
                    <p style={{ fontSize:'0.875rem', color:'var(--text-sub)', lineHeight:1.5 }}>{addr}</p>
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
