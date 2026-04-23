import { motion } from 'framer-motion';
import FadeIn from '../components/ui/FadeIn';

const testimonials = [
  {
    quote: "Setting up was incredibly easy. Within an hour we had all our doctors configured and were taking appointments. The queue display TV screen alone has made our waiting area so much calmer — patients just watch the screen instead of crowding reception.",
    name: 'Dr. Kumara',
    title: 'General Practitioner, Colombo',
    initials: 'DK',
    gradient: 'linear-gradient(135deg,#6366f1,#a855f7)',
  },
  {
    quote: "The billing module saves us at least 2 hours every single day. Insurance claims that used to take a week of paperwork now get done in minutes. The end-of-day closing gives me a perfect summary without any manual counting. Absolutely worth every rupee.",
    name: 'Nisha Perera',
    title: 'Clinic Manager, Kandy',
    initials: 'NP',
    gradient: 'linear-gradient(135deg,#06b6d4,#10b981)',
  },
  {
    quote: "Our pharmacy stock used to be a nightmare. With real-time tracking, expiry alerts, and the dispense queue we've cut wastage by 40%. The purchase order system with supplier management has completely transformed how we reorder medicines.",
    name: 'Ashan Silva',
    title: 'Pharmacist, Gampaha',
    initials: 'AS',
    gradient: 'linear-gradient(135deg,#f59e0b,#f43f5e)',
  },
];

export default function TestimonialsSection() {
  return (
    <section style={{ padding:'96px 0' }}>
      <div style={{ maxWidth:1140, margin:'0 auto', padding:'0 24px' }}>
        <FadeIn className="text-center mb-14">
          <div className="eyebrow mb-3.5">Testimonials</div>
          <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.15 }}>
            Trusted by clinics <span className="gradient-text">across Sri Lanka</span>
          </h2>
        </FadeIn>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}
             className="testimonials-grid-responsive">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={0.1 * i}>
              <motion.div
                whileHover={{ borderColor:'rgba(99,102,241,0.25)', y: -4 }}
                transition={{ duration:0.2 }}
                style={{
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:18, padding:28, position:'relative', height:'100%',
                }}
              >
                <div style={{ display:'flex', gap:2, marginBottom:12 }}>
                  {[...Array(5)].map((_, si) => (
                    <span key={si} style={{ color:'#fbbf24', fontSize:'0.8rem' }}>★</span>
                  ))}
                </div>
                <span style={{ fontSize:'3rem', lineHeight:0.5, color:'rgba(99,102,241,0.3)', marginBottom:16, display:'block' }}>"</span>
                <p style={{ fontSize:'0.875rem', color:'var(--text-sub)', lineHeight:1.75, marginBottom:20 }}>{t.quote}</p>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:42, height:42, borderRadius:12, flexShrink:0,
                    background:t.gradient,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:800, fontSize:'0.9rem', color:'#fff',
                  }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize:'0.875rem', fontWeight:700 }}>{t.name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-sub)' }}>{t.title}</div>
                  </div>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 1024px) { .testimonials-grid-responsive { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 640px)  { .testimonials-grid-responsive { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
