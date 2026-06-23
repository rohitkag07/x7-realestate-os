'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { LandingProject, LandingBuilder } from '@/lib/types';
export function SiteVisitSection({ project, builder }: { project: LandingProject; builder: LandingBuilder }) {
  const accent = builder.brand_colors?.accent ?? '#F59E0B', primary = builder.brand_colors?.primary ?? '#0F172A';
  const [state, setState] = useState({ name: '', phone: '', email: '', date: '', notes: '' });
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setStatus('sending'); setError(null);
    try {
      const res = await fetch('/api/site-visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...state, project_id: project.id, builder_id: builder.id, source: 'landing_page' }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? `error ${res.status}`); }
      setStatus('sent');
    } catch (e) { setStatus('error'); setError((e as Error).message); }
  }
  if (status === 'sent') return (
    <section id="booking" className="py-20 px-6 lg:px-12" style={{ background: primary }}>
      <div className="max-w-2xl mx-auto text-center text-white"><h2 className="text-3xl font-bold">Thank you! 🙏</h2><p className="mt-3 text-white/80">Our team will WhatsApp you within minutes.</p></div>
    </section>
  );
  return (
    <section id="booking" className="py-20 px-6 lg:px-12" style={{ background: primary }}>
      <div className="max-w-2xl mx-auto text-white">
        <h2 className="text-3xl font-bold">Book a Site Visit</h2>
        <p className="mt-2 text-white/80">Free transport · 30-minute walkthrough</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <Inp ph="Your full name *" req v={state.name} on={(v) => setState({ ...state, name: v })} />
          <Inp ph="Phone (with +91) *" req v={state.phone} on={(v) => setState({ ...state, phone: v })} />
          <Inp ph="Email (optional)" v={state.email} on={(v) => setState({ ...state, email: v })} />
          <Inp ph="" type="date" v={state.date} on={(v) => setState({ ...state, date: v })} />
          <textarea placeholder="Anything we should know?" rows={3} value={state.notes} onChange={(e) => setState({ ...state, notes: e.target.value })} className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/50" />
          {error && <p className="text-red-300 text-sm">{error}</p>}
          <button type="submit" disabled={status === 'sending'} className="w-full rounded-lg px-6 py-4 font-bold inline-flex items-center justify-center gap-2" style={{ background: accent, color: primary }}>
            {status === 'sending' && <Loader2 className="h-5 w-5 animate-spin" />}{status === 'sending' ? 'Sending…' : 'Request Visit'}
          </button>
        </form>
      </div>
    </section>
  );
}
function Inp(p: { ph: string; req?: boolean; type?: string; v: string; on: (v: string) => void }) {
  return <input type={p.type ?? 'text'} placeholder={p.ph} required={p.req} value={p.v} onChange={(e) => p.on(e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/50" />;
}
