/**
 * Environment Variables Validation
 * Production'a geçmeden önce tüm gerekli değişkenleri kontrol eder
 */

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = {
  development: [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET'
  ],
  production: [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'ALLOWED_ORIGINS',
    'RESEND_API_KEY',
    'ADMIN_EMAIL',
    'FRONTEND_URL'
  ]
};

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_ENV_VARS = [
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'AUTH_RATE_LIMIT_MAX',
  'MAX_FILE_SIZE',
  'UPLOAD_DIR',
  'LOG_LEVEL',
  'DATABASE_URL'
];

/**
 * Validation rules for specific variables
 */
const VALIDATION_RULES = {
  PORT: (value) => {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return 'Port must be between 1 and 65535';
    }
    return null;
  },

  JWT_SECRET: (value) => {
    if (value.length < 32) {
      return 'JWT_SECRET should be at least 32 characters long for security';
    }
    if (value === 'your-super-secret-jwt-key-change-this-in-production') {
      return 'JWT_SECRET must be changed from default value';
    }
    return null;
  },

  NODE_ENV: (value) => {
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(value)) {
      return `NODE_ENV must be one of: ${validEnvs.join(', ')}`;
    }
    return null;
  },

  ALLOWED_ORIGINS: (value) => {
    if (value === '*') {
      return 'ALLOWED_ORIGINS should not be wildcard (*) in production';
    }
    return null;
  },

  RESEND_API_KEY: (value) => {
    if (!value || value.length < 20) {
      return 'RESEND_API_KEY appears to be invalid';
    }
    return null;
  },

  ADMIN_EMAIL: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'ADMIN_EMAIL must be a valid email address';
    }
    return null;
  },

  FRONTEND_URL: (value) => {
    try {
      new URL(value);
      return null;
    } catch {
      return 'FRONTEND_URL must be a valid URL';
    }
  },

  RATE_LIMIT_WINDOW_MS: (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1000) {
      return 'RATE_LIMIT_WINDOW_MS must be at least 1000 (1 second)';
    }
    return null;
  },

  MAX_FILE_SIZE: (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1024) {
      return 'MAX_FILE_SIZE must be at least 1024 bytes';
    }
    if (num > 100 * 1024 * 1024) {
      return 'MAX_FILE_SIZE should not exceed 100MB';
    }
    return null;
  }
};

/**
 * Validate environment variables
 */
export const validateEnv = () => {
  const env = process.env.NODE_ENV || 'development';
  const errors = [];
  const warnings = [];

  console.log('\n🔍 Validating environment variables...');
  console.log(`📍 Environment: ${env}`);

  // Check required variables
  const required = REQUIRED_ENV_VARS[env] || REQUIRED_ENV_VARS.development;

  for (const varName of required) {
    const value = process.env[varName];

    if (!value) {
      errors.push(`❌ Missing required variable: ${varName}`);
      continue;
    }

    // Run validation rule if exists
    if (VALIDATION_RULES[varName]) {
      const error = VALIDATION_RULES[varName](value);
      if (error) {
        errors.push(`❌ ${varName}: ${error}`);
      }
    }
  }

  // Check recommended variables
  for (const varName of RECOMMENDED_ENV_VARS) {
    const value = process.env[varName];

    if (!value) {
      warnings.push(`⚠️  Recommended variable not set: ${varName}`);
      continue;
    }

    // Run validation rule if exists
    if (VALIDATION_RULES[varName]) {
      const error = VALIDATION_RULES[varName](value);
      if (error) {
        warnings.push(`⚠️  ${varName}: ${error}`);
      }
    }
  }

  // Production-specific checks
  if (env === 'production') {
    // Check if using default passwords
    if (process.env.DEFAULT_ADMIN_PASSWORD === 'eR4SmOusSe41.G1D3K') {
      errors.push('❌ DEFAULT_ADMIN_PASSWORD must be changed in production');
    }

    // Check if debug mode is disabled
    if (process.env.DEBUG === 'true') {
      warnings.push('⚠️  DEBUG mode should be disabled in production');
    }

    // Check HTTPS
    if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith('http://')) {
      warnings.push('⚠️  FRONTEND_URL should use HTTPS in production');
    }
  }

  // Report results
  console.log('\n📋 Validation Results:');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables are properly configured!');
  } else {
    if (errors.length > 0) {
      console.log('\n🔴 ERRORS (must be fixed):');
      errors.forEach(err => console.log(`   ${err}`));
    }

    if (warnings.length > 0) {
      console.log('\n🟡 WARNINGS (recommended to fix):');
      warnings.forEach(warn => console.log(`   ${warn}`));
    }
  }

  console.log('');

  // Return validation result
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment: env
  };
};

/**
 * Get environment summary
 */
export const getEnvSummary = () => {
  const env = process.env.NODE_ENV || 'development';

  return {
    environment: env,
    port: process.env.PORT || 5000,
    database: process.env.DATABASE_URL ? 'Configured' : 'JSON File Store',
    email: process.env.RESEND_API_KEY ? 'Configured' : 'Not Configured',
    social_media: {
      linkedin: process.env.LINKEDIN_ACCESS_TOKEN ? 'Configured' : 'Not Configured',
      instagram: process.env.INSTAGRAM_ACCESS_TOKEN ? 'Configured' : 'Not Configured'
    },
    security: {
      jwt_secret: process.env.JWT_SECRET ? 'Set' : 'Not Set',
      cors_origins: process.env.ALLOWED_ORIGINS ? 'Configured' : 'Development Mode'
    },
    features: {
      file_upload: 'Enabled',
      rate_limiting: 'Enabled',
      analytics: process.env.ENABLE_ANALYTICS === 'true' ? 'Enabled' : 'Disabled'
    }
  };
};

/**
 * Validate on module load in production
 */
if (process.env.NODE_ENV === 'production') {
  const result = validateEnv();

  if (!result.valid) {
    console.error('\n⛔ Environment validation failed!');
    console.error('Cannot start server with invalid configuration.\n');
    process.exit(1);
  }
}
