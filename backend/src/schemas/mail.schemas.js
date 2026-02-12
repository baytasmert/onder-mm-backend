/**
 * Mail Route Validation Schemas
 */

import { z } from 'zod';

export const sendNewsletterSchema = z.object({
  type: z.enum(['blog', 'regulation'], { required_error: 'Type gereklidir' }),
  item_id: z.string().min(1, 'item_id gereklidir'),
  subject: z.string().max(200).optional(),
  preview_text: z.string().max(300).optional(),
});

export const sendToSelectedSchema = z.object({
  type: z.enum(['blog', 'regulation']),
  item_id: z.string().min(1, 'item_id gereklidir'),
  subscriber_ids: z.array(z.string()).min(1, 'En az bir abone secmelisiniz'),
  subject: z.string().max(200).optional(),
});

export const sendToSingleSchema = z.object({
  type: z.enum(['blog', 'regulation']),
  item_id: z.string().min(1, 'item_id gereklidir'),
  email: z.string().email('Gecerli bir email adresi giriniz'),
  subject: z.string().max(200).optional(),
});

export const sendTestSchema = z.object({
  type: z.enum(['blog', 'regulation']),
  item_id: z.string().min(1, 'item_id gereklidir'),
  test_email: z.string().email().optional(),
});
