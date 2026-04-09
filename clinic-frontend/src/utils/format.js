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
 * Format date input value for <input type="date"> — "2026-04-08"
 */
export function toInputDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}
