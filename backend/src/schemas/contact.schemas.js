/**
 * Contact & Subscriber Validation Schemas
 */

import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string()
    .min(2, 'İsim en az 2 karakter olmalıdır')
    .max(100, 'İsim en fazla 100 karakter olabilir'),
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .transform(v => v.toLowerCase().trim()),
  phone: z.string()
    .regex(/^(\+90|0)?[0-9]{10}$/, 'Geçerli bir telefon numarası giriniz')
    .optional()
    .or(z.literal('')),
  company: z.string().max(200).optional().or(z.literal('')),
  subject: z.string()
    .min(3, 'Konu en az 3 karakter olmalıdır')
    .max(200),
  message: z.string()
    .min(10, 'Mesaj en az 10 karakter olmalıdır')
    .max(5000, 'Mesaj en fazla 5000 karakter olabilir'),
  kvkk_consent: z.boolean().refine(v => v === true, {
    message: 'KVKK onayı gereklidir',
  }).optional(),
  marketing_consent: z.boolean().optional(),
  honeypot: z.string().optional(),
});

export const subscribeSchema = z.object({
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .transform(v => v.toLowerCase().trim()),
  name: z.string().min(1).max(100).optional(),
});

export const unsubscribeSchema = z.object({
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .transform(v => v.toLowerCase().trim()),
  token: z.string().optional(),
});
