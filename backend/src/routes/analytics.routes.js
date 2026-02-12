/**
 * Analytics Routes
 * Dashboard, summary, mail campaigns, and performance analytics
 */

import express from 'express';
import { asyncHandler } from '../../middlewares.js';
import * as analyticsModel from '../models/settingsAnalyticsModel.js';
import * as mailService from '../services/mailService.js';
import { sendSuccess } from '../utils/response.js';

const router = express.Router();

// GET /analytics/dashboard - Main analytics dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const dashboard = await analyticsModel.getAnalyticsDashboard(parseInt(days));
  return sendSuccess(res, dashboard);
}));

// GET /analytics/summary - Analytics summary (page stats + visitors)
router.get('/summary', asyncHandler(async (req, res) => {
  const [pageStats, visitors] = await Promise.all([
    analyticsModel.getPageStatistics(),
    analyticsModel.getVisitorAnalytics(),
  ]);

  return sendSuccess(res, {
    pages: pageStats,
    visitors,
  });
}));

// GET /analytics/mail-campaigns - Mail campaign analytics
router.get('/mail-campaigns', asyncHandler(async (req, res) => {
  const stats = await mailService.getCampaignStats();
  return sendSuccess(res, stats);
}));

// GET /analytics/performance - Blog/content performance
router.get('/performance', asyncHandler(async (req, res) => {
  const blogPerformance = await analyticsModel.getBlogPerformance();
  return sendSuccess(res, { blog: blogPerformance });
}));

export default router;
