# Backend Deployment Guide - Render.com

**Project**: YAH Youth Event Registration System  
**Target Platform**: Render.com  
**Created**: September 27, 2025  
**Frontend Status**: ✅ Already deployed  
**Backend Status**: 🚀 Ready for deployment

## Quick Deployment Checklist

- [ ] 1. Environment Variables Configuration
- [ ] 2. MongoDB Database Setup  
- [ ] 3. Render.com Service Creation
- [ ] 4. Build & Start Scripts Verification
- [ ] 5. Domain & CORS Configuration
- [ ] 6. Email Service (Zoho SMTP) Testing
- [ ] 7. Production Testing & Validation

---

## Prerequisites

### Local Development Status
- ✅ Backend code committed to repository
- ✅ All tests passing locally
- ✅ Environment configuration ready
- ✅ Database models and API endpoints implemented

### Required Accounts & Services
- ✅ GitHub repository: `SUBiango/yah` (branch: `002-youth-event-registration`)
- [ ] Render.com account ([render.com](https://render.com))
- [ ] MongoDB Atlas account ([mongodb.com](https://www.mongodb.com/cloud/atlas))
- ✅ Zoho Email account (existing organizational setup)

---

## Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Database
```bash
# 1. Go to https://cloud.mongodb.com
# 2. Create new project: "YAH Event Registration"
# 3. Create cluster (Free tier: M0 Sandbox)
# 4. Choose region closest to your users (Europe/US)
# 5. Cluster name: "yah-events-cluster"
```

### 1.2 Configure Database Access
```bash
# Database Access:
# 1. Create database user:
#    Username: yah-backend
#    Password: [Generate secure password - save this!]
#    Role: Atlas admin (for full access)

# Network Access:
# 1. Add IP addresses: 0.0.0.0/0 (Allow access from anywhere)
#    Note: Render.com uses dynamic IPs, so we need broad access
# 2. Or use Render.com's IP ranges if available
```

### 1.3 Get Connection String
```bash
# 1. Click "Connect" on your cluster
# 2. Choose "Connect your application"
# 3. Select Node.js driver
# 4. Copy the connection string:
#    mongodb+srv://yah-backend:<password>@yah-events-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority

# 5. Replace <password> with your actual password
# 6. Add database name: /yah_events_prod
#    Final: mongodb+srv://yah-backend:<password>@yah-events-cluster.xxxxx.mongodb.net/yah_events_prod?retryWrites=true&w=majority
```

---

## Step 2: Render.com Service Setup

### 2.1 Create Web Service
```bash
# 1. Go to https://render.com/dashboard
# 2. Click "New +" → "Web Service"
# 3. Connect GitHub repository: SUBiango/yah
# 4. Select branch: 002-youth-event-registration
```

### 2.2 Configure Service Settings
```yaml
# Basic Configuration:
Name: yah-backend
Environment: Node
Region: Oregon (US West) # Or closest to your users
Branch: 002-youth-event-registration
Root Directory: backend    # Important: Point to backend folder

# Build & Deploy:
Build Command: npm install
Start Command: npm start

# Instance Type:
Free Tier: 512 MB RAM, 0.1 CPU (sufficient for testing)
# Upgrade to Starter ($7/month) for production traffic
```

---

## Step 3: Environment Variables Configuration

### 3.1 Required Environment Variables
Go to your Render service → Environment tab → Add these variables:

```bash
# Database Configuration
MONGODB_URI=mongodb+srv://yah-backend:<password>@yah-events-cluster.xxxxx.mongodb.net/yah_events_prod?retryWrites=true&w=majority

# Admin Configuration  
ADMIN_PASSCODE=YAH@Admin2025

# Email Configuration (Zoho SMTP)
ZOHO_EMAIL_USER=events@youngaccesshub.org
ZOHO_EMAIL_PASS=your-zoho-app-password
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=587

# Application Configuration
NODE_ENV=production
PORT=10000  # Render automatically assigns this
JWT_SECRET=your-super-secure-jwt-secret-key-for-production

# CORS Configuration (Update with your frontend domain)
FRONTEND_URL=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload (if needed)
MAX_FILE_SIZE=5242880  # 5MB
UPLOAD_DIR=uploads
```

### 3.2 Secure Secret Generation
```bash
# Generate secure secrets locally:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Use output for JWT_SECRET

# For admin passcode, use a secure password manager or:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 4: Update Backend Configuration

### 4.1 Update package.json Scripts
Verify your `backend/package.json` has the correct scripts:

```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest",
    "build": "echo 'No build step required for Node.js'"
  }
}
```

### 4.2 Update CORS Configuration
Update `backend/src/app.js` to handle production CORS:

```javascript
// CORS configuration for production
const corsOptions = {
  origin: [
    'https://www.yahsl.org/',  // Your frontend domain
    'http://localhost:8080',             // Local development
    'http://127.0.0.1:8080'              // Local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### 4.3 Add Health Check Endpoint
Ensure your backend has a health check (should already exist):

```javascript
// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'yah-backend'
  });
});
```

---

## Step 5: Deploy Backend

### 5.1 Deploy from GitHub
```bash
# 1. Push any final changes to GitHub:
git add .
git commit -m "Configure backend for Render.com deployment"
git push origin 002-youth-event-registration

# 2. Render will automatically detect and deploy
# 3. Monitor deployment logs in Render dashboard
```

### 5.2 Monitor Deployment
```bash
# Check deployment status:
# 1. Go to Render dashboard → Your service
# 2. Watch "Events" tab for deployment progress
# 3. Check "Logs" tab for any errors

# Expected deployment time: 2-5 minutes
```

### 5.3 Get Service URL
```bash
# After successful deployment:
# 1. Your service URL will be: https://yah-backend.onrender.com
# 2. Or custom domain if configured
# 3. Test health endpoint: https://yah-backend.onrender.com/health
```

---

## Step 6: Database Initialization

### 6.1 Generate Access Codes
```bash
# Option 1: Create a script to run once deployed
# Create backend/scripts/init-production.js:

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

async function initializeProduction() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  // Generate 500 access codes for production
  const codes = [];
  for (let i = 0; i < 500; i++) {
    codes.push({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      status: 'unused',
      createdAt: new Date()
    });
  }
  
  await client.db().collection('access_codes').insertMany(codes);
  console.log(`Generated ${codes.length} access codes`);
  
  await client.close();
}

initializeProduction();

# Option 2: Use MongoDB Compass or Atlas UI to import data
```

### 6.2 Create Database Indexes
```bash
# Connect to your MongoDB Atlas cluster and create indexes:

# Access codes collection
db.access_codes.createIndex({ "code": 1 }, { unique: true })
db.access_codes.createIndex({ "status": 1 })

# Participants collection  
db.participants.createIndex({ "email": 1 })
db.participants.createIndex({ "createdAt": 1 })

# Registrations collection
db.registrations.createIndex({ "registrationId": 1 }, { unique: true })
db.registrations.createIndex({ "participantId": 1 })
db.registrations.createIndex({ "accessCodeId": 1 })
```

---

## Step 7: Configure Frontend Integration

### 7.1 Update Frontend API URLs
Update your frontend JavaScript files to point to the new backend:

```javascript
// In js/admin.js and js/registration.js, update:
this.apiBaseUrl = 'https://yah-backend.onrender.com/api'; // Your Render backend URL

// Or use environment-based configuration:
this.apiBaseUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'  
  : 'https://yah-backend.onrender.com/api';
```

### 7.2 Test Frontend-Backend Connection
```bash
# 1. Deploy updated frontend
# 2. Test registration flow end-to-end
# 3. Test admin dashboard functionality  
# 4. Verify email delivery works
```

---

## Step 8: Production Testing

### 8.1 API Endpoint Testing
```bash
# Test all endpoints:
curl https://yah-backend.onrender.com/health
# Expected: {"status":"healthy","timestamp":"...","service":"yah-backend"}

curl -X POST https://yah-backend.onrender.com/api/access-codes/validate \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"TEST1234"}'
# Expected: {"valid":false,"message":"Invalid access code"}

# Test admin authentication:
curl -X POST https://yah-backend.onrender.com/api/admin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"passcode":"YAH@Admin2025"}'
# Expected: {"authenticated":true,"message":"Access granted"}
```

### 8.2 Performance Testing
```bash
# Test response times:
curl -w "Response time: %{time_total}s\n" \
  https://yah-backend.onrender.com/health

# Should be under 2 seconds for health check
# Note: Render free tier may have cold start delays (~30s)
```

### 8.3 Email Service Testing
```bash
# Test email delivery by:
# 1. Complete a test registration
# 2. Check that confirmation email arrives
# 3. Verify QR code attachment works
# 4. Test admin email functions
```

---

## Step 9: Monitoring & Maintenance

### 9.1 Set Up Monitoring
```bash
# Render provides built-in monitoring:
# 1. CPU, Memory, and Request metrics
# 2. Error tracking and logs
# 3. Uptime monitoring

# Additional monitoring options:
# - UptimeRobot for external monitoring
# - Sentry for error tracking
# - LogRocket for user session recording
```

### 9.2 Database Monitoring
```bash
# MongoDB Atlas provides:
# 1. Performance monitoring
# 2. Real-time metrics
# 3. Alert notifications
# 4. Automated backups

# Set up alerts for:
# - High connection count
# - Slow queries
# - Storage usage
# - Failed login attempts
```

---

## Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Issue: "npm install fails"
# Solution: Check package.json dependencies
# Verify Node.js version compatibility

# Issue: "Module not found"
# Solution: Check relative paths in imports
# Ensure all dependencies are in package.json
```

#### Database Connection Issues
```bash
# Issue: "MongoDB connection timeout"
# Solutions:
# 1. Check MongoDB Atlas network access (0.0.0.0/0)
# 2. Verify connection string format
# 3. Ensure database user has correct permissions

# Issue: "Authentication failed"
# Solutions:
# 1. Check username/password in connection string
# 2. Verify database user exists in Atlas
# 3. Test connection string locally first
```

#### CORS Issues
```bash
# Issue: "CORS policy blocking requests"
# Solutions:
# 1. Update CORS origins in backend
# 2. Verify frontend domain is whitelisted
# 3. Check for typos in domain names

# Issue: "Preflight request failed"
# Solutions:
# 1. Ensure OPTIONS method is allowed
# 2. Check allowed headers configuration
```

#### Email Issues
```bash
# Issue: "SMTP authentication failed"
# Solutions:
# 1. Verify Zoho app password (not regular password)
# 2. Check SMTP settings (smtp.zoho.com:587)
# 3. Ensure TLS/SSL is enabled

# Issue: "Emails not sending"
# Solutions:
# 1. Check email service logs
# 2. Verify sender email is configured in Zoho
# 3. Test SMTP connection manually
```

### Performance Optimization

```bash
# For better performance on Render:
# 1. Upgrade to Starter plan ($7/month) for:
#    - Faster boot times
#    - No cold starts
#    - More CPU/memory

# 2. Optimize database queries:
#    - Use proper indexing
#    - Limit query results
#    - Implement pagination

# 3. Add caching:
#    - Redis for session storage
#    - Memory caching for frequent queries
```

---

## Security Checklist

- [ ] Environment variables secured (no hardcoded secrets)
- [ ] CORS properly configured for production domains
- [ ] Rate limiting enabled for API endpoints
- [ ] Input validation implemented on all endpoints
- [ ] Admin passcode is strong and unique
- [ ] HTTPS enforced (handled by Render automatically)
- [ ] Database access restricted to application only
- [ ] Error messages don't expose sensitive information
- [ ] Logs don't contain sensitive data

---

## Cost Estimation

### Render.com Costs
```bash
Free Tier (Development/Testing):
- 512 MB RAM, 0.1 CPU
- 750 hours/month (enough for testing)
- Cold starts after inactivity
- Cost: $0/month

Starter Plan (Recommended for Production):
- 512 MB RAM, 0.5 CPU  
- Always on (no cold starts)
- Custom domains
- Cost: $7/month
```

### MongoDB Atlas Costs
```bash
Free Tier (M0 Sandbox):
- 512 MB storage
- Shared CPU
- Good for moderate traffic
- Cost: $0/month

M2 Cluster (Production):
- 2 GB storage
- Dedicated CPU
- Better performance
- Cost: $9/month
```

### Total Monthly Cost
```bash
Development: $0 (Free tiers)
Production: $16/month (Starter + M2)
```

---

## Next Steps After Deployment

1. **Domain Configuration**: Set up custom domain for your backend API
2. **SSL Certificate**: Configure SSL (Render handles this automatically)  
3. **Backup Strategy**: Set up automated database backups
4. **Monitoring Setup**: Configure alerting for downtime/errors
5. **Load Testing**: Test with expected user load
6. **Documentation**: Update API documentation with production URLs
7. **User Training**: Provide admin training for dashboard usage

---

## Support & Resources

### Documentation Links
- [Render.com Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Emergency Contacts
- **Technical Issues**: Check GitHub issues or deployment logs
- **Database Issues**: MongoDB Atlas support
- **Email Issues**: Zoho admin panel and support

---

**Deployment Status**: Ready for production deployment 🚀

**Estimated Deployment Time**: 30-45 minutes (including testing)

**Next Action**: Begin Step 1 - MongoDB Atlas Setup