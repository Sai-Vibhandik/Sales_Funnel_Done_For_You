const rateLimit = require('express-rate-limit');

/**
 * Simplified Rate Limiter Configuration
 *
 * Uses in-memory store (suitable for single server / development)
 */

/**
 * General API Rate Limiter
 * 1000 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  // Skip OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS'
});

/**
 * Authentication Rate Limiter
 * 50 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT'
  },
  // Skip OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS'
});

/**
 * Registration Rate Limiter
 * 5 registrations per hour per IP
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    code: 'REGISTRATION_RATE_LIMIT'
  },
  // Skip OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS'
});

/**
 * Organization Creation Rate Limiter
 * 10 organizations per hour per user
 */
const orgCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many organizations created. Please try again later.',
    code: 'ORG_CREATE_RATE_LIMIT'
  },
  // Use default key generator (IP-based) for simplicity
  // Skip OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS'
});

/**
 * Team Invitation Rate Limiter
 * 50 invitations per hour per organization
 */
const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many team invitations. Please try again later.',
    code: 'INVITATION_RATE_LIMIT'
  },
  // Use default key generator (IP-based) for simplicity
  // Skip OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS'
});

/**
 * Password Reset Rate Limiter
 * 5 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again later.',
    code: 'RESET_RATE_LIMIT'
  },
  // Skip OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS'
});

/**
 * AI Generation Rate Limiter
 * Checks organization plan limits
 */
const aiLimiter = async (req, res, next) => {
  // Skip OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    if (!req.organizationId) {
      return next();
    }

    const Organization = require('../models/Organization');
    const org = await Organization.findById(req.organizationId);

    if (!org) {
      return next();
    }

    const limits = org.planLimits;
    const usage = org.usage;

    // -1 means unlimited
    if (limits?.aiCallsPerMonth === -1) {
      return next();
    }

    if (usage?.aiCallsThisMonth >= limits?.aiCallsPerMonth) {
      return res.status(429).json({
        success: false,
        message: 'You have reached your AI generation limit for this month.',
        code: 'AI_LIMIT_EXCEEDED'
      });
    }

    next();
  } catch (error) {
    console.error('AI limiter error:', error);
    next();
  }
};

module.exports = {
  apiLimiter,
  authLimiter,
  registrationLimiter,
  orgCreationLimiter,
  invitationLimiter,
  passwordResetLimiter,
  aiLimiter,
};