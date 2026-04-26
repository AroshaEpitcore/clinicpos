# DESIGN.md — UI Design Rules & Component System

> **Read this before building any screen.**
> Every screen in clinic-frontend and admin-frontend must follow these rules.
> Consistency is not optional — this is a product you sell. It must look and behave the same everywhere.

---

## NPM Packages — Use These, Nothing Else

Install these once in both `clinic-frontend` and `admin-frontend`.

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-switch @radix-ui/react-tooltip @radix-ui/react-popover
npm install sonner
npm install lucide-react
npm install clsx
npm install react-hook-form
npm install @tanstack/react-table
npm install date-fns react-day-picker
npm install recharts
npm install @fontsource/inter
npm install qrcode.react   # clinic-frontend only
```

| Package | Purpose | Why |
|---------|---------|-----|
| `@radix-ui/*` | Headless accessible UI primitives (modals, dropdowns, selects, checkboxes, switches) | Accessible, unstyled — you control the look |
| `@radix-ui/react-popover` | Popover container used by the DatePicker component | Same Radix pattern as other primitives |
| `sonner` | Toast notifications | Single source of truth for all alerts — one API, one style |
| `lucide-react` | Icons | Consistent icon set across every screen |
| `clsx` | Conditional className merging | Clean component class logic |
| `react-hook-form` | Form state and validation | Same form pattern everywhere — no controlled state mess |
| `@tanstack/react-table` | Data tables | Same table behavior everywhere — sorting, pagination built in |
| `date-fns` | Date formatting and calculation | Lightweight, consistent date handling |
| `react-day-picker` | Calendar picker UI (used in `DatePicker.jsx`) | Pairs with date-fns, matches Radix visual style |
| `recharts` | Charts and graphs | Reports and dashboard charts |
| `@fontsource/inter` | Inter font — loaded locally, no Google Fonts CDN | Fast load, works offline, consistent across clinics |
| `qrcode.react` | QR code generation (`QRCodeCanvas`) — **clinic-frontend only** | Used in Settings → Security tab to generate booking QR card for printing |

**Do not install:** `moment.js`, `lodash`, `material-ui`, `antd`, `chakra-ui`, `bootstrap`, `jquery`.  
**Do not install a second toast library** if sonner is already installed.  
**Do not install a second date picker** if react-day-picker is already installed.

---

## Toasts — One Pattern, One Place

All feedback messages across the entire system use **sonner**. No `alert()`. No custom popups. No inline success text that disappears on re-render.

### Setup (add once to main.jsx in each frontend)

```jsx
import { Toaster } from 'sonner';

// Inside your root component
<Toaster position="top-right" richColors expand={false} duration={4000} />
```

### Usage — import and call from anywhere

```javascript
import { toast } from 'sonner';

// Success
toast.success('Patient registered successfully');

// Error
toast.error('Failed to save. Please try again.');

// Warning
toast.warning('Duplicate patient found. Please review before saving.');

// Info
toast.info('Session will expire in 5 minutes.');

// Loading (returns an id — use it to dismiss)
const id = toast.loading('Saving invoice...');
toast.dismiss(id);
toast.success('Invoice saved', { id });
```

### Standard Messages — Use These Exact Strings

Never invent new wording. Use these across every module:

| Action | Toast Type | Message |
|--------|-----------|---------|
| Record created | success | `'{Name}' created successfully` |
| Record updated | success | `Changes saved successfully` |
| Record deleted | success | `Deleted successfully` |
| Form validation failed | error | `Please fill in all required fields` |
| API call failed | error | `Something went wrong. Please try again.` |
| Network error | error | `No connection. Check your internet and try again.` |
| Duplicate found | warning | `A matching record already exists. Please review.` |
| Unauthorized action | error | `You do not have permission to do this.` |
| Session expiring | info | `Your session will expire soon. Save your work.` |
| File too large | error | `File must be under 2MB. Please choose a smaller file.` |
| Wrong file type | error | `Only JPG and PNG files are accepted.` |

---

## Dark Mode

Dark mode is implemented using Tailwind's `class` strategy — the `dark` class is toggled on `<html>`.

### Setup (already done in tailwind.config.js)
```js
// tailwind.config.js
export default {
  darkMode: 'class',
  // ...
};
```

### ThemeContext — manages the toggle
```jsx
// src/store/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
const ThemeContext = createContext();
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
```

### CSS variable dark overrides (in variables.css)
Dark mode overrides are defined under `.dark` selector and override the `:root` variables. All components automatically adapt — you never write `dark:` Tailwind classes in components:
```css
.dark {
  --color-bg:             #0f172a;
  --color-surface:        #1e293b;
  --color-text:           #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border:         #334155;
  /* etc. */
}
```

### Toggle button — add to TopBar
```jsx
import { useTheme } from '../../store/ThemeContext';
import { Sun, Moon } from 'lucide-react';
const { dark, toggle } = useTheme();
<button onClick={toggle}>{dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
```

**Rule:** Never use `dark:` Tailwind classes in individual components. All dark mode color overrides go in `variables.css` under `.dark {}`. Components only use CSS variables — the dark mode swap happens automatically.

---

## Colors — System Palette

Define these as CSS variables. Every component uses variables — never raw hex values.

```css
/* src/styles/variables.css — import this in main.jsx */

:root {
  /* Brand */
  --color-primary:        #2563eb;   /* blue — buttons, links, active states */
  --color-primary-hover:  #1d4ed8;
  --color-primary-light:  #eff6ff;   /* light blue backgrounds */

  /* Status */
  --color-success:        #16a34a;
  --color-success-light:  #f0fdf4;
  --color-warning:        #d97706;
  --color-warning-light:  #fffbeb;
  --color-danger:         #dc2626;
  --color-danger-light:   #fef2f2;
  --color-info:           #0891b2;
  --color-info-light:     #ecfeff;

  /* Neutrals */
  --color-text:           #111827;
  --color-text-secondary: #6b7280;
  --color-border:         #e5e7eb;
  --color-bg:             #f9fafb;
  --color-surface:        #ffffff;

  /* Appointment status colors */
  --status-pending:       #d97706;   /* amber */
  --status-confirmed:     #2563eb;   /* blue */
  --status-arrived:       #7c3aed;   /* purple */
  --status-completed:     #16a34a;   /* green */
  --status-cancelled:     #6b7280;   /* gray */
  --status-emergency:     #dc2626;   /* red */

  /* Invoice status colors */
  --status-paid:          #16a34a;
  --status-unpaid:        #dc2626;
  --status-partial:       #d97706;

  /* Spacing */
  --radius:               8px;
  --radius-sm:            4px;
  --radius-lg:            12px;
}
```

---

## Common Components — Build Once, Use Everywhere

Create these in `src/components/ui/`. Import from here — never rebuild the same element twice.

---

### Button

```jsx
// src/components/ui/Button.jsx
import clsx from 'clsx';

const variants = {
  primary:   'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)]',
  danger:    'bg-[var(--color-danger)] text-white hover:opacity-90',
  ghost:     'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ children, variant = 'primary', size = 'md', loading, disabled, className, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}
```

**Usage:**
```jsx
<Button>Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button loading={isSaving}>Saving...</Button>
<Button variant="ghost" size="sm">View</Button>
```

---

### Input

```jsx
// src/components/ui/Input.jsx
import clsx from 'clsx';

export function Input({ label, error, required, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text)]">
          {label} {required && <span className="text-[var(--color-danger)]">*</span>}
        </label>
      )}
      <input
        {...props}
        className={clsx(
          'w-full px-3 py-2 rounded-[var(--radius)] border text-sm',
          'bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
          'disabled:bg-[var(--color-bg)] disabled:cursor-not-allowed',
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
          className
        )}
      />
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
```

**Usage:**
```jsx
<Input label="Patient Name" required placeholder="First name" />
<Input label="Phone" error="Phone number is required" />
```

---

### Select

```jsx
// src/components/ui/Select.jsx — wraps Radix Select
import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

