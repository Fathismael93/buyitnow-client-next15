import mongoose from 'mongoose';

/**
 * Health check endpoint for monitoring services
 * Returns status 200 if application is healthy
 * Returns status 503 if any dependency is unhealthy
 */
export default async function handler(req, res) {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    services: {
      database: 'OK',
    },
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      healthcheck.services.database = 'FAIL';
      healthcheck.message = 'Database connection failed';
      return res.status(503).json(healthcheck);
    }

    // You can add more service checks here
    // For example:
    // - Redis connection
    // - External API availability
    // - File system access

    return res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error.message;
    return res.status(503).json(healthcheck);
  }
}
