import { useState } from 'react';
import {
  BookOpen, Users, Calendar, Stethoscope, Pill, Receipt,
  Package, FlaskConical, Shield, UserCog, BarChart2,
  CheckCircle, ArrowRight, AlertCircle, ClipboardList, Star,
  LayoutDashboard, Settings, Activity, QrCode,
} from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import { PageHeader }  from '../../components/ui/PageHeader';
import { useAuth }     from '../../store/AuthContext';

// ── helpers ────────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    receptionist: 'bg-blue-100 text-blue-700',
    doctor:       'bg-green-100 text-green-700',
    nurse:        'bg-purple-100 text-purple-700',
    admin:        'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[role] || 'bg-gray-100 text-gray-600'}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function Step({ number, title, who = [], description, tip, next }) {
  return (
    <div className="relative flex gap-4">
      {/* connector line */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        {next && <div className="w-0.5 flex-1 bg-[var(--color-border)] mt-2 min-h-[24px]" />}
      </div>
      {/* content */}
      <div className={`pb-6 flex-1 ${!next ? '' : ''}`}>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
          {who.map(r => <RoleBadge key={r} role={r} />)}
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
        {tip && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-[var(--radius)] bg-[var(--color-primary-light)] border border-[var(--color-primary)]">
            <Star className="w-3.5 h-3.5 text-[var(--color-primary)] mt-0.5 shrink-0" />
            <p className="text-xs text-[var(--color-primary)]">{tip}</p>
          </div>
        )}
        {next && (
          <div className="mt-2 flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
            <ArrowRight className="w-3 h-3" /> <span>Next: <span className="font-medium text-[var(--color-text)]">{next}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)]">
        <div className="w-8 h-8 rounded-[var(--radius)] bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Note({ children }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius)] bg-[#fffbeb] border border-[var(--color-warning,#f59e0b)] mt-4">
      <AlertCircle className="w-4 h-4 text-[var(--color-warning,#d97706)] shrink-0 mt-0.5" />
      <p className="text-xs text-[var(--color-warning,#d97706)] leading-relaxed">{children}</p>
    </div>
  );
}

