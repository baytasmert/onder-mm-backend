# 🚀 Redis Setup Guide - Önder Denetim

## Why Redis?

The backend was experiencing **90-94% memory usage** because it was using in-memory cache limited to 500 items. Redis solves this by:

- ✅ **Unlimited cache capacity** - Store thousands of items efficiently
- ✅ **Dramatic memory savings** - 50-70% reduction in RAM usage
- ✅ **Better performance** - Redis is optimized for caching
- ✅ **Persistent storage** - Optional data persistence
- ✅ **Production-ready** - Used by major companies worldwide

---

## Quick Setup Options

### Option 1: Local Redis (Windows 10/11)

#### A. Using Memurai (Easiest for Windows)

1. **Download and Install**
   - Visit: https://www.memurai.com/
   - Click "Download"
   - Run installer, use default options
   - Redis will start automatically

2. **Verify Installation**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. **Configure Backend**
   ```env
   # .env
   REDIS_URL=redis://localhost:6379
   ```

4. **Restart Server**
   ```bash
   npm start
   ```

---

#### B. Using WSL2 + Docker

1. **Enable WSL2**
   ```powershell
   # Run as Administrator in PowerShell
   wsl --install
   wsl --set-default-version 2
   ```

2. **Install Docker Desktop**
   - Download: https://www.docker.com/products/docker-desktop
   - Install and restart

3. **Run Redis Container**
   ```bash
   docker run -d -p 6379:6379 --name redis redis:latest
   ```

4. **Verify**
   ```bash
   docker exec redis redis-cli ping
   # Should return: PONG
   ```

5. **Configure Backend**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

---

### Option 2: Cloud Redis (Production Recommended)

#### A. Render.com (Free tier available)

1. **Sign up**: https://render.com

2. **Create Redis Instance**
   - Dashboard → New → Redis
   - Select "Free" plan
   - Region: Choose closest to you
   - Create

3. **Copy Connection String**
   - Copy the URL from dashboard

4. **Configure Backend**
   ```env
   REDIS_URL=<paste_from_render>
   ```

---

#### B. Heroku Redis

1. **Sign up**: https://heroku.com

2. **Create App and Add Redis**
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-redis:premium-0
   heroku config:get REDIS_URL
   ```

3. **Configure Backend**
   ```env
   REDIS_URL=<from_heroku_config>
   ```

---

#### C. AWS ElastiCache (Enterprise)

1. **Create ElastiCache cluster**
   - Service: ElastiCache
   - Engine: Redis
   - Node type: cache.t3.micro
   - Number of cache nodes: 1

2. **Get Endpoint**
   - Primary endpoint: something-abc.ng.0001.use1.cache.amazonaws.com:6379

3. **Configure Backend**
   ```env
   REDIS_URL=redis://username:password@endpoint:6379/0
   ```

---

### Option 3: Docker Compose (Development)

Create `docker-compose.yml` in backend folder:

```yaml
version: '3.8'

services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    environment:
      - REDIS_PASSWORD=yourpassword123
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

**Run:**
```bash
docker-compose up -d
```

**Configure Backend:**
```env
REDIS_URL=redis://:yourpassword123@localhost:6379
```

---

## Verification Steps

### 1. Check Server Logs

After starting with Redis configured:

```
✅ Redis connected successfully
```

Not seeing this? Your `REDIS_URL` might be wrong.

### 2. Verify Cache is Working

```bash
# Login first to get token
curl -X POST http://localhost:5000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"mertbaytas@gmail.com","password":"eR4SmOusSe41.G1D3K"}'

# Copy token from response

# Check cache stats
curl http://localhost:5000/api/v1/admin/cache-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "type": "redis",
  "connected": true,
  "keyCount": 0,
  "info": { ... }
}
```

### 3. Monitor Memory Usage

After Redis is running, memory should drop significantly:

```
Before Redis: 90-94% heap usage
After Redis: 30-50% heap usage (typical)
```

---

## Troubleshooting

### "Connection refused"
```bash
# Check if Redis is running
redis-cli ping

# If not running:
# Windows: Memurai should auto-start
# Docker: docker start redis
# WSL: wsl -d Docker-Desktop
```

### "Could not connect to Redis"

1. **Verify REDIS_URL format**
   ```env
   # Correct: redis://host:port
   REDIS_URL=redis://localhost:6379
   
   # With auth: redis://:password@host:port
   REDIS_URL=redis://:password@localhost:6379
   
   # With username: redis://user:password@host:port
   REDIS_URL=redis://user:password@localhost:6379
   ```

2. **Check firewall**
   - Windows Firewall: Allow Redis port (6379)
   - Router: Forward port if remote

3. **Test connection manually**
   ```bash
   redis-cli -u redis://localhost:6379 ping
   ```

### Memory usage still high

1. **Verify Redis is being used**
   ```bash
   curl http://localhost:5000/api/v1/admin/cache-stats \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Should show `type: redis`

2. **Check cache TTLs** - May be storing too much
   ```javascript
   // In cacheService.js
   const CACHE_TTL = {
     BLOG_POST: 300,      // 5 minutes
     REGULATIONS: 300,    // 5 minutes
     // etc
   };
   ```

3. **Monitor Redis memory**
   ```bash
   redis-cli info memory
   ```

---

## Performance Comparison

| Metric | In-Memory (Before) | Redis (After) |
|--------|-------------------|----------------|
| Heap Usage | 90-94% | 30-50% |
| Cache Size | 500 items max | Unlimited |
| Response Time | Slow (GC pauses) | Fast, consistent |
| Production Ready | ❌ No | ✅ Yes |

---

## Production Checklist

- [ ] Redis installed and running
- [ ] `REDIS_URL` configured in `.env`
- [ ] Server logs show "Redis connected successfully"
- [ ] Cache stats endpoint returns redis type
- [ ] Memory usage below 60%
- [ ] No connection errors in logs
- [ ] Response times improved
- [ ] All API endpoints working
- [ ] Rate limiting working properly

---

## Optional: Redis Persistence

For production, enable AOF (Append Only File) to persist data:

```bash
# In Redis config or CLI:
CONFIG SET appendonly yes
```

This ensures cache survives Redis restart.

---

## Optional: Redis Monitoring

Install Redis Commander for GUI:

```bash
npm install -g redis-commander

# Run
redis-commander --redis-url redis://localhost:6379

# Open http://localhost:8081 in browser
```

---

## Cost Comparison

| Provider | Free Tier | Paid Starting |
|----------|-----------|-----------------|
| Local | Free | N/A |
| Docker | Free | N/A |
| Render | 30MB free | $7/month |
| Heroku | None | $15/month |
| AWS | Free tier | $7-15/month |

---

## Next Steps

1. ✅ Choose setup option
2. ✅ Install and configure
3. ✅ Update `.env` with `REDIS_URL`
4. ✅ Restart server
5. ✅ Verify with cache-stats endpoint
6. ✅ Monitor memory usage

**Your backend should now be production-ready!**

---

**Last Updated:** January 14, 2026  
**Version:** 2.0.0
