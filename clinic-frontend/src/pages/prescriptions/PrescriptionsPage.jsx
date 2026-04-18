import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer, Pill, Download, X, AlertTriangle, Search, Calendar, Check } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { Modal }        from '../../components/ui/Modal';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { EmptyState }   from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/Spinner';
import { Button }       from '../../components/ui/Button';
import { prescriptionsApi }  from '../../api/prescriptions';
import { pharmacyApi }        from '../../api/pharmacy';
import { settingsApi }        from '../../api/settings';
import { printPrescription }  from '../../utils/printPrescription';
import { DispenseModal }      from '../../components/ui/DispenseModal';
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
  const [search,        setSearch]        = useState('');
  const [doctorFilter,  setDoctorFilter]  = useState('all');
  const [clinicSettings, setClinicSettings] = useState(null);

  // Modal state
  const [selectedRx,      setSelectedRx]      = useState(null); // full rx object
  const [loadingRx,       setLoadingRx]        = useState(false);
  const [printing,        setPrinting]         = useState(false);
  const [downloading,     setDownloading]      = useState(false);
  const [dispenseOpen,    setDispenseOpen]     = useState(false);
  const [dispensing,      setDispensing]       = useState(false);

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

  async function handleDispense() {
    if (!selectedRx) return;
    setDispensing(true);
    try {
      await pharmacyApi.dispense(selectedRx.id);
      toast.success(`${selectedRx.rx_number} dispensed successfully`);
      setDispenseOpen(false);
      // Refresh the prescription detail so is_dispensed reflects the change
      const res = await prescriptionsApi.getById(selectedRx.id);
      setSelectedRx(res.data.data);
      load(date);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setDispensing(false);
    }
  }

  const isToday = date === today;

  // Doctor list from loaded data
  const doctorsInList = useMemo(() => {
    const seen = new Set();
    const list = [];
    prescriptions.forEach(rx => {
      if (rx.doctor_name && !seen.has(rx.doctor_name)) {
        seen.add(rx.doctor_name);
        list.push(rx.doctor_name);
      }
    });
    return list;
  }, [prescriptions]);

  const q = search.trim().toLowerCase();

  // Two-stage filter: doctor first, then search
  const doctorFiltered = useMemo(() => (
    doctorFilter === 'all' ? prescriptions : prescriptions.filter(rx => rx.doctor_name === doctorFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [prescriptions, doctorFilter]);

  const filtered = useMemo(() => {
    if (!q) return doctorFiltered;
    return doctorFiltered.filter(rx =>
      (rx.patient_name  || '').toLowerCase().includes(q) ||
      (rx.patient_code  || '').toLowerCase().includes(q) ||
      (rx.rx_number     || '').toLowerCase().includes(q) ||
      (rx.doctor_name   || '').toLowerCase().includes(q)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorFiltered, q]);

  return (
    <PageLayout title="Prescriptions">
      <PageHeader
        title="Prescriptions"
        subtitle="View and print prescriptions by date"
      />

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setDate(stepDate(date, -1))}
          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {isToday ? 'Today' : formatDate(date)}
          </span>
          {!isToday && (
            <button onClick={() => setDate(today)}
              className="text-xs text-[var(--color-primary)] hover:underline">
              Back to today
            </button>
          )}
        </div>

        <button onClick={() => setDate(stepDate(date, 1))}
          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <DatePicker value={date} onChange={setDate} />
      </div>

      {/* Doctor filter tabs — only show when multiple doctors */}
      {doctorsInList.length > 1 && (
        <div className="flex gap-1 border-b border-[var(--color-border)] mb-4">
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
          {doctorsInList.map(doc => (
            <button
              key={doc}
              onClick={() => setDoctorFilter(doc)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                doctorFilter === doc
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              {doc}
            </button>
          ))}
        </div>
      )}

      {/* Search + count */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Search patient, Rx number, doctor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {!loading && (
          <span className="text-sm text-[var(--color-text-secondary)] shrink-0">
            {q ? `${filtered.length} of ` : ''}{doctorFiltered.length} prescription{doctorFiltered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <LoadingState message="Loading prescriptions..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={q || doctorFilter !== 'all' ? 'No results' : 'No prescriptions'}
          description={
            q ? `No prescriptions match "${search}".`
            : doctorFilter !== 'all' ? `No prescriptions for ${doctorFilter} on ${isToday ? 'today' : formatDate(date)}.`
            : `No prescriptions were written on ${isToday ? 'today' : formatDate(date)}.`
          }
          action={
            (q || doctorFilter !== 'all')
              ? <Button size="sm" variant="secondary" onClick={() => { setSearch(''); setDoctorFilter('all'); }}>Clear filters</Button>
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(rx => (
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
                variant="secondary"
                size="sm"
                loading={printing}
                onClick={handlePrint}
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
              {!selectedRx.is_dispensed && (
                <Button
                  size="sm"
                  onClick={() => setDispenseOpen(true)}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Dispense
                </Button>
              )}
              {selectedRx.is_dispensed && (
                <span className="text-xs text-[var(--color-success)] font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Dispensed{selectedRx.dispensed_by_name ? ` by ${selectedRx.dispensed_by_name}` : ''}
                </span>
              )}
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
      {/* Dispense confirmation modal */}
      <DispenseModal
        open={dispenseOpen}
        onClose={() => setDispenseOpen(false)}
        rx={selectedRx}
        onConfirm={handleDispense}
        confirming={dispensing}
      />
    </PageLayout>
  );
}
