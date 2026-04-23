import FadeIn from '../components/ui/FadeIn';
import { motion } from 'framer-motion';

const steps = [
  { n:'1', title:'Sign Up',    desc:'Create your clinic account. We set up your private, isolated workspace on our secure cloud instantly.' },
  { n:'2', title:'Configure', desc:'Add your doctors, set schedules, configure fees, upload your logo and branding — done in under 10 minutes.' },
  { n:'3', title:'Go Live',   desc:'Share your booking link with patients, open the waiting-room TV display, and start taking appointments.' },
  { n:'4', title:'Grow',      desc:'Enable pharmacy, lab, and insurance modules as your practice expands — no technical work required.' },
];

export default function WorkflowSection() {
  return (
    <section id="how-it-works" style={{ padding:'96px 0', background:'rgba(255,255,255,0.015)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto', padding:'0 24px' }}>
        <FadeIn className="text-center mb-16">
          <div className="eyebrow mb-3.5">Simple Setup</div>
          <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.15, marginBottom:16 }}>
            Up and running <span className="gradient-text">in minutes</span>
          </h2>
          <p style={{ fontSize:'1.05rem', color:'var(--text-sub)', maxWidth:520, margin:'0 auto', lineHeight:1.75 }}>
            No hardware. No complex IT. Just sign up and your clinic is live — we handle everything.
          </p>
        </FadeIn>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, position:'relative' }}
             className="workflow-grid-responsive">
          {/* Connector line */}
          <div className="hidden md:block" style={{
            position:'absolute', top:52, left:'12.5%', right:'12.5%', height:2,
            background:'linear-gradient(90deg, #6366f1, #06b6d4)', zIndex:0,
          }} />

          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={0.1 * i} className="text-center" style={{ padding:'0 20px', position:'relative', zIndex:1 }}>
              <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300 }}
                style={{
                  width:56, height:56, borderRadius:'50%',
                  background:'linear-gradient(135deg,#6366f1,#06b6d4)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:900, fontSize:'1.1rem', color:'#fff',
                  margin:'0 auto 20px',
                  boxShadow:'0 0 0 6px var(--dark), 0 0 0 8px rgba(99,102,241,0.2), 0 8px 20px rgba(99,102,241,0.35)',
                }}
              >{s.n}</motion.div>
              <h3 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:8 }}>{s.title}</h3>
              <p style={{ fontSize:'0.82rem', color:'var(--text-sub)', lineHeight:1.65 }}>{s.desc}</p>
            </FadeIn>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 1024px) { .workflow-grid-responsive { grid-template-columns: repeat(2,1fr) !important; gap: 40px !important; } }
        @media (max-width: 640px)  { .workflow-grid-responsive { grid-template-columns: 1fr !important; gap: 32px !important; } }
      `}</style>
    </section>
  );
}
