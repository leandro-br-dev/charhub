import type { AuthenticatedUser } from './index';
import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: AuthenticatedUser;
        token: string;
      };
      log: Logger;
    }
  }
}

export {};