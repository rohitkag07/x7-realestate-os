import type { BusinessCategory, KeywordReplyIntent, KeywordReplyRule } from '@/types/database';

export type IndustryTemplatePack = {
  title: string;
  fallback: string;
  qualificationQuestions: string[];
  rules: KeywordReplyRule[];
};

const rule = (
  id: string,
  label: string,
  keywords: string[],
  reply: string,
  intent?: KeywordReplyIntent,
): KeywordReplyRule => ({
  id,
  label,
  keywords,
  reply,
  match_type: 'word',
  priority: 100,
  enabled: true,
  handoff: false,
  fuzzy_enabled: true,
  fuzzy_threshold: 0.82,
  intent,
});

export const industryTemplatePacks: Record<Exclude<BusinessCategory, 'other'>, IndustryTemplatePack> = {
  clinic: {
    title: 'Clinic starter pack',
    fallback: 'Thank you for contacting [Clinic name]. Our team will reply shortly. For emergencies, please contact local emergency services.',
    qualificationQuestions: ['Patient name?', 'Treatment or concern?', 'Preferred date and time?', 'New or returning patient?'],
    rules: [
      rule('consultation-fee', 'Consultation fee', ['fees', 'fess', 'consultation', 'charge', 'kitna'], 'Consultation with Dr [doctor name] is Rs [consultation fee]. [Add what the fee includes.]', 'price'),
      rule('clinic-timing', 'Clinic timing', ['timing', 'timings', 'open', 'hours', 'kab khulte'], 'We are open [days] from [start time] to [end time].', 'timing'),
      rule('clinic-location', 'Clinic address', ['location', 'loc', 'address', 'map', 'kaha hai'], 'Our clinic is at [full address]. Google Maps: [maps link].', 'location'),
      rule('doctor-profile', 'Doctor profile', ['doctor', 'qualification', 'experience'], 'Dr [doctor name] is [qualification] with [years] years of experience.'),
      rule('appointment', 'Book appointment', ['appointment', 'book', 'slot', 'visit'], 'Please share your preferred date and time. Available slots: [available slots].', 'booking'),
      rule('urgent-pain', 'Urgent pain', ['pain', 'toothache', 'urgent'], 'For urgent pain, please call [clinic phone]. The earliest available slot is [earliest slot].'),
      rule('root-canal', 'Root canal treatment', ['root canal', 'rct', 'tooth treatment'], 'Root canal treatment starts at Rs [starting price], subject to consultation.'),
      rule('skin-laser', 'Skin or laser treatment', ['laser', 'skin', 'pigmentation'], '[Treatment name] starts at Rs [starting price]. A consultation is required before treatment.'),
      rule('hair-ivf', 'Hair or IVF consultation', ['hair', 'transplant', 'ivf'], '[Treatment name] starts at Rs [starting price]. Please book a private consultation.'),
      rule('clinic-offer', 'Current clinic offer', ['offer', 'discount', 'package'], '[Offer details] are valid until [end date]. Terms: [terms].', 'offers'),
    ],
  },
  coaching: {
    title: 'Education starter pack',
    fallback: 'Thank you for your course inquiry. A counsellor from [Institute name] will reply shortly.',
    qualificationQuestions: ['Course interest?', 'Student class or level?', 'Preferred batch timing?', 'Online or offline preference?'],
    rules: [
      rule('course-fee', 'Course fees', ['fees', 'fess', 'fee', 'price', 'kitna'], '[Course name] fees are Rs [fee]. Payment options: [payment options].', 'price'),
      rule('course-duration', 'Course duration', ['course', 'duration', 'program'], '[Course name] runs for [duration] and covers [short syllabus summary].'),
      rule('batch-timing', 'Batch timing', ['batch', 'timing', 'schedule', 'class time'], 'Available batches: [batch timings].', 'timing'),
      rule('demo-class', 'Demo class', ['demo', 'trial class', 'sample class'], 'The next demo class is on [date] at [time]. Reply YES to reserve a seat.', 'booking'),
      rule('syllabus', 'Syllabus', ['syllabus', 'subjects', 'curriculum'], 'This course covers [subjects or modules].'),
      rule('results', 'Past results', ['results', 'rank', 'topper'], 'Recent results: [short result proof].'),
      rule('placement', 'Placement support', ['placement', 'job', 'package'], 'Placement support includes [details]. Recent outcomes: [outcomes].'),
      rule('hostel', 'Hostel or stay', ['hostel', 'accommodation', 'stay'], 'Hostel options: [availability, monthly price, and distance].'),
      rule('institute-location', 'Institute location', ['location', 'loc', 'address', 'map', 'kaha hai'], 'We are at [full address]. Google Maps: [maps link].', 'location'),
      rule('scholarship', 'Scholarship or discount', ['discount', 'scholarship', 'offer'], '[Scholarship or offer criteria] ends on [end date].', 'offers'),
    ],
  },
  real_estate: {
    title: 'Real estate starter pack',
    fallback: 'Thank you for your property inquiry. A property advisor from [Project or company name] will reply shortly.',
    qualificationQuestions: ['Budget range?', 'Preferred location?', 'Property type or BHK?', 'Purchase timeline?', 'Preferred site visit slot?'],
    rules: [
      rule('starting-price', 'Starting price', ['price', 'rate', 'cost', 'budget', 'kitna'], '[Project name] starts at Rs [starting price].', 'price'),
      rule('bhk-options', 'BHK or unit options', ['bhk', 'size', 'unit', 'flat'], 'Available options: [unit types and sizes].'),
      rule('floor-plan', 'Floor plan', ['floor plan', 'layout', 'plan'], 'Here is the [unit type] floor plan.'),
      rule('brochure', 'Project brochure', ['brochure', 'pdf', 'details'], 'Sharing the latest [project name] brochure.'),
      rule('project-location', 'Project location', ['location', 'loc', 'landmark', 'map', 'kaha hai'], '[Project name] is near [landmark]. Google Maps: [maps link].', 'location'),
      rule('site-visit', 'Site visit', ['site visit', 'visit', 'dekhna', 'booking'], 'Site visits are available [days and timings]. Share your preferred slot.', 'booking'),
      rule('home-loan', 'Home loan', ['loan', 'emi', 'finance'], 'Loan support is available through [bank names]. Estimated EMI starts at Rs [amount].'),
      rule('possession', 'Possession date', ['possession', 'handover', 'ready'], 'Expected possession is [month and year].'),
      rule('amenities', 'Amenities', ['amenities', 'facilities', 'clubhouse'], 'Key amenities: [amenity list].'),
      rule('property-offer', 'Current booking offer', ['offer', 'discount', 'booking offer'], '[Current offer] is valid until [end date].', 'offers'),
    ],
  },
  gym: {
    title: 'Gym and wellness starter pack',
    fallback: 'Thank you for contacting [Gym or studio name]. A trainer will reply shortly.',
    qualificationQuestions: ['Fitness goal?', 'Preferred plan duration?', 'Morning or evening timing?', 'Would you like a trial session?'],
    rules: [
      rule('monthly-fee', 'Monthly membership', ['fees', 'fess', 'monthly', 'price', 'kitna'], '1-month membership is Rs [monthly fee].', 'price'),
      rule('long-term-fee', 'Quarterly or yearly membership', ['quarterly', 'yearly', 'annual', 'membership'], '[Plan duration] membership is Rs [plan price].', 'price'),
      rule('personal-trainer', 'Personal trainer', ['trainer', 'pt', 'personal training'], 'Personal training costs Rs [price] and includes [details].'),
      rule('diet-plan', 'Diet plan', ['diet', 'nutrition', 'meal plan'], 'Diet support includes [details] for Rs [price].'),
      rule('gym-timing', 'Gym timing', ['timing', 'open', 'hours', 'kab khulte'], 'Gym timings are [days and hours].', 'timing'),
      rule('ladies-batch', 'Ladies batch', ['ladies', 'women', 'female batch'], 'Ladies batch timing is [days and times].', 'timing'),
      rule('gym-location', 'Gym location', ['location', 'loc', 'address', 'map', 'kaha hai'], 'We are at [full address]. Google Maps: [maps link].', 'location'),
      rule('free-trial', 'Free trial', ['trial', 'demo', 'visit'], 'Your free trial can be booked for [available slots].', 'booking'),
      rule('gym-package', 'Packages and offers', ['package', 'combo', 'offer', 'discount'], '[Package name] includes [benefits] for Rs [price].', 'offers'),
      rule('gym-tour', 'Gym tour', ['tour', 'equipment', 'ambience'], 'Here is a quick tour of [gym name].'),
    ],
  },
  local_service: {
    title: 'Local service starter pack',
    fallback: 'Thank you for your service request. A team member from [Business name] will reply shortly.',
    qualificationQuestions: ['Service required?', 'Area or pin code?', 'When do you need the service?', 'Any photos or measurements to share?'],
    rules: [
      rule('visiting-charge', 'Visiting charge', ['visiting charge', 'inspection', 'fees', 'charge'], 'Our inspection or visiting charge is Rs [visiting charge].', 'price'),
      rule('quotation', 'Quotation', ['quotation', 'quote', 'estimate'], 'Please share [required details]. We will send a quotation within [time].', 'price'),
      rule('service-rate', 'Service rates', ['charges', 'price', 'cost', 'rate'], '[Service name] starts at Rs [starting price].', 'price'),
      rule('service-area', 'Service area', ['location', 'loc', 'area', 'pincode'], 'We serve [service areas]. Share your pin code to confirm coverage.', 'location'),
      rule('turnaround-time', 'Turnaround time', ['kitna time', 'time', 'duration'], 'Typical completion time is [duration].', 'timing'),
      rule('working-hours', 'Working hours', ['timing', 'open', 'hours'], 'Working hours are [days and times].', 'timing'),
      rule('warranty', 'Warranty', ['warranty', 'guarantee'], 'Warranty details: [terms and duration].'),
      rule('urgent-visit', 'Urgent service', ['urgent', 'today', 'emergency'], 'For urgent service, call [phone]. The earliest visit is [earliest slot].', 'booking'),
      rule('schedule-visit', 'Schedule a visit', ['booking', 'appointment', 'visit', 'book'], 'Share your address and preferred slot. Available slots: [available slots].', 'booking'),
      rule('service-offer', 'Current offer', ['offer', 'discount', 'deal'], '[Offer details] are valid until [end date].', 'offers'),
    ],
  },
};

