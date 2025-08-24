"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.requestLogger = exports.logger = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// Simple logger utility
const createLogger = () => {
    const logFile = path_1.default.join(__dirname, '..', 'logs', 'app.log');
    // Ensure logs directory exists
    fs_extra_1.default.ensureDirSync(path_1.default.dirname(logFile));
    const log = (level, message, data = null) => {
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
        fs_extra_1.default.appendFile(logFile, JSON.stringify(logEntry) + '\n').catch((err) => {
            console.error('Failed to write to log file:', err);
        });
    };
    return {
        info: (message, data) => log('info', message, data),
        warn: (message, data) => log('warn', message, data),
        error: (message, data) => log('error', message, data),
        debug: (message, data) => log('debug', message, data)
    };
};
const logger = createLogger();
exports.logger = logger;
// Express middleware for request logging
const requestLogger = (req, res, next) => {
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
exports.requestLogger = requestLogger;
// Error handling middleware
const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        body: req.body
    });
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(err.status || 500).json({
        error: 'Internal server error',
        ...(isDevelopment && { details: err.message, stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=logger.js.map