import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';
import http from 'node:http';
import https from 'node:https';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();

// Basic image proxy to work around CORS when cropping remote images on the client.
// Important: This does NOT store images. It only streams for preview/cropping.
// Images are stored after client-side crop via the existing upload endpoint.

const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_REDIRECTS = 3;

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function proxyImage(url: string, res: Response, redirectCount = 0): void {
  const u = new URL(url);
  const client = u.protocol === 'https:' ? https : http;

  const request = client.get(
    u,
    {
      headers: {
        'User-Agent': 'CharHub-Media-Proxy/1.0',
        Accept: 'image/*,*/*;q=0.8',
      },
    },
    (remote) => {
      // Handle redirects
      if (
        remote.statusCode &&
        remote.statusCode >= 300 &&
        remote.statusCode < 400 &&
        remote.headers.location
      ) {
        if (redirectCount >= MAX_REDIRECTS) {
          sendError(res, 508, API_ERROR_CODES.EXTERNAL_SERVICE_ERROR, { message: 'Too many redirects' });
          remote.destroy();
          return;
        }
        const nextUrl = new URL(remote.headers.location, u).toString();
        remote.destroy();
        proxyImage(nextUrl, res, redirectCount + 1);
        return;
      }

      if ((remote.statusCode || 0) >= 400) {
        sendError(res, 502, API_ERROR_CODES.EXTERNAL_SERVICE_ERROR, { message: `Failed to fetch image: ${remote.statusCode}` });
        remote.destroy();
        return;
      }

      const contentType = String(remote.headers['content-type'] || '');
      if (!contentType.startsWith('image/')) {
        sendError(res, 415, API_ERROR_CODES.INVALID_INPUT, { message: 'URL does not point to an image' });
        remote.destroy();
        return;
      }

      const contentLengthHeader = remote.headers['content-length'];
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
      if (contentLength && contentLength > MAX_DOWNLOAD_BYTES) {
        sendError(res, 413, API_ERROR_CODES.VALUE_OUT_OF_RANGE, { message: 'Image is too large' });
        remote.destroy();
        return;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store');

      let downloaded = 0;
      remote.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        if (downloaded > MAX_DOWNLOAD_BYTES) {
          res.status(413).end();
          remote.destroy();
          return;
        }
        res.write(chunk);
      });

      remote.on('end', () => {
        res.end();
      });

      remote.on('error', (err) => {
        logger.error({ err }, 'media_proxy_stream_error');
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.end();
        }
      });
    }
  );

  request.setTimeout(10000, () => {
    logger.warn({ url }, 'media_proxy_timeout');
    request.destroy(new Error('Request timed out'));
    if (!res.headersSent) res.status(504).end();
  });

  request.on('error', (err) => {
    logger.error({ err }, 'media_proxy_request_error');
    if (!res.headersSent) {
      sendError(res, 502, API_ERROR_CODES.EXTERNAL_SERVICE_ERROR, { message: 'Failed to fetch image' });
    } else {
      res.end();
    }
  });
}

router.get('/proxy', requireAuth, (req: Request, res: Response): void => {
  const url = typeof req.query.url === 'string' ? req.query.url : '';
  if (!url || !isHttpUrl(url)) {
    sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, { message: 'Invalid or missing URL', field: 'url' });
    return;
  }
  try {
    proxyImage(url, res);
  } catch (error) {
    logger.error({ error }, 'media_proxy_error');
    sendError(res, 500, API_ERROR_CODES.INTERNAL_ERROR, { message: 'Failed to proxy image' });
  }
});

export default router;
