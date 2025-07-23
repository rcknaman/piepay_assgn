const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Validation schemas
const schemas = {
  // Offer creation validation
  createOffer: Joi.object({
    flipkartOfferApiResponse: Joi.object({
      offers: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          title: Joi.string().required(),
          description: Joi.string().allow(''),
          bankName: Joi.string().required(),
          discountType: Joi.string().valid('percentage', 'flat', 'cashback').required(),
          discountValue: Joi.number().positive().required(),
          minAmount: Joi.number().min(0).default(0),
          maxDiscount: Joi.number().positive().allow(null),
          paymentInstruments: Joi.array().items(Joi.string()).default([]),
          validFrom: Joi.date().allow(null),
          validTill: Joi.date().allow(null),
          isActive: Joi.boolean().default(true)
        })
      ).required().min(1)
    }).unknown(true).required()
  }),

  // Discount calculation validation
  calculateDiscount: Joi.object({
    amountToPay: Joi.number().positive().required(),
    bankName: Joi.string().required(),
    paymentInstrument: Joi.string()
      .valid('CREDIT', 'DEBIT', 'EMI_OPTIONS', 'NET_BANKING', 'UPI', 'WALLET')
      .required()
  }),

  // Get offers validation
  getOffers: Joi.object({
    bankName: Joi.string().required(),
    paymentInstrument: Joi.string()
      .valid('CREDIT', 'DEBIT', 'EMI_OPTIONS', 'NET_BANKING', 'UPI', 'WALLET')
      .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
  })
};

// Generic validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    let dataToValidate;

    switch (property) {
      case 'body':
        dataToValidate = req.body;
        break;
      case 'query':
        dataToValidate = req.query;
        break;
      case 'params':
        dataToValidate = req.params;
        break;
      default:
        dataToValidate = req[property];
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all validation errors
      allowUnknown: true, // Allow unknown fields
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');

      return next(new AppError(`Validation error: ${errorMessage}`, 400));
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// Specific validation middlewares
const validateCreateOffer = validate(schemas.createOffer, 'body');
const validateCalculateDiscount = validate(schemas.calculateDiscount, 'query');
const validateGetOffers = validate(schemas.getOffers, 'query');

// Custom validation for offer ID
const validateOfferId = (req, res, next) => {
  const { offerId } = req.params;

  if (!offerId || offerId.trim() === '') {
    return next(new AppError('Offer ID is required', 400));
  }

  if (offerId.length > 100) {
    return next(new AppError('Offer ID is too long', 400));
  }

  next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic XSS protection
        sanitized[key] = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

// Content type validation
const validateContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.is('application/json')) {
      return next(new AppError('Content-Type must be application/json', 400));
    }
  }
  next();
};

// Request size validation
const validateRequestSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = typeof maxSize === 'string' 
      ? parseInt(maxSize) * 1024 * 1024 
      : maxSize;

    if (contentLength > maxSizeBytes) {
      return next(new AppError('Request entity too large', 413));
    }

    next();
  };
};

module.exports = {
  validate,
  validateCreateOffer,
  validateCalculateDiscount,
  validateGetOffers,
  validateOfferId,
  sanitizeInput,
  validateContentType,
  validateRequestSize,
  schemas
};
