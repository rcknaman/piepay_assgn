const logger = require('../utils/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle cast errors (invalid MongoDB ObjectId, etc.)
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

// Handle duplicate field errors
const handleDuplicateFieldsError = (error) => {
  const field = error.message.match(/(["'])(\?.)*?/)[0];
  const message = `Duplicate field value: ${field}. Please use another value!`;
  return new AppError(message, 400);
};

// Handle validation errors
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = () => 
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => 
  new AppError('Your token has expired! Please log in again.', 401);

// Send error response in development
const sendErrorDev = (error, res) => {
  res.status(error.statusCode).json({
    status: error.status,
    error: error,
    message: error.message,
    stack: error.stack
  });
};

// Send error response in production
const sendErrorProd = (error, res) => {
  // Operational, trusted error: send message to client
  if (error.isOperational) {
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', error);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Global error handling middleware
const errorHandler = (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    let err = { ...error };
    err.message = error.message;

    if (error.name === 'CastError') err = handleCastError(err);
    if (error.code === 11000) err = handleDuplicateFieldsError(err);
    if (error.name === 'ValidationError') err = handleValidationError(err);
    if (error.name === 'JsonWebTokenError') err = handleJWTError();
    if (error.name === 'TokenExpiredError') err = handleJWTExpiredError();

    sendErrorProd(err, res);
  }

  // Log error for monitoring
  logger.error(`${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
};

// Handle 404 errors
const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

// Async error wrapper
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

module.exports = {
  AppError,
  errorHandler,
  notFound,
  asyncHandler
};
