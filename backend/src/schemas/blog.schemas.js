/**
 * Blog Validation Schemas
 */

import { z } from 'zod';

export const createBlogSchema = z.object({
  title: z.string()
    .min(3, 'Başlık en az 3 karakter olmalıdır')
    .max(200, 'Başlık en fazla 200 karakter olabilir'),
  content: z.string()
    .min(10, 'İçerik en az 10 karakter olmalıdır'),
  category: z.string().min(1, 'Kategori gereklidir'),
  tags: z.union([
    z.array(z.string()),
    z.string(),
  ]).optional().default([]),
  excerpt: z.string().max(500).optional(),
  featured_image: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
  publish_date: z.string().datetime().optional(),
  meta_title: z.string().max(70).optional(),
  meta_description: z.string().max(160).optional(),
  meta_keywords: z.array(z.string()).optional(),
  og_image: z.string().optional(),
  is_featured: z.boolean().optional().default(false),
  allow_comments: z.boolean().optional().default(true),
});

export const updateBlogSchema = createBlogSchema.partial();

export const blogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'published', 'scheduled', 'all']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['created_at', 'updated_at', 'title', 'views']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
