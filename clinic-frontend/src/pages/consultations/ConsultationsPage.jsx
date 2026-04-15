import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, AlertTriangle, Stethoscope } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { PageLayout }  from '../../components/layout/PageLayout';
import { PageHeader }  from '../../components/ui/PageHeader';
import { Badge }       from '../../components/ui/Badge';
import { EmptyState }  from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/Spinner';
import { consultationsApi } from '../../api/consultations';
import { formatDate, toInputDate } from '../../utils/format';

function stepDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

export default function ConsultationsPage() {
  const navigate = useNavigate();
  const today = toInputDate(new Date());

  const [date,          setDate]          = useState(today);
  const [consultations, setConsultations] = useState([]);
  const [loading,       setLoading]       = useState(false);

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

  function handleDateChange(d) {
    setDate(d);
  }

  const isToday = date === today;

  return (
    <PageLayout title="Consultations">
      <PageHeader
        title="Consultations"
        subtitle="View all recorded consultations by date"
      />

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => handleDateChange(stepDate(date, -1))}
          className="p-2 rounded-[var(--radius)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <DatePicker value={date} onChange={handleDateChange} />

        <button
          onClick={() => handleDateChange(stepDate(date, 1))}
          className="p-2 rounded-[var(--radius)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        {!isToday && (
          <button
            onClick={() => handleDateChange(today)}
            className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
          >
            Today
          </button>
        )}

        <span className="text-sm font-medium text-[var(--color-text)]">
          {isToday ? 'Today' : formatDate(date)}
          {!loading && (
            <span className="ml-2 text-[var(--color-text-secondary)] font-normal">
              — {consultations.length} consultation{consultations.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading consultations..." />
      ) : consultations.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No consultations recorded"
          description={`No consultations were recorded on ${isToday ? 'today' : formatDate(date)}.`}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {consultations.map(c => (
            <div
              key={c.id}
              className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex items-start justify-between hover:border-[var(--color-primary)] transition-colors cursor-pointer"
              onClick={() => navigate(`/patients/${c.patient_id}`)}
              title="View patient profile"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Patient avatar */}
                <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] text-sm font-semibold shrink-0">
                  {c.patient_name?.charAt(0) || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + code */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{c.patient_name}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{c.patient_code}</span>
                    {c.allergies && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-warning)] font-medium">
                        <AlertTriangle className="w-3 h-3" /> Allergies
                      </span>
                    )}
                  </div>

                  {/* Chief complaint */}
                  {c.chief_complaint && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 truncate">
                      {c.chief_complaint}
                    </p>
                  )}

                  {/* Diagnosis */}
                  {c.diagnosis && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      <span className="font-medium text-[var(--color-text)]">Dx:</span> {c.diagnosis}
                      {c.icd_code && <span className="ml-1 text-[var(--color-text-secondary)]">({c.icd_code})</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {c.doctor_name}
                </span>
                {c.follow_up_date && (
                  <Badge variant="info" label={`Follow-up: ${formatDate(c.follow_up_date)}`} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
