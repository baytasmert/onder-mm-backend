# 🚀 Production Deployment Guide

**Version:** 2.0.0  
**Target:** Linux/Windows Server, Docker, or Cloud Platform  
**Security Level:** Production-Ready  

---

## 📋 Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] Server: 2GB RAM minimum (4GB recommended for production)
- [ ] CPU: 2 cores minimum
- [ ] Storage: 50GB minimum SSD
- [ ] OS: Ubuntu 20.04+ or Windows Server 2019+
- [ ] Node.js: 18.0.0 or higher
- [ ] npm: 8.0.0 or higher
- [ ] Git: For repository cloning
- [ ] Docker: Optional (for containerization)

### Pre-Deployment Verification
- [ ] All code committed to Git
- [ ] Tests passing locally
- [ ] Security audit completed
- [ ] Environment variables documented
- [ ] Database migration script tested
- [ ] Backup strategy defined
- [ ] Monitoring tools configured
- [ ] DNS records prepared

---

## 1. Server Setup

### Option A: Ubuntu/Debian Linux (Recommended)

#### Step 1: Update System
```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl git wget nano
```

#### Step 2: Install Node.js
```bash
# Using NodeSource repository (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v20.x or higher
npm --version   # Should be 10.x or higher
```

#### Step 3: Create Application User
```bash
# Create non-root user for security
sudo useradd -m -s /bin/bash onderapp
sudo usermod -aG sudo onderapp

# Switch to new user
su - onderapp
```

#### Step 4: Install Redis (Optional but Recommended)
```bash
sudo apt-get install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
# Should return: PONG
```

#### Step 5: Install Nginx (Reverse Proxy)
```bash
sudo apt-get install -y nginx

# Enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

### Option B: Windows Server

#### Step 1: Install Node.js
1. Download from: https://nodejs.org/ (LTS version)
2. Run installer with default settings
3. Add to PATH during installation
4. Verify in PowerShell:
```powershell
node --version
npm --version
```

#### Step 2: Install Redis (Optional)
1. Use WSL2 or Docker
```powershell
docker run -d -p 6379:6379 redis:latest
```

#### Step 3: Install Git
1. Download from: https://git-scm.com/
2. Install with default settings

---

### Option C: Docker (Recommended for Production)

See [Docker Deployment](#docker-deployment-docker-recommended) section below.

---

## 2. Application Setup

### Clone Repository
```bash
cd /home/onderapp  # or appropriate directory
git clone https://github.com/yourusername/onder_mm_website.git
cd onder_mm_website/backend
```

### Install Dependencies
```bash
npm install --production

# Or with exact versions from package-lock.json
npm ci --production
```

### Configure Environment
```bash
# Copy example config
cp .env.example .env

# Edit configuration
nano .env

# Set required variables:
# NODE_ENV=production
# PORT=5000
# JWT_SECRET=<generate-32-character-random-string>
# CORS_ALLOWED_ORIGINS=https://yourdomain.com
# LOG_LEVEL=info
# REDIS_URL=redis://localhost:6379 (if using Redis)
```

### Generate JWT Secret
```bash
# Generate 32-character random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to JWT_SECRET in .env
```

### Initialize Database
```bash
# For JSON file store
node -e "require('./db.js').initialize()"

# Or for MongoDB
# Update MONGODB_URI in .env, then:
node -e "require('./db.js').initialize()"
```

---

## 3. Process Management

### Option A: PM2 (Recommended)

#### Install PM2
```bash
sudo npm install -g pm2
```

#### Create Ecosystem File
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'onder-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      NODE_OPTIONS: '--max-old-space-size=512'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '600M',
  }]
};
```

#### Start Application
```bash
pm2 start ecosystem.config.js

# Verify it's running
pm2 list

# Save PM2 configuration
pm2 save

# Make PM2 start on boot
pm2 startup systemd -u onderapp --hp /home/onderapp
```

#### Manage Application
```bash
pm2 stop onder-backend
pm2 restart onder-backend
pm2 delete onder-backend
pm2 logs onder-backend        # View logs
pm2 monit                      # Monitor resources
```

---

### Option B: Systemd Service (Linux)

Create `/etc/systemd/system/onder-backend.service`:
```ini
[Unit]
Description=Onder Backend Service
After=network.target

[Service]
Type=simple
User=onderapp
WorkingDirectory=/home/onderapp/onder_mm_website/backend
Environment="NODE_ENV=production"
Environment="NODE_OPTIONS=--max-old-space-size=512"
Environment="PORT=5000"
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl start onder-backend
sudo systemctl enable onder-backend  # Start on boot

# Check status
sudo systemctl status onder-backend

# View logs
sudo journalctl -u onder-backend -f
```

