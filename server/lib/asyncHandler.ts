/**
 * Async route handler wrapper + centralized error response.
 * Catches thrown errors and converts them to structured JSON responses
 * using the AppError hierarchy from utils/errors.ts.
 *
 * Usage:
 *   router.get('/items', asyncHandler(async (req, res) => {
 *     const items = await db.getItems(req.tenantId);
 *     res.json({ data: items });
 *   }));
 */

import type { Request, Response, NextFunction } from 'express';
import { handleError, logError, errorResponse } from '../../utils/errors';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wrap an async route handler so that rejected promises are caught
 * and forwarded to Express error handling.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => {
      const appError = handleError(err);
      logError(appError, {
        method: req.method,
        path: req.path,
        userId: req.authUser?.userId,
        tenantId: req.tenantId,
      });

      if (!res.headersSent) {
        res.status(appError.statusCode).json(errorResponse(appError));
      }
    });
  };
}
