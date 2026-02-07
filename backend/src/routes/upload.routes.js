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

const router = express.Router();

// POST /upload/image
router.post('/image', upload.single('file'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
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
      type: 'image'
    };

    await db.set(`files:${fileId}`, fileMetadata);

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /upload/file
router.post('/file', upload.single('file'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
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
      type: 'document'
    };

    await db.set(`files:${fileId}`, fileMetadata);

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      type: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /upload/:filename
router.delete('/:filename', async (req, res) => {
  try {
    const files = await db.getByPrefix('files:');
    const file = files.find(f => f.filename === req.params.filename);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const folder = file.type === 'image' ? 'images' : 'documents';
    const filePath = path.join(config.upload.uploadDir, folder, req.params.filename);

    try {
      await fs.unlink(filePath);
    } catch (fsError) {
      console.error('File delete error:', fsError);
    }

    await db.del(`files:${file.id}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Deletion failed' });
  }
});

export default router;
