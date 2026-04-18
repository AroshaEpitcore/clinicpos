import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  FlaskConical, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, Plus, Edit2, Trash2, Upload, FileText, Eye, Search, X,
} from 'lucide-react';
import { PageLayout }    from '../../components/layout/PageLayout';
import { PageHeader }    from '../../components/ui/PageHeader';
import { Button }        from '../../components/ui/Button';
import { Input }         from '../../components/ui/Input';
import { Modal }         from '../../components/ui/Modal';
import { Badge }         from '../../components/ui/Badge';
import { EmptyState }    from '../../components/ui/EmptyState';
import { LoadingState }  from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DatePicker }    from '../../components/ui/DatePicker';
import { useAuth }       from '../../store/AuthContext';
import { labApi }        from '../../api/lab';
import { mediaUrl }      from '../../utils/mediaUrl';
import { formatDate, formatDateTime, toInputDate } from '../../utils/format';

const TABS = [
  { key: 'queue',   label: 'Lab Queue',     icon: FlaskConical },
  { key: 'catalog', label: 'Test Catalog',  icon: FileText },
];

const STATUS_VARIANT = { pending: 'warning', completed: 'success' };

export default function LabPage() {
  const [tab, setTab] = useState('queue');

  return (
    <PageLayout title="Lab">
      <PageHeader title="Laboratory" subtitle="Test requests, results, and test catalog" />

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue'   && <QueueTab />}
      {tab === 'catalog' && <CatalogTab />}
    </PageLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — LAB QUEUE
// ══════════════════════════════════════════════════════════════════════════════
function QueueTab() {
  const today = toInputDate(new Date());
  const [date, setDate]           = useState(today);
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [resultTarget, setResultTarget] = useState(null); // request to enter result for
  const [viewTarget, setViewTarget]     = useState(null); // request to view result for

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await labApi.getRequests({ date: d });
      setRequests(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  function stepDate(n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(toInputDate(d));
  }

  const pending   = requests.filter(r => r.status === 'pending');
  const completed = requests.filter(r => r.status === 'completed');

  return (
    <div>
      {/* Date nav */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => stepDate(-1)} className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>
        <DatePicker value={date} onChange={setDate} />
        <button onClick={() => stepDate(1)} className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>
        {date !== today && (
          <button onClick={() => setDate(today)} className="text-xs text-[var(--color-primary)] hover:underline">
            Today
          </button>
        )}
        <span className="text-xs text-[var(--color-text-secondary)] ml-2">
          {pending.length} pending · {completed.length} completed
        </span>
      </div>

      {loading ? <LoadingState message="Loading requests..." /> : requests.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No lab requests for this date"
          description="Doctors can request tests from the patient consultation view." />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[var(--color-warning)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Pending ({pending.length})</h3>
              </div>
              <div className="flex flex-col gap-2">
                {pending.map(r => (
                  <RequestCard key={r.id} request={r}
                    onEnterResult={() => setResultTarget(r)}
                    onView={() => setViewTarget(r)} />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Completed ({completed.length})</h3>
              </div>
              <div className="flex flex-col gap-2">
                {completed.map(r => (
                  <RequestCard key={r.id} request={r}
                    onEnterResult={() => setResultTarget(r)}
                    onView={() => setViewTarget(r)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {resultTarget && (
        <EnterResultModal
          request={resultTarget}
          onClose={() => setResultTarget(null)}
          onSuccess={() => { setResultTarget(null); load(date); }}
        />
      )}

      {viewTarget && (
        <ViewResultModal
          request={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}

function RequestCard({ request: r, onEnterResult, onView }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
          <FlaskConical className="w-4 h-4 text-[var(--color-primary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {r.test_name}
            {r.test_code && <span className="ml-1.5 text-xs font-normal text-[var(--color-text-secondary)]">{r.test_code}</span>}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {r.patient_name} · {r.patient_code} · Req. by {r.requested_by_name}
          </p>
          {r.notes && (
            <p className="text-xs text-[var(--color-text-secondary)] italic mt-0.5">{r.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {r.normal_range && (
          <span className="text-xs text-[var(--color-text-secondary)] hidden md:block">
            Ref: {r.normal_range} {r.unit}
          </span>
        )}
        <Badge variant={STATUS_VARIANT[r.status]} label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} />
        {r.status === 'completed' ? (
          <Button size="sm" variant="ghost" onClick={onView}>
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
        ) : (
          <Button size="sm" onClick={onEnterResult}>
            <Upload className="w-3.5 h-3.5" /> Enter Result
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Enter Result Modal ────────────────────────────────────────────────────────
function EnterResultModal({ request, onClose, onSuccess }) {
  const [value, setValue]   = useState('');
  const [notes, setNotes]   = useState('');
  const [file, setFile]     = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (request) {
      setValue(request.result_value || '');
      setNotes(request.result_notes || '');
      setFile(null);
    }
  }, [request]);

  async function handleSave() {
    if (!value.trim() && !file) {
      toast.error('Enter a result value or upload a file');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      if (value.trim()) fd.append('result_value', value.trim());
      if (notes.trim())  fd.append('notes', notes.trim());
      if (file)          fd.append('result_file', file);
      await labApi.enterResult(request.id, fd);
      toast.success('Result saved successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!request} onClose={onClose} title="Enter Lab Result" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Result</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Test info */}
        <div className="px-3 py-2.5 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {request.test_name}
            {request.test_code && <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{request.test_code}</span>}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Patient: {request.patient_name} · {request.patient_code}
          </p>
          {request.normal_range && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Reference range: {request.normal_range} {request.unit}
            </p>
          )}
        </div>

        <Input
          label="Result Value"
          placeholder={`e.g. 5.4 ${request.unit || ''}`}
          value={value}
          onChange={e => setValue(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">
            Upload File <span className="text-[var(--color-text-secondary)] font-normal">(PDF, JPG, PNG — max 5 MB)</span>
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => setFile(e.target.files[0] || null)}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-[var(--color-primary-light)] file:text-[var(--color-primary)] hover:file:opacity-80"
          />
          {file && (
            <p className="text-xs text-[var(--color-text-secondary)]">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">
            Notes <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span>
          </label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any additional notes or observations..."
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
        </div>
      </div>
    </Modal>
  );
}

// ── View Result Modal ─────────────────────────────────────────────────────────
function ViewResultModal({ request, onClose }) {
  const isPdf = request.result_file_url?.toLowerCase().endsWith('.pdf');

  return (
    <Modal open={!!request} onClose={onClose} title="Lab Result" size="md"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-4">
        <div className="px-3 py-2.5 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {request.test_name}
            {request.test_code && <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{request.test_code}</span>}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Patient: {request.patient_name} · {request.patient_code}
          </p>
          {request.normal_range && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Reference: {request.normal_range} {request.unit}
            </p>
          )}
        </div>

        {request.result_value && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">Result</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">
              {request.result_value}
              {request.unit && <span className="text-sm font-normal text-[var(--color-text-secondary)] ml-1">{request.unit}</span>}
            </p>
          </div>
        )}

        {request.result_file_url && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Attached File</p>
            {isPdf ? (
              <a
                href={mediaUrl(request.result_file_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
              >
                <FileText className="w-4 h-4" />
                Open PDF Report
              </a>
            ) : (
              <img
                src={mediaUrl(request.result_file_url)}
                alt="Lab result"
                className="rounded-[var(--radius)] border border-[var(--color-border)] max-h-64 object-contain w-full"
              />
            )}
          </div>
        )}

        {request.result_notes && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-[var(--color-text)]">{request.result_notes}</p>
          </div>
        )}

        <div className="text-xs text-[var(--color-text-secondary)] pt-1 border-t border-[var(--color-border)]">
          Resulted by {request.resulted_by_name} on {formatDateTime(request.resulted_at)}
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — TEST CATALOG
// ══════════════════════════════════════════════════════════════════════════════
function CatalogTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'receptionist';

  const [tests, setTests]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await labApi.getTests({});
      setTests(r.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    try {
      await labApi.deleteTest(deleteTarget.id);
      toast.success('Test removed from catalog');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  const q = search.trim().toLowerCase();
  const filteredTests = useMemo(() => {
    if (!q) return tests;
    return tests.filter(t =>
      (t.name     || '').toLowerCase().includes(q) ||
      (t.code     || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests, q]);

  // Group by category
  const grouped = filteredTests.reduce((acc, t) => {
    const cat = t.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {q ? `${filteredTests.length} of ` : ''}{tests.length} test{tests.length !== 1 ? 's' : ''} in catalog
        </p>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Test
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
        <input
          type="text"
          placeholder="Search by name, code, or category…"
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

      {loading ? <LoadingState message="Loading catalog..." /> : filteredTests.length === 0 ? (
        <EmptyState icon={FlaskConical}
          title={q ? 'No results' : 'No tests in catalog'}
          description={q ? `No tests match "${search}".` : 'Add lab tests to the catalog so doctors can request them.'}
          action={q
            ? <Button size="sm" variant="secondary" onClick={() => setSearch('')}>Clear search</Button>
            : isAdmin && <Button size="sm" onClick={() => setModalOpen(true)}>+ Add Test</Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2 px-1">
                {category}
              </h3>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                      {['Test Name', 'Code', 'Normal Range', 'Unit', 'Price', 'Status', isAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(t => (
                      <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--color-text)]">{t.name}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{t.code || '—'}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{t.normal_range || '—'}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{t.unit || '—'}</td>
                        <td className="px-4 py-3 text-[var(--color-text)]">LKR {parseFloat(t.price).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={t.is_active ? 'success' : 'neutral'} label={t.is_active ? 'Active' : 'Inactive'} />
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditing(t); setModalOpen(true); }}
                                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteTarget(t)}
                                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <TestModal
          test={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSuccess={() => { setModalOpen(false); setEditing(null); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Test"
        message={`Remove "${deleteTarget?.name}" from the catalog? Existing requests will not be affected.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Test Catalog Modal ────────────────────────────────────────────────────────
function TestModal({ test, onClose, onSuccess }) {
  const [name, setName]           = useState(test?.name || '');
  const [code, setCode]           = useState(test?.code || '');
  const [category, setCategory]   = useState(test?.category || '');
  const [normalRange, setNormalRange] = useState(test?.normal_range || '');
  const [unit, setUnit]           = useState(test?.unit || '');
  const [price, setPrice]         = useState(test?.price ?? '');
  const [description, setDescription] = useState(test?.description || '');
  const [isActive, setIsActive]   = useState(test?.is_active !== false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Test name is required'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = { name, code, category, normal_range: normalRange, unit, price, description, is_active: isActive };
      if (test) {
        await labApi.updateTest(test.id, payload);
        toast.success('Changes saved successfully');
      } else {
        await labApi.createTest(payload);
        toast.success(`'${name}' added to catalog`);
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={test ? 'Edit Test' : 'Add Lab Test'} onClose={onClose} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{test ? 'Save Changes' : 'Add Test'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Test Name" required value={name} onChange={e => setName(e.target.value)} error={error} placeholder="e.g. Full Blood Count" />
          <Input label="Code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. FBC" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Category" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Haematology" />
          <Input label="Price (LKR)" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Normal Range" value={normalRange} onChange={e => setNormalRange(e.target.value)} placeholder="e.g. 70–100 mg/dL" />
          <Input label="Unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. mg/dL" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">
            Description <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span>
          </label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of this test..."
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
        </div>
        {test && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-primary)]" />
            <span className="text-sm text-[var(--color-text)]">Active (visible to doctors when requesting tests)</span>
          </label>
        )}
      </div>
    </Modal>
  );
}
