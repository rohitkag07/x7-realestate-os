import { AlertTriangle, CircleCheckBig, Megaphone, Wrench } from 'lucide-react';
import { ComplaintKanban } from '@/components/colony/ComplaintKanban';
import { ComplaintCreateDialog } from '@/components/colony/ComplaintCreateDialog';
import { NoticeComposer } from '@/components/colony/NoticeComposer';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  colonyReadSourceLabel,
  loadColonyWorkspaceContext,
  loadComplaintsPageData,
  loadResidentsPageData,
} from '@/lib/colony-read';

export const metadata = { title: 'Colony · Complaints' };

export default async function ComplaintsPage() {
  const [{ complaints, source }, { residents }, workspace] = await Promise.all([
    loadComplaintsPageData(),
    loadResidentsPageData(),
    loadColonyWorkspaceContext(),
  ]);

  const active = complaints.filter((item) => ['open', 'in_progress', 'reopened'].includes(item.status)).length;
  const critical = complaints.filter((item) => item.priority === 'critical' || item.priority === 'high').length;
  const resolved = complaints.filter((item) => item.status === 'resolved' || item.status === 'closed').length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPICard label="Active Tickets" labelHi="एक्टिव टिकट" value={active} icon={Wrench} accent="warning" />
        <KPICard label="High Priority" labelHi="तुरंत ध्यान" value={critical} icon={AlertTriangle} accent="destructive" />
        <KPICard label="Resolved / Closed" labelHi="हल हुए" value={resolved} icon={CircleCheckBig} accent="success" />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Complaint Board</CardTitle>
              <CardDescription>{colonyReadSourceLabel(source)}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <ComplaintCreateDialog residents={residents} />
              <NoticeComposer projectId={workspace.projectId} builderId={workspace.builderId} triggerLabel="Broadcast Update" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Tickets can now be progressed directly from the board. Use broadcast for water, power, or security-wide updates.
          </div>
          <ComplaintKanban complaints={complaints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-amber-500" />
            WhatsApp Intake
          </CardTitle>
          <CardDescription>Resident-raised complaints should continue to come via WhatsApp and land here for secretary action.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
