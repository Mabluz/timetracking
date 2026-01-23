import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        authenticated: boolean;
        timestamp: number;
      };
    }
  }
}

// Secret key for signing tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h'; // Token expires in 24 hours

/**
 * Middleware to protect routes that require password authentication
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const requirePassword = process.env.REQUIRE_PASSWORD === 'true';

  if (!requirePassword) {
    // Password protection is disabled, allow all requests
    return next();
  }

  // Check for valid token in Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    logger.warn('Unauthorized access attempt - no token provided', { path: req.path });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token required',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      authenticated: boolean;
      timestamp: number;
    };

    if (!decoded.authenticated) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token',
      });
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Token verification failed', { error: String(error) });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Authenticate user with password and return JWT token
 */
export const authenticatePassword = (password: string): string | null => {
  const requiredPassword = process.env.APP_PASSWORD;

  if (!requiredPassword) {
    logger.error('APP_PASSWORD not configured');
    return null;
  }

  if (password !== requiredPassword) {
    logger.warn('Invalid password attempt');
    return null;
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      authenticated: true,
      timestamp: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  return token;
};

/**
 * Check if password protection is enabled
 */
export const isPasswordProtectionEnabled = (): boolean => {
  return process.env.REQUIRE_PASSWORD === 'true';
};
