/**
 * ÖNDER DENETİM - PROFESSIONAL BACKEND SERVER
 * Mali Müşavirlik Web Sitesi - Production Ready API
 * Version: 2.0.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as db from './db.js';
import config from './src/config/index.js';
import { rateLimitHandler } from './middlewares.js';
import { notFoundHandler, globalErrorHandler } from './src/middlewares/errorHandler.js';

// Controllers
import * as blogController from './src/controllers/blogController.js';
import * as socialMediaController from './src/controllers/socialMediaController.js';
import * as contactController from './src/controllers/contactController.js';

// Services
import * as mailService from './src/services/mailService.js';
import cacheService from './src/services/cacheService.js';
import monitoringService from './src/services/monitoringService.js';

// Utils
import * as accounting from './src/utils/accounting.js';
import { validateEnv, getEnvSummary } from './src/utils/validateEnv.js';
import { scheduleBackups, createBackup } from './src/utils/backup.js';
import { logger, httpLogger, errorLogger, initializeLogger } from './src/utils/logger.js';

// Middleware
import { upload, handleUploadError } from './src/middlewares/upload.js';
import {
  sanitizeRequestData,
  xssProtection,
  sqlInjectionProtection,
  suspiciousActivityDetector,
  securityHeadersValidator
} from './src/middlewares/security.js';
import { csrfTokenEndpoint, optionalCsrfProtection } from './src/middlewares/csrf.js';
import { ipRateLimit, adaptiveRateLimit } from './src/middlewares/advancedRateLimit.js';
import { apiVersioning, getVersionInfo } from './src/middlewares/apiVersioning.js';

// Routes
import apiRoutes from './src/routes/index.js';
import authRoutes from './src/routes/auth.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import blogRoutes from './src/routes/blog.routes.js';
import regulationsRoutes from './src/routes/regulations.routes.js';
import calculatorsRoutes from './src/routes/calculators.routes.js';
import contactRoutes from './src/routes/contact.routes.js';
import socialRoutes from './src/routes/social.routes.js';
import emailRoutes from './src/routes/email.routes.js';
import systemRoutes from './src/routes/system.routes.js';
import settingsRoutes from './src/routes/settings.routes.js';
import performanceRoutes from './src/routes/performance.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';
import mailRoutes from './src/routes/mail.routes.js';
import integrationsRoutes from './src/routes/integrations.routes.js';
import analyticsRoutes from './src/routes/analytics.routes.js';
import performanceMonitor from './src/services/performanceMonitor.js';

const app = express();
const PORT = config.server.port;
const JWT_SECRET = config.security.jwtSecret;
const isDevelopment = config.isDevelopment;

console.log('\n🚀 ═══════════════════════════════════════════════════');
console.log('🚀 ÖNDER DENETİM BACKEND SERVER');
console.log('🚀 ═══════════════════════════════════════════════════\n');

// Validate environment variables on startup
// In production, validation errors will cause startup to fail
// In development, only show warnings
const envValidation = validateEnv();
if (!isDevelopment && !envValidation.valid) {
  console.error('\n⛔ PRODUCTION STARTUP FAILED: Invalid environment configuration');
  process.exit(1);
}

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Enhanced Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xContentTypeOptions: true, // Prevent MIME type sniffing
  xFrameOptions: {
    action: 'deny', // Prevent clickjacking
  },
  xXssProtection: true,
}));

// Additional security headers
app.use(securityHeadersValidator);

// Compression
app.use(compression());

// Monitoring middleware (tracks all requests)
app.use(monitoringService.monitoringMiddleware);

// Request logging
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  // Production logging with custom logger
  app.use(httpLogger);
}

// Initialize performance monitoring
performanceMonitor.startMonitoring();

// CORS - Production-ready configuration
const allowedOrigins = isDevelopment
  ? [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://stripe-melody-96442735.figma.site' // Figma frontend preview
    ]
  : (config.cors?.allowedOrigins || ['https://onderdenetim.com']);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without origin (like mobile apps)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin not allowed - ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-API-Key', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-JSON-Response-Time'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
}));

// Handle CORS preflight requests
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDevelopment ? 1000 : config.rateLimit.max,
  message: 'Too many requests, please try again later',
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : config.rateLimit.authMax,
  message: 'Too many login attempts, please try again later',
  handler: rateLimitHandler,
});

app.use('/auth/', authLimiter);
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware (input sanitization, XSS, SQL injection protection)
app.use(sanitizeRequestData);
app.use(xssProtection);
app.use(sqlInjectionProtection);
app.use(suspiciousActivityDetector);

// Adaptive rate limiting (adjusts based on server load)
app.use(adaptiveRateLimit);

// API Versioning
app.use(apiVersioning);

// CSRF protection (optional, allows certain public endpoints)
app.use(optionalCsrfProtection);

// Serve uploaded files statically
app.use('/uploads', express.static(config.upload.uploadDir));

// ============================================
// AUTH MIDDLEWARE
// ============================================

const authMiddleware = async (req, res, next) => {
  // Check if route is public (no auth required)
  const isPublicRoute =
    // Health check
    (req.path === '/health' || req.path === '/api/v1/health' || req.path === '/api/v1/performance/health') ||
    // Blog endpoints (GET only)
    (req.path.startsWith('/api/v1/blog') && req.method === 'GET') ||
    // Regulations endpoints (GET only)
    (req.path.startsWith('/api/v1/regulations') && req.method === 'GET') ||
    // Calculators endpoints (ALL methods - public calculators)
    (req.path.startsWith('/api/v1/calculators')) ||
    // Authentication endpoints
    (req.path === '/api/v1/auth/signin' && req.method === 'POST') ||
    (req.path === '/api/v1/auth/signup-admin' && req.method === 'POST') ||
    (req.path === '/api/v1/auth/session' && req.method === 'POST') ||
    (req.path === '/api/v1/auth/refresh' && req.method === 'POST') ||
    (req.path === '/api/v1/auth/logout' && req.method === 'POST') ||
    (req.path === '/api/v1/auth/forgot-password' && req.method === 'POST') ||
    (req.path === '/api/v1/auth/reset-password' && req.method === 'POST') ||
    // Contact form (POST only)
    (req.path === '/api/v1/contact' && req.method === 'POST') ||
    // Newsletter subscription (both legacy and current paths)
    (req.path === '/api/v1/subscribe' && req.method === 'POST') ||
    (req.path === '/api/v1/unsubscribe' && req.method === 'POST') ||
    (req.path === '/api/v1/subscribers/subscribe' && req.method === 'POST') ||
    (req.path === '/api/v1/subscribers/unsubscribe' && req.method === 'POST') ||
    (req.path.startsWith('/api/v1/subscribers/verify/') && req.method === 'GET') ||
    // Uploaded files
    (req.path.startsWith('/uploads/')) ||
    // CSRF token endpoint
    (req.path === '/api/v1/csrf-token' && req.method === 'GET');

  if (isPublicRoute) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized - No token' });
  }

  // Extract token from "Bearer <token>" format
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Unauthorized - Invalid token format' });
  }

  const token = parts[1];
  if (!token || token.length === 0) {
    return res.status(401).json({ error: 'Unauthorized - Empty token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Support both 'userId' and 'id' fields for user lookup
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token structure' });
    }

    const admin = await db.get(`admins:${userId}`);

    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    req.user = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', expiredAt: error.expiredAt });
    } else if (error.name === 'JsonWebTokenError') {
      logger.debug('JWT verification failed:', { message: error.message });
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    logger.error('JWT verification error:', error);
    return res.status(401).json({ error: 'Unauthorized - Internal error' });
  }
};

app.use(authMiddleware);

// ============================================
// INITIALIZE DEFAULT ADMIN
// ============================================

async function initializeDefaultAdmin() {
  console.log('[INIT] Checking for default admin...');

  try {
    const allAdmins = await db.getByPrefix('admins:');
    const adminExists = allAdmins.find(a => a.email === config.defaultAdmin.email);

    if (!adminExists) {
      console.log('[INIT] Creating default admin...');
      const hashedPassword = await bcrypt.hash(config.defaultAdmin.password, 10);
      const adminId = uuidv4();

      await db.set(`admins:${adminId}`, {
        id: adminId,
        email: config.defaultAdmin.email,
        password: hashedPassword,
        name: config.defaultAdmin.name,
        role: 'admin',
        created_at: new Date().toISOString(),
      });

      console.log('[INIT] ✅ Default admin created successfully');
    } else {
      console.log('[INIT] ✅ Default admin already exists');
    }
  } catch (error) {
    console.error('[INIT] Error initializing admin:', error);
  }
}

// Activity logger helper
async function logActivity(userId, action, entity, entityId, details = {}) {
  const logId = uuidv4();
  await db.set(`logs:${logId}`, {
    id: logId,
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    details,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// ROUTES
// ============================================================================

// ============================================
// API v1 ROUTES (Recommended)
// ============================================

// Import new routes
import subscribersRoutes from './src/routes/subscribers.routes.js';
import activityLogsRoutes from './src/routes/activityLogs.routes.js';

// Mount all API routes under /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes); // Admin management (protected)
app.use('/api/v1/performance', performanceRoutes); // Performance monitoring (protected)
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/regulations', regulationsRoutes);
app.use('/api/v1/calculators', calculatorsRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/email', emailRoutes); // Email campaigns (protected)
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/upload', uploadRoutes); // File upload (protected)
app.use('/api/v1/mail', mailRoutes); // Newsletter campaigns (protected)
app.use('/api/v1/subscribers', subscribersRoutes); // Subscriber management (protected + public subscribe/unsubscribe)
app.use('/api/v1/logs', activityLogsRoutes); // Activity logs (protected)
app.use('/api/v1/settings', settingsRoutes); // Settings & analytics (protected)
app.use('/api/v1/integrations', integrationsRoutes); // Social media integrations (protected)
app.use('/api/v1/analytics', analyticsRoutes); // Analytics dashboard (protected)
app.use('/api/v1', systemRoutes); // health, monitoring, cache, backup

// ============================================
// UTILITY ENDPOINTS (Outside API versioning)
// ============================================

// CSRF token endpoint
app.get('/csrf-token', csrfTokenEndpoint);
app.get('/api/v1/csrf-token', csrfTokenEndpoint);

// API version info
app.get('/api-version', (req, res) => {
  res.json(getVersionInfo());
});
app.get('/api/v1/api-version', (req, res) => {
  res.json(getVersionInfo());
});

// ============================================
// LEGACY ROUTES REMOVED
// ============================================
//
// All direct API access has been removed. Use /api/v1 prefix for all endpoints.
//
// Old routes (REMOVED):
//   - /blog → /api/v1/blog
//   - /contact → /api/v1/contact
//   - /calculators → /api/v1/calculators
//   - /regulations → /api/v1/regulations
//   - /subscribers → /api/v1/subscribers
//   - /social → /api/v1/social
//   - /upload → /api/v1/upload
//   - /analytics → /api/v1/analytics
//   - /logs → /api/v1/logs
//   - /backup → /api/v1/backup
//
// All endpoints now ONLY accessible via /api/v1 prefix

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - catches unmatched routes
app.use(notFoundHandler);

// Error logger middleware (logs all errors)
app.use(errorLogger);

// Global error handler - catches all errors with standardized responses
app.use(globalErrorHandler);

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📍 Environment: ${config.env}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Initialize database
  await db.initialize();
  const dbType = db.getDbType();
  console.log(`🗄️  Database: ${dbType === 'mongodb' ? 'MongoDB' : dbType === 'memory' ? 'In-Memory Store' : 'JSON File Store'}\n`);

  // Initialize cache service
  await cacheService.initialize();

  // Initialize logger
  await initializeLogger();

  await initializeDefaultAdmin();

  // Start automatic backup system
  if (!isDevelopment) {
    console.log('🔄 Starting automatic backup system...');
    try {
      scheduleBackups();
      console.log('✅ Backup scheduler initialized (every 6 hours + daily at 3 AM)\n');
    } catch (error) {
      console.error('⚠️  Failed to initialize backup system:', error.message);
    }
  } else {
    console.log('ℹ️  Automatic backups disabled in development mode\n');
  }

  console.log('✅ All services initialized:');
  console.log('   ✓ Authentication & Authorization');
  console.log('   ✓ Blog Management (SEO, Reading Time, Social Media)');
  console.log('   ✓ Regulations Management');
  console.log('   ✓ Contact Forms (TÜRMOB/KVKK Compliant)');
  console.log('   ✓ Newsletter & Subscribers');
  console.log('   ✓ Email Campaigns (Resend)');
  console.log('   ✓ Social Media Integration (LinkedIn, Instagram)');
  console.log('   ✓ File Upload & Processing');
  console.log('   ✓ Mali Müşavirlik Calculators');
  console.log('   ✓ Analytics & Monitoring');
  console.log('   ✓ Advanced Monitoring & Metrics');
  console.log('   ✓ Performance Caching (Redis/Memory)');
  console.log('   ✓ Health Check Endpoints');
  console.log('   ✓ Security (Helmet, CORS, CSRF, Rate Limiting)');
  console.log('   ✓ Advanced Rate Limiting (IP/User/API Key)');
  console.log('   ✓ Input Sanitization & Validation');
  console.log('   ✓ Anomaly Detection & Alerting');
  if (!isDevelopment) {
    console.log('   ✓ Automatic Database Backups');
    console.log('   ✓ Environment Validation');
  }
  console.log('');

  // Display environment summary
  const envSummary = getEnvSummary();
  const currentDbType = db.getDbType();
  console.log('📊 System Configuration:');
  console.log(`   Database: ${currentDbType === 'mongodb' ? 'MongoDB (Production Ready)' : envSummary.database}`);
  console.log(`   Email Service: ${envSummary.email}`);
  console.log(`   LinkedIn: ${envSummary.social_media.linkedin}`);
  console.log(`   Instagram: ${envSummary.social_media.instagram}`);
  console.log('');

  if (config.env === 'production') {
    console.log('🔒 Production Mode Active - All security features enabled');
  } else {
    console.log('🛠️  Development Mode - Relaxed rate limits and verbose logging');
  }
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
