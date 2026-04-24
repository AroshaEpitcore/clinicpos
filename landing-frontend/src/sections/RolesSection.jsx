import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FadeIn from '../components/ui/FadeIn';

function PermRow({ yes, label }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-ink-light">
      <span className={`w-5 h-5 rounded-[6px] shrink-0 flex items-center justify-center text-xs font-bold ${yes ? 'bg-emerald-100 text-emerald-600' : 'bg-ink/5 text-ink-faint'}`}>
        {yes ? '✓' : '✗'}
      </span>
      {label}
    </div>
  );
}

function MiniStat({ num, label, colorCls }) {
  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5">
      <div className={`text-[1.4rem] font-black ${colorCls || 'gradient-text'}`}>{num}</div>
      <div className="text-[0.72rem] mt-0.5 text-ink-light">{label}</div>
    </div>
  );
}

function MiniQueue({ rows }) {
  return (
    <div className="flex flex-col gap-1.5 mt-1.5">
      {rows.map(r => (
        <div key={r.name} className="flex items-center gap-2.5 bg-ink/3 rounded-lg p-2 px-3 text-[0.78rem]">
          <div className="w-[26px] h-[26px] bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[6px] flex items-center justify-center font-black text-[0.72rem] shrink-0 text-white">
            {r.token}
          </div>
          <span className="flex-1 font-semibold text-ink">{r.name}</span>
          <span className={`text-[0.68rem] px-1.5 py-0.5 rounded-[5px] font-bold ${r.cls}`}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}

const roles = [
  {
    id:'receptionist', label:'Receptionist', title:'Receptionist',
    desc:'The front desk powerhouse. Manages the entire patient flow from registration to billing — keeping the clinic running smoothly through the day.',
    perms:[
      { yes:true,  label:'Register & search patients' },
      { yes:true,  label:'Add to queue (Walk-in / Booked / Emergency)' },
      { yes:true,  label:'Print token slips (80mm thermal printer)' },
      { yes:true,  label:'Generate & process invoices' },
      { yes:true,  label:'Record payments (Cash / Card / Insurance)' },
      { yes:true,  label:'Dispense prescriptions (Pharmacy)' },
      { yes:true,  label:'Enter lab results' },
      { yes:false, label:'Write consultations or prescriptions' },
    ],
    visual:(
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <MiniStat num="24"          label="Appointments Today" />
          <MiniStat num="7"           label="Currently Waiting"  colorCls="text-amber-500" />
          <MiniStat num="LKR 48,500" label="Collected"           colorCls="text-emerald-600" />
          <MiniStat num="LKR 12,000" label="Outstanding"         colorCls="text-red-500" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.8rem] font-bold text-ink">Live Queue</span>
            <span className="text-[0.72rem] text-ink-light">All Doctors</span>
          </div>
          <MiniQueue rows={[
            { token:'3', name:'Kasun Jayawardena', status:'With Dr.', cls:'bg-indigo-100 text-indigo-600' },
            { token:'4', name:'Nimal Perera',       status:'Waiting',  cls:'bg-amber-100 text-amber-600' },
            { token:'5', name:'Dilani Silva',        status:'Waiting',  cls:'bg-amber-100 text-amber-600' },
          ]} />
        </div>
      </div>
    ),
  },
  {
    id:'doctor', label:'Doctor', title:'Doctor',
    desc:'Focused view showing only your own patients. Write consultations and prescriptions in one streamlined step with medicine auto-suggest and dosage chips.',
    perms:[
      { yes:true,  label:'View own queue only (doctor isolation)' },
      { yes:true,  label:'Write consultation + prescription in one step' },
      { yes:true,  label:'Custom medicines + food instruction chips' },
      { yes:true,  label:'Create & view lab requests' },
      { yes:true,  label:'Read-only access to patient profiles' },
      { yes:true,  label:'View consultation & prescription history' },
      { yes:false, label:'Add to queue or change appointment status' },
      { yes:false, label:'Access billing or medicine store' },
    ],
    visual:(
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <MiniStat num="12" label="My Patients Today" />
          <MiniStat num="3"  label="Waiting For Me"    colorCls="text-amber-500" />
          <MiniStat num="8"  label="Completed"         colorCls="text-emerald-600" />
          <MiniStat num="2"  label="Online Bookings"   colorCls="text-primary" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[0.8rem] font-bold text-ink">Now Seeing</span>
            <span className="text-[0.72rem] text-emerald-600">● Active</span>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5">
            <div className="text-base font-black mb-1 text-ink">Kasun Jayawardena</div>
            <div className="text-[0.78rem] text-ink-light">Token #3 · 09:15 AM · Walk-in</div>
            <div className="text-[0.75rem] mt-1.5 text-red-500">⚠ Allergy: Penicillin</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id:'nurse', label:'Nurse', title:'Nurse',
    desc:"Record patient vitals before the doctor sees them. Full visibility over today's queue and lab results with a dedicated vitals workflow.",
    perms:[
      { yes:true,  label:'Record patient vitals (BP, pulse, SpO2, temp, weight, height)' },
      { yes:true,  label:'View all patients and appointments' },
      { yes:true,  label:'Browse patient profiles (read-only)' },
      { yes:true,  label:'View & print prescriptions' },
      { yes:true,  label:'Enter lab results' },
      { yes:false, label:'Register or edit patients' },
      { yes:false, label:'Write consultations or prescriptions' },
      { yes:false, label:'Access billing or medicine store' },
    ],
    visual:(
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <MiniStat num="9" label="With Doctor" />
          <MiniStat num="6" label="Still Waiting" colorCls="text-amber-500" />
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5">
          <div className="text-[0.78rem] font-bold mb-2 text-indigo-600">📊 Vitals — Kasun Jayawardena</div>
          <div className="grid grid-cols-2 gap-1.5 text-[0.75rem] text-ink-light">
            <div>BP: <strong className="text-ink">120/80</strong> mmHg</div>
            <div>Pulse: <strong className="text-ink">72</strong> bpm</div>
            <div>Temp: <strong className="text-ink">37.0</strong> °C</div>
            <div>SpO₂: <strong className="text-ink">98</strong> %</div>
          </div>
        </div>
        <div>
          <div className="text-[0.8rem] font-bold mb-1.5 text-ink">All Patients Today</div>
          <MiniQueue rows={[
            { token:'3', name:'Kasun Jayawardena', status:'With Dr.', cls:'bg-indigo-100 text-indigo-600' },
            { token:'2', name:'Dilani Silva',        status:'Done',     cls:'bg-emerald-100 text-emerald-600' },
          ]} />
        </div>
      </div>
    ),
  },
  {
    id:'admin', label:'Admin', title:'Admin',
    desc:"Full control. Manages staff, settings, reports, medicine store, and everything else. The clinic owner's command centre.",
    perms:[
      { yes:true, label:'All receptionist + doctor capabilities' },
      { yes:true, label:'Manage staff (add, edit, deactivate)' },
      { yes:true, label:'Medicine store (add / edit / stock)' },
      { yes:true, label:'Full 7-tab reports with CSV export' },
      { yes:true, label:'Clinic settings (logo, fees, modules)' },
      { yes:true, label:'Doctor schedules & holidays' },
      { yes:true, label:'End-of-day closing & history' },
      { yes:true, label:'Pharmacy supplier management' },
    ],
    visual:(
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <MiniStat num="LKR 184,500" label="Billed This Month" />
          <MiniStat num="LKR 156,000" label="Collected"          colorCls="text-emerald-600" />
          <MiniStat num="3"           label="Low Stock Items"    colorCls="text-amber-500" />
          <MiniStat num="2"           label="Doctors Active"     colorCls="text-primary" />
        </div>
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5">
          <div className="text-[0.78rem] font-semibold mb-2.5 text-ink-faint tracking-widest uppercase">Monthly Revenue</div>
          <div className="flex gap-1 items-end h-10">
            {[60,80,50,90,100,70,85].map((h,i) => (
              <div key={i} className={`flex-1 rounded-[3px] ${i===4 ? 'bg-gradient-to-t from-primary to-teal' : i===3 ? 'bg-primary/50' : 'bg-primary/20'}`}
                   style={{ height:`${h}%` }} />
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
    <section className="py-16 md:py-20 lg:py-24 bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn className="text-center mb-10 md:mb-12">
          <div className="eyebrow mb-3.5">Role-Based Access</div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4 text-ink">
            Every role gets <span className="gradient-text">exactly what they need</span>
          </h2>
          <p className="text-base max-w-lg mx-auto leading-relaxed text-ink-light">
            Fine-grained permissions ensure each staff member sees and does only what's relevant to their role.
          </p>
        </FadeIn>

        <div className="flex justify-center flex-wrap gap-2 mb-8 md:mb-10">
          {roles.map(r => (
            <motion.button key={r.id} onClick={() => setActive(r.id)}
              whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
              className={`px-4 sm:px-6 py-2 rounded-full text-sm font-semibold cursor-pointer border transition-all duration-200
                ${active === r.id
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-transparent shadow-[0_4px_15px_rgba(99,102,241,0.35)]'
                  : 'bg-ink/5 text-ink-light border-ink/10 hover:text-ink'
                }`}>
              {r.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
            <div className="bg-white border border-primary/10 rounded-[20px] p-5 md:p-7 order-first md:order-none shadow-soft-sm">
              {role.visual}
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black mb-3 text-ink">{role.title}</h3>
              <p className="text-sm leading-relaxed mb-6 text-ink-light">{role.desc}</p>
              <div className="flex flex-col gap-2.5">
                {role.perms.map(p => <PermRow key={p.label} yes={p.yes} label={p.label} />)}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
