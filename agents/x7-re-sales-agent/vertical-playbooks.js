/**
 * WhatsAI Assistant — Vertical Playbook Definitions
 * =====================================================================
 * Each playbook defines:
 *   - system_prompt: core instruction for the AI assistant
 *   - qualification_questions: ordered steps to qualify a lead
 *   - handoff_rules: when to escalate to the owner
 *   - followup_templates: drip messages by day
 *   - conversion_goal: what counts as a successful trial outcome
 *
 * The qualification_questions array is ordered. Each question has:
 *   - key:       machine key (saved to lead_qualification_answers)
 *   - question:  bilingual text to send to the user
 *   - type:      'text' | 'choice' | 'yes_no'
 *   - choices:   (for 'choice' type) array of option labels
 *   - hot_if:    (optional) function(answer) => boolean — marks lead HOT
 *   - skip_if:   (optional) function(answers) => boolean — skip this Q
 */

export const PLAYBOOKS = {

  // ─────────────────────────────────────────────────────────────────────
  // 1. REAL ESTATE — WhatsAI SiteVisit
  // ─────────────────────────────────────────────────────────────────────
  real_estate: {
    vertical: 'real_estate',
    name: 'WhatsAI SiteVisit',
    conversion_goal: 'site_visit_scheduled',
    system_prompt: `You are a 24/7 WhatsApp receptionist for a real estate builder.
Your job: instantly reply to buyer inquiries, qualify budget and intent, and book a site visit.
Language: Hindi-English mix (Hinglish). Keep replies short (under 60 words). Be warm, professional.
Never discuss competitor projects. Never promise specific prices — always direct to the sales team for negotiation.
If the buyer is ready to visit, immediately offer a slot.`,

    qualification_questions: [
      {
        key: 'intent',
        question: '🙏 Namaste! Apne liye ghar banana chahte hain ya investment ke liye? / Are you looking for self-use or investment?',
        type: 'choice',
        choices: ['Apne liye / Self-use', 'Investment', 'Dono / Both'],
        hot_if: (a) => a.toLowerCase().includes('investment') || a.toLowerCase().includes('both'),
      },
      {
        key: 'budget',
        question: 'Aapka budget range kya hai? / What is your budget range?',
        type: 'choice',
        choices: ['₹15–25 Lakh', '₹25–40 Lakh', '₹40 Lakh+'],
        hot_if: (a) => a.includes('40'),
      },
      {
        key: 'timeline',
        question: 'Aap kab tak lena chahenge? / When are you planning to buy?',
        type: 'choice',
        choices: ['Turant / Immediately', '3 mahine mein / 3 months', '6 mahine+ / 6 months+'],
        hot_if: (a) => a.toLowerCase().includes('turant') || a.toLowerCase().includes('immediately'),
      },
      {
        key: 'loan',
        question: 'Kya aapko home loan ki zaroorat padegi? / Will you need a home loan?',
        type: 'choice',
        choices: ['Haan, zaroor / Yes', 'Nahi, cash / No – Cash', 'Soch raha hoon / Considering'],
      },
      {
        key: 'visit_slot',
        question: 'Site visit ke liye kaun sa time suit karega? / Which time suits you for a site visit?',
        type: 'choice',
        choices: ['Kal 11 AM', 'Kal 4 PM', 'Is weekend', 'Alag din / Different day'],
        hot_if: (a) => a.includes('Kal') || a.includes('weekend'),
      },
    ],

    handoff_rules: {
      trigger_on_temperature: 'hot',
      trigger_on_stages: ['visit_scheduled', 'negotiation'],
      trigger_on_keywords: ['book', 'token', 'confirm', 'legal', 'registry', 'ready to buy'],
      message: 'Bahut accha! Main abhi senior sales executive se aapko connect karta hoon. 1-2 minute mein aapko call aayegi. 🙏\n\nGreat! I\'m connecting you with our senior sales executive right away.',
    },

    followup_templates: {
      day_0:  'Namaste! Aapka inquiry receive ho gayi hai. Main 30 min mein details bhejta hoon.',
      day_2:  'Aapne jo properties shortlist ki thi, unka latest availability aaj updated ho gayi hai. Kya main show kar doon?',
      day_5:  'Is hafte sirf 3 premium plots bache hain aapke preferred area mein. Site visit ke liye slot chahiye?',
      day_7:  'Ek buyer ne aaj offer diya hai. Aap interested hain toh 24 hours mein hold lagana padega.',
      day_14: 'Naya payment plan launch hua hai — EMI bhi possible. Details chahiye?',
      day_21: 'Kya aap abhi bhi dekh rahe hain? Main updated options ke saath available hoon.',
      day_30: 'Long-term mai bhi available hoon. Jab ready hon toh batayein.',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. CLINIC — WhatsAI Appointment
  // ─────────────────────────────────────────────────────────────────────
  clinic: {
    vertical: 'clinic',
    name: 'WhatsAI Appointment',
    conversion_goal: 'appointment_booked',
    system_prompt: `You are a 24/7 WhatsApp receptionist for a medical clinic.
Your job: answer general queries, qualify patient needs, and book appointments.
CRITICAL SAFETY RULE: Never diagnose, prescribe medications, or advise dosages. 
Never handle medical emergencies — always say "Please call 112 or go to nearest hospital immediately."
Language: Hinglish. Keep replies short and empathetic.`,

    qualification_questions: [
      {
        key: 'issue_type',
        question: 'Namaste! Kya aap bata sakte hain kis liye appointment chahiye? / Can you tell us what the appointment is for?',
        type: 'text',
        hot_if: (a) => /(emergency|severe|serious|urgent|chest|breath)/.test(a.toLowerCase()),
      },
      {
        key: 'doctor_preference',
        question: 'Koi specific doctor ya specialist prefer karte hain? / Do you prefer a specific doctor or specialist?',
        type: 'text',
      },
      {
        key: 'patient_type',
        question: 'Pehli baar aa rahe hain ya purana patient hain? / First visit or returning patient?',
        type: 'choice',
        choices: ['Pehli baar / New patient', 'Purana patient / Returning'],
      },
      {
        key: 'preferred_date',
        question: 'Kab aana chahenge? / When would you like to come?',
        type: 'choice',
        choices: ['Aaj / Today', 'Kal / Tomorrow', 'Is hafte / This week', 'Agle hafte / Next week'],
        hot_if: (a) => a.toLowerCase().includes('aaj') || a.toLowerCase().includes('today'),
      },
      {
        key: 'preferred_time',
        question: 'Kaunsa time slot prefer karenge? / Preferred time slot?',
        type: 'choice',
        choices: ['Morning 9–12', 'Afternoon 12–4', 'Evening 4–7'],
      },
    ],

    handoff_rules: {
      trigger_on_temperature: 'hot',
      trigger_on_keywords: ['emergency', 'severe pain', 'chest pain', 'breathing', 'unconscious'],
      message: 'Samajh gaye. Main doctor ke assistant ko abhi connect karta hoon.\n\nUnderstood. I\'m connecting you to the doctor\'s assistant right away.',
      safety_override: 'Yeh ek medical emergency lagti hai. Please immediately 112 call karein ya nearest hospital jayein.\n\nThis appears to be a medical emergency. Please call 112 or go to the nearest hospital immediately.',
    },

    followup_templates: {
      day_0:  'Aapki appointment request receive ho gayi. Hum 1 ghante mein confirm karenge.',
      day_1:  'Appointment confirm hai. Koi sawal ho toh batayein.',
      day_7:  'Aapki last visit ke baad kaisa feel ho raha hai? Follow-up zaroor karein.',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. COACHING — WhatsAI Admission
  // ─────────────────────────────────────────────────────────────────────
  coaching: {
    vertical: 'coaching',
    name: 'WhatsAI Admission',
    conversion_goal: 'demo_class_booked',
    system_prompt: `You are a 24/7 WhatsApp receptionist for a coaching institute.
Your job: answer course questions, qualify student needs, and book a free demo class or counselor callback.
Language: Hinglish. Be encouraging and motivating. Keep replies under 60 words.
Do not make promises about results or rankings.`,

    qualification_questions: [
      {
        key: 'course_interest',
        question: 'Namaste! Kaunse course ke baare mein jaanna chahte hain? / Which course are you interested in?',
        type: 'text',
      },
      {
        key: 'student_level',
        question: 'Student kaun hai? / Who is the student?',
        type: 'choice',
        choices: ['Main khud / Myself', 'Mera beta/beti / My child', 'Koi aur / Someone else'],
      },
      {
        key: 'current_class',
        question: 'Abhi konsi class mein hain? / Current class/grade?',
        type: 'text',
      },
      {
        key: 'exam_timeline',
        question: 'Kab ka exam target hai? / Target exam timeline?',
        type: 'choice',
        choices: ['Is saal / This year', 'Agle saal / Next year', 'Abhi decide nahi / Not decided'],
        hot_if: (a) => a.toLowerCase().includes('is saal') || a.toLowerCase().includes('this year'),
      },
      {
        key: 'batch_preference',
        question: 'Online ya offline class prefer karenge? / Online or offline?',
        type: 'choice',
        choices: ['Online', 'Offline / In-person', 'Dono chalega / Both ok'],
      },
    ],

    handoff_rules: {
      trigger_on_temperature: 'hot',
      trigger_on_keywords: ['admission', 'enroll', 'join', 'fees', 'fee structure', 'scholarship'],
      message: 'Bilkul! Main abhi counselor se aapko connect karta hoon.\n\nAbsolutely! I\'m connecting you with a counselor right now.',
    },

    followup_templates: {
      day_0:  'Aapki inquiry receive ho gayi. Counselor aaj evening tak call karenge.',
      day_2:  'Kya aap free demo class attend karna chahenge? Is hafte slot available hai.',
      day_5:  'Early admission discount aaj last date hai. Details chahiye?',
      day_14: 'Naya batch start ho raha hai. Abhi bhi seat available hai.',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // 4. GYM / DIETITIAN — WhatsAI Fitness Intake
  // ─────────────────────────────────────────────────────────────────────
  gym: {
    vertical: 'gym',
    name: 'WhatsAI Fitness Intake',
    conversion_goal: 'trial_session_booked',
    system_prompt: `You are a 24/7 WhatsApp receptionist for a gym or dietitian practice.
Your job: understand the member's goal, qualify their needs, and book a free trial session or consultation.
IMPORTANT: Never give specific medical nutrition advice or suggest supplements for medical conditions.
Language: Hinglish. Be energetic and motivating. Keep replies short.`,

    qualification_questions: [
      {
        key: 'goal',
        question: 'Namaste! Aapka main goal kya hai? / What is your primary goal?',
        type: 'choice',
        choices: ['Weight loss', 'Muscle gain', 'Fitness / Stamina', 'Diet / Nutrition', 'Rehabilitation'],
      },
      {
        key: 'experience',
        question: 'Pehle gym ya diet plan follow kiya hai? / Previous gym or diet experience?',
        type: 'choice',
        choices: ['Haan, regularly / Yes regularly', 'Kuch baar / Sometimes', 'Nahi, pehli baar / First time'],
      },
      {
        key: 'medical_flag',
        question: 'Koi medical condition hai? (diabetes, BP, injury, etc.) / Any medical conditions?',
        type: 'choice',
        choices: ['Nahi / No', 'Haan, diabetes', 'Haan, BP / Heart', 'Haan, injury', 'Haan, aur / Yes, other'],
        hot_if: (a) => a.toLowerCase().startsWith('nahi') || a.toLowerCase().startsWith('no'),
      },
      {
        key: 'preferred_time',
        question: 'Kab workout / consult karna prefer karoge? / Preferred timing?',
        type: 'choice',
        choices: ['Early morning 5–7 AM', 'Morning 7–10 AM', 'Evening 5–8 PM', 'Flexible'],
      },
      {
        key: 'trial_interest',
        question: 'Free trial session ke liye ready hain? / Ready for a free trial session?',
        type: 'choice',
        choices: ['Haan, kal / Yes, tomorrow', 'Haan, is hafte / Yes, this week', 'Pehle aur info chahiye / Need more info first'],
        hot_if: (a) => a.toLowerCase().includes('kal') || a.toLowerCase().includes('tomorrow'),
      },
    ],

    handoff_rules: {
      trigger_on_temperature: 'hot',
      trigger_on_keywords: ['join', 'membership', 'fees', 'price', 'book', 'start today'],
      message: 'Bahut badhiya! Main trainer se aapko introduce karta hoon.\n\nExcellent! I\'m connecting you with our trainer right now.',
    },

    followup_templates: {
      day_0:  'Aapki inquiry receive ho gayi. Trainer aaj call karenge.',
      day_2:  'Free trial slot available hai. Kal aa sakte hain?',
      day_5:  'Special membership offer end hone wala hai. Details chahiye?',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. LOCAL SERVICE — WhatsAI Callback
  // ─────────────────────────────────────────────────────────────────────
  local_service: {
    vertical: 'local_service',
    name: 'WhatsAI Callback',
    conversion_goal: 'callback_scheduled',
    system_prompt: `You are a 24/7 WhatsApp receptionist for a local service business.
Your job: capture the customer's requirement and book a callback or site visit from the team.
Language: Hinglish. Be polite and efficient. Keep replies short.`,

    qualification_questions: [
      {
        key: 'service_needed',
        question: 'Namaste! Aapko kaunsi service chahiye? / What service do you need?',
        type: 'text',
      },
      {
        key: 'location',
        question: 'Kaha pe service chahiye? / Where is the service needed?',
        type: 'text',
      },
      {
        key: 'urgency',
        question: 'Kitna urgent hai? / How urgent is this?',
        type: 'choice',
        choices: ['Bahut urgent / Very urgent', 'Aaj mein chahiye / Today', 'Koi bhi din / Any day'],
        hot_if: (a) => a.toLowerCase().includes('urgent') || a.toLowerCase().includes('aaj'),
      },
      {
        key: 'budget',
        question: 'Budget ka andaza hai? / Any budget estimate?',
        type: 'text',
      },
      {
        key: 'callback_time',
        question: 'Team aapko kab call kare? / When can the team call you?',
        type: 'choice',
        choices: ['Abhi / Now', 'Aaj shaam / This evening', 'Kal / Tomorrow morning'],
        hot_if: (a) => a.toLowerCase().includes('abhi') || a.toLowerCase().includes('now'),
      },
    ],

    handoff_rules: {
      trigger_on_temperature: 'hot',
      trigger_on_keywords: ['emergency', 'gas leak', 'flood', 'fire', 'urgent', 'immediately'],
      message: 'Samajh gaye! Team abhi aapko call karegi.\n\nUnderstood! Our team will call you right now.',
    },

    followup_templates: {
      day_0:  'Aapki request receive ho gayi. Team aaj callback karegi.',
      day_1:  'Kya callback ho gayi? Koi aur help chahiye?',
      day_3:  'Service ke baare mein koi sawal ho toh batayein.',
    },
  },
};

/**
 * Get a playbook by vertical key.
 * @param {string} vertical
 * @returns {object|null}
 */
export function getPlaybook(vertical) {
  return PLAYBOOKS[vertical] ?? null;
}

/**
 * Get all qualification question keys for a vertical.
 * @param {string} vertical
 * @returns {string[]}
 */
export function getQuestionKeys(vertical) {
  return (PLAYBOOKS[vertical]?.qualification_questions ?? []).map((q) => q.key);
}

/**
 * Get the next unanswered qualification question for this vertical.
 * @param {string} vertical
 * @param {Record<string, string>} answeredKeys - keys already answered
 * @returns {object|null} the next question object, or null if all done
 */
export function getNextQuestion(vertical, answeredKeys = {}) {
  const playbook = PLAYBOOKS[vertical];
  if (!playbook) return null;

  return playbook.qualification_questions.find((q) => {
    if (answeredKeys[q.key]) return false; // already answered
    if (q.skip_if && q.skip_if(answeredKeys)) return false; // conditionally skip
    return true;
  }) ?? null;
}

/**
 * Compute lead temperature based on current answers and playbook hot_if rules.
 * Returns 'hot' | 'warm' | 'cold'.
 */
export function computeTemperature(vertical, answers = {}) {
  const playbook = PLAYBOOKS[vertical];
  if (!playbook) return 'cold';

  let hotCount = 0;
  for (const q of playbook.qualification_questions) {
    if (q.hot_if && answers[q.key] && q.hot_if(answers[q.key])) {
      hotCount++;
    }
  }

  if (hotCount >= 2) return 'hot';
  if (hotCount === 1) return 'warm';
  return 'cold';
}
