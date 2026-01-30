import crypto from 'node:crypto';
import { Router } from 'express';
import { r2Service, R2ConfigurationError } from '../../services/r2Service';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';

router.post('/test-upload', async (req, res, next) => {
  if (!isDevelopment) {
    sendError(res, 403, API_ERROR_CODES.FEATURE_DISABLED, {
      message: 'Test upload endpoint is only available in development environments.'
    });
    return;
  }

  const { fileName, content, contentType } = req.body ?? {};

  if (!fileName || typeof fileName !== 'string') {
    sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
      message: 'fileName is required and must be a string.',
      field: 'fileName'
    });
    return;
  }

  if (!content || typeof content !== 'string') {
    sendError(res, 400, API_ERROR_CODES.MISSING_REQUIRED_FIELD, {
      message: 'content is required and must be a base64 string.',
      field: 'content'
    });
    return;
  }

  if (!r2Service.isConfigured()) {
    sendError(res, 503, API_ERROR_CODES.CONFIGURATION_ERROR, {
      message: 'Cloudflare R2 is not configured. Populate the R2_* environment variables to enable uploads.',
      details: { missing: r2Service.getMissingConfig() }
    });
    return;
  }

  try {
    const normalizedContent = content.replace(/\s+/g, '');
    const buffer = Buffer.from(normalizedContent, 'base64');

    if (buffer.length === 0) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: 'content must be a valid base64 string representing at least 1 byte.',
        field: 'content'
      });
      return;
    }

    const reencoded = buffer.toString('base64').replace(/=+$/, '');
    const sanitizedInput = normalizedContent.replace(/=+$/, '');

    if (reencoded !== sanitizedInput) {
      sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, {
        message: 'content must be a valid base64 string.',
        field: 'content'
      });
      return;
    }

    const sanitizedName = fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/gi, '-');

    const safeFileName = sanitizedName.length > 0 ? sanitizedName : 'upload.bin';
    const datePrefix = new Date().toISOString().slice(0, 10);
    const objectKey = `dev/test-uploads/${datePrefix}/${crypto.randomUUID()}-${safeFileName}`;

    const normalizedContentType = typeof contentType === 'string' && contentType.trim().length > 0
      ? contentType.trim()
      : undefined;

    const uploadResult = await r2Service.uploadObject({
      key: objectKey,
      body: buffer,
      contentType: normalizedContentType,
      cacheControl: 'public, max-age=31536000',
    });

    return res.status(201).json({
      message: 'File uploaded to Cloudflare R2 successfully.',
      key: uploadResult.key,
      publicUrl: uploadResult.publicUrl,
      size: buffer.length,
      contentType: normalizedContentType || 'application/octet-stream',
    });
  } catch (error) {
    if (error instanceof R2ConfigurationError) {
      sendError(res, error.statusCode, API_ERROR_CODES.CONFIGURATION_ERROR, {
        message: error.message,
        details: { missing: error.missingKeys }
      });
      return;
    }

    return next(error);
  }
});

export default router;
