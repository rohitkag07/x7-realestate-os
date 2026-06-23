import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Link2, Radio, ServerCog } from 'lucide-react';
import type { OpsReadiness } from '@/lib/ops-readiness';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const statusBadge: Record<'ready' | 'partial' | 'blocked' | 'manual', { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' }> = {
  ready: { label: 'Ready', variant: 'success' },
  partial: { label: 'Partial', variant: 'warning' },
  blocked: { label: 'Blocked', variant: 'destructive' },
  manual: { label: 'Needs Proof', variant: 'outline' },
};

export function ReadinessPanel({ readiness }: { readiness: OpsReadiness }) {
  const readyCount = readiness.launchGates.filter((gate) => gate.status === 'ready').length;
  const blockedCount = readiness.launchGates.filter((gate) => gate.status === 'blocked').length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ServerCog className="h-4 w-4" />
              Launch Gates
            </CardTitle>
            <CardDescription>
              Production readiness summary generated from current env, service health, and Supabase probes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {readiness.launchGates.map((gate) => (
              <div key={gate.key} className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="text-sm font-medium">{gate.label}</div>
                  <StatusPill status={gate.status} />
                </div>
                <p className="text-xs text-muted-foreground">{gate.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ops Snapshot</CardTitle>
            <CardDescription>Fast truth for the current deployment state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricRow label="Ready Gates" value={String(readyCount)} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
            <MetricRow label="Blocked Gates" value={String(blockedCount)} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} />
            <MetricRow label="Reachable Services" value={`${readiness.services.filter((item) => item.reachable).length}/${readiness.services.length}`} icon={<Radio className="h-4 w-4 text-blue-600" />} />
            <MetricRow label="Generated At" value={new Date(readiness.generatedAt).toLocaleString('en-IN')} icon={<Clock3 className="h-4 w-4 text-amber-600" />} />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integration Env Contract</CardTitle>
            <CardDescription>Whether the dashboard runtime has enough env to prove each external boundary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.envGroups.map((group) => (
              <div key={group.key} className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="text-sm font-medium">{group.label}</div>
                  <StatusPill status={group.status} />
                </div>
                <p className="text-xs text-muted-foreground">{group.detail}</p>
                {group.missing.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.missing.map((item) => (
                      <code key={item} className="rounded bg-background px-2 py-1 text-[11px] text-muted-foreground">
                        {item}
                      </code>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Mesh Health</CardTitle>
            <CardDescription>Real service URLs and their current health/dependency state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.services.map((service) => (
              <div key={service.key} className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{service.label}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      <span className="truncate">{service.url}</span>
                    </div>
                  </div>
                  <StatusPill status={service.status} />
                </div>
                <p className="text-xs text-muted-foreground">{service.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Probes</CardTitle>
          <CardDescription>Direct table access checks from the dashboard server layer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {readiness.dataProbes.map((probe) => (
            <div key={probe.key} className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="text-sm font-medium">{probe.label}</div>
                <StatusPill status={probe.status} />
              </div>
              <div className="text-2xl font-semibold">{probe.count ?? '—'}</div>
              <p className="mt-1 text-xs text-muted-foreground">{probe.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: 'ready' | 'partial' | 'blocked' | 'manual' }) {
  const config = statusBadge[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function MetricRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
