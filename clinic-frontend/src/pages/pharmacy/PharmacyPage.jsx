import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Pill, Truck, Users, SlidersHorizontal, ChevronLeft, ChevronRight,
  Check, AlertTriangle, Plus, Trash2, Edit2, Package, Clock,
} from 'lucide-react';
import { PageLayout }    from '../../components/layout/PageLayout';
import { PageHeader }    from '../../components/ui/PageHeader';
import { Button }        from '../../components/ui/Button';
import { Input }         from '../../components/ui/Input';
import { Select }        from '../../components/ui/Select';
import { Modal }         from '../../components/ui/Modal';
import { Badge }         from '../../components/ui/Badge';
import { Card }          from '../../components/ui/Card';
import { EmptyState }    from '../../components/ui/EmptyState';
import { LoadingState }  from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DatePicker }    from '../../components/ui/DatePicker';
import { pharmacyApi }   from '../../api/pharmacy';
import { medicinesApi }  from '../../api/medicines';
import { formatDate, toInputDate } from '../../utils/format';

const TABS = [
  { key: 'dispense',    label: 'Dispense Queue', icon: Pill   },
  { key: 'orders',      label: 'Purchase Orders',icon: Truck  },
  { key: 'suppliers',   label: 'Suppliers',       icon: Users  },
  { key: 'adjustments', label: 'Stock Adjustments', icon: SlidersHorizontal },
];

const PO_STATUS_VARIANT = { draft: 'neutral', ordered: 'info', received: 'success', cancelled: 'danger' };

const ADJUSTMENT_TYPES = [
  { value: 'add',     label: 'Add Stock (found / manual add)' },
  { value: 'remove',  label: 'Remove Stock (manual removal)' },
  { value: 'damaged', label: 'Damaged / Destroyed' },
  { value: 'expired', label: 'Expired — removed from shelf' },
];

