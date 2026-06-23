import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind-aware className merger.
 * Use everywhere: cn('p-2', condition && 'p-4')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format INR amounts in Indian numbering (Lakh / Crore).
 * 250000 → "₹2.5L", 50000000 → "₹5Cr"
 */
export function formatINR(amount: number | null | undefined, opts?: { compact?: boolean }): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const compact = opts?.compact ?? true;
  if (compact) {
    if (Math.abs(amount) >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
    if (Math.abs(amount) >= 100_000)    return `₹${(amount / 100_000).toFixed(2)}L`;
    if (Math.abs(amount) >= 1_000)      return `₹${(amount / 1_000).toFixed(1)}K`;
    return `₹${amount}`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date as "26 May 2026" (Indian convention).
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * "2 hours ago" style relative time.
 */
export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)      return 'just now';
  if (min < 60)    return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24)    return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)   return `${days}d ago`;
  return formatDate(d);
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export function buildUpiLink({
  pa,
  pn,
  am,
  tn,
}: {
  pa: string;
  pn: string;
  am: number;
  tn?: string;
}): string {
  const params = new URLSearchParams({
    pa,
    pn,
    am: am.toFixed(2),
    cu: 'INR',
  });
  if (tn) params.set('tn', tn);
  return `upi://pay?${params.toString()}`;
}
