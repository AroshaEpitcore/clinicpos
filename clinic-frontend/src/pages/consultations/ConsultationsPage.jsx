import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, AlertTriangle, Stethoscope, Activity, Thermometer, Weight, Search, X, CalendarClock } from 'lucide-react';
import { DatePicker }  from '../../components/ui/DatePicker';
import { Modal }       from '../../components/ui/Modal';
import { PageLayout }  from '../../components/layout/PageLayout';
import { PageHeader }  from '../../components/ui/PageHeader';
import { Badge }       from '../../components/ui/Badge';
import { Button }      from '../../components/ui/Button';
import { EmptyState }  from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/Spinner';
import { consultationsApi } from '../../api/consultations';
import { formatDate, toInputDate } from '../../utils/format';
import { toast } from 'sonner';

function stepDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-sm text-[var(--color-text)]">{value}</p>
    </div>
  );
}

export default function ConsultationsPage() {
  const navigate = useNavigate();
  const today = toInputDate(new Date());

  const [date,          setDate]          = useState(today);
  const [consultations, setConsultations] = useState([]);
  const [loading,       setLoading]       = useState(false);

  // Filters
  const [search,        setSearch]        = useState('');
  const [doctorFilter,  setDoctorFilter]  = useState('all');
  const [followUpOnly,  setFollowUpOnly]  = useState(false);

  // Modal
  const [selectedC,  setSelectedC]  = useState(null);
  const [loadingC,   setLoadingC]   = useState(false);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await consultationsApi.list({ date: d, limit: 100 });
      setConsultations(res.data.data);
    } catch {
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  async function openConsultation(id) {
    setLoadingC(true);
    setSelectedC(null);
    try {
      const res = await consultationsApi.getById(id);
      setSelectedC(res.data.data);
    } catch {
      toast.error('Could not load consultation.');
    } finally {
      setLoadingC(false);
    }
  }

  const isToday = date === today;

  // Unique doctors from loaded list for the doctor filter tabs
  const doctorsInList = useMemo(() => {
    const seen = new Map();
    consultations.forEach(c => {
      if (!seen.has(String(c.doctor_id))) seen.set(String(c.doctor_id), c.doctor_name);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [consultations]);

  // Client-side filtered + searched list
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => consultations.filter(c => {
    if (doctorFilter !== 'all' && String(c.doctor_id) !== doctorFilter) return false;
    if (followUpOnly && !c.follow_up_date) return false;
    if (q) {
      return (
        (c.patient_name    || '').toLowerCase().includes(q) ||
        (c.patient_code    || '').toLowerCase().includes(q) ||
        (c.chief_complaint || '').toLowerCase().includes(q) ||
        (c.diagnosis       || '').toLowerCase().includes(q) ||
        (c.icd_code        || '').toLowerCase().includes(q) ||
        (c.doctor_name     || '').toLowerCase().includes(q)
      );
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [consultations, doctorFilter, followUpOnly, q]);

  const hasActiveFilters = search || doctorFilter !== 'all' || followUpOnly;

  // Vitals helper
  const vitals = selectedC ? [
    selectedC.bp_systolic && selectedC.bp_diastolic
      ? { label: 'Blood Pressure', value: `${selectedC.bp_systolic} / ${selectedC.bp_diastolic} mmHg`, icon: Activity }
      : null,
    selectedC.pulse
      ? { label: 'Pulse', value: `${selectedC.pulse} bpm`, icon: Activity }
      : null,
    selectedC.temperature
      ? { label: 'Temperature', value: `${selectedC.temperature} °C`, icon: Thermometer }
      : null,
    selectedC.weight
      ? { label: 'Weight', value: `${selectedC.weight} kg`, icon: Weight }
      : null,
  ].filter(Boolean) : [];

  return (
    <PageLayout title="Consultations">
      <PageHeader
        title="Consultations"
        subtitle="View all recorded consultations by date"
      />

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setDate(stepDate(date, -1))}
          className="p-2 rounded-[var(--radius)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <DatePicker value={date} onChange={setDate} />

        <button
          onClick={() => setDate(stepDate(date, 1))}
          className="p-2 rounded-[var(--radius)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        {!isToday && (
          <button
            onClick={() => setDate(today)}
            className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
          >
            Today
          </button>
        )}

        <span className="text-sm font-medium text-[var(--color-text)]">
          {isToday ? 'Today' : formatDate(date)}
          {!loading && (
            <span className="ml-2 text-[var(--color-text-secondary)] font-normal">
              — {hasActiveFilters ? `${filtered.length} of ` : ''}{consultations.length} consultation{consultations.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
      </div>

      {/* ── Doctor tabs ── */}
      {doctorsInList.length > 1 && (
        <div className="flex gap-1 mb-3 border-b border-[var(--color-border)]">
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
          {doctorsInList.map(d => (
            <button
              key={d.id}
              onClick={() => setDoctorFilter(d.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                doctorFilter === d.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Search + Follow-up filter ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Search patient, diagnosis, complaint…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setFollowUpOnly(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${
            followUpOnly
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          Follow-up scheduled
          <span className="opacity-70">{consultations.filter(c => c.follow_up_date).length}</span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setDoctorFilter('all'); setFollowUpOnly(false); }}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <LoadingState message="Loading consultations..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title={hasActiveFilters ? 'No results' : 'No consultations recorded'}
          description={
            hasActiveFilters
              ? 'No consultations match the current filters.'
              : `No consultations were recorded on ${isToday ? 'today' : formatDate(date)}.`
          }
          action={
            hasActiveFilters
              ? <Button size="sm" variant="secondary" onClick={() => { setSearch(''); setDoctorFilter('all'); setFollowUpOnly(false); }}>Clear filters</Button>
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => openConsultation(c.id)}
              className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex items-start justify-between hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] text-sm font-semibold shrink-0">
                  {c.patient_name?.charAt(0) || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{c.patient_name}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{c.patient_code}</span>
                    {c.allergies && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-warning)] font-medium">
                        <AlertTriangle className="w-3 h-3" /> Allergies
                      </span>
                    )}
                  </div>
                  {c.chief_complaint && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 truncate">{c.chief_complaint}</p>
                  )}
                  {c.diagnosis && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      <span className="font-medium text-[var(--color-text)]">Dx:</span> {c.diagnosis}
                      {c.icd_code && <span className="ml-1 text-[var(--color-text-secondary)]">({c.icd_code})</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                <span className="text-xs text-[var(--color-text-secondary)]">{c.doctor_name}</span>
                {c.follow_up_date && (
                  <Badge variant="info" label={`Follow-up: ${formatDate(c.follow_up_date)}`} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Consultation detail modal ── */}
      <Modal
        open={!!(selectedC || loadingC)}
        onClose={() => { setSelectedC(null); setLoadingC(false); }}
        title={selectedC ? `Consultation — ${selectedC.patient_name}` : 'Loading…'}
        size="lg"
        footer={
          selectedC ? (
            <div className="flex items-center gap-2 justify-end w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/patients/${selectedC.patient_id}`)}
              >
                View Patient
              </Button>
            </div>
          ) : null
        }
      >
        {loadingC && !selectedC && (
          <div className="py-10">
            <LoadingState message="Loading consultation…" />
          </div>
        )}

        {selectedC && (
          <div className="flex flex-col gap-5">

            {/* Patient + Doctor row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] text-sm font-bold shrink-0">
                  {selectedC.patient_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{selectedC.patient_name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{selectedC.patient_code}</p>
                  {selectedC.phone && <p className="text-xs text-[var(--color-text-secondary)]">{selectedC.phone}</p>}
                  {selectedC.allergies && (
                    <p className="flex items-center gap-1 text-xs text-[var(--color-warning)] mt-0.5 font-medium">
                      <AlertTriangle className="w-3 h-3" /> {selectedC.allergies}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Doctor</p>
                <p className="text-sm font-semibold text-[var(--color-text)]">{selectedC.doctor_name}</p>
                {selectedC.specialization && (
                  <p className="text-xs text-[var(--color-text-secondary)]">{selectedC.specialization}</p>
                )}
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {new Date(selectedC.visit_date || selectedC.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Vitals */}
            {vitals.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">Vitals</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {vitals.map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-center"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
                      <p className="text-sm font-bold text-[var(--color-text)] mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Chief Complaint"  value={selectedC.chief_complaint} />
              <InfoRow label="Symptoms"         value={selectedC.symptoms} />
              <InfoRow label="Diagnosis"        value={selectedC.diagnosis} />
              <InfoRow label="ICD Code"         value={selectedC.icd_code} />
            </div>

            {selectedC.notes && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Notes</p>
                <p className="text-sm text-[var(--color-text)] bg-[var(--color-bg)] rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2 whitespace-pre-wrap">
                  {selectedC.notes}
                </p>
              </div>
            )}

            {selectedC.follow_up_date && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Follow-up</span>
                <span className="text-sm font-semibold text-[var(--color-primary)]">
                  {formatDate(selectedC.follow_up_date)}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
