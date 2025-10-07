import type { AuthenticatedUser } from './index';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: AuthenticatedUser;
        token: string;
      };
    }
  }
}

export {};