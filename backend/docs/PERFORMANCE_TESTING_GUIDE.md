# 🧪 Performance Testing Guide

**Version:** 2.0.0  
**Purpose:** Load testing, stress testing, and performance validation  
**Target:** Production readiness verification  

---

## 📋 Overview

Performance testing ensures the backend can handle production traffic safely. This guide covers:

1. **Load Testing** - Normal traffic simulation
2. **Stress Testing** - Maximum capacity identification
3. **Spike Testing** - Sudden traffic increases
4. **Memory Leak Testing** - Long-running stability
5. **Real-time Monitoring** - During test execution

---

## 1. Load Testing with k6

### Installation

```bash
# Ubuntu/Debian
sudo apt-get install -y golang-go git
go install github.com/grafana/k6@latest
export PATH=$PATH:$(go env GOPATH)/bin

# macOS
brew install k6

# Windows
choco install k6

# Verify installation
k6 version
```

### Create Load Test Script

Create `k6-load-test.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const successRate = new Rate('request_success_rate');
const responseTimes = new Trend('response_time');

export let options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp-up to 10 users
    { duration: '3m', target: 100 },  // Ramp-up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 50 },   // Ramp-down to 50 users
    { duration: '1m', target: 0 },    // Ramp-down to 0 users
  ],
  thresholds: {
    'request_success_rate': ['p(95) > 0.95'],  // 95% success rate
    'response_time': ['p(95) < 500'],          // 95% responses < 500ms
    'http_req_failed': ['rate < 0.05'],        // < 5% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  // Test GET /api/v1/blog (public endpoint)
  let res = http.get(`${BASE_URL}/api/v1/blog`);
  successRate.add(res.status === 200);
  responseTimes.add(res.timings.duration);
  check(res, {
    'Blog GET status 200': (r) => r.status === 200,
    'Blog response time < 1s': (r) => r.timings.duration < 1000,
  });
  sleep(1);

  // Test GET /api/v1/regulations (public endpoint)
  res = http.get(`${BASE_URL}/api/v1/regulations`);
  successRate.add(res.status === 200);
  responseTimes.add(res.timings.duration);
  check(res, {
    'Regulations GET status 200': (r) => r.status === 200,
  });
  sleep(1);

  // Test GET /api/v1/performance/health (public endpoint)
  res = http.get(`${BASE_URL}/api/v1/performance/health`);
  successRate.add(res.status === 200);
  responseTimes.add(res.timings.duration);
  check(res, {
    'Health check status 200': (r) => r.status === 200,
  });
  sleep(1);

  // Test POST /api/v1/auth/signin (requires valid credentials)
  const payload = JSON.stringify({
    email: 'admin@example.com',
    password: 'password123',
  });
  res = http.post(`${BASE_URL}/api/v1/auth/signin`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Auth signin allowed or denied': (r) => r.status === 200 || r.status === 401,
  });
  sleep(2);
}
```

### Run Load Test

```bash
# Basic load test
k6 run k6-load-test.js

# With environment variable
BASE_URL=https://api.yourdomain.com k6 run k6-load-test.js

# With output to file
k6 run k6-load-test.js --out json=results.json

# With live dashboard
k6 run k6-load-test.js --out web-dashboard
```

### Analyze Results

```bash
# Results show:
# - Total requests
# - Success rate
# - Response time percentiles (p50, p95, p99)
# - Error count and types
# - Memory usage trends
```

---

## 2. Stress Testing with Artillery

### Installation

```bash
# npm install globally
npm install -g artillery

# Verify installation
artillery --version
```

### Create Stress Test Script

