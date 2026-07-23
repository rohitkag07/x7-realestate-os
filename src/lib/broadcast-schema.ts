import { z } from 'zod';

export const templateButtonSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('QUICK_REPLY'),
    text: z.string().trim().min(1).max(25),
  }),
  z.object({
    type: z.literal('PHONE_NUMBER'),
    text: z.string().trim().min(1).max(25),
    phone_number: z.string().trim().min(8).max(20),
  }),
  z.object({
    type: z.literal('URL'),
    text: z.string().trim().min(1).max(25),
    url: z.string().trim().url().max(2000),
  }),
]);

export const templateComponentSchema = z.object({
  type: z.enum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']),
  format: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']).optional(),
  text: z.string().trim().max(1024).optional(),
  example: z.record(z.unknown()).optional(),
  buttons: z.array(templateButtonSchema).max(3).optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(3).max(512).regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores.'),
  language: z.string().trim().min(2).max(20).default('en_US'),
  category: z.enum(['MARKETING', 'UTILITY']),
  components: z.array(templateComponentSchema).min(1).max(4),
});

export const createBroadcastSchema = z.object({
  name: z.string().trim().min(3).max(120),
  template_id: z.string().uuid(),
  audience_type: z.enum(['all_contacts', 'stage', 'category', 'selected_contacts']),
  audience_filter: z.object({
    stages: z.array(z.enum(['new', 'interested', 'negotiating', 'booked', 'lost', 'cold'])).max(6).optional(),
    category: z.enum(['real_estate', 'clinic', 'coaching', 'gym', 'local_service', 'other']).optional(),
    contact_ids: z.array(z.string().uuid()).max(1000).optional(),
  }).default({}),
  variable_mapping: z.record(z.string().trim().min(1).max(120)).default({}),
  scheduled_at: z.string().datetime().optional().nullable(),
  send_now: z.boolean().default(false),
});

export type TemplateButton = z.infer<typeof templateButtonSchema>;
export type TemplateComponent = z.infer<typeof templateComponentSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;

export function extractTemplateVariables(components: TemplateComponent[]) {
  const variables = new Set<number>();
  components.forEach((component) => {
    for (const match of component.text?.matchAll(/\{\{(\d+)\}\}/g) ?? []) {
      variables.add(Number(match[1]));
    }
  });
  return [...variables].sort((left, right) => left - right);
}
