import FadeIn from '../components/ui/FadeIn';
import { motion } from 'framer-motion';
import { Globe, QrCode, Clock, Phone, Users, ToggleRight } from 'lucide-react';

const perks = [
  { icon: Globe,       text: 'Live at your own subdomain — e.g. familycare.healthcenter.lk' },
  { icon: Users,       text: 'Auto-shows your doctors, services, and working hours' },
  { icon: QrCode,      text: 'Patients can book appointments directly from the page' },
  { icon: ToggleRight, text: 'Turn it on or off anytime from Settings in under a second' },
];

function MockWebsite() {
  return (
    <div className="rounded-2xl overflow-hidden border border-primary/[0.12] shadow-soft-xl bg-white w-full max-w-sm mx-auto">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 border-b border-gray-200">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="ml-2 flex-1 bg-white rounded px-2 py-0.5 text-[0.6rem] text-gray-400 border border-gray-200 truncate">
          familycare.healthcenter.lk
        </div>
      </div>

      {/* Website content mock */}
      <div className="bg-gradient-to-b from-blue-50 to-white px-5 py-5 space-y-4">
        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base mx-auto">🏥</div>
          <p className="font-black text-gray-900 text-sm leading-tight">Family Care Medical</p>
          <p className="text-[0.65rem] text-gray-400">Your health, our priority</p>
          <div className="flex justify-center gap-2 pt-1">
            <span className="px-3 py-1 bg-blue-600 text-white text-[0.6rem] font-bold rounded-lg">Book Appointment</span>
            <span className="px-3 py-1 border border-gray-200 text-gray-500 text-[0.6rem] rounded-lg">Staff Login</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Doctors */}
        <div>
          <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-wider mb-2">Our Doctors</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name:'Dr. Perera', spec:'General' },
              { name:'Dr. Silva',  spec:'Paediatrics' },
            ].map(d => (
              <div key={d.name} className="bg-white border border-gray-100 rounded-xl p-2.5 text-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
                  {d.name.charAt(3)}
                </div>
                <p className="text-[0.6rem] font-semibold text-gray-800">{d.name}</p>
                <p className="text-[0.55rem] text-blue-500">{d.spec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact row */}
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2">
          <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <div>
            <p className="text-[0.55rem] text-gray-400">Call Us</p>
            <p className="text-[0.6rem] font-semibold text-gray-700">+94 77 123 4567</p>
          </div>
          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-auto" />
          <div className="text-right">
            <p className="text-[0.55rem] text-gray-400">Hours</p>
            <p className="text-[0.6rem] font-semibold text-gray-700">Mon–Sat 8am–6pm</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClinicWebsiteSection() {
  return (
    <section className="py-16 md:py-20 lg:py-24 bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — text */}
          <FadeIn>
            <div className="eyebrow mb-3.5">Included in every plan</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-ink mb-5 leading-tight">
              Your clinic gets its own<br />
              <span className="gradient-text">branded website</span> — automatically
            </h2>
            <p className="text-base text-ink-light leading-relaxed mb-8 max-w-md">
              The moment you sign up, your clinic has a live public website at its own link. No developers, no extra cost, no setup. Just fill in your details and it's live.
            </p>

            <ul className="space-y-4 mb-8">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-ink-light leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>

            <motion.a
              href="#contact"
              whileHover={{ translateY: -2 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-br from-primary to-primary-dark shadow-soft-md"
            >
              Get your clinic website →
            </motion.a>
          </FadeIn>

          {/* Right — mock website */}
          <FadeIn delay={0.15}>
            <div className="relative">
              {/* Glow blob */}
              <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-primary/5 to-teal/5 blur-2xl pointer-events-none" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10"
              >
                <MockWebsite />
              </motion.div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 z-20 rounded-xl px-3.5 py-2.5 bg-white border border-primary/[0.12] shadow-soft-md text-center"
              >
                <div className="text-lg font-black text-teal">Live</div>
                <div className="text-[0.6rem] text-ink-faint">instantly</div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -bottom-4 -left-4 z-20 rounded-xl px-3.5 py-2.5 bg-white border border-primary/[0.12] shadow-soft-md"
              >
                <div className="text-lg font-black text-primary">100%</div>
                <div className="text-[0.6rem] text-ink-faint">auto-generated</div>
              </motion.div>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
