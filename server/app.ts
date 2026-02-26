/**
 * Express app — test icin export (supertest).
 * Calistirma: server/index.ts
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes/index';
import { createStripeWebhookHandler } from './routes/payment';
import { handleError, logError, errorResponse } from '../utils/errors';

const app = express();

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://neomagic.org', 'https://www.neomagic.org']
    : ['http://localhost:3000', 'http://localhost:4173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

app.use(cors(corsOptions));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://neomagic.org https://*.supabase.co https://*.anthropic.com https://*.googleapis.com https://*.groq.com https://*.openai.com https://*.deepseek.com https://openrouter.ai https://*.huggingface.co"
    );
  }
  next();
});

app.post('/v1/webhooks/stripe', express.raw({ type: 'application/json' }), createStripeWebhookHandler());
app.use(express.json({ limit: '1mb' }));

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next();
});

app.use('/v1', routes);
app.use('/api/v1', routes);

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.use((_req, res, next) => {
  if (_req.path.startsWith('/v1') || _req.path.startsWith('/api/v1')) return next();
  if (_req.method !== 'GET') return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const appError = handleError(err);
  logError(appError, {
    method: req.method,
    path: req.path,
    userId: req.authUser?.userId,
  });

  if (!res.headersSent) {
    if (appError.isOperational) {
      res.status(appError.statusCode).json(errorResponse(appError));
    } else {
      // Non-operational errors: hide details in production
      res.status(500).json({
        error: {
          message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : appError.message,
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }
});

export default app;
