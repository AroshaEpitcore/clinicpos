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
    <section id="how-it-works" className="py-16 md:py-20 lg:py-24 bg-surface-alt">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        <FadeIn className="text-center mb-14 md:mb-16">
          <div className="eyebrow mb-3.5">Simple Setup</div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-ink mb-4">
            Up and running <span className="gradient-text">in minutes</span>
          </h2>
          <p className="text-base text-ink-light leading-relaxed max-w-lg mx-auto">
            No hardware. No complex IT. Just sign up and your clinic is live — we handle everything.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 relative">
          {/* Connector line — desktop only */}
          <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary to-teal" />

          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={0.1 * i} className="text-center px-4 relative z-10">
              <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ type:'spring', stiffness:300 }}
                className="w-14 h-14 rounded-full flex items-center justify-center font-black text-lg text-white mx-auto mb-5 bg-gradient-to-br from-primary to-teal step-ring"
              >{s.n}</motion.div>
              <h3 className="text-sm font-bold text-ink mb-2">{s.title}</h3>
              <p className="text-xs text-ink-light leading-relaxed">{s.desc}</p>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  );
}
