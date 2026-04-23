import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeUp = (delay = 0) => ({
  initial:   { opacity: 0, y: 30 },
  animate:   { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay },
});

function QueueRow({ token, name, detail, badge, variant = 'default', emergency }) {
  const badgeStyle = {
    arrived:   { background: 'rgba(99,102,241,0.2)',   color: '#a5b4fc' },
    waiting:   { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
    done:      { background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' },
    emergency: { background: 'rgba(239,68,68,0.2)',   color: '#fca5a5' },
  }[variant] || {};

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(255,255,255,0.03)', borderRadius: 10,
      padding: '10px 14px', border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: emergency
          ? 'linear-gradient(135deg,#ef4444,#b91c1c)'
          : 'linear-gradient(135deg,#6366f1,#4f46e5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '0.9rem', color: '#fff',
      }}>{token}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>{detail}</div>
      </div>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, ...badgeStyle }}>
        {badge}
      </span>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center', paddingTop: 68,
      overflow: 'hidden',
    }}>
      {/* Background layers */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.25) 0%, transparent 60%),
                     radial-gradient(ellipse 50% 40% at 80% 50%, rgba(6,182,212,0.12) 0%, transparent 60%),
                     radial-gradient(ellipse 40% 50% at 10% 80%, rgba(168,85,247,0.08) 0%, transparent 60%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 70%)',
      }} />

      {/* Orbs */}
      <div className="animate-float" style={{ position:'absolute', borderRadius:'50%', filter:'blur(60px)', width:400, height:400, background:'rgba(99,102,241,0.12)', top:'10%', left:-100, pointerEvents:'none' }} />
      <div className="animate-float2" style={{ position:'absolute', borderRadius:'50%', filter:'blur(60px)', width:300, height:300, background:'rgba(6,182,212,0.1)', top:'30%', right:-80, pointerEvents:'none' }} />
      <div className="animate-float3" style={{ position:'absolute', borderRadius:'50%', filter:'blur(60px)', width:250, height:250, background:'rgba(168,85,247,0.08)', bottom:'10%', left:'30%', pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:2, maxWidth:1140, margin:'0 auto', padding:'0 24px', width:'100%' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}
             className="hero-grid-responsive">

          {/* Left */}
          <div>
            <motion.div {...fadeUp(0)}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)',
                padding:'6px 16px', borderRadius:100, fontSize:'0.78rem', fontWeight:600,
                color:'#a5b4fc', marginBottom:24, letterSpacing:'0.5px',
              }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 8px #4ade80', display:'block' }} />
                Now live across Sri Lanka
              </div>
            </motion.div>

            <motion.h1 {...fadeUp(0.08)} style={{
              fontSize:'clamp(2.2rem, 4.5vw, 3.6rem)',
              fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20,
            }}>
              The smarter way to<br />
              <span className="gradient-text-animated">run your clinic</span>
            </motion.h1>

            <motion.p {...fadeUp(0.16)} style={{
              fontSize:'1.05rem', color:'var(--text-sub)',
              maxWidth:480, marginBottom:36, lineHeight:1.75,
            }}>
              Everything your clinic needs — patients, appointments, prescriptions, lab, pharmacy, and billing — unified in one beautiful, fast platform.
            </motion.p>

            <motion.div {...fadeUp(0.22)} className="flex flex-wrap gap-3">
              <a href="#contact" style={{
                background:'linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)',
                color:'#fff', padding:'14px 32px', borderRadius:12,
                fontWeight:700, fontSize:'0.95rem',
                boxShadow:'0 8px 25px rgba(99,102,241,0.4)',
                display:'inline-flex', alignItems:'center', gap:8,
                transition:'transform 0.2s, box-shadow 0.2s',
              }}>
                Start Free Trial <ArrowRight size={16} />
              </a>
              <a href="#features" style={{
                background:'rgba(255,255,255,0.06)', color:'var(--text)',
                padding:'14px 32px', borderRadius:12,
                fontWeight:600, fontSize:'0.95rem',
                border:'1px solid rgba(255,255,255,0.12)',
                display:'inline-flex', alignItems:'center', gap:8,
              }}>
                <Play size={15} /> See Features
              </a>
            </motion.div>

            <motion.div {...fadeUp(0.28)} className="flex flex-wrap gap-7 mt-11">
              {[
                { num: '12+', label: 'Modules included' },
                { num: '99.9%', label: 'Uptime SLA' },
                { num: '5min', label: 'Setup time' },
              ].map(s => (
                <div key={s.label}>
                  <div className="gradient-text" style={{ fontSize:'1.6rem', fontWeight:800, letterSpacing:'-0.5px' }}>{s.num}</div>
                  <div style={{ fontSize:'0.78rem', color:'var(--text-sub)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            style={{ position:'relative' }}
            className="hero-visual-responsive"
          >
            {/* Float card top */}
            <div className="animate-float2" style={{
              position:'absolute', top:-28, right:-20, zIndex:2,
              background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:14, padding:'14px 18px', backdropFilter:'blur(12px)', whiteSpace:'nowrap',
            }}>
              <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#67e8f9' }}>+24</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-sub)', marginTop:2 }}>Patients today</div>
            </div>

            {/* Main card */}
            <div style={{
              background:'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
              border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28,
              backdropFilter:'blur(10px)',
            }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div style={{
                    width:36, height:36, borderRadius:10, fontSize:'1rem',
                    background:'linear-gradient(135deg,#6366f1,#06b6d4)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>🏥</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.9rem' }}>Today's Queue</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-sub)' }}>Demo Clinic · Dr. Perera</div>
                  </div>
                </div>
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)',
                  color:'#6ee7b7', fontSize:'0.72rem', fontWeight:600,
                  padding:'4px 10px', borderRadius:100,
                }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#4ade80', display:'block' }} />
                  Live
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <QueueRow token="3" name="Kasun Jayawardena" detail="09:15 AM · Walk-in"     badge="With Doctor" variant="arrived" />
                <QueueRow token="4" name="Nimal Perera"       detail="09:30 AM · Online"      badge="Waiting"     variant="waiting" />
                <QueueRow token="!" name="Saman Fernando"     detail="Emergency · Priority"   badge="Emergency"   variant="emergency" emergency />
                <QueueRow token="2" name="Dilani Silva"        detail="09:00 AM · Walk-in"     badge="Completed"   variant="done" />
              </div>
            </div>

            {/* Float card bottom */}
            <div className="animate-float" style={{
              position:'absolute', bottom:-28, left:-20, zIndex:2,
              background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:14, padding:'14px 18px', backdropFilter:'blur(12px)', whiteSpace:'nowrap',
            }}>
              <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#4ade80' }}>LKR 48,500</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-sub)', marginTop:2 }}>Collected today</div>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid-responsive { grid-template-columns: 1fr !important; }
          .hero-visual-responsive { display: none !important; }
        }
      `}</style>
    </section>
  );
}
