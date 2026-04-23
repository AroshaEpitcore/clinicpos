import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import FadeIn from '../components/ui/FadeIn';

export default function PricingSection() {
  const [plans,   setPlans]   = useState([]);
  const [yearly,  setYearly]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    fetch('/api/v1/public/landing')
      .then(r => r.json())
      .then(j => {
        if (j.data?.enabled && j.data?.plans?.length) {
          setPlans(j.data.plans);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const midIdx = Math.floor(plans.length / 2);

  return (
    <section id="pricing" style={{ padding:'96px 0', background:'rgba(255,255,255,0.015)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto', padding:'0 24px' }}>
        <FadeIn className="text-center mb-12">
          <div className="eyebrow mb-3.5">Transparent Pricing</div>
          <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.15, marginBottom:16 }}>
            Plans that <span className="gradient-text">grow with you</span>
          </h2>
          <p style={{ fontSize:'1.05rem', color:'var(--text-sub)', maxWidth:520, margin:'0 auto', lineHeight:1.75 }}>
            No hidden fees. No per-doctor charges. All plans include unlimited patients and free onboarding support.
          </p>
        </FadeIn>

        {/* Billing toggle */}
        {!loading && !error && plans.some(p => Number(p.yearly_price) > 0) && (
          <FadeIn className="flex items-center justify-center gap-3 mb-12">
            <span style={{ fontSize:'0.875rem', fontWeight:500, color: !yearly ? 'var(--text)' : 'var(--text-sub)' }}>Monthly</span>
            <label style={{ position:'relative', width:48, height:26, cursor:'pointer', display:'block' }}>
              <input type="checkbox" style={{ opacity:0, width:0, height:0 }} checked={yearly} onChange={e => setYearly(e.target.checked)} />
              <span onClick={() => setYearly(v => !v)} style={{
                position:'absolute', inset:0, borderRadius:26,
                background:'linear-gradient(135deg,#6366f1,#4f46e5)', cursor:'pointer',
              }}>
                <span style={{
                  position:'absolute', width:20, height:20, borderRadius:'50%', background:'#fff',
                  left:3, top:3, transition:'transform 0.3s',
                  transform: yearly ? 'translateX(22px)' : 'none',
                }} />
              </span>
            </label>
            <span style={{ fontSize:'0.875rem', fontWeight:500, color: yearly ? 'var(--text)' : 'var(--text-sub)' }}>Yearly</span>
            <span style={{
              background:'rgba(16,185,129,0.15)', color:'#4ade80',
              border:'1px solid rgba(16,185,129,0.25)',
              fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:100,
            }}>Save 2 months</span>
          </FadeIn>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12" style={{ color:'var(--text-sub)' }}>
            <span className="spinner" /> Loading pricing…
          </div>
        )}

        {error && !loading && (
          <p style={{ textAlign:'center', color:'var(--text-sub)', padding:'40px 0' }}>
            Pricing information coming soon.{' '}
            <a href="#contact" style={{ color:'#a5b4fc' }}>Contact us</a> for details.
          </p>
        )}

        {!loading && !error && (
          <div style={{
            display:'grid', gridTemplateColumns:`repeat(${plans.length}, 1fr)`,
            gap:24, maxWidth:900, margin:'0 auto',
          }} className="pricing-grid-responsive">
            {plans.map((plan, i) => {
              const featured = plans.length > 1 && i === midIdx;
              const mPrice   = Number(plan.monthly_price) || 0;
              const yPrice   = Number(plan.yearly_price)  || 0;
              const price    = yearly && yPrice > 0 ? yPrice : mPrice;
              const period   = yearly ? '/yr' : '/mo';

              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ translateY: -4 }}
                  transition={{ type:'spring', stiffness:300 }}
                  style={{
                    background: featured ? 'linear-gradient(145deg,rgba(99,102,241,0.12),rgba(6,182,212,0.06))' : 'rgba(255,255,255,0.03)',
                    border: featured ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius:20, padding:36, position:'relative',
                    boxShadow: featured ? '0 0 0 1px rgba(99,102,241,0.2), 0 20px 50px rgba(99,102,241,0.15)' : 'none',
                  }}
                >
                  {featured && (
                    <div style={{
                      position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)',
                      background:'linear-gradient(135deg,#6366f1,#06b6d4)',
                      color:'#fff', fontSize:'0.7rem', fontWeight:700,
                      padding:'4px 16px', borderRadius:100, whiteSpace:'nowrap',
                    }}>Most Popular</div>
                  )}
                  <div style={{ fontSize:'1rem', fontWeight:700, marginBottom:6 }}>{plan.name}</div>
                  <div style={{ fontSize:'0.83rem', color:'var(--text-sub)', marginBottom:24, minHeight:36 }}>{plan.description || 'Great for growing clinics'}</div>
                  <div style={{ marginBottom:28 }}>
                    {price > 0 ? (
                      <>
                        <span style={{ fontSize:'2.8rem', fontWeight:900, letterSpacing:'-2px', lineHeight:1 }}>
                          LKR {price.toLocaleString()}
                        </span>
                        <span style={{ fontSize:'0.83rem', color:'var(--text-sub)', marginLeft:4 }}>{period}</span>
                      </>
                    ) : (
                      <span style={{ fontSize:'1.6rem', fontWeight:900 }}>Contact Us</span>
                    )}
                  </div>
                  <a href="#contact" style={{
                    display:'block', textAlign:'center', padding:13,
                    borderRadius:12, fontWeight:700, fontSize:'0.875rem',
                    marginBottom:28, transition:'all 0.2s',
                    ...(featured
                      ? { background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', boxShadow:'0 6px 20px rgba(99,102,241,0.35)' }
                      : { border:'1px solid rgba(255,255,255,0.15)', color:'var(--text)' }),
                  }}>Get Started</a>
                  <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:10 }}>
                    {(plan.features || ['Unlimited patients','All core modules','Free onboarding','Email support']).map((f, fi) => (
                      <li key={fi} style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:'0.83rem', color:'var(--text-sub)' }}>
                        <span style={{
                          width:18, height:18, borderRadius:5, flexShrink:0,
                          background:'rgba(16,185,129,0.2)', color:'#4ade80',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', marginTop:1,
                        }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        )}

        <p style={{ textAlign:'center', marginTop:32, fontSize:'0.82rem', color:'var(--text-muted)' }}>
          All prices in LKR · Yearly billing saves up to 2 months · Enterprise plans available on request
        </p>
      </div>
      <style>{`
        @media (max-width: 640px) { .pricing-grid-responsive { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
