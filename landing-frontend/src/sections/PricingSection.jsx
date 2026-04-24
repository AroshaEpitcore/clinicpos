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
    <section id="pricing" className="py-16 md:py-20 lg:py-24 bg-surface-alt">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn className="text-center mb-10 md:mb-12">
          <div className="eyebrow mb-3.5">Transparent Pricing</div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4 text-ink">
            Plans that <span className="gradient-text">grow with you</span>
          </h2>
          <p className="text-base max-w-lg mx-auto leading-relaxed text-ink-light">
            No hidden fees. No per-doctor charges. All plans include unlimited patients and free onboarding support.
          </p>
        </FadeIn>

        {!loading && !error && plans.some(p => Number(p.yearly_price) > 0) && (
          <FadeIn className="flex items-center justify-center gap-3 mb-10 md:mb-12">
            <span className={`text-sm font-medium ${!yearly ? 'text-ink' : 'text-ink-light'}`}>Monthly</span>
            <label className="relative w-12 h-[26px] cursor-pointer block">
              <input type="checkbox" className="opacity-0 w-0 h-0" checked={yearly} onChange={e => setYearly(e.target.checked)} />
              <span onClick={() => setYearly(v => !v)} className="absolute inset-0 rounded-full cursor-pointer bg-gradient-to-br from-primary to-primary-dark">
                <span className={`absolute w-5 h-5 rounded-full bg-white top-[3px] left-[3px] transition-transform duration-300 ${yearly ? 'translate-x-[22px]' : ''}`} />
              </span>
            </label>
            <span className={`text-sm font-medium ${yearly ? 'text-ink' : 'text-ink-light'}`}>Yearly</span>
            <span className="text-[0.72rem] font-bold px-2.5 py-[3px] rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">
              Save 2 months
            </span>
          </FadeIn>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-ink-light">
            <span className="spinner" /> Loading pricing…
          </div>
        )}

        {error && !loading && (
          <p className="text-center py-10 text-sm text-ink-light">
            Pricing information coming soon.{' '}
            <a href="#contact" className="text-primary hover:text-primary-dark transition-colors">Contact us</a> for details.
          </p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[900px] mx-auto">
            {plans.map((plan, i) => {
              const featured = plans.length > 1 && i === midIdx;
              const mPrice   = Number(plan.monthly_price) || 0;
              const yPrice   = Number(plan.yearly_price)  || 0;
              const isYearly = plan.billing_cycle === 'yearly';
              const price    = isYearly ? yPrice : (yearly && yPrice > 0 ? yPrice : mPrice);
              const period   = isYearly ? '/yr' : (yearly ? '/yr' : '/mo');

              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ translateY: -4 }}
                  transition={{ type:'spring', stiffness:300 }}
                  className={`rounded-[20px] p-7 md:p-9 relative border ${
                    featured
                      ? 'pricing-featured-bg border-indigo-500/35 shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_20px_50px_rgba(99,102,241,0.15)]'
                      : 'bg-white border-primary/10 shadow-soft-sm'
                  }`}
                >
                  {featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[0.7rem] font-bold px-4 py-1 rounded-full whitespace-nowrap bg-gradient-to-r from-indigo-500 to-cyan-400">
                      Most Popular
                    </div>
                  )}
                  <div className="text-base font-bold mb-1.5 text-ink">{plan.name}</div>
                  <div className="text-sm mb-6 min-h-9 text-ink-light">
                    {plan.description || 'Great for growing clinics'}
                  </div>
                  <div className="mb-7">
                    {price > 0 ? (
                      <>
                        <span className="text-[2.8rem] font-black tracking-[-2px] leading-none text-ink">
                          LKR {price.toLocaleString()}
                        </span>
                        <span className="text-sm ml-1 text-ink-light">{period}</span>
                        {isYearly && (
                          <div className="text-[0.75rem] mt-1.5 text-primary">Billed annually</div>
                        )}
                      </>
                    ) : (
                      <span className="text-[1.6rem] font-black text-ink">Contact Us</span>
                    )}
                  </div>
                  <a href="#contact"
                     className={`block text-center py-[13px] rounded-xl font-bold text-sm mb-7 transition-all duration-200 ${
                       featured
                         ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_6px_20px_rgba(99,102,241,0.35)]'
                         : 'border border-ink/20 text-ink hover:bg-ink/5'
                     }`}>
                    Get Started
                  </a>
                  <ul className="flex flex-col gap-2.5">
                    {(plan.features || ['Unlimited patients','All core modules','Free onboarding','Email support']).map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-sm text-ink-light">
                        <span className="w-[18px] h-[18px] bg-emerald-100 text-emerald-600 rounded-[5px] shrink-0 flex items-center justify-center text-[0.65rem] mt-[1px]">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        )}

        <p className="text-center mt-8 text-sm text-ink-faint">
          All prices in LKR · Yearly billing saves up to 2 months · Enterprise plans available on request
        </p>
      </div>
    </section>
  );
}
