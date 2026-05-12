import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './index.js';
import { apiRouter } from '../routes/index.js';

/**
 * Creates the Express application without starting the server.
 * Useful for tests that need to send HTTP requests to the app.
 */
export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);

  const allowedOrigins = new Set(config.corsOrigins);

  function applyCorsHeaders(req: Request, res: Response): void {
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.has(origin)) return;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Plan-Session-Id');
  }

  app.use((req, res, next) => {
    applyCorsHeaders(req, res);
    next();
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...config.corsOrigins],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
      // Use the configured canonical origin so redirects never embed an
      // attacker-controlled Host header.
      const host = new URL(config.publicApiOrigin).host;
      res.redirect(301, `https://${host}${req.originalUrl}`);
      return;
    }
    next();
  });

  app.use(
    cors({
      origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('CORS origin denied'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Plan-Session-Id'],
      credentials: true,
    }),
  );

  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }
    const origin = req.get('origin');
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Request origin is required' });
        return;
      }
      next();
      return;
    }
    if (!allowedOrigins.has(origin)) {
      res.status(403).json({ error: 'Request origin is not allowed' });
      return;
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));
  app.use('/api', apiRouter);

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
