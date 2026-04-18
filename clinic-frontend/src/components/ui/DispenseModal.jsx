import { AlertTriangle, Check } from 'lucide-react';
import { Modal }   from './Modal';
import { Button }  from './Button';

/**
 * DispenseModal — confirm before dispensing a prescription.
 *
 * Props:
 *   open        boolean
 *   onClose     () => void
 *   rx          prescription object with .items[], .patient_name, .rx_number,
 *               .allergies, .doctor_name   (items may optionally have .stock)
 *   onConfirm   () => void   — called when user clicks Confirm Dispense
 *   confirming  boolean      — shows loading state on the confirm button
 */
export function DispenseModal({ open, onClose, rx, onConfirm, confirming }) {
  if (!rx) return null;

  const hasAllergies = Boolean(rx.allergies?.trim());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dispense Prescription"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button size="sm" loading={confirming} onClick={onConfirm}>
            <Check className="w-3.5 h-3.5 mr-1" />
            Confirm Dispense
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">

        {/* Rx + patient header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              {rx.rx_number}
            </p>
            <p className="text-lg font-bold text-[var(--color-text)] mt-0.5">{rx.patient_name}</p>
            {rx.patient_code && (
              <p className="text-xs text-[var(--color-text-secondary)]">{rx.patient_code}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-secondary)]">Prescribing doctor</p>
            <p className="text-sm font-medium text-[var(--color-text)]">{rx.doctor_name}</p>
          </div>
        </div>

        {/* Allergy warning — prominent if present */}
        {hasAllergies && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius)] bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-[var(--color-danger)]">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Allergy Warning</p>
              <p className="text-sm mt-0.5">{rx.allergies}</p>
            </div>
          </div>
        )}

        {/* Medicines table */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
            Medicines to Dispense ({rx.items?.length ?? 0})
          </p>

          <div className="rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                  {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Qty', 'Stock'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rx.items || []).map((item, i) => {
                  const stockNum  = item.stock ?? null;
                  const threshold = item.reorder_level != null ? item.reorder_level : 5;
                  const lowStock  = stockNum !== null && stockNum <= threshold;
                  return (
                    <tr
                      key={item.id ?? i}
                      className={`border-b border-[var(--color-border)] last:border-0 ${
                        lowStock ? 'bg-[var(--color-danger-light)]' : i % 2 === 1 ? 'bg-[var(--color-bg)]' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-[var(--color-text)]">{item.medicine_name}</p>
                        {(item.strength || item.unit) && (
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {[item.strength, item.unit].filter(Boolean).join(' ')}
                          </p>
                        )}
                        {item.generic_name && (
                          <p className="text-xs text-[var(--color-text-secondary)]">{item.generic_name}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--color-text)]">{item.dosage || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--color-text)]">{item.frequency || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--color-text)] whitespace-nowrap">{item.duration || '—'}</td>
                      <td className="px-3 py-2.5 text-center font-medium text-[var(--color-text)]">
                        {item.quantity_given ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {stockNum !== null ? (
                          <span className={`text-xs font-bold ${lowStock ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                            {stockNum}
                            {lowStock && <span className="ml-1 text-[10px]">LOW</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-secondary)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Low stock notice */}
          {(rx.items || []).some(it => it.stock !== undefined && it.stock !== null && it.stock <= (it.reorder_level ?? 5)) && (
            <p className="mt-2 text-xs text-[var(--color-danger)] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              One or more medicines are low in stock. Verify before dispensing.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
