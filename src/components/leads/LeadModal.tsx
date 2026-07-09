'use client';

import { useState, useTransition, type ComponentType } from 'react';
import { Phone, MessageCircle, Calendar, MapPin, IndianRupee, Clock, Sparkles, UserRound, Flag, Route } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatPhone, formatRelative } from '@/lib/utils';
import { leadProfileById } from '@/lib/sales-data';
import type { Lead } from '@/types/database';
import { toast } from 'sonner';

interface LeadModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

export function LeadModal({ lead, open, onClose }: LeadModalProps) {
  const [pending, startTransition] = useTransition();
  const [automationPreview, setAutomationPreview] = useState<string | null>(null);

  if (!lead) return null;

  const currentLead = lead;
  const profile = leadProfileById(currentLead.id);

  function generateFollowUp() {
    startTransition(async () => {
      try {
        const response = await fetch('/api/sales/follow-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: currentLead.id,
            builder_id: currentLead.builder_id,
            project_id: currentLead.project_id,
            lead_name: currentLead.name,
            lead_stage: currentLead.lead_stage,
            budget_range: currentLead.budget_range,
            purpose: currentLead.purpose,
            locale: 'hi-en',
            trigger: 'lead-modal',
            phone: currentLead.phone,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || 'Follow-up generation failed');
        setAutomationPreview(payload.response?.bilingual ?? null);
        toast.success('Follow-up generated and queued.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Follow-up generation failed');
      }
    });
  }

  function queueDrip() {
    startTransition(async () => {
      try {
        const response = await fetch('/api/sales/drip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: currentLead.id,
            builder_id: currentLead.builder_id,
            project_id: currentLead.project_id,
            lead_name: currentLead.name,
            lead_stage: currentLead.lead_stage,
            phone: currentLead.phone,
            locale: 'hi-en',
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || 'Drip queue failed');
        toast.success(`Drip sequence queued with ${payload.steps?.length ?? 0} steps.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Drip queue failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">{currentLead.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1 flex-wrap">
                <Phone className="h-3 w-3" /> {formatPhone(currentLead.phone)}
                {currentLead.email && <span>· {currentLead.email}</span>}
                {profile?.sourceLabel && <span>· {profile.sourceLabel}</span>}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <StatusBadge kind={{ type: 'temperature', value: currentLead.temperature }} />
              <StatusBadge kind={{ type: 'lead_stage', value: currentLead.lead_stage }} />
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="playbook">Playbook</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
              <Field icon={IndianRupee} label="Budget" value={currentLead.budget_range ?? '—'} />
              <Field icon={MapPin} label="Purpose" value={currentLead.purpose ?? '—'} />
              <Field icon={Clock} label="Timeline" value={currentLead.timeline ?? '—'} />
              <Field icon={Sparkles} label="Score" value={`${currentLead.lead_score}/100`} />
            </div>

            {profile && (
              <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Sales Summary
                    </div>
                    <p className="text-sm leading-6">{profile.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <MiniField icon={UserRound} label="Assigned to" value={profile.assignedTo} />
                    <MiniField icon={Route} label="Preferred area" value={profile.preferredProjectArea} />
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sales Agent Notes</div>
                  <Textarea
                    defaultValue={currentLead.notes ?? ''}
                    placeholder="Notes from sales agent..."
                    rows={6}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Created {formatDate(currentLead.created_at)}</span>
              <span>Last contacted {currentLead.last_contacted_at ? formatRelative(currentLead.last_contacted_at) : '—'}</span>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            {profile?.whatsapp?.length ? (
              <div className="space-y-3">
                {profile.whatsapp.map((message) => (
                  <div
                    key={message.id}
                    className={message.direction === 'outbound' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div className={message.direction === 'outbound' ? 'max-w-[78%]' : 'max-w-[82%]'}>
                      <div
                        className={
                          message.direction === 'outbound'
                            ? 'rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3'
                            : 'rounded-2xl rounded-bl-md border bg-muted/30 px-4 py-3'
                        }
                      >
                        <div className="text-sm leading-6">{message.body}</div>
                      </div>
                      <div className="mt-1 px-2 text-[11px] text-muted-foreground">
                        {message.direction === 'outbound' ? 'Sales Agent' : 'Lead'} · {formatRelative(message.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground text-center py-12">
                WhatsApp conversation history will appear here once the Sales Agent starts writing to `whatsapp_messages`.
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {profile?.activity?.length ? (
              <ol className="relative border-l border-muted ml-3 space-y-4 text-sm">
                {profile.activity.map((item) => (
                  <li key={item.id} className="ml-4">
                    <span
                      className={
                        item.tone === 'good'
                          ? 'absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-emerald-500'
                          : item.tone === 'alert'
                            ? 'absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-amber-500'
                            : 'absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary'
                      }
                    />
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.detail}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{formatDate(item.at)}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground text-center py-12">
                Activity timeline not available for this lead yet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="playbook" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Next best action</div>
                <div className="flex items-start gap-2">
                  <Flag className="h-4 w-4 mt-0.5 text-primary" />
                  <p className="text-sm leading-6">{profile?.nextAction ?? 'Qualify budget and timeline before scheduling site visit.'}</p>
                </div>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Preferred plots</div>
                <div className="flex flex-wrap gap-2">
                  {(profile?.preferredPlots ?? []).map((plot) => (
                    <Badge key={plot} variant="outline">{plot}</Badge>
                  ))}
                  {!profile?.preferredPlots?.length && <span className="text-sm text-muted-foreground">No specific inventory shortlisted yet.</span>}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <MiniField icon={Calendar} label="Stage target" value={currentLead.lead_stage === 'new' ? 'Move to Qualified' : currentLead.lead_stage === 'qualified' ? 'Book Visit' : 'Close Booking'} />
              <MiniField icon={MessageCircle} label="Preferred channel" value="WhatsApp + call assist" />
              <MiniField icon={Clock} label="Best response window" value={currentLead.source === 'ghost_closer' ? 'After 8 PM IST' : '11 AM - 7 PM'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" onClick={generateFollowUp} disabled={pending}>
                <MessageCircle className="h-4 w-4 mr-2" /> Generate Follow-up
              </Button>
              <Button variant="outline" onClick={queueDrip} disabled={pending}>
                <Sparkles className="h-4 w-4 mr-2" /> Queue 30-Day Drip
              </Button>
            </div>

            {automationPreview && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Latest automation preview</div>
                <pre className="whitespace-pre-wrap text-sm leading-6 font-sans">{automationPreview}</pre>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" asChild>
            <a href={`https://wa.me/${currentLead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`tel:${currentLead.phone}`}>
              <Phone className="h-4 w-4 mr-2" /> Call
            </a>
          </Button>
          <Button>
            <Calendar className="h-4 w-4 mr-2" /> Book Site Visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function MiniField({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
