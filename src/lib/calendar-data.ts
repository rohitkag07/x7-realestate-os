import 'server-only';

import { serviceClientOrNull } from '@/lib/sales-server';
import type { Appointment, ConversationContact } from '@/types/database';

export type CalendarAppointment = Pick<Appointment, 'id' | 'thread_id' | 'contact_id' | 'title' | 'appointment_type' | 'scheduled_at' | 'status' | 'notes'> & {
  contactName: string;
  phone: string;
};

export type CalendarData = {
  appointments: CalendarAppointment[];
  source: 'supabase' | 'demo' | 'error';
  error: string | null;
};

export async function loadCalendarData(): Promise<CalendarData> {
  const client = serviceClientOrNull();
  if (!client) return { source: 'demo', error: null, appointments: demoAppointments() };

  const [appointmentsResult, contactsResult] = await Promise.all([
    (client.from('appointments') as any).select('id,thread_id,contact_id,title,appointment_type,scheduled_at,status,notes').order('scheduled_at', { ascending: true }).limit(500),
    (client.from('conversation_contacts') as any).select('id,name,phone').limit(500),
  ]);
  if (appointmentsResult.error) return { source: 'error', error: appointmentsResult.error.message, appointments: [] };

  const contacts = new Map(((contactsResult.data ?? []) as Pick<ConversationContact, 'id' | 'name' | 'phone'>[]).map((contact) => [contact.id, contact]));
  return {
    source: 'supabase',
    error: null,
    appointments: ((appointmentsResult.data ?? []) as Appointment[]).map((appointment) => ({
      ...appointment,
      contactName: contacts.get(appointment.contact_id)?.name ?? 'WhatsApp contact',
      phone: contacts.get(appointment.contact_id)?.phone ?? 'Phone unavailable',
    })),
  };
}

function demoAppointments(): CalendarAppointment[] {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(11, 0, 0, 0);
  return [{ id: 'demo-appointment-1', thread_id: null, contact_id: 'demo-contact-1', title: 'Property site visit', appointment_type: 'site_visit', scheduled_at: tomorrow.toISOString(), status: 'scheduled', notes: 'Bring the latest price sheet.', contactName: 'Rajesh Sharma', phone: '+91 98111 12201' }];
}
