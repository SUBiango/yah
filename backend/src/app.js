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

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (config.server.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // In production, configure specific allowed origins
    const allowedOrigins = [
      'https://yourdomain.com',
      'https://www.yourdomain.com',
      // Add your production domain here
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

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