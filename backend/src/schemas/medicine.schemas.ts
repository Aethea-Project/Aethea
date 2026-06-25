import { z } from 'zod';

export const SearchMedicinesSchema = z.object({
  category: z.string().optional(),
  query:    z.string().optional(),
  matchStatus: z.enum(['all', 'clear', 'warning']).optional(),
  page:     z.coerce.number().min(1).default(1),
  limit:    z.coerce.number().min(1).max(50).default(20),
}).strict();

export const SetConditionsSchema = z.object({
  conditions: z.array(
    z.enum([
      'diabetes',
      'prediabetes',
      'hypertension',
      'heart_disease',
      'kidney_disease'
    ])
  ),
  source: z.enum(['manual', 'lab_result']).default('manual'),
}).strict();

export type SearchMedicinesInput = z.infer<typeof SearchMedicinesSchema>;
export type SetConditionsInput   = z.infer<typeof SetConditionsSchema>;