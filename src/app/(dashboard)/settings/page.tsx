import { Sparkles, MessageCircle, CreditCard, ServerCog } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReadinessPanel } from '@/components/settings/ReadinessPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getOpsReadiness } from '@/lib/ops-readiness';
import Link from 'next/link';

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const readiness = await getOpsReadiness();

  return (
    <>
      <PageHeader title="Settings" description="Business profile, WhatsApp integrations, launch readiness, and billing." />

      <Tabs defaultValue="ops">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="ops"><ServerCog className="h-3.5 w-3.5 mr-1.5" /> Ops</TabsTrigger>
          <TabsTrigger value="profile"><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Profile</TabsTrigger>
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
            <CardContent>
              <p className="text-sm text-muted-foreground">Business name, category, offer, and WhatsApp contact details are managed in the guided setup so the assistant and dashboard always use the same source of truth.</p>
              <Button asChild className="mt-4"><Link href="/assistant-setup">Edit business profile</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card><CardContent className="p-4"><div className="font-medium text-sm">JustDial leads</div><div className="mt-1 text-xs text-muted-foreground">POST leads to <code>/api/webhooks/justdial</code> with the configured secret.</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="font-medium text-sm">IndiaMART leads</div><div className="mt-1 text-xs text-muted-foreground">POST leads to <code>/api/webhooks/indiamart</code> with your CRM key.</div></CardContent></Card>
            {readiness.envGroups.map((group) => (
              <IntegrationCard
                key={group.key}
                title={group.label}
                status={group.status}
                detail={group.detail}
              />
            ))}
          </div>
          <div className="mt-4"><Button asChild variant="outline"><Link href="/assistant-setup/whatsapp-connection">Open WhatsApp connection guide</Link></Button></div>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> WhatsAI Plan
                <Badge variant="success">Active</Badge>
              </CardTitle>
              <CardDescription>WhatsApp assistant, qualification playbook, appointment booking, and owner alerts.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>· WhatsApp Cloud API setup</li>
                <li>· Vertical qualification playbook</li>
                <li>· Appointment booking and hot-lead alerts</li>
                <li>· Conversation summaries and handoff tracking</li>
                <li>· Usage and billing readiness</li>
              </ul>
              <p className="mt-4 rounded-xl bg-[#f0f2f5] p-3 text-sm text-muted-foreground">Plans are managed directly during the 10-business launch. Self-serve billing controls will appear here only after billing is connected.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
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
