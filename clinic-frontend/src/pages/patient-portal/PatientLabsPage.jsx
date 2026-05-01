import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { FlaskConical, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { mediaUrl } from '../../utils/mediaUrl';

export default function PatientLabsPage() {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientPortalApi.getLabs()
      .then(r => setList(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PatientLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-black text-[var(--color-ink)]">Lab Results</h1>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-[var(--color-ink-faint)] text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-10 text-center">
            <FlaskConical className="w-8 h-8 text-[var(--color-ink-faint)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-ink-light)]">No lab tests on record</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(lab => (
              <div key={lab.id} className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lab.status === 'completed' ? 'bg-green-50' : 'bg-amber-50'}`}>
                    {lab.status === 'completed'
                      ? <CheckCircle className="w-4.5 h-4.5 text-green-600" />
                      : <Clock className="w-4.5 h-4.5 text-amber-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-ink)]">{lab.test_name}</span>
                      {lab.test_code && <span className="text-xs text-[var(--color-ink-faint)]">({lab.test_code})</span>}
                    </div>
                    <p className="text-xs text-[var(--color-ink-light)] mt-0.5">
                      {lab.category} · Ordered {format(new Date(lab.created_at), 'd MMM yyyy')}
                    </p>

                    {lab.status === 'completed' && lab.result_value ? (
                      <div className="mt-3 bg-green-50 rounded-xl p-3 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-green-800">{lab.result_value}</span>
                          {lab.result_unit && <span className="text-xs text-green-600">{lab.result_unit}</span>}
                        </div>
                        {lab.reference_range && (
                          <p className="text-xs text-green-600">Reference: {lab.reference_range}</p>
                        )}
                        {lab.result_notes && (
                          <p className="text-xs text-green-700 italic">{lab.result_notes}</p>
                        )}
                        {lab.recorded_at && (
                          <p className="text-[0.6rem] text-green-500">Recorded {format(new Date(lab.recorded_at), 'd MMM yyyy')}</p>
                        )}
                        {lab.result_file_url && (
                          <a
                            href={mediaUrl(lab.result_file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> View report file
                          </a>
                        )}
                      </div>
                    ) : lab.status !== 'completed' ? (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Awaiting result</span>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
