import { Plus, Filter, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { LeadPipeline } from '@/components/leads/LeadPipeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadLeadsPageData, salesReadSourceLabel } from '@/lib/sales-read';

export const metadata = { title: 'Leads' };

export default async function LeadsPage() {
  const { leads, source } = await loadLeadsPageData();

  return (
    <>
      <PageHeader
        title="Lead Pipeline"
        titleHi="लीड पाइपलाइन"
        description="Every lead from ads, WhatsApp, walk-ins, and Ghost Closer — in one Kanban."
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export</Button>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Lead</Button>
          </>
        }
      />
      <p className="mb-6 -mt-3 text-xs text-muted-foreground">{salesReadSourceLabel(source)}</p>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="hot">Hot Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <LeadPipeline leads={leads} />
        </TabsContent>

        <TabsContent value="list">
          <LeadPipeline leads={leads} />
        </TabsContent>

        <TabsContent value="hot">
          <LeadPipeline leads={leads.filter((lead) => lead.temperature === 'hot')} />
        </TabsContent>
      </Tabs>
    </>
  );
}
