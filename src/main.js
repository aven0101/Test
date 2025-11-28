const config = require('./config');
const logger = require('./config/logger');

function main() {
  const app = require('./app');

  return new Promise(resolve => {
    const server = app.listen(config.PORT, () => {
      logger.info(`Server running in ${config.NODE_ENV} mode on http://localhost:${config.PORT}`);
      logger.info(`API Documentation available at http://localhost:${config.PORT}/api-docs`);
      resolve();
    });

    // Handle server errors
    server.on('error', error => {
      logger.error('Server error:', error);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });
  });
}

module.exports = main;
