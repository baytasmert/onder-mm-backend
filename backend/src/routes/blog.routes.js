/**
 * Blog Routes
 */

import express from 'express';
import * as blogController from '../controllers/blogController.js';

const router = express.Router();

// Public routes
router.get('/', blogController.getAllBlogPosts);
router.get('/categories', blogController.getBlogCategories);
router.get('/:slug', blogController.getBlogPostBySlug);

// Protected routes (admin only - auth middleware added in server.js)
router.get('/stats', blogController.getBlogStats);
router.post('/', blogController.createBlogPost);
router.put('/:id', blogController.updateBlogPost);
router.delete('/:id', blogController.deleteBlogPost);

export default router;
