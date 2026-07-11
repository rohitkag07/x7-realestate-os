/**
 * WhatsAI Assistant — Assistant Response Contract
 * =====================================================================
 * Defines the standard response envelope that every WhatsAI agent must
 * return when processing an inbound conversation message.
 *
 * All agents (sales, colony, clinic, coaching…) must conform to this
 * contract so the Summoner and Trial Console can interpret results
 * uniformly regardless of vertical.
 *
 * Usage (in any agent):
 *   import { buildAssistantResponse, buildHandoffResponse } from './assistant-contract.js';
 */

export const RESPONSE_TYPES = {
  ANSWER:            'answer',           // Bot gave a direct answer to a question
  ASK_QUALIFICATION: 'ask_qualification', // Bot is asking a qualification question
  APPOINTMENT_OFFER: 'appointment_offer', // Bot is offering a time slot
  HANDOFF:           'handoff',           // Bot is escalating to a human
  FALLBACK:          'fallback',          // Bot doesn't know / low confidence
  STOP:              'stop',              // Conversation closed / completed
};

export const VERTICAL_GUARDRAILS = {
  real_estate: {
    disallow: [],
    require_handoff_on: ['legal advice', 'pricing negotiation above budget'],
  },
  clinic: {
    disallow: ['diagnose', 'prescription', 'dosage', 'emergency'],
    require_handoff_on: ['emergency', 'diagnosis', 'prescription', 'chest pain', 'unconscious'],
    safety_note: 'Never diagnose or prescribe. Always escalate medical emergencies immediately.',
  },
  coaching: {
    disallow: [],
    require_handoff_on: ['refund request', 'complaints about faculty'],
  },
  gym: {
    disallow: ['medical advice', 'clinical nutrition advice'],
    require_handoff_on: ['medical condition', 'serious injury', 'eating disorder'],
  },
  local_service: {
    disallow: [],
    require_handoff_on: ['emergency service', 'gas leak', 'electrical hazard'],
  },
  other: {
    disallow: [],
    require_handoff_on: [],
  },
};

/**
 * Build a standard assistant response envelope.
 *
 * @param {object} params
 * @param {string} params.type               - One of RESPONSE_TYPES
 * @param {string} params.message            - The outbound reply text (bilingual hi-en)
 * @param {string} [params.vertical]         - Business vertical (for guardrail validation)
 * @param {number} [params.confidence]       - 0.0–1.0 confidence in the response
 * @param {string} [params.lead_stage]       - Current lead stage after this response
 * @param {string} [params.next_question]    - Next qualification question key (if ASK_QUALIFICATION)
 * @param {string} [params.handoff_reason]   - Why handoff is triggered (if HANDOFF)
 * @param {string} [params.handoff_priority] - 'low'|'medium'|'high'|'critical'
 * @param {string} [params.follow_up_at]     - ISO timestamp for scheduled follow-up
 * @param {object} [params.appointment]      - Appointment slot if APPOINTMENT_OFFER
 * @param {object} [params.metadata]         - Any additional vertical-specific data
 * @returns {object} Standardised assistant response
 */
export function buildAssistantResponse({
  type,
  message,
  vertical = 'other',
  confidence = 0.8,
  lead_stage = null,
  next_question = null,
  handoff_reason = null,
  handoff_priority = 'medium',
  follow_up_at = null,
  appointment = null,
  metadata = {},
}) {
  if (!RESPONSE_TYPES[type.toUpperCase().replace(/ /g, '_')]) {
    throw new Error(`Invalid response type: "${type}". Must be one of: ${Object.values(RESPONSE_TYPES).join(', ')}`);
  }

  // Enforce vertical guardrails
  const guardrail = VERTICAL_GUARDRAILS[vertical] || VERTICAL_GUARDRAILS.other;
  const messageLC = message.toLowerCase();

  if (guardrail.disallow.some((term) => messageLC.includes(term))) {
    return buildFallbackResponse({
      vertical,
      reason: 'guardrail_violation',
      metadata: { blocked_term: guardrail.disallow.find((t) => messageLC.includes(t)) },
    });
  }

  return {
    ok: true,
    type,
    message,
    vertical,
    confidence,
    lead_stage,
    next_question,
    handoff_reason,
    handoff_priority,
    follow_up_at,
    appointment,
    metadata,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Build a HANDOFF response — shortcuts buildAssistantResponse with handoff defaults.
 */
export function buildHandoffResponse({ message, reason, priority = 'high', vertical = 'other', lead_stage = null, metadata = {} }) {
  return buildAssistantResponse({
    type: RESPONSE_TYPES.HANDOFF,
    message: message || 'Main aapko ek expert se connect karta hoon. Thoda intezaar karein. 🙏',
    vertical,
    confidence: 1.0,
    lead_stage,
    handoff_reason: reason,
    handoff_priority: priority,
    metadata,
  });
}

/**
 * Build a FALLBACK response — when the bot doesn't know.
 */
export function buildFallbackResponse({ vertical = 'other', reason = 'low_confidence', metadata = {} }) {
  return buildAssistantResponse({
    type: RESPONSE_TYPES.FALLBACK,
    message: 'Main iska jawab abhi nahi de sakta. Kya aap apna number share karein? Main ya team aapko callback karenge. 🙏',
    vertical,
    confidence: 0.1,
    handoff_reason: reason,
    handoff_priority: 'medium',
    metadata,
  });
}

/**
 * Build an ASK_QUALIFICATION response.
 */
export function buildQualificationQuestion({ question, question_key, vertical = 'other', lead_stage = null }) {
  return buildAssistantResponse({
    type: RESPONSE_TYPES.ASK_QUALIFICATION,
    message: question,
    vertical,
    confidence: 1.0,
    lead_stage,
    next_question: question_key,
  });
}

/**
 * Check if a message body triggers a mandatory handoff for the given vertical.
 * Returns the reason string if handoff is required, or null if not.
 */
export function checkMandatoryHandoff(messageBody, vertical = 'other') {
  const guardrail = VERTICAL_GUARDRAILS[vertical] || VERTICAL_GUARDRAILS.other;
  const lower = messageBody.toLowerCase();
  const trigger = guardrail.require_handoff_on?.find((term) => lower.includes(term));
  return trigger || null;
}
