const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dbConnection = require('./utils/database');
const { config } = require('./utils/config');
const { emailService } = require('./utils/email');

// Import routes
const registrationRoutes = require('./routes/registration');
const adminRoutes = require('./routes/admin');
const scannerRoutes = require('./routes/scanner');

const app = express();

// Trust proxy for accurate IP addresses in production
if (config.server.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration with enhanced debugging and preflight handling
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('[CORS] Request with no origin - allowing');
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (config.server.nodeEnv === 'development') {
      console.log('[CORS] Development mode - allowing all origins');
      return callback(null, true);
    }
    
    // In production, configure specific allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://www.yahsl.org',
      'https://www.yahsl.org', // Production frontend
      'https://yahsl.org', // Alternative without www
      'https://subiaango.github.io', // GitHub Pages if using
      'https://yah-frontend.onrender.com', // Render frontend if used
      'http://localhost:3000', // Local development
      'http://127.0.0.1:3000', // Local development alternative
    ];

    console.log(`[CORS] Request from origin: ${origin}`);
    console.log(`[CORS] Environment: ${config.server.nodeEnv}`);

    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] ✅ Origin ${origin} allowed`);
      return callback(null, true);
    }
    
    console.error(`[CORS] ❌ Origin ${origin} blocked - not in allowed origins:`, allowedOrigins);
    // In production, be more permissive to avoid blocking legitimate requests
    if (config.server.nodeEnv === 'production' && origin && origin.includes('yahsl.org')) {
      console.log(`[CORS] ✅ Allowing yahsl.org subdomain: ${origin}`);
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-HTTP-Method-Override',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
  ],
  exposedHeaders: [
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
  ],
  preflightContinue: false,
  maxAge: 86400, // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));

// Explicit preflight handler for all routes with enhanced debugging
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log(`[PREFLIGHT] OPTIONS request from origin: ${origin}`);
  console.log(`[PREFLIGHT] Request headers:`, JSON.stringify(req.headers, null, 2));
  
  // Set CORS headers explicitly for preflight requests
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-HTTP-Method-Override, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Methods');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Vary', 'Origin');
  
  console.log(`[PREFLIGHT] Responding with CORS headers for origin: ${origin}`);
  console.log(`[PREFLIGHT] Response headers:`, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH',
    'Access-Control-Allow-Credentials': 'true'
  });
  
  res.status(200).end();
});

// Additional CORS middleware for all requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin) {
    console.log(`[MIDDLEWARE] Setting CORS headers for ${req.method} request from origin: ${origin}`);
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON format',
      });
      return;
    }
  },
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: process.env.NODE_ENV === 'test' ? 10000 : config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow request:', logData);
    } else if (config.server.nodeEnv === 'development') {
      console.log('Request:', logData);
    }
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
      uptime: process.uptime(),
    },
  });
});

// API routes
app.use('/api', registrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scanner', scannerRoutes);

// Serve static files for QR codes or other assets if needed
app.use('/static', express.static('public', {
  maxAge: '1d',
  etag: true,
}));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Handle specific error types
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
    });
  }
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(config.server.nodeEnv === 'development' && { 
      details: error.message,
      stack: error.stack,
    }),
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Connect to database
    await dbConnection.connect();
    await dbConnection.createIndexes();
    console.log('Database connected successfully');
    
    // Initialize email service
    try {
      await emailService.initialize();
      console.log('Email service initialized successfully');
    } catch (emailError) {
      console.warn('Email service initialization failed:', emailError.message);
      console.warn('Emails will not be sent, but registration will still work');
    }
    
    // Start server
    const server = app.listen(config.server.port, () => {
      console.log(`
🚀 YAH Youth Registration API Server Started
📍 Environment: ${config.server.nodeEnv}
🌐 Port: ${config.server.port}
💻 Health: http://localhost:${config.server.port}/health
📋 API: http://localhost:${config.server.port}/api
🔒 Security: Helmet, CORS, Rate Limiting enabled
⚡ Performance: Request logging and monitoring active
      `);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          await dbConnection.disconnect();
          console.log('Database disconnected');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;