'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const defaults = {
  name: 'Shree Krishna Developers',
  category: 'real_estate',
  city: 'Indore',
  owner_name: 'Rohit',
  owner_whatsapp: '',
  phone_number_id: '',
  goal: 'Convert WhatsApp inquiries into qualified site visits and hand hot leads to the owner quickly.',
  knowledge: 'Krishna Greens is a plotted development near Super Corridor, Indore. Buyers usually ask about budget, plot size, location, RERA, loan support, and site visit slots.',
};

export function WhatsAiSetupForm() {
  const [form, setForm] = useState(defaults);
  const [pending, startTransition] = useTransition();

  function update(key: keyof typeof defaults, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const response = await fetch('/api/whatsai/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error?.formErrors?.[0] || payload?.error || 'Setup failed');
        return;
      }
      toast.success('WhatsAI business + playbook setup saved.');
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Business Setup</CardTitle>
          <CardDescription>
            Trial business ko WhatsAI assistant ke generic business/playbook layer me register karo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={form.name} onChange={(event) => update('name', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vertical</Label>
            <Select value={form.category} onValueChange={(value) => update('category', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="real_estate">Real estate</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="coaching">Coaching</SelectItem>
                <SelectItem value="gym">Gym / dietitian</SelectItem>
                <SelectItem value="local_service">Local service</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(event) => update('city', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Owner name</Label>
            <Input value={form.owner_name} onChange={(event) => update('owner_name', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Owner WhatsApp</Label>
            <Input value={form.owner_whatsapp} onChange={(event) => update('owner_whatsapp', event.target.value)} placeholder="+91..." />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp phone number ID</Label>
            <Input value={form.phone_number_id} onChange={(event) => update('phone_number_id', event.target.value)} placeholder="Optional; env fallback works" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Assistant goal</Label>
            <Textarea value={form.goal} onChange={(event) => update('goal', event.target.value)} rows={3} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Business knowledge / FAQ</Label>
            <Textarea value={form.knowledge} onChange={(event) => update('knowledge', event.target.value)} rows={6} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Save WhatsAI setup
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Setup Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ChecklistItem done label="WhatsApp webhook foundation" />
          <ChecklistItem done label="Summoner routing" />
          <ChecklistItem done label="Sales qualification flow" />
          <ChecklistItem done label="Business/playbook core table" />
          <ChecklistItem label="Production templates approval" />
          <ChecklistItem label="Billing + trial upgrade flow" />
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={done ? 'text-emerald-600' : 'text-muted-foreground'}>{done ? '✓' : '○'}</span>
      <span className={done ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
