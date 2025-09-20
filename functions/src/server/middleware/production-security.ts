import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import { 
  securityHeaders, 
  rateLimiter, 
  uploadRateLimiter,
  sanitizeInput,
  csrfProtection 
} from "./security";

// Production-specific security configuration
export const productionSecurityConfig = {
  // Strict rate limiting for production
  rateLimiting: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 50, // More restrictive in production
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests from this IP",
      retryAfter: 10 * 60
    }
  },
  
  // Upload rate limiting for production
  uploadRateLimiting: {
    windowMs: 10 * 60 * 1000, // 10 minutes 
    max: 5, // Very restrictive for uploads in production
    message: {
      error: "Upload limit exceeded",
      retryAfter: 10 * 60
    }
  },

  // Enhanced security headers for production
  securityHeaders: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        upgradeInsecureRequests: [],
        blockAllMixedContent: []
      },
    },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-site" }
  },

  // File upload restrictions for production
  fileUpload: {
    maxFileSize: 25 * 1024 * 1024, // 25MB max in production
    maxFiles: 3, // Limit number of files
    allowedTypes: ['documents'], // Only documents by default
    scanContent: true, // Always scan content in production
    quarantineThreats: true // Quarantine suspicious files
  },

  // Session security for production
  session: {
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true,
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      sameSite: 'strict' as const
    },
    resave: false,
    saveUninitialized: false
  },

  // API security for production
  api: {
    requestTimeout: 30000, // 30 seconds
    bodyLimit: '10mb', // Smaller body limit
    parameterLimit: 50, // Limit URL parameters
    requireHttps: true,
    trustProxy: 1 // Trust first proxy
  }
};

// Production security middleware setup
export function setupProductionSecurity(app: Express): void {
  // Trust first proxy in production
  app.set('trust proxy', productionSecurityConfig.api.trustProxy);

  // Enforce HTTPS in production
  if (productionSecurityConfig.api.requireHttps) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.header('x-forwarded-proto') !== 'https' && req.hostname !== 'localhost') {
        return res.redirect(`https://${req.header('host')}${req.url}`);
      }
      next();
    });
  }

  // Apply strict security headers
  app.use(securityHeaders);

  // Apply request timeout
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(productionSecurityConfig.api.requestTimeout, () => {
      res.status(408).json({ error: 'Request timeout' });
    });
    next();
  });

  // Apply input sanitization globally
  app.use(sanitizeInput);

  // Apply rate limiting
  app.use(rateLimiter);
}

// Security audit logging for production
export const securityAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log security-relevant events in production
  const securityEvents = [
    'failed_auth',
    'rate_limit_exceeded', 
    'file_upload_rejected',
    'csrf_token_invalid',
    'suspicious_activity'
  ];

  // Attach security logger to response
  res.locals.logSecurityEvent = (event: string, details: any) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        details
      }));
    }
  };

  next();
};

// Production health check endpoint
export const productionHealthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    security: {
      https: req.secure,
      headers: {
        'strict-transport-security': !!res.getHeader('strict-transport-security'),
        'content-security-policy': !!res.getHeader('content-security-policy'),
        'x-frame-options': !!res.getHeader('x-frame-options')
      }
    }
  });
};

// Security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  // Track security metrics
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests (potential DoS)
    if (duration > 5000) {
      console.warn('Slow request detected:', {
        url: req.url,
        method: req.method,
        duration,
        ip: req.ip
      });
    }

    // Log failed auth attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('Auth failure:', {
        url: req.url,
        method: req.method,
        status: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Log potential attacks
    if (res.statusCode === 400 && req.url.includes('upload')) {
      console.warn('Upload rejected:', {
        url: req.url,
        ip: req.ip,
        reason: 'Security validation failed'
      });
    }
  });

  next();
};

// Environment validation for production
export function validateProductionEnvironment(): boolean {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'SESSION_SECRET'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long');
    return false;
  }

  // Validate database URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.error('DATABASE_URL must be a valid PostgreSQL connection string');
    return false;
  }

  return true;
}

// Security configuration summary for deployment
export function getSecurityConfigSummary() {
  return {
    fileUpload: {
      maxSize: '25MB',
      allowedTypes: 'documents only',
      malwareScanning: 'enabled',
      rateLimited: 'yes'
    },
    authentication: {
      algorithm: 'Argon2id',
      tokenExpiry: '7 days',
      sessionTimeout: '4 hours',
      csrfProtection: 'enabled'
    },
    networking: {
      httpsRequired: 'yes',
      strictTransportSecurity: 'enabled',
      rateLimiting: '50 req/10min',
      uploadLimiting: '5 uploads/10min'
    },
    headers: {
      contentSecurityPolicy: 'strict',
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin'
    },
    monitoring: {
      securityEventLogging: 'enabled',
      performanceMonitoring: 'enabled',
      suspiciousActivityDetection: 'enabled'
    }
  };
}

export default {
  productionSecurityConfig,
  setupProductionSecurity,
  securityAuditLogger,
  productionHealthCheck,
  securityMonitoring,
  validateProductionEnvironment,
  getSecurityConfigSummary
};