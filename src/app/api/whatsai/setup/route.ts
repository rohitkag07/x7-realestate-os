import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/sales-server';
import { keywordPlaybookInputSchema } from '@/lib/keyword-reply-schema';
import { knowledgeItemsInputSchema, normalizeKnowledgeKeywords, slugifyKnowledgeTitle } from '@/lib/knowledge-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  builder_id: z.string().optional().nullable(),
  name: z.string().min(2),
  category: z.enum(['real_estate', 'clinic', 'coaching', 'gym', 'local_service', 'other']),
  city: z.string().optional().nullable(),
  owner_name: z.string().optional().nullable(),
  owner_whatsapp: z.string().min(8),
  phone_number_id: z.string().optional().nullable(),
  business_account_id: z.string().optional().nullable(),
  verify_token: z.string().optional().nullable(),
  core_offer: z.string().min(5).optional().nullable(),
  qualification_questions: z.array(z.string().min(1)).optional().default([]),
  keyword_replies: keywordPlaybookInputSchema.shape.keyword_replies,
  fallback_reply: keywordPlaybookInputSchema.shape.fallback_reply,
  knowledge_items: knowledgeItemsInputSchema.optional().default([]),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = serviceClientOrNull();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  }

  const payload = parsed.data;
  const builderId = payload.builder_id || process.env.DEFAULT_BUILDER_ID || null;
  const defaultBusinessId = process.env.DEFAULT_BUSINESS_ID || null;
  const existing = defaultBusinessId
    ? await (supabase.from('businesses') as any)
        .select('*')
        .eq('id', defaultBusinessId)
        .maybeSingle()
    : builderId
      ? await (supabase.from('businesses') as any)
        .select('*')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      : { data: null };

  const businessWrite = existing.data
    ? await (supabase.from('businesses') as any)
        .update({
          name: payload.name,
          category: payload.category,
          city: payload.city ?? null,
          owner_name: payload.owner_name ?? null,
          owner_phone: normalizePhone(payload.owner_whatsapp),
          owner_whatsapp: normalizePhone(payload.owner_whatsapp),
          phone: normalizePhone(payload.owner_whatsapp),
          status: 'trial',
          plan: 'trial',
          daily_message_limit: 500,
          metadata: {
            core_offer: payload.core_offer ?? null,
            onboarding_source: 'assistant_setup_wizard',
          },
        })
        .eq('id', existing.data.id)
        .select()
        .single()
    : await (supabase.from('businesses') as any)
        .insert({
          builder_id: builderId,
          name: payload.name,
          category: payload.category,
          city: payload.city ?? null,
          owner_name: payload.owner_name ?? null,
          owner_phone: normalizePhone(payload.owner_whatsapp),
          owner_whatsapp: normalizePhone(payload.owner_whatsapp),
          phone: normalizePhone(payload.owner_whatsapp),
          status: 'trial',
          plan: 'trial',
          daily_message_limit: 500,
          metadata: {
            core_offer: payload.core_offer ?? null,
            onboarding_source: 'assistant_setup_wizard',
          },
        })
        .select()
        .single();

  if (businessWrite.error || !businessWrite.data) {
    return NextResponse.json({ ok: false, error: businessWrite.error?.message ?? 'Business setup failed.' }, { status: 500 });
  }

  const business = businessWrite.data;

  const phoneNumberId = payload.phone_number_id ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
  const channelPhone = normalizePhone(payload.owner_whatsapp);

  await (supabase.from('business_channels') as any).insert({
    business_id: business.id,
    provider: 'meta_whatsapp',
    channel_id: phoneNumberId || `pending-${business.id}`,
    channel_phone: channelPhone,
    channel_type: 'whatsapp',
    phone_number: channelPhone,
    phone_number_id: phoneNumberId,
    business_account_id: payload.business_account_id ?? null,
    verify_token: payload.verify_token ?? process.env.WHATSAPP_VERIFY_TOKEN ?? null,
    display_name: payload.name,
    is_primary: true,
    status: phoneNumberId ? 'connected' : 'testing',
    config: {
      source: 'assistant_setup_wizard',
      webhook_path: '/api/webhooks/whatsapp',
    },
    metadata: {
      webhook_ready: Boolean(payload.verify_token ?? process.env.WHATSAPP_VERIFY_TOKEN),
      business_account_id: payload.business_account_id ?? null,
    },
  });

  const activePlaybook = await (supabase.from('assistant_playbooks') as any)
    .select('id, playbook_version')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activePlaybook.error) {
    return NextResponse.json({ ok: false, error: activePlaybook.error.message }, { status: 500 });
  }

  const playbookValues = {
    business_id: business.id,
    vertical: payload.category,
    name: `${payload.name} WhatsAI Playbook`,
    system_prompt: payload.core_offer ? `Core offer: ${payload.core_offer}` : null,
    qualification_questions: payload.qualification_questions.length ? payload.qualification_questions : defaultQuestions(payload.category),
    keyword_replies: payload.keyword_replies,
    fallback_reply: payload.fallback_reply,
    handoff_rules: {
      no_keyword_match: true,
      owner_request: true,
      angry_customer: true,
    },
    is_active: true,
  };

  const playbook = activePlaybook.data
    ? await (supabase.from('assistant_playbooks') as any)
        .update({
          ...playbookValues,
          playbook_version: Number(activePlaybook.data.playbook_version ?? 0) + 1,
        })
        .eq('id', activePlaybook.data.id)
        .eq('business_id', business.id)
        .select()
        .single()
    : await (supabase.from('assistant_playbooks') as any)
        .insert({ ...playbookValues, playbook_version: 1 })
        .select()
        .single();

  if (playbook.error || !playbook.data) {
    return NextResponse.json({ ok: false, error: playbook.error?.message ?? 'Playbook setup failed.' }, { status: 500 });
  }

  if (payload.knowledge_items.length) {
    const reviewedAt = new Date().toISOString();
    const knowledgeRows = payload.knowledge_items.map((item, index) => ({
      business_id: business.id,
      playbook_id: playbook.data.id,
      type: item.kind,
      title: item.title,
      question: item.question || null,
      content: item.content,
      keywords: normalizeKnowledgeKeywords(item.keywords),
      locale: item.locale,
      status: item.status,
      okf_slug: item.okf_slug || `${slugifyKnowledgeTitle(item.title)}-${index + 1}`,
      source_type: item.source_type,
      source_url: item.source_url || null,
      media_url: item.media_url || null,
      metadata: { ...item.metadata, onboarding_source: 'assistant_setup_wizard' },
      is_active: item.status === 'published',
      published_at: item.status === 'published' ? reviewedAt : null,
      last_reviewed_at: reviewedAt,
    }));
    const { error: knowledgeError } = await (supabase.from('assistant_knowledge_items') as any)
      .upsert(knowledgeRows, { onConflict: 'business_id,okf_slug' });
    if (knowledgeError) {
      return NextResponse.json({ ok: false, error: `Knowledge setup failed: ${knowledgeError.message}` }, { status: 500 });
    }
  }

  if (builderId) {
    await (supabase.from('agent_runs') as any).insert({
      builder_id: builderId,
      agent: 'whatsai-assistant',
      action: 'business-setup',
      input: {
        business_name: payload.name,
        category: payload.category,
        keyword_rule_count: payload.keyword_replies.length,
        knowledge_item_count: payload.knowledge_items.length,
        whatsapp_connected: Boolean(phoneNumberId),
      },
      output: { business_id: business.id, playbook_id: playbook.data?.id ?? null },
      status: 'success',
    });
  }

  return NextResponse.json({
    ok: true,
    business,
    playbook: playbook.data ?? null,
  });
}

function defaultQuestions(category: string) {
  const shared = ['name', 'requirement', 'preferred_time', 'location'];
  if (category === 'real_estate') return ['budget', 'location_preference', 'property_type', 'timeline', 'loan_readiness', 'visit_slot'];
  if (category === 'clinic') return ['patient_issue', 'doctor_or_speciality', 'preferred_date_time', 'new_or_returning', 'urgency'];
  if (category === 'coaching') return ['course_interest', 'student_level', 'batch_timing', 'online_or_offline', 'exam_timeline'];
  if (category === 'gym') return ['fitness_goal', 'age_range', 'diet_preference', 'medical_caution', 'trial_time'];
  return shared;
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return value.startsWith('+') ? value : `+${digits}`;
}
