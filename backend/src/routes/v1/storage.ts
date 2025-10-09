import crypto from 'node:crypto';
import { Router } from 'express';
import { r2Service, R2ConfigurationError } from '../../services/r2Service';

const router = Router();

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';

router.post('/test-upload', async (req, res, next) => {
  if (!isDevelopment) {
    return res.status(403).json({ error: 'Test upload endpoint is only available in development environments.' });
  }

  const { fileName, content, contentType } = req.body ?? {};

  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ error: 'fileName is required and must be a string.' });
  }

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required and must be a base64 string.' });
  }

  if (!r2Service.isConfigured()) {
    return res.status(503).json({
      error: 'Cloudflare R2 is not configured. Populate the R2_* environment variables to enable uploads.',
      missing: r2Service.getMissingConfig(),
    });
  }

  try {
    const normalizedContent = content.replace(/\s+/g, '');
    const buffer = Buffer.from(normalizedContent, 'base64');

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'content must be a valid base64 string representing at least 1 byte.' });
    }

    const reencoded = buffer.toString('base64').replace(/=+$/, '');
    const sanitizedInput = normalizedContent.replace(/=+$/, '');

    if (reencoded !== sanitizedInput) {
      return res.status(400).json({ error: 'content must be a valid base64 string.' });
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
      return res.status(error.statusCode).json({ error: error.message, missing: error.missingKeys });
    }

    return next(error);
  }
});

export default router;
