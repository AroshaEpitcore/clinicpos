import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import FadeIn from '../components/ui/FadeIn';

/* ── helpers ─────────────────────────────────────────────────────── */
function Badge({ role }) {
  const map = {
    receptionist: { bg:'rgba(59,130,246,.2)',  color:'#93c5fd' },
    doctor:       { bg:'rgba(16,185,129,.2)',  color:'#6ee7b7' },
    nurse:        { bg:'rgba(168,85,247,.2)',  color:'#d8b4fe' },
    admin:        { bg:'rgba(245,158,11,.2)',  color:'#fcd34d' },
  };
  const s = map[role] || { bg:'rgba(255,255,255,0.1)', color:'var(--text-sub)' };
  return (
    <span style={{
      display:'inline-block', fontSize:11, fontWeight:700,
      padding:'2px 8px', borderRadius:100,
      background:s.bg, color:s.color,
    }}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function Step({ number, title, who=[], desc, tip, next }) {
  return (
    <div style={{ display:'flex', gap:16, position:'relative' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <div style={{
          width:32, height:32, borderRadius:'50%',
          background:'linear-gradient(135deg,#6366f1,#06b6d4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:700, fontSize:13, color:'#fff', flexShrink:0,
        }}>{number}</div>
        {next && <div style={{ width:2, flex:1, background:'var(--card-border)', marginTop:6, minHeight:20 }} />}
      </div>
      <div style={{ paddingBottom:24, flex:1 }}>
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:14, fontWeight:700 }}>{title}</span>
          {who.map(r => <Badge key={r} role={r} />)}
        </div>
        <p style={{ fontSize:13, color:'var(--text-sub)', lineHeight:1.65 }}>{desc}</p>
        {tip && (
          <div style={{
            display:'flex', alignItems:'flex-start', gap:8,
            background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.2)',
            borderRadius:8, padding:'10px 12px', marginTop:10,
          }}>
            <span style={{ fontSize:12 }}>⭐</span>
            <span style={{ fontSize:12, color:'#a5b4fc', lineHeight:1.5 }}>{tip}</span>
          </div>
        )}
        {next && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', marginTop:8 }}>
            → <strong style={{ color:'var(--text-sub)' }}>{next}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 24px', borderBottom:'1px solid var(--card-border)' }}>
        <div style={{
          width:36, height:36, borderRadius:10, fontSize:16, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(99,102,241,0.15)',
        }}>{icon}</div>
        <span style={{ fontSize:15, fontWeight:700 }}>{title}</span>
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
  );
}

function Note({ children }) {
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:10,
      background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.25)',
      borderRadius:10, padding:'12px 14px', marginTop:16,
    }}>
      <span>⚠️</span>
      <span style={{ fontSize:12, color:'#fcd34d', lineHeight:1.6 }}>{children}</span>
    </div>
  );
}

