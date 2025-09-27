require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/yah-youth-registration',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@youthadvocacyhub.sl',
    supportEmail: process.env.SUPPORT_EMAIL || 'summit@yahsl.org',
    adminEmail: process.env.ADMIN_EMAIL || 'info@yahsl.org',
    verify: process.env.EMAIL_VERIFY !== 'false', // Verify connection on startup
    tls: {
      rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false',
    },
  },
  app: {
    name: 'YAH Youth Registration System',
    version: '1.0.0',
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    accessCodeExpiryHours: parseInt(process.env.ACCESS_CODE_EXPIRY_HOURS) || 72,
    qrCodeSize: parseInt(process.env.QR_CODE_SIZE) || 400,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
};

// Validation for required environment variables
const requiredEnvVars = [
  'SMTP_USER',
  'SMTP_PASS',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && config.server.nodeEnv === 'production') {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

module.exports = { config };