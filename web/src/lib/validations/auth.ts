import { z } from 'zod';
import {
  isValidEmail,
  validatePassword,
  isValidName,
  isValidDateOfBirth,
  isValidPhone,
} from '@core/auth/auth-utils';

/**
 * Login Validation Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine(isValidEmail, 'Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  captchaToken: z.string().min(1, 'Please complete the CAPTCHA verification').optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Forgot Password Validation Schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine(isValidEmail, 'Please enter a valid email address'),
  captchaToken: z.string().min(1, 'Please complete the CAPTCHA verification').optional(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset Password Validation Schema
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .superRefine((val, ctx) => {
        const res = validatePassword(val);
        if (!res.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: res.error || 'Password does not meet required policy',
          });
        }
      }),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Registration Validation Schema
 */
export const registerSchema = z
  .object({
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
    email: z
      .string()
      .min(1, 'Email is required')
      .refine(isValidEmail, 'Please enter a valid email address'),
    countryCode: z.string().min(1, 'Country code is required'),
    phone: z.string().min(1, 'Phone number is required'),
    dateOfBirth: z
      .string()
      .min(1, 'Date of birth is required')
      .superRefine((val, ctx) => {
        const res = isValidDateOfBirth(val);
        if (!res.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: res.error || 'Invalid date of birth format',
          });
        }
      }),
    gender: z
      .string()
      .min(1, 'Please select a gender')
      .refine((val) => val === 'male' || val === 'female', {
        message: 'Please select a gender',
      }),
    password: z
      .string()
      .min(1, 'Password is required')
      .superRefine((val, ctx) => {
        const res = validatePassword(val);
        if (!res.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: res.error || 'Password does not meet required policy',
          });
        }
      }),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    captchaToken: z.string().min(1, 'Please complete the CAPTCHA verification').optional(),
  })
  .superRefine((data, ctx) => {
    // Cross-field phone validation
    const res = isValidPhone(data.countryCode, data.phone);
    if (!res.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error || 'Invalid phone number format',
        path: ['phone'],
      });
    }

    // Passwords match validation
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
