import fs from 'fs-extra';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

interface LogData {
  [key: string]: any;
}

interface Logger {
  info: (message: string, data?: LogData) => void;
  warn: (message: string, data?: LogData) => void;
  error: (message: string, data?: LogData) => void;
  debug: (message: string, data?: LogData) => void;
}

// Simple logger utility
const createLogger = (): Logger => {
  const logFile = path.join(__dirname, '..', 'logs', 'app.log');
  
  // Ensure logs directory exists
  fs.ensureDirSync(path.dirname(logFile));
  
  const log = (level: string, message: string, data: LogData | null = null): void => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    
    // Console output
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    
    // File output
    fs.appendFile(logFile, JSON.stringify(logEntry) + '\n').catch((err: Error) => {
      console.error('Failed to write to log file:', err);
    });
  };
  
  return {
    info: (message: string, data?: LogData) => log('info', message, data),
    warn: (message: string, data?: LogData) => log('warn', message, data),
    error: (message: string, data?: LogData) => log('error', message, data),
    debug: (message: string, data?: LogData) => log('debug', message, data)
  };
};

const logger = createLogger();

// Express middleware for request logging
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent') || 'Unknown'
    });
  });
  
  next();
};

// Error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status((err as any).status || 500).json({
    error: 'Internal server error',
    ...(isDevelopment && { details: err.message, stack: err.stack })
  });
};

export {
  logger,
  requestLogger,
  errorHandler
};