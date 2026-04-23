import FadeIn from '../components/ui/FadeIn';

const features = [
  { n:'01', icon:'🏥', color:'rgba(99,102,241,0.15)',  title:'Patient Management',       desc:'Full patient profiles with medical history, visit records, allergies, and document uploads. Find any patient in seconds with smart search.' },
  { n:'02', icon:'📅', color:'rgba(6,182,212,0.15)',   title:'Appointment Scheduling',   desc:'Smart queuing with token numbers, online booking via patient portal, doctor-wise schedules, and holiday management. Eliminate waiting-room chaos.' },
  { n:'03', icon:'💊', color:'rgba(168,85,247,0.15)',  title:'Digital Prescriptions',    desc:'Write prescriptions with auto-suggest medicines, dosage chips, food instructions, and custom medicines — all in one combined consultation step.' },
  { n:'04', icon:'🧪', color:'rgba(16,185,129,0.15)',  title:'Lab Management',           desc:'Order tests, track sample collection, enter results with values or file uploads, and show results in the patient’s consultation history automatically.' },
  { n:'05', icon:'💉', color:'rgba(245,158,11,0.15)',  title:'In-Clinic Pharmacy',       desc:'Real-time stock tracking, dispense queue, purchase orders, supplier management, expiry alerts, and automatic stock deduction on dispensing.' },
  { n:'06', icon:'🧾', color:'rgba(244,63,94,0.15)',   title:'Billing & Invoicing',      desc:'Auto-generate invoices from consultations. Split payments, insurance claims, custom services, and PDF export — with a live end-of-day report.' },
  { n:'07', icon:'🏢', color:'rgba(20,184,166,0.15)',  title:'Insurance & Corporate',    desc:'Manage corporate accounts, process insurance claims with auto-numbered CLM-XXXXX references, and generate monthly billing summaries for insurers.' },
  { n:'08', icon:'👨‍⚕️',color:'rgba(99,102,241,0.15)', title:'Multi-Doctor Support',     desc:'Unlimited doctors, each with their own schedule, consultation fees, and signature. Role-based access for doctors, nurses, receptionists, and admins.' },
  { n:'09', icon:'📊', color:'rgba(249,115,22,0.15)',  title:'Reports & Analytics',      desc:'7 report types: daily, monthly, doctor performance, medicines, patients, appointments, and EOD history — all with CSV export and live charts.' },
  { n:'10', icon:'📺', color:'rgba(14,165,233,0.15)',  title:'Waiting Room Display',     desc:'A full-screen TV display shows the live queue so patients know their turn without crowding reception. Auto-refreshes every 10 seconds.' },
  { n:'11', icon:'🌐', color:'rgba(132,204,22,0.15)',  title:'Patient Portal',           desc:'Patients book appointments online, download prescriptions, and view their history — 24/7 from any device. Bookings sync instantly to the clinic queue.' },
  { n:'12', icon:'☁️', color:'rgba(236,72,153,0.15)',  title:'Cloud & Secure',           desc:'Hosted on enterprise servers with SSL encryption, daily backups, and 99.9% uptime. Access your clinic from any device, anywhere, securely.' },
];

export default function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '96px 0' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px' }}>
        <FadeIn className="text-center mb-14">
          <div className="eyebrow mb-3.5">Everything You Need</div>
          <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.15, marginBottom:16 }}>
            One platform, <span className="gradient-text">complete clinic</span>
          </h2>
          <p style={{ fontSize:'1.05rem', color:'var(--text-sub)', maxWidth:520, margin:'0 auto', lineHeight:1.75 }}>
            Every tool your clinic needs, beautifully integrated. No switching between systems, no double data entry.
          </p>
        </FadeIn>

        <div style={{
          display:'grid', gridTemplateColumns:'repeat(3,1fr)',
          gap:2, background:'rgba(255,255,255,0.05)',
          borderRadius:20, overflow:'hidden',
          border:'1px solid rgba(255,255,255,0.07)',
        }} className="features-grid-responsive">
          {features.map((f, i) => (
            <FadeIn key={f.n} delay={0.04 * (i % 3)}>
              <div style={{
                background:'var(--dark)', padding:'36px 32px',
                transition:'background 0.2s', position:'relative', overflow:'hidden',
                cursor:'default',
                height: '100%',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}
              >
                <div style={{
                  position:'absolute', top:14, right:18,
                  fontSize:'2.5rem', fontWeight:900, color:'rgba(255,255,255,0.03)',
                  lineHeight:1, letterSpacing:'-2px', userSelect:'none',
                }}>{f.n}</div>
                <div style={{
                  width:52, height:52, borderRadius:14,
                  background:f.color, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:'1.5rem', marginBottom:18,
                }}>{f.icon}</div>
                <h3 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:10 }}>{f.title}</h3>
                <p style={{ fontSize:'0.83rem', color:'var(--text-sub)', lineHeight:1.7 }}>{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 1024px) { .features-grid-responsive { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 640px)  { .features-grid-responsive { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
