import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/sales-server';
import type { ConversationStage, LeadStage } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stageSchema = z.object({
  business_id: z.string().uuid(),
  stage: z.enum(['new', 'interested', 'negotiating', 'booked', 'lost', 'cold']),
});

/**
 * Updates the canonical contact stage. The contact is fetched with its business
 * scope before any mutation, so a business cannot update another tenant's lead.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = stageSchema.safeParse(await request.json());
  if (!payload.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ ok: false, error: 'A valid contact, business, and stage are required.' }, { status: 400 });
  }

  const supabase = serviceClientOrNull();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 503 });
  }

  const contactResult = await (supabase.from('conversation_contacts') as any)
    .select('id,business_id,lead_id')
    .eq('id', id)
    .eq('business_id', payload.data.business_id)
    .maybeSingle();

  if (contactResult.error || !contactResult.data) {
    return NextResponse.json({ ok: false, error: 'Contact not found for this business.' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const contact = contactResult.data as { id: string; business_id: string; lead_id: string | null };
  const contactUpdate = await (supabase.from('conversation_contacts') as any)
    .update({ stage: payload.data.stage, updated_at: now })
    .eq('id', contact.id)
    .eq('business_id', contact.business_id)
    .select('id,stage')
    .single();

  if (contactUpdate.error) {
    return NextResponse.json({ ok: false, error: contactUpdate.error.message }, { status: 500 });
  }

  const threadsUpdate = await (supabase.from('conversation_threads') as any)
    .update({ stage: payload.data.stage, updated_at: now })
    .eq('contact_id', contact.id)
    .eq('business_id', contact.business_id);

  if (threadsUpdate.error) {
    return NextResponse.json({ ok: false, error: threadsUpdate.error.message }, { status: 500 });
  }

  // Keep the legacy lead pipeline broadly aligned without forcing its older
  // real-estate-specific stages onto the WhatsAI operator experience.
  if (contact.lead_id) {
    await (supabase.from('leads') as any)
      .update({ lead_stage: legacyStageFor(payload.data.stage), updated_at: now })
      .eq('id', contact.lead_id);
  }

  return NextResponse.json({ ok: true, contact_id: contact.id, stage: payload.data.stage });
}

function legacyStageFor(stage: ConversationStage): LeadStage {
  if (stage === 'interested') return 'qualified';
  if (stage === 'cold') return 'lost';
  if (stage === 'negotiating') return 'negotiation';
  return stage;
}
