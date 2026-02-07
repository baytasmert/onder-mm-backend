# 🔧 Troubleshooting Guide - Önder Denetim Backend

## Issue: High Memory Usage (90%+)

### Symptoms
- Server logs show: `⚠️  High memory usage - applying stricter rate limits`
- Memory usage constantly between 90-94%
- API requests returning 503 "Service temporarily overloaded"

### Root Causes & Solutions

#### 1. **Redis Not Configured (PRIMARY CAUSE)**
The backend is using in-memory cache which is limited to 500 items and consumes RAM quickly.

**Solution:**
```bash
# Option A: Install Redis Locally (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases

# Option B: Use Docker
docker run -d -p 6379:6379 redis:latest

# Option C: Use Cloud Redis (Production)
# AWS ElastiCache, Heroku Redis, DigitalOcean, etc.
```

**Configuration:**
```env
# In your .env file:
REDIS_URL=redis://localhost:6379
```

**Restart server after configuration:**
```bash
npm start
```

---

#### 2. **Memory Leak in Adaptive Rate Limiting (FIXED v2.0)**
Previous versions created new limiter instances on every high-memory request, wasting memory.

**Status:** ✅ Fixed in current version
- Now uses persistent `strictMemoryLimiter` instance
- Automatic cleanup every 2 minutes
- Memory monitoring every 30 seconds

---

#### 3. **In-Memory Cache Growing Too Large (FIXED v2.0)**
Cache was set to 1000 items maximum without proper LRU eviction.

**Status:** ✅ Fixed
- Reduced to 500 items maximum (vs 1000)
- Aggressive 20% batch eviction when full
- Automatic cleanup of expired entries every 5 minutes
- Better size tracking

---

## Issue: JWT Authentication Failures (401 Unauthorized)

### Symptoms
```
JWT verification error: JsonWebTokenError: jwt malformed
All requests returning 401 with "Unauthorized - Invalid token"
```

### Root Causes & Solutions

#### 1. **Incorrect Bearer Token Format (PRIMARY CAUSE - NOW FIXED)**

**Before Fix:**
- `authHeader.split(' ')[1]` was too simplistic
- Failed with malformed headers like `Bearer  token` (extra spaces)
- Didn't validate Bearer prefix

**After Fix (v2.0):**
- Proper regex-based parsing: `authHeader.trim().split(/\s+/)`
- Validates "Bearer" prefix
- Handles extra whitespace
- Better error messages

**Ensure your client is sending:**
```
Authorization: Bearer <your_jwt_token>
```

NOT:
```
Authorization: <token>  (missing Bearer)
Authorization: bearer <token>  (case matters now)
Authorization: Bearer  <token>  (extra spaces)
```

---

#### 2. **Token Structure Issues**

**Error:** `Invalid token structure`

**Solution:** Ensure JWT contains either `userId` or `id` field:

```javascript
// When signing token, include id:
jwt.sign({ id: adminId, email: admin.email }, JWT_SECRET)

// OR
jwt.sign({ userId: adminId, email: admin.email }, JWT_SECRET)
```

The fixed version now supports both fields.

---

#### 3. **Expired Tokens**

**Error:** `Token expired`

**Solution:** 
```bash
# Check JWT expiration in your config:
JWT_EXPIRES_IN=7d  # Change if needed
```

Get a new token by logging in again:
```bash
curl -X POST http://localhost:5000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"mertbaytas@gmail.com","password":"eR4SmOusSe41.G1D3K"}'
```

---

## Issue: All Requests Return 401 Unauthorized

### Symptoms
Even public endpoints like `/blog`, `/regulations`, `/health` return 401

### Solutions

1. **Check if route is in public routes list**
   - In `server.js` around line 180
   - Add missing public routes to `publicRoutes` array

2. **Verify authentication header for protected endpoints**
   ```bash
   # Test with auth header
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/v1/admin/posts
   ```

3. **Check if using analytics endpoints**
   - These require tokens by default
   - Should be in public routes if needed

---

## Issue: "Service temporarily overloaded" (503)

### Causes
- Memory usage above 85%
- Too many concurrent requests hitting strict rate limits

### Solutions

1. **Enable Redis immediately** (see High Memory Usage section)

2. **Increase available system memory**
   - Close unnecessary applications
   - Increase Node.js heap (temporary):
     ```bash
     NODE_OPTIONS=--max_old_space_size=4096 npm start
     ```

3. **Reduce in-memory cache usage**
   - Decrease request load
   - Implement client-side caching
   - Add request deduplication

---

## Issue: "Too many requests" (429)

### Cause
Rate limits have been exceeded

### Current Limits
```javascript
// IP-based (per hour):
- Global: 1000 requests
- Auth: 20 requests
- Contact form: 10 requests
- Calculators: 100 requests

// If memory > 85%:
- Strict limit: 50 requests/minute per IP
```

### Solutions

1. **Wait and retry**
   - Check `Retry-After` header in response
   - Wait that many seconds

2. **Distribute requests**
   - Implement exponential backoff in client
   - Spread requests over time

3. **Use different IPs** (testing only)
   - Each IP has independent limits

4. **Configure higher limits** (development)
   - Edit `RATE_LIMIT_MAX_REQUESTS` in `.env`
   - Or modify `RATE_LIMITS` in `advancedRateLimit.js`

---

## Issue: Cache Not Working

### Symptoms
- Always seeing "Cache miss" messages
- Performance not improving
- Logs show: "Redis not configured, using in-memory cache"

### Solutions

1. **Redis Configuration**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

2. **Check Redis Connection**
   ```bash
   # Test Redis locally
   redis-cli ping  # Should return "PONG"
   ```

3. **View Cache Stats**
   ```bash
   curl http://localhost:5000/api/v1/admin/cache-stats \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Memory Usage Thresholds (v2.0)

| Usage | Action |
|-------|--------|
| < 70% | Normal operation |
| 70-75% | Warnings logged (not shown to users) |
| 75-85% | Medium warning - monitor console logs |
| 85%+ | Strict rate limiting applied (503 responses possible) |
| 90%+ | Critical - consider Redis + memory optimization |

---

## Recommended Production Setup

```yaml
Caching: Redis (ElastiCache or similar)
Memory: 2GB minimum
Node.js: v18+ LTS
Rate Limits: Adjust for your expected load
Monitoring: Enable analytics and alerts
Backup: Automatic daily backups enabled
```

---

## Debug Commands

### View current memory usage
```bash
# Every 30 seconds, the server logs memory stats if > 70%
# Check logs for format:
# ⚠️  Memory usage high { heapUsed: X MB, heapTotal: Y MB, usage: Z% }
```

### Clear cache (requires token)
```bash
curl -X POST http://localhost:5000/api/v1/admin/cache-clear \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check server health
```bash
curl http://localhost:5000/api/v1/health
```

---

## Getting Help

1. **Check logs**: Look for error patterns in console
2. **Enable debug logging**: `LOG_LEVEL=debug` in `.env`
3. **Test with curl**: Verify API responses
4. **Check .env file**: Ensure all variables are set correctly
5. **Review recent changes**: What was modified before issue appeared?

---

**Last Updated:** January 14, 2026  
**Version:** 2.0.0
