'use client';

import { useMemo, useState, useTransition } from 'react';
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Phone, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CalendarData, CalendarAppointment } from '@/lib/calendar-data';

export function CalendarView({ initialData }: { initialData: CalendarData }) {
  const [appointments, setAppointments] = useState(initialData.appointments);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const [pending, startTransition] = useTransition();

  const days = useMemo(() => view === 'month'
    ? eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) })
    : eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) }), [cursor, view]);

  const dayAppointments = appointments.filter((appointment) => isSameDay(parseISO(appointment.scheduled_at), selectedDate));
  const appointmentDays = new Set(appointments.map((appointment) => format(parseISO(appointment.scheduled_at), 'yyyy-MM-dd')));

  function move(direction: number) { setCursor((value) => view === 'month' ? (direction > 0 ? addMonths(value, 1) : subMonths(value, 1)) : (direction > 0 ? addWeeks(value, 1) : subWeeks(value, 1))); }
  function openAppointment(appointment: CalendarAppointment) { setSelectedAppointment(appointment); setRescheduleValue(format(parseISO(appointment.scheduled_at), "yyyy-MM-dd'T'HH:mm")); }

  function updateAppointment(id: string, payload: { status?: CalendarAppointment['status']; scheduled_at?: string }, success: string) {
    startTransition(async () => {
      const response = await fetch(`/api/appointments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) { toast.error(result?.error || 'Appointment update failed.'); return; }
      setAppointments((current) => current.map((item) => item.id === id ? { ...item, ...result.appointment } : item));
      setSelectedAppointment((current) => current && current.id === id ? { ...current, ...result.appointment } : current);
      toast.success(success);
    });
  }

  function confirmAppointment() { if (selectedAppointment) updateAppointment(selectedAppointment.id, { status: 'scheduled' }, 'Appointment confirmed.'); }
  function cancelAppointment() { if (selectedAppointment) updateAppointment(selectedAppointment.id, { status: 'cancelled' }, 'Appointment cancelled.'); }
  function rescheduleAppointment() { if (selectedAppointment && rescheduleValue) updateAppointment(selectedAppointment.id, { status: 'scheduled', scheduled_at: new Date(rescheduleValue).toISOString() }, 'Appointment rescheduled.'); }

  if (initialData.source === 'error') return <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-950"><h2 className="font-semibold">Calendar could not load</h2><p className="mt-2 text-sm">{initialData.error}</p><p className="mt-2 text-xs">Check the `appointments` table and Supabase credentials, then refresh.</p></div>;

  return <>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
      <Card className="overflow-hidden border-[#d8dee4] bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-[#d8dee4] p-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-lg">{view === 'month' ? format(cursor, 'MMMM yyyy') : `Week of ${format(days[0], 'd MMM')}`}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{appointments.length} appointment{appointments.length === 1 ? '' : 's'} in your schedule</p></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Previous period"><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => { setCursor(new Date()); setSelectedDate(new Date()); }}>Today</Button><Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Next period"><ChevronRight className="h-4 w-4" /></Button><Tabs value={view} onValueChange={(value) => setView(value as 'month' | 'week')}><TabsList className="ml-1"><TabsTrigger value="month">Month</TabsTrigger><TabsTrigger value="week">Week</TabsTrigger></TabsList></Tabs></div></CardHeader>
        <CardContent className="p-3 sm:p-5"><div className="grid grid-cols-7 border-b border-[#d8dee4] pb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[#667781]">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day}>{day}</div>)}</div><div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">{days.map((day) => { const key = format(day, 'yyyy-MM-dd'); const count = appointments.filter((appointment) => format(parseISO(appointment.scheduled_at), 'yyyy-MM-dd') === key).length; return <button type="button" key={key} onClick={() => setSelectedDate(day)} className={cn('relative min-h-16 rounded-xl border border-transparent p-2 text-left transition hover:border-[#00a884] sm:min-h-24', !isSameMonth(day, cursor) && view === 'month' && 'text-slate-300', isSameDay(day, selectedDate) && 'border-[#00a884] bg-[#e7fce3] text-[#075e54]')}><span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold', isSameDay(day, new Date()) && 'bg-[#075e54] text-white')}>{format(day, 'd')}</span>{appointmentDays.has(key) ? <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-semibold text-[#075e54]"><i className="h-2 w-2 rounded-full bg-[#00a884]" />{count > 1 ? count : ''}</span> : null}</button>; })}</div></CardContent>
      </Card>
      <Card className="border-[#d8dee4] bg-white shadow-sm"><CardHeader className="border-b border-[#d8dee4] p-4"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-[#00a884]" />{format(selectedDate, 'EEEE, d MMM')}</CardTitle></CardHeader><CardContent className="space-y-3 p-4">{dayAppointments.length ? dayAppointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onClick={() => openAppointment(appointment)} />) : <div className="rounded-2xl border border-dashed p-5 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-semibold">Nothing booked for this day</p><p className="mt-1 text-xs text-muted-foreground">AI-booked site visits and calls will appear here.</p></div>}</CardContent></Card>
    </div>
    <Dialog open={Boolean(selectedAppointment)} onOpenChange={(open) => !open && setSelectedAppointment(null)}><DialogContent><DialogHeader><DialogTitle>{selectedAppointment?.title ?? 'Appointment'}</DialogTitle><DialogDescription>Review the customer and update the appointment status.</DialogDescription></DialogHeader>{selectedAppointment ? <div className="space-y-4"><div className="rounded-2xl bg-[#f0f2f5] p-4"><div className="text-lg font-semibold">{selectedAppointment.contactName}</div><div className="mt-2 space-y-2 text-sm text-muted-foreground"><div className="flex items-center gap-2"><Phone className="h-4 w-4" />{selectedAppointment.phone}</div><div className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{format(parseISO(selectedAppointment.scheduled_at), 'EEE, d MMM yyyy · h:mm a')}</div><div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{selectedAppointment.appointment_type.replace('_', ' ')}</div></div></div><Badge variant={selectedAppointment.status === 'cancelled' ? 'destructive' : selectedAppointment.status === 'completed' ? 'success' : 'warning'}>{selectedAppointment.status.replace('_', ' ')}</Badge><div><label htmlFor="reschedule" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reschedule date and time</label><Input id="reschedule" type="datetime-local" value={rescheduleValue} onChange={(event) => setRescheduleValue(event.target.value)} className="mt-2" /></div>{selectedAppointment.notes ? <p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p> : null}</div> : null}<DialogFooter className="flex-wrap sm:justify-between"><Button variant="outline" onClick={rescheduleAppointment} disabled={pending || !rescheduleValue}><RefreshCw className={cn('mr-2 h-4 w-4', pending && 'animate-spin')} />Reschedule</Button><div className="flex gap-2"><Button variant="destructive" onClick={cancelAppointment} disabled={pending || selectedAppointment?.status === 'cancelled'}><XCircle className="mr-2 h-4 w-4" />Cancel</Button><Button variant="success" onClick={confirmAppointment} disabled={pending || selectedAppointment?.status === 'cancelled'}>Confirm</Button></div></DialogFooter></DialogContent></Dialog>
  </>;
}

function AppointmentCard({ appointment, onClick }: { appointment: CalendarAppointment; onClick: () => void }) { return <button type="button" onClick={onClick} className="w-full rounded-2xl border border-[#d8dee4] bg-white p-3 text-left transition hover:border-[#00a884] hover:shadow-sm"><div className="flex items-start justify-between gap-2"><div className="font-semibold text-[#111b21]">{appointment.contactName}</div><Badge variant={appointment.status === 'cancelled' ? 'destructive' : 'success'}>{appointment.status}</Badge></div><div className="mt-2 text-sm text-muted-foreground">{format(parseISO(appointment.scheduled_at), 'h:mm a')} · {appointment.appointment_type.replace('_', ' ')}</div><div className="mt-1 truncate text-xs text-[#667781]">{appointment.title}</div></button>; }
