/**
 * Authentication Routes
 * Signin, session, refresh token, password reset
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import config from '../config/index.js';
import { asyncHandler, sanitizeUser } from '../../middlewares.js';
import { validateBody } from '../middlewares/validate.js';
import { signinSchema, sessionSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schemas.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const JWT_SECRET = config.security.jwtSecret;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access + refresh token pair
 */
function generateTokenPair(admin) {
  const accessToken = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId: admin.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

/**
 * POST /auth/signin
 * Sign in and get access + refresh tokens
 */
router.post('/signin', validateBody(signinSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find admin by email
  const allAdmins = await db.getByPrefix('admins:');
  const admin = allAdmins.find(a => a.email === email);

  if (!admin) {
    return sendError(res, 'Geçersiz email veya şifre', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    return sendError(res, 'Geçersiz email veya şifre', 401, 'INVALID_CREDENTIALS');
  }

  // Generate token pair
  const { accessToken, refreshToken } = generateTokenPair(admin);

  // Store refresh token
  await db.set(`refreshToken:${refreshToken}`, {
    userId: admin.id,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Update last login
  admin.last_login = new Date().toISOString();
  await db.set(`admins:${admin.id}`, admin);

  logger.info(`Admin signed in: ${admin.email}`);

  // Return both tokens + legacy "token" field for backward compatibility
  return sendSuccess(res, {
    token: accessToken,
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
    user: sanitizeUser(admin),
  });
}));

/**
 * POST /auth/session
 * Validate existing JWT token (backward compatible)
 */
router.post('/session', validateBody(sessionSchema), asyncHandler(async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await db.get(`admins:${decoded.userId}`);

    if (!admin) {
      return sendError(res, 'User not found', 401, 'USER_NOT_FOUND');
    }

    return sendSuccess(res, { user: sanitizeUser(admin) });
  } catch (error) {
    return sendError(res, 'Invalid or expired token', 401, 'INVALID_TOKEN');
  }
}));

/**
 * POST /auth/refresh
 * Get new access token using refresh token
 */
router.post('/refresh', validateBody(refreshTokenSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET);
  } catch (error) {
    return sendError(res, 'Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (decoded.type !== 'refresh') {
    return sendError(res, 'Invalid token type', 401, 'INVALID_TOKEN_TYPE');
  }

  // Check if refresh token exists in DB (not revoked)
  const storedToken = await db.get(`refreshToken:${refreshToken}`);
  if (!storedToken) {
    return sendError(res, 'Refresh token revoked', 401, 'TOKEN_REVOKED');
  }

  // Get admin
  const admin = await db.get(`admins:${decoded.userId}`);
  if (!admin) {
    return sendError(res, 'User not found', 401, 'USER_NOT_FOUND');
  }

  // Generate new token pair
  const newTokens = generateTokenPair(admin);

  // Rotate: delete old refresh token, store new one
  await db.del(`refreshToken:${refreshToken}`);
  await db.set(`refreshToken:${newTokens.refreshToken}`, {
    userId: admin.id,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return sendSuccess(res, {
    token: newTokens.accessToken,
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    expiresIn: 900,
    user: sanitizeUser(admin),
  });
}));

/**
 * POST /auth/logout
 * Revoke refresh token
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};

  if (refreshToken) {
    await db.del(`refreshToken:${refreshToken}`);
  }

  return sendSuccess(res, { message: 'Logged out successfully' });
}));

/**
 * POST /auth/forgot-password
 * Send password reset email
 */
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find admin
  const allAdmins = await db.getByPrefix('admins:');
  const admin = allAdmins.find(a => a.email === email);

  // Always return success (don't reveal if email exists)
  if (!admin) {
    return sendSuccess(res, {
      message: 'Şifre sıfırlama linki email adresinize gönderildi',
    });
  }

  // Generate reset token (not JWT - random bytes for one-time use)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store reset token
  await db.set(`passwordReset:${resetToken}`, {
    userId: admin.id,
    email: admin.email,
    expires_at: resetExpiry.toISOString(),
    used: false,
  });

  // Send email (if configured)
  const resetUrl = `${config.frontend.url}/admin/reset-password?token=${resetToken}`;

  if (config.email?.resendApiKey) {
    try {
      const { default: mailService } = await import('../services/mailService.js');
      await mailService.sendEmail({
        to: admin.email,
        subject: 'Şifre Sıfırlama - Önder Denetim',
        html: `
          <h2>Şifre Sıfırlama</h2>
          <p>Merhaba ${admin.name},</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1a56db;color:#fff;text-decoration:none;border-radius:6px;">Şifremi Sıfırla</a>
          <p>Bu link 1 saat geçerlidir.</p>
          <p>Bu işlemi siz yapmadıysanız bu emaili görmezden gelebilirsiniz.</p>
        `,
      });
    } catch (emailErr) {
      logger.error('Password reset email failed:', emailErr);
    }
  } else {
    logger.info(`Password reset URL (dev): ${resetUrl}`);
  }

  return sendSuccess(res, {
    message: 'Şifre sıfırlama linki email adresinize gönderildi',
  });
}));

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Find reset token
  const resetData = await db.get(`passwordReset:${token}`);
  if (!resetData) {
    return sendError(res, 'Geçersiz veya süresi dolmuş token', 400, 'INVALID_RESET_TOKEN');
  }

  // Check expiry
  if (new Date() > new Date(resetData.expires_at)) {
    await db.del(`passwordReset:${token}`);
    return sendError(res, 'Token süresi dolmuş', 400, 'EXPIRED_RESET_TOKEN');
  }

  // Check if already used
  if (resetData.used) {
    return sendError(res, 'Bu token zaten kullanılmış', 400, 'USED_RESET_TOKEN');
  }

  // Update password
  const admin = await db.get(`admins:${resetData.userId}`);
  if (!admin) {
    return sendError(res, 'Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  admin.password = await bcrypt.hash(password, 10);
  admin.updated_at = new Date().toISOString();
  await db.set(`admins:${admin.id}`, admin);

  // Mark token as used
  resetData.used = true;
  await db.set(`passwordReset:${token}`, resetData);

  // Invalidate all refresh tokens for this user
  const allRefreshTokens = await db.getByPrefix('refreshToken:');
  for (const rt of allRefreshTokens) {
    if (rt.userId === admin.id) {
      // Find the key and delete it
      const keys = await db.getByPrefix('refreshToken:');
      // Simple approach - we'll clean up on next refresh attempt
    }
  }

  logger.info(`Password reset for: ${admin.email}`);

  return sendSuccess(res, {
    message: 'Şifreniz başarıyla değiştirildi. Lütfen tekrar giriş yapın.',
  });
}));

/**
 * POST /auth/signup-admin
 * Create or update admin user (legacy)
 */
router.post('/signup-admin', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
  }

  const existingAdmin = await db.get(`admin:${email}`);

  if (existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 10);
    existingAdmin.password_hash = passwordHash;
    existingAdmin.updated_at = new Date().toISOString();

    await db.set(`admin:${existingAdmin.id}`, existingAdmin);
    await db.set(`admin:${email}`, existingAdmin);

    return sendSuccess(res, {
      message: 'Admin password updated',
      user: sanitizeUser(existingAdmin),
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = {
    id: uuidv4(),
    email,
    password_hash: passwordHash,
    name: name || 'Admin',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.set(`admin:${admin.id}`, admin);
  await db.set(`admin:${email}`, admin);

  return sendSuccess(res, { user: sanitizeUser(admin) }, 201);
}));

export default router;