export function Select({ label, error, required, options = [], placeholder = 'Select...', value, onValueChange }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text)]">
          {label} {required && <span className="text-[var(--color-danger)]">*</span>}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange}>
        <RadixSelect.Trigger className={clsx(
          'flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius)] border text-sm bg-[var(--color-surface)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
        )}>
          <RadixSelect.Value placeholder={placeholder} />
          <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-lg z-50">
            <RadixSelect.Viewport className="p-1">
              {options.map(opt => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer hover:bg-[var(--color-primary-light)] outline-none"
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
```

**Usage:**
```jsx
<Select
  label="Gender"
  required
  options={[
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ]}
  value={gender}
  onValueChange={setGender}
/>
```

---

### Modal (Dialog)

```jsx
// src/components/ui/Modal.jsx — wraps Radix Dialog
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, footer }) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-xl z-50 w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <Dialog.Title className="text-base font-semibold text-[var(--color-text)]">
              {title}
            </Dialog.Title>
            <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Usage:**
```jsx
<Modal
  open={showModal}
  onClose={() => setShowModal(false)}
  title="Register New Patient"
  footer={
    <>
      <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
      <Button onClick={handleSave} loading={saving}>Save Patient</Button>
    </>
  }
>
  <PatientForm />
</Modal>
```

