import {
  Save, Sparkles, MessageCircle, CreditCard, Palette, ServerCog,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReadinessPanel } from '@/components/settings/ReadinessPanel';
import { BillingPlanGrid } from '@/components/settings/BillingPlanGrid';
import { SetupChecklistClient } from '@/components/settings/SetupChecklistClient';
import { TrialStatusCard } from '@/components/settings/TrialStatusCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getOpsReadiness } from '@/lib/ops-readiness';
import { getTrialConsoleData } from '@/lib/trial-console';

export const metadata = { title: 'Settings — WhatsAI Assistant' };
export const dynamic = 'force-dynamic';

const PLANS = [
  {
    key: 'trial',
    name: 'Trial',
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

type SettingsPageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [readiness, trialConsole, params] = await Promise.all([
    getOpsReadiness(),
    getTrialConsoleData(),
    Promise.resolve(searchParams),
  ]);
  const requestedTab = params?.tab;
  const activeTab = ['billing', 'checklist', 'ops', 'profile', 'brand', 'integrations'].includes(requestedTab ?? '')
    ? requestedTab
    : 'billing';

  return (
    <>
      <PageHeader
        title="Settings"
        titleHi="सेटिंग्स"
        description="Live trial status, billing, setup checklist, and operational readiness."
      />

      <TrialStatusCard trial={trialConsole.trial} />

      <Tabs defaultValue={activeTab}>
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
              <span className="text-sm font-semibold text-blue-800">{trialConsole.trial.planName}</span>
              <span className="text-xs text-blue-600">
                · Day {trialConsole.trial.trialDay} of {trialConsole.trial.trialLengthDays} · {trialConsole.trial.status}
              </span>
            </div>
          </div>

          <BillingPlanGrid
            plans={PLANS}
            currentPlanKey={trialConsole.trial.planKey}
            ownerPhone={trialConsole.trial.ownerPhone}
          />

          <p className="mt-4 text-xs text-muted-foreground">
            Setup fee billed once. Monthly subscription via Razorpay. Cancel anytime.
            All prices exclusive of GST.
          </p>
        </TabsContent>

        {/* ── SETUP CHECKLIST ──────────────────────────────────────── */}
        <TabsContent value="checklist">
          <SetupChecklistClient initialSteps={trialConsole.checklist} />
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