const otherPack: IndustryTemplatePack = {
  title: 'General business starter pack',
  fallback: 'Thank you for your message. A team member from [Business name] will reply shortly.',
  qualificationQuestions: ['What service do you need?', 'When do you need it?', 'What is the best phone number to reach you?'],
  rules: [
    rule('general-price', 'Pricing', ['fees', 'price', 'charges'], '[Service name] starts at Rs [starting price].', 'price'),
    rule('general-timing', 'Business timing', ['timing', 'open', 'hours'], 'We are open [days] from [start time] to [end time].', 'timing'),
    rule('general-location', 'Location', ['location', 'loc', 'address', 'map'], 'We are at [full address]. Google Maps: [maps link].', 'location'),
  ],
};

export function getIndustryTemplatePack(category: BusinessCategory): IndustryTemplatePack {
  const pack = category === 'other' ? otherPack : industryTemplatePacks[category];
  return {
    ...pack,
    qualificationQuestions: [...pack.qualificationQuestions],
    rules: pack.rules.map((item) => ({ ...item, keywords: [...item.keywords] })),
  };
}

export function ruleHasPlaceholder(rule: Pick<KeywordReplyRule, 'reply'>) {
  return /\[[^\]\n]+\]/.test(rule.reply);
}

export function hasTemplatePlaceholders(rules: Pick<KeywordReplyRule, 'reply'>[]) {
  return rules.some(ruleHasPlaceholder);
}
