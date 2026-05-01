import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { Stethoscope, ChevronDown, ChevronUp } from 'lucide-react';

function VitalPill({ label, value, unit }) {
  if (!value) return null;
  return (
    <div className="bg-[var(--color-surface-alt)] rounded-lg px-3 py-1.5 text-center">
      <p className="text-[0.6rem] text-[var(--color-ink-faint)] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-[var(--color-ink)]">{value}<span className="text-[0.6rem] font-normal ml-0.5">{unit}</span></p>
    </div>
  );
}

export default function PatientConsultationsPage() {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(null);

  useEffect(() => {
    patientPortalApi.getConsultations()
      .then(r => setList(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PatientLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-black text-[var(--color-ink)]">Visit History</h1>
        <p className="text-sm text-[var(--color-ink-light)] -mt-2">Your past consultations and clinical notes</p>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-[var(--color-ink-faint)] text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-10 text-center">
            <Stethoscope className="w-8 h-8 text-[var(--color-ink-faint)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-ink-light)]">No consultations on record yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                <button
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--color-surface)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4.5 h-4.5 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{format(new Date(c.created_at), 'd MMM yyyy')}</p>
                    <p className="text-xs text-[var(--color-ink-light)]">Dr. {c.doctor_name}{c.specialization ? ` · ${c.specialization}` : ''}</p>
                    {c.chief_complaint && (
                      <p className="text-xs text-[var(--color-ink-faint)] mt-0.5 truncate">{c.chief_complaint}</p>
                    )}
                  </div>
                  {open === c.id ? <ChevronUp className="w-4 h-4 text-[var(--color-ink-faint)] shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-[var(--color-ink-faint)] shrink-0 mt-0.5" />}
                </button>

                {open === c.id && (
                  <div className="border-t border-[var(--color-border)] p-4 space-y-4">
                    {/* Vitals */}
                    {(c.bp_systolic || c.pulse || c.temperature || c.weight) && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-ink-light)] mb-2">Vitals</p>
                        <div className="flex flex-wrap gap-2">
                          {c.bp_systolic && c.bp_diastolic && (
                            <VitalPill label="BP" value={`${c.bp_systolic}/${c.bp_diastolic}`} unit="mmHg" />
                          )}
                          <VitalPill label="Pulse"  value={c.pulse}       unit="bpm" />
                          <VitalPill label="Temp"   value={c.temperature} unit="°C" />
                          <VitalPill label="Weight" value={c.weight}      unit="kg" />
                        </div>
                      </div>
                    )}
                    {/* Clinical */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {c.chief_complaint && (
                        <div>
                          <p className="text-[0.65rem] text-[var(--color-ink-faint)] uppercase tracking-wide mb-0.5">Chief Complaint</p>
                          <p className="text-sm text-[var(--color-ink)]">{c.chief_complaint}</p>
                        </div>
                      )}
                      {c.diagnosis && (
                        <div>
                          <p className="text-[0.65rem] text-[var(--color-ink-faint)] uppercase tracking-wide mb-0.5">Diagnosis</p>
                          <p className="text-sm text-[var(--color-ink)]">{c.diagnosis}{c.icd10_code ? ` (${c.icd10_code})` : ''}</p>
                        </div>
                      )}
                      {c.symptoms && (
                        <div>
                          <p className="text-[0.65rem] text-[var(--color-ink-faint)] uppercase tracking-wide mb-0.5">Symptoms</p>
                          <p className="text-sm text-[var(--color-ink)]">{c.symptoms}</p>
                        </div>
                      )}
                      {c.notes && (
                        <div>
                          <p className="text-[0.65rem] text-[var(--color-ink-faint)] uppercase tracking-wide mb-0.5">Doctor's Notes</p>
                          <p className="text-sm text-[var(--color-ink)]">{c.notes}</p>
                        </div>
                      )}
                    </div>
                    {c.follow_up_date && (
                      <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-blue-700 font-medium">
                          Follow-up: {format(new Date(c.follow_up_date), 'd MMM yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
