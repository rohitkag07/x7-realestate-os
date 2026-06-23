import { Clock3, ShieldCheck, Truck } from 'lucide-react';
import { VisitorLog } from '@/components/colony/VisitorLog';
import { NoticeComposer } from '@/components/colony/NoticeComposer';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { colonyReadSourceLabel, loadColonyWorkspaceContext, loadVisitorsPageData } from '@/lib/colony-read';

export const metadata = { title: 'Colony · Visitors' };

export default async function VisitorsPage() {
  const [{ visitors, source }, workspace] = await Promise.all([
    loadVisitorsPageData(),
    loadColonyWorkspaceContext(),
  ]);

  const pending = visitors.filter((item) => item.approval_status === 'pending').length;
  const approved = visitors.filter((item) => item.approval_status === 'approved').length;
  const serviceEntries = visitors.filter((item) => item.visitor_type === 'service' || item.visitor_type === 'delivery').length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPICard label="Pending Approval" labelHi="अनुमति बाकी" value={pending} icon={Clock3} accent="warning" />
        <KPICard label="Approved Today" labelHi="आज अप्रूव" value={approved} icon={ShieldCheck} accent="success" />
        <KPICard label="Service / Delivery" labelHi="सर्विस एंट्री" value={serviceEntries} icon={Truck} accent="primary" />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Visitor Desk</CardTitle>
              <CardDescription>{colonyReadSourceLabel(source)}</CardDescription>
            </div>
            <NoticeComposer projectId={workspace.projectId} builderId={workspace.builderId} triggerLabel="Security Notice" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Pending approvals can now be approved or denied directly from this table. WhatsApp approvals still remain the primary resident path.
          </div>
          <VisitorLog visitors={visitors} />
        </CardContent>
      </Card>
    </div>
  );
}
