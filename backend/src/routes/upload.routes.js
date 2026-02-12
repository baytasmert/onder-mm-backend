/**
 * File Upload Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import * as db from '../../db.js';
import { upload, handleUploadError } from '../middlewares/upload.js';
import config from '../config/index.js';
import { asyncHandler } from '../../middlewares.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const router = express.Router();

// POST /upload/image
router.post('/image', upload.single('file'), handleUploadError, asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const fileId = uuidv4();
  const fileUrl = `/uploads/images/${req.file.filename}`;

  const fileMetadata = {
    id: fileId,
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: fileUrl,
    category: req.body.category || 'general',
    uploaded_by: req.user?.id || 'anonymous',
    uploaded_at: new Date().toISOString(),
    type: 'image',
  };

  await db.set(`files:${fileId}`, fileMetadata);

  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
  });
}));

// POST /upload/file
router.post('/file', upload.single('file'), handleUploadError, asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const fileId = uuidv4();
  const fileUrl = `/uploads/documents/${req.file.filename}`;

  const fileMetadata = {
    id: fileId,
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: fileUrl,
    category: req.body.category || 'general',
    uploaded_by: req.user?.id || 'anonymous',
    uploaded_at: new Date().toISOString(),
    type: 'document',
  };

  await db.set(`files:${fileId}`, fileMetadata);

  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
    type: req.file.mimetype,
  });
}));

// DELETE /upload/:filename
router.delete('/:filename', asyncHandler(async (req, res) => {
  const files = await db.getByPrefix('files:');
  const file = files.find(f => f.filename === req.params.filename);

  if (!file) {
    throw new NotFoundError('File not found');
  }

  const folder = file.type === 'image' ? 'images' : 'documents';
  const filePath = path.join(config.upload.uploadDir, folder, req.params.filename);

  try {
    await fs.unlink(filePath);
  } catch (fsError) {
    logger.error('File delete error:', fsError);
  }

  await db.del(`files:${file.id}`);

  res.json({ success: true, message: 'File deleted successfully' });
}));

export default router;
