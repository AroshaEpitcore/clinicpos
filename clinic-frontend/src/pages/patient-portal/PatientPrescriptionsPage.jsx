import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { FileText, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';

export default function PatientPrescriptionsPage() {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(null);

  useEffect(() => {
    patientPortalApi.getPrescriptions()
      .then(r => setList(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PatientLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-black text-[var(--color-ink)]">Prescriptions</h1>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-[var(--color-ink-faint)] text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-10 text-center">
            <FileText className="w-8 h-8 text-[var(--color-ink-faint)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-ink-light)]">No prescriptions on record</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(rx => (
              <div key={rx.id} className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                <button
                  onClick={() => setOpen(open === rx.id ? null : rx.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--color-surface)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-ink)]">{rx.rx_number}</span>
                      {rx.is_dispensed
                        ? <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Dispensed</span>
                        : <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />Pending</span>
                      }
                    </div>
                    <p className="text-xs text-[var(--color-ink-light)] mt-0.5">
                      {format(new Date(rx.created_at), 'd MMM yyyy')} · Dr. {rx.doctor_name}
                    </p>
                    <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">
                      {rx.items.length} medicine{rx.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {open === rx.id ? <ChevronUp className="w-4 h-4 text-[var(--color-ink-faint)] shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-[var(--color-ink-faint)] shrink-0 mt-0.5" />}
                </button>

                {open === rx.id && (
                  <div className="border-t border-[var(--color-border)] p-4">
                    <div className="space-y-2">
                      {rx.items.map((item, i) => (
                        <div key={i} className="bg-[var(--color-surface-alt)] rounded-xl p-3">
                          <p className="text-sm font-semibold text-[var(--color-ink)]">{item.medicine_name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {item.dosage    && <span className="text-xs text-[var(--color-ink-light)]">{item.dosage}</span>}
                            {item.frequency && <span className="text-xs text-[var(--color-ink-light)]">{item.frequency}</span>}
                            {item.duration  && <span className="text-xs text-[var(--color-ink-light)]">for {item.duration}</span>}
                          </div>
                          {item.food_instruction && (
                            <p className="text-xs text-blue-600 mt-1">{item.food_instruction}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {rx.notes && (
                      <p className="text-xs text-[var(--color-ink-faint)] mt-3 italic">{rx.notes}</p>
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
