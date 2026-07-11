import type {
  LeadStage, LeadTemperature, ComplaintStatus, ComplaintPriority,
  ContentStatus, BookingStatus,
} from '@/types/database';

/**
 * UI-friendly mappings for pipeline columns, status badges, and colors.
 * Single source of truth for anything rendered as a label or badge.
 */

export const LEAD_STAGE_ORDER: LeadStage[] = [
  'new', 'qualified', 'visit_scheduled', 'visited', 'negotiation', 'booked',
];

export const LEAD_STAGE_LABELS: Record<LeadStage, { hi: string; en: string; color: string }> = {
  new:              { hi: 'नए',           en: 'New',             color: 'bg-blue-100 text-blue-800 border-blue-200' },
  qualified:        { hi: 'क्वालिफाइड',     en: 'Qualified',       color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  visit_scheduled:  { hi: 'विज़िट तय',      en: 'Visit Scheduled', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  visited:          { hi: 'विज़िट हुआ',     en: 'Visited',         color: 'bg-purple-100 text-purple-800 border-purple-200' },
  negotiation:      { hi: 'बातचीत',         en: 'Negotiation',     color: 'bg-orange-100 text-orange-800 border-orange-200' },
  booked:           { hi: 'बुक्ड',          en: 'Booked',          color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  lost:             { hi: 'लॉस्ट',          en: 'Lost',            color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
};

export const TEMPERATURE_LABELS: Record<LeadTemperature, { hi: string; en: string; dot: string }> = {
  hot:  { hi: 'गरम',     en: 'Hot',  dot: 'bg-red-500'    },
  warm: { hi: 'गुनगुना',  en: 'Warm', dot: 'bg-amber-500'  },
  cold: { hi: 'ठंडा',    en: 'Cold', dot: 'bg-blue-500'   },
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, { hi: string; en: string; color: string }> = {
  open:        { hi: 'खुला',         en: 'Open',         color: 'bg-red-100 text-red-800' },
  in_progress: { hi: 'चल रहा है',     en: 'In Progress',  color: 'bg-amber-100 text-amber-800' },
  resolved:    { hi: 'हल हुआ',       en: 'Resolved',     color: 'bg-emerald-100 text-emerald-800' },
  closed:      { hi: 'बंद',          en: 'Closed',       color: 'bg-zinc-100 text-zinc-700' },
  reopened:    { hi: 'फिर से खुला',   en: 'Reopened',     color: 'bg-purple-100 text-purple-800' },
};

export const COMPLAINT_PRIORITY_LABELS: Record<ComplaintPriority, { hi: string; en: string; color: string }> = {
  low:      { hi: 'कम',       en: 'Low',      color: 'bg-zinc-100 text-zinc-700' },
  medium:   { hi: 'मध्यम',     en: 'Medium',   color: 'bg-blue-100 text-blue-800' },
  high:     { hi: 'ज़्यादा',    en: 'High',     color: 'bg-amber-100 text-amber-800' },
  critical: { hi: 'गंभीर',    en: 'Critical', color: 'bg-red-100 text-red-800' },
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, { hi: string; en: string; color: string }> = {
  draft:      { hi: 'ड्राफ्ट',       en: 'Draft',      color: 'bg-zinc-100 text-zinc-700' },
  generating: { hi: 'बन रहा है',    en: 'Generating', color: 'bg-purple-100 text-purple-800' },
  review:     { hi: 'रिव्यू',       en: 'Review',     color: 'bg-amber-100 text-amber-800' },
  approved:   { hi: 'अप्रूव्ड',      en: 'Approved',   color: 'bg-blue-100 text-blue-800' },
  scheduled:  { hi: 'शेड्यूल्ड',     en: 'Scheduled',  color: 'bg-cyan-100 text-cyan-800' },
  published:  { hi: 'पब्लिश्ड',      en: 'Published',  color: 'bg-emerald-100 text-emerald-800' },
  failed:     { hi: 'फेल',          en: 'Failed',     color: 'bg-red-100 text-red-800' },
  archived:   { hi: 'आर्काइव्ड',     en: 'Archived',   color: 'bg-zinc-100 text-zinc-500' },
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { hi: string; en: string; color: string }> = {
  token_paid: { hi: 'टोकन पेड',     en: 'Token Paid', color: 'bg-amber-100 text-amber-800' },
  agreement:  { hi: 'एग्रीमेंट',     en: 'Agreement',  color: 'bg-blue-100 text-blue-800' },
  registered: { hi: 'रजिस्टर्ड',     en: 'Registered', color: 'bg-cyan-100 text-cyan-800' },
  completed:  { hi: 'पूरा हुआ',     en: 'Completed',  color: 'bg-emerald-100 text-emerald-800' },
  cancelled:  { hi: 'रद्द',         en: 'Cancelled',  color: 'bg-zinc-100 text-zinc-700' },
  refunded:   { hi: 'रिफंड',        en: 'Refunded',   color: 'bg-red-100 text-red-800' },
};

export const APP_NAME      = 'WhatsAI Assistant';
export const APP_TAGLINE   = '24/7 WhatsApp Receptionist for Indian SMBs';
export const APP_COPYRIGHT = `© ${new Date().getFullYear()} Xero Seven`;
