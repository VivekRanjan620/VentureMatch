import { ErrorCode, ERROR_CODES } from '../config/constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, ERROR_CODES.INVALID_INPUT, message, details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, ERROR_CODES.CONFLICT, message);
  }

  static rateLimitReached(message = 'Daily limit reached'): AppError {
    return new AppError(429, ERROR_CODES.DAILY_LIMIT_REACHED, message);
  }

  static invalidTransition(message = 'Invalid status transition'): AppError {
    return new AppError(409, ERROR_CODES.INVALID_TRANSITION, message);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, ERROR_CODES.INTERNAL_SERVER_ERROR, message);
  }
}
