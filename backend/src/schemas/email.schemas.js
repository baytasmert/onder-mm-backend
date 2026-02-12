/**
 * Email Validation Schemas
 */

import { z } from 'zod';

export const sendBulkSchema = z.object({
  subject: z.string().min(1, 'Konu gereklidir').max(200),
  content: z.string().min(1, 'İçerik gereklidir'),
  template_id: z.string().optional(),
});

export const sendSelectedSchema = z.object({
  subscriber_ids: z.array(z.string()).min(1, 'En az bir abone seçilmelidir'),
  subject: z.string().min(1, 'Konu gereklidir').max(200),
  content: z.string().min(1, 'İçerik gereklidir'),
  template_id: z.string().optional(),
});

export const sendSingleSchema = z.object({
  to_email: z.string().email('Geçerli bir email adresi giriniz'),
  subject: z.string().min(1, 'Konu gereklidir').max(200),
  content: z.string().min(1, 'İçerik gereklidir'),
  template_id: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Şablon adı gereklidir').max(100),
  subject: z.string().min(1, 'Konu gereklidir').max(200),
  content: z.string().min(1, 'İçerik gereklidir'),
  category: z.enum(['newsletter', 'notification', 'announcement', 'custom']).default('custom'),
  variables: z.array(z.string()).optional().default([]),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(['newsletter', 'notification', 'announcement', 'custom']).optional(),
  variables: z.array(z.string()).optional(),
});

export const testEmailSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
});

export const welcomeEmailSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  name: z.string().max(100).optional(),
});

export const blogNotificationSchema = z.object({
  blogId: z.string().min(1, 'Blog ID gereklidir'),
  recipientFilter: z.enum(['all', 'active', 'tagged']).default('all'),
});

export const regulationNotificationSchema = z.object({
  regulationId: z.string().min(1, 'Regulation ID gereklidir'),
  recipientFilter: z.enum(['all', 'active', 'tagged']).default('all'),
});

export const customCampaignSchema = z.object({
  title: z.string().max(200).optional(),
  subject: z.string().min(1, 'Konu gereklidir').max(200),
  html: z.string().min(1, 'HTML içerik gereklidir'),
  recipientFilter: z.enum(['all', 'active', 'tagged']).default('all'),
  scheduleTime: z.string().optional(),
});