---

### Drawer (Side Panel)

Use `Drawer` instead of `Modal` when a form needs more vertical space — slot pickers, long forms, or any UI that benefits from full-screen height.

```jsx
// src/components/ui/Drawer.jsx
import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Drawer({ open, onClose, title, footer, width = '520px', children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      {/* Panel — slides from right */}
      <div
        className="relative ml-auto h-full flex flex-col bg-[var(--color-surface)] shadow-2xl"
        style={{ width, maxWidth: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {/* Sticky footer */}
        {footer && (
          <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4 flex items-center justify-end gap-3 bg-[var(--color-surface)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | boolean | — | Controls visibility |
| `onClose` | () => void | — | Called when backdrop or X is clicked |
| `title` | string | — | Header title |
| `footer` | ReactNode | — | Sticky bottom bar (buttons) |
| `width` | string | `'520px'` | Panel width (CSS value) |
| `children` | ReactNode | — | Scrollable body content |

**Usage:**
```jsx
<Drawer
  open={showDrawer}
  onClose={() => setShowDrawer(false)}
  title="Add to Queue"
  width="540px"
  footer={
    <>
      <Button variant="secondary" onClick={() => setShowDrawer(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </>
  }
>
  <YourFormContent />
</Drawer>
```

**Rule:** Use `Drawer` for queue/appointment forms that include a time slot grid or multiple sections. Use `Modal` for simple confirm dialogs and short forms.

---

### Badge (Status Labels)

```jsx
// src/components/ui/Badge.jsx
import clsx from 'clsx';

const styles = {
  success:   'bg-[var(--color-success-light)] text-[var(--color-success)]',
  warning:   'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  danger:    'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
  info:      'bg-[var(--color-info-light)] text-[var(--color-info)]',
  neutral:   'bg-[var(--color-bg)] text-[var(--color-text-secondary)]',
  primary:   'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
};

// Map domain values to badge styles
const statusMap = {
  // Appointments
  pending:    'warning',
  confirmed:  'primary',
  arrived:    'info',
  completed:  'success',
  cancelled:  'neutral',
  emergency:  'danger',
  // Invoices
  paid:       'success',
  unpaid:     'danger',
  partial:    'warning',
  // Clinic accounts
  active:     'success',
  trial:      'info',
  suspended:  'danger',
};

export function Badge({ label, variant, status, className }) {
  const resolved = variant || statusMap[status] || 'neutral';
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      styles[resolved],
      className
    )}>
      {label || status}
    </span>
  );
}
```

**Usage:**
```jsx
<Badge status="completed" />
<Badge status="emergency" />
<Badge status="unpaid" />
<Badge label="Walk-in" variant="info" />
```

---

### Table

```jsx
// src/components/ui/Table.jsx
export function Table({ columns, data, emptyMessage = 'No records found.' }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-text-secondary)] text-sm">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-[var(--color-text)]">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Usage:**
```jsx
<Table
  columns={[
    { key: 'patient_code', header: 'ID' },
    { key: 'full_name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'actions', header: '', render: row => (
      <Button variant="ghost" size="sm" onClick={() => openProfile(row.id)}>View</Button>
    )},
  ]}
  data={patients}
  emptyMessage="No patients registered yet."
/>
```

