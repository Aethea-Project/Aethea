import { z } from 'zod';
import {
  isValidEmail,
  isValidName,
} from '@core/auth/auth-utils';

/**
 * Admin Create Staff Schema
 */
export const createStaffSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine(isValidEmail, 'Please enter a valid email address'),
  accountType: z.enum(['doctor', 'pharmacist'], {
    message: 'Please select a valid account type',
  }),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .superRefine((val, ctx) => {
      const res = isValidName(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || 'Invalid first name format',
        });
      }
    }),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .superRefine((val, ctx) => {
      const res = isValidName(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || 'Invalid last name format',
        });
      }
    }),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/**
 * Admin Update User Profile Schema
 */
export const adminUpdateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .superRefine((val, ctx) => {
      const res = isValidName(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || 'Invalid first name format',
        });
      }
    }),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .superRefine((val, ctx) => {
      const res = isValidName(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || 'Invalid last name format',
        });
      }
    }),
  phone: z.string().optional().or(z.literal('')).or(z.null()),
});

export type AdminUpdateProfileInput = z.infer<typeof adminUpdateProfileSchema>;
