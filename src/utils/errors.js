/**
 * Custom error classes for better error handling
 */

/**
 * Base application error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Discord API related errors
 */
class DiscordAPIError extends AppError {
  constructor(message, statusCode = 500, endpoint = null, method = null) {
    super(message, statusCode);
    this.endpoint = endpoint;
    this.method = method;
  }
}

/**
 * Validation errors
 */
class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
  }
}

/**
 * Authentication errors
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

/**
 * Authorization errors
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

/**
 * Rate limit errors
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

/**
 * Database errors
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * AI service errors
 */
class AIServiceError extends AppError {
  constructor(message, service = 'AI') {
    super(message, 503);
    this.service = service;
  }
}

/**
 * Backup/Restore errors
 */
class BackupError extends AppError {
  constructor(message, operation = null) {
    super(message, 500);
    this.operation = operation;
  }
}

/**
 * Server cloning errors
 */
class CloneError extends AppError {
  constructor(message, phase = null) {
    super(message, 500);
    this.phase = phase;
  }
}

/**
 * Error handler middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  const logger = require('./logger');
  
  // Log error
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    correlationId: req.correlationId,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Default error response
  let error = {
    success: false,
    message: err.isOperational ? err.message : 'Internal server error',
    correlationId: req.correlationId
  };
  
  // Add additional error details in development
  if (isDevelopment) {
    error.stack = err.stack;
    error.details = {
      name: err.name,
      statusCode: err.statusCode,
      isOperational: err.isOperational
    };
  }
  
  // Add specific error details based on error type
  if (err instanceof ValidationError && err.field) {
    error.field = err.field;
  }
  
  if (err instanceof RateLimitError && err.retryAfter) {
    error.retryAfter = err.retryAfter;
    res.set('Retry-After', err.retryAfter);
  }
  
  if (err instanceof DiscordAPIError) {
    error.endpoint = err.endpoint;
    error.method = err.method;
  }
  
  res.status(err.statusCode || 500).json(error);
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create error response
 */
const createErrorResponse = (message, statusCode = 500, details = {}) => ({
  success: false,
  message,
  statusCode,
  timestamp: new Date().toISOString(),
  ...details
});

module.exports = {
  AppError,
  DiscordAPIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  DatabaseError,
  AIServiceError,
  BackupError,
  CloneError,
  errorHandler,
  asyncHandler,
  createErrorResponse
};