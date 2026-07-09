import { Activity, CheckCircle2, Handshake, MessageSquare, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { TrialStatus } from '@/lib/trial-console';

export function TrialStatusCard({ trial }: { trial: TrialStatus }) {
  const usagePercent = Math.min(100, Math.round((trial.messagesUsedToday / Math.max(trial.messagesLimitToday, 1)) * 100));

  return (
    <Card className="mb-5 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-amber-500" />
              Trial Console
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {trial.businessName} · Day {trial.trialDay} of {trial.trialLengthDays}
            </p>
          </div>
          <Badge variant={trial.source === 'supabase' ? 'success' : 'warning'}>
            {trial.source === 'supabase' ? 'Live data' : 'Demo fallback'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Trial progress</span>
            <span>{trial.trialProgress}%</span>
          </div>
          <Progress value={trial.trialProgress} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Metric icon={MessageSquare} label="Messages Today" value={`${trial.messagesUsedToday}/${trial.messagesLimitToday}`} detail={`${usagePercent}% of daily limit`} />
          <Metric icon={CheckCircle2} label="Qualified Leads" value={String(trial.qualifiedLeadsThisWeek)} detail="This week" />
          <Metric icon={Handshake} label="Handoffs" value={String(trial.handoffsGenerated)} detail="Generated this week" />
          <Metric icon={Activity} label="Plan Status" value={trial.planName} detail={trial.status.replace(/_/g, ' ')} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
