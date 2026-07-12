import type { BusinessCategory, KeywordReplyRule } from '@/types/database';

type StarterRules = { rules: KeywordReplyRule[]; fallback: string };

const base = (id: string, label: string, keywords: string[], reply: string, priority = 100): KeywordReplyRule => ({
  id, label, keywords, reply, priority, match_type: 'word', enabled: true, handoff: false,
});

export const starterKeywordRules: Record<BusinessCategory, StarterRules> = {
  real_estate: {
    rules: [
      base('price', 'Price', ['price', 'rate', 'cost', 'budget'], 'Prices depend on plot size and location. Share your budget and we will send the best available options.'),
      base('location', 'Location', ['location', 'map', 'address'], 'We will share the project location and Google Maps pin. Which area are you coming from?'),
      base('site-visit', 'Site visit', ['visit', 'site visit', 'dekhna'], 'Site visits are available this week. Share your preferred day and time.'),
    ],
    fallback: 'Thanks for your property inquiry. Our team will review your question and reply shortly.',
  },
  clinic: {
    rules: [
      base('timings', 'Clinic timings', ['timing', 'timings', 'open', 'hours'], 'Please share your preferred day. Our team will confirm the available clinic timings.'),
      base('appointment', 'Appointment', ['appointment', 'book', 'doctor'], 'Please share the patient name and preferred date. Our team will confirm the appointment.'),
      { ...base('emergency', 'Emergency', ['emergency', 'chest pain', 'unconscious', 'breathing'], 'This may be an emergency. Please call 112 or go to the nearest hospital immediately.', 1000), handoff: true },
    ],
    fallback: 'Thanks for contacting the clinic. A staff member will reply shortly. Do not use WhatsApp for medical emergencies.',
  },
  coaching: {
    rules: [
      base('fees', 'Course fees', ['fees', 'fee', 'price'], 'Course fees depend on the selected program. Which course are you interested in?'),
      base('demo', 'Demo class', ['demo', 'trial class', 'sample class'], 'A demo class can be arranged. Share the student class and preferred day.'),
      base('batch', 'Batch timings', ['batch', 'timing', 'schedule'], 'We have weekday and weekend batches. Which course and timing do you prefer?'),
    ],
    fallback: 'Thanks for your course inquiry. A counsellor will reply shortly.',
  },
  gym: {
    rules: [
      base('membership', 'Membership fees', ['fees', 'membership', 'price'], 'Membership plans depend on duration and training type. Would you like a monthly or quarterly plan?'),
      base('trial', 'Trial session', ['trial', 'demo', 'visit'], 'A trial session is available. Share your preferred day and morning or evening timing.'),
      base('timings', 'Gym timings', ['timing', 'timings', 'open'], 'We have morning and evening slots. Which timing works for you?'),
    ],
    fallback: 'Thanks for contacting us. A trainer will reply shortly.',
  },
  local_service: {
    rules: [
      base('service', 'Service request', ['service', 'repair', 'help'], 'Please share the service required and your area or pin code.'),
      base('charges', 'Service charges', ['charges', 'price', 'fees'], 'Charges depend on the work required. Share a short description or photo for an estimate.'),
      base('callback', 'Callback', ['call', 'callback', 'contact'], 'Please share a convenient time. Our team will call you back.'),
    ],
    fallback: 'Thanks for your request. Our service team will reply shortly.',
  },
  other: {
    rules: [
      base('fees', 'Fees and prices', ['fees', 'fee', 'price', 'charges'], 'Please tell us which service you are interested in and we will share the exact price.'),
      base('timings', 'Business timings', ['timing', 'timings', 'open', 'hours'], 'Please share your preferred day and time. Our team will confirm availability.'),
      base('appointment', 'Book an appointment', ['appointment', 'book', 'visit'], 'Please share your preferred date and time. Our team will confirm your appointment.'),
    ],
    fallback: 'Thanks for your message. Our team will reply shortly.',
  },
};

export function getStarterKeywordRules(category: BusinessCategory): StarterRules {
  const starter = starterKeywordRules[category] ?? starterKeywordRules.other;
  return { rules: starter.rules.map((rule) => ({ ...rule, keywords: [...rule.keywords] })), fallback: starter.fallback };
}
