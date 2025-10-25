import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { generateJWT } from '../services/googleAuth';
import crypto from 'crypto';
import type { AuthenticatedUser, OAuthProvider } from '../types';

const router = Router();

type StateValue = {
  createdAt: number;
  redirectUri: string;
};

const stateStore = new Map<string, StateValue>();
const STATE_TTL_MS = 10 * 60 * 1000;

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin.replace(/\/$/, '');
  } catch (_error) {
    return null;
  }
}

function getAllowedFrontendOrigins(): string[] {
  const origins = new Set<string>();

  const primary = normalizeOrigin(process.env.FRONTEND_URL);
  if (primary) {
    origins.add(primary);
  }

  const publicFacing = normalizeOrigin(process.env.PUBLIC_FACING_URL);
  if (publicFacing) {
    origins.add(publicFacing);
  }

  const additional = process.env.FRONTEND_URLS;
  if (additional) {
    additional
      .split(',')
      .map(entry => normalizeOrigin(entry.trim()))
      .filter((origin): origin is string => Boolean(origin))
      .forEach(origin => origins.add(origin));
  }

  if (origins.size === 0) {
    origins.add('http://localhost');
  }

  return Array.from(origins);
}

function defaultRedirect(): string {
  const [firstOrigin] = getAllowedFrontendOrigins();
  return `${firstOrigin.replace(/\/$/, '')}/auth/callback`;
}

function sanitizeRedirectUri(candidate?: string, req?: Request): string {
  if (!candidate) {
    return defaultRedirect();
  }

  const allowedOrigins = getAllowedFrontendOrigins();

  // In development, be more lenient and allow origin from the request
  if ((process.env.NODE_ENV as string) === 'development' && req) {
    const origin = req.get('Origin');
    if (origin && !allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  }

  try {
    const target = new URL(candidate);
    if (allowedOrigins.includes(target.origin)) {
      return target.toString();
    }
  } catch (error) {
    // Fall back to default redirect when malformed
  }

  return defaultRedirect();
}

function generateState(redirectUri: string, req: Request): string {
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, { createdAt: Date.now(), redirectUri });
  req.log.info({ state, redirectUri }, 'oauth_state_created');

  for (const [key, value] of stateStore.entries()) {
    if (Date.now() - value.createdAt > STATE_TTL_MS) {
      stateStore.delete(key);
    }
  }

  return state;
}

function consumeState(state: string, req: Request): StateValue | null {
  const record = stateStore.get(state);
  if (!record) {
    req.log.warn({ state }, 'oauth_state_missing');
    return null;
  }

  stateStore.delete(state);
  if (Date.now() - record.createdAt > STATE_TTL_MS) {
    req.log.warn({ state }, 'oauth_state_expired');
    return null;
  }

  req.log.info({ state, redirectUri: record.redirectUri }, 'oauth_state_consumed');
  return record;
}

function buildRedirectUrl(
  redirectUri: string,
  provider: OAuthProvider,
  token: string,
  user: AuthenticatedUser
): string {
  const url = new URL(redirectUri);
  url.searchParams.set('auth', 'success');
  url.searchParams.set('provider', provider);
  url.searchParams.set('token', token);
  url.searchParams.set(
    'user',
    Buffer.from(
      JSON.stringify({ id: user.id, email: user.email, displayName: user.displayName, photo: user.photo, providerAccountId: user.providerAccountId, role: user.role })
    ).toString('base64')
  );

  return url.toString();
}

function handlePassportSuccess(
  req: Request,
  res: Response,
  provider: OAuthProvider,
  redirectUri: string
) {
  return (err: any, user: AuthenticatedUser | undefined) => {
    if (err || !user) {
      req.log.error({ err }, 'oauth_auth_failed');
      res.status(401).json({ error: 'Authentication failed' });
      return;
    }

    const token = generateJWT(user);

    if (redirectUri) {
      const redirectTarget = buildRedirectUrl(redirectUri, provider, token, user);
      req.log.info({ redirectTarget }, 'oauth_redirect_to_frontend');
      res.redirect(redirectTarget);
      return;
    }

    req.log.info('oauth_response_json_fallback');
    res.json({ success: true, token, user });
  };
}

router.get('/google', (req: Request, res: Response, next: NextFunction): void => {
  const redirectUri = sanitizeRedirectUri(req.query.redirect_uri as string | undefined, req);
  const state = generateState(redirectUri, req);

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction): void => {
    const state = req.query.state as string;
    const stateData = state ? consumeState(state, req) : null;

    if (!stateData) {
      res.status(400).json({ error: 'Invalid state parameter' });
      return;
    }

    if (req.query.error) {
      req.log.warn({ provider: 'google', error: req.query.error }, 'oauth_provider_error');
      res.status(400).json({
        error: req.query.error,
        error_description: req.query.error_description,
      });
      return;
    }

    passport.authenticate(
      'google',
      { session: false },
      handlePassportSuccess(req, res, 'google', stateData.redirectUri)
    )(req, res, next);
  }
);

router.get('/facebook', (req: Request, res: Response, next: NextFunction): void => {
  const redirectUri = sanitizeRedirectUri(req.query.redirect_uri as string | undefined, req);
  const state = generateState(redirectUri, req);
  passport.authenticate('facebook', {
    scope: ['email'],
    state,
  })(req, res, next);
});

router.get(
  '/facebook/callback',
  (req: Request, res: Response, next: NextFunction): void => {
    const state = req.query.state as string;
    const stateData = state ? consumeState(state, req) : null;

    if (!stateData) {
      res.status(400).json({ error: 'Invalid state parameter' });
      return;
    }

    if (req.query.error) {
      req.log.warn({ provider: 'facebook', error: req.query.error }, 'oauth_provider_error');
      res.status(400).json({
        error: req.query.error,
        error_description: req.query.error_description,
      });
      return;
    }

    passport.authenticate(
      'facebook',
      { session: false },
      handlePassportSuccess(req, res, 'facebook', stateData.redirectUri)
    )(req, res, next);
  }
);

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
