import { Download, FileText, BarChart3, Activity, ArrowUpRight, CircleDot } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata = { title: 'Reports' };

const reportCards = [
  { title: 'Monthly Sales Report',     description: 'Bookings, revenue, agent attribution',           icon: BarChart3 },
  { title: 'Marketing Performance',    description: 'CPL by source, content engagement, ad CTR',     icon: Activity  },
  { title: 'Colony Maintenance Report',description: 'Collections, outstanding dues, defaulters',     icon: FileText  },
  { title: 'Builder GST Summary',      description: 'GST-ready summary for CA / filing',             icon: FileText  },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        titleHi="रिपोर्ट्स"
        description="Auto-generated reports — downloadable as PDF, also delivered weekly on WhatsApp."
      />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ReportMetricPanel
          title="Lead Funnel Summary"
          description="Weekly performance snapshot for sales and qualification."
          items={[
            { label: 'New Leads', value: '84', detail: 'Meta + WhatsApp remain strongest' },
            { label: 'Qualified', value: '31', detail: '37% qualification rate this week' },
            { label: 'Visits Done', value: '12', detail: '3 converted into active negotiations' },
          ]}
        />
        <ReportMetricPanel
          title="Revenue Summary"
          description="Builder-side collections and forward pipeline view."
          items={[
            { label: 'Booked Revenue', value: '₹18L', detail: '1 fresh booking recorded today' },
            { label: 'Pending Closures', value: '₹42L', detail: 'Warm pipeline under follow-up' },
            { label: 'Maintenance Collections', value: '₹6.4L', detail: '92% monthly recovery pace' },
          ]}
        />
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Channel Quality
            </CardTitle>
            <CardDescription>
              Quick reading of which channels are bringing closable leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <ChannelCard title="Meta Ads" status="High" note="Best top-of-funnel volume and stable CPL." />
            <ChannelCard title="Google Search" status="Medium" note="Lower volume but strong intent-led traffic." />
            <ChannelCard title="Referral Loop" status="High" note="Smallest volume, strongest booking quality." />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">Downloadable Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reportCards.map((r) => {
            const Icon = r.icon;
            return (
              <Card key={r.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                    <div>
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <CardDescription className="text-xs">{r.description}</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> PDF</Button>
                </CardHeader>
                <CardContent />
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}

function ReportMetricPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: { label: string; value: string; detail: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border/60 bg-card/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChannelCard({
  title,
  status,
  note,
}: {
  title: string;
  status: 'High' | 'Medium' | 'Low';
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{status}</span>
      </div>
      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{note}</span>
      </div>
    </div>
  );
}
