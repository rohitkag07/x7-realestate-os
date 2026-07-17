/**
 * Hand-written TypeScript types matching supabase/migrations/001_initial_schema.sql.
 * Keep in sync if columns are added/removed — long-term these can be
 * regenerated with `supabase gen types typescript`.
 */

// ---------------------------------------------------------------------
// Enum unions (mirror CHECK constraints)
// ---------------------------------------------------------------------
export type BuilderPlan      = 'starter' | 'growth' | 'premium' | 'enterprise';
export type BuilderStatus    = 'active'  | 'paused' | 'cancelled' | 'trial';
export type ProjectType      = 'plots' | 'villas' | 'apartments' | 'commercial' | 'mixed';
export type ProjectStatus    = 'pre_launch' | 'active' | 'last_units' | 'sold_out' | 'paused';
export type PlotStatus       = 'available' | 'token' | 'booked' | 'registered' | 'sold' | 'blocked';
export type PlotFacing       =
  | 'North' | 'South' | 'East' | 'West'
  | 'North-East' | 'North-West' | 'South-East' | 'South-West'
  | 'Corner' | 'Park-Facing' | 'Road-Facing';

export type LeadSource       =
  | 'meta_ad' | 'google_ad' | 'website' | 'whatsapp'
  | 'referral' | 'walk_in' | 'ghost_closer' | 'telegram' | 'manual';

export type LeadStage        =
  | 'new' | 'qualified' | 'visit_scheduled' | 'visited'
  | 'negotiation' | 'booked' | 'lost';

export type LeadTemperature  = 'hot' | 'warm' | 'cold';

/** Operator-facing CRM stage used by canonical WhatsAI contacts and threads. */
export type ConversationStage = 'new' | 'interested' | 'negotiating' | 'booked' | 'lost' | 'cold';

export type SiteVisitStatus  =
  | 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled' | 'rescheduled';

export type BookingStatus    =
  | 'token_paid' | 'agreement' | 'registered' | 'completed' | 'cancelled' | 'refunded';

export type PaymentMode      = 'upi' | 'neft' | 'imps' | 'rtgs' | 'cash' | 'cheque' | 'card';

export type ContentType      = 'post' | 'reel' | 'story' | 'video' | 'ad_creative' | 'carousel' | 'long_form_video';
export type ContentPlatform  = 'instagram' | 'facebook' | 'youtube' | 'google_ads' | 'linkedin' | 'twitter' | 'whatsapp_status';
export type ContentPillar    =
  | 'location_advantage' | 'construction_update' | 'educational'
  | 'social_proof' | 'lifestyle' | 'investment_logic'
  | 'engagement' | 'festival' | 'ad';
export type ContentStatus    =
  | 'draft' | 'generating' | 'review' | 'approved' | 'scheduled'
  | 'published' | 'failed' | 'archived';

export type CampaignPlatform = 'meta' | 'google' | 'youtube' | 'linkedin';
export type CampaignType     =
  | 'awareness' | 'consideration' | 'conversion'
  | 'retargeting' | 'lead_gen' | 'click_to_whatsapp';
export type CampaignStatus   = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type ResidentStatus   = 'owner' | 'tenant' | 'vacant' | 'co_owner';
export type InvoiceStatus    = 'pending' | 'paid' | 'overdue' | 'waived' | 'cancelled';

export type ComplaintCategory =
  | 'plumbing' | 'electrical' | 'civil' | 'road' | 'water' | 'security'
  | 'cleanliness' | 'street_light' | 'sewage' | 'garbage' | 'lift'
  | 'internet' | 'common_area' | 'other';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintStatus   = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

export type VisitorType       = 'guest' | 'delivery' | 'service' | 'frequent' | 'contractor' | 'other';
export type VisitorApproval   = 'pending' | 'approved' | 'denied' | 'expired';
export type VisitorApprovalMethod = 'whatsapp' | 'dashboard' | 'phone_call' | 'pre_approved';

