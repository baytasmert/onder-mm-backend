/**
 * Calculators API Integration Tests
 */

import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Calculators API', () => {
  describe('POST /calculators/income-tax', () => {
    it('should calculate income tax correctly', async () => {
      const res = await request(API_URL)
        .post('/calculators/income-tax')
        .send({ annualIncome: 500000 })
        .expect(200);

      expect(res.body).toHaveProperty('annualIncome', 500000);
      expect(res.body).toHaveProperty('totalTax');
      expect(res.body).toHaveProperty('netIncome');
      expect(res.body).toHaveProperty('effectiveRate');
      expect(res.body).toHaveProperty('brackets');
      expect(Array.isArray(res.body.brackets)).toBe(true);
    });

    it('should handle zero income', async () => {
      const res = await request(API_URL)
        .post('/calculators/income-tax')
        .send({ annualIncome: 0 })
        .expect(200);

      expect(res.body.totalTax).toBe(0);
      expect(res.body.netIncome).toBe(0);
    });
  });

  describe('POST /calculators/net-salary', () => {
    it('should calculate net salary from gross', async () => {
      const res = await request(API_URL)
        .post('/calculators/net-salary')
        .send({
          grossSalary: 50000,
          hasDisabilityDiscount: false
        })
        .expect(200);

      expect(res.body).toHaveProperty('grossSalary', 50000);
      expect(res.body).toHaveProperty('netSalary');
      expect(res.body).toHaveProperty('deductions');
      expect(res.body.deductions).toHaveProperty('sgk_employee');
      expect(res.body.deductions).toHaveProperty('income_tax');
    });
  });

  describe('POST /calculators/gross-salary', () => {
    it('should calculate gross salary from net', async () => {
      const res = await request(API_URL)
        .post('/calculators/gross-salary')
        .send({
          netSalary: 35000,
          hasDisabilityDiscount: false
        })
        .expect(200);

      expect(res.body).toHaveProperty('netSalary', 35000);
      expect(res.body).toHaveProperty('grossSalary');
      expect(res.body.grossSalary).toBeGreaterThan(35000);
    });
  });

  describe('POST /calculators/vat', () => {
    it('should calculate VAT correctly (excluding VAT)', async () => {
      const res = await request(API_URL)
        .post('/calculators/vat')
        .send({
          amount: 100,
          rate: 20,
          includesVAT: false
        })
        .expect(200);

      expect(res.body).toHaveProperty('vat', 20);
      expect(res.body).toHaveProperty('total', 120);
      expect(res.body).toHaveProperty('base', 100);
    });

    it('should calculate VAT correctly (including VAT)', async () => {
      const res = await request(API_URL)
        .post('/calculators/vat')
        .send({
          amount: 120,
          rate: 20,
          includesVAT: true
        })
        .expect(200);

      expect(res.body).toHaveProperty('base', 100);
      expect(res.body).toHaveProperty('vat', 20);
      expect(res.body).toHaveProperty('total', 120);
    });
  });

  describe('GET /calculators/tax-calendar', () => {
    it('should return tax calendar for current month', async () => {
      const res = await request(API_URL)
        .get('/calculators/tax-calendar')
        .expect(200);

      expect(res.body).toHaveProperty('calendar');
      expect(Array.isArray(res.body.calendar)).toBe(true);
    });

    it('should return tax calendar for specific month', async () => {
      const res = await request(API_URL)
        .get('/calculators/tax-calendar?month=1')
        .expect(200);

      expect(res.body).toHaveProperty('calendar');
      expect(Array.isArray(res.body.calendar)).toBe(true);
    });
  });

  describe('GET /calculators/upcoming-tax-dates', () => {
    it('should return upcoming tax dates', async () => {
      const res = await request(API_URL)
        .get('/calculators/upcoming-tax-dates')
        .expect(200);

      expect(res.body).toHaveProperty('dates');
      expect(Array.isArray(res.body.dates)).toBe(true);
    });

    it('should respect days parameter', async () => {
      const res = await request(API_URL)
        .get('/calculators/upcoming-tax-dates?days=7')
        .expect(200);

      expect(res.body).toHaveProperty('dates');
    });
  });
});
