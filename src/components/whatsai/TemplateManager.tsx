'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, FileWarning, Plus, RefreshCw, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Template = {
  id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY';
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  components: Array<{ type: string; text?: string; format?: string; buttons?: Array<{ type: string; text: string }> }>;
  quality_score?: string | null;
  rejection_reason?: string | null;
  last_synced_at?: string | null;
};

const emptyForm = {
  name: '',
  language: 'en_US',
  category: 'UTILITY' as const,
  headerType: 'NONE',
  headerText: '',
  headerMediaHandle: '',
  body: '',
  footer: '',
  buttons: [] as Array<{ type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL'; text: string; value: string }>,
};

export function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { void loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsai/templates', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not load templates.');
      setTemplates(payload.templates ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load templates.');
    } finally {
      setLoading(false);
    }
  }

  async function syncTemplates() {
    setSyncing(true);
    try {
      const response = await fetch('/api/whatsai/templates/sync', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Meta sync failed.');
      toast.success(`${payload.synced} Meta template${payload.synced === 1 ? '' : 's'} synced.`);
      await loadTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Meta sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  async function createTemplate() {
    setSaving(true);
    try {
      const components = buildComponents(form);
      const response = await fetch('/api/whatsai/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          language: form.language,
          category: form.category,
          components,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(readError(payload.error));
      toast.success('Template submitted to Meta for review.');
      setOpen(false);
      setForm(emptyForm);
      await loadTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Template creation failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm font-medium text-[#008069] hover:underline"><ArrowLeft className="h-4 w-4" />Campaigns</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#111b21]">WhatsApp templates</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667781]">Create Meta-approved messages for outbound campaigns. Approval status is synced directly from your WhatsApp Business Account.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void syncTemplates()} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />Sync with Meta
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-[#008069] hover:bg-[#006b5a]"><Plus className="mr-2 h-4 w-4" />Create template</Button></DialogTrigger>
            <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
              <DialogHeader><DialogTitle>Create WhatsApp template</DialogTitle></DialogHeader>
              <TemplateForm form={form} setForm={setForm} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-[#008069] hover:bg-[#006b5a]" disabled={saving || !form.name || !form.body} onClick={() => void createTemplate()}>
                  <Send className="mr-2 h-4 w-4" />{saving ? 'Submitting...' : 'Submit to Meta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl bg-[#e9eeec]" />)}</div>
      ) : templates.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((template) => <TemplateCard key={template.id} template={template} />)}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <FileWarning className="h-10 w-10 text-[#00a884]" />
            <h2 className="mt-4 text-lg font-semibold text-[#111b21]">No templates synced yet</h2>
            <p className="mt-2 max-w-md text-sm text-[#667781]">Sync existing Meta templates or submit your first message for approval.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TemplateForm({ form, setForm }: { form: typeof emptyForm; setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>> }) {
  const patch = (values: Partial<typeof emptyForm>) => setForm((current) => ({ ...current, ...values }));
  const updateButton = (index: number, values: Partial<(typeof emptyForm.buttons)[number]>) => patch({ buttons: form.buttons.map((button, buttonIndex) => buttonIndex === index ? { ...button, ...values } : button) });
  return (
    <div className="space-y-5 py-2">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Template name"><Input value={form.name} onChange={(event) => patch({ name: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="appointment_reminder" /></Field>
        <Field label="Language"><Select value={form.language} onValueChange={(language) => patch({ language })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en_US">English (US)</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent></Select></Field>
        <Field label="Category"><Select value={form.category} onValueChange={(category) => patch({ category: category as typeof form.category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UTILITY">Utility</SelectItem><SelectItem value="MARKETING">Marketing</SelectItem></SelectContent></Select></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <Field label="Header type"><Select value={form.headerType} onValueChange={(headerType) => patch({ headerType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">No header</SelectItem><SelectItem value="TEXT">Text</SelectItem><SelectItem value="IMAGE">Image</SelectItem><SelectItem value="VIDEO">Video</SelectItem><SelectItem value="DOCUMENT">Document</SelectItem></SelectContent></Select></Field>
        {form.headerType === 'TEXT' ? <Field label="Header text"><Input value={form.headerText} maxLength={60} onChange={(event) => patch({ headerText: event.target.value })} placeholder="Appointment confirmed" /></Field> : form.headerType !== 'NONE' ? <Field label="Meta sample media handle"><Input value={form.headerMediaHandle} onChange={(event) => patch({ headerMediaHandle: event.target.value })} placeholder="Paste the uploaded sample handle from Meta" /></Field> : null}
      </div>
      <Field label="Message body"><Textarea rows={6} value={form.body} onChange={(event) => patch({ body: event.target.value })} placeholder="Hi {{1}}, your appointment with {{2}} is confirmed." /><p className="text-xs text-[#667781]">Use numbered variables such as {'{{1}}'} and {'{{2}}'}.</p></Field>
      <Field label="Footer (optional)"><Input value={form.footer} maxLength={60} onChange={(event) => patch({ footer: event.target.value })} placeholder="Reply STOP to opt out" /></Field>
      <div className="rounded-2xl border border-[#d8dee4] bg-[#f8faf9] p-4">
        <div className="flex items-center justify-between gap-3"><div><Label>Buttons</Label><p className="mt-1 text-xs text-[#667781]">Up to 3 quick replies, phone calls, or links.</p></div><Button variant="outline" size="sm" disabled={form.buttons.length >= 3} onClick={() => patch({ buttons: [...form.buttons, { type: 'QUICK_REPLY', text: '', value: '' }] })}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button></div>
        <div className="mt-3 space-y-3">{form.buttons.map((button, index) => <div key={index} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_36px]"><Select value={button.type} onValueChange={(type) => updateButton(index, { type: type as typeof button.type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="QUICK_REPLY">Quick reply</SelectItem><SelectItem value="PHONE_NUMBER">Call</SelectItem><SelectItem value="URL">Website</SelectItem></SelectContent></Select><Input value={button.text} onChange={(event) => updateButton(index, { text: event.target.value })} placeholder="Button label" />{button.type === 'QUICK_REPLY' ? <div /> : <Input value={button.value} onChange={(event) => updateButton(index, { value: event.target.value })} placeholder={button.type === 'URL' ? 'https://...' : '+91...'} />}<Button variant="ghost" size="icon" onClick={() => patch({ buttons: form.buttons.filter((_, buttonIndex) => buttonIndex !== index) })}><XCircle className="h-4 w-4 text-red-500" /></Button></div>)}</div>
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const body = template.components.find((component) => component.type === 'BODY')?.text || 'No body preview';
  const status = statusStyle(template.status);
  const StatusIcon = status.icon;
  return (
    <Card className="overflow-hidden border-[#d8dee4]">
      <CardHeader className="flex-row items-start justify-between gap-4 border-b border-[#edf0ef] bg-[#fbfcfc]">
        <div><CardTitle className="text-base">{template.name}</CardTitle><p className="mt-1 text-xs text-[#667781]">{template.language} · {template.category}</p></div>
        <Badge className={status.className}><StatusIcon className="mr-1 h-3 w-3" />{template.status}</Badge>
      </CardHeader>
      <CardContent className="p-5">
        <div className="rounded-2xl bg-[#efeae2] p-3"><div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm leading-5 shadow-sm">{body}</div></div>
        {template.rejection_reason ? <p className="mt-3 text-xs font-medium text-red-600">{template.rejection_reason}</p> : null}
        <div className="mt-4 flex items-center justify-between text-xs text-[#667781]"><span>Quality: {template.quality_score || 'Not rated'}</span><span>{template.last_synced_at ? `Synced ${new Date(template.last_synced_at).toLocaleDateString('en-IN')}` : 'Not synced'}</span></div>
      </CardContent>
    </Card>
  );
}

function buildComponents(form: typeof emptyForm) {
  const components: Array<Record<string, unknown>> = [];
  if (form.headerType === 'TEXT' && form.headerText.trim()) components.push({ type: 'HEADER', format: 'TEXT', text: form.headerText.trim() });
  if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(form.headerType)) components.push({ type: 'HEADER', format: form.headerType, ...(form.headerMediaHandle ? { example: { header_handle: [form.headerMediaHandle] } } : {}) });
  const variableCount = Math.max(0, ...[...form.body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1])));
  components.push({ type: 'BODY', text: form.body.trim(), ...(variableCount ? { example: { body_text: [Array.from({ length: variableCount }, (_, index) => `Example ${index + 1}`)] } } : {}) });
  if (form.footer.trim()) components.push({ type: 'FOOTER', text: form.footer.trim() });
  if (form.buttons.length) components.push({ type: 'BUTTONS', buttons: form.buttons.map((button) => button.type === 'URL' ? { type: button.type, text: button.text, url: button.value } : button.type === 'PHONE_NUMBER' ? { type: button.type, text: button.text, phone_number: button.value } : { type: button.type, text: button.text }) });
  return components;
}

function statusStyle(status: Template['status']) {
  if (status === 'APPROVED') return { icon: CheckCircle2, className: 'bg-[#d9fdd3] text-[#075e54] hover:bg-[#d9fdd3]' };
  if (status === 'REJECTED') return { icon: XCircle, className: 'bg-red-100 text-red-700 hover:bg-red-100' };
  return { icon: Clock3, className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function readError(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'formErrors' in error) return 'Review the template fields and try again.';
  return 'Template creation failed.';
}
