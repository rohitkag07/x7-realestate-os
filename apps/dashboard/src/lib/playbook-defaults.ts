import { Building2, Dumbbell, GraduationCap, HeartPulse, Wrench, type LucideIcon } from 'lucide-react';

export type VerticalKey = 'real_estate' | 'clinic' | 'coaching' | 'gym' | 'local_service';
export type PlaybookQuestion = {
  key: string;
  question: string;
  type: 'text' | 'choice' | 'yes_no';
  choices?: string[];
  required: boolean;
  order: number;
};
export type PlaybookTemplate = {
  vertical: VerticalKey;
  name: string;
  title: string;
  description: string;
  icon: LucideIcon;
  systemPrompt: string;
  questions: PlaybookQuestion[];
  handoffKeywords: string[];
  minAnswers: number;
  safetyOverride: boolean;
  handoffMessage: string;
};

const q = (order: number, key: string, question: string, type: PlaybookQuestion['type'] = 'text', choices?: string[]): PlaybookQuestion => ({
  key,
  question,
  type,
  choices,
  required: true,
  order,
});

export const PLAYBOOK_TEMPLATES: Record<VerticalKey, PlaybookTemplate> = {
  real_estate: {
    vertical: 'real_estate',
    name: 'WhatsAI SiteVisit',
    title: 'SiteVisit AI',
    description: 'Qualifies buyers and books site visits for builders.',
    icon: Building2,
    systemPrompt: '24/7 WhatsApp receptionist for real estate buyers. Qualify budget, intent, timeline, and site-visit slot.',
    questions: [
      q(1, 'intent', 'Self-use ya investment? / Are you looking for self-use or investment?', 'choice', ['Self-use', 'Investment', 'Both']),
      q(2, 'budget', 'Aapka budget range kya hai? / What is your budget range?', 'choice', ['15-25L', '25-40L', '40L+']),
      q(3, 'timeline', 'Aap kab tak lena chahenge? / When are you planning to buy?', 'choice', ['Immediately', '3 months', '6 months+']),
      q(4, 'loan', 'Kya home loan chahiye? / Will you need a home loan?', 'choice', ['Yes', 'No', 'Considering']),
      q(5, 'visit_slot', 'Site visit ke liye kaun sa time suit karega?', 'choice', ['Tomorrow 11 AM', 'Tomorrow 4 PM', 'Weekend', 'Different day']),
    ],
    handoffKeywords: ['book', 'token', 'confirm', 'legal', 'registry', 'ready to buy'],
    minAnswers: 3,
    safetyOverride: false,
    handoffMessage: 'Connect the buyer with a senior sales executive.',
  },
  clinic: {
    vertical: 'clinic',
    name: 'WhatsAI Appointment',
    title: 'Appointment AI',
    description: 'Books clinic appointments without diagnosis or prescriptions.',
    icon: HeartPulse,
    systemPrompt: '24/7 WhatsApp receptionist for a clinic. Book appointments. Never diagnose, prescribe, or handle emergencies.',
    questions: [
      q(1, 'issue_type', 'Appointment kis liye chahiye? / What is the appointment for?'),
      q(2, 'doctor_preference', 'Specific doctor ya specialist prefer karte hain?'),
      q(3, 'patient_type', 'First visit or returning patient?', 'choice', ['New patient', 'Returning']),
      q(4, 'preferred_date', 'Kab aana chahenge?', 'choice', ['Today', 'Tomorrow', 'This week', 'Next week']),
      q(5, 'preferred_time', 'Preferred time slot?', 'choice', ['Morning 9-12', 'Afternoon 12-4', 'Evening 4-7']),
    ],
    handoffKeywords: ['emergency', 'severe pain', 'chest pain', 'breathing', 'unconscious'],
    minAnswers: 2,
    safetyOverride: true,
    handoffMessage: 'Connect patient to clinic assistant. Emergencies must go to 112 or nearest hospital.',
  },
  coaching: {
    vertical: 'coaching',
    name: 'WhatsAI Admission',
    title: 'Admission AI',
    description: 'Qualifies students and books demo classes or counselor calls.',
    icon: GraduationCap,
    systemPrompt: '24/7 WhatsApp receptionist for coaching admissions. Qualify course, class, timeline, and demo intent.',
    questions: [
      q(1, 'course_interest', 'Which course are you interested in?'),
      q(2, 'student_level', 'Student kaun hai?', 'choice', ['Myself', 'My child', 'Someone else']),
      q(3, 'current_class', 'Current class/grade?'),
      q(4, 'exam_timeline', 'Target exam timeline?', 'choice', ['This year', 'Next year', 'Not decided']),
      q(5, 'batch_preference', 'Online ya offline?', 'choice', ['Online', 'Offline', 'Both ok']),
    ],
    handoffKeywords: ['admission', 'enroll', 'join', 'fees', 'fee structure', 'scholarship'],
    minAnswers: 3,
    safetyOverride: false,
    handoffMessage: 'Connect the lead with an admission counselor.',
  },
  gym: {
    vertical: 'gym',
    name: 'WhatsAI Fitness Intake',
    title: 'Fitness Intake AI',
    description: 'Captures fitness goals and books trial sessions.',
    icon: Dumbbell,
    systemPrompt: '24/7 WhatsApp receptionist for gym or dietitian intake. Qualify goals and book a trial session.',
    questions: [
      q(1, 'goal', 'Main fitness goal kya hai?', 'choice', ['Weight loss', 'Muscle gain', 'Fitness', 'Diet', 'Rehabilitation']),
      q(2, 'experience', 'Previous gym or diet experience?', 'choice', ['Regular', 'Sometimes', 'First time']),
      q(3, 'medical_flag', 'Any medical conditions?', 'choice', ['No', 'Diabetes', 'BP / Heart', 'Injury', 'Other']),
      q(4, 'preferred_time', 'Preferred timing?', 'choice', ['5-7 AM', '7-10 AM', '5-8 PM', 'Flexible']),
      q(5, 'trial_interest', 'Ready for a free trial session?', 'choice', ['Tomorrow', 'This week', 'Need more info']),
    ],
    handoffKeywords: ['join', 'membership', 'fees', 'price', 'book', 'start today'],
    minAnswers: 3,
    safetyOverride: false,
    handoffMessage: 'Introduce the lead to a trainer.',
  },
  local_service: {
    vertical: 'local_service',
    name: 'WhatsAI Callback',
    title: 'Callback AI',
    description: 'Captures service requests and books callbacks.',
    icon: Wrench,
    systemPrompt: '24/7 WhatsApp receptionist for local services. Capture requirement, location, urgency, and callback time.',
    questions: [
      q(1, 'service_needed', 'What service do you need?'),
      q(2, 'location', 'Where is the service needed?'),
      q(3, 'urgency', 'How urgent is this?', 'choice', ['Very urgent', 'Today', 'Any day']),
      q(4, 'budget', 'Any budget estimate?'),
      q(5, 'callback_time', 'When can the team call?', 'choice', ['Now', 'This evening', 'Tomorrow morning']),
    ],
    handoffKeywords: ['emergency', 'gas leak', 'flood', 'fire', 'urgent', 'immediately'],
    minAnswers: 2,
    safetyOverride: false,
    handoffMessage: 'Ask the service team to call the customer.',
  },
};

export const VERTICALS = Object.values(PLAYBOOK_TEMPLATES);
