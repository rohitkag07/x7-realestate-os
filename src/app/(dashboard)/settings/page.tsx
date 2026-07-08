import { Save, Sparkles, MessageCircle, CreditCard, Palette, ServerCog } from 'lucide-react';
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

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const readiness = await getOpsReadiness();

  return (
    <>
      <PageHeader title="Settings" titleHi="सेटिंग्स" description="Business profile, WhatsApp integrations, launch readiness, and billing." />

      <Tabs defaultValue="ops">
        <TabsList>
          <TabsTrigger value="ops"><ServerCog className="h-3.5 w-3.5 mr-1.5" /> Ops</TabsTrigger>
          <TabsTrigger value="profile"><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Profile</TabsTrigger>
          <TabsTrigger value="brand"><Palette className="h-3.5 w-3.5 mr-1.5" /> Brand</TabsTrigger>
          <TabsTrigger value="integrations"><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Integrations</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="h-3.5 w-3.5 mr-1.5" /> Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="ops">
          <ReadinessPanel readiness={readiness} />
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Profile</CardTitle>
              <CardDescription>Public-facing business name, address, and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company Name" defaultValue="Demo SMB Trial" />
              <Field label="Founder Name" defaultValue="Rohit Kag" />
              <Field label="Phone"        defaultValue="+91 98765 43210" />
              <Field label="WhatsApp Business Number" defaultValue="+91 98765 43210" />
              <Field label="Email"        defaultValue="owner@business.in" />
              <Field label="City"         defaultValue="Indore" />
              <div className="md:col-span-2">
                <Label htmlFor="about">About</Label>
                <Textarea id="about" rows={3} defaultValue="Indian SMB using WhatsApp for leads, appointments, and customer follow-up." />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button><Save className="h-4 w-4 mr-2" /> Save Profile</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Kit</CardTitle>
              <CardDescription>Logo, colors, and fonts applied to every auto-generated content piece.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Primary Color" defaultValue="#0F172A" />
              <Field label="Accent Color"  defaultValue="#F59E0B" />
              <Field label="Logo URL"      defaultValue="" />
              <Field label="Hindi Font"    defaultValue="Noto Sans Devanagari" />
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> WhatsAI Trial Plan
                <Badge variant="success">Active</Badge>
              </CardTitle>
              <CardDescription>7-day managed trial · Upgrade after proof of qualified leads</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>· WhatsApp Cloud API setup</li>
                <li>· Vertical qualification playbook</li>
                <li>· Appointment booking and hot-lead alerts</li>
                <li>· Conversation summaries and handoff tracking</li>
                <li>· Usage and billing readiness</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm">Change Plan</Button>
                <Button variant="ghost" size="sm" className="text-red-600">Cancel Subscription</Button>
              </div>
            </CardContent>
          </Card>
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
    ready: { label: 'Ready', variant: 'success' as const },
    partial: { label: 'Partial', variant: 'warning' as const },
    blocked: { label: 'Blocked', variant: 'destructive' as const },
    manual: { label: 'Needs Proof', variant: 'outline' as const },
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
