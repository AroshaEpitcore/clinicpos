import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Zap, Clock, Printer, Receipt, Calendar, Globe, Ticket } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { PageLayout }    from '../../components/layout/PageLayout';
import { PageHeader }    from '../../components/ui/PageHeader';
import { Button }        from '../../components/ui/Button';
import { Badge }         from '../../components/ui/Badge';
import { EmptyState }    from '../../components/ui/EmptyState';
import { LoadingState }  from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AppointmentModal }    from './components/AppointmentModal';
import { ManageScheduleModal } from './admin/ManageScheduleModal';
import { HolidaysModal }       from './admin/HolidaysModal';
import { ConsultationModal }   from '../consultations/ConsultationModal';
import { PrescriptionModal }   from '../prescriptions/PrescriptionModal';
import { InvoiceModal }        from '../billing/components/InvoiceModal';
import { appointmentsApi, doctorsApi } from '../../api/appointments';
import { invoicesApi }         from '../../api/invoices';
import { settingsApi }         from '../../api/settings';
import { useAuth }       from '../../store/AuthContext';
import { formatDate }    from '../../utils/format';
import { printTokenSlip } from '../../utils/printTokenSlip';

const STATUS_ACTIONS = {
  pending:   ['arrived', 'cancelled'],
  confirmed: ['arrived', 'cancelled'],
  arrived:   ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const ACTION_LABELS = {
  arrived:   'Arrived',
  completed: 'Complete',
  cancelled: 'Cancel',
};

const ACTION_VARIANTS = {
  arrived:   'secondary',
  completed: 'primary',
  cancelled: 'danger',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function AppointmentsPage() {
  const { user, clinic } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'receptionist';
  const canManage = user?.role === 'admin';

  const [date,         setDate]         = useState(todayStr());
  const [appointments, setAppointments] = useState([]);
  const [doctors,      setDoctors]      = useState([]);
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  // Modals
  const [apptModalOpen,       setApptModalOpen]       = useState(false);
  const [scheduleModalOpen,   setScheduleModalOpen]   = useState(false);
  const [holidaysModalOpen,   setHolidaysModalOpen]   = useState(false);
  const [consultTarget,       setConsultTarget]       = useState(null);
  const [rxTarget,            setRxTarget]            = useState(null); // appointment obj for prescription
  const [billInvoiceId,       setBillInvoiceId]       = useState(null); // invoice id to open

  // Status change confirm
  const [pendingAction, setPendingAction] = useState(null); // { appointment, newStatus }
  const [actioning,     setActioning]     = useState(false);

  // Emergency confirm
  const [emergencyTarget, setEmergencyTarget] = useState(null);
  const [emergencyLoading,setEmergencyLoading]= useState(false);

  const [allowWalkIns, setAllowWalkIns] = useState(true);

  // Load doctors + settings once
  useEffect(() => {
    doctorsApi.list().then(res => setDoctors(res.data.data));
    settingsApi.get().then(res => setAllowWalkIns(res.data.data?.allow_walk_ins !== false));
  }, []);

  // Always load ALL appointments for the date (no doctor filter in API call).
  // Doctor tab filtering is done client-side so tabs never disappear when switching.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await appointmentsApi.list({ date });
      setAppointments(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusAction() {
    if (!pendingAction) return;
    setActioning(true);
    try {
      await appointmentsApi.updateStatus(pendingAction.appointment.id, pendingAction.newStatus);
      toast.success(
        pendingAction.newStatus === 'completed' ? 'Appointment completed' :
        pendingAction.newStatus === 'arrived'   ? 'Patient marked as arrived' :
        'Appointment cancelled'
      );
      setPendingAction(null);
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setActioning(false);
    }
  }

  async function handleBill(appt) {
    try {
      // If consultation exists, check for or create an invoice
      if (!appt.consultation_id) {
        toast.error('No consultation found for this appointment.');
        return;
      }
      const check = await invoicesApi.checkConsult(appt.consultation_id);
      if (check.data.exists) {
        setBillInvoiceId(check.data.data.id);
      } else {
        const res = await invoicesApi.create({ consultation_id: appt.consultation_id });
        setBillInvoiceId(res.data.data.id);
        toast.success(`Invoice ${res.data.data.invoice_number} created`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Could not open invoice.');
    }
  }

  async function handleMakeEmergency() {
    if (!emergencyTarget) return;
    setEmergencyLoading(true);
    try {
      await appointmentsApi.makeEmergency(emergencyTarget.id);
      toast.success('Patient moved to emergency queue');
      setEmergencyTarget(null);
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setEmergencyLoading(false);
    }
  }

  const isToday   = date === todayStr();
  const displayDate = isToday ? 'Today' : formatDate(date + 'T00:00:00');

  // Tabs: doctors who have at least one appointment today (from the full unfiltered list)
  const doctorsInQueue = doctors.filter(d =>
    appointments.some(a => String(a.doctor_id) === String(d.id))
  );

  // Client-side filter — no extra API call when switching tabs
  const filtered = doctorFilter === 'all'
    ? appointments
    : appointments.filter(a => String(a.doctor_id) === String(doctorFilter));

  const queueStats = {
    total:     filtered.length,
    waiting:   filtered.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
    arrived:   filtered.filter(a => a.status === 'arrived').length,
    completed: filtered.filter(a => a.status === 'completed').length,
  };

  return (
    <PageLayout>
      <PageHeader
        title="Appointments & Queue"
        subtitle={`${queueStats.total} total · ${queueStats.waiting} waiting · ${queueStats.arrived} with doctor · ${queueStats.completed} done`}
        actions={
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setScheduleModalOpen(true)}>
                  Working Hours
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setHolidaysModalOpen(true)}>
                  Holidays
                </Button>
              </>
            )}
            {isAdmin && (
              <Button onClick={() => setApptModalOpen(true)} size="sm">
                + Add to Queue
              </Button>
            )}
          </div>
        }
      />

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setDate(d => addDays(d, -1))}
          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span className="text-sm font-semibold text-[var(--color-text)]">{displayDate}</span>
          {!isToday && (
            <button
              onClick={() => setDate(todayStr())}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              Back to today
            </button>
          )}
        </div>

        <button
          onClick={() => setDate(d => addDays(d, 1))}
          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <DatePicker value={date} onChange={setDate} />

        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="ml-auto p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-[var(--color-text-secondary)] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Doctor filter tabs — only for admin/receptionist; doctors only see their own queue */}
      {doctorsInQueue.length > 0 && user?.role !== 'doctor' && (
        <div className="flex gap-1 mb-4 border-b border-[var(--color-border)]">
          <button
            onClick={() => setDoctorFilter('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              doctorFilter === 'all'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            All Doctors
          </button>
          {doctorsInQueue.map(d => (
            <button
              key={d.id}
              onClick={() => setDoctorFilter(String(d.id))}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                doctorFilter === String(d.id)
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              {d.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Queue */}
      {loading ? (
        <LoadingState message="Loading queue..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No appointments"
          description={`Nothing scheduled for ${displayDate.toLowerCase()}.`}
          action={isAdmin ? <Button size="sm" onClick={() => setApptModalOpen(true)}>+ Add to Queue</Button> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(appt => (
            <QueueRow
              key={appt.id}
              appt={appt}
              user={user}
              isAdmin={isAdmin}
              onStatusChange={(newStatus) => setPendingAction({ appointment: appt, newStatus })}
              onMakeEmergency={() => setEmergencyTarget(appt)}
              onConsult={() => setConsultTarget(appt)}
              onWriteRx={() => setRxTarget(appt)}
              onBill={() => handleBill(appt)}
              onPrint={() => printTokenSlip({
                clinicName:  clinic?.name || 'ClinicPOS',
                patientName: appt.patient_name,
                patientCode: appt.patient_code,
                doctorName:  appt.doctor_name,
                tokenNumber: appt.token_number,
                bookingRef:  appt.booking_reference,
                date:        appt.appointment_date,
                time:        appt.appointment_time,
                type:        appt.type,
              })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AppointmentModal
        open={apptModalOpen}
        onClose={() => setApptModalOpen(false)}
        onSuccess={() => load(true)}
        defaultDate={date}
        allowWalkIns={allowWalkIns}
      />

      <ManageScheduleModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
      />

      <HolidaysModal
        open={holidaysModalOpen}
        onClose={() => setHolidaysModalOpen(false)}
      />

      <ConsultationModal
        open={!!consultTarget}
        onClose={() => setConsultTarget(null)}
        onSuccess={() => load(true)}
        appointment={consultTarget}
      />

      <PrescriptionModal
        open={!!rxTarget}
        onClose={() => setRxTarget(null)}
        onSuccess={() => load(true)}
        appointment={rxTarget}
      />

      {billInvoiceId && (
        <InvoiceModal
          invoiceId={billInvoiceId}
          onClose={() => setBillInvoiceId(null)}
          onSuccess={() => { setBillInvoiceId(null); load(true); }}
        />
      )}

      {/* Status change confirm */}
      <ConfirmDialog
        open={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleStatusAction}
        loading={actioning}
        title={
          pendingAction?.newStatus === 'completed' ? 'Complete Appointment' :
          pendingAction?.newStatus === 'arrived'   ? 'Mark as Arrived' :
          'Cancel Appointment'
        }
        message={
          pendingAction?.newStatus === 'cancelled'
            ? `Cancel appointment for ${pendingAction?.appointment?.patient_name}?`
            : pendingAction?.newStatus === 'completed'
            ? `Mark ${pendingAction?.appointment?.patient_name}'s appointment as completed?`
            : `Mark ${pendingAction?.appointment?.patient_name} as arrived?`
        }
        confirmLabel={ACTION_LABELS[pendingAction?.newStatus] || 'Confirm'}
        confirmVariant={pendingAction?.newStatus === 'cancelled' ? 'danger' : 'primary'}
      />

      {/* Emergency confirm */}
      <ConfirmDialog
        open={!!emergencyTarget}
        onClose={() => setEmergencyTarget(null)}
        onConfirm={handleMakeEmergency}
        loading={emergencyLoading}
        title="Make Emergency"
        message={`Move ${emergencyTarget?.patient_name} to the top of the queue as an emergency?`}
        confirmLabel="Yes, Make Emergency"
        confirmVariant="danger"
      />
    </PageLayout>
  );
}

function QueueRow({ appt, user, isAdmin, onStatusChange, onMakeEmergency, onConsult, onWriteRx, onBill, onPrint }) {
  const actions        = STATUS_ACTIONS[appt.status] || [];
  const isEmergency    = appt.type === 'emergency';
  const isDoctor       = user?.role === 'doctor' || user?.role === 'admin';
  const isReceptionist = user?.role === 'receptionist' || user?.role === 'admin';
  // Doctors can only act on their own appointments; admins can act on any
  const isOwnAppt      = user?.role === 'admin' || String(appt.doctor_id) === String(user?.id);
  const canConsult     = isDoctor       && appt.status === 'arrived'   && isOwnAppt;
  const canWriteRx     = isDoctor       && appt.status === 'completed' && !!appt.consultation_id && isOwnAppt;
  const canBill        = isReceptionist && appt.status === 'completed' && !!appt.consultation_id;
  const hasToken       = appt.token_number != null;

  return (
    <div className={`rounded-[var(--radius)] border overflow-hidden transition-colors ${
      isEmergency
        ? 'border-[var(--color-danger)]'
        : 'border-[var(--color-border)]'
    }`}>
      <div className="flex items-stretch">

        {/* ── Token column ─────────────────────────────────────── */}
        <div className={`flex flex-col items-center justify-center w-20 shrink-0 py-4 ${
          isEmergency
            ? 'bg-[var(--color-danger)] text-white'
            : hasToken
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
        }`}>
          {isEmergency ? (
            <>
              <Zap className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold tracking-widest uppercase">EMRG</span>
            </>
          ) : hasToken ? (
            <>
              <span className="text-[10px] font-semibold tracking-widest uppercase opacity-80 mb-0.5">Token</span>
              <span className="text-5xl font-black leading-none tabular-nums">
                {String(appt.token_number).padStart(2, '0')}
              </span>
            </>
          ) : (
            <>
              <Ticket className="w-5 h-5 mb-1 opacity-40" />
              <span className="text-[10px] tracking-wide opacity-50">—</span>
            </>
          )}
        </div>

        {/* ── Main info ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 px-4 py-3 bg-[var(--color-surface)]">
          {/* Row 1: name + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-base font-bold text-[var(--color-text)]">
              {appt.patient_name}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">{appt.patient_code}</span>
            {appt.patient_allergies && (
              <span title={`Allergies: ${appt.patient_allergies}`}>
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-warning)]" />
              </span>
            )}
            {appt.booked_online && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">
                <Globe className="w-3 h-3" /> Online
              </span>
            )}
            <Badge status={appt.status} />
          </div>

          {/* Row 2: doctor / time / ref / reason */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--color-text-secondary)]">
            <span>{appt.doctor_name}</span>
            {appt.appointment_time && (
              <span className="flex items-center gap-0.5 font-semibold text-[var(--color-text)]">
                <Clock className="w-3 h-3" />{appt.appointment_time.slice(0, 5)}
              </span>
            )}
            {appt.booking_reference && (
              <span className="font-mono text-blue-600 font-semibold">{appt.booking_reference}</span>
            )}
            {appt.reason && (
              <span className="truncate max-w-[220px] italic" title={appt.reason}>
                {appt.reason}
              </span>
            )}
          </div>
        </div>

        {/* ── Actions column ────────────────────────────────────── */}
        <div className="flex flex-col items-end justify-center gap-1.5 px-3 py-3 bg-[var(--color-surface)] shrink-0 border-l border-[var(--color-border)]">
          {/* Primary workflow actions */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {canConsult && (
              <Button size="sm" onClick={onConsult}>Consult</Button>
            )}
            {canWriteRx && (
              <Button size="sm" variant="secondary" onClick={onWriteRx}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Rx
              </Button>
            )}
            {canBill && (
              <Button size="sm" variant="secondary" onClick={onBill}>
                <Receipt className="w-3.5 h-3.5 mr-1" /> Bill
              </Button>
            )}
          </div>

          {/* Status transition buttons */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {actions.map(action => (
                <Button
                  key={action}
                  variant={ACTION_VARIANTS[action]}
                  size="sm"
                  onClick={() => onStatusChange(action)}
                >
                  {ACTION_LABELS[action]}
                </Button>
              ))}

              {/* Make Emergency */}
              {!isEmergency && ['pending', 'confirmed', 'arrived'].includes(appt.status) && (
                <button
                  onClick={onMakeEmergency}
                  title="Make Emergency"
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}

              {/* Reprint token slip */}
              {(hasToken || appt.booking_reference) && (
                <button
                  onClick={onPrint}
                  title="Print token slip"
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
