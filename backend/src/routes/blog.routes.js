/**
 * Blog Routes
 */

import express from 'express';
import * as blogController from '../controllers/blogController.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { createBlogSchema, updateBlogSchema, blogQuerySchema } from '../schemas/blog.schemas.js';

const router = express.Router();

// Public routes (specific before parameterized!)
router.get('/categories', asyncHandler(blogController.getBlogCategories));
router.get('/stats', asyncHandler(blogController.getBlogStats));
router.get('/', validateQuery(blogQuerySchema), asyncHandler(blogController.getAllBlogPosts));
router.get('/:slug', asyncHandler(blogController.getBlogPostBySlug));

// Protected routes (admin only - auth middleware in server.js)
router.post('/', validateBody(createBlogSchema), asyncHandler(blogController.createBlogPost));
router.put('/:id', validateBody(updateBlogSchema), asyncHandler(blogController.updateBlogPost));
router.delete('/:id', asyncHandler(blogController.deleteBlogPost));

export default router;
