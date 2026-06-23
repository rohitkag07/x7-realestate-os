import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildUpiLink } from '@/lib/utils';
import { DEMO_PROJECT } from '@/lib/sales-data';
import { logAgentRun, serviceClientOrNull } from '@/lib/sales-server';

const schema = z.object({
  lead_id: z.string(),
  builder_id: z.string(),
  project_id: z.string(),
  plot_id: z.string(),
  plot_number: z.string(),
  lead_name: z.string().min(2),
  phone: z.string(),
  token_amount: z.number().positive(),
  total_amount: z.number().positive(),
  payment_mode: z.enum(['upi', 'neft']),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const upiLink = payload.payment_mode === 'upi'
    ? buildUpiLink({
        pa: DEMO_PROJECT.paymentVpa,
        pn: DEMO_PROJECT.paymentName,
        am: payload.token_amount,
        tn: `${DEMO_PROJECT.name} token ${payload.plot_number} for ${payload.lead_name}`,
      })
    : null;

  let booking: Record<string, unknown> = {
    lead_id: payload.lead_id,
    project_id: payload.project_id,
    plot_id: payload.plot_id,
    token_amount: payload.token_amount,
    total_amount: payload.total_amount,
    payment_mode: payload.payment_mode,
    upi_payment_link: upiLink,
    status: 'token_paid',
  };

  const supabase = serviceClientOrNull();
  if (supabase) {
    const inserted = await (supabase.from('bookings') as any).insert({
      lead_id: payload.lead_id,
      project_id: payload.project_id,
      plot_id: payload.plot_id,
      token_amount: payload.token_amount,
      total_amount: payload.total_amount,
      payment_mode: payload.payment_mode,
      upi_payment_link: upiLink,
      payment_reference: payload.payment_mode === 'upi' ? 'UPI-PENDING' : 'NEFT-PENDING',
      status: 'token_paid',
      notes: 'Created from Phase 2 booking workbench.',
    }).select().single();
    if (!inserted.error && inserted.data) booking = inserted.data;

    await (supabase.from('plots') as any).update({
      status: 'booked',
      booked_by: payload.lead_id,
      token_amount: payload.token_amount,
      token_date: new Date().toISOString(),
    }).eq('id', payload.plot_id);

    await (supabase.from('whatsapp_messages') as any).insert({
      builder_id: payload.builder_id,
      lead_id: payload.lead_id,
      direction: 'outbound',
      phone: payload.phone,
      body: `Token booking initiated for plot ${payload.plot_number}. ${upiLink ?? 'NEFT instructions will follow.'}`,
      message_type: 'text',
      status: 'queued',
      agent: 'sales-agent-proxy',
    });
  }

  await logAgentRun({
    builderId: payload.builder_id,
    leadId: payload.lead_id,
    projectId: payload.project_id,
    action: 'dashboard-create-booking',
    input: payload as Record<string, unknown>,
    output: { booking, upiLink },
  });

  const receiptUrl = `/api/sales/bookings/receipt?${new URLSearchParams({
    buyer_name: payload.lead_name,
    plot_label: payload.plot_number,
    project_name: DEMO_PROJECT.name,
    token_amount: String(payload.token_amount),
    total_amount: String(payload.total_amount),
    payment_mode: payload.payment_mode,
    booking_date: String(booking.booking_date ?? new Date().toISOString()),
    status: String(booking.status ?? 'token_paid'),
  }).toString()}`;

  return NextResponse.json({
    ok: true,
    booking,
    upi_link: upiLink,
    receipt_url: receiptUrl,
  });
}
