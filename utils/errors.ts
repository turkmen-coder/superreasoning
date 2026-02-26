export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string = 'Service') {
    super(`${service} is temporarily unavailable`, 'SERVICE_UNAVAILABLE', 503);
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500, false);
  }

  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR', 500, false);
}

export function logError(error: AppError, context?: Record<string, any>) {
  const errorLog = {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify(errorLog));
  } else {
    console.error('Error:', errorLog);
  }
}

export function errorResponse(error: AppError) {
  return {
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    }
  };
}
