import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { syncOAuthUser } from '../services/userService';
import type { OAuthProvider } from '../types';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_VERSION = process.env.API_VERSION || '/api/v1';

const defaultGoogleCallback = `${API_VERSION}/oauth/google/callback`;
const defaultFacebookCallback = `${API_VERSION}/oauth/facebook/callback`;

async function handleStrategyCallback(
  provider: OAuthProvider,
  profile: any,
  done: (error: any, user?: any) => void
) {
  try {
    const authUser = await syncOAuthUser({
      provider,
      providerAccountId: profile.id,
      email: profile.emails?.[0]?.value,
      displayName: profile.displayName ?? profile._json?.name,
      photo: profile.photos?.[0]?.value,
    });

    done(null, authUser);
  } catch (error) {
    done(error as Error);
  }
}

export function configurePassport(): void {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${BASE_URL}${process.env.GOOGLE_CALLBACK_PATH || defaultGoogleCallback}`,
          scope: ['profile', 'email'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          await handleStrategyCallback('google', profile, done);
        }
      )
    );
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          callbackURL: `${BASE_URL}${process.env.FACEBOOK_CALLBACK_PATH || defaultFacebookCallback}`,
          profileFields: ['id', 'displayName', 'email', 'photos'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          await handleStrategyCallback('facebook', profile, done);
        }
      )
    );
  }

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
}