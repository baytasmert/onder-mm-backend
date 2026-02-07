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
import { errorHandler, asyncHandler, validators, validateRequest, sanitizeUser, rateLimitHandler } from './middlewares.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

// Default admin credentials
const DEFAULT_ADMIN = {
  email: process.env.DEFAULT_ADMIN_EMAIL || 'mertbaytas@gmail.com',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'eR4SmOusSe41.G1D3K',
  name: process.env.DEFAULT_ADMIN_NAME || 'Site Yöneticisi',
};

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// Compression
app.use(compression());

// Request logging
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS - Production-ready
const allowedOrigins = isDevelopment
  ? ['https://stripe-melody-96442735.figma.site']
  : (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin) || isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Limit each IP
  message: 'Too many requests from this IP, please try again later',
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 5, // Stricter for auth
  message: 'Too many login attempts, please try again later',
  handler: rateLimitHandler,
}));
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth middleware
const authMiddleware = async (req, res, next) => {
  const publicRoutes = [
    '/health',
    '/auth/signin',
    '/auth/signup-admin',
    '/blog',
    '/regulations',
    '/subscribe',
    '/unsubscribe',
  ];

  // Check if route is public
  const isPublic = publicRoutes.some(route =>
    req.path === route ||
    (req.path.startsWith('/blog/') && req.method === 'GET') ||
    (req.path.startsWith('/regulations/') && req.method === 'GET')
  );

  if (isPublic) {
    return next();
  }

  // Verify JWT for protected routes
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized - No token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await db.get(`admins:${decoded.userId}`);

    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    req.user = admin;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Apply auth middleware
app.use(authMiddleware);

// Initialize default admin on startup
async function initializeDefaultAdmin() {
  console.log('[INIT] Checking for default admin...');

  try {
    const allAdmins = await db.getByPrefix('admins:');
    const adminExists = allAdmins.find(a => a.email === DEFAULT_ADMIN.email);

    if (!adminExists) {
      console.log('[INIT] Creating default admin...');
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      const adminId = uuidv4();

      await db.set(`admins:${adminId}`, {
        id: adminId,
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        name: DEFAULT_ADMIN.name,
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
  console.log(`[ACTIVITY] ${action} ${entity} by user ${userId}`);
}

// ============================================================================
// ROUTES
// ============================================================================

// Health Check
app.get('/health', (req, res) => {
  console.log('[HEALTH] Health check called');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: {
      backend: 'Local Node.js',
      database: 'JSON File Store',
    },
    endpoints: {
      auth: 'active',
      blog: 'active',
      mail: 'active',
      analytics: 'active',
      settings: 'active',
      social: 'active',
    }
  });
});

// ============================================
// AUTH ROUTES
// ============================================

// Admin Sign Up
app.post('/auth/signup-admin', async (req, res) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('👤 [SIGNUP] Admin signup request');
  console.log('═══════════════════════════════════════════════════');

  try {
    const { email, password, name } = req.body;

    console.log('📧 Email:', email);
    console.log('👤 Name:', name);

    // Check if admin already exists
    const allAdmins = await db.getByPrefix('admins:');
    let existingAdmin = allAdmins.find(a => a.email === email);

    if (existingAdmin) {
      console.log('⚠️ Admin already exists, updating password...');

      // Update password
      const hashedPassword = await bcrypt.hash(password, 10);
      existingAdmin.password = hashedPassword;
      await db.set(`admins:${existingAdmin.id}`, existingAdmin);

      console.log('✅ Admin password updated');
      console.log('═══════════════════════════════════════════════════\n');

      return res.json({
        success: true,
        user: { id: existingAdmin.id, email: existingAdmin.email },
        message: 'Admin already exists, password updated'
      });
    }

    // Create new admin
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = uuidv4();

    const newAdmin = {
      id: adminId,
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      created_at: new Date().toISOString(),
    };

    await db.set(`admins:${adminId}`, newAdmin);

    console.log('✅ Admin created successfully');
    console.log('═══════════════════════════════════════════════════\n');

    res.json({
      success: true,
      user: { id: adminId, email }
    });
  } catch (error) {
    console.error('💥 Signup error:', error);
    console.log('═══════════════════════════════════════════════════\n');
    res.status(500).json({ error: 'Signup failed: ' + error.message });
  }
});

// Admin Sign In
app.post('/auth/signin', validators.signin, validateRequest, asyncHandler(async (req, res) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔐 [SIGNIN] Admin signin request');
  console.log('═══════════════════════════════════════════════════');

  try {
    const { email, password } = req.body;

    console.log('📧 Email:', email);

    // Find admin by email
    const allAdmins = await db.getByPrefix('admins:');
    const admin = allAdmins.find(a => a.email === email);

    if (!admin) {
      console.log('❌ Admin not found');
      console.log('═══════════════════════════════════════════════════\n');
      return res.status(401).json({
        error: 'Invalid credentials',
        hint: 'Email veya şifre hatalı. Default admin: mertbaytas@gmail.com / eR4SmOusSe41.G1D3K'
      });
    }

    console.log('✅ Admin found:', admin.id);

    // Verify password
    console.log('🔐 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      console.log('❌ Invalid password');
      console.log('═══════════════════════════════════════════════════\n');
      return res.status(401).json({
        error: 'Invalid credentials',
        hint: 'Email veya şifre hatalı'
      });
    }

    console.log('✅ Password valid');

    // Generate JWT
    console.log('🎫 Generating JWT...');
    const token = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ JWT generated');
    console.log('🎫 Token (first 50):', token.substring(0, 50) + '...');

    await logActivity(admin.id, 'login', 'auth', admin.id);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ [SIGNIN SUCCESS]');
    console.log('═══════════════════════════════════════════════════\n');

    res.json({
      success: true,
      access_token: token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      }
    });
  } catch (error) {
    console.error('💥 Signin error:', error);
    console.log('═══════════════════════════════════════════════════\n');
    res.status(500).json({ error: 'Signin failed: ' + error.message });
  }
}));

