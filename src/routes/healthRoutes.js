const express = require('express');
const { testConnection } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Basic health check
router.get('/', asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'PiePay Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
}));

// Detailed health check including database connectivity
router.get('/detailed', asyncHandler(async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      memory: 'healthy',
      cpu: 'healthy'
    }
  };

  // Check database connectivity
  try {
    const dbStatus = await testConnection();
    healthCheck.checks.database = dbStatus ? 'healthy' : 'unhealthy';
  } catch (error) {
    healthCheck.checks.database = 'unhealthy';
    healthCheck.status = 'degraded';
    logger.error('Health check database error:', error.message);
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  console.log(memUsage);

  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  // Consider memory unhealthy if heap usage is over 500MB
  if (memUsageMB.heapUsed > 500) {
    healthCheck.checks.memory = 'warning';
    if (memUsageMB.heapUsed > 1000) {
      healthCheck.checks.memory = 'unhealthy';
      healthCheck.status = 'degraded';
    }
  }

  healthCheck.memory = memUsageMB;

  // Check CPU usage (basic check based on load average)
  const os = require('os');
  const cpuCount = os.cpus().length;
  const rawLoad = os.loadavg();

  healthCheck.loadAverage = {
    '1min': +(rawLoad[0] / cpuCount).toFixed(2),
    '5min': +(rawLoad[1] / cpuCount).toFixed(2),
    '15min': +(rawLoad[2] / cpuCount).toFixed(2)
  };


  // Determine overall status
  if (healthCheck.checks.database === 'unhealthy') {
    healthCheck.status = 'unhealthy';
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 :
    healthCheck.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthCheck);
}));

// Readiness probe (for Kubernetes)
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    const dbStatus = await testConnection();

    if (dbStatus) {
      res.status(200).json({
        status: 'ready',
        message: 'Service is ready to accept traffic'
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        message: 'Database connection failed'
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error.message);
    res.status(503).json({
      status: 'not ready',
      message: 'Service is not ready'
    });
  }
}));

// Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    message: 'Service is alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
