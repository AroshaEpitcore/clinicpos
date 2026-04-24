import { motion } from 'framer-motion';
import FadeIn from '../components/ui/FadeIn';

const testimonials = [
  {
    quote: "Setting up was incredibly easy. Within an hour we had all our doctors configured and were taking appointments. The queue display TV screen alone has made our waiting area so much calmer — patients just watch the screen instead of crowding reception.",
    name: 'Dr. Kumara',
    title: 'General Practitioner, Colombo',
    initials: 'DK',
    avatarCls: 'bg-gradient-to-br from-indigo-500 to-purple-500',
  },
  {
    quote: "The billing module saves us at least 2 hours every single day. Insurance claims that used to take a week of paperwork now get done in minutes. The end-of-day closing gives me a perfect summary without any manual counting. Absolutely worth every rupee.",
    name: 'Nisha Perera',
    title: 'Clinic Manager, Kandy',
    initials: 'NP',
    avatarCls: 'bg-gradient-to-br from-cyan-500 to-emerald-500',
  },
  {
    quote: "Our pharmacy stock used to be a nightmare. With real-time tracking, expiry alerts, and the dispense queue we've cut wastage by 40%. The purchase order system with supplier management has completely transformed how we reorder medicines.",
    name: 'Ashan Silva',
    title: 'Pharmacist, Gampaha',
    initials: 'AS',
    avatarCls: 'bg-gradient-to-br from-amber-500 to-rose-500',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-16 md:py-20 lg:py-24 bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn className="text-center mb-12 md:mb-14">
          <div className="eyebrow mb-3.5">Testimonials</div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-ink">
            Trusted by clinics <span className="gradient-text">across Sri Lanka</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={0.1 * i}>
              <motion.div
                whileHover={{ borderColor:'rgba(7,84,142,0.25)', y: -4 }}
                transition={{ duration:0.2 }}
                className="rounded-[18px] p-6 md:p-7 h-full border bg-white border-primary/10 shadow-soft-sm"
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, si) => (
                    <span key={si} className="text-[0.8rem] text-amber-400">★</span>
                  ))}
                </div>
                <span className="block text-5xl leading-none mb-4 text-primary/20">"</span>
                <p className="text-sm leading-relaxed mb-5 text-ink-light">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-[42px] h-[42px] rounded-xl shrink-0 flex items-center justify-center font-black text-sm text-white ${t.avatarCls}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink">{t.name}</div>
                    <div className="text-xs text-ink-light">{t.title}</div>
                  </div>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
