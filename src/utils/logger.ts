import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'medifind-backend' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, stack }) =>
            `${timestamp} [${level}]: ${message}${stack ? `\n${stack}` : ''}`,
        ),
      ),
    }),

    // File transport for errors
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

// Don't log in test environment
if (process.env.NODE_ENV === 'test') {
  logger.silent = true;
}

export default logger;
export { logger };
