import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Application Configuration
 * Centralized configuration management
 */
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    host: process.env.HOST || 'localhost',
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: 10,
  },

  // CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['https://stripe-melody-96442735.figma.site'],
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
  },

  // Default Admin
  defaultAdmin: {
    email: process.env.DEFAULT_ADMIN_EMAIL || 'mertbaytas@gmail.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'eR4SmOusSe41.G1D3K',
    name: process.env.DEFAULT_ADMIN_NAME || 'Site Yöneticisi',
  },

  // Email
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: {
      name: process.env.MAIL_FROM_NAME || 'Önder Denetim',
      email: process.env.MAIL_FROM_EMAIL || 'noreply@onderdenetim.com',
    },
  },

  // Social Media
  social: {
    instagram: {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
      businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
    },
    linkedin: {
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
      organizationId: process.env.LINKEDIN_ORGANIZATION_ID || '',
    },
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(',')
      : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
  },

  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Analytics
  analytics: {
    enabled: process.env.ENABLE_ANALYTICS === 'true',
  },

  // Database (for future use)
  database: {
    url: process.env.DATABASE_URL || '',
  },
};

// Validation
const validateConfig = () => {
  const errors = [];

  // Check critical configs in production
  if (config.isProduction) {
    if (config.security.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
      errors.push('JWT_SECRET must be changed in production');
    }
    if (config.cors.allowedOrigins.includes('*')) {
      errors.push('CORS should not allow all origins in production');
    }
  }

  if (errors.length > 0) {
    console.error('   Configuration Errors:');
    errors.forEach(error => console.error(`   - ${error}`));
    if (config.isProduction) {
      process.exit(1);
    }
  }
};

validateConfig();

export default config;
