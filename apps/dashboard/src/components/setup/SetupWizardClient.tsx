'use client';

import { useState, useTransition } from 'react';
import { Plus, Rocket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Faq = { question: string; answer: string };
type SetupState = {
  businessName: string; category: string; city: string; ownerName: string; ownerPhone: string;
  whatsappNumber: string; hoursStart: string; hoursEnd: string; welcomeMessage: string;
  serviceInput: string; services: string[]; pricingRange: string; faqs: Faq[];
};

const initial: SetupState = {
  businessName: '', category: 'clinic', city: 'Indore', ownerName: '', ownerPhone: '',
  whatsappNumber: '', hoursStart: '10:00', hoursEnd: '19:00',
  welcomeMessage: 'Namaste! WhatsAI Assistant se baat kar rahe hain. Main aapki help karta hoon.',
  serviceInput: '', services: ['Consultation'], pricingRange: '', faqs: [{ question: '', answer: '' }],
};
const steps = ['Business Basics', 'WhatsApp Setup', 'Services / FAQs', 'Confirm & Launch'];
const categories = ['real_estate', 'clinic', 'coaching', 'gym', 'local_service'];

export function SetupWizardClient() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function patch(data: Partial<SetupState>) {
    setForm((current) => ({ ...current, ...data }));
  }
  function addService() {
    const value = form.serviceInput.trim();
    if (!value) return;
    patch({ services: [...form.services, value], serviceInput: '' });
  }
  function updateFaq(index: number, data: Partial<Faq>) {
    patch({ faqs: form.faqs.map((faq, i) => i === index ? { ...faq, ...data } : faq) });
  }
  function launch() {
    startTransition(async () => {
      const response = await fetch('/api/setup/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error ?? 'Setup failed');
        return;
      }
      toast.success('Trial launched and checklist seeded.');
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 md:grid-cols-4">
        {steps.map((label, index) => <StepTab key={label} label={label} active={step === index} done={step > index} />)}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{steps[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && <BasicsStep form={form} patch={patch} />}
          {step === 1 && <WhatsAppStep form={form} patch={patch} />}
          {step === 2 && <ServicesStep form={form} patch={patch} addService={addService} updateFaq={updateFaq} />}
          {step === 3 && <ConfirmStep form={form} />}
          <div className="flex justify-between border-t pt-4">
            <Button variant="outline" disabled={step === 0 || pending} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
            ) : (
              <Button onClick={launch} disabled={pending}><Rocket className="mr-2 h-4 w-4" /> {pending ? 'Launching...' : 'Launch Trial'}</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StepTab({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return <div className={cn('rounded-lg border p-3 text-sm', active && 'border-primary bg-primary/5', done && 'bg-emerald-50 text-emerald-800')}>{label}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function BasicsStep({ form, patch }: { form: SetupState; patch: (data: Partial<SetupState>) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Business Name"><Input value={form.businessName} onChange={(e) => patch({ businessName: e.target.value })} /></Field>
      <Field label="Category"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(e) => patch({ category: e.target.value })}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
      <Field label="City"><Input value={form.city} onChange={(e) => patch({ city: e.target.value })} /></Field>
      <Field label="Owner Name"><Input value={form.ownerName} onChange={(e) => patch({ ownerName: e.target.value })} /></Field>
      <Field label="Owner Phone"><Input value={form.ownerPhone} onChange={(e) => patch({ ownerPhone: e.target.value })} /></Field>
    </div>
  );
}
function WhatsAppStep({ form, patch }: { form: SetupState; patch: (data: Partial<SetupState>) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="WhatsApp Business Number"><Input value={form.whatsappNumber} onChange={(e) => patch({ whatsappNumber: e.target.value })} /></Field>
      <Field label="Start Time"><Input type="time" value={form.hoursStart} onChange={(e) => patch({ hoursStart: e.target.value })} /></Field>
      <Field label="End Time"><Input type="time" value={form.hoursEnd} onChange={(e) => patch({ hoursEnd: e.target.value })} /></Field>
      <div className="md:col-span-2"><Field label="Welcome Message"><Textarea value={form.welcomeMessage} onChange={(e) => patch({ welcomeMessage: e.target.value })} /></Field></div>
    </div>
  );
}
function ServicesStep({ form, patch, addService, updateFaq }: { form: SetupState; patch: (data: Partial<SetupState>) => void; addService: () => void; updateFaq: (index: number, data: Partial<Faq>) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex gap-2"><Input value={form.serviceInput} onChange={(e) => patch({ serviceInput: e.target.value })} placeholder="Add service/product" /><Button type="button" onClick={addService}><Plus className="h-4 w-4" /></Button></div>
      <div className="flex flex-wrap gap-2">{form.services.map((s) => <button key={s} className="rounded-full border px-3 py-1 text-xs" onClick={() => patch({ services: form.services.filter((x) => x !== s) })}>{s} x</button>)}</div>
      <Field label="Pricing Range"><Input value={form.pricingRange} onChange={(e) => patch({ pricingRange: e.target.value })} /></Field>
      {form.faqs.map((faq, index) => (
        <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_40px]">
          <Input value={faq.question} onChange={(e) => updateFaq(index, { question: e.target.value })} placeholder="FAQ question" />
          <Input value={faq.answer} onChange={(e) => updateFaq(index, { answer: e.target.value })} placeholder="FAQ answer" />
          <Button type="button" variant="ghost" size="icon" onClick={() => patch({ faqs: form.faqs.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => patch({ faqs: [...form.faqs, { question: '', answer: '' }] })}>Add FAQ</Button>
    </div>
  );
}
function ConfirmStep({ form }: { form: SetupState }) {
  return (
    <div className="grid gap-3 text-sm md:grid-cols-2">
      {Object.entries({ Business: form.businessName, Category: form.category, City: form.city, Owner: `${form.ownerName} · ${form.ownerPhone}`, WhatsApp: form.whatsappNumber, Hours: `Mon-Sun ${form.hoursStart}-${form.hoursEnd}`, Pricing: form.pricingRange, Services: form.services.join(', ') || 'None' }).map(([k, v]) => (
        <div key={k} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-medium">{v}</p></div>
      ))}
    </div>
  );
}
