/**
 * Social Media Validation Schemas
 */

import { z } from 'zod';

const platformEnum = z.enum(['linkedin', 'instagram', 'twitter', 'facebook']);

export const postBlogToSocialSchema = z.object({
  platforms: z.array(platformEnum)
    .min(1, 'En az bir platform secmelisiniz'),
  custom_messages: z.record(platformEnum, z.string()).optional(),
});

export const linkedinAuthSchema = z.object({
  redirect_uri: z.string().url('Gecerli bir redirect_uri gereklidir'),
});

export const linkedinShareSchema = z.object({
  content_type: z.string().min(1, 'content_type gereklidir'),
  content_id: z.string().optional(),
  message: z.string().min(1, 'message gereklidir'),
  url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  hashtags: z.array(z.string()).optional(),
});

export const instagramAuthSchema = z.object({
  redirect_uri: z.string().url('Gecerli bir redirect_uri gereklidir'),
});

export const instagramShareSchema = z.object({
  content_type: z.string().min(1, 'content_type gereklidir'),
  content_id: z.string().optional(),
  image_url: z.string().url('image_url gereklidir'),
  caption: z.string().min(1, 'caption gereklidir'),
  hashtags: z.array(z.string()).optional(),
});

export const socialPostSchema = z.object({
  platforms: z.array(platformEnum)
    .min(1, 'En az bir platform gereklidir'),
  content: z.string().min(1, 'Content gereklidir'),
  scheduledFor: z.string().optional(),
});

export const socialSettingsSchema = z.object({
  autoPost: z.boolean().optional().default(false),
  postTypes: z.array(z.string()).optional().default([]),
  hashtags: z.array(z.string()).optional().default([]),
});

export const updateCredentialsSchema = z.object({
  access_token: z.string().optional(),
  organization_id: z.string().optional(),
  business_account_id: z.string().optional(),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  access_token_secret: z.string().optional(),
});
