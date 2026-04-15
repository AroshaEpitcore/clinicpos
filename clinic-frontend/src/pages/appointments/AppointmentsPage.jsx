import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Zap, Clock, Printer, Receipt, Calendar, Globe } from 'lucide-react';
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
  const { user } = useAuth();
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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = { date };
      if (doctorFilter !== 'all') params.doctor_id = doctorFilter;
      const res = await appointmentsApi.list(params);
      setAppointments(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, doctorFilter]);

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

  // Doctor filter tabs
  const doctorsInQueue = doctors.filter(d =>
    appointments.some(a => a.doctor_id === d.id)
  );

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

      {/* Doctor filter tabs */}
      {doctorsInQueue.length > 0 && (
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

function QueueRow({ appt, user, isAdmin, onStatusChange, onMakeEmergency, onConsult, onWriteRx, onBill }) {
  const actions = STATUS_ACTIONS[appt.status] || [];
  const isEmergency   = appt.type === 'emergency';
  const isDoctor      = user?.role === 'doctor' || user?.role === 'admin';
  const isReceptionist = user?.role === 'receptionist' || user?.role === 'admin';
  const canConsult    = isDoctor      && appt.status === 'arrived';
  const canWriteRx    = isDoctor      && appt.status === 'completed';
  const canBill       = isReceptionist && appt.status === 'completed' && !!appt.consultation_id;

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-[var(--radius)] border transition-colors ${
      isEmergency
        ? 'border-[var(--color-danger)] bg-[var(--color-danger-light)]'
        : 'border-[var(--color-border)] bg-[var(--color-surface)]'
    }`}>
      {/* Token */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        isEmergency
          ? 'bg-[var(--color-danger)] text-white'
          : 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
      }`}>
        {isEmergency ? <Zap className="w-4 h-4" /> : `#${appt.token_number ?? '—'}`}
      </div>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {appt.patient_name}
          </p>
          {appt.patient_allergies && (
            <span title={`Allergies: ${appt.patient_allergies}`}>
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0" />
            </span>
          )}
          {appt.booked_online && (
            <span
              title={`Online booking${appt.booking_reference ? ` · ${appt.booking_reference}` : ''}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 shrink-0"
            >
              <Globe className="w-3 h-3" /> Online
            </span>
          )}
          <span className="text-xs text-[var(--color-text-secondary)] shrink-0">{appt.patient_code}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-[var(--color-text-secondary)]">{appt.doctor_name}</p>
          {appt.appointment_time && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              <Clock className="w-3 h-3 inline mr-0.5" />{appt.appointment_time.slice(0, 5)}
            </p>
          )}
          {appt.booking_reference && (
            <p className="text-xs font-mono text-blue-600 shrink-0">{appt.booking_reference}</p>
          )}
          {appt.reason && (
            <p className="text-xs text-[var(--color-text-secondary)] truncate max-w-[200px]" title={appt.reason}>
              {appt.reason}
            </p>
          )}
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge status={appt.status} />

        {canConsult && (
          <Button size="sm" onClick={onConsult}>Consult</Button>
        )}
        {canWriteRx && (
          <Button size="sm" variant="secondary" onClick={onWriteRx}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Write Rx
          </Button>
        )}
        {canBill && (
          <Button size="sm" variant="secondary" onClick={onBill}>
            <Receipt className="w-3.5 h-3.5 mr-1" /> Bill
          </Button>
        )}

        {isAdmin && (
          <>
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

            {/* Make Emergency — only for non-emergency pending/confirmed/arrived */}
            {!isEmergency && ['pending', 'confirmed', 'arrived'].includes(appt.status) && (
              <button
                onClick={onMakeEmergency}
                title="Make Emergency"
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