// ── Tab content ─────────────────────────────────────────────────────────────────
function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-4">Complete Patient Journey</h3>
        <div className="space-y-0">
          <Step number={1} title="Patient Arrives or Books Online" who={['receptionist']}
            description="Patient walks in or books online via the /book portal. Receptionist opens Appointments page, clicks Add to Queue, searches the patient by phone number. If new, enter name + phone — patient is auto-registered."
            tip="After 5 digits, the phone search auto-suggests matching patients. No need to press Enter."
            next="Patient is added to the queue with a token number" />
          <Step number={2} title="Print Token Slip" who={['receptionist']}
            description="After adding to queue, the confirmation screen shows inside the same drawer. Click Print Slip to print an 80mm thermal token slip with the patient's token number, doctor, and time. Printing automatically marks the patient as Arrived."
            tip="Token slip shows the clinic logo, patient name, doctor, and appointment type badge."
            next="Patient status becomes Arrived" />
          <Step number={3} title="Nurse Records Vitals" who={['nurse']}
            description="On the Appointments page, find the arrived patient and click the Vitals button. A modal opens to record BP (systolic/diastolic), pulse, SpO2, temperature, weight, and height. If vitals were already recorded, the form pre-fills for updating."
            tip="If vitals were recorded previously for this appointment, the form pre-loads with those values so the nurse can update them."
            next="Vitals saved → Doctor opens consultation" />
          <Step number={4} title="Doctor Sees Patient" who={['doctor']}
            description="Doctor opens their Dashboard — the Now Seeing card shows the current arrived patient, Next Up shows who is waiting. On the Appointments page, click Consult on an arrived patient row to open the consultation modal."
            tip="The Doctor dashboard auto-refreshes every 30 seconds — no manual refresh needed."
            next="Consultation modal opens with nurse vitals pre-filled" />
          <Step number={5} title="Write Consultation + Prescription" who={['doctor']}
            description="The Consult modal shows a blue banner at the top of the Vitals section with all nurse-recorded values. BP, pulse, temperature, and weight are pre-populated in the form. Enter Chief Complaint (required), review/adjust vitals, add Clinical Notes, ICD-10 code, and optional follow-up date. To prescribe medicines, search the medicine store — select dosage/frequency/duration chips and quantity auto-calculates. Click Save & Complete."
            tip="Prescription is saved at the same time as the consultation in one click. Appointment automatically flips to Completed."
            next="Appointment marked Completed → Receptionist can bill" />
          <Step number={6} title="Dispense Medicines (optional)" who={['receptionist', 'admin']}
            description="If the Pharmacy module is ON, go to Pharmacy → Dispense Queue. Find the prescription and click Dispense. Review the allergy warning and stock levels, then confirm. Stock is automatically deducted."
            tip="Low stock is shown in red inside the Dispense modal. A warning toast appears after dispensing if any medicine falls below its reorder level."
            next="Prescription marked Dispensed → Stock updated" />
          <Step number={7} title="Generate Invoice & Collect Payment" who={['receptionist', 'admin']}
            description="On the Billing page, find the completed appointment and click Bill. An invoice is auto-created with the doctor fee and prescribed medicines. Add extra services if needed using the + Add Item button. Click Record Payment and select Cash / Card / Online / Insurance / QR Pay. Enter the amount — partial payments are supported."
            tip="QR Pay: selecting QR Pay opens a dialog showing your clinic's Lanka QR code and the exact amount. Patient scans with their bank app — receptionist clicks Payment Received to confirm."
            next="Payment recorded → Invoice marked Paid" />
          <Step number={8} title="End of Day Closing" who={['receptionist', 'admin']}
            description="At the end of the day, click End of Day on the Billing page header. Count your physical cash and enter it. The system compares it against the total collected — green means matched, amber means surplus, red means short. Add notes if needed and click Close Day & Lock."
            next="Day is locked — cannot re-open from the UI" />
        </div>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { role: 'receptionist', color: 'blue', icon: Users, items: ['Register & search patients', 'Add patients to queue', 'Print token slips', 'Manage prescriptions view', 'Generate invoices & collect payments', 'End of Day closing', 'Pharmacy dispense queue', 'Lab requests & results'] },
          { role: 'doctor',       color: 'green', icon: Stethoscope, items: ['View own patient queue', 'Write consultations', 'Prescribe medicines (with food chips)', 'Write standalone prescriptions', 'Order lab tests', 'View patient history', 'Enter lab results'] },
          { role: 'nurse',        color: 'purple', icon: ClipboardList, items: ['Record patient vitals (BP, pulse, SpO2, temp, weight, height)', 'View appointments queue', 'Browse prescriptions & print', 'Enter lab test results', 'View patient profile & history'] },
          { role: 'admin',        color: 'amber', icon: UserCog, items: ['All receptionist + doctor access', 'Manage staff (add/edit/reset password)', 'Medicine Store management', 'View full reports (7 report types)', 'Clinic settings & branding', 'Doctor fees & custom services', 'Set working hours & holidays', 'Subscription page'] },
        ].map(({ role, color, icon: Icon, items }) => (
          <div key={role} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-[var(--color-primary)]" />
              <RoleBadge role={role} />
            </div>
            <ul className="space-y-1.5">
              {items.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                  <CheckCircle className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0 mt-0.5" />
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

function ReceptionistTab() {
  return (
    <div className="space-y-6">
      <Section icon={Users} title="Patient Registration">
        <Step number={1} title="Search Before Registering" who={['receptionist']}
          description="Always search by phone number first (Patients page or Add to Queue modal). Type at least 5 digits — suggestions appear automatically. If the patient already exists, click Use Existing Patient." next="Patient found → add to queue" />
        <Step number={2} title="Register a New Patient" who={['receptionist']}
          description="If no match found, enter First Name and Phone Number (only required fields). All other fields (DOB, NIC, address, emergency contact, insurance) are optional and can be filled later from the patient profile." next="Patient created → add to queue" />
        <Step number={3} title="Duplicate Warning" who={['receptionist']}
          description="If the system detects a possible duplicate (same phone, or same name + DOB, or same NIC), a warning modal shows matching patients. You can pick Use Existing Patient or Register Anyway if they are genuinely different people." />
      </Section>

      <Section icon={Calendar} title="Queue Management">
        <Step number={1} title="Open Appointments Page" who={['receptionist']}
          description="Today's appointments load by default. Use the prev/next arrows or date picker to go to other dates. Doctor filter tabs appear automatically when multiple doctors have bookings." next="Add patients to queue" />
        <Step number={2} title="Add to Queue — Walk-in" who={['receptionist']}
          description="Click Add to Queue → Walk-in tab. Search or create patient, pick doctor, optionally set time. Token number is auto-assigned." tip="Walk-in tab is hidden if Allow Walk-ins is turned OFF in Settings → Appointments." next="Confirmation screen shown inside same drawer" />
        <Step number={3} title="Add to Queue — Booked Slot" who={['receptionist']}
          description="Click Add to Queue → Book tab. Pick date, doctor, then click an available time slot (grey slots are taken). Slots are blocked on clinic holidays." next="BK-XXXXXX reference assigned" />
        <Step number={4} title="Print Token Slip" who={['receptionist']}
          description="After adding to queue, the confirmation screen shows inside the drawer with token number or booking reference. Click Print Slip → browser opens a thermal-printer formatted page and prints automatically. Printing also marks the patient as Arrived." tip="You can also print from the queue row — click the row's Print button. Both methods mark the patient Arrived." next="Patient status → Arrived" />
        <Step number={5} title="Status Actions" who={['receptionist']}
          description="Each queue row has action buttons: Pending/Confirmed → Arrived or Cancel. Arrived → Complete or Cancel. Completed and Cancelled rows have no actions." />
        <Note>Emergency appointments can only be created by Admin from the queue row's lightning bolt icon. Emergency patients jump to the top of the queue with a red badge.</Note>
      </Section>

      <Section icon={Receipt} title="Billing & Payments">
        <Step number={1} title="Create Invoice" who={['receptionist', 'admin']}
          description="Go to Billing page. Find a completed appointment row and click Bill. If no invoice exists, one is auto-created with the doctor fee + all prescribed medicines. If an invoice already exists, it opens that invoice." next="Invoice modal opens" />
        <Step number={2} title="Add Extra Items" who={['receptionist', 'admin']}
          description="Inside the invoice, click + Add Item. A 3-tab overlay opens: Service tab (configured custom services), Medicine tab (search stock), Custom tab (free-text anything). Each added item shows in the line items table." next="Totals update automatically" />
        <Step number={3} title="Record Payment" who={['receptionist', 'admin']}
          description="Click Record Payment. Select method: Cash, Card, Online, Insurance, or QR Pay. Enter the amount and optionally a reference. You can record partial payments — call Record Payment again for split payments." tip="Payment history shows below the totals section. Each payment is logged with method, amount, and timestamp." next="Invoice status updates to Partial or Paid" />
        <Step number={4} title="QR Pay — How It Works" who={['receptionist', 'admin']}
          description="Select QR Pay as the payment method and enter the amount. Click Confirm Payment — a QR dialog appears showing your clinic's Lanka QR image and the exact invoice amount. The patient opens their bank app (Commercial Bank, Sampath, HNB, BOC, etc.) and scans the QR. Once they confirm on their phone, click Payment Received. The payment is recorded and the invoice updates automatically."
          tip="The Download QR Image link in the dialog lets you save and print the QR to place at the counter — patients can scan it without needing you to show the screen."
          next="Invoice marked Paid" />
        <Step number={5} title="End of Day" who={['receptionist', 'admin']}
          description="Click End of Day button on the Billing page header. Enter your physical cash count. Compare against system total. The breakdown shows Cash, Card, Online, Insurance, and QR Pay totals separately. Add notes and click Close Day & Lock. This cannot be undone from the UI." />
      </Section>

      <Section icon={Package} title="Pharmacy (if enabled)">
        <Step number={1} title="Dispense Queue" who={['receptionist', 'admin']}
          description="Go to Pharmacy → Dispense Queue. Shows all prescriptions for today. Filter by Pending or Dispensed. Click a card to expand the medicines list." next="Click Dispense button" />
        <Step number={2} title="Dispense Medicines" who={['receptionist', 'admin']}
          description="Click Dispense → a modal shows allergy warning (if applicable), each medicine with current stock quantity (red LOW badge if at/below reorder level). Click Confirm Dispense → stock is deducted automatically." tip="A warning toast appears after dispensing if any medicine drops below its reorder level." />
        <Step number={3} title="Purchase Orders" who={['receptionist', 'admin']}
          description="Go to Pharmacy → Purchase Orders to view the history of orders. Filter by status: Draft / Ordered / Received / Cancelled." />
      </Section>
    </div>
  );
}

function DoctorTab() {
  return (
    <div className="space-y-6">
      <Section icon={LayoutDashboard} title="Your Dashboard">
        <Step number={1} title="Understanding Your Dashboard" who={['doctor']}
          description="Your dashboard shows only your patients. Stat cards: Total Today, Waiting, Completed, Online Booked. Now Seeing card highlights the current Arrived patient with their allergies and last complaint. Next Up shows the first waiting patient." tip="Dashboard auto-refreshes every 30 seconds. No manual refresh needed — new arrivals appear automatically." next="Click Consult on an arrived patient" />
      </Section>

      <Section icon={Stethoscope} title="Writing a Consultation">
        <Step number={1} title="Start a Consultation" who={['doctor']}
          description="On the Appointments page or Dashboard queue, click Consult on a row where status is Arrived. Only your own patients show the Consult button. You cannot consult another doctor's patient." next="Consultation modal opens" />
        <Step number={2} title="Fill Chief Complaint" who={['doctor']}
          description="Chief Complaint is the only required field. Fill this first — it's at the top of the form. Red allergy banner appears at the top if the patient has allergies on record." next="Proceed to vitals" />
        <Step number={3} title="Enter Vitals (optional)" who={['doctor']}
          description="If the nurse recorded vitals before you opened the consultation, a blue Nurse Vitals banner appears at the top of the Vitals section showing BP, pulse, SpO2, temperature, weight, height, and who recorded them. BP, pulse, temperature, and weight are also pre-filled in the form. You can adjust any value before saving."
          tip="Nurse vitals are pre-populated automatically — you only need to change a value if it has changed since the nurse recorded it."
          next="Enter clinical notes" />
        <Step number={4} title="Clinical Notes" who={['doctor']}
          description="Enter Symptoms, Diagnosis, ICD-10 code, and doctor notes. Set a follow-up date if needed using the date picker." next="Add medicines (optional)" />
        <Step number={5} title="Prescribe Medicines (optional)" who={['doctor']}
          description="Scroll to the Medicines section. Type a medicine name → live suggestions appear from the store. Select one (shows ✓ from store) or keep typing for a custom name (shows ✎ custom name). Per medicine row: use preset chips for Dosage, Frequency, Duration. Quantity auto-calculates. Set food instructions with chips: Before food / After food / With food / At bedtime." tip="Quantity auto-calculation: Math.ceil(units_per_dose × doses_per_day × duration_days). You can override it manually." next="Click Save & Complete" />
        <Step number={6} title="Save & Complete" who={['doctor']}
          description="Click Save & Complete. The consultation is saved, the prescription is saved (if medicines were added), and the appointment status flips to Completed automatically. Rx number appears in a banner. Print Rx button activates." />
        <Note>If you saved without medicines, a Write Rx button appears on the completed row. Click it to add a prescription after the consultation. Once a prescription is saved, Write Rx disappears.</Note>
      </Section>

      <Section icon={FlaskConical} title="Lab Tests (if enabled)">
        <Step number={1} title="Order Lab Tests" who={['doctor']}
          description="Go to Lab → New Request. Search patient by name or phone. Select tests from the catalog. Submit — the request is added to the lab queue." next="Lab staff enters results" />
        <Step number={2} title="View Results" who={['doctor']}
          description="Completed results appear in the Lab Queue with Done badge. Click a request to see the result value, unit, reference range, notes, and any uploaded file (PDF or image)." tip="Lab results also appear inside the Consultation detail modal and Prescription detail modal for that patient visit." />
      </Section>

      <Section icon={Users} title="Patient History">
        <Step number={1} title="Viewing a Patient's History" who={['doctor']}
          description="Click any patient name to open their profile. Tabs: Overview (personal details), Visits (all consultations with vitals + diagnosis), Prescriptions (all Rx), Billing (invoice history), Lab (all lab test history with results)." />
        <Note>Doctors can view all tabs but cannot edit patient details or delete patients.</Note>
      </Section>
    </div>
  );
}

function NurseTab() {
  return (
    <div className="space-y-6">
      <Section icon={Activity} title="Patient Vitals">
        <Step number={1} title="Open Appointments Page" who={['nurse']}
          description="Go to the Appointments page. You have full access to the queue for all doctors today. Find the patient whose vitals you need to record — they must have Arrived status for the Vitals button to appear."
          next="Click Vitals button on the arrived row" />
        <Step number={2} title="Record Vitals" who={['nurse']}
          description="Click the Vitals button (purple, with activity icon) on the arrived patient's row. A modal opens with fields for BP Systolic, BP Diastolic, Pulse (bpm), SpO2 (%), Temperature (°C), Weight (kg), Height (cm), and Notes."
          tip="If vitals were already recorded for this appointment, all fields pre-fill automatically so you can review and update them."
          next="Click Save Vitals" />
        <Step number={3} title="Vitals Saved — Doctor Sees Them" who={['nurse']}
          description="After saving, a success toast confirms 'Vitals recorded' (or 'Vitals updated' if updating). The doctor will see a blue Nurse Vitals banner at the top of the Vitals section when they open the consultation modal. BP, pulse, temperature, and weight are also pre-filled in the consultation form." />
        <Note>Both nurses and doctors can record vitals for arrived patients. If the doctor updates the vitals during consultation, those values are saved as part of the consultation record separately — the nurse vitals record is preserved.</Note>
      </Section>

      <Section icon={LayoutDashboard} title="Dashboard">
        <Step number={1} title="Your Queue View" who={['nurse']}
          description="Your dashboard shows all patients in the clinic today with their token, status, doctor, and time. Click any patient row to open their profile." tip="Dashboard auto-refreshes every 30 seconds." />
      </Section>

      <Section icon={Pill} title="Prescriptions">
        <Step number={1} title="Browse Prescriptions" who={['nurse']}
          description="Go to Prescriptions page. Use date navigation to go to any date. Filter by doctor tab if multiple doctors. Use the search bar to find by patient name, Rx number, or doctor." next="Click a prescription card" />
        <Step number={2} title="View Prescription Details" who={['nurse']}
          description="Click any Rx card to open the detail modal. Shows patient info, doctor info, all medicines with dosage/frequency/duration/food instructions, and any lab tests ordered in the same visit." next="Print if needed" />
        <Step number={3} title="Print a Prescription" who={['nurse']}
          description="Inside the Rx detail modal, click the Print button. A print-formatted prescription opens in a new window with the clinic name, doctor signature, and all medicines listed." />
      </Section>

      <Section icon={FlaskConical} title="Lab (if enabled)">
        <Step number={1} title="Enter Lab Results" who={['nurse']}
          description="Go to Lab page → Lab Queue tab. Find a pending request (Pending badge). Click to expand, then click Enter Result. Enter the result value, unit, reference range, notes, and optionally upload a PDF or image file." tip="Once a result is entered, the request status changes to Done automatically." />
        <Note>Nurses cannot create new lab requests or manage the test catalog. Only receptionists, doctors, and admin can create requests.</Note>
      </Section>
    </div>
  );
}

function AdminTab() {
  return (
    <div className="space-y-6">
      <Section icon={UserCog} title="Staff Management">
        <Step number={1} title="Add New Staff" who={['admin']}
          description="Go to Staff page. Click Add Staff. Enter name, email, password, role (doctor/nurse/receptionist/admin), and optionally phone, specialization, registration number. The staff member can log in immediately." tip="A clinic can have multiple doctors — no limit." next="Staff can log in with their email + password" />
        <Step number={2} title="Edit or Reset Password" who={['admin']}
          description="Click the pencil icon on any staff card to edit details. Click Reset Password to set a new password for them. You cannot reset your own password from here — use the profile page." next="Changes take effect immediately" />
        <Step number={3} title="Deactivate Staff" who={['admin']}
          description="Click the toggle on a staff card to deactivate. Deactivated staff cannot log in. You cannot deactivate your own account." />
      </Section>

      <Section icon={Settings} title="Clinic Settings">
        <Step number={1} title="Clinic Tab" who={['admin']}
          description="Set clinic name (appears on all printed documents), address, phone, email. Upload clinic logo (JPG/PNG, max 2MB) — appears on token slips, prescription PDFs, and the booking portal." next="Settings → Documents" />
        <Step number={2} title="Documents Tab" who={['admin']}
          description="Set receipt header/footer text and prescription footer text. These appear on all printed invoices and prescriptions." next="Settings → Billing" />
        <Step number={3} title="Billing Tab" who={['admin']}
          description="Set currency code (default LKR), tax label, and tax rate percentage. Tax is applied automatically to all invoices. Also upload your clinic's Lanka QR image in the QR Payment section — this appears to patients when the receptionist selects QR Pay on an invoice."
          tip="Get your Lanka QR image from your bank's merchant portal or mobile banking app (Commercial Bank, Sampath, HNB, BOC, etc.). Upload it once and it applies to all future QR payments."
          next="Settings → Appointments" />
        <Step number={4} title="Appointments Tab" who={['admin']}
          description="Set slot duration (10–60 min), max patients per day per doctor, and toggle Allow Walk-ins. When walk-ins are off, the Walk-in tab is hidden in Add to Queue and walk-in creation is blocked at the backend." next="Settings → Security" />
        <Step number={5} title="Security Tab" who={['admin']}
          description="Enable Patient Portal — generates a public /book URL you can share with patients for online booking. Enable Queue Display — generates a /display URL for your waiting room TV screen (auto-refreshes every 10 seconds)." />
        <Step number={6} title="Doctor Fees Tab" who={['admin']}
          description="Set the consultation fee for each doctor. This fee is auto-applied when a billing invoice is created. Also upload doctor signature (JPG/PNG) — appears on prescription PDFs." />
        <Step number={7} title="Custom Services Tab" who={['admin']}
          description="Add clinic-specific services (e.g. Dressing, Blood Test, X-Ray) with a name, category, and default price. These appear in the Invoice → Add Item → Services tab." />
      </Section>

      <Section icon={Calendar} title="Schedule Management">
        <Step number={1} title="Set Working Hours" who={['admin']}
          description="On the Appointments page, click Working Hours. Set each doctor's schedule per day of week — start time, end time, and slot duration. Patients cannot book outside these hours." next="Set holidays" />
        <Step number={2} title="Manage Holidays" who={['admin']}
          description="Click Holidays on the Appointments page. Add specific dates as clinic holidays. Bookings are blocked on those dates for all doctors." />
        <Step number={3} title="Emergency Appointments" who={['admin']}
          description="On any queue row, click the red lightning bolt to make it an Emergency. The patient jumps to the top of the queue with a red emergency badge. A confirmation dialog appears first." />
      </Section>

      <Section icon={BarChart2} title="Reports (Admin Only)">
        <Step number={1} title="Daily Report" who={['admin']}
          description="Shows appointment breakdown, revenue summary, payment method totals, and top diagnoses for any selected date. CSV export available." next="Try Monthly Report" />
        <Step number={2} title="Monthly Report" who={['admin']}
          description="Select month and year. Shows a bar chart of billed vs collected per day + monthly totals and doctor performance." next="Try Doctors Report" />
        <Step number={3} title="Doctors Report" who={['admin']}
          description="Set a date range. Shows per-doctor consultations, patients seen, revenue billed and collected. CSV export available." />
        <Step number={4} title="Medicines, Patients, Appointments, EOD History" who={['admin']}
          description="Medicines: stock overview, low stock, near expiry, top prescribed. Patients: registrations, demographics, top diagnoses. Appointments: status breakdown, busiest day of week. EOD History: all closing records with cash discrepancy." />
      </Section>

      <Section icon={QrCode} title="QR Payment Setup">
        <Step number={1} title="Upload Your Lanka QR Image" who={['admin']}
          description="Go to Settings → Billing → QR Payment section. Click Upload QR Image and select your bank's Lanka QR image (JPG or PNG, max 2MB). This is the static QR code you get from your bank's merchant portal — Commercial Bank, Sampath, HNB, BOC, and all major Sri Lankan banks support Lanka QR."
          tip="Do this once. The QR image is stored against your clinic and shown automatically every time a receptionist selects QR Pay on an invoice."
          next="QR Pay method is now active in the invoice payment modal" />
        <Step number={2} title="How the Counter Flow Works" who={['admin']}
          description="When a receptionist opens an invoice, selects QR Pay, and clicks Confirm Payment — a full-screen QR dialog appears showing your uploaded QR and the exact invoice amount. The patient scans with their bank app and pays. Receptionist clicks Payment Received to record it." next="Payment recorded as QR method" />
        <Step number={3} title="Download or Print the QR" who={['admin']}
          description="Inside the QR dialog, a Download QR Image link lets you save the QR as an image file. Print it and place it at the reception counter so patients can scan without needing the screen to be turned toward them." />
        <Note>Lanka QR works with all major Sri Lankan bank apps — patients do not need a specific app. Any bank that supports Lanka QR (most do) can scan and pay.</Note>
      </Section>

      <Section icon={Package} title="Medicine Store">
        <Step number={1} title="Add Medicine" who={['admin']}
          description="Go to Medicine Store → click Add Medicine. Fill name (required), generic name, brand, unit (required), strength, category, selling price, initial stock quantity, reorder level, and expiry date." next="Medicine available for prescriptions immediately" />
        <Step number={2} title="Monitor Low Stock" who={['admin']}
          description="Low Stock tab shows medicines at or below their reorder level (highlighted red). Near Expiry tab shows medicines expiring within 60 days (highlighted amber)." tip="A Low Stock stat card appears on your Admin Dashboard with a red border when any medicines are low. Click it to go directly to the Low Stock tab." />
      </Section>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
const ROLE_TABS = [
  { id: 'overview',     label: 'Overview',           icon: BookOpen },
  { id: 'receptionist', label: 'Receptionist Guide', icon: Users },
  { id: 'doctor',       label: 'Doctor Guide',       icon: Stethoscope },
  { id: 'nurse',        label: 'Nurse Guide',        icon: ClipboardList },
  { id: 'admin',        label: 'Admin Guide',        icon: UserCog },
];


export default function HelpPage() {
  const { user } = useAuth();
  const defaultTab = ROLE_TABS.find(t => t.id === user?.role) ? user?.role : 'overview';
  const [active, setActive] = useState(defaultTab);

  const content = {
    overview:     <OverviewTab />,
    receptionist: <ReceptionistTab />,
    doctor:       <DoctorTab />,
    nurse:        <NurseTab />,
    admin:        <AdminTab />,
  };

  return (
    <PageLayout title="Help & User Guide">
      <PageHeader
        title="Help & User Guide"
        subtitle="Step-by-step guides for every role — how each part of the system connects"
      />

      {/* Role tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)] overflow-x-auto mb-6">
        {ROLE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px
              ${active === id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === user?.role && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] ml-1">
                You
              </span>
            )}
          </button>
        ))}
      </div>

      {content[active]}
    </PageLayout>
  );
}
