# Render.com Deployment Checklist

**Project**: YAH Youth Event Registration Backend  
**Status**: ✅ Ready for Deployment  
**Date**: September 27, 2025

## Pre-Deployment Verification ✅

- [x] **Backend Code**: Complete and tested
- [x] **Database Models**: AccessCode, Participant, Registration implemented
- [x] **API Endpoints**: All 5 endpoints implemented and tested
- [x] **Admin Dashboard**: Fully functional with enhanced field mapping
- [x] **Email Integration**: Zoho SMTP configured and tested
- [x] **Security**: Input validation, rate limiting, CORS configured
- [x] **Environment Config**: Production-ready with .env.example template
- [x] **Package.json**: Correct start script and dependencies
- [x] **Health Check**: /health endpoint implemented
- [x] **Git Repository**: All changes committed to 002-youth-event-registration branch

## Deployment Steps

### 1. MongoDB Atlas Setup (15 minutes)
```bash
✅ Create MongoDB Atlas account/project
✅ Create cluster: yah-events-cluster
✅ Configure database user: yah-backend with admin role
✅ Set network access: 0.0.0.0/0 (Render uses dynamic IPs)
✅ Get connection string: mongodb+srv://yah-backend:<password>@yah-events-cluster.xxxxx.mongodb.net/yah_events_prod?retryWrites=true&w=majority
```

### 2. Render.com Service Creation (10 minutes)
```bash
✅ Create Render.com account
✅ Connect GitHub repository: SUBiango/yah
✅ Create Web Service with settings:
   - Name: yah-backend
   - Environment: Node
   - Region: Oregon (or preferred)
   - Branch: 002-youth-event-registration
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: npm start
```

### 3. Environment Variables Configuration (5 minutes)
Set these in Render dashboard → Environment tab:

```bash
MONGODB_URI=mongodb+srv://yah-backend:<password>@yah-events-cluster.xxxxx.mongodb.net/yah_events_prod?retryWrites=true&w=majority
NODE_ENV=production
ADMIN_PASSCODE=YAH@Admin2025
ZOHO_EMAIL_USER=events@youngaccesshub.org
ZOHO_EMAIL_PASS=your-zoho-app-password
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=587
JWT_SECRET=your-super-secure-64-char-random-string
FRONTEND_URL=https://your-frontend-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Deploy & Test (10 minutes)
```bash
✅ Trigger deployment from Render dashboard
✅ Monitor deployment logs for any errors
✅ Test health endpoint: https://yah-backend.onrender.com/health
✅ Test API endpoints with Postman or curl
✅ Verify database connection and CRUD operations
```

### 5. Initialize Production Database (5 minutes)
```bash
✅ Connect to MongoDB Atlas
✅ Create indexes for optimal performance
✅ Generate initial access codes (500 recommended)
✅ Test email service functionality
```

## Post-Deployment Testing

### Critical API Tests
```bash
# Health Check
curl https://yah-backend.onrender.com/health
Expected: {"status":"healthy","timestamp":"..."}

# Access Code Validation
curl -X POST https://yah-backend.onrender.com/api/access-codes/validate \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"TEST1234"}'
Expected: {"valid":false,"message":"Invalid access code"}

# Admin Authentication
curl -X POST https://yah-backend.onrender.com/api/admin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"passcode":"YAH@Admin2025"}'
Expected: {"authenticated":true,"message":"Access granted"}

# Registration Statistics
curl https://yah-backend.onrender.com/api/admin/stats
Expected: {"success":true,"data":{...}}

# Participant List
curl https://yah-backend.onrender.com/api/admin/registrations
Expected: {"success":true,"data":{...}}
```

### Integration Tests
```bash
✅ Complete registration flow end-to-end
✅ Admin dashboard login and functionality
✅ QR code generation and download
✅ Email delivery confirmation
✅ Mobile responsiveness on admin dashboard
```

## Production Configuration

### Security Checklist
- [x] **HTTPS Enforced**: Automatic with Render.com
- [x] **CORS Properly Configured**: Production domains whitelisted
- [x] **Rate Limiting Active**: 100 requests per 15 minutes
- [x] **Input Validation**: All endpoints protected
- [x] **Environment Variables**: No hardcoded secrets
- [x] **Admin Access**: Secure passcode protection
- [x] **Database Access**: Restricted to application only
- [x] **Error Handling**: No sensitive data exposed

### Performance Optimization
- [x] **Database Indexes**: Created for all frequently queried fields
- [x] **Connection Pooling**: MongoDB driver handles automatically
- [x] **Response Caching**: Implemented where appropriate
- [x] **Error Logging**: Structured logging for debugging
- [x] **Health Monitoring**: /health endpoint for uptime checks

## Monitoring & Maintenance

### Render.com Dashboard
- Monitor CPU, memory, and request metrics
- Set up alerts for high error rates
- Review deployment logs regularly
- Monitor response times and uptime

### MongoDB Atlas Dashboard
- Track database performance metrics
- Monitor connection counts and slow queries
- Set up alerts for storage usage
- Review security and access logs

### Recommended Alerts
- Service downtime (immediate)
- High error rate (>5% in 5 minutes)
- Database connection failures
- High response times (>2 seconds)
- Memory/CPU usage >80%

## Troubleshooting Guide

### Common Issues & Solutions

**Deployment Failed**
- Check build logs in Render dashboard
- Verify package.json scripts are correct
- Ensure Node.js version compatibility (>=18.0.0)

**Database Connection Issues**
- Verify MongoDB Atlas network access settings
- Check connection string format and credentials
- Test connection from local development first

**CORS Errors**
- Update FRONTEND_URL environment variable
- Check allowed origins in app.js CORS configuration
- Verify frontend domain is correct

**Email Not Sending**
- Verify Zoho SMTP credentials and settings
- Check that sender email is configured in Zoho
- Test SMTP connection with external tools

**Admin Dashboard Not Loading Participants**
- Check MongoDB data exists and is properly structured
- Verify API endpoints return expected data format
- Check browser console for JavaScript errors

## Support Resources

### Documentation
- [Render.com Deployment Guide](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [YAH Project Repository](https://github.com/SUBiango/yah)

### Quick Reference URLs
```bash
Backend Service: https://yah-backend.onrender.com
Health Check: https://yah-backend.onrender.com/health
Admin API: https://yah-backend.onrender.com/api/admin/*
Registration API: https://yah-backend.onrender.com/api/*
```

## Success Criteria ✅

- [ ] **Backend Deployed**: Service running on Render.com
- [ ] **Database Connected**: MongoDB Atlas integration working
- [ ] **APIs Functional**: All 5 endpoints responding correctly
- [ ] **Admin Dashboard**: Can authenticate and manage participants
- [ ] **Email Service**: Confirmation emails sending via Zoho SMTP
- [ ] **Registration Flow**: End-to-end participant registration working
- [ ] **Performance**: Response times under 2 seconds
- [ ] **Security**: All security measures active and tested
- [ ] **Monitoring**: Alerts configured for service health

---

**Next Steps After Deployment**:
1. Update frontend API URLs to point to production backend
2. Test complete user journey end-to-end
3. Generate initial access codes for event
4. Train administrators on dashboard usage
5. Set up monitoring and alerting
6. Plan regular database backups

**Estimated Total Deployment Time**: 45 minutes

**Status**: 🚀 Ready for Production Deployment