---

### PageHeader

```jsx
// src/components/ui/PageHeader.jsx
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
```

**Usage:**
```jsx
<PageHeader
  title="Patients"
  subtitle="125 total patients registered"
  actions={
    <Button onClick={() => setShowRegisterModal(true)}>+ Register Patient</Button>
  }
/>
```

---

### Card

```jsx
// src/components/ui/Card.jsx
import clsx from 'clsx';

export function Card({ title, children, className, noPadding }) {
  return (
    <div className={clsx(
      'bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]',
      !noPadding && 'p-5',
      className
    )}>
      {title && <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">{title}</h2>}
      {children}
    </div>
  );
}
```

**Usage:**
```jsx
<Card title="Today's Summary">
  <StatRow label="Patients seen" value={24} />
</Card>
```

---

### ConfirmDialog

Use this for every destructive action — delete, cancel appointment, close EOD, suspend clinic.  
Never use the browser's `window.confirm()`.

```jsx
// src/components/ui/ConfirmDialog.jsx
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
    </Modal>
  );
}
```

**Usage:**
```jsx
<ConfirmDialog
  open={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  onConfirm={handleDelete}
  loading={deleting}
  title="Cancel Appointment"
  message="Are you sure you want to cancel this appointment? This cannot be undone."
  confirmLabel="Yes, Cancel Appointment"
/>
```

---

### EmptyState

Every list and table must show this when there is no data — never a blank screen.

```jsx
// src/components/ui/EmptyState.jsx
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="w-10 h-10 text-[var(--color-border)] mb-3" />}
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      {description && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

**Usage:**
```jsx
import { UserX } from 'lucide-react';

<EmptyState
  icon={UserX}
  title="No patients found"
  description="Register your first patient to get started."
  action={<Button onClick={() => setShowRegisterModal(true)}>Register Patient</Button>}
/>
```

---

### Spinner / LoadingState

```jsx
// src/components/ui/Spinner.jsx
import clsx from 'clsx';

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className={clsx(
      'border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin',
      sizes[size],
      className
    )} />
  );
}

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
    </div>
  );
}
```

**Usage:**
```jsx
{loading ? <LoadingState /> : <Table ... />}
```

---

## Forms — One Pattern Using react-hook-form

Never use `useState` to track individual form fields. Always use `react-hook-form`.

```jsx
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function PatientRegistrationForm({ onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit(data) {
    try {
      await api.post('/patients', data);
      toast.success('Patient registered successfully');
      onSuccess();
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="First Name"
        required
        {...register('first_name', { required: 'First name is required' })}
        error={errors.first_name?.message}
      />
      <Input
        label="Phone Number"
        required
        {...register('phone', { required: 'Phone number is required' })}
        error={errors.phone?.message}
      />
      <Button type="submit" loading={isSubmitting}>Register Patient</Button>
    </form>
  );
}
```

---

## Search + Filter Pattern — Standard for All List Pages

Every list page in the app uses the same pattern. Do not invent new variants.

### Structure (top-to-bottom on the page)

```
1. PageHeader (title, subtitle, actions button)
2. Date navigation — if page is date-based (arrows + DatePicker + "Back to today")
3. Summary cards — if page has stats (Total Billed / Collected / Outstanding)
4. Filter tabs — full-width border-b row (e.g. All / Unpaid / Partial / Paid)
5. Doctor filter tabs — full-width border-b row, only shown when >1 doctor in data
6. Filter pills row — role/status/dispense pills (rounded-full, primary active state)
7. Search bar row — max-w-sm, with X clear button + count display
8. List / Table
```

Not every page has all layers — only include what's relevant.

### Filter Tabs (underline style — for main category filters)

```jsx
<div className="flex gap-1 border-b border-[var(--color-border)] mb-4">
  {TABS.map(tab => (
    <button key={tab.key} onClick={() => setTab(tab.key)}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        tab === tab.key
          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
          : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
      }`}>
      {tab.label}
    </button>
  ))}
</div>
```

Use for: status tabs (All/Unpaid/Paid), doctor tabs, medicine store tabs.

### Filter Pills (pill/capsule style — for secondary filters)

```jsx
<div className="flex items-center gap-2 mb-4 flex-wrap">
  {FILTERS.map(f => (
    <button key={f.key} onClick={() => setFilter(f.key)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        filter === f.key
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text)]'
      }`}>
      {f.label}
    </button>
  ))}
