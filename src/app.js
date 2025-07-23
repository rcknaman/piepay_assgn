const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Import routes
const offerRoutes = require('./routes/offerRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Performance middleware
app.use(compression());

// Logging middleware
// app.use(morgan('combined', {
//   stream: { write: message => logger.info(message.trim()) }
// }));

// Rate limiting
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/health', healthRoutes);
app.use('/api/v1', offerRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`PiePay Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
