import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logger } from '../config/logger';

/**
 * Multer error handler middleware
 * Handles file upload errors and returns appropriate HTTP responses
 */
export function multerErrorHandler(
  error: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  if (error instanceof multer.MulterError) {
    logger.warn({ error: error.message, code: error.code, field: error.field }, 'Multer error');

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          message: 'File size exceeds the maximum limit of 10MB. The image will be compressed after upload.',
          error: 'FILE_TOO_LARGE',
          maxSize: '10MB',
        });

      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded',
          error: 'TOO_MANY_FILES',
        });

      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: `Unexpected field: ${error.field}`,
          error: 'UNEXPECTED_FIELD',
        });

      case 'LIMIT_PART_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many parts in multipart upload',
          error: 'TOO_MANY_PARTS',
        });

      case 'LIMIT_FIELD_KEY':
        return res.status(400).json({
          success: false,
          message: 'Field name too long',
          error: 'FIELD_NAME_TOO_LONG',
        });

      case 'LIMIT_FIELD_VALUE':
        return res.status(400).json({
          success: false,
          message: 'Field value too long',
          error: 'FIELD_VALUE_TOO_LONG',
        });

      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many fields',
          error: 'TOO_MANY_FIELDS',
        });

      default:
        return res.status(400).json({
          success: false,
          message: error.message || 'File upload error',
          error: 'UPLOAD_ERROR',
        });
    }
  }

  // If it's not a Multer error, pass to next error handler
  if (error) {
    logger.error({ error }, 'Non-multer error in upload');
    return res.status(500).json({
      success: false,
      message: 'Internal server error during file upload',
      error: 'INTERNAL_ERROR',
    });
  }

  next();
}

/**
 * Wrapper to catch multer errors in async route handlers
 * Usage: router.post('/upload', asyncMulterHandler(upload.single('file')), async (req, res) => {...})
 */
export function asyncMulterHandler(uploadMiddleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (error: any) => {
      if (error) {
        return multerErrorHandler(error, req, res, next);
      }
      next();
    });
  };
}
