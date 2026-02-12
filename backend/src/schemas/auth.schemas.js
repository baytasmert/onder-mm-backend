/**
 * Auth Validation Schemas
 * Zod schemas for authentication endpoints
 */

import { z } from 'zod';

export const signinSchema = z.object({
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .transform(v => v.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Şifre gereklidir'),
});

export const signupAdminSchema = z.object({
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .transform(v => v.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalıdır'),
  name: z.string().min(1).optional(),
});

export const sessionSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token gereklidir'),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .transform(v => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gereklidir'),
  newPassword: z.string()
    .min(8, 'Yeni şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir'),
});
