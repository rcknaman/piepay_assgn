const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General rate limiter for all endpoints
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, URL: ${req.originalUrl}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Strict rate limiter for POST endpoints (offer creation)
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 POST requests per windowMs
  message: {
    status: 'error',
    message: 'Too many offer submissions from this IP, please try again later.'
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn(`Strict rate limit exceeded for IP: ${req.ip}, URL: ${req.originalUrl}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many offer submissions from this IP, please try again later.'
    });
  }
});

// API-specific rate limiter for discount calculations
const discountRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 discount calculations per minute
  message: {
    status: 'error',
    message: 'Too many discount calculation requests, please try again later.'
  },
  handler: (req, res) => {
    logger.warn(`Discount rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many discount calculation requests, please try again later.'
    });
  }
});

// High-frequency rate limiter for production (1000+ RPS target)
const highFrequencyLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 50, // Allow up to 50 requests per second per IP
  message: {
    status: 'error',
    message: 'Request frequency too high, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`High frequency rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Request frequency too high, please slow down.'
    });
  }
});

// Custom rate limiter based on user agent or API key
const createCustomRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message
    },
    keyGenerator: (req) => {
      // Use API key if available, otherwise fall back to IP
      return req.headers['x-api-key'] || req.ip;
    },
    handler: (req, res) => {
      logger.warn(`Custom rate limit exceeded for: ${req.headers['x-api-key'] || req.ip}`);
      res.status(429).json({
        status: 'error',
        message
      });
    }
  });
};

module.exports = {
  rateLimiter,
  strictRateLimiter,
  discountRateLimiter,
  highFrequencyLimiter,
  createCustomRateLimiter
};
