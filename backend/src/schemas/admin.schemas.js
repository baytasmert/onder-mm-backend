/**
 * Admin Validation Schemas
 */

import { z } from 'zod';

export const createAdminSchema = z.object({
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .transform(v => v.toLowerCase().trim()),
  name: z.string()
    .min(1, 'İsim gereklidir')
    .max(100),
  role: z.enum(['admin', 'super_admin', 'editor', 'viewer']).default('admin'),
});

export const updateAdminSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().transform(v => v.toLowerCase().trim()).optional(),
  role: z.enum(['admin', 'super_admin', 'editor', 'viewer']).optional(),
});

export const updateSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  companyEmail: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});
