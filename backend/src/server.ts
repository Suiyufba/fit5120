import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { logger } from './shared/logger.js';
import { startScheduler } from './modules/hazards/services/hazardAggregator.js';
import { initHazardSnapshotStore } from './infrastructure/db/hazardSnapshotRepository.js';
import { initUserStore } from './modules/auth/repositories/userRepository.js';
import { initKnowledgeArticleStore } from './modules/knowledge/repositories/articleRepository.js';
import {
  initCommunityReportStore,
  purgeExpiredCommunityReports,
} from './modules/communityReports/repositories/communityReportRepository.js';
import { initCommunityReportImageStore } from './modules/communityReports/repositories/communityReportImageRepository.js';
import { initManualHazardStore } from './modules/hazards/repositories/manualHazardRepository.js';
import { initRouteGeographyStore } from './modules/routes/repositories/routeGeographyRepository.js';
import { initRoutePlanHistoryStore } from './modules/routes/repositories/routePlanHistoryRepository.js';

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

app.use((req: Request, res: Response, next: NextFunction) => {
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

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.request(req.method, req.originalUrl, res.statusCode, Date.now() - start);
  });
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use('/api', apiRouter);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

async function boot(): Promise<void> {
  try {
    const dbReady = await initHazardSnapshotStore();
    const userStoreReady = await initUserStore();
    const knowledgeReady = await initKnowledgeArticleStore();
    const communityReportStoreReady = await initCommunityReportStore();
    const communityReportImageStoreReady = await initCommunityReportImageStore();
    const manualHazardStoreReady = await initManualHazardStore();
    const routeGeographyStoreReady = await initRouteGeographyStore();
    const routePlanHistoryStoreReady = await initRoutePlanHistoryStore();

    if (dbReady) {
      console.log('Postgres snapshot store ready');
    } else {
      console.warn('DATABASE_URL is not set, fallback to in-memory snapshot only');
    }
    if (userStoreReady) {
      console.log('User auth store ready');
    }
    if (knowledgeReady) {
      console.log('Knowledge article store ready');
    }
    if (communityReportStoreReady) {
      console.log('Community report store ready');
    } else {
      console.warn('DATABASE_URL is not set, community reports fallback to in-memory');
    }
    if (communityReportImageStoreReady) {
      console.log('Community report image store ready');
    } else {
      console.warn('DATABASE_URL is not set, community report images fallback to in-memory');
    }
    if (manualHazardStoreReady) {
      console.log('Manual hazard store ready');
    } else {
      console.warn('DATABASE_URL is not set, manual hazard fallback to in-memory');
    }
    if (routeGeographyStoreReady) {
      console.log('Route geography store ready');
    } else {
      console.warn('DATABASE_URL is not set, route geography cache disabled');
    }
    if (routePlanHistoryStoreReady) {
      console.log('Route plan history store ready');
    } else {
      console.warn('DATABASE_URL is not set, route plan history disabled');
    }
  } catch (error) {
    console.error('Failed to initialize database stores:', (error as Error).message);
  }

  app.listen(config.port, () => {
    startScheduler();
    startCommunityReportPurger();
    console.log(`Hazard backend listening on :${config.port}`);
  });
}

function startCommunityReportPurger(): void {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const runOnce = async () => {
    try {
      const { removed, storage } = await purgeExpiredCommunityReports();
      if (removed > 0) {
        console.log(`Purged ${removed} expired community report(s) from ${storage}.`);
      }
    } catch (error) {
      console.error('Community report purge failed:', (error as Error)?.message || error);
    }
  };

  runOnce();
  setInterval(runOnce, ONE_HOUR_MS).unref?.();
}

boot();
