const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'piepay',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    return false;
  }
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    logger.error('Database query error:', error.message);
    throw error;
  }
};

// Get connection for transactions
const getConnection = async () => {
  return await pool.getConnection();
};

module.exports = {
  pool,
  executeQuery,
  getConnection,
  testConnection
};
