import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react';

function fmt(v) {
  return `LKR ${parseFloat(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

const STATUS_STYLE = {
  paid:    'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  unpaid:  'bg-red-100 text-red-800',
};

export default function PatientInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(null);
  const [detail,   setDetail]   = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);

  useEffect(() => {
    patientPortalApi.getInvoices()
      .then(r => setInvoices(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleDetail(id) {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (!detail[id]) {
      setLoadingDetail(id);
      try {
        const r = await patientPortalApi.getInvoice(id);
        setDetail(prev => ({ ...prev, [id]: r.data.data }));
      } catch { /* ignore */ }
      finally { setLoadingDetail(null); }
    }
  }

  return (
    <PatientLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-black text-[var(--color-ink)]">Invoices</h1>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-[var(--color-ink-faint)] text-sm">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-10 text-center">
            <Receipt className="w-8 h-8 text-[var(--color-ink-faint)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-ink-light)]">No invoices on record</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => {
              const d = detail[inv.id];
              const isOpen = open === inv.id;
              return (
                <div key={inv.id} className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  <button
                    onClick={() => toggleDetail(inv.id)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] flex items-center justify-center shrink-0">
                      <Receipt className="w-4.5 h-4.5 text-[var(--color-ink-light)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--color-ink)]">{inv.invoice_number}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-ink-light)] mt-0.5">
                        {format(new Date(inv.created_at), 'd MMM yyyy')}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-bold text-[var(--color-ink)]">{fmt(inv.total_amount)}</span>
                        {parseFloat(inv.balance) > 0 && (
                          <span className="text-xs text-red-600">Balance: {fmt(inv.balance)}</span>
                        )}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[var(--color-ink-faint)] shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-[var(--color-ink-faint)] shrink-0 mt-0.5" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-[var(--color-border)] p-4 space-y-4">
                      {loadingDetail === inv.id ? (
                        <p className="text-xs text-[var(--color-ink-faint)]">Loading…</p>
                      ) : d ? (
                        <>
                          {/* Line items */}
                          <div>
                            <p className="text-xs font-semibold text-[var(--color-ink-light)] mb-2">Items</p>
                            <div className="space-y-1">
                              {d.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-[var(--color-ink)] truncate mr-2">{item.description}</span>
                                  <span className="text-[var(--color-ink)] shrink-0 font-medium">{fmt(item.line_total)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Totals */}
                          <div className="border-t border-[var(--color-border)] pt-3 space-y-1">
                            {parseFloat(d.discount) > 0 && (
                              <div className="flex justify-between text-xs text-[var(--color-ink-light)]">
                                <span>Discount</span><span>- {fmt(d.discount)}</span>
                              </div>
                            )}
                            {parseFloat(d.tax_amount) > 0 && (
                              <div className="flex justify-between text-xs text-[var(--color-ink-light)]">
                                <span>Tax</span><span>{fmt(d.tax_amount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-[var(--color-ink)]">
                              <span>Total</span><span>{fmt(d.total_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-700">
                              <span>Paid</span><span>{fmt(d.paid_amount)}</span>
                            </div>
                            {parseFloat(d.balance) > 0 && (
                              <div className="flex justify-between text-sm font-semibold text-red-600">
                                <span>Balance Due</span><span>{fmt(d.balance)}</span>
                              </div>
                            )}
                          </div>

                          {/* Payments */}
                          {d.payments.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-[var(--color-ink-light)] mb-2">Payment History</p>
                              <div className="space-y-1">
                                {d.payments.map((p, i) => (
                                  <div key={i} className="flex justify-between text-xs text-[var(--color-ink-light)]">
                                    <span className="capitalize">{p.payment_method} {p.reference ? `(${p.reference})` : ''}</span>
                                    <span>{fmt(p.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
