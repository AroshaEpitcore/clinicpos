import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer, Pill, Download } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { EmptyState }   from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/Spinner';
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
  const [printing,      setPrinting]      = useState(null); // id being printed
  const [downloading,   setDownloading]   = useState(null); // id being downloaded
  const [clinicSettings, setClinicSettings] = useState(null);

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

  // Load clinic settings once for print/PDF
  useEffect(() => {
    settingsApi.get().then(r => setClinicSettings(r.data.data)).catch(() => {});
  }, []);

  async function handlePrint(id) {
    setPrinting(id);
    try {
      const res = await prescriptionsApi.getById(id);
      printPrescription(res.data.data, clinicSettings || {});
    } catch {
      toast.error('Could not load prescription for printing.');
    } finally {
      setPrinting(null);
    }
  }

  async function handleDownloadPdf(rx) {
    setDownloading(rx.id);
    try {
      const res = await prescriptionsApi.downloadPdf(rx.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${rx.rx_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not generate PDF.');
    } finally {
      setDownloading(null);
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
            <div key={rx.id}
              className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex items-center gap-4">

              {/* Rx number badge */}
              <div className="w-20 text-center shrink-0">
                <p className="text-xs font-bold text-[var(--color-primary)]">{rx.rx_number}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {rx.item_count} med{rx.item_count !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Patient */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/patients/${rx.patient_id}`)}
                title="View patient profile"
              >
                <p className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
                  {rx.patient_name}
                  <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{rx.patient_code}</span>
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">Dr. {rx.doctor_name}</p>
              </div>

              {/* Time */}
              <p className="text-xs text-[var(--color-text-secondary)] shrink-0">
                {new Date(rx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Print + PDF buttons */}
              <button
                onClick={() => handlePrint(rx.id)}
                disabled={printing === rx.id}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                {printing === rx.id ? 'Loading...' : 'Print'}
              </button>
              <button
                onClick={() => handleDownloadPdf(rx)}
                disabled={downloading === rx.id}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {downloading === rx.id ? 'Generating...' : 'PDF'}
              </button>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
