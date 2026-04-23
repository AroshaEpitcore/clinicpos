import FadeIn from '../components/ui/FadeIn';

const features = [
  { n:'01', icon:'🏥', title:'Patient Management',     desc:'Full patient profiles with medical history, visit records, allergies, and document uploads. Find any patient in seconds with smart search.' },
  { n:'02', icon:'📅', title:'Appointment Scheduling', desc:'Smart queuing with token numbers, online booking via patient portal, doctor-wise schedules, and holiday management. Eliminate waiting-room chaos.' },
  { n:'03', icon:'💊', title:'Digital Prescriptions',  desc:'Write prescriptions with auto-suggest medicines, dosage chips, food instructions, and custom medicines — all in one combined consultation step.' },
  { n:'04', icon:'🧪', title:'Lab Management',         desc:'Order tests, track sample collection, enter results with values or file uploads, and show results in the patient\'s consultation history.' },
  { n:'05', icon:'💉', title:'In-Clinic Pharmacy',     desc:'Real-time stock tracking, dispense queue, purchase orders, supplier management, expiry alerts, and automatic stock deduction on dispensing.' },
  { n:'06', icon:'🧾', title:'Billing & Invoicing',    desc:'Auto-generate invoices from consultations. Split payments, insurance claims, custom services, and PDF export — with a live end-of-day report.' },
  { n:'07', icon:'🏢', title:'Insurance & Corporate',  desc:'Manage corporate accounts, process insurance claims with auto-numbered CLM-XXXXX references, and generate monthly billing summaries for insurers.' },
  { n:'08', icon:'👨‍⚕️',title:'Multi-Doctor Support',   desc:'Unlimited doctors, each with their own schedule, consultation fees, and signature. Role-based access for doctors, nurses, receptionists, and admins.' },
  { n:'09', icon:'📊', title:'Reports & Analytics',    desc:'7 report types: daily, monthly, doctor performance, medicines, patients, appointments, and EOD history — all with CSV export and live charts.' },
  { n:'10', icon:'📺', title:'Waiting Room Display',   desc:'A full-screen TV display shows the live queue so patients know their turn. Auto-refreshes every 10 seconds. Emergency alerts in red.' },
  { n:'11', icon:'🌐', title:'Patient Portal',         desc:'Patients book appointments online, download prescriptions, and view their history — 24/7 from any device. Bookings sync instantly to the clinic queue.' },
  { n:'12', icon:'☁️', title:'Cloud & Secure',         desc:'Hosted on enterprise servers with SSL encryption, daily backups, and 99.9% uptime. Access your clinic from any device, anywhere, securely.' },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-20 lg:py-24 bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        <FadeIn className="text-center mb-12 md:mb-14">
          <div className="eyebrow mb-3.5">Everything You Need</div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-ink mb-4">
            One platform, <span className="gradient-text">complete clinic</span>
          </h2>
          <p className="text-base text-ink-light leading-relaxed max-w-lg mx-auto">
            Every tool your clinic needs, beautifully integrated. No switching between systems, no double data entry.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-primary/10 rounded-2xl overflow-hidden divide-y divide-primary/8 sm:divide-y-0">
          {features.map((f, i) => (
            <FadeIn key={f.n} delay={0.04 * (i % 3)}>
              <div className="relative p-7 md:p-8 h-full bg-surface hover:bg-surface-alt transition-colors duration-200 cursor-default border-b border-primary/8 lg:border-b lg:border-r border-primary/8 last:border-b-0">
                <span className="absolute top-3.5 right-4 text-4xl font-black leading-none select-none text-primary/5">{f.n}</span>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 bg-primary/8">{f.icon}</div>
                <h3 className="text-sm font-bold text-ink mb-2">{f.title}</h3>
                <p className="text-xs text-ink-light leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  );
}
