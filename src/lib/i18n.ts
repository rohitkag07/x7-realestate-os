/**
 * Lightweight Hindi + English bilingual string table.
 * Hindi is primary in the spec — render both where space allows,
 * default to Hindi on user-facing surfaces shown to the lead/resident.
 */
export type Locale = 'hi' | 'en';

type Dict = Record<string, { hi: string; en: string }>;

export const strings = {
  // Sidebar / nav
  nav_dashboard:    { hi: 'डैशबोर्ड',           en: 'Dashboard' },
  nav_leads:        { hi: 'लीड्स',              en: 'Leads' },
  nav_site_visits:  { hi: 'साइट विज़िट',         en: 'Site Visits' },
  nav_bookings:     { hi: 'बुकिंग्स',            en: 'Bookings' },
  nav_content:      { hi: 'कंटेंट',              en: 'Content' },
  nav_campaigns:    { hi: 'कैम्पेन',             en: 'Campaigns' },
  nav_colony:       { hi: 'कॉलोनी',             en: 'Colony' },
  nav_reports:      { hi: 'रिपोर्ट्स',           en: 'Reports' },
  nav_settings:     { hi: 'सेटिंग्स',            en: 'Settings' },

  // KPIs
  kpi_leads_today:     { hi: 'आज के लीड्स',         en: 'Leads Today' },
  kpi_site_visits:     { hi: 'साइट विज़िट्स',       en: 'Site Visits' },
  kpi_bookings:        { hi: 'बुकिंग्स',             en: 'Bookings' },
  kpi_revenue_month:   { hi: 'इस महीने रेवेन्यू',     en: 'Revenue This Month' },
  kpi_content_today:   { hi: 'आज पोस्ट हुआ',        en: 'Content Posted Today' },

  // Lead pipeline stages
  stage_new:               { hi: 'नया',                en: 'New' },
  stage_qualified:         { hi: 'क्वालिफाइड',         en: 'Qualified' },
  stage_visit_scheduled:   { hi: 'विज़िट तय',          en: 'Visit Scheduled' },
  stage_visited:           { hi: 'विज़िट हुआ',         en: 'Visited' },
  stage_negotiation:       { hi: 'बातचीत',             en: 'Negotiation' },
  stage_booked:            { hi: 'बुक्ड',              en: 'Booked' },
  stage_lost:              { hi: 'लॉस्ट',              en: 'Lost' },

  // Temperatures
  temp_hot:   { hi: 'गरम',  en: 'Hot' },
  temp_warm:  { hi: 'गुनगुना', en: 'Warm' },
  temp_cold:  { hi: 'ठंडा', en: 'Cold' },

  // Buttons / common
  btn_save:        { hi: 'सेव करें',      en: 'Save' },
  btn_cancel:      { hi: 'रद्द करें',     en: 'Cancel' },
  btn_login:       { hi: 'लॉग इन करें',   en: 'Log in' },
  btn_logout:      { hi: 'लॉग आउट',       en: 'Log out' },
  btn_add_lead:    { hi: 'लीड जोड़ें',    en: 'Add Lead' },
  btn_new_campaign:{ hi: 'नया कैम्पेन',   en: 'New Campaign' },
  btn_schedule:    { hi: 'शेड्यूल करें',  en: 'Schedule' },
  btn_approve:     { hi: 'मंज़ूर करें',    en: 'Approve' },
  btn_deny:        { hi: 'मना करें',      en: 'Deny' },

  // Empty states
  empty_leads:      { hi: 'अभी कोई लीड नहीं — ऐड चालू करें या डेमो डेटा जोड़ें।', en: 'No leads yet — turn on ads or add demo data.' },
  empty_content:    { hi: 'कैलेंडर खाली है। कंटेंट एजेंट से जनरेट करवाएं।',     en: 'Calendar is empty. Ask the content agent to generate.' },
  empty_visitors:   { hi: 'आज कोई विज़िटर नहीं।',                              en: 'No visitors today.' },
} as const satisfies Dict;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, locale: Locale = 'hi'): string {
  return strings[key]?.[locale] ?? key;
}

/**
 * Bilingual helper — returns "Hindi · English" or single-language string.
 */
export function tBoth(key: StringKey): string {
  const v = strings[key];
  if (!v) return key;
  return `${v.hi} · ${v.en}`;
}