/* ── Tab panels ──────────────────────────────────────────────────── */
function OverviewPanel() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Journey */}
      <div style={{
        background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(6,182,212,.06))',
        border:'1px solid rgba(99,102,241,.2)', borderRadius:20, padding:28,
      }}>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20, textAlign:'center' }}>Complete Patient Journey</h3>
        <Step number={1} title="Patient Arrives or Books Online" who={['receptionist']}
          desc="Patient walks in or books online via the /book portal. Receptionist opens Appointments, clicks Add to Queue, and searches by phone. If new, enter name + phone — patient is auto-registered instantly."
          tip="After 5 digits, phone search auto-suggests matching patients. No need to press Enter."
          next="Patient added to queue with a token number" />
        <Step number={2} title="Print Token Slip" who={['receptionist']}
          desc="After adding to queue, the confirmation screen shows inside the same drawer. Click Print Slip to print an 80mm thermal token slip. Printing automatically marks the patient as Arrived."
          tip="Token slip shows clinic logo, patient name, doctor, and appointment type."
          next="Patient status becomes Arrived" />
        <Step number={3} title="Nurse Records Vitals" who={['nurse']}
          desc="On the Appointments page, the nurse finds the arrived patient and clicks the Vitals button. A modal opens to record BP (systolic/diastolic), pulse, SpO2, temperature, weight, and height. If vitals were already recorded, the form pre-fills for updating."
          tip="Vitals are passed directly to the doctor's consultation form — BP, pulse, temperature, and weight pre-fill automatically when the doctor opens the consultation modal."
          next="Doctor opens consultation with nurse vitals pre-filled" />
        <Step number={4} title="Doctor Sees Patient" who={['doctor']}
          desc="Doctor opens Dashboard — Now Seeing card shows the current arrived patient, Next Up shows who is waiting. Dashboard auto-refreshes every 30 seconds. Click Consult on an arrived appointment row."
          next="Consultation modal opens with nurse vitals pre-filled" />
        <Step number={5} title="Write Consultation + Prescription" who={['doctor']}
          desc="A blue Nurse Vitals banner shows recorded values at the top of the Vitals section. BP, pulse, temperature, and weight are pre-filled. Enter Chief Complaint (required), review/adjust vitals, add clinical notes, ICD-10 code, optional follow-up. To prescribe, search medicines → select dosage/frequency/duration chips → quantity auto-calculates. Click Save & Complete."
          tip="Consultation and prescription are saved together in one click. Appointment auto-flips to Completed."
          next="Appointment marked Completed → Receptionist can bill" />
        <Step number={6} title="Dispense Medicines (if Pharmacy ON)" who={['receptionist','admin']}
          desc="Go to Pharmacy → Dispense Queue. Find the prescription, click Dispense. Review allergy warning and stock levels. Confirm → stock deducted automatically."
          next="Prescription marked Dispensed" />
        <Step number={7} title="Generate Invoice & Collect Payment" who={['receptionist','admin']}
          desc="On Billing page, click Bill on a completed appointment. Invoice auto-created with doctor fee + medicines. Add extra services with + Add Item. Click Record Payment → choose Cash / Card / Online / Insurance. Partial payments supported."
          next="Invoice marked Paid" />
        <Step number={8} title="End of Day Closing" who={['receptionist','admin']}
          desc="Click End of Day on Billing page header. Count physical cash and enter it. System compares against total collected — green (match), amber (surplus), red (short). Add notes → Close Day & Lock. Cannot be undone." />
      </div>

      {/* Role cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
        {[
          { icon:'👩‍💼', role:'receptionist', items:['Register & search patients','Add patients to queue & print token slips','Generate invoices & collect payments','End of Day closing','Pharmacy dispense queue','Lab requests & results'] },
          { icon:'👨‍⚕️', role:'doctor',       items:['View own patient queue only','Write consultations & prescriptions','Prescribe with food instruction chips','Order & view lab results','Full patient history (read)'] },
          { icon:'🩺',   role:'nurse',        items:['Record patient vitals (BP, pulse, SpO2, temp, weight, height)','View appointments queue','Browse & print prescriptions','Enter lab test results','View patient profile & history'] },
          { icon:'⚙️',   role:'admin',        items:['All receptionist + doctor access','Manage staff (add/edit/deactivate)','Medicine Store management','7-tab reports with CSV export','Clinic settings, fees, branding','Working hours & holidays'] },
        ].map(({ icon, role, items }) => (
          <div key={role} style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:16, padding:22 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <span style={{ fontSize:20 }}>{icon}</span>
              <Badge role={role} />
            </div>
            <ul style={{ listStyle:'none' }}>
              {items.map(item => (
                <li key={item} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:'var(--text-sub)', marginBottom:8 }}>
                  <span style={{ color:'#10b981', flexShrink:0, marginTop:1 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReceptionistPanel() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <Section icon="👥" title="Patient Registration">
        <Step number={1} title="Search Before Registering" who={['receptionist']}
          desc="Always search by phone first. Type at least 5 digits — suggestions appear automatically. If patient exists, click Use Existing Patient." next="Patient found → add to queue" />
        <Step number={2} title="Register a New Patient" who={['receptionist']}
          desc="If no match found, enter First Name and Phone Number only (required). All other fields — DOB, NIC, address, emergency contact, insurance — are optional." next="Patient created → add to queue" />
        <Step number={3} title="Duplicate Warning" who={['receptionist']}
          desc="If a possible duplicate is detected (same phone, or same name + DOB, or same NIC), a warning modal shows the matches. Choose Use Existing Patient or Register Anyway." />
      </Section>
      <Section icon="📅" title="Queue Management">
        <Step number={1} title="Add to Queue — Walk-in" who={['receptionist']}
          desc="Click Add to Queue → Walk-in tab. Search or create patient, pick doctor, optionally set time. Token number is auto-assigned."
          tip="Walk-in tab is hidden if Allow Walk-ins is turned OFF in Settings → Appointments."
          next="Confirmation screen shown in same drawer" />
        <Step number={2} title="Add to Queue — Booked Slot" who={['receptionist']}
          desc="Click Add to Queue → Book tab. Pick date, doctor, then click an available time slot. Bookings are blocked on clinic holidays." next="BK-XXXXXX booking reference assigned" />
        <Step number={3} title="Print Token Slip" who={['receptionist']}
          desc="After adding to queue, click Print Slip → browser auto-prints a thermal-formatted slip. Printing marks the patient as Arrived."
          tip="You can also print from any queue row using the Print button — also marks Arrived." next="Patient status → Arrived" />
        <Step number={4} title="Status Actions" who={['receptionist']}
          desc="Each row has action buttons: Pending/Confirmed → Arrived or Cancel. Arrived → Complete or Cancel. Completed and Cancelled rows have no actions." />
        <Note>Emergency appointments can only be created by Admin (lightning bolt icon on queue row).</Note>
      </Section>
      <Section icon="🧾" title="Billing & Payments">
        <Step number={1} title="Create Invoice" who={['receptionist','admin']}
          desc="Billing page → find a completed appointment row → click Bill. Invoice auto-created with doctor fee + all prescribed medicines." next="Invoice modal opens" />
        <Step number={2} title="Add Extra Items" who={['receptionist','admin']}
          desc="Click + Add Item → 3-tab overlay: Service tab (custom services), Medicine tab (search stock), Custom tab (free-text with quantity and price)." next="Totals update automatically" />
        <Step number={3} title="Record Payment" who={['receptionist','admin']}
          desc="Click Record Payment → select Cash / Card / Online / Insurance, enter amount, optional reference. Call Record Payment again for split/partial payments." next="Status updates to Partial or Paid" />
        <Step number={4} title="End of Day" who={['receptionist','admin']}
          desc="Click End of Day on Billing page header. Enter physical cash count. Compare against system total. Add notes → Close Day & Lock. Cannot be undone." />
      </Section>
    </div>
  );
}

function DoctorPanel() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <Section icon="🏠" title="Your Dashboard">
        <Step number={1} title="Understanding Your Dashboard" who={['doctor']}
          desc="Shows only your patients. Stat cards: Total Today, Waiting, Completed, Online Booked. Now Seeing card highlights the current Arrived patient with allergies and last complaint. Next Up shows the first waiting patient."
          tip="Dashboard auto-refreshes every 30 seconds — new arrivals appear automatically without manual refresh." />
      </Section>
      <Section icon="🩺" title="Writing a Consultation">
        <Step number={1} title="Start a Consultation" who={['doctor']}
          desc="On Appointments page or Dashboard queue, click Consult on an Arrived row. Only your patients show the Consult button." next="Consultation modal opens" />
        <Step number={2} title="Fill Chief Complaint" who={['doctor']}
          desc="Chief Complaint is the only required field — fill this first. A red allergy banner appears at the top if the patient has allergies on record." next="Proceed to vitals and notes" />
        <Step number={3} title="Enter Vitals & Clinical Notes (optional)" who={['doctor']}
          desc="If the nurse recorded vitals before you opened the consultation, a blue Nurse Vitals banner appears at the top of the Vitals section showing BP, pulse, SpO2, temperature, weight, height, and who recorded them. BP, pulse, temperature, and weight are pre-filled in the form — adjust only if values have changed. Clinical notes: symptoms, diagnosis, ICD-10 code, doctor notes, follow-up date."
          tip="Nurse vitals are pre-populated automatically — you only need to update a value if it has changed since the nurse recorded it."
          next="Add medicines (optional)" />
        <Step number={4} title="Prescribe Medicines (optional)" who={['doctor']}
          desc="Search a medicine name → live suggestions appear. Select from store (✓ from store) or type custom name (✎ custom). Per medicine: Dosage chips, Frequency chips, Duration chips. Quantity auto-calculates. Food instructions: Before food / After food / With food / At bedtime."
          tip="Quantity = Math.ceil(dose × frequency × duration days). You can override it manually."
          next="Click Save & Complete" />
        <Step number={5} title="Save & Complete" who={['doctor']}
          desc="Click Save & Complete. Consultation saved, prescription saved (if medicines added), appointment flips to Completed automatically. Rx number shown in banner. Print Rx button activates." />
        <Note>If you saved without medicines, a Write Rx button appears on the completed row. Click it to add a prescription later. Once saved, Write Rx disappears.</Note>
      </Section>
      <Section icon="🧪" title="Lab Tests (if enabled)">
        <Step number={1} title="Order Lab Tests" who={['doctor']}
          desc="Go to Lab → New Request. Search patient by name or phone. Select tests from the catalog. Submit — request added to lab queue." next="Lab staff enters results" />
        <Step number={2} title="View Results" who={['doctor']}
          desc="Completed results appear in the Lab Queue with a Done badge. Click a request to see result value, unit, reference range, notes, and any uploaded file. Results also appear inside the Consultation and Prescription detail modals." />
      </Section>
    </div>
  );
}

function NursePanel() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <Section icon="📊" title="Patient Vitals">
        <Step number={1} title="Open Appointments Page" who={['nurse']}
          desc="Go to the Appointments page. You have full access to the queue for all doctors today. Find the patient whose vitals you need to record — they must have Arrived status for the Vitals button to appear."
          next="Click Vitals button on the arrived row" />
        <Step number={2} title="Record Vitals" who={['nurse']}
          desc="Click the Vitals button on the arrived patient's row. A modal opens with fields for BP Systolic, BP Diastolic, Pulse (bpm), SpO2 (%), Temperature (°C), Weight (kg), Height (cm), and Notes. All fields are optional — fill what is relevant."
          tip="If vitals were already recorded for this appointment, all fields pre-fill automatically so you can review and update them."
          next="Click Save Vitals" />
        <Step number={3} title="Doctor Sees Your Vitals" who={['nurse']}
          desc="When the doctor opens the consultation modal, a blue Nurse Vitals banner shows all the values you recorded — BP, pulse, SpO2, temperature, weight, height, and your name. BP, pulse, temperature, and weight are also pre-filled in the consultation form automatically." />
        <Note>Both nurses and doctors can record vitals for arrived patients. The nurse vitals record is preserved even if the doctor adjusts values during the consultation.</Note>
      </Section>
      <Section icon="💊" title="Prescriptions">
        <Step number={1} title="Browse Prescriptions" who={['nurse']}
          desc="Go to Prescriptions page. Use date navigation for any date. Filter by doctor tab. Use search bar to find by patient name, Rx number, or doctor name." next="Click a prescription card to open details" />
        <Step number={2} title="View Prescription Details" who={['nurse']}
          desc="Click any Rx card → detail modal opens. Shows patient info, doctor info, all medicines with dosage/frequency/duration/food instructions, and lab tests ordered in the same visit." next="Print if needed" />
        <Step number={3} title="Print a Prescription" who={['nurse']}
          desc="Inside the Rx detail modal, click Print. A formatted prescription opens in a new window with clinic name, doctor signature, and all medicines listed." />
      </Section>
      <Section icon="🧪" title="Lab (if enabled)">
        <Step number={1} title="Enter Lab Results" who={['nurse']}
          desc="Go to Lab → Lab Queue tab. Find a pending request (Pending badge). Click to expand → Enter Result. Type result value, unit, reference range, notes, and optionally upload a PDF or image file. Status changes to Done automatically." />
        <Note>Nurses cannot create new lab requests or manage the test catalog. Only receptionists, doctors, and admin can create requests.</Note>
      </Section>
    </div>
  );
}

function AdminPanel() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <Section icon="👥" title="Staff Management">
        <Step number={1} title="Add New Staff" who={['admin']}
          desc="Staff page → Add Staff. Enter name, email, password, role (doctor/nurse/receptionist/admin), and optionally phone, specialization, registration number. Staff can log in immediately."
          tip="A clinic can have multiple doctors — there is no limit."
          next="Staff can log in with their email + password" />
        <Step number={2} title="Edit or Reset Password" who={['admin']}
          desc="Click pencil icon on any staff card to edit details. Click Reset Password to set a new password for them." next="Changes take effect immediately" />
        <Step number={3} title="Deactivate Staff" who={['admin']}
          desc="Toggle the status on a staff card to deactivate. Deactivated staff cannot log in. You cannot deactivate your own account." />
      </Section>
      <Section icon="⚙️" title="Clinic Settings (8 Tabs)">
        <Step number={1} title="Clinic Tab" who={['admin']}
          desc="Set clinic name, address, phone, email. Upload clinic logo (JPG/PNG, max 2MB) — shown on token slips, prescription PDFs, and the online booking portal." />
        <Step number={2} title="Billing Tab" who={['admin']}
          desc="Set currency code (default LKR), tax label, and tax rate %. Tax is applied to all invoices automatically." />
        <Step number={3} title="Appointments Tab" who={['admin']}
          desc="Set slot duration (10–60 min), max patients per day, and toggle Allow Walk-ins. When walk-ins are off, the Walk-in tab is hidden and blocked at the backend." />
        <Step number={4} title="Security Tab" who={['admin']}
          desc="Enable Patient Portal — generates a public /book URL for online booking. Enable Queue Display — generates a /display URL for the waiting room TV screen (auto-refreshes every 10 seconds)." />
        <Step number={5} title="Doctor Fees Tab" who={['admin']}
          desc="Set the consultation fee per doctor (auto-applied when billing). Upload doctor signature (JPG/PNG) — appears on prescription PDFs." />
        <Step number={6} title="Custom Services Tab" who={['admin']}
          desc="Add clinic-specific services (e.g. Dressing, Blood Test, X-Ray) with name, category, and default price. These appear in Invoice → Add Item → Services tab." />
      </Section>
      <Section icon="📊" title="Reports (7 Types)">
        <Step number={1} title="Daily Report" who={['admin']}
          desc="Appointment breakdown, revenue summary, payment method totals, top diagnoses. Pick any date. CSV export." />
        <Step number={2} title="Monthly + Doctors Reports" who={['admin']}
          desc="Monthly: bar chart of billed vs collected per day. Doctors: per-doctor consultations, patients seen, revenue — with date range picker and CSV export." />
        <Step number={3} title="Medicines, Patients, Appointments, EOD History" who={['admin']}
          desc="Medicines: stock overview, low stock, near expiry, top prescribed. Patients: registration stats, demographics. Appointments: status/type breakdown, busiest day. EOD History: all closing records with cash discrepancy highlighted." />
      </Section>
      <Section icon="💊" title="Medicine Store">
        <Step number={1} title="Add Medicine" who={['admin']}
          desc="Medicine Store → Add Medicine. Fill name (required), generic name, brand, unit (required), strength, category, selling price, initial stock, reorder level, and expiry date. Medicine is immediately available for prescriptions." />
        <Step number={2} title="Monitor Low Stock" who={['admin']}
          desc="Low Stock tab shows medicines at or below their reorder level (red). Near Expiry tab shows medicines expiring within 60 days (amber). A Low Stock stat card on the Admin Dashboard shows a red border when any medicines are low — click to go directly to the Low Stock tab." />
      </Section>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
const TABS = [
  { id:'overview',      label:'🗺️ Overview',          panel: <OverviewPanel /> },
  { id:'receptionist',  label:'👩‍💼 Receptionist',      panel: <ReceptionistPanel /> },
  { id:'doctor',        label:'👨‍⚕️ Doctor',             panel: <DoctorPanel /> },
  { id:'nurse',         label:'🩺 Nurse',              panel: <NursePanel /> },
  { id:'admin',         label:'⚙️ Admin',              panel: <AdminPanel /> },
];

export default function GuidePage() {
  const [active, setActive] = useState('overview');

  return (
    <>
      <Navbar />
      <div style={{ paddingTop:68 }}>
        {/* Hero */}
        <FadeIn>
          <div style={{ textAlign:'center', padding:'64px 24px 40px' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(99,102,241,.15)', border:'1px solid rgba(99,102,241,.3)',
              color:'#a5b4fc', borderRadius:100, padding:'6px 16px', fontSize:13, fontWeight:600, marginBottom:20,
            }}>📖 User Guide</div>
            <h1 style={{
              fontSize:'clamp(28px,5vw,48px)', fontWeight:800, lineHeight:1.15, marginBottom:16,
              background:'linear-gradient(135deg,#fff 30%,#94a3b8)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>Step-by-Step Guide for Every Role</h1>
            <p style={{ fontSize:16, color:'var(--text-sub)', maxWidth:560, margin:'0 auto' }}>
              Learn how each part of the system works and how every step connects to the next — from patient arrival to invoice payment.
            </p>
          </div>
        </FadeIn>

        {/* Tabs */}
        <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px' }}>
          <div style={{
            display:'flex', gap:4,
            background:'var(--card-bg)', border:'1px solid var(--card-border)',
            borderRadius:12, padding:6, flexWrap:'wrap', marginBottom:32,
          }}>
            {TABS.map(t => (
              <motion.button
                key={t.id}
                onClick={() => setActive(t.id)}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex:1, minWidth:100, padding:'10px 14px', borderRadius:8, border:'none',
                  background: active === t.id ? 'var(--indigo)' : 'transparent',
                  color: active === t.id ? '#fff' : 'var(--text-sub)',
                  fontSize:13, fontWeight:600, cursor:'pointer',
                  transition:'all .2s', fontFamily:'inherit',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                }}
              >{t.label}</motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity:0, y:12 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-8 }}
              transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
              style={{ paddingBottom:80 }}
            >
              {TABS.find(t => t.id === active)?.panel}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </>
  );
}
