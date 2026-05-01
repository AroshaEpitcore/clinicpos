import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { Stethoscope, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

function VitalPill({ label, value, unit }) {
  if (!value) return null;
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-[var(--radius)] px-3 py-2 text-center min-w-[64px]">
      <p className="text-[0.55rem] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-sm font-black text-[var(--color-text)] leading-tight">
        {value}<span className="text-[0.6rem] font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
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
      .catch(() => { toast.error("Something went wrong. Please try again."); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PatientLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-black text-[var(--color-text)]">Visit History</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Your consultations and clinical notes</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-[var(--radius)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-24" />
                  <div className="h-3 bg-gray-100 rounded w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-10 text-center">
            <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">No consultations on record</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(c => (
              <div key={c.id} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
                <button
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                  className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-[var(--radius)] bg-purple-50 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4.5 h-4.5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text)]">
                      {format(new Date(c.created_at), 'd MMM yyyy')}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Dr. {c.doctor_name}{c.specialization ? ` · ${c.specialization}` : ''}
                    </p>
                    {c.chief_complaint && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">{c.chief_complaint}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-gray-400">
                    {open === c.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </div>
                </button>

                {open === c.id && (
                  <div className="border-t border-[var(--color-border)] p-4 space-y-4 bg-gray-50/50">
                    {/* Vitals */}
                    {(c.bp_systolic || c.pulse || c.temperature || c.weight) && (
                      <div>
                        <p className="text-[0.65rem] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Vitals</p>
                        <div className="flex flex-wrap gap-2">
                          {c.bp_systolic && c.bp_diastolic && (
                            <VitalPill label="BP" value={`${c.bp_systolic}/${c.bp_diastolic}`} unit="mmHg" />
                          )}
                          <VitalPill label="Pulse"  value={c.pulse}       unit="bpm" />
                          <VitalPill label="Temp"   value={c.temperature} unit="°C"  />
                          <VitalPill label="Weight" value={c.weight}      unit="kg"  />
                        </div>
                      </div>
                    )}

                    {/* Clinical details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {c.chief_complaint && (
                        <div className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                          <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-wide mb-1">Chief Complaint</p>
                          <p className="text-sm text-[var(--color-text)]">{c.chief_complaint}</p>
                        </div>
                      )}
                      {c.diagnosis && (
                        <div className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                          <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-wide mb-1">Diagnosis</p>
                          <p className="text-sm text-[var(--color-text)]">
                            {c.diagnosis}{c.icd_code ? ` (${c.icd_code})` : ''}
                          </p>
                        </div>
                      )}
                      {c.symptoms && (
                        <div className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                          <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-wide mb-1">Symptoms</p>
                          <p className="text-sm text-[var(--color-text)]">{c.symptoms}</p>
                        </div>
                      )}
                      {c.notes && (
                        <div className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                          <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-wide mb-1">Doctor's Notes</p>
                          <p className="text-sm text-[var(--color-text)]">{c.notes}</p>
                        </div>
                      )}
                    </div>

                    {c.follow_up_date && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-[var(--radius)] px-4 py-2.5">
                        <Calendar className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                        <p className="text-sm font-semibold text-[var(--color-primary)]">
                          Follow-up: {format(new Date(c.follow_up_date), 'd MMM yyyy')}
                        </p>
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




