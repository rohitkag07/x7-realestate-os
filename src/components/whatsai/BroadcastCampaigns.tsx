'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, CalendarClock, Check, ChevronLeft, ChevronRight, FileText, Megaphone, MessageSquareReply, Plus, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Template = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: Array<{ type: string; text?: string }>;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  failed_count: number;
  scheduled_at: string | null;
  created_at: string;
  whatsapp_templates?: { name?: string; status?: string };
};

type Totals = { sent: number; delivered: number; read: number; replied: number; failed: number; delivery_rate: number; read_rate: number; reply_rate: number };

const defaultTotals: Totals = { sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, delivery_rate: 0, read_rate: 0, reply_rate: 0 };
const emptyDraft = {
  name: '',
  templateId: '',
  audienceType: 'all_contacts',
  stages: ['interested'] as string[],
  category: 'clinic',
  mappings: {} as Record<string, string>,
  delivery: 'now',
  scheduledAt: '',
};

export function BroadcastCampaigns() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totals, setTotals] = useState<Totals>(defaultTotals);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsai/broadcasts', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not load campaigns.');
      setTemplates(payload.templates ?? []);
      setCampaigns(payload.campaigns ?? []);
      setTotals(payload.totals ?? defaultTotals);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load campaigns.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e7fce3] px-3 py-1 text-xs font-semibold text-[#075e54]"><Megaphone className="h-3.5 w-3.5" />WhatsApp campaigns</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#111b21]">Reach the right customers, safely</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667781]">Send Meta-approved messages, personalize every contact, and follow delivery through reply.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/campaigns/templates"><FileText className="mr-2 h-4 w-4" />Manage templates</Link></Button>
          <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
            <DialogTrigger asChild><Button className="bg-[#008069] hover:bg-[#006b5a]"><Plus className="mr-2 h-4 w-4" />Create campaign</Button></DialogTrigger>
            <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><CampaignWizard templates={templates.filter((template) => template.status === 'APPROVED')} onDone={() => { setWizardOpen(false); void load(); }} /></DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Sent" value={totals.sent} detail={`${totals.failed} failed`} icon={Send} />
        <Metric label="Delivered" value={totals.delivered} detail={`${totals.delivery_rate}% delivery rate`} icon={Check} />
        <Metric label="Read" value={totals.read} detail={`${totals.read_rate}% read rate`} icon={BarChart3} />
        <Metric label="Replies" value={totals.replied} detail={`${totals.reply_rate}% reply rate`} icon={MessageSquareReply} />
      </div>

      <PerformanceChart totals={totals} />

      <Card className="border-[#d8dee4]">
        <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Recent campaigns</CardTitle><p className="mt-1 text-sm text-[#667781]">Live recipient-level delivery status from Meta webhooks.</p></div><Badge variant="outline">{campaigns.length}</Badge></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="h-48 animate-pulse bg-[#f0f2f5]" /> : campaigns.length ? (
            <div className="divide-y divide-[#edf0ef]">{campaigns.map((campaign) => <CampaignRow key={campaign.id} campaign={campaign} onRefresh={load} />)}</div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center"><Megaphone className="h-10 w-10 text-[#00a884]" /><h2 className="mt-3 font-semibold text-[#111b21]">Your first campaign starts with an approved template</h2><p className="mt-1 max-w-lg text-sm text-[#667781]">Sync Meta templates, choose an audience, map personal details, then schedule or send.</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignWizard({ templates, onDone }: { templates: Template[]; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const template = templates.find((item) => item.id === draft.templateId);
  const variables = useMemo(() => extractVariables(template), [template]);
  const patch = (values: Partial<typeof emptyDraft>) => setDraft((current) => ({ ...current, ...values }));
  const valid = step === 1 ? Boolean(draft.templateId && draft.name.trim()) : step === 2 ? draft.audienceType !== 'stage' || draft.stages.length > 0 : step === 3 ? variables.every((variable) => draft.mappings[String(variable)]) : draft.delivery === 'now' || Boolean(draft.scheduledAt);

  async function submit() {
    setSaving(true);
    try {
      const response = await fetch('/api/whatsai/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          template_id: draft.templateId,
          audience_type: draft.audienceType,
          audience_filter: draft.audienceType === 'stage' ? { stages: draft.stages } : draft.audienceType === 'category' ? { category: draft.category } : {},
          variable_mapping: draft.mappings,
          scheduled_at: draft.delivery === 'schedule' ? new Date(draft.scheduledAt).toISOString() : null,
          send_now: draft.delivery === 'now',
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Campaign creation failed.');
      toast.success(`${payload.recipient_count} recipients queued.`);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign creation failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader><DialogTitle>Create broadcast campaign</DialogTitle></DialogHeader>
      <div className="mt-2 grid grid-cols-4 gap-2">{['Template', 'Audience', 'Variables', 'Delivery'].map((label, index) => <div key={label}><div className={`h-1.5 rounded-full ${step >= index + 1 ? 'bg-[#00a884]' : 'bg-[#d8dee4]'}`} /><p className={`mt-2 text-[11px] font-medium ${step === index + 1 ? 'text-[#075e54]' : 'text-[#8696a0]'}`}>{index + 1}. {label}</p></div>)}</div>
      <div className="min-h-80 py-6">
        {step === 1 ? <StepTemplate templates={templates} draft={draft} patch={patch} /> : null}
        {step === 2 ? <StepAudience draft={draft} patch={patch} /> : null}
        {step === 3 ? <StepVariables variables={variables} draft={draft} patch={patch} /> : null}
        {step === 4 ? <StepDelivery draft={draft} patch={patch} template={template} /> : null}
      </div>
      <div className="flex items-center justify-between border-t border-[#edf0ef] pt-4"><Button variant="ghost" disabled={step === 1} onClick={() => setStep((value) => value - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>{step < 4 ? <Button className="bg-[#008069] hover:bg-[#006b5a]" disabled={!valid} onClick={() => setStep((value) => value + 1)}>Continue<ChevronRight className="ml-1 h-4 w-4" /></Button> : <Button className="bg-[#008069] hover:bg-[#006b5a]" disabled={!valid || saving} onClick={() => void submit()}>{draft.delivery === 'now' ? <Send className="mr-2 h-4 w-4" /> : <CalendarClock className="mr-2 h-4 w-4" />}{saving ? 'Creating...' : draft.delivery === 'now' ? 'Queue campaign' : 'Schedule campaign'}</Button>}</div>
    </>
  );
}

function StepTemplate({ templates, draft, patch }: WizardStepProps) {
  return <div className="space-y-5"><Field label="Campaign name"><Input value={draft.name} onChange={(event) => patch({ name: event.target.value })} placeholder="July appointment follow-up" /></Field><div><Label>Approved template</Label>{templates.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{templates.map((template) => <button type="button" key={template.id} onClick={() => patch({ templateId: template.id })} className={`rounded-2xl border p-4 text-left transition ${draft.templateId === template.id ? 'border-[#00a884] bg-[#f1fff2] ring-2 ring-[#00a884]/15' : 'border-[#d8dee4] hover:border-[#9fcfc2]'}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold text-[#111b21]">{template.name}</span><Badge className="bg-[#d9fdd3] text-[#075e54] hover:bg-[#d9fdd3]">Approved</Badge></div><p className="mt-2 line-clamp-3 text-xs leading-5 text-[#667781]">{template.components.find((component) => component.type === 'BODY')?.text}</p></button>)}</div> : <div className="mt-3 rounded-2xl border border-dashed p-6 text-center text-sm text-[#667781]">No approved templates. <Link href="/campaigns/templates" className="font-semibold text-[#008069]">Sync with Meta</Link>.</div>}</div></div>;
}

function StepAudience({ draft, patch }: Omit<WizardStepProps, 'templates'>) {
  return <div className="space-y-5"><Field label="Who should receive this?"><Select value={draft.audienceType} onValueChange={(audienceType) => patch({ audienceType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_contacts">All contacts</SelectItem><SelectItem value="stage">Lead stage</SelectItem><SelectItem value="category">Business category</SelectItem></SelectContent></Select></Field>{draft.audienceType === 'stage' ? <div><Label>Lead stages</Label><div className="mt-3 flex flex-wrap gap-2">{['new', 'interested', 'negotiating', 'booked', 'cold'].map((stage) => <button type="button" key={stage} onClick={() => patch({ stages: draft.stages.includes(stage) ? draft.stages.filter((item) => item !== stage) : [...draft.stages, stage] })} className={`rounded-full border px-3 py-2 text-sm capitalize ${draft.stages.includes(stage) ? 'border-[#00a884] bg-[#e7fce3] text-[#075e54]' : 'border-[#d8dee4] text-[#667781]'}`}>{stage}</button>)}</div></div> : null}{draft.audienceType === 'category' ? <Field label="Category"><Select value={draft.category} onValueChange={(category) => patch({ category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['clinic', 'gym', 'real_estate', 'coaching', 'local_service'].map((category) => <SelectItem key={category} value={category}>{category.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></Field> : null}<div className="rounded-2xl bg-[#fff8e7] p-4 text-sm text-[#784f00]">Only opted-in contacts should receive marketing templates. Start with a small test audience before sending to all contacts.</div></div>;
}

function StepVariables({ variables, draft, patch }: { variables: number[] } & Omit<WizardStepProps, 'templates'>) {
  return <div className="space-y-4"><div><h3 className="font-semibold text-[#111b21]">Personalize template variables</h3><p className="mt-1 text-sm text-[#667781]">Map each numbered placeholder to contact or business data.</p></div>{variables.length ? variables.map((variable) => <div key={variable} className="grid items-center gap-3 rounded-2xl border border-[#d8dee4] p-4 sm:grid-cols-[100px_minmax(0,1fr)]"><Badge variant="outline" className="w-fit">{`{{${variable}}}`}</Badge><Select value={draft.mappings[String(variable)] || ''} onValueChange={(value) => patch({ mappings: { ...draft.mappings, [String(variable)]: value } })}><SelectTrigger><SelectValue placeholder="Choose a value" /></SelectTrigger><SelectContent><SelectItem value="contact_name">Contact name</SelectItem><SelectItem value="business_name">Business name</SelectItem><SelectItem value="phone">Phone number</SelectItem></SelectContent></Select></div>) : <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-[#667781]">This template has no variables. Continue to delivery.</div>}</div>;
}

function StepDelivery({ draft, patch, template }: Omit<WizardStepProps, 'templates'> & { template?: Template }) {
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{[{ id: 'now', title: 'Send now', detail: 'Queue immediately at 20 messages per second.', icon: Send }, { id: 'schedule', title: 'Schedule', detail: 'Choose a future date and time.', icon: CalendarClock }].map((option) => <button type="button" key={option.id} onClick={() => patch({ delivery: option.id })} className={`rounded-2xl border p-4 text-left ${draft.delivery === option.id ? 'border-[#00a884] bg-[#f1fff2]' : 'border-[#d8dee4]'}`}><option.icon className="h-5 w-5 text-[#00a884]" /><div className="mt-3 font-semibold text-[#111b21]">{option.title}</div><p className="mt-1 text-xs leading-5 text-[#667781]">{option.detail}</p></button>)}</div>{draft.delivery === 'schedule' ? <Field label="Send at"><Input type="datetime-local" value={draft.scheduledAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => patch({ scheduledAt: event.target.value })} /></Field> : null}<div className="rounded-2xl bg-[#efeae2] p-4"><div className="ml-auto max-w-sm rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-sm leading-5 shadow-sm">{template?.components.find((component) => component.type === 'BODY')?.text || 'Select an approved template.'}</div></div></div>;
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof Send }) {
  return <Card className="border-[#d8dee4]"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-[#667781]">{label}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#111b21]">{value.toLocaleString('en-IN')}</p></div><div className="rounded-xl bg-[#e7fce3] p-2 text-[#008069]"><Icon className="h-5 w-5" /></div></div><p className="mt-3 text-xs text-[#667781]">{detail}</p></CardContent></Card>;
}

function PerformanceChart({ totals }: { totals: Totals }) {
  const max = Math.max(totals.sent, 1);
  const bars = [{ label: 'Sent', value: totals.sent, color: '#008069' }, { label: 'Delivered', value: totals.delivered, color: '#25d366' }, { label: 'Read', value: totals.read, color: '#53bdeb' }, { label: 'Replied', value: totals.replied, color: '#f59e0b' }];
  return <Card className="border-[#d8dee4]"><CardHeader><CardTitle className="text-base">Campaign performance</CardTitle></CardHeader><CardContent className="space-y-4">{bars.map((bar) => <div key={bar.label} className="grid grid-cols-[75px_minmax(0,1fr)_55px] items-center gap-3"><span className="text-xs font-medium text-[#667781]">{bar.label}</span><div className="h-3 overflow-hidden rounded-full bg-[#edf0ef]"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max((bar.value / max) * 100, bar.value ? 3 : 0)}%`, backgroundColor: bar.color }} /></div><span className="text-right text-sm font-semibold text-[#111b21]">{bar.value}</span></div>)}</CardContent></Card>;
}

function CampaignRow({ campaign, onRefresh }: { campaign: Campaign; onRefresh: () => Promise<void> }) {
  const [running, setRunning] = useState(false);
  async function run() { setRunning(true); try { const response = await fetch(`/api/whatsai/broadcasts/${campaign.id}/run`, { method: 'POST' }); const payload = await response.json(); if (!response.ok || !payload.ok) throw new Error(payload.error || 'Campaign dispatch failed.'); toast.success('Campaign worker started.'); await onRefresh(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Campaign dispatch failed.'); } finally { setRunning(false); } }
  return <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#111b21]">{campaign.name}</h3><Badge variant="outline" className="capitalize">{campaign.status}</Badge></div><p className="mt-1 text-xs text-[#667781]">{campaign.whatsapp_templates?.name || 'Template'} · {campaign.total_recipients} recipients · {new Date(campaign.created_at).toLocaleDateString('en-IN')}</p></div><div className="flex flex-wrap items-center gap-4 text-xs text-[#667781]"><span><strong className="text-[#111b21]">{campaign.sent_count}</strong> sent</span><span><strong className="text-[#111b21]">{campaign.read_count}</strong> read</span><span><strong className="text-[#111b21]">{campaign.replied_count}</strong> replied</span>{['draft', 'scheduled', 'queued', 'processing', 'failed'].includes(campaign.status) ? <Button size="sm" variant="outline" disabled={running} onClick={() => void run()}>{running ? 'Starting...' : 'Run now'}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Button> : null}</div></div>;
}

type WizardStepProps = { templates: Template[]; draft: typeof emptyDraft; patch: (values: Partial<typeof emptyDraft>) => void };
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function extractVariables(template?: Template) { if (!template) return []; const values = new Set<number>(); template.components.forEach((component) => { for (const match of component.text?.matchAll(/\{\{(\d+)\}\}/g) ?? []) values.add(Number(match[1])); }); return [...values].sort((left, right) => left - right); }