---

### Option C: Windows Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Onder Backend"
4. Trigger: At system startup
5. Action: Start a program
   - Program: C:\Program Files\nodejs\node.exe
   - Arguments: C:\path\to\backend\server.js
   - Start in: C:\path\to\backend
6. Set to run with highest privileges

---

## 4. Reverse Proxy Setup

### Nginx Configuration

Create `/etc/nginx/sites-available/onder-backend`:
```nginx
upstream backend {
    server localhost:5000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;
    gzip_min_length 1000;

    # Proxy settings
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        return 404;
    }
}
```

#### Enable Configuration
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/onder-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Setup SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d api.yourdomain.com

# Auto-renew (already configured with cron job)
sudo systemctl start certbot.timer
sudo systemctl enable certbot.timer
```

---

## 5. Database Backup Strategy

### Automated Daily Backups

Create `/home/onderapp/backup.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/backups/onder"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/home/onderapp/onder_mm_website/backend"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Backup database
cp $APP_DIR/data/db.json $BACKUP_DIR/db_$DATE.json

# Backup uploaded files
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz $APP_DIR/uploads/

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

#### Schedule with Cron
```bash
# Make script executable
chmod +x /home/onderapp/backup.sh

# Edit crontab
crontab -e

# Add line (backup daily at 2 AM)
0 2 * * * /home/onderapp/backup.sh
```

### Cloud Backup (AWS S3)

```bash
# Install AWS CLI
sudo apt-get install -y awscli

# Configure AWS credentials
aws configure

# Backup script with S3 upload
aws s3 sync /backups/onder s3://your-bucket/onder-backups/ --delete
```

---

## 6. Monitoring & Logging

### Application Logs
Logs automatically created in `backend/logs/`:
- `combined.log` - All requests
- `error.log` - Errors only
- `security.log` - Security events
- `mail.log` - Email operations

### Monitor Application Health
```bash
# Health endpoint
curl https://api.yourdomain.com/api/v1/performance/health

# Response should show:
# {
#   "success": true,
#   "status": "healthy" or "warning" or "degraded",
#   "uptime": 86400,
#   "memory": { ... }
# }
```

### Setup Log Aggregation (Optional)

**Using ELK Stack:**
```bash
# Pull ELK Docker images
docker run -d --name elasticsearch -p 9200:9200 docker.elastic.co/elasticsearch/elasticsearch:8.0.0
docker run -d --name kibana -p 5601:5601 docker.elastic.co/kibana/kibana:8.0.0

# Configure Logstash to forward backend logs
```

**Using Datadog (Recommended):**
```bash
# Install Datadog agent
sudo DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=<your-api-key> \
  DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_agent.sh)"
```

---

## 7. Monitoring Setup

### Memory Usage Alert (PM2)
```javascript
// Added to ecosystem.config.js
max_memory_restart: '600M',  // Restart if exceeds 600MB
```

### CPU & Memory Monitoring
```bash
# Check real-time stats
pm2 monit

# Or with system tools
top
htop
```

