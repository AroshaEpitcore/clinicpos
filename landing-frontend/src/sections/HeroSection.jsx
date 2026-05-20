import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 30 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay },
});

function QueueRow({ token, name, detail, badge, badgeCls, emergency, newPatient }) {
  const tokenBg = emergency
    ? 'bg-gradient-to-br from-red-500 to-red-700'
    : newPatient
      ? 'bg-gradient-to-br from-red-500 to-red-600'
      : 'bg-gradient-to-br from-primary to-teal';
  return (
    <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 border border-primary/10 bg-surface">
      <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${tokenBg}`}>
        {token}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-ink truncate">{name}</div>
        <div className="text-xs text-ink-faint">{detail}</div>
      </div>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${badgeCls}`}>{badge}</span>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-[68px] overflow-hidden bg-surface">
      <div className="absolute inset-0 pointer-events-none hero-radial-bg" />
      <div className="absolute inset-0 pointer-events-none opacity-40 dot-grid" />
      <div className="animate-float absolute -left-24 top-1/4 w-80 h-80 rounded-full bg-primary/5 pointer-events-none blur-[70px]" />
      <div className="animate-float2 absolute -right-16 top-1/3 w-64 h-64 rounded-full bg-teal/5 pointer-events-none blur-[70px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 w-full py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          <div>
            <motion.div {...fadeUp(0)}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 bg-primary/[0.08] border border-primary/20 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-teal block shadow-[0_0_6px_#07A39A]" />
                Now live across Sri Lanka
              </span>
            </motion.div>

            <motion.h1 {...fadeUp(0.08)}
              className="font-black leading-tight tracking-tight mb-5 text-4xl sm:text-5xl lg:text-6xl text-ink">
              The smarter way to<br />
              <span className="gradient-text-animated">run your clinic</span>
            </motion.h1>

            <motion.p {...fadeUp(0.16)} className="text-base text-ink-light leading-relaxed max-w-md mb-9">
              Everything your clinic needs — patients, appointments, prescriptions, lab, pharmacy, and billing — unified in one beautiful, fast platform.
            </motion.p>

            <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-3">
              <a href="#contact"
                 className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-br from-primary to-primary-dark shadow-soft-md hover:-translate-y-0.5 transition-transform duration-150">
                Start Free Trial <ArrowRight size={16} />
              </a>
              <a href="#features"
                 className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm text-primary bg-primary/[0.06] border border-primary/20 hover:-translate-y-0.5 transition-transform duration-150">
                <Play size={15} /> See Features
              </a>
            </motion.div>

            <motion.div {...fadeUp(0.28)} className="flex flex-wrap gap-8 mt-10">
              {[
                { num:'16+',   label:'Modules included' },
                { num:'99.9%', label:'Uptime SLA'       },
                { num:'5min',  label:'Setup time'       },
              ].map(s => (
                <div key={s.label}>
                  <div className="gradient-text text-2xl font-black tracking-tight">{s.num}</div>
                  <div className="text-xs text-ink-faint mt-0.5">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }}
            transition={{ duration:0.8, ease:[0.22,1,0.36,1], delay:0.3 }}
            className="relative hidden lg:block">

            <div className="animate-float2 absolute -top-7 -right-5 z-10 rounded-xl px-4 py-3 bg-white border border-primary/[0.12] shadow-soft-md whitespace-nowrap">
              <div className="text-xl font-black text-primary">+24</div>
              <div className="text-xs text-ink-faint mt-0.5">Patients today</div>
            </div>

            <div className="rounded-2xl p-6 bg-white border border-primary/[0.12] shadow-soft-xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-gradient-to-br from-primary to-teal">🏥</div>
                  <div>
                    <div className="font-bold text-sm text-ink">Today&#39;s Queue</div>
                    <div className="text-xs text-ink-faint">Demo Clinic · Dr. Perera</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal/10 border border-teal/25 text-teal">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal block" /> Live
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <QueueRow token="3" name="Kasun Jayawardena" detail="09:15 AM · Walk-in"  badge="With Doctor" badgeCls="bg-primary/10 text-primary" />
                <QueueRow token="N-2" name="Nimal Perera"     detail="09:30 AM · Online · New patient" badge="Waiting" badgeCls="bg-amber-100 text-amber-700" newPatient />
                <QueueRow token="!" name="Saman Fernando"     detail="Emergency · Priority" badge="Emergency"   badgeCls="bg-red-100 text-red-600" emergency />
                <QueueRow token="2" name="Dilani Silva"        detail="09:00 AM · Walk-in"  badge="Completed"   badgeCls="bg-teal/10 text-teal" />
              </div>
            </div>

            <div className="animate-float absolute -bottom-7 -left-5 z-10 rounded-xl px-4 py-3 bg-white border border-primary/[0.12] shadow-soft-md whitespace-nowrap">
              <div className="text-xl font-black text-teal">LKR 48,500</div>
              <div className="text-xs text-ink-faint mt-0.5">Collected today</div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
