import { format, differenceInYears, isValid, parseISO } from 'date-fns';

/**
 * Format a date as "08 Apr 2026"
 */
export function formatDate(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return '—';
  return format(d, 'dd MMM yyyy');
}

/**
 * Format a datetime as "08 Apr 2026, 02:30 PM"
 */
export function formatDateTime(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return '—';
  return format(d, 'dd MMM yyyy, hh:mm aa');
}

/**
 * Calculate age in years from a date of birth
 */
export function formatAge(dateOfBirth) {
  if (!dateOfBirth) return '—';
  const d = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : new Date(dateOfBirth);
  if (!isValid(d)) return '—';
  const years = differenceInYears(new Date(), d);
  return `${years} yrs`;
}

/**
 * Format a number as LKR currency — "LKR 1,500.00"
 */
export function formatCurrency(amount, currency = 'LKR') {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = Number(amount);
  if (isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a phone number for display: "0771234567" → "077 123 4567"
 * Handles already-formatted input too.
 */
export function formatPhone(value) {
  if (!value) return '—';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 10) return value;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/**
 * Format phone input as user types: strips non-digits, inserts spaces at 3 and 6.
 * Max 10 digits. Returns formatted string e.g. "077 123 4567"
 */
export function formatPhoneInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/**
 * Validate phone — must be exactly 10 digits.
 * Returns error string or undefined if valid.
 */
export function validatePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Phone number is required';
  if (digits.length !== 10) return 'Phone number must be 10 digits';
  return undefined;
}

/**
 * Format date input value for <input type="date"> — "2026-04-08"
 */
export function toInputDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}
