import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, CreditCard, Banknote, Smartphone, Shield, Download, Search, Package, Wrench, FileText, Check, X } from 'lucide-react';
import { Modal }          from '../../../components/ui/Modal';
import { Button }         from '../../../components/ui/Button';
import { LoadingState }   from '../../../components/ui/Spinner';
import { DispenseModal }  from '../../../components/ui/DispenseModal';
import { invoicesApi, customServicesApi } from '../../../api/invoices';
import { medicinesApi }   from '../../../api/medicines';
import { pharmacyApi }    from '../../../api/pharmacy';
import { prescriptionsApi } from '../../../api/prescriptions';
import { formatCurrency, formatDate }     from '../../../utils/format';
import { PaymentStatusBadge }             from '../BillingPage';

const PAYMENT_METHODS = [
  { value: 'Cash',      label: 'Cash',      icon: Banknote },
  { value: 'Card',      label: 'Card',      icon: CreditCard },
  { value: 'Online',    label: 'Online',    icon: Smartphone },
  { value: 'Insurance', label: 'Insurance', icon: Shield },
];

// ── Add Item Modal ─────────────────────────────────────────────────────────────
function AddItemModal({ open, onClose, onAdd, services = [], saving }) {
  const [tab,          setTab]          = useState('service');
  const [qty,          setQty]          = useState(1);
  const [unitPrice,    setUnitPrice]    = useState('');
  const [description,  setDescription]  = useState('');
  const [selectedSvc,  setSelectedSvc]  = useState(null);  // custom service
  const [selectedMed,  setSelectedMed]  = useState(null);  // medicine
  const [medSearch,    setMedSearch]    = useState('');
  const [medResults,   setMedResults]   = useState([]);
  const [medSearching, setMedSearching] = useState(false);
  const medTimer = useRef(null);

  // Reset everything when tab changes or modal opens
  useEffect(() => {
    if (open) resetAll();
  }, [open]);

  function resetAll() {
    setTab('service');
    setQty(1);
    setUnitPrice('');
    setDescription('');
    setSelectedSvc(null);
    setSelectedMed(null);
    setMedSearch('');
    setMedResults([]);
  }

  function switchTab(t) {
    setTab(t);
    setQty(1);
    setUnitPrice('');
    setDescription('');
    setSelectedSvc(null);
    setSelectedMed(null);
    setMedSearch('');
    setMedResults([]);
  }

  function selectService(svc) {
    setSelectedSvc(svc);
    setDescription(svc.name);
    setUnitPrice(String(svc.price));
    setQty(1);
  }

  function handleMedSearch(val) {
    setMedSearch(val);
    setSelectedMed(null);
    clearTimeout(medTimer.current);
    if (val.trim().length < 2) { setMedResults([]); return; }
    medTimer.current = setTimeout(async () => {
      setMedSearching(true);
      try {
        const res = await medicinesApi.list({ search: val.trim() });
        setMedResults(res.data.data || []);
      } catch { /* ignore */ } finally {
        setMedSearching(false);
      }
    }, 300);
  }

  function selectMedicine(med) {
    setSelectedMed(med);
    setDescription(`${med.name}${med.strength ? ' ' + med.strength : ''}`);
    setUnitPrice(med.selling_price != null ? String(med.selling_price) : '');
    setQty(1);
    setMedSearch(`${med.name}${med.strength ? ' ' + med.strength : ''}`);
    setMedResults([]);
  }

  function handleAdd() {
    const desc  = description.trim();
    const price = parseFloat(unitPrice);
    const q     = parseInt(qty) || 1;

    if (!desc) { toast.error('Description is required.'); return; }
    if (isNaN(price) || unitPrice === '') { toast.error('Price is required.'); return; }

    const itemTypeMap = { service: 'service', medicine: 'medicine', custom: 'other' };
    onAdd({
      description: desc,
      item_type:   itemTypeMap[tab] || 'other',
      quantity:    q,
      unit_price:  price,
    });
  }

  // Summary line shown at the bottom of the form
  const canAdd    = description.trim() && unitPrice !== '';
  const lineTotal = canAdd ? ((parseFloat(unitPrice) || 0) * (parseInt(qty) || 1)) : null;

  const TABS = [
    { key: 'service',  label: 'Service',  icon: Wrench },
    { key: 'medicine', label: 'Medicine', icon: Package },
    { key: 'custom',   label: 'Custom',   icon: FileText },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Line Item"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <div className="flex items-center gap-3">
            {canAdd && (
              <span className="text-sm text-[var(--color-text-secondary)]">
                Total: <span className="font-bold text-[var(--color-text)]">{formatCurrency(lineTotal)}</span>
              </span>
            )}
            <Button onClick={handleAdd} loading={saving} disabled={!canAdd}>
              Add to Invoice
            </Button>
          </div>
        </div>
      }
    >
      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border)] mb-5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── SERVICE TAB ──────────────────────────────────────────────────── */}
      {tab === 'service' && (
        <div className="flex flex-col gap-4">
          {services.length > 0 ? (
            <>
              <p className="text-xs text-[var(--color-text-secondary)]">Select a custom service from your Settings, then adjust qty and price if needed.</p>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {services.map(svc => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => selectService(svc)}
                    className={`flex items-center justify-between p-3 rounded-[var(--radius)] border text-left transition-colors ${
                      selectedSvc?.id === svc.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface)]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{svc.name}</p>
                      {svc.category && <p className="text-xs text-[var(--color-text-secondary)] capitalize">{svc.category}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(svc.price)}</span>
                      {selectedSvc?.id === svc.id && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                    </div>
                  </button>
                ))}
              </div>

              {selectedSvc && (
                <div className="flex gap-3 pt-2 border-t border-[var(--color-border)]">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Description</label>
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Qty</label>
                    <input
                      type="number" min="1" value={qty}
                      onChange={e => setQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Unit Price</label>
                    <input
                      type="number" step="0.01" value={unitPrice}
                      onChange={e => setUnitPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
              No custom services configured yet.<br />
              Add them in <span className="font-medium">Settings → Custom Services</span>.
            </div>
          )}

          {/* Manual fallback if no services or user wants something else */}
          {services.length > 0 && !selectedSvc && (
            <div className="pt-3 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">Or enter manually:</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text" placeholder="Service description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div className="w-20">
                  <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty"
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div className="w-32">
                  <input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="Price"
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MEDICINE TAB ─────────────────────────────────────────────────── */}
      {tab === 'medicine' && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[var(--color-text-secondary)]">Search the medicine store. Price auto-fills from the selling price.</p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Type medicine name..."
              value={medSearch}
              onChange={e => handleMedSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {medSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">searching...</span>
            )}
          </div>

          {/* Results */}
          {medResults.length > 0 && (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius)]">
              {medResults.map(med => (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => selectMedicine(med)}
                  className={`flex items-center justify-between px-3 py-2.5 text-sm border-b border-[var(--color-border)] last:border-0 transition-colors ${
                    selectedMed?.id === med.id
                      ? 'bg-[var(--color-primary-light)]'
                      : 'hover:bg-[var(--color-bg)]'
                  }`}
                >
                  <div className="text-left">
                    <span className="font-medium text-[var(--color-text)]">{med.name}</span>
                    {med.strength && <span className="text-[var(--color-text-secondary)] ml-1">{med.strength}</span>}
                    {med.generic_name && <span className="text-xs text-[var(--color-text-secondary)] ml-2">· {med.generic_name}</span>}
                    <span className={`ml-3 text-xs font-medium ${med.stock_quantity <= (med.reorder_level || 0) ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                      Stock: {med.stock_quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {med.selling_price != null ? formatCurrency(med.selling_price) : <span className="text-[var(--color-text-secondary)] font-normal">no price</span>}
                    </span>
                    {selectedMed?.id === med.id && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {medSearch.length >= 2 && !medSearching && medResults.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No medicines found for "{medSearch}"</p>
          )}

          {/* Selected medicine — qty + price */}
          {selectedMed && (
            <div className="flex gap-3 pt-2 border-t border-[var(--color-border)]">
              <div className="flex-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Description</label>
                <input
                  type="text" value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="w-20">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Qty</label>
                <input
                  type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="w-32">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Unit Price</label>
                <input
                  type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CUSTOM TAB ───────────────────────────────────────────────────── */}
      {tab === 'custom' && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[var(--color-text-secondary)]">Add any charge that isn't a medicine or predefined service — procedure fee, bandage, X-ray, lab referral, etc.</p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">Description <span className="text-[var(--color-danger)]">*</span></label>
              <input
                type="text"
                placeholder="e.g. X-Ray fee, Bandage, Procedure charge, Lab referral..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                autoFocus
                className="w-full px-3 py-2.5 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="flex gap-3">
              <div className="w-28">
                <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">Quantity</label>
                <input
                  type="number" min="1" value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">Unit Price <span className="text-[var(--color-danger)]">*</span></label>
                <input
                  type="number" step="0.01" min="0"
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Live preview */}
            {canAdd && (
              <div className="flex items-center justify-between p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{description}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{qty} × {formatCurrency(parseFloat(unitPrice) || 0)}</p>
                </div>
                <p className="text-base font-bold text-[var(--color-text)]">{formatCurrency(lineTotal)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main Invoice Modal ─────────────────────────────────────────────────────────
export function InvoiceModal({ invoiceId, onClose, onSuccess }) {
  const [invoice,     setInvoice]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [services,    setServices]    = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPay,     setShowPay]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Dispense
  const [dispenseRx,   setDispenseRx]   = useState(null);
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [dispensing,   setDispensing]   = useState(false);

  // Payment form
  const [payMethod,    setPayMethod]    = useState('Cash');
  const [payAmount,    setPayAmount]    = useState('');
  const [payReference, setPayReference] = useState('');

  useEffect(() => {
    loadInvoice();
    customServicesApi.list().then(r => setServices(r.data.data)).catch(() => {});
  }, [invoiceId]);

  async function loadInvoice() {
    setLoading(true);
    try {
      const res = await invoicesApi.getById(invoiceId);
      const inv = res.data.data;
      setInvoice(inv);
      setPayAmount(String(parseFloat(inv.balance_due || 0).toFixed(2)));

      // Load full prescription (with items + stock) if this invoice has one
      if (inv.prescription_id) {
        prescriptionsApi.getById(inv.prescription_id)
          .then(r => setDispenseRx(r.data.data))
          .catch(() => setDispenseRx(null));
      } else {
        setDispenseRx(null);
      }
    } catch {
      toast.error('Could not load invoice.');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(item) {
    setSaving(true);
    try {
      await invoicesApi.addItem(invoiceId, item);
      toast.success('Item added to invoice');
      setShowAddItem(false);
      loadInvoice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveItem(itemId) {
    setSaving(true);
    try {
      await invoicesApi.removeItem(invoiceId, itemId);
      toast.success('Item removed');
      loadInvoice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePay() {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }
    setSaving(true);
    try {
      await invoicesApi.pay(invoiceId, {
        payment_method: payMethod,
        amount:         parseFloat(payAmount),
        reference:      payReference || undefined,
      });
      toast.success('Payment recorded');
      setShowPay(false);
      setPayReference('');
      loadInvoice();
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDispense() {
    if (!dispenseRx) return;
    setDispensing(true);
    try {
      const res = await pharmacyApi.dispense(dispenseRx.id);
      toast.success(`${dispenseRx.rx_number} dispensed successfully`);
      const warnings = res.data?.data?.low_stock_warnings || [];
      if (warnings.length > 0) {
        const names = warnings.map(w => `${w.name} (${w.stock_quantity} left)`).join(', ');
        toast.warning(`Low stock after dispense: ${names}`, { duration: 6000 });
      }
      setDispenseOpen(false);
      // Refresh prescription state so button reflects dispensed
      const r = await prescriptionsApi.getById(dispenseRx.id);
      setDispenseRx(r.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setDispensing(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await invoicesApi.downloadPdf(invoiceId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${invoice?.invoice_number || 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not generate PDF.');
    } finally {
      setDownloading(false);
    }
  }

  const isPaid = invoice?.payment_status === 'paid';

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={invoice ? `Invoice ${invoice.invoice_number}` : 'Invoice'}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <div className="flex items-center gap-2">
              {/* Prescription dispense status / button */}
              {dispenseRx && (
                dispenseRx.is_dispensed ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)] px-2">
                    <Check className="w-3.5 h-3.5" />
                    Dispensed{dispenseRx.dispensed_by_name ? ` by ${dispenseRx.dispensed_by_name}` : ''}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setDispenseOpen(true)}
                  >
                    <Check className="w-4 h-4 mr-1" /> Dispense Rx
                  </Button>
                )
              )}
              {invoice && (
                <Button variant="secondary" onClick={handleDownloadPdf} loading={downloading}>
                  <Download className="w-4 h-4 mr-1" /> PDF
                </Button>
              )}
              {!isPaid && invoice && (
                <Button onClick={() => setShowPay(v => !v)}>
                  Record Payment
                </Button>
              )}
            </div>
          </div>
        }
      >
        {loading ? (
          <LoadingState message="Loading invoice..." />
        ) : (
          <div className="flex flex-col gap-5">

            {/* Patient + status header */}
            <div className="flex items-start justify-between p-4 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div>
                <p className="text-base font-bold text-[var(--color-text)]">
                  {invoice.first_name} {invoice.last_name}
                  <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">{invoice.patient_code}</span>
                </p>
                {invoice.doctor_name && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{invoice.doctor_name}</p>
                )}
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{formatDate(invoice.created_at)}</p>
              </div>
              <PaymentStatusBadge status={invoice.payment_status} />
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[var(--color-text)]">Line Items</p>
                {!isPaid && (
                  <Button size="sm" variant="secondary" onClick={() => setShowAddItem(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                  </Button>
                )}
              </div>

              <div className="rounded-[var(--radius)] border border-[var(--color-border)] overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Description</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Qty</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Unit Price</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Total</th>
                      {!isPaid && <th className="w-10 px-2 py-2.5" />}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map(item => (
                      <tr key={item.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[var(--color-text)]">{item.description}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] capitalize mt-0.5">{item.item_type}</p>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-[var(--color-text)]">{item.quantity}</td>
                        <td className="px-3 py-3 text-right text-sm text-[var(--color-text)]">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--color-text)]">{formatCurrency(item.total_price)}</td>
                        {!isPaid && (
                          <td className="px-2 py-3">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              title="Remove item"
                              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 flex flex-col gap-1.5">
                <TotalRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
                {parseFloat(invoice.discount_amount) > 0 && (
                  <TotalRow
                    label={`Discount${invoice.discount_reason ? ` (${invoice.discount_reason})` : ''}`}
                    value={`− ${formatCurrency(invoice.discount_amount)}`}
                    valueClass="text-[var(--color-success)]"
                  />
                )}
                {parseFloat(invoice.tax_amount) > 0 && (
                  <TotalRow label="Tax" value={formatCurrency(invoice.tax_amount)} />
                )}
                <div className="border-t border-[var(--color-border)] pt-2 mt-0.5 flex flex-col gap-1.5">
                  <TotalRow label="Total"   value={formatCurrency(invoice.total_amount)} bold />
                  <TotalRow label="Paid"    value={formatCurrency(invoice.paid_amount)}  valueClass="text-[var(--color-success)]" />
                  <TotalRow label="Balance" value={formatCurrency(invoice.balance_due)}  bold
                    valueClass={parseFloat(invoice.balance_due) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'} />
                </div>
              </div>
            </div>

            {/* Payment history */}
            {invoice.splits?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)] mb-2">Payment History</p>
                <div className="flex flex-col gap-1.5">
                  {invoice.splits.map(split => (
                    <div key={split.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <PayMethodIcon method={split.payment_method} />
                        <span className="text-sm text-[var(--color-text)]">{split.payment_method}</span>
                        {split.reference && (
                          <span className="text-xs text-[var(--color-text-secondary)]">· {split.reference}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[var(--color-success)]">
                          {formatCurrency(split.amount)}
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {new Date(split.recorded_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment form */}
            {showPay && !isPaid && (
              <div className="p-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Record Payment</p>
                  <button onClick={() => setShowPay(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPayMethod(m.value)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-[var(--radius)] border text-xs font-medium transition-colors ${
                          payMethod === m.value
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Amount</label>
                    <input
                      type="number" step="0.01" value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  {(payMethod === 'Card' || payMethod === 'Online' || payMethod === 'Insurance') && (
                    <div className="flex-1">
                      <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
                        {payMethod === 'Card' ? 'Last 4 digits' : payMethod === 'Insurance' ? 'Claim / Policy No.' : 'Reference / UTR'}
                      </label>
                      <input
                        type="text" value={payReference}
                        onChange={e => setPayReference(e.target.value)}
                        className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="secondary" size="sm" onClick={() => setShowPay(false)}>Cancel</Button>
                  <Button size="sm" onClick={handlePay} loading={saving}>Confirm Payment</Button>
                </div>
              </div>
            )}

          </div>
        )}
      </Modal>

      {/* Add Item — separate modal on top */}
      <AddItemModal
        open={showAddItem}
        onClose={() => setShowAddItem(false)}
        onAdd={handleAddItem}
        services={services}
        saving={saving}
      />

      {/* Dispense confirmation */}
      <DispenseModal
        open={dispenseOpen}
        onClose={() => setDispenseOpen(false)}
        rx={dispenseRx}
        onConfirm={handleDispense}
        confirming={dispensing}
      />
    </>
  );
}

function TotalRow({ label, value, bold, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? 'font-bold' : ''} ${valueClass || 'text-[var(--color-text)]'}`}>
        {value}
      </span>
    </div>
  );
}

function PayMethodIcon({ method }) {
  const map = { Cash: Banknote, Card: CreditCard, Online: Smartphone, Insurance: Shield };
  const Icon = map[method] || Banknote;
  return <Icon className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />;
}
