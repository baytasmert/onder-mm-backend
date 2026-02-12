/**
 * Calculators Routes
 */

import express from 'express';
import * as accounting from '../utils/accounting.js';

const router = express.Router();

// All calculator routes are public

router.post('/income-tax', (req, res) => {
  const { annualIncome } = req.body;
  const result = accounting.calculateIncomeTax(annualIncome);
  res.json(result);
});

router.post('/net-salary', (req, res) => {
  const { grossSalary, hasDisabilityDiscount } = req.body;
  const result = accounting.calculateNetSalary(grossSalary, hasDisabilityDiscount);
  res.json(result);
});

router.post('/gross-salary', (req, res) => {
  const { netSalary, hasDisabilityDiscount } = req.body;
  const result = accounting.calculateGrossSalary(netSalary, hasDisabilityDiscount);
  res.json(result);
});

router.post('/sgk', (req, res) => {
  const { grossSalary } = req.body;
  const result = accounting.calculateSGK(grossSalary);
  res.json(result);
});

// Alias: /sgk-premium -> /sgk
router.post('/sgk-premium', (req, res) => {
  const { grossSalary } = req.body;
  const result = accounting.calculateSGK(grossSalary);
  res.json(result);
});

router.post('/vat', (req, res) => {
  const { amount, rate, includesVAT } = req.body;
  const result = accounting.calculateVAT(amount, rate, includesVAT);
  res.json(result);
});

// Alias: /kdv -> /vat
router.post('/kdv', (req, res) => {
  const { amount, rate, includesVAT } = req.body;
  const result = accounting.calculateVAT(amount, rate, includesVAT);
  res.json(result);
});

router.get('/tax-calendar', (req, res) => {
  const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
  const result = accounting.getTaxCalendar(month);
  res.json(result);
});

router.get('/upcoming-tax-dates', (req, res) => {
  const days = req.query.days ? parseInt(req.query.days) : 30;
  const result = accounting.getUpcomingTaxDates(days);
  res.json(result);
});

export default router;
