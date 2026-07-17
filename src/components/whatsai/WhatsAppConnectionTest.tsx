'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WhatsAppConnectionTest() {
  const [state, setState] = useState<{ loading: boolean; message?: string; ok?: boolean }>({ loading: false });
  async function test() {
    setState({ loading: true });
    const response = await fetch('/api/health/whatsapp', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    setState({ loading: false, ok: Boolean(payload?.ok), message: payload?.ok ? `Connected as ${payload.profile?.verified_name || payload.profile?.display_phone_number || 'your WhatsApp Business number'}.` : payload?.error || 'Connection test failed.' });
  }
  return <div className="rounded-2xl border border-[#d8dee4] bg-white p-4"><Button onClick={test} disabled={state.loading}>{state.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Test WhatsApp connection'}</Button>{state.message ? <p className={`mt-3 flex gap-2 text-sm ${state.ok ? 'text-emerald-700' : 'text-red-700'}`}>{state.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}{state.message}</p> : null}</div>;
}
