import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer, Pill, Download, X, AlertTriangle } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { Modal }        from '../../components/ui/Modal';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { EmptyState }   from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/Spinner';
import { Button }       from '../../components/ui/Button';
import { prescriptionsApi }  from '../../api/prescriptions';
import { settingsApi }        from '../../api/settings';
import { printPrescription }  from '../../utils/printPrescription';
import { formatDate, toInputDate } from '../../utils/format';
import { toast } from 'sonner';

function stepDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

export default function PrescriptionsPage() {
  const navigate = useNavigate();
  const today = toInputDate(new Date());

  const [date,          setDate]          = useState(today);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [clinicSettings, setClinicSettings] = useState(null);

  // Modal state
  const [selectedRx,   setSelectedRx]   = useState(null); // full rx object
  const [loadingRx,    setLoadingRx]    = useState(false);
  const [printing,     setPrinting]     = useState(false);
  const [downloading,  setDownloading]  = useState(false);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await prescriptionsApi.list({ date: d, limit: 100 });
      setPrescriptions(res.data.data);
    } catch {
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  useEffect(() => {
    settingsApi.get().then(r => setClinicSettings(r.data.data)).catch(() => {});
  }, []);

  async function openRx(id) {
    setLoadingRx(true);
    setSelectedRx(null);
    try {
      const res = await prescriptionsApi.getById(id);
      setSelectedRx(res.data.data);
    } catch {
      toast.error('Could not load prescription.');
    } finally {
      setLoadingRx(false);
    }
  }

  async function handlePrint() {
    if (!selectedRx) return;
    setPrinting(true);
    try {
      printPrescription(selectedRx, clinicSettings || {});
    } catch {
      toast.error('Could not print prescription.');
    } finally {
      setPrinting(false);
    }
  }

  async function handleDownloadPdf() {
    if (!selectedRx) return;
    setDownloading(true);
    try {
      const res = await prescriptionsApi.downloadPdf(selectedRx.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${selectedRx.rx_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not generate PDF.');
    } finally {
      setDownloading(false);
    }
  }

  const isToday = date === today;

  return (
    <PageLayout title="Prescriptions">
      <PageHeader
        title="Prescriptions"
        subtitle="View and print prescriptions by date"
      />

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setDate(stepDate(date, -1))}
          className="p-2 rounded-[var(--radius)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <DatePicker value={date} onChange={setDate} />

        <button onClick={() => setDate(stepDate(date, 1))}
          className="p-2 rounded-[var(--radius)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        {!isToday && (
          <button onClick={() => setDate(today)}
            className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
            Today
          </button>
        )}

        <span className="text-sm font-medium text-[var(--color-text)]">
          {isToday ? 'Today' : formatDate(date)}
          {!loading && (
            <span className="ml-2 text-[var(--color-text-secondary)] font-normal">
              — {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <LoadingState message="Loading prescriptions..." />
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No prescriptions"
          description={`No prescriptions were written on ${isToday ? 'today' : formatDate(date)}.`}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {prescriptions.map(rx => (
            <div
              key={rx.id}
              onClick={() => openRx(rx.id)}
              className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
            >
              {/* Rx number badge */}
              <div className="w-20 text-center shrink-0">
                <p className="text-xs font-bold text-[var(--color-primary)]">{rx.rx_number}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {rx.item_count} med{rx.item_count !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Patient + Doctor */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {rx.patient_name}
                  <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{rx.patient_code}</span>
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">{rx.doctor_name}</p>
              </div>

              {/* Time */}
              <p className="text-xs text-[var(--color-text-secondary)] shrink-0">
                {new Date(rx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Arrow hint */}
              <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* ── Prescription detail modal ── */}
      <Modal
        open={!!(selectedRx || loadingRx)}
        onClose={() => { setSelectedRx(null); setLoadingRx(false); }}
        title={selectedRx ? `${selectedRx.rx_number}` : 'Loading…'}
        size="lg"
        footer={
          selectedRx ? (
            <div className="flex items-center gap-2 justify-end w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/patients/${selectedRx.patient_id}`)}
              >
                View Patient
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={downloading}
                onClick={handleDownloadPdf}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                PDF
              </Button>
              <Button
                size="sm"
                loading={printing}
                onClick={handlePrint}
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
            </div>
          ) : null
        }
      >
        {loadingRx && !selectedRx && (
          <div className="py-10">
            <LoadingState message="Loading prescription…" />
          </div>
        )}

        {selectedRx && (
          <div className="flex flex-col gap-5">

            {/* Header info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Patient</p>
                <p className="font-semibold text-[var(--color-text)]">{selectedRx.patient_name}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{selectedRx.patient_code}</p>
                {selectedRx.allergies && (
                  <p className="flex items-center gap-1 text-xs text-[var(--color-warning)] mt-1">
                    <AlertTriangle className="w-3 h-3" /> {selectedRx.allergies}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Doctor</p>
                <p className="font-semibold text-[var(--color-text)]">{selectedRx.doctor_name}</p>
                {selectedRx.specialization && (
                  <p className="text-xs text-[var(--color-text-secondary)]">{selectedRx.specialization}</p>
                )}
                {selectedRx.registration_no && (
                  <p className="text-xs text-[var(--color-text-secondary)]">Reg: {selectedRx.registration_no}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Date</p>
                <p className="font-medium text-[var(--color-text)]">
                  {new Date(selectedRx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                    {new Date(selectedRx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </div>
            </div>

            {/* Medicines table */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
                Medicines ({selectedRx.items?.length || 0})
              </p>
              <div className="rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                      {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions', 'Qty'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRx.items || []).map((item, i) => (
                      <tr key={item.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-[var(--color-bg)]' : ''}`}>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-[var(--color-text)]">{item.medicine_name}</p>
                          {item.generic_name && (
                            <p className="text-xs text-[var(--color-text-secondary)]">{item.generic_name}</p>
                          )}
                          {item.strength && (
                            <p className="text-xs text-[var(--color-text-secondary)]">{item.strength} {item.unit}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--color-text)]">{item.dosage || '—'}</td>
                        <td className="px-3 py-2.5 text-[var(--color-text)]">{item.frequency || '—'}</td>
                        <td className="px-3 py-2.5 text-[var(--color-text)] whitespace-nowrap">{item.duration || '—'}</td>
                        <td className="px-3 py-2.5 text-[var(--color-text-secondary)] text-xs">{item.instructions || '—'}</td>
                        <td className="px-3 py-2.5 text-[var(--color-text)] text-center">{item.quantity_given ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {selectedRx.notes && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Notes</p>
                <p className="text-sm text-[var(--color-text)] bg-[var(--color-bg)] rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2">
                  {selectedRx.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
