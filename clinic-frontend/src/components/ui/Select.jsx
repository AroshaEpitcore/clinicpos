import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

export function Select({ label, error, required, options = [], placeholder = 'Select...', value, onValueChange, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text)]">
          {label}
          {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          className={clsx(
            'flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius)] border text-sm bg-white',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
            'disabled:bg-[var(--color-bg)] disabled:cursor-not-allowed',
            error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
          )}
        >
          <RadixSelect.Value placeholder={<span className="text-[var(--color-text-secondary)]">{placeholder}</span>} />
          <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="bg-white border border-[var(--color-border)] rounded-[var(--radius)] shadow-lg z-50 w-[var(--radix-select-trigger-width)] max-h-60 overflow-auto"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map(opt => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer hover:bg-[var(--color-primary-light)] outline-none data-[highlighted]:bg-[var(--color-primary-light)]"
                >
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check className="w-4 h-4 text-[var(--color-primary)]" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
