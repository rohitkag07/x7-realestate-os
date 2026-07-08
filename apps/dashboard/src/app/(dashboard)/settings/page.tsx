import {
  Save, Sparkles, MessageCircle, CreditCard, Palette, ServerCog,
  CheckCircle2, Circle, ChevronRight, Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReadinessPanel } from '@/components/settings/ReadinessPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getOpsReadiness } from '@/lib/ops-readiness';

export const metadata = { title: 'Settings — X7 WhatsAI' };
export const dynamic = 'force-dynamic';

const PLANS = [
  {
    key: 'trial',
    name: 'Trial',
    price: 0,
    priceLabel: 'Free / ₹999',
    period: '7 days',
    badge: null,
    badgeColor: '',
    features: ['WhatsApp AI receptionist', '1 vertical playbook', '50 msgs/day', 'Daily hot-lead summary', 'Operator dashboard'],
    cta: 'Current Plan',
    ctaVariant: 'outline' as const,
    highlight: false,
  },
  {
    key: 'basic',
    name: 'Basic',
    price: 2999,
    priceLabel: '₹2,999',
    period: '/month',
    badge: null,
    badgeColor: '',
    features: ['24/7 WhatsApp receptionist', '1 vertical playbook', '150 msgs/day', 'Follow-up queue', 'Daily summary', 'Dashboard'],
    cta: 'Upgrade to Basic',
    ctaVariant: 'outline' as const,
    highlight: false,
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 7999,
    priceLabel: '₹7,999',
    period: '/month',
    badge: 'Most Popular',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    features: ['Everything in Basic', '2 vertical playbooks', '500 msgs/day', 'Handoff SLA alerts', 'Appointment booking', 'CSV export'],
    cta: 'Upgrade to Growth',
    ctaVariant: 'default' as const,
    highlight: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 14999,
    priceLabel: '₹14,999',
    period: '/month',
    badge: null,
    badgeColor: '',
    features: ['Everything in Growth', '5 vertical playbooks', '2,000 msgs/day', 'Custom playbook editor', 'White-label dashboard', 'Dedicated onboarding'],
    cta: 'Go Pro',
    ctaVariant: 'outline' as const,
    highlight: false,
  },
];

const SETUP_STEPS = [
  { key: 'business_profile',     label: 'Complete business profile (name, phone, city)' },
  { key: 'whatsapp_channel',     label: 'Connect WhatsApp Business number' },
  { key: 'playbook_selected',    label: 'Select or create an assistant playbook' },
  { key: 'owner_handoff_number', label: 'Set owner WhatsApp number for handoffs' },
  { key: 'test_message_sent',    label: 'Send a test WhatsApp message' },
  { key: 'daily_summary_on',     label: 'Enable daily hot-lead summary' },
  { key: 'first_lead_captured',  label: 'Capture first real lead' },
  { key: 'trial_reviewed',       label: 'Review 7-day trial results with team' },
];

export default async function SettingsPage() {
  const readiness = await getOpsReadiness();

  return (
    <>
      <PageHeader
        title="Settings"
        titleHi="सेटिंग्स"
        description="Business profile, live integrations, billing, and white-label setup checklist."
      />

      <Tabs defaultValue="billing">
        <TabsList>
          <TabsTrigger value="billing"><CreditCard className="h-3.5 w-3.5 mr-1.5" /> Billing</TabsTrigger>
          <TabsTrigger value="checklist"><Zap className="h-3.5 w-3.5 mr-1.5" /> Setup</TabsTrigger>
          <TabsTrigger value="ops"><ServerCog className="h-3.5 w-3.5 mr-1.5" /> Ops</TabsTrigger>
          <TabsTrigger value="profile"><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Profile</TabsTrigger>
          <TabsTrigger value="brand"><Palette className="h-3.5 w-3.5 mr-1.5" /> Brand</TabsTrigger>
          <TabsTrigger value="integrations"><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Integrations</TabsTrigger>
        </TabsList>

        {/* ── BILLING ───────────────────────────────────────────────── */}
        <TabsContent value="billing">
          <div className="mb-5">
            <p className="text-sm font-medium">Current Plan</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5">
              <span className="text-sm font-semibold text-blue-800">Trial</span>
              <span className="text-xs text-blue-600">· 7 days · Free</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-xl border p-5 flex flex-col gap-4 ${
                  plan.highlight
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'bg-card'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-2.5 left-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                )}

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold">{plan.priceLabel}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button variant={plan.ctaVariant} size="sm" className="w-full" disabled={plan.key === 'trial'}>
                  {plan.cta}
                  {plan.key !== 'trial' && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                </Button>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Setup fee billed once. Monthly subscription via Razorpay. Cancel anytime.
            All prices exclusive of GST.
          </p>
        </TabsContent>

        {/* ── SETUP CHECKLIST ──────────────────────────────────────── */}
        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                White-Label Setup Checklist
              </CardTitle>
              <CardDescription>
                Complete these steps before going live with your first trial business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {SETUP_STEPS.map((step, i) => (
                  <li key={step.key} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1 flex items-center justify-between pt-0.5">
                      <span className="text-sm">{step.label}</span>
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6">
                <Button size="sm">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Steps as Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── OPS ──────────────────────────────────────────────────── */}
        <TabsContent value="ops">
          <ReadinessPanel readiness={readiness} />
        </TabsContent>

        {/* ── PROFILE ──────────────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Profile</CardTitle>
              <CardDescription>Public-facing name, address, and contact details used in assistant greetings.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Business Name"          defaultValue="Phase 6 Coaching Test" />
              <Field label="Owner / Contact Name"   defaultValue="Rohit Kag" />
              <Field label="Phone"                  defaultValue="+91 98765 43210" />
              <Field label="WhatsApp Business Number" defaultValue="+91 98765 43210" />
              <Field label="Email"                  defaultValue="owner@business.in" />
              <Field label="City"                   defaultValue="Indore" />
              <Field label="Vertical"               defaultValue="Coaching" />
              <div className="md:col-span-2">
                <Label htmlFor="about">About (used in assistant playbook context)</Label>
                <Textarea id="about" rows={3} defaultValue="Local coaching institute in Indore. Qualifies course interest, student level, demo-class timing, and counselor handoff." />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button><Save className="h-4 w-4 mr-2" /> Save Profile</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BRAND ────────────────────────────────────────────────── */}
        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Kit</CardTitle>
              <CardDescription>Applied to auto-generated content and white-label dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Primary Color"   defaultValue="#0F172A" />
              <Field label="Accent Color"    defaultValue="#F59E0B" />
              <Field label="Logo URL"        defaultValue="" />
              <Field label="Hindi Font"      defaultValue="Noto Sans Devanagari" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── INTEGRATIONS ─────────────────────────────────────────── */}
        <TabsContent value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {readiness.envGroups.map((group) => (
              <IntegrationCard
                key={group.key}
                title={group.label}
                status={group.status}
                detail={group.detail}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} defaultValue={defaultValue} />
    </div>
  );
}

function IntegrationCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: 'ready' | 'partial' | 'blocked' | 'manual';
  detail: string;
}) {
  const badgeMap = {
    ready:   { label: 'Ready',        variant: 'success'     as const },
    partial: { label: 'Partial',      variant: 'warning'     as const },
    blocked: { label: 'Blocked',      variant: 'destructive' as const },
    manual:  { label: 'Needs Proof',  variant: 'outline'     as const },
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </div>
        <Badge variant={badgeMap[status].variant}>{badgeMap[status].label}</Badge>
      </CardContent>
    </Card>
  );
}
