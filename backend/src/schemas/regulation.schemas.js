/**
 * Regulation Validation Schemas
 */

import { z } from 'zod';

export const createRegulationSchema = z.object({
  title: z.string()
    .min(3, 'Baslik en az 3 karakter olmalidir')
    .max(300, 'Baslik en fazla 300 karakter olabilir'),
  description: z.string().max(1000).optional().default(''),
  content: z.string().optional().default(''),
  sector: z.string().min(1, 'Sektor gereklidir'),
  category: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  tags: z.array(z.string()).optional().default([]),
  publish_date: z.string().optional(),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(160).optional(),
});

export const updateRegulationSchema = createRegulationSchema.partial();

export const regulationQuerySchema = z.object({
  sector: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(['publish_date', 'created_at', 'title', 'views']).default('publish_date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
