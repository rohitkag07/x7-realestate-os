import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  labelHi?: string;
  value: string | number;
  delta?: number;          // Percent change vs previous period; positive == up
  deltaSuffix?: string;
  icon?: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
}

const accentClasses = {
  primary:     'text-emerald-100 bg-emerald-400/12 border-emerald-300/15',
  success:     'text-cyan-100 bg-cyan-400/12 border-cyan-300/15',
  warning:     'text-amber-100 bg-amber-400/12 border-amber-300/15',
  destructive: 'text-rose-100 bg-rose-400/12 border-rose-300/15',
};

export function KPICard({
  label, labelHi, value, delta, deltaSuffix = '%', icon: Icon, accent = 'primary',
}: KPICardProps) {
  const isUp   = delta != null && delta >= 0;
  const isFlat = delta === 0;

  return (
    <Card className="metric-card">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <CardContent className="relative p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            {labelHi && <div className="text-[11px] text-muted-foreground/75">{labelHi}</div>}
            <div className="pt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</div>
          </div>
          {Icon && (
            <div className={cn('rounded-xl border p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.22)]', accentClasses[accent])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {delta != null && (
          <div className={cn(
            'mt-3 inline-flex items-center gap-1 text-xs font-medium',
            isFlat ? 'text-muted-foreground' : isUp ? 'text-emerald-300' : 'text-rose-300',
          )}>
            {isFlat ? null : isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{Math.abs(delta)}{deltaSuffix}</span>
            <span className="text-muted-foreground font-normal">vs last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