</div>
```

Use for: role pills (All/Doctors/Nurses), status pills (All/Active/Inactive), dispense pills (All/Pending/Dispensed).

### Search Bar (always this exact pattern)

```jsx
<div className="flex items-center gap-3 mb-4">
  <div className="relative max-w-sm flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
    <input
      type="text"
      placeholder="Search…"
      value={search}
      onChange={e => setSearch(e.target.value)}
      className="w-full pl-9 pr-8 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
    />
    {search && (
      <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
  {!loading && (
    <span className="text-sm text-[var(--color-text-secondary)] shrink-0">
      {bq ? `${filtered.length} of ` : ''}{total} item{total !== 1 ? 's' : ''}
    </span>
  )}
</div>
```

Rules:
- Always `pl-9` (room for Search icon) and `pr-8` (room for X button)
- Always `bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]`
- Always show X button only when `search` is non-empty
- Always show count to the right: "X of Y items" when filtered, "Y items" when not

### Client-side vs Server-side Filtering

| Situation | Use |
|-----------|-----|
| Date-based pages (Appointments, Billing, Consultations, Prescriptions, Pharmacy Queue) — all data for the day loaded at once | **Client-side useMemo** — no extra API calls on filter change |
| Full dataset pages (Patients, Staff, Medicine Store) — potentially thousands of records | **Server-side** — send filter/search params to API |
| Mixed (Insurance Claims) | Server-side for date/status, client-side for text search |

### Two-Stage Filter Pattern (for pages with doctor tabs + search)

```js
// Stage 1 — doctor filter (determines stats base)
const doctorFiltered = useMemo(() =>
  doctorFilter === 'all' ? items : items.filter(i => i.doctor_name === doctorFilter),
  [items, doctorFilter]
);

// Stage 2 — search on top of doctor filter
const filtered = useMemo(() => {
  if (!q) return doctorFiltered;
  return doctorFiltered.filter(i =>
    (i.patient_name || '').toLowerCase().includes(q)
    // ... more fields
  );
}, [doctorFiltered, q]);
```

Stats always use `doctorFiltered.length` — not `filtered.length` — so counts don't change when typing in search.

### Empty State — Always Context-Aware

```jsx
<EmptyState
  icon={SomeIcon}
  title={q || filter !== 'all' ? 'No results' : 'No data yet'}
  description={
    q ? `No items match "${search}".`
    : filter !== 'all' ? `No ${filter} items found.`
    : 'Default empty message.'
  }
  action={
    (q || filter !== 'all')
      ? <Button size="sm" variant="secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</Button>
      : <Button size="sm" onClick={openAdd}>Add first item</Button>
  }
/>
```

---

## TopBar Layout

The TopBar is fixed at the top and adjusts its `left` value to match the sidebar width.

```
[Hamburger] [Page Title ————————————] [Date/Time] [Dark toggle] [Logout]
```

| Section | Content |
|---------|---------|
| Left | Hamburger button — toggles sidebar collapsed state; calls `onToggle` from `PageLayout` |
| Center | Page title (from `title` prop) — falls back to clinic name |
| Right | Live date/time (updates every second) · Dark/light toggle · Logout button |

The sidebar collapse state is managed in `PageLayout` via `localStorage('sidebar-collapsed')`. Both `Sidebar` and `TopBar` receive `sidebarWidth` to position correctly.

---

## Layout Rules

### Page layout — every screen follows this structure

```jsx
// src/components/layout/PageLayout.jsx
export function PageLayout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <div className="ml-64">        {/* sidebar width */}
        <TopBar />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

Every page:
```jsx
export function PatientsPage() {
  return (
    <PageLayout>
      <PageHeader title="Patients" actions={<Button>+ Register</Button>} />
      {/* page content */}
    </PageLayout>
  );
}
```

### Spacing rules

| Use | Value |
|-----|-------|
| Between page sections | `gap-6` or `mb-6` |
| Inside a card | `p-5` |
| Between form fields | `gap-4` |
| Between inline items | `gap-3` |
| Between label and input | `gap-1` |

---

## Offline Banner

Every page in clinic-frontend must include this at the top level. Add it once in `PageLayout`.

```jsx
// src/components/ui/OfflineBanner.jsx
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="w-full bg-[var(--color-danger)] text-white text-sm px-4 py-2 flex items-center gap-2">
      <WifiOff className="w-4 h-4" />
      No internet connection — changes may not be saved.
    </div>
  );
}
```

---

## Icon Rules

Use **lucide-react** for all icons. Pick the most obvious icon name — do not invent icon meanings.

```jsx
import { User, Calendar, FileText, Receipt, BarChart2, Settings, Bell, Search, Plus, Trash2, Edit, X, Check, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
```

Standard icon sizes:
| Context | Class |
|---------|-------|
| Inside a button | `w-4 h-4` |
| Sidebar nav item | `w-5 h-5` |
| Empty state illustration | `w-10 h-10` |
| Dashboard stat icon | `w-6 h-6` |

---

## Component File Rules

- One component per file
- File name matches component name exactly: `Button.jsx` exports `Button`
- All shared UI components live in `src/components/ui/`
- All layout components live in `src/components/layout/`
- Module-specific components live next to the page that uses them: `src/pages/patients/DuplicateWarningModal.jsx`
- Never build a one-off version of Button, Input, Badge, or Modal — always use the shared component

---

## Patient Search / Quick Registration Pattern

Any modal or screen that needs a patient (appointments, billing, consultations) uses a **single-flow pattern** — no tab switching:

### Single Flow (current implementation)
- Phone number input — formats as `xxx xxx xxxx` as user types, auto-suggests after 5 digits (350ms debounce)
- Results list appears live — click any result to select patient
- If no results found: First Name (required) + Last Name (optional) fields appear inline below the phone input
- On submit: if no existing patient selected → auto-create patient via `POST /api/v1/patients`, then proceed with the main action
- Patient gets a full PT-XXXXX record — it is not a temporary record

**Required fields for patient creation:** `first_name` + `phone` (10 digits)  
**Optional fields shown inline:** `last_name` only — all other fields added later via patient profile

```jsx
// State pattern for the patient section (AppointmentModal)
const [patient,       setPatient]       = useState(null);     // selected existing patient
const [phoneInput,    setPhoneInput]    = useState('');        // formatted phone input
const [searchResults, setSearchResults] = useState([]);        // live search results
const [newFirst,      setNewFirst]      = useState('');        // shown only when no results
const [newLast,       setNewLast]       = useState('');

// On submit — resolve patient before creating appointment
let resolvedPatient = patient;
if (!resolvedPatient) {
  // Auto-create patient inline
  const res = await patientsApi.create({
    first_name: newFirst.trim(),
    last_name:  newLast.trim() || undefined,
    phone:      phoneInput.replace(/\D/g, ''),  // strip formatting before sending
  });
  resolvedPatient = res.data.data;
}
// Then create appointment using resolvedPatient.id
```

**Phone formatting rule:** All phone inputs format as `xxx xxx xxxx` while typing. Strip formatting (`replace(/\D/g, '')`) before every API call. Store as raw 10 digits in the database. Display formatted via `formatPhone()` utility.

**Why:** Receptionists should not navigate away from the queue screen to register a walk-in patient. The "New Patient" tab was removed to simplify — one flow handles both returning and new patients naturally.

---

## What to Never Do

- Never use `window.alert()`, `window.confirm()`, or `window.prompt()`
- Never use inline styles (`style={{ color: 'red' }}`) — use CSS variables and utility classes
- Never hardcode a color hex value in a component
- Never build a second modal component — use the shared `Modal`
- Never install a second icon library
- Never install a second toast library
- Never use a `<table>` without the shared `Table` component
- Never leave a loading state as a blank screen — always show `<LoadingState />`
- Never leave an empty list as a blank screen — always show `<EmptyState />`

---

## Public Clinic Page — Standalone Design System

`clinic-frontend/src/pages/public/PublicClinicPage.jsx` is the public-facing clinic website at the root `/` path. It is completely standalone — no shared components, no CSS variables, no design system rules from this document apply to it.

Rules for PublicClinicPage only:
- No CSS variables (`var(--color-*)`) — uses plain Tailwind classes and hardcoded colors
- No shared components (`Button`, `Input`, `Modal`, `Card`, etc.) — self-contained
- Own CSS keyframes injected via `<style>` tag: `fadeInUp`, `fadeInLeft`, `fadeInRight`, `floatY`, `scaleIn`, `.reveal/.reveal.in`
- Own `RevealBlock` component (IntersectionObserver scroll-reveal with staggered `delay` prop)
- Own `Navbar` component (fixed, `bg-transparent` → `bg-white/95 backdrop-blur-md` on scroll; mobile max-height transition hamburger menu)
- Own `SectionHeading` component (supports `eyebrow`, `title`, `subtitle`, `center`, `light` props)
- Hero height: `min-h-[100svh]` — uses small viewport height unit for correct mobile sizing with browser chrome
- Hero animations triggered by `ready` state (set 80ms after data loads)
- Responsive: `md:` breakpoints throughout; hero stats bar collapses on mobile
- Hardcoded `HERO_STATS` and `WHY_US` arrays provide fallback content when clinic hasn't configured website data
- `svcIcon()` maps service name keywords to Lucide icon + Tailwind color theme
- Hero image: local `/uploads` paths use `mediaUrl()`, external URLs used as-is

---

## Landing Frontend — Separate Design System

`landing-frontend` is a separate marketing website with its own design system. The rules in this document apply to `clinic-frontend` and `admin-frontend` only.

Landing frontend rules:
- Uses Tailwind v3 with a custom brand palette (no CSS variables)
- Brand colors: `primary: #07548E`, `teal: #07A39A`, `surface: #FBFCFD`, `ink: #0D2136`, `ink-light: #456B84`, `ink-faint: #7AABB8`
- Complex backgrounds/gradients that can't be expressed cleanly in Tailwind go in `globals.css` as named utility classes (e.g. `.hero-radial-bg`, `.dot-grid`, `.step-ring`)
- No inline `style={{}}` — use Tailwind arbitrary values or named CSS utilities
- All pages must use the `<Layout>` component (`Navbar + main + Footer`)
- No `.html` files inside `src/` — all pages are React components
- Logo is `<img src="/logosmall.png" />` served from `public/` — never an SVG placeholder
- `index.html` in the project root is Vite's required entry point — do not delete it

---

*ClinicPOS / HealthCenter.lk — DESIGN.md*
*Build components once. Use them everywhere. Consistency is the product.*
