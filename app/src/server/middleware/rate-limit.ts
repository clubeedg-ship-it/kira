import rateLimit from 'express-rate-limit';

const validate = { ip: false, trustProxy: false, xForwardedForHeader: false, default: false } as any;

// Login: 10 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
  skip: () => process.env.NODE_ENV === 'test',
  validate: false,
});

// Signup: 5 per hour per IP
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many signups. Try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
  validate: false,
});

// Global API: 200 requests per minute per user/IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).userId || req.ip || 'unknown',
  validate: false,
});
