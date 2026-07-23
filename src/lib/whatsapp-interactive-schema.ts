import { z } from 'zod';

export const interactiveReplyButtonSchema = z.object({
  id: z.string().trim().min(1).max(256),
  title: z.string().trim().min(1).max(20),
  payload: z.string().trim().min(1).max(256),
});

export const interactiveReplyButtonsSchema = z.array(interactiveReplyButtonSchema).max(3).superRefine((buttons, context) => {
  const ids = new Set<string>();
  buttons.forEach((button, index) => {
    if (ids.has(button.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'id'],
        message: 'Button IDs must be unique.',
      });
    }
    ids.add(button.id);
  });
});

export type InteractiveReplyButton = z.infer<typeof interactiveReplyButtonSchema>;