// Get Current Session
app.post('/auth/session', async (req, res) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔐 [SESSION] Session check request');
  console.log('═══════════════════════════════════════════════════');

  try {
    const { token } = req.body;

    if (!token) {
      console.log('❌ No token provided');
      console.log('═══════════════════════════════════════════════════\n');
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    console.log('🎫 Token received (first 50):', token.substring(0, 50) + '...');

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token decoded:', decoded);

    // Get admin from DB
    const admin = await db.get(`admins:${decoded.userId}`);

    if (!admin) {
      console.log('❌ Admin not found in DB');
      console.log('═══════════════════════════════════════════════════\n');
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    console.log('✅ Admin found:', admin.id);
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ [SESSION SUCCESS]');
    console.log('═══════════════════════════════════════════════════\n');

    res.json({
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      }
    });
  } catch (error) {
    console.error('💥 Session check error:', error);
    console.log('═══════════════════════════════════════════════════\n');
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
});

// ============================================
// BLOG ROUTES
// ============================================

// Get all blog posts (public)
app.get('/blog', async (req, res) => {
  try {
    const posts = await db.getByPrefix('blogPosts:');
    const sortedPosts = posts.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json({ posts: sortedPosts });
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single blog post by slug (public)
app.get('/blog/:slug', async (req, res) => {
  try {
    const post = await db.get(`blogSlugs:${req.params.slug}`);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Create blog post (protected)
app.post('/blog', async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, status, image } = req.body;

    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const post = {
      id,
      title,
      slug,
      content,
      excerpt,
      category,
      tags: tags || [],
      status: status || 'draft',
      image: image || '',
      author_id: req.user.id,
      created_at: timestamp,
      updated_at: timestamp,
      publish_date: status === 'published' ? timestamp : null,
    };

    await db.set(`blogPosts:${id}`, post);
    await db.set(`blogSlugs:${slug}`, post);
    await logActivity(req.user.id, 'create', 'blog', id, { title, category });

    res.json({ success: true, post });
  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update blog post (protected)
app.put('/blog/:id', async (req, res) => {
  try {
    const existingPost = await db.get(`blogPosts:${req.params.id}`);

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const updates = req.body;

    // Generate new slug if title changed
    let newSlug = existingPost.slug;
    if (updates.title && updates.title !== existingPost.title) {
      newSlug = updates.title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      await db.del(`blogSlugs:${existingPost.slug}`);
    }

    const updatedPost = {
      ...existingPost,
      ...updates,
      slug: newSlug,
      updated_at: new Date().toISOString(),
      publish_date: updates.status === 'published' && !existingPost.publish_date
        ? new Date().toISOString()
        : existingPost.publish_date,
    };

    await db.set(`blogPosts:${req.params.id}`, updatedPost);
    await db.set(`blogSlugs:${newSlug}`, updatedPost);
    await logActivity(req.user.id, 'update', 'blog', req.params.id, { title: updates.title, category: updates.category });

    res.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete blog post (protected)
app.delete('/blog/:id', async (req, res) => {
  try {
    const post = await db.get(`blogPosts:${req.params.id}`);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await db.del(`blogPosts:${req.params.id}`);
    await db.del(`blogSlugs:${post.slug}`);
    await logActivity(req.user.id, 'delete', 'blog', req.params.id, { title: post.title, category: post.category });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ============================================
// REGULATIONS ROUTES
// ============================================

// Get all regulations (public)
app.get('/regulations', async (req, res) => {
  try {
    const regulations = await db.getByPrefix('regulations:');
    const sortedRegulations = regulations.sort((a, b) =>
      new Date(b.regulation_date).getTime() - new Date(a.regulation_date).getTime()
    );
    res.json({ regulations: sortedRegulations });
  } catch (error) {
    console.error('Get regulations error:', error);
    res.status(500).json({ error: 'Failed to fetch regulations' });
  }
});

// Create regulation (protected)
app.post('/regulations', async (req, res) => {
  try {
    const { title, content, category, regulation_date, pdf_url } = req.body;

    const id = uuidv4();
    const regulation = {
      id,
      title,
      content,
      category,
      regulation_date,
      pdf_url: pdf_url || '',
      created_at: new Date().toISOString(),
    };

    await db.set(`regulations:${id}`, regulation);
    await logActivity(req.user.id, 'create', 'regulation', id, { title, category });

    res.json({ success: true, regulation });
  } catch (error) {
    console.error('Create regulation error:', error);
    res.status(500).json({ error: 'Failed to create regulation' });
  }
});

// Update regulation (protected)
app.put('/regulations/:id', async (req, res) => {
  try {
    const existingRegulation = await db.get(`regulations:${req.params.id}`);

    if (!existingRegulation) {
      return res.status(404).json({ error: 'Regulation not found' });
    }

    const updatedRegulation = {
      ...existingRegulation,
      ...req.body,
    };

    await db.set(`regulations:${req.params.id}`, updatedRegulation);
    await logActivity(req.user.id, 'update', 'regulation', req.params.id, { title: req.body.title, category: req.body.category });

    res.json({ success: true, regulation: updatedRegulation });
  } catch (error) {
    console.error('Update regulation error:', error);
    res.status(500).json({ error: 'Failed to update regulation' });
  }
});

// Delete regulation (protected)
app.delete('/regulations/:id', async (req, res) => {
  try {
    const regulation = await db.get(`regulations:${req.params.id}`);

    if (!regulation) {
      return res.status(404).json({ error: 'Regulation not found' });
    }

    await db.del(`regulations:${req.params.id}`);
    await logActivity(req.user.id, 'delete', 'regulation', req.params.id, { title: regulation.title, category: regulation.category });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete regulation error:', error);
    res.status(500).json({ error: 'Failed to delete regulation' });
  }
});

// ============================================
// SUBSCRIBERS ROUTES
// ============================================

// Subscribe to newsletter (public)
app.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const id = uuidv4();
    const unsubscribe_token = uuidv4();

    const subscriber = {
      id,
      email,
      subscribed_at: new Date().toISOString(),
      is_active: true,
      unsubscribe_token,
    };

    await db.set(`subscribers:${id}`, subscriber);
    await db.set(`subscriberEmails:${email}`, subscriber);

    res.json({ success: true, message: 'Aboneliğiniz başarıyla tamamlandı' });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// Unsubscribe from newsletter (public)
app.post('/unsubscribe', async (req, res) => {
  try {
    const { token } = req.body;

    const subscribers = await db.getByPrefix('subscribers:');
    const subscriber = subscribers.find(s => s.unsubscribe_token === token);

    if (!subscriber) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const updated = { ...subscriber, is_active: false };
    await db.set(`subscribers:${subscriber.id}`, updated);
    await db.set(`subscriberEmails:${subscriber.email}`, updated);

    res.json({ success: true, message: 'Abonelikten çıkış başarılı' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Unsubscribe failed' });
  }
});

// Get all subscribers (protected)
app.get('/subscribers', async (req, res) => {
  try {
    const subscribers = await db.getByPrefix('subscribers:');
    res.json({ subscribers });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// ============================================
// MAIL ROUTES
// ============================================

// Send test email (protected)
app.post('/mail/send-test', async (req, res) => {
  try {
    const { type, item_id, email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Get item
    const item = type === 'blog'
      ? await db.get(`blogPosts:${item_id}`)
      : await db.get(`regulations:${item_id}`);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get mail settings
    const settings = await db.get('settings:mail') || {};

    // For local testing, just log the email
    console.log('📧 [TEST EMAIL] Would send to:', email);
    console.log('📋 Subject:', `[TEST] ${type === 'blog' ? 'Yeni Blog Yazısı' : 'Yeni Mevzuat'}: ${item.title}`);

    await logActivity(req.user.id, 'mail_sent', type, item_id, {
      title: item.title,
      sent: 1,
      failed: 0,
      total: 1,
      recipients: 'test',
      email,
    });

    res.json({ success: true, message: 'Test email logged (no actual send in local mode)' });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Send to selected subscribers (protected)
app.post('/mail/send-to-selected', async (req, res) => {
  try {
    const { type, item_id, subscriber_ids } = req.body;

    if (!subscriber_ids || !Array.isArray(subscriber_ids) || subscriber_ids.length === 0) {
      return res.status(400).json({ error: 'No subscribers selected' });
    }

    // Get item
    const item = type === 'blog'
      ? await db.get(`blogPosts:${item_id}`)
      : await db.get(`regulations:${item_id}`);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get selected subscribers
    const subscribers = await Promise.all(
      subscriber_ids.map(id => db.get(`subscribers:${id}`))
    );
    const validSubscribers = subscribers.filter(s => s && s.is_active);

    if (validSubscribers.length === 0) {
      return res.status(400).json({ error: 'No valid subscribers found' });
    }

    // For local testing, just log
    console.log('📧 [BULK EMAIL] Would send to', validSubscribers.length, 'subscribers');
    console.log('📋 Subject:', `${type === 'blog' ? 'Yeni Blog Yazısı' : 'Yeni Mevzuat'}: ${item.title}`);

    await logActivity(req.user.id, 'mail_sent', type, item_id, {
      title: item.title,
      sent: validSubscribers.length,
      failed: 0,
      total: validSubscribers.length,
      recipients: 'selected',
      count: validSubscribers.length,
    });

    res.json({ success: true, sent: validSubscribers.length, failed: 0, total: validSubscribers.length });
  } catch (error) {
    console.error('Send to selected error:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

// Send to single email (protected)
app.post('/mail/send-to-email', async (req, res) => {
  try {
    const { type, item_id, email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Get item
    const item = type === 'blog'
      ? await db.get(`blogPosts:${item_id}`)
      : await db.get(`regulations:${item_id}`);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // For local testing, just log
    console.log('📧 [SINGLE EMAIL] Would send to:', email);
    console.log('📋 Subject:', `${type === 'blog' ? 'Yeni Blog Yazısı' : 'Yeni Mevzuat'}: ${item.title}`);

    await logActivity(req.user.id, 'mail_sent', type, item_id, {
      title: item.title,
      sent: 1,
      failed: 0,
      total: 1,
      recipients: 'single',
      email,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Send to email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ============================================
// SETTINGS ROUTES
// ============================================

// Get mail settings (protected)
app.get('/settings/mail', async (req, res) => {
  try {
    const settings = await db.get('settings:mail') || {
      resend_api_key: '',
      mail_from_name: 'Önder Denetim',
      mail_from_email: 'noreply@onderdenetim.com',
    };

    res.json({ settings });
  } catch (error) {
    console.error('Get mail settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update mail settings (protected)
app.post('/settings/mail', async (req, res) => {
  try {
    const settings = req.body;

    await db.set('settings:mail', settings);
    await logActivity(req.user.id, 'update', 'settings', 'mail', settings);

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update mail settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get social media settings (protected)
app.get('/settings/social', async (req, res) => {
  try {
    const settings = await db.get('settings:social') || {
      instagram_access_token: '',
      instagram_business_account_id: '',
      linkedin_access_token: '',
      linkedin_organization_id: '',
    };

    res.json({ settings });
  } catch (error) {
    console.error('Get social settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update social media settings (protected)
app.post('/settings/social', async (req, res) => {
  try {
    const settings = req.body;

    await db.set('settings:social', settings);
    await logActivity(req.user.id, 'update', 'settings', 'social', settings);

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update social settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// SOCIAL MEDIA ROUTES
// ============================================

// Post to social media (protected)
app.post('/social/post', async (req, res) => {
  try {
    const { blog_post_id, platforms, custom_message } = req.body;

    // Get blog post
    const blogPost = await db.get(`blogPosts:${blog_post_id}`);
    if (!blogPost) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Get social settings
    const settings = await db.get('settings:social') || {};

    // For local testing, just log
    console.log('📱 [SOCIAL POST] Would post to platforms:', platforms);
    console.log('📋 Message:', custom_message || blogPost.title);

    const results = {
      instagram: platforms.includes('instagram') ? { success: true, post_id: 'test-' + uuidv4() } : null,
      linkedin: platforms.includes('linkedin') ? { success: true, post_id: 'test-' + uuidv4() } : null,
    };

    // Save social media post record
    const socialPostId = uuidv4();
    await db.set(`socialPosts:${socialPostId}`, {
      id: socialPostId,
      blog_post_id,
      platforms,
      results,
      posted_at: new Date().toISOString(),
      status: 'success',
    });

    await logActivity(req.user.id, 'social_share', 'blog', blog_post_id, {
      title: blogPost.title,
      platforms,
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error('Social post error:', error);
    res.status(500).json({ error: 'Failed to post to social media' });
  }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// Track page view (public)
app.post('/analytics/pageview', async (req, res) => {
  try {
    const { page, referrer, user_agent } = req.body;

    const viewId = uuidv4();
    const view = {
      id: viewId,
      page,
      referrer: referrer || '',
      user_agent: user_agent || '',
      timestamp: new Date().toISOString(),
    };

    await db.set(`pageViews:${viewId}`, view);

    res.json({ success: true });
  } catch (error) {
    console.error('Track pageview error:', error);
    res.status(500).json({ error: 'Failed to track pageview' });
  }
});

// Get analytics data (protected)
app.get('/analytics/data', async (req, res) => {
  try {
    const pageViews = await db.getByPrefix('pageViews:');
    const subscribers = await db.getByPrefix('subscribers:');
    const blogPosts = await db.getByPrefix('blogPosts:');
    const logs = await db.getByPrefix('logs:');

    // Calculate stats
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const analytics = {
      pageviews: {
        total: pageViews.length,
        last_7_days: pageViews.filter(v => new Date(v.timestamp) > last7Days).length,
        last_30_days: pageViews.filter(v => new Date(v.timestamp) > last30Days).length,
      },
      subscribers: {
        total: subscribers.filter(s => s.is_active).length,
        inactive: subscribers.filter(s => !s.is_active).length,
      },
      blog_posts: {
        total: blogPosts.length,
        published: blogPosts.filter(p => p.status === 'published').length,
        draft: blogPosts.filter(p => p.status === 'draft').length,
      },
      mail_campaigns: {
        total_sent: logs.filter(l => l.action === 'mail_sent').reduce((acc, l) => acc + (l.details?.sent || 0), 0),
        total_campaigns: logs.filter(l => l.action === 'mail_sent').length,
      },
      top_pages: Object.entries(
        pageViews.reduce((acc, v) => {
          acc[v.page] = (acc[v.page] || 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, views]) => ({ page, views })),
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ============================================
// ACTIVITY LOGS ROUTES
// ============================================

// Get all logs (protected)
app.get('/logs', async (req, res) => {
  try {
    const logs = await db.getByPrefix('logs:');
    const sortedLogs = logs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    res.json({ logs: sortedLogs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ============================================
// STATS ROUTE
// ============================================

// Get statistics (protected)
app.get('/stats', async (req, res) => {
  try {
    const logs = await db.getByPrefix('logs:');
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total_logs: logs.length,
      last_7_days: logs.filter(l => new Date(l.timestamp) > sevenDaysAgo).length,
      last_30_days: logs.filter(l => new Date(l.timestamp) > thirtyDaysAgo).length,
      action_counts: {
        create: logs.filter(l => l.action === 'create').length,
        update: logs.filter(l => l.action === 'update').length,
        delete: logs.filter(l => l.action === 'delete').length,
        mail_sent: logs.filter(l => l.action === 'mail_sent').length,
        social_share: logs.filter(l => l.action === 'social_share').length,
      },
      entity_counts: {
        blog: logs.filter(l => l.entity === 'blog').length,
        regulation: logs.filter(l => l.entity === 'regulation').length,
      },
      daily_activity: [],
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, async () => {
  console.log('\n🚀 ═══════════════════════════════════════════════════');
  console.log(`🚀 Önder Denetim Backend Started`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 URL: http://localhost:${PORT}`);
  console.log('🚀 Environment: Local Development');
  console.log('🚀 Database: JSON File Store');
  console.log('🚀 ═══════════════════════════════════════════════════\n');

  // Initialize default admin
  await initializeDefaultAdmin();

  console.log('✅ All endpoints active:');
  console.log('   - Authentication');
  console.log('   - Blog Management');
  console.log('   - Regulations');
  console.log('   - Subscribers');
  console.log('   - Mail Campaigns');
  console.log('   - Social Media');
  console.log('   - Analytics');
  console.log('   - Settings');
  console.log('   - Activity Logs\n');
});

// ============================================
// ERROR HANDLING - Must be last middleware
// ============================================
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to exit: process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
