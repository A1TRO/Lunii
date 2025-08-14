const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('../config');

/**
 * Custom log format with correlation ID support
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const correlation = correlationId ? `[${correlationId}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${correlation}${message}${metaStr}`;
  })
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'lunii' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for all logs
    new DailyRotateFile({
      filename: path.join('logs', 'lunii-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    
    // Error-only file transport
    new DailyRotateFile({
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join('logs', 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ],
  
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join('logs', 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ]
});

/**
 * Create child logger with correlation ID
 * @param {string} correlationId - Unique identifier for request tracking
 * @returns {winston.Logger} Child logger instance
 */
logger.child = (correlationId) => {
  return logger.child({ correlationId });
};

/**
 * Log Discord API interactions
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {number} status - Response status code
 * @param {number} duration - Request duration in ms
 * @param {string} correlationId - Request correlation ID
 */
logger.discordAPI = (method, endpoint, status, duration, correlationId) => {
  logger.info('Discord API Request', {
    method,
    endpoint,
    status,
    duration,
    correlationId
  });
};

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Operation duration in ms
 * @param {Object} metadata - Additional metadata
 */
logger.performance = (operation, duration, metadata = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    ...metadata
  });
};

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
logger.security = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    ...details
  });
};

/**
 * Log audit events
 * @param {string} action - Action performed
 * @param {string} userId - User who performed the action
 * @param {Object} details - Action details
 */
logger.audit = (action, userId, details = {}) => {
  logger.info('Audit Log', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = logger;