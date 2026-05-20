import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import { useLang } from '../../i18n/LangContext';
import PatientLayout from './PatientLayout';
import { FileText, ChevronDown, ChevronUp, CheckCircle, Clock, Pill } from 'lucide-react';

export default function PatientPrescriptionsPage() {
  const { t } = useLang();
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(null);

  useEffect(() => {
    patientPortalApi.getPrescriptions()
      .then(r => setList(r.data.data))
      .catch(() => { toast.error(t('common.somethingWrong')); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PatientLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-black text-[var(--color-text)]">{t('rx.title')}</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
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
              <FileText className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('rx.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(rx => (
              <div key={rx.id} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
                <button
                  onClick={() => setOpen(open === rx.id ? null : rx.id)}
                  className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-[var(--radius)] bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--color-text)]">{rx.rx_number}</span>
                      {rx.is_dispensed
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />{t('rx.dispensed')}
                          </span>
                        : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />{t('rx.notDispensed')}
                          </span>
                      }
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {format(new Date(rx.created_at), 'd MMM yyyy')} · Dr. {rx.doctor_name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {rx.items.length} medicine{rx.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-gray-400">
                    {open === rx.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {open === rx.id && (
                  <div className="border-t border-[var(--color-border)] p-4 space-y-3 bg-gray-50/50">
                    {rx.items.map((item, i) => (
                      <div key={i} className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] p-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Pill className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[var(--color-text)]">{item.medicine_name}</p>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                              {item.dosage    && <span className="text-xs text-[var(--color-text-secondary)]">{item.dosage}</span>}
                              {item.frequency && <span className="text-xs text-[var(--color-text-secondary)]">· {item.frequency}</span>}
                              {item.duration  && <span className="text-xs text-[var(--color-text-secondary)]">· {item.duration}</span>}
                            </div>
                            {item.food_instruction && (
                              <p className="text-xs text-[var(--color-primary)] font-medium mt-1.5 bg-[var(--color-primary-light)] rounded-lg px-2 py-1 inline-block">
                                {item.food_instruction}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {rx.notes && (
                      <p className="text-xs text-[var(--color-text-secondary)] italic px-1">{rx.notes}</p>
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




