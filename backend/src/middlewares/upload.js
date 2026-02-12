import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload Middleware with Multer
 * Handles file uploads with validation and organization
 */

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(config.upload.uploadDir, { recursive: true });
    await fs.mkdir(path.join(config.upload.uploadDir, 'images'), { recursive: true });
    await fs.mkdir(path.join(config.upload.uploadDir, 'documents'), { recursive: true });
    await fs.mkdir(path.join(config.upload.uploadDir, 'temp'), { recursive: true });
  } catch (error) {
    logger.error('Error creating upload directories:', error);
  }
};

ensureUploadDir();

// Storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const isImage = file.mimetype.startsWith('image/');
      const destFolder = isImage ? 'images' : 'documents';
      const dest = path.join(config.upload.uploadDir, destFolder);

      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = config.upload.allowedFileTypes;

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Desteklenmeyen dosya tipi: ${file.mimetype}. İzin verilenler: ${allowedMimes.join(', ')}`), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize, // 10MB default
    files: 5 // Maximum 5 files at once
  }
});

// Error handler for multer errors
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Dosya boyutu çok büyük',
        maxSize: `${config.upload.maxFileSize / 1024 / 1024}MB`
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Çok fazla dosya',
        maxFiles: 5
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Beklenmeyen dosya alanı'
      });
    }
  }

  if (error.message) {
    return res.status(400).json({
      error: error.message
    });
  }

  next(error);
};
