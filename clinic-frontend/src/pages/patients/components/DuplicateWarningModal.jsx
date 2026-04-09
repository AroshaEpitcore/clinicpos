import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { formatDate, formatAge } from '../../../utils/format';

export function DuplicateWarningModal({ open, onClose, matches, onUseExisting, onRegisterAnyway }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Possible Duplicate Patient"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="ghost" onClick={onRegisterAnyway}>Register as New</Button>
          <Button onClick={() => onUseExisting(matches[0])}>Use Existing Patient</Button>
        </>
      }
    >
      <div className="flex items-start gap-3 mb-4 p-3 rounded-[var(--radius)] bg-[var(--color-warning-light)]">
        <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--color-warning)]">
          A matching patient record was found. Please check before registering a new profile.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {matches.map(p => (
          <div
            key={p.id}
            className="border border-[var(--color-border)] rounded-[var(--radius)] p-4 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
            onClick={() => onUseExisting(p)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {p.first_name} {p.last_name}
                  <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">
                    {p.patient_code}
                  </span>
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {p.phone} &nbsp;·&nbsp; {formatAge(p.date_of_birth)} &nbsp;·&nbsp; {formatDate(p.date_of_birth)} &nbsp;·&nbsp; {p.gender}
                </p>
              </div>
              <span className="text-xs text-[var(--color-primary)] font-medium">Use this →</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--color-text-secondary)] mt-4">
        Click a record to use the existing patient, or click <strong>Register as New</strong> if this is genuinely a different person.
      </p>
    </Modal>
  );
}
