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
  primary:     'text-primary bg-primary/10',
  success:     'text-emerald-600 bg-emerald-50',
  warning:     'text-amber-600 bg-amber-50',
  destructive: 'text-red-600 bg-red-50',
};

export function KPICard({
  label, labelHi, value, delta, deltaSuffix = '%', icon: Icon, accent = 'primary',
}: KPICardProps) {
  const isUp   = delta != null && delta >= 0;
  const isFlat = delta === 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            {labelHi && <div className="text-[11px] text-muted-foreground/80">{labelHi}</div>}
            <div className="text-2xl font-bold tabular-nums">{value}</div>
          </div>
          {Icon && (
            <div className={cn('rounded-md p-2', accentClasses[accent])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {delta != null && (
          <div className={cn(
            'mt-3 inline-flex items-center gap-1 text-xs font-medium',
            isFlat ? 'text-muted-foreground' : isUp ? 'text-emerald-600' : 'text-red-600',
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
