import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  resetToken: z.string().min(1).optional(),
  password: z.string().min(8)
});

export const totpVerifySchema = z.object({
  code: z.string().min(6).max(8)
});
