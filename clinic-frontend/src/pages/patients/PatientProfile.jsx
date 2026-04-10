import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageLayout }       from '../../components/layout/PageLayout';
import { Button }           from '../../components/ui/Button';
import { Card }             from '../../components/ui/Card';
import { Badge }            from '../../components/ui/Badge';
import { LoadingState }     from '../../components/ui/Spinner';
import { EmptyState }       from '../../components/ui/EmptyState';
import { ConfirmDialog }    from '../../components/ui/ConfirmDialog';
import { EditPatientModal } from './components/EditPatientModal';
import { patientsApi }         from '../../api/patients';
import { consultationsApi }    from '../../api/consultations';
import { prescriptionsApi }    from '../../api/prescriptions';
import { invoicesApi }         from '../../api/invoices';
import { formatDate, formatAge, formatCurrency } from '../../utils/format';
import { useAuth }             from '../../store/AuthContext';
import { InvoiceModal }        from '../billing/components/InvoiceModal';
import { PaymentStatusBadge }  from '../billing/BillingPage';

export default function PatientProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patient,    setPatient]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('overview');
  const [showEdit,   setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const canEdit   = ['receptionist', 'admin'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  useEffect(() => { loadPatient(); }, [id]);

  async function loadPatient() {
    setLoading(true);
    try {
      const res = await patientsApi.getById(id);
      setPatient(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Patient not found');
        navigate('/patients');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await patientsApi.softDelete(id);
      toast.success('Deleted successfully');
      navigate('/patients');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLayout><LoadingState /></PageLayout>;
  if (!patient) return null;

  const tabs = ['overview', 'visits', 'prescriptions', 'billing'];

  return (
    <PageLayout title="Patient Profile">

      {/* Back */}
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </button>

      {/* ── Header Card ───────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-[var(--color-primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-bold text-[var(--color-text)]">
                  {patient.first_name} {patient.last_name}
                </h1>
                <span className="text-sm text-[var(--color-text-secondary)] font-mono">
                  {patient.patient_code}
                </span>
                <Badge label={patient.gender} variant="neutral" className="capitalize" />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {patient.phone}
                </span>
                {patient.email && (
                  <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {patient.email}
                  </span>
                )}
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {formatDate(patient.date_of_birth)} · {formatAge(patient.date_of_birth)}
                </span>
                {patient.blood_group && (
                  <Badge label={`Blood: ${patient.blood_group}`} variant="info" />
                )}
              </div>

              {patient.allergies && (
                <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-[var(--radius)] bg-[var(--color-danger-light)] w-fit">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-danger)] shrink-0" />
                  <span className="text-xs font-medium text-[var(--color-danger)]">
                    Allergies: {patient.allergies}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
                <Edit className="w-4 h-4" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-[var(--color-border)]">
          <StatItem label="Total Visits"   value={patient.total_visits   || 0} />
          <StatItem label="Total Invoices" value={patient.total_invoices || 0} />
          <StatItem label="Total Billed"   value={formatCurrency(patient.total_billed || 0)} />
        </div>
      </Card>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[var(--color-border)] mb-6 gap-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab patient={patient} />}
      {activeTab === 'visits'   && <VisitsTab patientId={patient.id} />}
      {activeTab === 'prescriptions' && <PrescriptionsTab patientId={patient.id} />}
      {activeTab === 'billing' && <BillingTab patientId={patient.id} />}

      {showEdit && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); loadPatient(); }}
        />
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Patient"
        message={`Are you sure you want to delete ${patient.first_name} ${patient.last_name}? This cannot be undone.`}
        confirmLabel="Yes, Delete Patient"
      />
    </PageLayout>
  );
}

function OverviewTab({ patient }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card title="Personal Details">
        <InfoRow label="Full Name"     value={`${patient.first_name} ${patient.last_name}`} />
        <InfoRow label="Date of Birth" value={formatDate(patient.date_of_birth)} />
        <InfoRow label="Age"           value={formatAge(patient.date_of_birth)} />
        <InfoRow label="Gender"        value={patient.gender} className="capitalize" />
        <InfoRow label="Blood Group"   value={patient.blood_group} />
        <InfoRow label="National ID"   value={patient.national_id} />
      </Card>

      <Card title="Contact Details">
        <InfoRow label="Phone"   value={patient.phone} />
        <InfoRow label="Email"   value={patient.email} />
        <InfoRow label="Address" value={patient.address} />
      </Card>

      <Card title="Emergency Contact">
        <InfoRow label="Name"  value={patient.emergency_name} />
        <InfoRow label="Phone" value={patient.emergency_phone} />
      </Card>

      <Card title="Insurance">
        <InfoRow label="Provider"      value={patient.insurance_provider} />
        <InfoRow label="Policy Number" value={patient.insurance_number} />
      </Card>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-lg font-bold text-[var(--color-text)] mt-0.5">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, className }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs text-[var(--color-text-secondary)] w-32 shrink-0">{label}</span>
      <span className={`text-sm text-[var(--color-text)] text-right ${className || ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function PrescriptionsTab({ patientId }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    prescriptionsApi.getByPatient(patientId)
      .then(res => setPrescriptions(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <LoadingState message="Loading prescriptions..." />;
  if (prescriptions.length === 0) return (
    <EmptyState title="No prescriptions yet" description="Prescription history will appear here after the first prescription." />
  );

  return (
    <div className="flex flex-col gap-4">
      {prescriptions.map(rx => (
        <div key={rx.id} className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary)]">{rx.rx_number}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {formatDate(rx.created_at)} · Dr. {rx.doctor_name}
              </p>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">{rx.item_count} medicine{rx.item_count !== 1 ? 's' : ''}</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {rx.items?.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div>
                  <p className="font-medium text-[var(--color-text)]">
                    {item.medicine_name}
                    {item.strength && <span className="ml-1 text-xs text-[var(--color-text-secondary)]">{item.strength}</span>}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {item.dosage} · {item.frequency} · {item.duration}
                    {item.instructions && ` · ${item.instructions}`}
                  </p>
                </div>
              </div>
            ))}
            {rx.notes && (
              <p className="text-xs text-[var(--color-text-secondary)] italic mt-1 pl-8">{rx.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function VisitsTab({ patientId }) {
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    consultationsApi.getByPatient(patientId)
      .then(res => setVisits(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <LoadingState message="Loading visits..." />;
  if (visits.length === 0) return (
    <EmptyState title="No visits yet" description="Consultation records will appear here after the first visit." />
  );

  return (
    <div className="flex flex-col gap-4">
      {visits.map(v => (
        <div key={v.id} className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {/* Visit header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {formatDate(v.visit_date)}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Dr. {v.doctor_name}{v.specialization ? ` — ${v.specialization}` : ''}
              </p>
            </div>
            {v.follow_up_date && (
              <p className="text-xs text-[var(--color-primary)]">
                Follow-up: {formatDate(v.follow_up_date)}
              </p>
            )}
          </div>

          {/* Visit body */}
          <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
            {v.chief_complaint && (
              <div className="col-span-2">
                <p className="text-xs text-[var(--color-text-secondary)]">Chief Complaint</p>
                <p className="text-sm text-[var(--color-text)]">{v.chief_complaint}</p>
              </div>
            )}
            {v.diagnosis && (
              <div className="col-span-2">
                <p className="text-xs text-[var(--color-text-secondary)]">Diagnosis</p>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {v.diagnosis}
                  {v.icd_code && <span className="ml-2 text-xs text-[var(--color-text-secondary)]">({v.icd_code})</span>}
                </p>
              </div>
            )}
            {/* Vitals row */}
            {(v.bp_systolic || v.pulse || v.temperature || v.weight) && (
              <div className="col-span-2 flex flex-wrap gap-4 py-1">
                {v.bp_systolic && v.bp_diastolic && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    BP <strong className="text-[var(--color-text)]">{v.bp_systolic}/{v.bp_diastolic}</strong> mmHg
                  </span>
                )}
                {v.pulse && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Pulse <strong className="text-[var(--color-text)]">{v.pulse}</strong> bpm
                  </span>
                )}
                {v.temperature && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Temp <strong className="text-[var(--color-text)]">{v.temperature}</strong>°C
                  </span>
                )}
                {v.weight && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Weight <strong className="text-[var(--color-text)]">{v.weight}</strong> kg
                  </span>
                )}
              </div>
            )}
            {v.notes && (
              <div className="col-span-2">
                <p className="text-xs text-[var(--color-text-secondary)]">Notes</p>
                <p className="text-sm text-[var(--color-text)]">{v.notes}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BillingTab({ patientId }) {
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [openInvoice,  setOpenInvoice]  = useState(null);

  useEffect(() => {
    invoicesApi.getByPatient(patientId)
      .then(res => setInvoices(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <LoadingState message="Loading billing history..." />;
  if (invoices.length === 0) return (
    <EmptyState title="No invoices yet" description="Billing history will appear here after the first invoice is generated." />
  );

  const totalBilled    = invoices.reduce((s, i) => s + parseFloat(i.total_amount  || 0), 0);
  const totalPaid      = invoices.reduce((s, i) => s + parseFloat(i.paid_amount   || 0), 0);
  const totalBalance   = invoices.reduce((s, i) => s + parseFloat(i.balance_due   || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <p className="text-xs text-[var(--color-text-secondary)]">Total Billed</p>
          <p className="text-base font-bold text-[var(--color-text)] mt-0.5">{formatCurrency(totalBilled)}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <p className="text-xs text-[var(--color-text-secondary)]">Total Paid</p>
          <p className="text-base font-bold text-[var(--color-success,#16a34a)] mt-0.5">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <p className="text-xs text-[var(--color-text-secondary)]">Outstanding</p>
          <p className={`text-base font-bold mt-0.5 ${totalBalance > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      {/* Invoice list */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Invoice</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Date</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Total</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Paid</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Balance</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                <td className="px-4 py-2.5">
                  <p className="text-sm font-semibold text-[var(--color-primary)]">{inv.invoice_number}</p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-sm text-[var(--color-text-secondary)]">{formatDate(inv.created_at)}</p>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(inv.total_amount)}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-sm text-[var(--color-success,#16a34a)]">{formatCurrency(inv.paid_amount)}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`text-sm font-medium ${parseFloat(inv.balance_due) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {formatCurrency(inv.balance_due)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <PaymentStatusBadge status={inv.payment_status} />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => setOpenInvoice(inv.id)}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openInvoice && (
        <InvoiceModal
          invoiceId={openInvoice}
          onClose={() => setOpenInvoice(null)}
          onSuccess={() => setOpenInvoice(null)}
        />
      )}
    </div>
  );
}
