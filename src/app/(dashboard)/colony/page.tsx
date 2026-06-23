import Link from 'next/link';
import { ArrowRight, CalendarDays, IndianRupee, ShieldCheck, Users, Wrench } from 'lucide-react';
import { BillingTrigger } from '@/components/colony/BillingTrigger';
import { NoticeComposer } from '@/components/colony/NoticeComposer';
import { KPICard } from '@/components/shared/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  colonyReadSourceLabel,
  loadColonyWorkspaceContext,
  loadComplaintsPageData,
  loadAmenitiesPageData,
  loadNoticesPageData,
  loadResidentsPageData,
  loadVisitorsPageData,
} from '@/lib/colony-read';
import { formatDate, formatINR } from '@/lib/utils';

export default async function ColonyIndex() {
  const [{ kpis, source }, { notices }, { complaints }, { visitors }, { amenities }, workspace] = await Promise.all([
    loadResidentsPageData(),
    loadNoticesPageData(),
    loadComplaintsPageData(),
    loadVisitorsPageData(),
    loadAmenitiesPageData(),
    loadColonyWorkspaceContext(),
  ]);

  const quickLinks = [
    { href: '/colony/residents', title: 'Residents', description: 'Registry, dues, broadcasts', count: `${kpis.residents}` },
    { href: '/colony/complaints', title: 'Complaints', description: 'Track open, in-progress, resolved', count: `${complaints.length}` },
    { href: '/colony/visitors', title: 'Visitors', description: 'Guard desk and live approvals', count: `${visitors.length}` },
    { href: '/colony/amenities', title: 'Amenities', description: 'Reserve clubhouse, courts, guest room', count: `${amenities.length}` },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <KPICard label="Residents" labelHi="निवासी" value={kpis.residents} icon={Users} accent="primary" />
        <KPICard label="Open Complaints" labelHi="खुली शिकायतें" value={kpis.open_complaints} icon={Wrench} accent="warning" />
        <KPICard label="Pending Visitors" labelHi="पेंडिंग विज़िटर" value={kpis.pending_visitors} icon={ShieldCheck} accent="success" />
        <KPICard label="Monthly Collection" labelHi="मासिक कलेक्शन" value={formatINR(kpis.this_month_collected)} icon={IndianRupee} accent="success" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.8fr,1fr] gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Operations Console</CardTitle>
            <CardDescription>{colonyReadSourceLabel(source)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <BillingTrigger projectId={workspace.projectId} />
              <NoticeComposer projectId={workspace.projectId} builderId={workspace.builderId} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map((item) => (
                <Card key={item.href} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="text-2xl font-semibold">{item.count}</div>
                    <div className="mt-1 text-sm font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                    <Button asChild variant="ghost" className="mt-3 px-0">
                      <Link href={item.href}>
                        Open
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Notices</CardTitle>
            <CardDescription>Latest colony communications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notices.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No notices published yet.
              </div>
            ) : (
              notices.slice(0, 4).map((notice) => (
                <div key={notice.id} className="rounded-lg border px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{notice.title}</div>
                    <div className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {notice.status}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {notice.body_hindi ?? notice.body ?? 'No body saved'}
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Amenity Snapshot
          </CardTitle>
          <CardDescription>Clubhouse, courts, and guest stays should remain a managed resident experience, not an off-ledger process.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {amenities.slice(0, 3).map((amenity) => (
            <div key={amenity.id} className="rounded-lg border px-4 py-4">
              <div className="text-sm font-medium">{amenity.name}</div>
              <div className="mt-1 text-xs text-muted-foreground capitalize">{amenity.kind} · {amenity.open_time}-{amenity.close_time}</div>
              <div className="mt-3 text-sm text-muted-foreground">
                Rate {formatINR(amenity.hourly_rate, { compact: false })} / hr
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
