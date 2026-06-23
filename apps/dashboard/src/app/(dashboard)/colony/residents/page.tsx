import { IndianRupee, ShieldCheck, Users, Wrench } from 'lucide-react';
import { ResidentTable } from '@/components/colony/ResidentTable';
import { BillingTrigger } from '@/components/colony/BillingTrigger';
import { NoticeComposer } from '@/components/colony/NoticeComposer';
import { ResidentFormDialog } from '@/components/colony/ResidentFormDialog';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  colonyReadSourceLabel,
  loadColonyWorkspaceContext,
  loadNoticesPageData,
  loadResidentsPageData,
} from '@/lib/colony-read';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata = { title: 'Colony · Residents' };

export default async function ResidentsPage() {
  const [{ residents, kpis, source }, { notices }, workspace] = await Promise.all([
    loadResidentsPageData(),
    loadNoticesPageData(),
    loadColonyWorkspaceContext(),
  ]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <KPICard label="Residents" labelHi="निवासी" value={kpis.residents} icon={Users} accent="primary" />
        <KPICard label="Open Tickets" labelHi="खुली शिकायतें" value={kpis.open_complaints} icon={Wrench} accent="warning" />
        <KPICard label="Pending Visitors" labelHi="पेंडिंग विज़िटर" value={kpis.pending_visitors} icon={ShieldCheck} accent="success" />
        <KPICard label="Collected" labelHi="कलेक्शन" value={formatINR(kpis.this_month_collected)} icon={IndianRupee} accent="success" />
        <KPICard label="Pending Dues" labelHi="बकाया" value={formatINR(kpis.this_month_pending)} icon={IndianRupee} accent="warning" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Residents Registry</CardTitle>
            <CardDescription>{colonyReadSourceLabel(source)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="text-sm text-muted-foreground">
                {residents.length} records loaded · collection rate {kpis.collection_rate != null ? `${kpis.collection_rate}%` : '—'}
              </div>
              <div className="flex flex-wrap gap-2">
                <ResidentFormDialog projectId={workspace.projectId} />
                <BillingTrigger projectId={workspace.projectId} />
                <NoticeComposer projectId={workspace.projectId} builderId={workspace.builderId} />
              </div>
            </div>
            <ResidentTable residents={residents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Notices</CardTitle>
            <CardDescription>Latest colony broadcasts and saved drafts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notices.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No notices yet.
              </div>
            ) : (
              notices.slice(0, 4).map((notice) => (
                <div key={notice.id} className="rounded-lg border px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{notice.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {notice.body_hindi ?? notice.body ?? 'No body saved'}
                      </div>
                    </div>
                    <div className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {notice.status}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{notice.delivered_count}/{notice.recipient_count} delivered</span>
                    <span>{formatDate(notice.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