export default function PharmacyPage() {
  const [tab, setTab] = useState('dispense');

  return (
    <PageLayout title="Pharmacy">
      <PageHeader title="Pharmacy" subtitle="Dispensing, stock orders, and inventory management" />

      {/* Tab bar */}
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

      {tab === 'dispense'    && <DispenseTab />}
      {tab === 'orders'      && <PurchaseOrdersTab />}
      {tab === 'suppliers'   && <SuppliersTab />}
      {tab === 'adjustments' && <AdjustmentsTab />}
    </PageLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — DISPENSE QUEUE
// ══════════════════════════════════════════════════════════════════════════════
function DispenseTab() {
  const today = toInputDate(new Date());
  const [date, setDate] = useState(today);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getDispenseQueue(d);
      setQueue(res.data.data);
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

  async function handleDispense(rx) {
    setDispensing(rx.id);
    try {
      await pharmacyApi.dispense(rx.id);
      toast.success(`${rx.rx_number} dispensed successfully`);
      load(date);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setDispensing(null);
    }
  }

  const pending   = queue.filter(r => !r.is_dispensed);
  const dispensed = queue.filter(r => r.is_dispensed);

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
          {pending.length} pending · {dispensed.length} dispensed
        </span>
      </div>

      {loading ? <LoadingState message="Loading prescriptions..." /> : queue.length === 0 ? (
        <EmptyState icon={Pill} title="No prescriptions for this date" description="Prescriptions written today will appear here for dispensing." />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Pending */}
          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Pending Dispense</p>
              {pending.map(rx => (
                <RxCard
                  key={rx.id} rx={rx}
                  expanded={expandedId === rx.id}
                  onToggle={() => setExpandedId(expandedId === rx.id ? null : rx.id)}
                  onDispense={() => handleDispense(rx)}
                  dispensing={dispensing === rx.id}
                />
              ))}
            </div>
          )}

          {/* Dispensed */}
          {dispensed.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Dispensed</p>
              {dispensed.map(rx => (
                <RxCard
                  key={rx.id} rx={rx}
                  expanded={expandedId === rx.id}
                  onToggle={() => setExpandedId(expandedId === rx.id ? null : rx.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RxCard({ rx, expanded, onToggle, onDispense, dispensing }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border transition-colors ${
      rx.is_dispensed ? 'border-[var(--color-border)] opacity-70' : 'border-[var(--color-border)] bg-[var(--color-surface)]'
    } bg-[var(--color-surface)]`}>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            rx.is_dispensed ? 'bg-[var(--color-success-light)]' : 'bg-[var(--color-primary-light)]'
          }`}>
            {rx.is_dispensed
              ? <Check className="w-4 h-4 text-[var(--color-success)]" />
              : <Pill  className="w-4 h-4 text-[var(--color-primary)]" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">{rx.patient_name}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {rx.rx_number} · Dr. {rx.doctor_name} · {rx.items?.length ?? 0} medicine{rx.items?.length !== 1 ? 's' : ''}
            </p>
          </div>
          {rx.allergies && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-danger-light)] text-[var(--color-danger)] font-medium">
              <AlertTriangle className="w-3 h-3" /> Allergies
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {rx.is_dispensed ? (
            <span className="text-xs text-[var(--color-text-secondary)]">
              Dispensed {rx.dispensed_by_name ? `by ${rx.dispensed_by_name}` : ''}
            </span>
          ) : (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onDispense(); }} loading={dispensing}>
              <Check className="w-3.5 h-3.5" /> Dispense
            </Button>
          )}
        </div>
      </div>

      {/* Expanded items */}
      {expanded && rx.items?.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          {rx.allergies && (
            <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-[var(--radius)] bg-[var(--color-danger-light)] text-[var(--color-danger)]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs font-medium">Allergy note: {rx.allergies}</p>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--color-text-secondary)]">
                <th className="text-left pb-2 font-medium">Medicine</th>
                <th className="text-left pb-2 font-medium">Dosage</th>
                <th className="text-left pb-2 font-medium">Duration</th>
                <th className="text-right pb-2 font-medium">Qty</th>
                <th className="text-right pb-2 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {rx.items.map((it, i) => (
                <tr key={i} className="border-t border-[var(--color-border)]">
                  <td className="py-2">
                    <p className="font-medium text-[var(--color-text)]">{it.medicine_name}</p>
                    {it.strength && <p className="text-xs text-[var(--color-text-secondary)]">{it.strength} · {it.unit}</p>}
                  </td>
                  <td className="py-2 text-[var(--color-text-secondary)]">{it.dosage} · {it.frequency}</td>
                  <td className="py-2 text-[var(--color-text-secondary)]">{it.duration}</td>
                  <td className="py-2 text-right font-medium text-[var(--color-text)]">{it.quantity_given ?? '—'}</td>
                  <td className={`py-2 text-right text-xs font-semibold ${it.stock <= 5 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                    {it.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — PURCHASE ORDERS
// ══════════════════════════════════════════════════════════════════════════════
function PurchaseOrdersTab() {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOrder, setViewOrder]   = useState(null); // full PO object for receive modal

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getPurchaseOrders();
      setOrders(res.data.data);
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openView(po) {
    try {
      const res = await pharmacyApi.getPurchaseOrder(po.id);
      setViewOrder(res.data.data);
    } catch { toast.error('Could not load order details.'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> New Purchase Order</Button>
      </div>

      {loading ? <LoadingState message="Loading orders..." /> : orders.length === 0 ? (
        <EmptyState icon={Truck} title="No purchase orders yet" description="Create a PO when you receive new stock from a supplier." action={<Button size="sm" onClick={() => setCreateOpen(true)}>+ New Order</Button>} />
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">PO #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Total Cost</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map(po => (
                <tr key={po.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{po.po_number}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{po.supplier_name || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(po.order_date)}</td>
                  <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{po.item_count}</td>
                  <td className="px-4 py-3 text-right text-[var(--color-text)]">
                    {po.total_cost > 0 ? `LKR ${parseFloat(po.total_cost).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={PO_STATUS_VARIANT[po.status]} label={po.status.charAt(0).toUpperCase() + po.status.slice(1)} />
                  </td>
                  <td className="px-4 py-3">
                    {po.status !== 'received' && po.status !== 'cancelled' && (
                      <Button size="sm" variant="ghost" onClick={() => openView(po)}>
                        Receive Stock
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreatePOModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); load(); }} />
      {viewOrder && (
        <ReceivePOModal po={viewOrder} onClose={() => setViewOrder(null)} onSuccess={() => { setViewOrder(null); load(); }} />
      )}
    </div>
  );
}

function CreatePOModal({ open, onClose, onSuccess }) {
  const [suppliers, setSuppliers]   = useState([]);
  const [medicines, setMedicines]   = useState([]);
  const [supplierId, setSupplierId] = useState('none');
  const [orderDate, setOrderDate]   = useState(toInputDate(new Date()));
  const [notes, setNotes]           = useState('');
  const [items, setItems]           = useState([{ medicine_id: '', quantity_ordered: 1, cost_price: '' }]);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([pharmacyApi.getSuppliers(), medicinesApi.list({})])
      .then(([s, m]) => {
        setSuppliers(s.data.data.filter(x => x.is_active));
        setMedicines(m.data.data);
      })
      .catch(() => {});
    setSupplierId('none'); setNotes(''); setOrderDate(toInputDate(new Date()));
    setItems([{ medicine_id: '', quantity_ordered: 1, cost_price: '' }]);
  }, [open]);

  function addRow()      { setItems(p => [...p, { medicine_id: '', quantity_ordered: 1, cost_price: '' }]); }
  function removeRow(i)  { setItems(p => p.filter((_, idx) => idx !== i)); }
  function updateItem(i, field, val) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }

  const medicineOptions = medicines.map(m => ({
    value: m.id,
    label: `${m.name}${m.strength ? ` ${m.strength}` : ''} (stock: ${m.stock_quantity})`,
  }));
  const supplierOptions = [{ value: 'none', label: 'No supplier' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))];

  async function handleSave() {
    const valid = items.every(it => it.medicine_id && it.quantity_ordered > 0);
    if (!valid) { toast.error('Please fill in all required fields'); return; }
    setSaving(true);
    try {
      await pharmacyApi.createPurchaseOrder({ supplier_id: supplierId === 'none' ? null : supplierId, order_date: orderDate, notes, items });
      toast.success('Purchase order created successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setSaving(false); }
  }

  const totalCost = items.reduce((s, it) => s + ((parseFloat(it.cost_price) || 0) * (parseInt(it.quantity_ordered, 10) || 0)), 0);

  return (
    <Modal open={open} onClose={onClose} title="New Purchase Order" size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Create Order</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Supplier" options={supplierOptions} value={supplierId} onValueChange={setSupplierId} />
          <DatePicker label="Order Date" value={orderDate} onChange={setOrderDate} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes about this order..."
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">Order Items</p>
            <Button size="sm" variant="ghost" onClick={addRow}><Plus className="w-3.5 h-3.5" /> Add Item</Button>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-end">
                <Select
                  label={i === 0 ? 'Medicine' : undefined}
                  placeholder="Select medicine..."
                  options={medicineOptions}
                  value={it.medicine_id}
                  onValueChange={v => updateItem(i, 'medicine_id', v)}
                />
                <div className="flex flex-col gap-1">
                  {i === 0 && <label className="text-sm font-medium text-[var(--color-text)]">Qty</label>}
                  <input type="number" min="1" value={it.quantity_ordered}
                    onChange={e => updateItem(i, 'quantity_ordered', parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
                <div className="flex flex-col gap-1">
                  {i === 0 && <label className="text-sm font-medium text-[var(--color-text)]">Cost/unit (LKR)</label>}
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={it.cost_price}
                    onChange={e => updateItem(i, 'cost_price', e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
                <div className={i === 0 ? 'mt-5' : ''}>
                  <button onClick={() => removeRow(i)} disabled={items.length === 1}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] disabled:opacity-30 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalCost > 0 && (
            <p className="text-right text-sm font-semibold text-[var(--color-text)] mt-3">
              Total: LKR {totalCost.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReceivePOModal({ po, onClose, onSuccess }) {
  const [items, setItems] = useState(() =>
    (po.items || []).map(it => ({ ...it, qty_input: String(it.quantity_ordered) }))
  );
  const [saving, setSaving] = useState(false);

  function updateQty(i, val) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, qty_input: val } : it));
  }

  async function handleReceive() {
    setSaving(true);
    try {
      const payload = items.map(it => ({ id: it.id, quantity_received: parseInt(it.qty_input, 10) || 0 }));
      await pharmacyApi.receivePurchaseOrder(po.id, { items: payload });
      toast.success('Stock updated — purchase order received');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Receive Stock — ${po.po_number}`} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReceive} loading={saving}>Confirm Receipt — Update Stock</Button>
        </>
      }
    >
      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        Enter the actual quantity received for each item. Stock will be added immediately.
      </p>
      <div className="flex flex-col gap-2">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-4 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)]">
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-text)]">{it.medicine_name}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{it.unit}{it.strength ? ` · ${it.strength}` : ''}</p>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">Ordered: {it.quantity_ordered}</span>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[var(--color-text-secondary)]">Received</label>
              <input type="number" min="0" value={it.qty_input}
                onChange={e => updateQty(i, e.target.value)}
                className="w-20 px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — SUPPLIERS
// ══════════════════════════════════════════════════════════════════════════════
function SuppliersTab() {
  const [suppliers, setSuppliers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getSuppliers();
      setSuppliers(res.data.data);
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await pharmacyApi.deleteSupplier(deleteTarget.id);
      toast.success('Deleted successfully');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally { setDeleting(false); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditTarget(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      {loading ? <LoadingState message="Loading suppliers..." /> : suppliers.length === 0 ? (
        <EmptyState icon={Users} title="No suppliers yet" description="Add your medicine suppliers to use them in purchase orders." action={<Button size="sm" onClick={() => { setEditTarget(null); setModalOpen(true); }}>+ Add Supplier</Button>} />
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                {['Supplier', 'Contact', 'Phone', 'Email', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{s.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{s.contact || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{s.email || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.is_active ? 'success' : 'neutral'} label={s.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditTarget(s); setModalOpen(true); }}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {s.is_active && (
                        <button onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SupplierModal open={modalOpen} supplier={editTarget} onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); load(); }} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Remove Supplier" message={`Remove "${deleteTarget?.name}" from suppliers?`} confirmLabel="Remove" />
    </div>
  );
}

function SupplierModal({ open, supplier, onClose, onSuccess }) {
  const isEdit = !!supplier;
  const [name, setName]       = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone]     = useState('');
  const [email, setEmail]     = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  useEffect(() => {
    if (open) {
      setName(supplier?.name || '');    setContact(supplier?.contact || '');
      setPhone(supplier?.phone || '');  setEmail(supplier?.email || '');
      setAddress(supplier?.address || ''); setErr('');
    }
  }, [open, supplier]);

  async function handleSave() {
    if (!name.trim()) { setErr('Supplier name is required'); return; }
    setSaving(true);
    try {
      const data = { name, contact, phone, email, address };
      if (isEdit) { await pharmacyApi.updateSupplier(supplier.id, data); toast.success('Changes saved successfully'); }
      else        { await pharmacyApi.createSupplier(data); toast.success(`'${name}' created successfully`); }
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Supplier' : 'Add Supplier'} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{isEdit ? 'Save Changes' : 'Add Supplier'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Supplier Name" required value={name} onChange={e => setName(e.target.value)} error={err} placeholder="e.g. MedSupply Lanka" />
        <Input label="Contact Person" value={contact} onChange={e => setContact(e.target.value)} placeholder="Contact name" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94 77 000 0000" />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="orders@supplier.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Address</label>
          <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, city, district"
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — STOCK ADJUSTMENTS
// ══════════════════════════════════════════════════════════════════════════════
function AdjustmentsTab() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [medicines, setMedicines]     = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getAdjustments({ limit: 100 });
      setAdjustments(res.data.data);
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (modalOpen) {
      medicinesApi.list({}).then(r => setMedicines(r.data.data)).catch(() => {});
    }
  }, [modalOpen]);

  const TYPE_VARIANT = { add: 'success', remove: 'warning', damaged: 'danger', expired: 'danger' };
  const TYPE_SIGN    = { add: '+', remove: '−', damaged: '−', expired: '−' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">Manual stock corrections — damaged, expired, or found stock</p>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> Log Adjustment</Button>
      </div>

      {loading ? <LoadingState message="Loading adjustments..." /> : adjustments.length === 0 ? (
        <EmptyState icon={SlidersHorizontal} title="No adjustments logged" description="Record when stock is damaged, expired, or manually corrected." action={<Button size="sm" onClick={() => setModalOpen(true)}>+ Log Adjustment</Button>} />
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                {['Medicine', 'Type', 'Qty', 'Reason', 'By', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adjustments.map(a => (
                <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{a.medicine_name} <span className="text-xs text-[var(--color-text-secondary)] font-normal">{a.unit}</span></td>
                  <td className="px-4 py-3">
                    <Badge variant={TYPE_VARIANT[a.type]} label={a.type.charAt(0).toUpperCase() + a.type.slice(1)} />
                  </td>
                  <td className={`px-4 py-3 font-semibold ${a.type === 'add' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {TYPE_SIGN[a.type]}{a.quantity}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{a.reason || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{a.adjusted_by_name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdjustmentModal
        open={modalOpen}
        medicines={medicines}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); load(); }}
      />
    </div>
  );
}

function AdjustmentModal({ open, medicines, onClose, onSuccess }) {
  const [medicineId, setMedicineId] = useState('');
  const [type, setType]             = useState('');
  const [quantity, setQuantity]     = useState('');
  const [reason, setReason]         = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (open) { setMedicineId(''); setType(''); setQuantity(''); setReason(''); }
  }, [open]);

  const medOptions = medicines.map(m => ({
    value: m.id,
    label: `${m.name}${m.strength ? ` ${m.strength}` : ''} — stock: ${m.stock_quantity}`,
  }));

  async function handleSave() {
    if (!medicineId || !type || !quantity || parseInt(quantity, 10) <= 0) {
      toast.error('Please fill in all required fields'); return;
    }
    setSaving(true);
    try {
      await pharmacyApi.createAdjustment({ medicine_id: medicineId, type, quantity: parseInt(quantity, 10), reason });
      toast.success('Changes saved successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Stock Adjustment" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Adjustment</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="Medicine" required placeholder="Select medicine..." options={medOptions} value={medicineId} onValueChange={setMedicineId} />
        <Select label="Adjustment Type" required placeholder="Select type..." options={ADJUSTMENT_TYPES} value={type} onValueChange={setType} />
        <Input label="Quantity" required type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 10" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Reason <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span></label>
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Fell off shelf, batch expired, stock count correction"
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
        </div>
        {type && type !== 'add' && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius)] bg-[var(--color-warning-light)] text-[var(--color-warning)]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs">This will decrease the medicine's stock quantity. Make sure the count is correct before saving.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
