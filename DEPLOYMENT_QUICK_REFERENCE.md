# 🚀 Deployment Quick Reference

## Pre-Deployment Checklist

### ✅ Environment Setup
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Configure all required variables
# Edit .env.local with your actual values

# 3. Validate environment
npm run validate-env
```

### ✅ Build & Test
```bash
# 1. Install dependencies
npm install

# 2. Run linter
npm run lint

# 3. Build application
npm run build

# 4. Test build
npm start
```

## 🚀 Deployment Commands

### Quick Deploy
```bash
# Run the deployment script
npm run deploy
```

### Manual Steps
```bash
# 1. Validate environment
npm run validate-env

# 2. Build for production
npm run build

# 3. Start production server
npm start
```

## 🔧 Environment Variables

### Required Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Salesforce (Optional)
SF_CLIENT_ID=your_client_id
SF_CLIENT_SECRET=your_client_secret
SF_REDIRECT_URI=https://your-domain.com/api/salesforce/callback
SF_DOMAIN=https://login.salesforce.com

# NetSuite (Optional)
NS_ACCOUNT_ID=your_account_id
NS_CONSUMER_KEY=your_consumer_key
NS_CONSUMER_SECRET=your_consumer_secret
NS_TOKEN_ID=your_token_id
NS_TOKEN_SECRET=your_token_secret
```

## 🎯 Deployment Platforms

### Vercel (Recommended)
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

### Railway
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Docker
```bash
# Build image
docker build -t beacon-l2c .

# Run container
docker run -p 3000:3000 -e "NEXT_PUBLIC_SUPABASE_URL=..." beacon-l2c
```

## 🔍 Post-Deployment Verification

### Health Checks
```bash
# Check if app is running
curl https://your-domain.com

# Check API endpoints
curl https://your-domain.com/api/health
```

### Common Issues
- **Environment validation fails**: Check all required variables are set
- **Build fails**: Fix TypeScript/linting errors
- **Database connection**: Verify Supabase credentials
- **Authentication**: Check redirect URLs and OAuth settings

## 📞 Support

- **Documentation**: `PRODUCTION_SETUP.md`
- **Environment validation**: `npm run validate-env`
- **Deployment script**: `npm run deploy`
- **Logs**: Check your hosting platform's log viewer

---

**Remember**: Always test in a staging environment before production deployment!
