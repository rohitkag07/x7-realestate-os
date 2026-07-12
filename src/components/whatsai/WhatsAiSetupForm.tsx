'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  MessageCircle,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { KeywordReplyEditor } from '@/components/whatsai/KeywordReplyEditor';
import { keywordRepliesSchema, fallbackReplySchema } from '@/lib/keyword-reply-schema';
import { getStarterKeywordRules } from '@/lib/starter-keyword-rules';
import type { BusinessCategory, KeywordReplyRule } from '@/types/database';

type WizardForm = {
  name: string;
  category: BusinessCategory;
  city: string;
  owner_name: string;
  owner_whatsapp: string;
  core_offer: string;
  phone_number_id: string;
  business_account_id: string;
  verify_token: string;
  qualification_questions_text: string;
  keyword_replies: KeywordReplyRule[];
  fallback_reply: string;
};

const storageKey = 'whatsai-setup-wizard-v2';
const realEstateStarter = getStarterKeywordRules('real_estate');

const defaults: WizardForm = {
  name: 'Shree Krishna Developers',
  category: 'real_estate',
  city: 'Indore',
  owner_name: 'Rohit',
  owner_whatsapp: '',
  core_offer: 'Premium plotted development near Super Corridor, Indore with site-visit booking and owner handoff for hot buyers.',
  phone_number_id: '',
  business_account_id: '',
  verify_token: 'x7-whatsapp-test-2026',
  qualification_questions_text: 'Budget range?\nPreferred location?\nTimeline for purchase?\nSite visit preferred date/time?\nLoan required?',
  keyword_replies: realEstateStarter.rules,
  fallback_reply: realEstateStarter.fallback,
};

const steps = [
  {
    id: 'profile',
    title: 'Business Profile',
    subtitle: 'Who this assistant works for',
    icon: Store,
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Connection',
    subtitle: 'Meta channel and webhook details',
    icon: MessageCircle,
  },
  {
    id: 'playbook',
    title: 'Keywords & Replies',
    subtitle: 'Approve every automated response',
    icon: Bot,
  },
  {
    id: 'readiness',
    title: 'Readiness & Test',
    subtitle: 'Activate and test the assistant',
    icon: ShieldCheck,
  },
] as const;

