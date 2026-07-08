'use client';

import { useMemo, useState, useTransition, type ComponentType } from 'react';
import { CalendarDays, Plus, Route, Phone, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatPhone, formatRelative } from '@/lib/utils';
import type { Lead } from '@/types/database';
import type { VisitBoardItem } from '@/lib/sales-data';
import { toast } from 'sonner';

interface SiteVisitPlannerProps {
  visits: VisitBoardItem[];
  leads: Lead[];
}

const visitTimes = ['10:30', '11:00', '12:30', '14:00', '16:00', '17:30'];

export function SiteVisitPlanner({ visits, leads }: SiteVisitPlannerProps) {
  const [items, setItems] = useState(visits);
  const [selectedId, setSelectedId] = useState(visits[0]?.id ?? '');
  const [open, setOpen] = useState(false);
  const [leadId, setLeadId] = useState(leads.find((lead) => lead.lead_stage !== 'booked' && lead.lead_stage !== 'lost')?.id ?? '');
  const [visitDate, setVisitDate] = useState(todayPlus(2));
  const [visitTime, setVisitTime] = useState('16:00');
  const [status, setStatus] = useState<'scheduled' | 'confirmed'>('scheduled');
  const [feedback, setFeedback] = useState(visits.find((visit) => visit.id === selectedId)?.feedback ?? '');
  const [interest, setInterest] = useState(visits.find((visit) => visit.id === selectedId)?.interest_level ?? 'high');
  const [pending, startTransition] = useTransition();

  const selectedVisit = items.find((visit) => visit.id === selectedId) ?? null;
  const eligibleLeads = useMemo(
    () => leads.filter((lead) => lead.lead_stage !== 'booked' && lead.lead_stage !== 'lost'),
    [leads],
  );

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).format(date),
        items: items
          .filter((visit) => visit.scheduled_date === key)
          .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
      };
    });
  }, [items]);

  function onCreateVisit() {
    const lead = eligibleLeads.find((entry) => entry.id === leadId);
    if (!lead) return;

    startTransition(async () => {
      try {
        const response = await fetch('/api/sales/book-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            builder_id: lead.builder_id,
            project_id: lead.project_id,
            lead_name: lead.name,
            phone: lead.phone,
            scheduled_date: visitDate,
            scheduled_time: visitTime,
            locale: 'hi-en',
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || 'Visit scheduling failed');

        const nextVisit: VisitBoardItem = {
          id: String(payload.visit?.id ?? `sv-${crypto.randomUUID()}`),
          lead_id: lead.id,
          project_id: lead.project_id ?? '',
          lead_name: lead.name,
          lead_phone: lead.phone,
          project_name: 'Krishna Greens',
          budget_range: lead.budget_range,
          scheduled_date: String(payload.visit?.scheduled_date ?? visitDate),
          scheduled_time: String(payload.visit?.scheduled_time ?? visitTime),
          status: (payload.visit?.status ?? status) as VisitBoardItem['status'],
          feedback: null,
          interest_level: 'high',
          follow_up_action: 'Send route map and day-before WhatsApp reminder',
          reminder_sent_at: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setItems((current) => [...current, nextVisit].sort((a, b) => `${a.scheduled_date}${a.scheduled_time}`.localeCompare(`${b.scheduled_date}${b.scheduled_time}`)));
        setSelectedId(nextVisit.id);
        setOpen(false);
        toast.success(payload.response?.hi ?? 'Visit scheduled successfully.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Visit scheduling failed');
      }
    });
  }

  function saveFeedback() {
    if (!selectedVisit) return;
    startTransition(async () => {
      try {
        const response = await fetch('/api/sales/site-visits/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedVisit.id,
            builder_id: leads.find((entry) => entry.id === selectedVisit.lead_id)?.builder_id,
            lead_id: selectedVisit.lead_id,
            project_id: selectedVisit.project_id,
            feedback,
            interest_level: interest,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || 'Feedback save failed');

        setItems((current) => current.map((visit) => (
          visit.id === selectedVisit.id
            ? {
                ...visit,
                feedback,
                interest_level: interest as VisitBoardItem['interest_level'],
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : visit
        )));
        toast.success('Visit feedback saved.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Feedback save failed');
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Weekly Appointment Board</CardTitle>
              <CardDescription>Qualified leads, confirmed WhatsApp appointments, and owner handoff slots for the next 7 days.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setOpen(true)} disabled={!eligibleLeads.length}>
              <Plus className="h-4 w-4 mr-2" /> Quick Schedule
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3">
            {week.map((day) => (
              <div key={day.key} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">{day.label}</div>
                  <Badge variant="outline">{day.items.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {day.items.map((visit) => (
                    <button
                      key={visit.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(visit.id);
                        setFeedback(visit.feedback ?? '');
                        setInterest(visit.interest_level ?? 'high');
                      }}
                      className={visit.id === selectedId ? 'w-full rounded-lg border bg-background px-3 py-3 text-left shadow-sm ring-2 ring-primary/30' : 'w-full rounded-lg border bg-background px-3 py-3 text-left hover:border-primary/40'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{visit.lead_name}</div>
                          <div className="text-xs text-muted-foreground">{visit.scheduled_time} · {visit.budget_range ?? 'Budget pending'}</div>
                        </div>
                        <Badge variant="outline" className="capitalize">{visit.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">{formatPhone(visit.lead_phone)}</div>
                    </button>
                  ))}
                  {!day.items.length && (
                    <div className="rounded-lg border border-dashed bg-background/70 px-3 py-6 text-center text-[11px] text-muted-foreground">
                      No visits on this day
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit Detail & Feedback</CardTitle>
            <CardDescription>Capture post-visit quality signals and next follow-up action for the sales agent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedVisit ? (
              <>
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <InfoRow icon={CalendarDays} label="Visit slot" value={`${formatDate(selectedVisit.scheduled_date)} · ${selectedVisit.scheduled_time}`} />
                  <InfoRow icon={Phone} label="Lead" value={`${selectedVisit.lead_name} · ${formatPhone(selectedVisit.lead_phone)}`} />
                  <InfoRow icon={Route} label="Next action" value={selectedVisit.follow_up_action ?? 'Call after visit with payment plan summary'} />
                  <InfoRow icon={Sparkles} label="Last reminder" value={selectedVisit.reminder_sent_at ? formatRelative(selectedVisit.reminder_sent_at) : 'Pending'} />
                </div>

                <div className="space-y-2">
                  <Label>Interest level</Label>
                  <Select value={interest ?? 'high'} onValueChange={(value) => setInterest(value as typeof interest)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very_high">Very High</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Post-visit feedback</Label>
                  <Textarea
                    rows={5}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="What did the buyer like, object to, or compare against?"
                  />
                </div>

                <Button className="w-full" onClick={saveFeedback} disabled={pending}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Save Feedback & Mark Progress
                </Button>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground text-center py-12">
                Select a visit from the weekly board to review notes and save conversion feedback.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Schedule Site Visit</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} · {lead.budget_range ?? 'Budget pending'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time slot</Label>
                <Select value={visitTime} onValueChange={setVisitTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {visitTimes.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onCreateVisit} disabled={pending || !leadId}>Create Visit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function todayPlus(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
