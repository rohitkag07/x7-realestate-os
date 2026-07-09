'use client';

import { useMemo, useState, useTransition } from 'react';
import { CheckCircle2, Circle, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { SetupChecklistStep } from '@/lib/trial-console';

export function SetupChecklistClient({
  initialSteps,
}: {
  initialSteps: SetupChecklistStep[];
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const completion = useMemo(() => {
    if (!steps.length) return 0;
    return Math.round((steps.filter((step) => step.isDone).length / steps.length) * 100);
  }, [steps]);

  function toggleStep(step: SetupChecklistStep) {
    if (step.id.startsWith('demo-')) return;
    const nextValue = !step.isDone;
    setPendingId(step.id);
    startTransition(async () => {
      const response = await fetch('/api/settings/checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: step.id, is_done: nextValue }),
      });

      if (response.ok) {
        setSteps((current) => current.map((item) => (
          item.id === step.id
            ? { ...item, isDone: nextValue, completedAt: nextValue ? new Date().toISOString() : null }
            : item
        )));
      }
      setPendingId(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              Setup Checklist
            </CardTitle>
            <CardDescription>Complete these steps before going live with your first trial business.</CardDescription>
          </div>
          <div className="text-sm font-semibold">{completion}% complete</div>
        </div>
        <Progress value={completion} className="mt-3" />
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-start gap-3 rounded-lg border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex-1 pt-0.5">
                <div className="text-sm font-medium">{step.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {step.isDone ? 'Completed' : 'Pending'}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending || step.id.startsWith('demo-')}
                onClick={() => toggleStep(step)}
                aria-label={step.isDone ? 'Mark setup step pending' : 'Mark setup step complete'}
              >
                {pendingId === step.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : step.isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                )}
              </Button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
