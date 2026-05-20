import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import { useLang } from '../../i18n/LangContext';
import PatientLayout from './PatientLayout';
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react';

function fmt(v) {
  return `LKR ${parseFloat(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

const STATUS_STYLE = {
  paid:    'bg-green-100 text-green-700 border-green-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  unpaid:  'bg-red-100 text-red-600 border-red-200',
};

export default function PatientInvoicesPage() {
  const { t } = useLang();
  const [invoices,      setInvoices]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [open,          setOpen]          = useState(null);
  const [detail,        setDetail]        = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);

  useEffect(() => {
    patientPortalApi.getInvoices()
      .then(r => setInvoices(r.data.data))
      .catch(() => { toast.error(t('common.somethingWrong')); })
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
        <h1 className="text-lg font-black text-[var(--color-text)]">{t('inv.title')}</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-[var(--radius)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-28" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                  <div className="h-4 bg-gray-100 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-10 text-center">
            <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('inv.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => {
              const d = detail[inv.id];
              const isOpen = open === inv.id;
              return (
                <div key={inv.id} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
                  {/* Row */}
                  <button
                    onClick={() => toggleDetail(inv.id)}
                    className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-[var(--radius)] bg-gray-50 border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      <Receipt className="w-4.5 h-4.5 text-[var(--color-text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[var(--color-text)]">{inv.invoice_number}</span>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_STYLE[inv.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                        {format(new Date(inv.created_at), 'd MMM yyyy')}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm font-black text-[var(--color-text)]">{fmt(inv.total_amount)}</span>
                        {parseFloat(inv.balance) > 0 && (
                          <span className="text-xs font-semibold text-red-500">Due: {fmt(inv.balance)}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-gray-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Detail panel */}
                  {isOpen && (
                    <div className="border-t border-[var(--color-border)] bg-gray-50/50 p-4 space-y-4">
                      {loadingDetail === inv.id ? (
                        <div className="space-y-2 animate-pulse">
                          <div className="h-3 bg-gray-200 rounded w-full" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                      ) : d ? (
                        <>
                          {/* Line items */}
                          <div className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
                            <p className="text-[0.65rem] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide px-3 pt-3 pb-1">
                              Items
                            </p>
                            <div className="divide-y divide-[var(--color-border)]">
                              {d.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2.5 gap-3">
                                  <span className="text-sm text-[var(--color-text)] truncate">{item.description}</span>
                                  <span className="text-sm font-semibold text-[var(--color-text)] shrink-0">{fmt(item.line_total)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Totals */}
                          <div className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-3 space-y-2">
                            {parseFloat(d.discount) > 0 && (
                              <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                                <span>Discount</span><span className="text-green-600">− {fmt(d.discount)}</span>
                              </div>
                            )}
                            {parseFloat(d.tax_amount) > 0 && (
                              <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                                <span>Tax</span><span>{fmt(d.tax_amount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-[var(--color-border)] text-sm font-black text-[var(--color-text)]">
                              <span>Total</span><span>{fmt(d.total_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold text-green-600">
                              <span>Paid</span><span>{fmt(d.paid_amount)}</span>
                            </div>
                            {parseFloat(d.balance) > 0 && (
                              <div className="flex justify-between text-sm font-black text-red-600 bg-red-50 rounded-lg px-3 py-2 -mx-3">
                                <span>Balance Due</span><span>{fmt(d.balance)}</span>
                              </div>
                            )}
                          </div>

                          {/* Payment history */}
                          {d.payments?.length > 0 && (
                            <div className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
                              <p className="text-[0.65rem] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide px-3 pt-3 pb-1">
                                Payment History
                              </p>
                              <div className="divide-y divide-[var(--color-border)]">
                                {d.payments.map((p, i) => (
                                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                                    <div>
                                      <span className="text-sm text-[var(--color-text)] capitalize font-medium">{p.payment_method}</span>
                                      {p.reference && <span className="text-xs text-[var(--color-text-secondary)] ml-1.5">({p.reference})</span>}
                                    </div>
                                    <span className="text-sm font-semibold text-green-600">{fmt(p.amount)}</span>
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




