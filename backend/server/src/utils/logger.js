import winston from 'winston';
const { combine, timestamp, printf, colorize, errors } = winston.format;

const fmt = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const m = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `[${ts}] ${level}: ${stack || message}${m}`;
});

export const logger = winston.createLogger({
  level:  process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), fmt),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), errors({ stack: true }), timestamp({ format: 'HH:mm:ss' }), fmt),
    }),
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: 'logs/error.log',   level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ] : []),
  ],
});