export type BusinessCategory = 'real_estate' | 'clinic' | 'coaching' | 'gym' | 'local_service' | 'other';
export type BusinessStatus = 'trial' | 'active' | 'paused' | 'cancelled';
export type BusinessPlan = 'trial' | 'starter' | 'growth' | 'pro' | 'enterprise';
export type AssistantVertical = BusinessCategory;
export type KeywordReplyMatchType = 'word' | 'exact' | 'contains';
export type KeywordReplyMediaType = 'image' | 'video' | 'document';
export type KeywordReplyIntent = 'price' | 'location' | 'timing' | 'booking' | 'offers';
export type ConversationStatus = 'open' | 'pending_human' | 'automated' | 'resolved' | 'archived';
export type AiMode = 'assistant' | 'manual' | 'paused';

// ---------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------
export interface Builder {
  id: string;
  name: string;
  company_name: string;
  phone: string;
  email: string | null;
  city: string;
  whatsapp_number: string | null;
  logo_url: string | null;
  brand_colors: Record<string, string>;
  plan: BuilderPlan;
  status: BuilderStatus;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  builder_id: string;
  name: string;
  slug: string;
  location: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  total_plots: number;
  available_plots: number;
  price_range_min: number | null;
  price_range_max: number | null;
  rera_number: string | null;
  project_type: ProjectType;
  amenities: string[];
  nearby_landmarks: Array<{ name: string; type: string; distance_km: number }>;
  brochure_url: string | null;
  landing_page_url: string | null;
  hero_image_url: string | null;
  description: string | null;
  status: ProjectStatus;
  launched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plot {
  id: string;
  project_id: string;
  plot_number: string;
  block: string | null;
  area_sqft: number;
  dimension: string | null;
  facing: PlotFacing | null;
  price_per_sqft: number | null;
  total_price: number | null;
  status: PlotStatus;
  booked_by: string | null;
  token_amount: number | null;
  token_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  project_id: string | null;
  builder_id: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  campaign_id: string | null;
  ad_id: string | null;
  budget_range: '15-25L' | '25-40L' | '40L+' | 'undisclosed' | null;
  purpose: 'self_use' | 'investment' | 'undecided' | null;
  timeline: 'immediate' | '3_months' | '6_months+' | null;
  lead_score: number;
  lead_stage: LeadStage;
  temperature: LeadTemperature;
  lost_reason: string | null;
  assigned_to: string | null;
  notes: string | null;
  whatsapp_session: Record<string, unknown>;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  project_id: string;
  scheduled_date: string;   // YYYY-MM-DD
  scheduled_time: string;
  status: SiteVisitStatus;
  feedback: string | null;
  interest_level: 'very_high' | 'high' | 'medium' | 'low' | null;
  follow_up_action: string | null;
  reminder_sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  lead_id: string;
  project_id: string;
  plot_id: string | null;
  token_amount: number;
  total_amount: number | null;
  payment_mode: PaymentMode | null;
  payment_reference: string | null;
  upi_payment_link: string | null;
  booking_date: string;
  status: BookingStatus;
  agreement_url: string | null;
  registry_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentCalendarEntry {
  id: string;
  project_id: string | null;
  builder_id: string;
  content_type: ContentType;
  platform: ContentPlatform;
  pillar: ContentPillar | null;
  caption: string | null;
  caption_hindi: string | null;
  hashtags: string[];
  media_url: string | null;
  thumbnail_url: string | null;
  media_type: 'image' | 'video' | 'carousel' | 'gif' | null;
  scheduled_for: string | null;
  published_at: string | null;
  status: ContentStatus;
  engagement: Record<string, number>;
  virality_score: number | null;
  generated_by: string | null;
  generation_prompt: string | null;
  remotion_composition: string | null;
  higgsfield_job_id: string | null;
  external_post_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdCampaign {
  id: string;
  project_id: string | null;
  builder_id: string;
  platform: CampaignPlatform;
  campaign_name: string;
  campaign_type: CampaignType;
  objective: string | null;
  budget_daily: number | null;
  budget_total: number | null;
  budget_spent: number;
  impressions: number;
  clicks: number;
  leads_generated: number;
  site_visits_attributed: number;
  bookings_attributed: number;
  cpl: number | null;
  cpv: number | null;
  ctr: number | null;
  status: CampaignStatus;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  google_campaign_id: string | null;
  audience: Record<string, unknown>;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resident {
  id: string;
  project_id: string;
  plot_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  alt_phone: string | null;
  family_members: Array<{ name: string; relation: string; phone?: string }>;
  vehicles: Array<{ type: string; number: string; color?: string }>;
  move_in_date: string | null;
  move_out_date: string | null;
  status: ResidentStatus;
  emergency_contact: Record<string, string>;
  documents: Array<{ name: string; url: string }>;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceInvoice {
  id: string;
  project_id: string;
  resident_id: string;
  plot_id: string | null;
  month: string;     // YYYY-MM
  amount: number;
  due_date: string;
  paid_date: string | null;
  payment_mode: PaymentMode | null;
  payment_reference: string | null;
  upi_payment_link: string | null;
  invoice_pdf_url: string | null;
  receipt_pdf_url: string | null;
  status: InvoiceStatus;
  late_fee: number;
  reminder_sent_at: string | null;
  reminder_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  project_id: string;
  resident_id: string;
  category: ComplaintCategory;
  description: string;
  photo_url: string | null;
  attachments: Array<{ name: string; url: string }>;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to: string | null;
  resolution_notes: string | null;
  sla_breached: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Visitor {
  id: string;
  project_id: string;
  resident_id: string | null;
  visitor_name: string;
  visitor_phone: string | null;
  purpose: string | null;
  vehicle_number: string | null;
  visitor_type: VisitorType;
  photo_url: string | null;
  entry_time: string;
  exit_time: string | null;
  approval_status: VisitorApproval;
  approved_by: string | null;
  approval_method: VisitorApprovalMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappMessage {
  id: string;
  builder_id: string;
  lead_id: string | null;
  resident_id: string | null;
  direction: 'inbound' | 'outbound';
  phone: string;
  wa_message_id: string | null;
  message_type: 'text' | 'image' | 'document' | 'video' | 'audio' | 'interactive' | 'template' | 'button_reply' | 'list_reply' | 'location';
  body: string | null;
  media_url: string | null;
  template_name: string | null;
  template_params: unknown[];
  interactive_payload: Record<string, unknown>;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  error: string | null;
  agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface ColonySettings {
  id: string;
  project_id: string;
  monthly_rate: number;
  rate_per_sqft: number | null;
  rate_overrides: Record<string, number>;
  billing_day: number;
  due_grace_days: number;
  late_fee_amount: number;
  late_fee_after_days: number;
  upi_vpa: string | null;
  upi_name: string | null;
  bank_account_name: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  gst_number: string | null;
  gst_rate: number;
  pan_number: string | null;
  invoice_prefix: string;
  receipt_prefix: string;
  next_invoice_seq: number;
  next_receipt_seq: number;
  reminder_day_1: number;
  reminder_day_2: number;
  reminder_day_3: number;
  created_at: string;
  updated_at: string;
}

export interface Notice {
  id: string;
  project_id: string;
  builder_id: string;
  title: string;
  body: string;
  body_hindi: string | null;
  category: 'general' | 'maintenance' | 'emergency' | 'event' | 'poll' | 'payment' | 'warning';
  target: 'all' | 'owners' | 'tenants' | 'block' | 'floor' | 'custom';
  target_filter: Record<string, unknown>;
  attachment_url: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  read_count: number;
  poll_options: Array<{ id: string; label: string; votes?: number }>;
  poll_responses: Record<string, string>;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Amenity {
  id: string;
  project_id: string;
  name: string;
  kind: 'clubhouse' | 'party_hall' | 'court' | 'pool' | 'gym' | 'guest_room' | 'parking' | 'other';
  capacity: number | null;
  hourly_rate: number;
  daily_rate: number | null;
  open_time: string;
  close_time: string;
  rules: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AmenityBooking {
  id: string;
  amenity_id: string;
  resident_id: string;
  project_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests: number;
  fee: number;
  paid: boolean;
  upi_payment_link: string | null;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  update_type: 'comment' | 'assignment' | 'status_change' | 'reminder' | 'photo' | 'closed';
  body: string | null;
  from_role: string | null;
  from_name: string | null;
  attachment_url: string | null;
  visible_to_resident: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ColonyDocument {
  id: string;
  project_id: string;
  resident_id: string | null;
  plot_id: string | null;
  category: 'society_bylaws' | 'registration' | 'rera' | 'fire_noc' | 'lift_certificate' | 'agm_minutes' | 'sale_deed' | 'noc' | 'rent_agreement' | 'utility_bill' | 'other';
  title: string;
  file_url: string;
  size_bytes: number | null;
  uploaded_by: string | null;
  visible_to_residents: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentReceipt {
  id: string;
  invoice_id: string;
  project_id: string;
  resident_id: string;
  receipt_number: string;
  amount: number;
  payment_mode: PaymentMode;
  payment_reference: string | null;
  pdf_url: string | null;
  issued_at: string;
  created_at: string;
}

export interface AgentRun {
  id: string;
  builder_id: string | null;
  agent: string;
  action: string;
  lead_id: string | null;
  project_id: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: 'success' | 'partial' | 'failure';
  duration_ms: number | null;
  error: string | null;
  cost_usd: number | null;
  created_at: string;
}

export interface FollowUpQueue {
  id: string;
  builder_id: string;
  lead_id: string;
  step: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'skipped' | 'cancelled' | 'failed';
  payload: Record<string, unknown>;
  sent_at: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  builder_id: string | null;
  name: string;
  legal_name: string | null;
  category: BusinessCategory;
  city: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_whatsapp: string | null;
  status: BusinessStatus;
  plan: BusinessPlan;
  trial_started_at: string;
  trial_ends_at: string;
  daily_message_limit: number;
  handoff_threshold: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BusinessChannel {
  id: string;
  business_id: string;
  channel_type: 'whatsapp' | 'instagram' | 'facebook' | 'website' | 'phone';
  phone_number: string | null;
  phone_number_id: string | null;
  business_account_id: string | null;
  display_name: string | null;
  verify_token: string | null;
  is_primary: boolean;
  status: 'testing' | 'connected' | 'disabled' | 'error';
  last_verified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KeywordReplyRule {
  id: string;
  label: string;
  keywords: string[];
  match_type: KeywordReplyMatchType;
  reply: string;
  priority: number;
  enabled: boolean;
  handoff: boolean;
  intent?: KeywordReplyIntent;
  fuzzy_enabled?: boolean;
  fuzzy_threshold?: number;
  media_asset_id?: string;
  media_storage_path?: string;
  media_url?: string;
  media_type?: KeywordReplyMediaType;
  media_name?: string;
  media_mime_type?: 'image/jpeg' | 'image/png' | 'video/mp4' | 'application/pdf';
  media_size_bytes?: number;
}

export interface AssistantPlaybook {
  id: string;
  business_id: string;
  vertical: AssistantVertical;
  name: string;
  system_prompt: string | null;
  qualification_questions: unknown[];
  keyword_replies: KeywordReplyRule[];
  fallback_reply: string;
  playbook_version: number;
  handoff_rules: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssistantKnowledgeItem {
  id: string;
  business_id: string;
  playbook_id: string | null;
  title: string;
  kind: 'faq' | 'service' | 'pricing' | 'policy' | 'location' | 'offer' | 'script' | 'other';
  content: string;
  metadata: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaybookMediaAsset {
  id: string;
  business_id: string;
  playbook_id: string;
  rule_id: string;
  storage_bucket: 'whatsai-media';
  storage_path: string;
  media_type: KeywordReplyMediaType;
  mime_type: 'image/jpeg' | 'image/png' | 'video/mp4' | 'application/pdf';
  file_name: string;
  file_size_bytes: number;
  status: 'ready' | 'deleted' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ConversationContact {
  id: string;
  business_id: string | null;
  builder_id: string | null;
  lead_id: string | null;
  phone: string;
  name: string | null;
  source: string;
  lifecycle_stage: 'lead' | 'qualified' | 'appointment' | 'customer' | 'support' | 'lost';
  temperature: LeadTemperature;
  stage: ConversationStage;
  tags: string[];
  last_message_at: string | null;
  last_handoff_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConversationThread {
  id: string;
  business_id: string | null;
  business_channel_id: string | null;
  contact_id: string | null;
  builder_id: string | null;
  lead_id: string | null;
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'website' | 'phone';
  status: ConversationStatus;
  assigned_to: string | null;
  assigned_user_id: string | null;
  ai_mode: AiMode;
  stage: ConversationStage;
  unread_count: number;
  last_message_at: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  thread_id: string | null;
  contact_id: string | null;
  business_id: string | null;
  builder_id: string | null;
  lead_id: string | null;
  whatsapp_message_id: string | null;
  direction: 'inbound' | 'outbound';
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'website' | 'phone';
  message_type: string;
  body: string | null;
  status: WhatsappMessage['status'];
  agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LeadQualificationAnswer {
  id: string;
  thread_id: string;
  question_key: string;
  answer_value: string;
  confidence: number | null;
  extracted_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  contact_id: string;
  thread_id: string | null;
  title: string;
  appointment_type: 'site_visit' | 'clinic_visit' | 'demo' | 'callback' | 'other';
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HandoffEvent {
  id: string;
  business_id: string | null;
  builder_id: string | null;
  thread_id: string | null;
  lead_id: string | null;
  reason: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  summary: string;
  assigned_to: string | null;
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored';
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

export interface DailyOwnerSummary {
  id: string;
  business_id: string | null;
  builder_id: string | null;
  summary_date: string;
  owner_phone: string | null;
  metrics: Record<string, unknown>;
  body: string;
  status: 'draft' | 'queued' | 'sent' | 'failed';
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export interface FollowupSequence {
  id: string;
  business_id: string;
  playbook_id: string | null;
  name: string;
  steps: Array<{ day: number; message: string }>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowupJob {
  id: string;
  sequence_id: string;
  thread_id: string;
  contact_id: string;
  business_id: string;
  step_index: number;
  scheduled_at: string;
  sent_at: string | null;
  locked_at: string | null;
  status: 'pending' | 'processing' | 'sent' | 'cancelled' | 'failed';
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  display_name: string | null;
  role: 'owner' | 'manager' | 'agent';
  active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------
// Database (shape expected by @supabase/supabase-js generics)
// ---------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      builders:              { Row: Builder;            Insert: Partial<Builder>;            Update: Partial<Builder> };
      projects:              { Row: Project;            Insert: Partial<Project>;            Update: Partial<Project> };
      plots:                 { Row: Plot;               Insert: Partial<Plot>;               Update: Partial<Plot> };
      leads:                 { Row: Lead;               Insert: Partial<Lead>;               Update: Partial<Lead> };
      site_visits:           { Row: SiteVisit;          Insert: Partial<SiteVisit>;          Update: Partial<SiteVisit> };
      bookings:              { Row: Booking;            Insert: Partial<Booking>;            Update: Partial<Booking> };
      content_calendar:      { Row: ContentCalendarEntry; Insert: Partial<ContentCalendarEntry>; Update: Partial<ContentCalendarEntry> };
      ad_campaigns:          { Row: AdCampaign;         Insert: Partial<AdCampaign>;         Update: Partial<AdCampaign> };
      residents:             { Row: Resident;           Insert: Partial<Resident>;           Update: Partial<Resident> };
      maintenance_invoices:  { Row: MaintenanceInvoice; Insert: Partial<MaintenanceInvoice>; Update: Partial<MaintenanceInvoice> };
      complaints:            { Row: Complaint;          Insert: Partial<Complaint>;          Update: Partial<Complaint> };
      visitors:              { Row: Visitor;            Insert: Partial<Visitor>;            Update: Partial<Visitor> };
      colony_settings:       { Row: ColonySettings;     Insert: Partial<ColonySettings>;     Update: Partial<ColonySettings> };
      notices:               { Row: Notice;             Insert: Partial<Notice>;             Update: Partial<Notice> };
      amenities:             { Row: Amenity;            Insert: Partial<Amenity>;            Update: Partial<Amenity> };
      amenity_bookings:      { Row: AmenityBooking;     Insert: Partial<AmenityBooking>;     Update: Partial<AmenityBooking> };
      colony_staff:          { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      complaint_updates:     { Row: ComplaintUpdate;    Insert: Partial<ComplaintUpdate>;    Update: Partial<ComplaintUpdate> };
      documents:             { Row: ColonyDocument;     Insert: Partial<ColonyDocument>;     Update: Partial<ColonyDocument> };
      payment_receipts:      { Row: PaymentReceipt;     Insert: Partial<PaymentReceipt>;     Update: Partial<PaymentReceipt> };
      whatsapp_messages:     { Row: WhatsappMessage;    Insert: Partial<WhatsappMessage>;    Update: Partial<WhatsappMessage> };
      agent_runs:            { Row: AgentRun;           Insert: Partial<AgentRun>;           Update: Partial<AgentRun> };
      follow_up_queue:       { Row: FollowUpQueue;      Insert: Partial<FollowUpQueue>;      Update: Partial<FollowUpQueue> };
      businesses:            { Row: Business;           Insert: Partial<Business>;           Update: Partial<Business> };
      business_channels:     { Row: BusinessChannel;    Insert: Partial<BusinessChannel>;    Update: Partial<BusinessChannel> };
      assistant_playbooks:   { Row: AssistantPlaybook;  Insert: Partial<AssistantPlaybook>;  Update: Partial<AssistantPlaybook> };
      playbook_media_assets: { Row: PlaybookMediaAsset; Insert: Partial<PlaybookMediaAsset>; Update: Partial<PlaybookMediaAsset> };
      assistant_knowledge_items: { Row: AssistantKnowledgeItem; Insert: Partial<AssistantKnowledgeItem>; Update: Partial<AssistantKnowledgeItem> };
      conversation_contacts: { Row: ConversationContact; Insert: Partial<ConversationContact>; Update: Partial<ConversationContact> };
      conversation_threads:  { Row: ConversationThread; Insert: Partial<ConversationThread>; Update: Partial<ConversationThread> };
      conversation_messages: { Row: ConversationMessage; Insert: Partial<ConversationMessage>; Update: Partial<ConversationMessage> };
      lead_qualification_answers: { Row: LeadQualificationAnswer; Insert: Partial<LeadQualificationAnswer>; Update: Partial<LeadQualificationAnswer> };
      appointments:         { Row: Appointment;       Insert: Partial<Appointment>;       Update: Partial<Appointment> };
      handoff_events:        { Row: HandoffEvent;       Insert: Partial<HandoffEvent>;       Update: Partial<HandoffEvent> };
      daily_owner_summaries: { Row: DailyOwnerSummary;  Insert: Partial<DailyOwnerSummary>;  Update: Partial<DailyOwnerSummary> };
      followup_sequences:    { Row: FollowupSequence;   Insert: Partial<FollowupSequence>;   Update: Partial<FollowupSequence> };
      followup_jobs:         { Row: FollowupJob;        Insert: Partial<FollowupJob>;        Update: Partial<FollowupJob> };
      business_members:      { Row: BusinessMember;     Insert: Partial<BusinessMember>;     Update: Partial<BusinessMember> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
