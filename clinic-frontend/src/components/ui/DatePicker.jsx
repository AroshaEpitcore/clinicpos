import { useState, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

function parseStr(str) {
  if (!str) return undefined;
  const d = parse(str, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

function toStr(date) {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

const DAY_CLASSES = clsx(
  'h-9 w-9 inline-flex items-center justify-center rounded-full text-sm transition-colors',
  'text-[var(--color-text)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'
);

export function DatePicker({
  label, error, required,
  value, onChange,
  min, max,
  placeholder = 'Select date',
  disabled,
  className,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const selected = parseStr(value);
  const minDate  = parseStr(min);
  const maxDate  = parseStr(max);

  const disabledDays = [
    minDate ? { before: minDate } : null,
    maxDate ? { after: maxDate }  : null,
  ].filter(Boolean);

  function handleSelect(day) {
    if (!day) return;
    onChange(toStr(day));
    setOpen(false);
  }

  const displayValue = selected ? format(selected, 'MMM d, yyyy') : '';

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-[var(--color-text)]">
          {label}
          {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
        </label>
      )}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            className={clsx(
              'flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius)] border text-sm text-left',
              'bg-[var(--color-surface)] transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
              'disabled:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60',
              error
                ? 'border-[var(--color-danger)]'
                : open
                  ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
            )}
          >
            <span className={displayValue ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}>
              {displayValue || placeholder}
            </span>
            <Calendar className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 ml-2" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={6}
            align="start"
            className={clsx(
              'z-[9999] rounded-[var(--radius-lg)] border border-[var(--color-border)]',
              'bg-[var(--color-surface)] shadow-2xl',
              'animate-in fade-in-0 zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=top]:slide-in-from-bottom-2'
            )}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              disabled={disabledDays}
              showOutsideDays
              classNames={{
                months:         'p-3',
                month:          '',
                caption:        'flex items-center justify-between mb-2 px-1',
                caption_label:  'text-sm font-semibold text-[var(--color-text)] select-none',
                nav:            'flex items-center gap-1',
                nav_button: clsx(
                  'h-7 w-7 inline-flex items-center justify-center rounded-[var(--radius)]',
                  'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]',
                  'transition-colors disabled:opacity-30 disabled:pointer-events-none'
                ),
                nav_button_previous: '',
                nav_button_next:     '',
                table:          'w-full border-collapse',
                head_row:       '',
                head_cell:      'text-xs font-medium text-[var(--color-text-secondary)] text-center pb-1 w-9 select-none',
                row:            '',
                cell:           'text-center p-0.5',
                day:            DAY_CLASSES,
                day_selected:   '!bg-[var(--color-primary)] !text-white hover:!bg-[var(--color-primary-hover)] hover:!text-white',
                day_today:      'font-bold ring-2 ring-inset ring-[var(--color-primary)] text-[var(--color-primary)]',
                day_outside:    'opacity-30',
                day_disabled:   'opacity-25 pointer-events-none hover:bg-transparent',
                day_range_middle: 'bg-[var(--color-primary-light)]',
                day_hidden:     'invisible',
              }}
              components={{
                IconLeft:  () => <ChevronLeft  className="w-4 h-4" />,
                IconRight: () => <ChevronRight className="w-4 h-4" />,
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
