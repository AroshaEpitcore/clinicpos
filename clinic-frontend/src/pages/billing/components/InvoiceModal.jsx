import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, CreditCard, Banknote, Smartphone, Shield, ChevronDown, Download } from 'lucide-react';
import { Modal }        from '../../../components/ui/Modal';
import { Button }       from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/Spinner';
import { invoicesApi, customServicesApi } from '../../../api/invoices';
import { formatCurrency, formatDate }     from '../../../utils/format';
import { PaymentStatusBadge }             from '../BillingPage';

const PAYMENT_METHODS = [
  { value: 'Cash',      label: 'Cash',      icon: Banknote },
  { value: 'Card',      label: 'Card',      icon: CreditCard },
  { value: 'Online',    label: 'Online',    icon: Smartphone },
  { value: 'Insurance', label: 'Insurance', icon: Shield },
];

export function InvoiceModal({ invoiceId, onClose, onSuccess }) {
  const [invoice,      setInvoice]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [services,     setServices]     = useState([]);
  const [showAddItem,  setShowAddItem]  = useState(false);
  const [showPay,      setShowPay]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [downloading,  setDownloading]  = useState(false);

  // Add item form
  const [newItem, setNewItem] = useState({ description: '', item_type: 'service', quantity: 1, unit_price: '' });
  const [servicePickerOpen, setServicePickerOpen] = useState(false);

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
      setInvoice(res.data.data);
      // Pre-fill payment amount with remaining balance
      setPayAmount(String(parseFloat(res.data.data.balance_due || 0).toFixed(2)));
    } catch {
      toast.error('Could not load invoice.');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem() {
    if (!newItem.description || !newItem.unit_price) {
      toast.error('Description and price are required.');
      return;
    }
    setSaving(true);
    try {
      await invoicesApi.addItem(invoiceId, newItem);
      toast.success('Item added');
      setNewItem({ description: '', item_type: 'service', quantity: 1, unit_price: '' });
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
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Something went wrong.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function selectService(svc) {
    setNewItem({ description: svc.name, item_type: 'service', quantity: 1, unit_price: String(svc.price) });
    setServicePickerOpen(false);
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
    <Modal
      open
      onClose={onClose}
      title={invoice ? `Invoice ${invoice.invoice_number}` : 'Invoice'}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <div className="flex items-center gap-2">
            {invoice && (
              <Button variant="secondary" onClick={handleDownloadPdf} loading={downloading}>
                <Download className="w-4 h-4 mr-1" /> PDF
              </Button>
            )}
            {!isPaid && invoice && (
              <Button onClick={() => setShowPay(true)}>
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
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Dr. {invoice.doctor_name}</p>
              )}
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{formatDate(invoice.created_at)}</p>
            </div>
            <PaymentStatusBadge status={invoice.payment_status} />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">Line Items</p>
              {!isPaid && (
                <button
                  onClick={() => setShowAddItem(v => !v)}
                  className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              )}
            </div>

            {/* Add item form */}
            {showAddItem && (
              <div className="mb-3 p-3 rounded-[var(--radius)] border border-[var(--color-primary)] bg-[var(--color-primary-light)]">
                <div className="flex items-center gap-2 mb-2">
                  {/* Service picker */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Description"
                      value={newItem.description}
                      onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    {services.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setServicePickerOpen(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    )}
                    {servicePickerOpen && services.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-lg max-h-48 overflow-y-auto">
                        {services.map(svc => (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => selectService(svc)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg)] flex items-center justify-between"
                          >
                            <span>{svc.name}</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">{formatCurrency(svc.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={newItem.quantity}
                    onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-16 px-2 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={e => setNewItem(p => ({ ...p, unit_price: e.target.value }))}
                    className="w-28 px-2 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <Button size="sm" onClick={handleAddItem} loading={saving}>Add</Button>
                  <button onClick={() => setShowAddItem(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] text-xs">Cancel</button>
                </div>
              </div>
            )}

            <div className="rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Description</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Unit</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Total</th>
                    {!isPaid && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map(item => (
                    <tr key={item.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-3 py-2">
                        <p className="text-sm text-[var(--color-text)]">{item.description}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] capitalize">{item.item_type}</p>
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-[var(--color-text)]">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-sm text-[var(--color-text)]">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-[var(--color-text)]">{formatCurrency(item.total_price)}</td>
                      {!isPaid && (
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors"
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
            <div className="w-64 flex flex-col gap-1">
              <TotalRow label="Subtotal"    value={formatCurrency(invoice.subtotal)} />
              {parseFloat(invoice.discount_amount) > 0 && (
                <TotalRow label={`Discount${invoice.discount_reason ? ` (${invoice.discount_reason})` : ''}`}
                  value={`− ${formatCurrency(invoice.discount_amount)}`}
                  valueClass="text-[var(--color-success)]" />
              )}
              {parseFloat(invoice.tax_amount) > 0 && (
                <TotalRow label="Tax" value={formatCurrency(invoice.tax_amount)} />
              )}
              <div className="border-t border-[var(--color-border)] pt-1 mt-1">
                <TotalRow label="Total"   value={formatCurrency(invoice.total_amount)} bold />
                <TotalRow label="Paid"    value={formatCurrency(invoice.paid_amount)}  valueClass="text-[var(--color-success)]" />
                <TotalRow label="Balance" value={formatCurrency(invoice.balance_due)}
                  bold valueClass={parseFloat(invoice.balance_due) > 0 ? 'text-[var(--color-danger)]' : ''} />
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
                    className="flex items-center justify-between px-3 py-2 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
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
            <div className="p-4 rounded-[var(--radius)] border border-[var(--color-primary)] bg-[var(--color-primary-light)]">
              <p className="text-sm font-semibold text-[var(--color-text)] mb-3">Record Payment</p>

              {/* Method selector */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPayMethod(m.value)}
                      className={`flex flex-col items-center gap-1 py-2 px-3 rounded-[var(--radius)] border text-xs font-medium transition-colors ${
                        payMethod === m.value
                          ? 'border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Amount (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                {(payMethod === 'Card' || payMethod === 'Online' || payMethod === 'Insurance') && (
                  <div className="flex-1">
                    <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                      {payMethod === 'Card' ? 'Last 4 digits' : payMethod === 'Insurance' ? 'Claim / Policy No.' : 'Reference / UTR'}
                    </label>
                    <input
                      type="text"
                      value={payReference}
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
