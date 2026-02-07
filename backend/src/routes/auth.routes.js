/**
 * Authentication Routes
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import config from '../config/index.js';
import { asyncHandler, validators, validateRequest, sanitizeUser } from '../../middlewares.js';

const router = express.Router();
const JWT_SECRET = config.security.jwtSecret;

/**
 * POST /auth/signup-admin
 * Create or update admin user
 */
router.post('/signup-admin', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existingAdmin = await db.get(`admin:${email}`);

  if (existingAdmin) {
    // Update password
    const passwordHash = await bcrypt.hash(password, 10);
    existingAdmin.password_hash = passwordHash;
    existingAdmin.updated_at = new Date().toISOString();

    await db.set(`admin:${existingAdmin.id}`, existingAdmin);
    await db.set(`admin:${email}`, existingAdmin);

    return res.json({
      success: true,
      message: 'Admin password updated',
      user: sanitizeUser(existingAdmin)
    });
  }

  // Create new admin
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = {
    id: uuidv4(),
    email,
    password_hash: passwordHash,
    name: name || 'Admin',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.set(`admin:${admin.id}`, admin);
  await db.set(`admin:${email}`, admin);

  res.json({
    success: true,
    user: sanitizeUser(admin)
  });
}));

/**
 * POST /auth/signin
 * Sign in and get JWT token
 */
router.post('/signin', validators.signin, validateRequest, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // FIX: Search by email in all admins (stored as admins:{uuid})
  const allAdmins = await db.getByPrefix('admins:');
  const admin = allAdmins.find(a => a.email === email);

  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // FIX: Use 'password' not 'password_hash'
  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      userId: admin.id,
      email: admin.email,
      role: admin.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  admin.last_login = new Date().toISOString();
  await db.set(`admins:${admin.id}`, admin);

  res.json({
    success: true,
    token: token,  // Changed from access_token for consistency
    user: sanitizeUser(admin)
  });
}));

/**
 * POST /auth/session
 * Validate existing JWT token
 */
router.post('/session', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await db.get(`admins:${decoded.userId}`);

    if (!admin) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: sanitizeUser(admin)
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}));

export default router;
