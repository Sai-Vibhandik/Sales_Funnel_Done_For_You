const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * Simplified Security Middleware Configuration
 *
 * Essential security layers only:
 * - HTTP headers (Helmet)
 * - MongoDB injection prevention
 * - HTTP Parameter Pollution prevention
 * - CORS
 */

/**
 * Helmet - Security Headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
});

/**
 * MongoDB Injection Prevention
 */
const mongoSanitizeConfig = mongoSanitize({
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized MongoDB injection attempt: ${key}`);
  }
});

/**
 * HTTP Parameter Pollution Prevention
 */
const hppConfig = hpp({
  whitelist: ['sort', 'fields', 'status', 'role', 'type', 'stage', 'page', 'limit']
});

/**
 * CORS Configuration
 */
const corsConfig = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Organization-Id',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 600
};

/**
 * Audit Logging Middleware (simplified)
 */
const auditLog = (action) => {
  return async (req, res, next) => {
    // Just log to console for now
    console.log(`[AUDIT] ${action} - ${req.method} ${req.path} - User: ${req.user?._id || 'anonymous'}`);
    next();
  };
};

module.exports = {
  helmetConfig,
  mongoSanitizeConfig,
  hppConfig,
  corsConfig,
  auditLog,
};