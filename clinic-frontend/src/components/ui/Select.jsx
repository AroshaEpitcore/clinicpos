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
            'flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius)] border text-sm',
            'bg-[var(--color-surface)] text-[var(--color-text)] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
            'hover:border-[var(--color-primary)]',
            'disabled:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60',
            'data-[state=open]:border-[var(--color-primary)] data-[state=open]:ring-2 data-[state=open]:ring-[var(--color-primary)]',
            error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
          )}
        >
          <RadixSelect.Value placeholder={<span className="text-[var(--color-text-secondary)]">{placeholder}</span>} />
          <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className={clsx(
              'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl z-[9999]',
              'w-[var(--radix-select-trigger-width)] max-h-60 overflow-auto',
              'animate-in fade-in-0 zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=top]:slide-in-from-bottom-2'
            )}
          >
            <RadixSelect.Viewport className="p-1.5">
              {options.map(opt => (
                <RadixSelect.Item
                  key={opt.value}
                  value={String(opt.value)}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 text-sm rounded-[var(--radius)] cursor-pointer',
                    'text-[var(--color-text)] outline-none transition-colors',
                    'hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]',
                    'data-[highlighted]:bg-[var(--color-primary-light)] data-[highlighted]:text-[var(--color-primary)]',
                    'data-[state=checked]:font-medium'
                  )}
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
