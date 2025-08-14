const Joi = require('joi');
const path = require('path');

// Load environment variables
require('dotenv').config();

/**
 * Configuration schema validation
 */
const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  
  // Discord Configuration
  DISCORD_TOKEN: Joi.string().required(),
  DISCORD_CLIENT_ID: Joi.string().required(),
  DISCORD_GUILD_ID: Joi.string().when('NODE_ENV', {
    is: 'development',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  
  // Database Configuration
  DATABASE_URL: Joi.string().default('sqlite:./data/lunii.db'),
  DB_LOGGING: Joi.boolean().default(false),
  
  // Redis Configuration
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),
  
  // AI Configuration
  ENABLE_AI: Joi.boolean().default(false),
  GEMINI_API_KEY: Joi.string().when('ENABLE_AI', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  AI_RATE_LIMIT: Joi.number().default(10),
  AI_RATE_WINDOW: Joi.number().default(60000),
  
  // Security Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().length(32).required(),
  RATE_LIMIT_WINDOW: Joi.number().default(900000),
  RATE_LIMIT_MAX: Joi.number().default(100),
  
  // Backup Configuration
  BACKUP_DIR: Joi.string().default('./backups'),
  MAX_BACKUP_SIZE: Joi.string().default('100MB'),
  BACKUP_RETENTION_DAYS: Joi.number().default(30),
  
  // Monitoring Configuration
  HEALTH_CHECK_INTERVAL: Joi.number().default(30000),
  METRICS_ENABLED: Joi.boolean().default(true),
  ERROR_WEBHOOK_URL: Joi.string().uri().optional(),
  
  // Development Configuration
  DEBUG_MODE: Joi.boolean().default(false),
  MOCK_DISCORD_API: Joi.boolean().default(false),
  TEST_GUILD_ID: Joi.string().optional()
});

/**
 * Validate and export configuration
 */
const { error, value: config } = configSchema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: true
});

if (error) {
  throw new Error(`Configuration validation error: ${error.message}`);
}

/**
 * Derived configuration values
 */
config.isDevelopment = config.NODE_ENV === 'development';
config.isProduction = config.NODE_ENV === 'production';
config.isTest = config.NODE_ENV === 'test';

// Database configuration
config.database = {
  url: config.DATABASE_URL,
  logging: config.DB_LOGGING,
  dialect: config.DATABASE_URL.startsWith('postgres') ? 'postgres' : 'sqlite',
  storage: config.DATABASE_URL.startsWith('sqlite') ? 
    path.resolve(config.DATABASE_URL.replace('sqlite:', '')) : undefined
};

// Redis configuration
config.redis = {
  url: config.REDIS_URL,
  password: config.REDIS_PASSWORD || undefined,
  db: config.REDIS_DB
};

// AI configuration
config.ai = {
  enabled: config.ENABLE_AI,
  apiKey: config.GEMINI_API_KEY,
  rateLimit: config.AI_RATE_LIMIT,
  rateWindow: config.AI_RATE_WINDOW
};

// Security configuration
config.security = {
  jwtSecret: config.JWT_SECRET,
  encryptionKey: config.ENCRYPTION_KEY,
  rateLimitWindow: config.RATE_LIMIT_WINDOW,
  rateLimitMax: config.RATE_LIMIT_MAX
};

// Backup configuration
config.backup = {
  directory: path.resolve(config.BACKUP_DIR),
  maxSize: config.MAX_BACKUP_SIZE,
  retentionDays: config.BACKUP_RETENTION_DAYS
};

// Monitoring configuration
config.monitoring = {
  healthCheckInterval: config.HEALTH_CHECK_INTERVAL,
  metricsEnabled: config.METRICS_ENABLED,
  errorWebhookUrl: config.ERROR_WEBHOOK_URL
};

module.exports = config;