Create `artillery-stress.yml`:
```yaml
config:
  target: "{{ $processEnvironment.BASE_URL || 'http://localhost:5000' }}"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 25
      name: "Ramp up"
    - duration: 300
      arrivalRate: 50
      name: "High load"
    - duration: 60
      arrivalRate: 100
      name: "Stress"
    - duration: 60
      arrivalRate: 0
      name: "Cool down"
  variables:
    adminEmail: "admin@example.com"
    adminPassword: "password123"
  processor: "./artillery-processor.js"
  defaults:
    headers:
      Accept: "application/json"

scenarios:
  - name: "Public API Flow"
    flow:
      - get:
          url: "/api/v1/blog"
          expect:
            - statusCode: 200
      - think: 5
      - get:
          url: "/api/v1/regulations"
          expect:
            - statusCode: 200
      - think: 5
      - get:
          url: "/api/v1/performance/health"
          expect:
            - statusCode: 200

  - name: "Authentication Flow"
    flow:
      - post:
          url: "/api/v1/csrf-token"
          capture:
            json: "$.token"
            as: "csrfToken"
      - think: 1
      - post:
          url: "/api/v1/auth/signin"
          json:
            email: "{{ adminEmail }}"
            password: "{{ adminPassword }}"
          expect:
            - statusCode: [200, 401]
          capture:
            json: "$.data.token"
            as: "authToken"
      - think: 5

  - name: "Static Content"
    flow:
      - get:
          url: "/api/v1/uploads/images/sample.jpg"
          expect:
            - statusCode: [200, 404]
      - think: 3
```

Create `artillery-processor.js`:
```javascript
module.exports = {
  setup: function(context) {
    console.log('Starting stress test...');
  },
  teardown: function(context) {
    console.log('Stress test completed');
  },
};
```

### Run Stress Test

```bash
# Basic stress test
artillery run artillery-stress.yml

# With summary output
artillery run artillery-stress.yml --output results.json
artillery report results.json

# With detailed output
artillery run artillery-stress.yml -t api.yourdomain.com -d 120 -r 50
```

---

## 3. Memory Leak Testing

### Long-Running Test Script

Create `memory-leak-test.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,                    // 10 concurrent users
  duration: '2h',             // Run for 2 hours
  thresholds: {
    'http_req_failed': ['rate < 0.05'],  // Allow < 5% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
let requestCount = 0;

export default function () {
  requestCount++;

  // Cycle through different endpoints
  const endpoints = [
    '/api/v1/blog',
    '/api/v1/regulations',
    '/api/v1/performance/health',
    '/api/v1/system/stats',
  ];

  const endpoint = endpoints[requestCount % endpoints.length];
  const res = http.get(`${BASE_URL}${endpoint}`);

  check(res, {
    'Status 200': (r) => r.status === 200,
    'Response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(5);
}
```

### Run Memory Leak Test

```bash
# Run for 2 hours and monitor memory
BASE_URL=http://localhost:5000 k6 run --vus 10 --duration 2h memory-leak-test.js

# Monitor server memory during test
# In another terminal:
watch -n 1 'ps aux | grep node | grep -v grep'
# Or with PM2:
pm2 monit
```

### Check for Memory Leaks

Memory is leaking if:
- ❌ Heap size continuously increases
- ❌ GC events don't recover memory
- ❌ Process grows to 100%+ of allocated memory
- ❌ Errors appear in logs as memory fills

Memory is healthy if:
- ✅ Heap size stabilizes within 10% variance
- ✅ GC events recover 20-30% of memory
- ✅ Error rate remains < 5%
- ✅ No out-of-memory crashes

---

## 4. Real-time Monitoring During Tests

### Terminal 1: Start Server
```bash
# With performance monitoring
pm2 start ecosystem.config.js
pm2 monit                 # Real-time monitoring
```

### Terminal 2: Monitor Metrics Endpoint
```bash
# Watch metrics every 10 seconds
watch -n 10 'curl -s http://localhost:5000/api/v1/performance/metrics | jq .'

# Or continuous stream
while true; do
  echo "=== $(date) ==="
  curl -s http://localhost:5000/api/v1/performance/health | jq '.memory'
  sleep 10
done
```

### Terminal 3: Run Load Test
```bash
# k6 load test
k6 run k6-load-test.js

# Or Artillery
artillery run artillery-stress.yml
```

### Terminal 4: Check Logs
```bash
# Real-time log monitoring
tail -f logs/combined.log | grep -E "memory|request|error"
```

---

## 5. Performance Benchmarks

### Expected Performance

**Hardware:** 2GB RAM, 2 CPU cores (minimum)

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Avg Response Time | < 200ms | 200-500ms | > 500ms |
| p95 Response Time | < 500ms | 500-1000ms | > 1000ms |
| Error Rate | < 1% | 1-5% | > 5% |
| Memory Usage | < 70% | 70-85% | > 85% |
| CPU Usage | < 60% | 60-85% | > 85% |
| Requests/sec | > 1000 | 500-1000 | < 500 |

