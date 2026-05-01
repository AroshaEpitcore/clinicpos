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
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-[var(--color-border)] p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <FlaskConical className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-ink-light)]">No lab tests on record</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(lab => (
              <div key={lab.id} className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    lab.status === 'completed' ? 'bg-green-50' : 'bg-amber-50'
                  }`}>
                    {lab.status === 'completed'
                      ? <CheckCircle className="w-4.5 h-4.5 text-green-600" />
                      : <Clock className="w-4.5 h-4.5 text-amber-500" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-sm font-bold text-[var(--color-ink)]">{lab.test_name}</span>
                        {lab.test_code && (
                          <span className="ml-1.5 text-xs text-[var(--color-ink-faint)]">({lab.test_code})</span>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
                        lab.status === 'completed'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        {lab.status === 'completed' ? 'Completed' : 'Awaiting'}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-ink-light)] mt-0.5">
                      {lab.category && `${lab.category} · `}
                      Ordered {format(new Date(lab.created_at), 'd MMM yyyy')}
                    </p>

                    {/* Result box */}
                    {lab.status === 'completed' && lab.result_value && (
                      <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-green-800">{lab.result_value}</span>
                        </div>
                        {lab.result_notes && (
                          <p className="text-xs text-green-700">{lab.result_notes}</p>
                        )}
                        {lab.resulted_at && (
                          <p className="text-[0.6rem] text-green-500">
                            Recorded {format(new Date(lab.resulted_at), 'd MMM yyyy')}
                          </p>
                        )}
                        {lab.result_file_url && (
                          <a
                            href={mediaUrl(lab.result_file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View report file
                          </a>
                        )}
                      </div>
                    )}

                    {lab.status !== 'completed' && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          Results pending from lab
                        </span>
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
