import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FadeIn from '../components/ui/FadeIn';

function PermRow({ yes, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:'0.85rem' }}>
      <span style={{
        width:20, height:20, borderRadius:6, flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem',
        background: yes ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
        color: yes ? '#4ade80' : 'var(--text-muted)',
      }}>{yes ? '✓' : '✗'}</span>
      {label}
    </div>
  );
}

function MiniStat({ num, label, color }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.04)', borderRadius:12, padding:14,
      border:'1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize:'1.4rem', fontWeight:800, color: color || undefined }}
           className={!color ? 'gradient-text' : ''}>{num}</div>
      <div style={{ fontSize:'0.72rem', color:'var(--text-sub)', marginTop:2 }}>{label}</div>
    </div>
  );
}

function MiniQueue({ rows }) {
  return (
    <div className="flex flex-col gap-1.5 mt-1.5">
      {rows.map(r => (
        <div key={r.name} style={{
          display:'flex', alignItems:'center', gap:10,
          background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'8px 12px', fontSize:'0.78rem',
        }}>
          <div style={{
            width:26, height:26, borderRadius:6,
            background:'linear-gradient(135deg,#6366f1,#4f46e5)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:800, fontSize:'0.72rem', flexShrink:0,
          }}>{r.token}</div>
          <span style={{ flex:1, fontWeight:600 }}>{r.name}</span>
          <span style={{ fontSize:'0.68rem', padding:'2px 7px', borderRadius:5, fontWeight:600, ...r.style }}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}

const roles = [
  {
    id: 'receptionist', label: 'Receptionist',
    title: 'Receptionist',
    desc: 'The front desk powerhouse. Manages the entire patient flow from registration to billing — keeping the clinic running smoothly through the day.',
    perms: [
      { yes: true,  label: 'Register & search patients' },
      { yes: true,  label: 'Add to queue (Walk-in / Booked / Emergency)' },
      { yes: true,  label: 'Print token slips (80mm thermal printer)' },
      { yes: true,  label: 'Generate & process invoices' },
      { yes: true,  label: 'Record payments (Cash / Card / Insurance)' },
      { yes: true,  label: 'Dispense prescriptions (Pharmacy)' },
      { yes: true,  label: 'Enter lab results' },
      { yes: false, label: 'Write consultations or prescriptions' },
    ],
    visual: (
      <div className="flex flex-col gap-3">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <MiniStat num="24"           label="Appointments Today" />
          <MiniStat num="7"            label="Currently Waiting" color="#fbbf24" />
          <MiniStat num="LKR 48,500"  label="Collected"          color="#4ade80" />
          <MiniStat num="LKR 12,000"  label="Outstanding"        color="#f87171" />
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:'0.8rem', fontWeight:700 }}>Live Queue</span>
            <span style={{ fontSize:'0.72rem', color:'var(--text-sub)' }}>All Doctors</span>
          </div>
          <MiniQueue rows={[
            { token:'3', name:'Kasun Jayawardena', status:'With Dr.', style:{ background:'rgba(99,102,241,0.2)', color:'#a5b4fc' } },
            { token:'4', name:'Nimal Perera',       status:'Waiting',  style:{ background:'rgba(245,158,11,0.15)', color:'#fcd34d' } },
            { token:'5', name:'Dilani Silva',        status:'Waiting',  style:{ background:'rgba(245,158,11,0.15)', color:'#fcd34d' } },
          ]} />
        </div>
      </div>
    ),
  },
  {
    id: 'doctor', label: 'Doctor',
    title: 'Doctor',
    desc: 'Focused view showing only your own patients. Write consultations and prescriptions in one streamlined step with medicine auto-suggest and dosage chips.',
    perms: [
      { yes: true,  label: 'View own queue only (doctor isolation)' },
      { yes: true,  label: 'Write consultation + prescription in one step' },
      { yes: true,  label: 'Custom medicines + food instruction chips' },
      { yes: true,  label: 'Create & view lab requests' },
      { yes: true,  label: 'Read-only access to patient profiles' },
      { yes: true,  label: 'View consultation & prescription history' },
      { yes: false, label: 'Add to queue or change appointment status' },
      { yes: false, label: 'Access billing or medicine store' },
    ],
    visual: (
      <div className="flex flex-col gap-3">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <MiniStat num="12"  label="My Patients Today" />
          <MiniStat num="3"   label="Waiting For Me"     color="#fbbf24" />
          <MiniStat num="8"   label="Completed"          color="#4ade80" />
          <MiniStat num="2"   label="Online Bookings"    color="#67e8f9" />
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:'0.8rem', fontWeight:700 }}>Now Seeing</span>
            <span style={{ fontSize:'0.72rem', color:'#4ade80' }}>● Active</span>
          </div>
          <div style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:'1rem', fontWeight:800, marginBottom:4 }}>Kasun Jayawardena</div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-sub)' }}>Token #3 · 09:15 AM · Walk-in</div>
            <div style={{ fontSize:'0.75rem', color:'#f87171', marginTop:6 }}>⚠ Allergy: Penicillin</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'nurse', label: 'Nurse',
    title: 'Nurse',
    desc: 'Record patient vitals before the doctor sees them. Full visibility over today\'s queue and lab results with a dedicated vitals workflow.',
    perms: [
      { yes: true,  label: 'Record patient vitals (BP, pulse, SpO2, temp, weight, height)' },
      { yes: true,  label: 'View all patients and appointments' },
      { yes: true,  label: 'Browse patient profiles (read-only)' },
      { yes: true,  label: 'View & print prescriptions' },
      { yes: true,  label: 'Enter lab results' },
      { yes: false, label: 'Register or edit patients' },
      { yes: false, label: 'Write consultations or prescriptions' },
      { yes: false, label: 'Access billing or medicine store' },
    ],
    visual: (
      <div className="flex flex-col gap-3">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <MiniStat num="9"  label="With Doctor" />
          <MiniStat num="6"  label="Still Waiting" color="#fbbf24" />
        </div>
        <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:12, padding:14 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#a5b4fc', marginBottom:8 }}>📊 Vitals — Kasun Jayawardena</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:'0.75rem', color:'var(--text-sub)' }}>
            <div>BP: <strong style={{ color:'var(--text)' }}>120/80</strong> mmHg</div>
            <div>Pulse: <strong style={{ color:'var(--text)' }}>72</strong> bpm</div>
            <div>Temp: <strong style={{ color:'var(--text)' }}>37.0</strong> °C</div>
            <div>SpO₂: <strong style={{ color:'var(--text)' }}>98</strong> %</div>
          </div>
        </div>
        <div>
          <div style={{ marginBottom:6, fontSize:'0.8rem', fontWeight:700 }}>All Patients Today</div>
          <MiniQueue rows={[
            { token:'3', name:'Kasun Jayawardena', status:'With Dr.', style:{ background:'rgba(99,102,241,0.2)', color:'#a5b4fc' } },
            { token:'2', name:'Dilani Silva',        status:'Done',     style:{ background:'rgba(16,185,129,0.2)', color:'#4ade80' } },
          ]} />
        </div>
      </div>
    ),
  },
  {
    id: 'admin', label: 'Admin',
    title: 'Admin',
    desc: 'Full control. Manages staff, settings, reports, medicine store, and everything else. The clinic owner\'s command centre.',
    perms: [
      { yes: true, label: 'All receptionist + doctor capabilities' },
      { yes: true, label: 'Manage staff (add, edit, deactivate)' },
      { yes: true, label: 'Medicine store (add / edit / stock)' },
      { yes: true, label: 'Full 7-tab reports with CSV export' },
      { yes: true, label: 'Clinic settings (logo, fees, modules)' },
      { yes: true, label: 'Doctor schedules & holidays' },
      { yes: true, label: 'End-of-day closing & history' },
      { yes: true, label: 'Pharmacy supplier management' },
    ],
    visual: (
      <div className="flex flex-col gap-3">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <MiniStat num="LKR 184,500"  label="Billed This Month" />
          <MiniStat num="LKR 156,000"  label="Collected"          color="#4ade80" />
          <MiniStat num="3"            label="Low Stock Items"     color="#fbbf24" />
          <MiniStat num="2"            label="Doctors Active"      color="#67e8f9" />
        </div>
        <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:12, padding:14, border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:'0.78rem', color:'var(--text-sub)', marginBottom:10, fontWeight:600 }}>MONTHLY REVENUE</div>
          <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:40 }}>
            {[60,80,50,90,100,70,85].map((h,i) => (
              <div key={i} style={{
                flex:1, borderRadius:3, height:`${h}%`,
                background: i === 4
                  ? 'linear-gradient(to top,#6366f1,#06b6d4)'
                  : i === 3 ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)',
              }} />
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default function RolesSection() {
  const [active, setActive] = useState('receptionist');
  const role = roles.find(r => r.id === active);

  return (
    <section style={{ padding:'96px 0' }}>
      <div style={{ maxWidth:1140, margin:'0 auto', padding:'0 24px' }}>
        <FadeIn className="text-center mb-12">
          <div className="eyebrow mb-3.5">Role-Based Access</div>
          <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.15, marginBottom:16 }}>
            Every role gets <span className="gradient-text">exactly what they need</span>
          </h2>
          <p style={{ fontSize:'1.05rem', color:'var(--text-sub)', maxWidth:520, margin:'0 auto', lineHeight:1.75 }}>
            Fine-grained permissions ensure each staff member sees and does only what's relevant to their role.
          </p>
        </FadeIn>

        {/* Tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-10">
          {roles.map(r => (
            <motion.button
              key={r.id}
              onClick={() => setActive(r.id)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding:'9px 22px', borderRadius:100,
                fontSize:'0.85rem', fontWeight:600, cursor:'pointer',
                border:'1px solid rgba(255,255,255,0.1)',
                background: active === r.id
                  ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                  : 'rgba(255,255,255,0.04)',
                color: active === r.id ? '#fff' : 'var(--text-sub)',
                boxShadow: active === r.id ? '0 4px 15px rgba(99,102,241,0.35)' : 'none',
                transition:'all 0.2s',
              }}
            >{r.label}</motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity:0, y:16 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }}
            transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
            style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:40, alignItems:'center' }}
            className="roles-grid-responsive"
          >
            {/* Visual */}
            <div style={{
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:20, padding:28,
            }} className="roles-visual-order">
              {role.visual}
            </div>
            {/* Info */}
            <div>
              <h3 style={{ fontSize:'1.5rem', fontWeight:800, marginBottom:12 }}>{role.title}</h3>
              <p style={{ fontSize:'0.9rem', color:'var(--text-sub)', lineHeight:1.75, marginBottom:24 }}>{role.desc}</p>
              <div className="flex flex-col gap-2.5">
                {role.perms.map(p => <PermRow key={p.label} yes={p.yes} label={p.label} />)}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .roles-grid-responsive { grid-template-columns: 1fr !important; }
          .roles-visual-order { order: -1; }
        }
      `}</style>
    </section>
  );
}
