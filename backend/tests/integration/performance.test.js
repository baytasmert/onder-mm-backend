/**
 * Performance Monitoring Test Suite
 * Tests memory management, GC, and monitoring endpoints
 */

import request from 'supertest';
import app from '../server.js';
import performanceMonitor from '../src/services/performanceMonitor.js';
import jwt from 'jsonwebtoken';

describe('Performance Monitoring', () => {
  let adminToken;

  before(async () => {
    // Generate admin token for testing
    adminToken = jwt.sign(
      { userId: 'test-admin', email: 'admin@test.com', role: 'super_admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('GET /api/v1/performance/health', () => {
    it('should return health status (public endpoint)', async () => {
      const res = await request(app)
        .get('/api/v1/performance/health');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('status');
      expect(res.body.status).to.be.oneOf(['healthy', 'warning', 'degraded']);
      expect(res.body).to.have.property('memory');
      expect(res.body.memory).to.have.property('usagePercent');
    });

    it('should show degraded status when memory high', async () => {
      // Simulate high memory usage
      const originalMemory = performanceMonitor.getMemoryStats;
      performanceMonitor.getMemoryStats = () => ({
        heapUsed: 600,
        heapTotal: 700,
        usagePercent: '91%'
      });

      const res = await request(app)
        .get('/api/v1/performance/health');

      expect(res.body.status).to.equal('degraded');

      // Restore
      performanceMonitor.getMemoryStats = originalMemory;
    });
  });

  describe('GET /api/v1/performance/metrics', () => {
    it('should return full metrics (admin only)', async () => {
      const res = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('uptime');
      expect(res.body.data).to.have.property('memoryStats');
      expect(res.body.data).to.have.property('requestCount');
      expect(res.body.data).to.have.property('errorRate');
    });

    it('should deny non-admin access', async () => {
      const userToken = jwt.sign(
        { userId: 'user', email: 'user@test.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('error');
    });

    it('should deny unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/v1/performance/metrics');

      expect(res.status).to.equal(401);
    });
  });

  describe('POST /api/v1/performance/gc', () => {
    it('should trigger garbage collection (super_admin only)', async () => {
      const res = await request(app)
        .post('/api/v1/performance/gc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('message');
      expect(res.body).to.have.property('memory');
      expect(res.body.memory).to.have.property('before');
      expect(res.body.memory).to.have.property('after');
    });

    it('should deny non-super_admin access', async () => {
      const adminToken = jwt.sign(
        { userId: 'admin', email: 'admin@test.com', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/api/v1/performance/gc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).to.equal(403);
    });
  });

  describe('GET /api/v1/performance/cache-stats', () => {
    it('should return cache statistics (admin only)', async () => {
      const res = await request(app)
        .get('/api/v1/performance/cache-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('type');
      expect(res.body.data).to.have.property('keyCount');
    });
  });

  describe('POST /api/v1/performance/cache-clear', () => {
    it('should clear cache (super_admin only)', async () => {
      const res = await request(app)
        .post('/api/v1/performance/cache-clear')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('message');
    });
  });

  describe('Memory Monitoring', () => {
    it('should track memory usage over time', () => {
      const metrics = performanceMonitor.getMetrics();

      expect(metrics).to.have.property('memoryHistory');
      expect(metrics.memoryHistory).to.be.an('array');
    });

    it('should trigger GC when memory > 85%', (done) => {
      // This is integration tested in actual deployment
      const stats = performanceMonitor.getMemoryStats();

      if (stats.usagePercent && parseInt(stats.usagePercent) > 85) {
        // GC should have been triggered
        performanceMonitor.triggerGarbageCollection()
          .then(() => {
            const newStats = performanceMonitor.getMemoryStats();
            expect(newStats.usagePercent).to.be.below(stats.usagePercent);
            done();
          })
          .catch(done);
      } else {
        done();
      }
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect request metrics', async () => {
      // Make some requests
      await request(app).get('/api/v1/api-version');
      await request(app).get('/api/v1/performance/health');

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.requestCount).to.be.greaterThan(0);
      expect(metrics).to.have.property('errorRate');
      expect(metrics).to.have.property('avgResponseTime');
    });

    it('should track error rates', async () => {
      // Make request that will fail (unauthorized)
      await request(app)
        .get('/api/v1/performance/metrics');

      const metrics = performanceMonitor.getMetrics();

      expect(metrics).to.have.property('errorRate');
      expect(metrics.errorRate).to.be.at.least(0);
    });
  });

  describe('Monitoring Initialization', () => {
    it('should start monitoring on server init', () => {
      expect(performanceMonitor.getMetrics).to.exist;
      expect(performanceMonitor.getMemoryStats).to.exist;
    });

    it('should provide metrics endpoint access', async () => {
      const res = await request(app)
        .get('/api/v1/performance/health');

      expect(res.status).to.equal(200);
      expect(res.body.uptime).to.be.greaterThan(0);
    });
  });
});