### Target Performance

- **Throughput:** 1,000+ requests/second
- **Concurrency:** 500+ simultaneous users
- **Response Time:** p95 < 500ms
- **Memory Stability:** Stable within 10% variance
- **Uptime:** 99.9%+

---

## 6. Test Automation

### GitHub Actions CI/CD

Create `.github/workflows/performance-test.yml`:
```yaml
name: Performance Testing

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start server
        run: npm start &
      
      - name: Wait for server
        run: sleep 5
      
      - name: Install k6
        run: sudo apt-get install -y k6
      
      - name: Run load test
        run: k6 run k6-load-test.js
      
      - name: Generate report
        if: always()
        run: |
          mkdir -p reports
          cp k6-results.json reports/
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: reports/
```

---

## 7. Performance Optimization Tips

Based on test results:

### If Response Time High
1. Add database indexing
2. Enable Redis caching
3. Optimize database queries (use EXPLAIN)
4. Reduce API payload size
5. Add compression

### If Memory Usage High
1. Reduce cache size
2. Implement cache eviction
3. Check for memory leaks (circular references)
4. Use streaming for large responses
5. Increase heap allocation

### If Error Rate High
1. Increase rate limiting thresholds
2. Check server logs for errors
3. Verify database connectivity
4. Test error handling
5. Check for resource constraints

### If Throughput Low
1. Increase server capacity
2. Use load balancing/clustering
3. Optimize event loop (reduce blocking operations)
4. Use connection pooling
5. Enable HTTP keep-alive

---

## 8. Continuous Performance Monitoring

### Set Up Alerts

```bash
# Monitor endpoint that triggers alert if unhealthy
curl -s http://localhost:5000/api/v1/performance/health | jq '.status' | grep -q degraded && \
  echo "ALERT: Server degraded" && \
  send_alert_email
```

### Dashboard Creation

```javascript
// Create performance dashboard at /dashboard
// Shows real-time metrics from /api/v1/performance/metrics
// Charts: Memory usage, request rate, response times, error rate
```

---

## 9. Load Test Results Analysis

### Key Metrics to Track

1. **Response Time Percentiles**
   - p50 (median)
   - p95 (acceptable threshold)
   - p99 (worst case)

2. **Throughput**
   - Requests per second
   - Bytes transferred
   - Transaction rate

3. **Resource Usage**
   - CPU percentage
   - Memory usage
   - Disk I/O
   - Network I/O

4. **Error Metrics**
   - Error rate
   - Error types
   - Failed requests

5. **Concurrent Users**
   - Peak concurrent users
   - User ramp-up rate
   - Session duration

---

## 10. Pre-Production Validation Checklist

- [ ] Load test with 500+ concurrent users
- [ ] Stress test to identify breaking point
- [ ] Memory leak test running 2+ hours without issues
- [ ] Response times p95 < 500ms under normal load
- [ ] Error rate < 1% under normal load
- [ ] Error rate < 5% under stress load
- [ ] Memory stable (< 10% variance)
- [ ] All endpoints responding correctly
- [ ] Rate limiting working as expected
- [ ] Database connections stable
- [ ] Backups completing successfully
- [ ] Monitoring alerts configured
- [ ] Logging capturing all important events

---

## 11. Production Monitoring

Once deployed:

1. **Daily Checks**
   - Monitor error logs
   - Check memory trends
   - Verify backup completion

2. **Weekly Checks**
   - Review performance metrics
   - Analyze user load patterns
   - Check security logs

3. **Monthly Checks**
   - Full performance review
   - Capacity planning
   - Test disaster recovery

---

## Summary

Performance testing is critical for production readiness. Use these tools to:

✅ Validate capacity  
✅ Identify bottlenecks  
✅ Prevent outages  
✅ Optimize resources  
✅ Ensure reliability  

---

**Next Steps:**
1. Run load test today
2. Analyze results
3. Optimize based on findings
4. Run stress test
5. Verify memory stability
6. Deploy to production with confidence

---

**Last Updated:** 2024  
**Status:** Ready for Production Testing ✅
