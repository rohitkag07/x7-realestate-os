import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CalendarView } from '@/components/whatsai/CalendarView';
import { loadCalendarData } from '@/lib/calendar-data';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const data = await loadCalendarData();
  return <div className="space-y-6"><PageHeader title="Calendar" description="Appointments booked by your WhatsApp assistant." actions={<div className="hidden items-center gap-2 rounded-full bg-[#e7fce3] px-3 py-1.5 text-xs font-semibold text-[#075e54] sm:flex"><CalendarDays className="h-4 w-4" />Owner schedule</div>} /><CalendarView initialData={data} /></div>;
}