### Uptime Monitoring
Sign up for:
- [Uptime Robot](https://uptimerobot.com) - Free tier available
- [Ping-Pong](https://ping-pong.com)
- [StatusCake](https://www.statuscake.com)

Configure to ping: `https://api.yourdomain.com/api/v1/performance/health`

---

## 8. Docker Deployment (Docker Recommended)

### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY . .

# Create logs directory
RUN mkdir -p logs uploads/images uploads/documents uploads/temp

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/performance/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      NODE_OPTIONS: "--max-old-space-size=512"
      PORT: 5000
      JWT_SECRET: ${JWT_SECRET}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
      LOG_LEVEL: info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped
    networks:
      - onder-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - onder-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - onder-network

volumes:
  redis-data:

networks:
  onder-network:
    driver: bridge
```

### Deploy with Docker
```bash
# Build image
docker build -t onder-backend:latest .

# Or use Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Scale application
docker-compose up -d --scale backend=3
```

---

## 9. Performance Tuning

### Node.js Settings
```bash
# Set in environment or startup script
export NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"
export NODE_ENV=production

# For high-traffic: 1GB or more
export NODE_OPTIONS="--max-old-space-size=1024"
```

### Nginx Optimization
```nginx
# In nginx.conf
worker_processes auto;
worker_connections 1024;

# TCP optimizations
sendfile on;
tcp_nopush on;
tcp_nodelay on;
keepalive_timeout 65;

# Buffer optimizations
client_body_buffer_size 128k;
client_max_body_size 10m;
```

### Database Optimization
```javascript
// In db.js - add indexing for frequently accessed keys
// Example for MongoDB:
db.collection('admins').createIndex({ email: 1 });
db.collection('blogs').createIndex({ status: 1, created_at: -1 });
```

---

## 10. Rollback Procedure

### Keep Previous Version
```bash
# Before deployment
cp -r backend backend-backup-$(date +%Y%m%d)

# Then deploy new version
git pull origin main
npm install --production
pm2 restart ecosystem.config.js
```

### Rollback Steps
```bash
# If issues detected
pm2 stop onder-backend

# Restore from backup
cp -r backend-backup-YYYYMMDD/* backend/

# Restart
pm2 start ecosystem.config.js

# Verify health
curl https://api.yourdomain.com/api/v1/performance/health
```

---

## 11. Troubleshooting

### Application Won't Start
```bash
# Check for port in use
sudo lsof -i :5000

# Check Node version
node --version

# Check dependencies
npm list

# Run with verbose logging
NODE_DEBUG=* node server.js
```

### High Memory Usage
```bash
# Check memory stats
pm2 monit

# View memory details
node -e "console.log(require('os').totalmem() / 1024 / 1024 + 'MB total')"

# Trigger garbage collection
curl -X POST https://api.yourdomain.com/api/v1/performance/gc \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Database Issues
```bash
# Check database connectivity
node -e "require('./db.js').initialize().then(() => console.log('OK'))"

# Verify file permissions
ls -la data/db.json

# Restore from backup if corrupted
cp backups/db_YYYYMMDD_HHMMSS.json data/db.json
```

---

## 12. Security Hardening

### SSH Hardening (Linux)
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# Port 2222 (change from default)

# Restart SSH
sudo systemctl restart sshd
```

### Firewall Configuration (Linux)
```bash
# Enable UFW
sudo ufw enable

# Allow specific ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 5000/tcp    # Backend (local only)

# Check status
sudo ufw status
```

### Environment Variables Security
```bash
# Never commit .env file
echo ".env" >> .gitignore

# Set strict permissions
chmod 600 .env

# Rotate JWT secret regularly
# Update JWT_SECRET in .env monthly
```

---

## 13. Post-Deployment Verification

### Checklist
- [ ] Application starts without errors
- [ ] Health endpoint returns 200
- [ ] API endpoints responding correctly
- [ ] Authentication working (JWT tokens valid)
- [ ] Rate limiting active
- [ ] Logs being written correctly
- [ ] Database accessible and writeable
- [ ] Email sending working (test with /api/v1/email/test)
- [ ] File uploads working
- [ ] Memory usage stable (< 70%)
- [ ] SSL certificate valid
- [ ] Monitoring alerts configured
- [ ] Backups scheduled and tested

### Test Endpoints
```bash
# Health check
curl https://api.yourdomain.com/api/v1/performance/health

# Get version
curl https://api.yourdomain.com/api/v1/api-version

# CSRF token
curl https://api.yourdomain.com/api/v1/csrf-token

# Sign in
curl -X POST https://api.yourdomain.com/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

---

## 14. Maintenance Schedule

### Daily
- Monitor error logs
- Check memory usage
- Verify uptime monitoring

### Weekly
- Review security logs
- Check backup completion
- Update monitoring dashboard

### Monthly
- Update Node.js dependencies
- Review performance metrics
- Test disaster recovery
- Rotate API keys if needed

### Quarterly
- Security audit
- Performance review
- Load testing

### Annually
- Full security assessment
- Update SSL certificates (auto-renew configured)
- Review disaster recovery plan
- Penetration testing

---

## 15. Support & Escalation

**Issues Encountered:**
1. Document problem with timestamps and error messages
2. Check logs: `pm2 logs` or `sudo journalctl -u onder-backend`
3. Restart service: `pm2 restart onder-backend`
4. Contact support with detailed information

**Emergency Contact:**
- Tech Lead: [email/phone]
- On-Call: Available 24/7 for critical issues

---

## Deployment Complete! 🎉

Application is now ready for production. Continue monitoring and performing regular maintenance to ensure stability and security.

**Next Steps:**
1. Monitor performance for 24 hours
2. Collect feedback from team
3. Fine-tune as needed
4. Schedule regular security reviews

---

**Last Updated:** 2024  
**Status:** Production Ready ✅
