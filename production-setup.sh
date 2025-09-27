#!/bin/bash

# Production Setup Script for YAH Backend Deployment
# Generates secure secrets and provides deployment commands

echo "🚀 YAH Backend Production Setup"
echo "================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

echo "🔐 Generating Production Secrets..."

# Generate JWT Secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "✅ JWT_SECRET generated (64 characters)"

# Generate Admin Session Secret
ADMIN_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo "✅ Admin session secret generated"

# Generate Database Encryption Key
DB_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "✅ Database encryption key generated"

echo ""
echo "📝 Environment Variables for Render.com:"
echo "========================================"
echo ""
echo "# Copy these to your Render.com dashboard → Environment tab:"
echo ""
echo "NODE_ENV=production"
echo "JWT_SECRET=$JWT_SECRET"
echo "ADMIN_SESSION_SECRET=$ADMIN_SESSION_SECRET"
echo "DB_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY"
echo ""
echo "# You still need to set these manually:"
echo "MONGODB_URI=mongodb+srv://yah-backend:<password>@yah-events-cluster.xxxxx.mongodb.net/yah_events_prod?retryWrites=true&w=majority"
echo "ADMIN_PASSCODE=YAH@Admin2025"
echo "ZOHO_EMAIL_USER=events@youngaccesshub.org"
echo "ZOHO_EMAIL_PASS=your-zoho-app-password"
echo "ZOHO_SMTP_HOST=smtp.zoho.com"
echo "ZOHO_SMTP_PORT=587"
echo "FRONTEND_URL=https://your-frontend-domain.com"
echo "RATE_LIMIT_WINDOW_MS=900000"
echo "RATE_LIMIT_MAX_REQUESTS=100"
echo ""

echo "🚀 Deployment Commands:"
echo "======================="
echo ""
echo "1. Push to GitHub:"
echo "   git add ."
echo "   git commit -m \"Ready for Render.com deployment\""
echo "   git push origin 002-youth-event-registration"
echo ""
echo "2. Create Render.com service with:"
echo "   - Repository: SUBiango/yah"
echo "   - Branch: 002-youth-event-registration"
echo "   - Root Directory: backend"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo ""
echo "3. Test deployment:"
echo "   curl https://yah-backend.onrender.com/health"
echo ""

echo "✅ Setup complete! Follow the deployment guide for next steps."