export function WhatsAiSetupForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(defaults);
  const [saved, setSaved] = useState(false);
  const [setupResult, setSetupResult] = useState<{ businessId?: string; playbookId?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setForm({ ...defaults, ...JSON.parse(raw) });
    } catch {
      // Local storage is a convenience only; setup still works without it.
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(form));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [form]);

  const errors = useMemo(() => validateStep(step, form), [step, form]);
  const progress = Math.round(((step + 1) / steps.length) * 100);

  function update<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function next() {
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function back() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function submit() {
    const allErrors = steps.flatMap((_, index) => validateStep(index, form));
    if (allErrors.length) {
      toast.error(allErrors[0]);
      return;
    }

    startTransition(async () => {
      const response = await fetch('/api/whatsai/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          qualification_questions: parseQuestions(form.qualification_questions_text),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error?.formErrors?.[0] || payload?.error || 'Setup failed');
        return;
      }

      setSetupResult({ businessId: payload.business?.id, playbookId: payload.playbook?.id });
      setStep(3);
      toast.success('WhatsAI setup completed.');
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="overflow-hidden border-[#d8dee4] bg-white shadow-sm">
        <CardHeader className="bg-[#075e54] text-white">
          <Badge className="w-fit bg-[#d9fdd3] text-[#075e54] hover:bg-[#d9fdd3]">Guided setup</Badge>
          <CardTitle className="mt-3 text-xl">WhatsAI Onboarding</CardTitle>
          <CardDescription className="text-white/80">
            Four simple steps: business profile, WhatsApp connection, playbook, and first test.
          </CardDescription>
          <div className="pt-2">
            <Progress value={progress} className="h-2 bg-white/15" />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
              <span>Step {step + 1} of {steps.length}</span>
              <span>{saved ? 'Saved locally' : 'Autosaves on this device'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = index === step;
            const complete = index < step || (index === 3 && Boolean(setupResult));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  'w-full rounded-2xl border p-3 text-left transition duration-200',
                  active ? 'border-[#00a884] bg-[#e7fce3] shadow-sm' : 'border-transparent hover:bg-[#f0f2f5]',
                )}
              >
                <div className="flex gap-3">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', complete ? 'bg-[#00a884] text-white' : active ? 'bg-[#d9fdd3] text-[#075e54]' : 'bg-muted text-muted-foreground')}>
                    {complete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[#d8dee4] bg-white shadow-sm">
        <CardHeader className="border-b bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-5 w-5 text-[#00a884]" />
                {steps[step].title}
              </CardTitle>
              <CardDescription className="mt-1">{steps[step].subtitle}</CardDescription>
            </div>
            <Badge variant={errors.length ? 'warning' : 'success'}>{errors.length ? 'Needs input' : 'Ready'}</Badge>
          </div>
        </CardHeader>

        <CardContent className="min-h-[560px] p-6">
          <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {step === 0 ? <BusinessProfileStep form={form} update={update} /> : null}
            {step === 1 ? <WhatsAppStep form={form} update={update} /> : null}
            {step === 2 ? <PlaybookStep form={form} update={update} setupResult={setupResult} /> : null}
            {step === 3 ? <ReadinessStep form={form} setupResult={setupResult} pending={pending} onSubmit={submit} /> : null}
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={back} disabled={step === 0 || pending}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              {step < steps.length - 1 ? (
                <Button onClick={next} disabled={pending}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={pending || Boolean(setupResult)}>
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {setupResult ? 'Setup Complete' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessProfileStep({ form, update }: StepProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="Business name" helper="Customer-facing brand name.">
        <Input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Shree Krishna Developers" />
      </Field>
      <Field label="Industry" helper="Helps the assistant ask the right questions.">
        <Select value={form.category} onValueChange={(value) => {
          const category = value as BusinessCategory;
          const starter = getStarterKeywordRules(category);
          update('category', category);
          update('keyword_replies', starter.rules);
          update('fallback_reply', starter.fallback);
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="real_estate">Real estate</SelectItem>
            <SelectItem value="clinic">Clinic</SelectItem>
            <SelectItem value="coaching">Coaching</SelectItem>
            <SelectItem value="gym">Gym / dietitian</SelectItem>
            <SelectItem value="local_service">Local service</SelectItem>
            <SelectItem value="other">Salon, spa, or other</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="City" helper="Used for local tone and appointment context.">
        <Input value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="Indore" />
      </Field>
      <Field label="Owner name" helper="Used when a chat needs human attention.">
        <Input value={form.owner_name} onChange={(event) => update('owner_name', event.target.value)} placeholder="Owner name" />
      </Field>
      <Field label="Owner WhatsApp" helper="Where test messages and owner alerts should go.">
        <Input value={form.owner_whatsapp} onChange={(event) => update('owner_whatsapp', event.target.value)} placeholder="+91..." />
      </Field>
      <Field label="Core offer" helper="What the AI should sell or book.">
        <Textarea value={form.core_offer} onChange={(event) => update('core_offer', event.target.value)} rows={4} />
      </Field>
    </div>
  );
}

function WhatsAppStep({ form, update }: StepProps) {
  const webhookUrl = typeof window === 'undefined' ? '/api/webhooks/whatsapp' : `${window.location.origin}/api/webhooks/whatsapp`;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-5 md:grid-cols-2">
      <Field label="Phone Number ID" helper="Copy this from Meta WhatsApp setup.">
          <Input value={form.phone_number_id} onChange={(event) => update('phone_number_id', event.target.value)} placeholder="1134264326444844" />
        </Field>
      <Field label="WABA ID" helper="Your WhatsApp Business Account ID from Meta.">
          <Input value={form.business_account_id} onChange={(event) => update('business_account_id', event.target.value)} placeholder="1549321680140663" />
        </Field>
        <Field label="Webhook verify token" helper="Must match Meta webhook verification token.">
          <Input value={form.verify_token} onChange={(event) => update('verify_token', event.target.value)} placeholder="x7-whatsapp-test-2026" />
        </Field>
        <Field label="Webhook callback URL" helper="Paste this into Meta webhook settings.">
          <Input value={webhookUrl} readOnly />
        </Field>
      </div>
      <div className="rounded-3xl border border-[#d8dee4] bg-[#f0f2f5] p-5">
        <MessageCircle className="h-8 w-8 text-[#00a884]" />
        <h3 className="mt-4 font-semibold">Connection checklist</h3>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <ChecklistItem done={Boolean(form.phone_number_id)} label="Phone Number ID entered" />
          <ChecklistItem done={Boolean(form.business_account_id)} label="WABA ID entered" />
          <ChecklistItem done={Boolean(form.verify_token)} label="Verify token ready" />
          <ChecklistItem done label="Webhook route exists" />
        </div>
      </div>
    </div>
  );
}

function PlaybookStep({ form, update, setupResult }: StepProps & { setupResult: { businessId?: string; playbookId?: string } | null }) {
  return (
    <div className="grid gap-5">
      <KeywordReplyEditor rules={form.keyword_replies} fallbackReply={form.fallback_reply} businessId={setupResult?.businessId} playbookId={setupResult?.playbookId} onRulesChange={(rules) => update('keyword_replies', rules)} onFallbackReplyChange={(value) => update('fallback_reply', value)} />
      <Field label="Owner follow-up checklist" helper="One item per line. These are saved for the owner to use after WhatsAI hands over an unmatched inquiry.">
        <Textarea value={form.qualification_questions_text} onChange={(event) => update('qualification_questions_text', event.target.value)} rows={5} />
      </Field>
    </div>
  );
}

function ReadinessStep({ form, setupResult, pending, onSubmit }: { form: WizardForm; setupResult: { businessId?: string; playbookId?: string } | null; pending: boolean; onSubmit: () => void }) {
  const testText = encodeURIComponent(`Hi, I want to know about ${form.name}.`);
  const testHref = `https://wa.me/${normalizeOutboundPhone(form.owner_whatsapp)}?text=${testText}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-3xl border border-[#d8dee4] bg-gradient-to-br from-[#e7fce3] to-white p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00a884] text-white">
          {setupResult ? <CheckCircle2 className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
        </div>
        <h3 className="mt-5 text-2xl font-semibold">{setupResult ? 'Assistant is active' : 'Ready to activate'}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {setupResult
            ? 'Business, WhatsApp channel, and exact-reply playbook are saved in Supabase.'
            : 'Review the summary, then complete setup to create tenant records and activate the first playbook.'}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <SummaryTile label="Business" value={form.name} />
          <SummaryTile label="Industry" value={form.category.replace('_', ' ')} />
          <SummaryTile label="Owner WhatsApp" value={form.owner_whatsapp || 'Missing'} />
          <SummaryTile label="Auto-replies" value={`${form.keyword_replies.filter((rule) => rule.enabled).length} active`} />
        </div>
        {setupResult ? (
          <div className="mt-5 rounded-2xl border bg-white p-4 text-xs text-muted-foreground">
            <div>Business ID: {setupResult.businessId ?? 'created'}</div>
            <div>Playbook ID: {setupResult.playbookId ?? 'created'}</div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border bg-[#075e54] p-5 text-white">
        <QrCode className="h-9 w-9 text-[#d9fdd3]" />
        <h3 className="mt-4 font-semibold">First test message</h3>
        <p className="mt-2 text-sm text-slate-300">
            After setup, send a WhatsApp test inquiry and verify it appears in Chats.
        </p>
        <Button className="mt-5 w-full" variant="secondary" asChild disabled={!form.owner_whatsapp || pending}>
          <a href={testHref} target="_blank" rel="noreferrer">
            <Send className="mr-2 h-4 w-4" />
            Send first test
          </a>
        </Button>
        {!setupResult ? (
          <Button className="mt-3 w-full" onClick={onSubmit} disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Complete Setup
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type StepProps = {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
};

function Field({ label, helper, children }: { label: string; helper: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function ChecklistItem({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={done ? 'text-emerald-600' : 'text-muted-foreground'}>{done ? '✓' : '○'}</span>
      <span className={done ? 'font-medium text-slate-900' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-semibold">{value}</div>
    </div>
  );
}

function validateStep(step: number, form: WizardForm) {
  const errors: string[] = [];
  if (step === 0) {
    if (form.name.trim().length < 2) errors.push('Business name is required.');
    if (form.owner_whatsapp.replace(/\D/g, '').length < 10) errors.push('Valid owner WhatsApp number is required.');
    if (form.core_offer.trim().length < 5) errors.push('Core offer is required.');
  }
  if (step === 1) {
    if (!form.verify_token.trim()) errors.push('Webhook verify token is required.');
  }
  if (step === 2) {
    const rules = keywordRepliesSchema.safeParse(form.keyword_replies);
    if (!rules.success) errors.push(rules.error.issues[0]?.message ?? 'Check your keyword replies.');
    if (!form.keyword_replies.some((rule) => rule.enabled)) errors.push('Add at least one active keyword reply.');
    const fallback = fallbackReplySchema.safeParse(form.fallback_reply);
    if (!fallback.success) errors.push('Fallback reply is required.');
  }
  return errors;
}

function parseQuestions(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeOutboundPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91')) return digits;
  return digits;
}
