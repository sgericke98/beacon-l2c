# 🚀 Production Environment Setup Guide

This guide will walk you through setting up the Beacon L2C Analytics application for production deployment.

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Salesforce Connected App (optional)
- NetSuite integration credentials (optional)
- Domain name for your application
- SSL certificate (handled by most hosting platforms)

## 🔧 Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env.local
```

### 2. Required Environment Variables

#### Supabase Configuration
```bash
# Get these from your Supabase project settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Salesforce Integration (Optional)
```bash
# Get these from Salesforce Setup > App Manager > Connected Apps
SF_CLIENT_ID=your_salesforce_client_id
SF_CLIENT_SECRET=your_salesforce_client_secret
SF_REDIRECT_URI=https://your-domain.com/api/salesforce/callback
SF_DOMAIN=https://login.salesforce.com
SF_API_VERSION=v62.0
```

#### NetSuite Integration (Optional)
```bash
# Get these from NetSuite Setup > Company > Enable Features > SuiteCloud
NS_ACCOUNT_ID=your_netsuite_account_id
NS_CONSUMER_KEY=your_netsuite_consumer_key
NS_CONSUMER_SECRET=your_netsuite_consumer_secret
NS_TOKEN_ID=your_netsuite_token_id
NS_TOKEN_SECRET=your_netsuite_token_secret
```

### 3. Validate Environment Variables

```bash
npm run validate-env
```

## 🗄️ Database Setup

### 1. Supabase Project Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)
2. **Note your project URL and API keys** from Settings > API
3. **Set up authentication** in Authentication > Settings
4. **Configure Row Level Security (RLS)** policies for data protection

### 2. Database Schema

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with RLS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 3. Authentication Setup

1. **Configure email templates** in Authentication > Email Templates
2. **Set up OAuth providers** if needed (Google, GitHub, etc.)
3. **Configure redirect URLs** for your production domain
4. **Set up admin user** by creating a user with admin role

## 🔐 Security Configuration

### 1. Environment Security

- **Never commit `.env.local`** to version control
- **Use different keys** for development and production
- **Rotate secrets regularly**
- **Use strong, unique passwords** for all services

### 2. API Security

The application includes built-in security features:

- **Environment variable validation** on startup
- **Type-safe configuration** with Zod schemas
- **Automatic validation** before build and start
- **Error handling** for missing configuration

### 3. Database Security

- **Row Level Security (RLS)** enabled on all tables
- **Service role key** used only for server-side operations
- **Anon key** used for client-side operations
- **Proper authentication** required for all API routes

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Configure build settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. **Deploy automatically** on push to main branch

#### Vercel Environment Variables
Set all required environment variables in Vercel dashboard:
- Go to Project Settings > Environment Variables
- Add each variable from your `.env.local` file
- Make sure to set them for "Production" environment

### Option 2: Railway

1. **Connect your GitHub repository** to Railway
2. **Set environment variables** in Railway dashboard
3. **Configure build settings**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. **Deploy automatically** on push to main branch

### Option 3: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## 🔍 Pre-Deployment Checklist

### ✅ Environment Validation
- [ ] All required environment variables are set
- [ ] Environment validation passes: `npm run validate-env`
- [ ] No placeholder values remain in production
- [ ] Debug mode is disabled in production

### ✅ Database Setup
- [ ] Supabase project is configured
- [ ] Database schema is deployed
- [ ] RLS policies are active
- [ ] Authentication is configured
- [ ] Admin user is created

### ✅ Security
- [ ] All secrets are properly configured
- [ ] No sensitive data in code
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is configured

### ✅ Application
- [ ] Build passes: `npm run build`
- [ ] All tests pass (if any)
- [ ] Error handling is in place
- [ ] Logging is configured
- [ ] Monitoring is set up

## 🚨 Post-Deployment

### 1. Health Checks

Verify your deployment is working:

```bash
# Check if the application is running
curl https://your-domain.com/api/health

# Check environment validation
curl https://your-domain.com/api/validate-env
```

### 2. Monitor Application

- **Check application logs** for errors
- **Monitor performance** metrics
- **Verify data integration** is working
- **Test authentication** flows
- **Check API endpoints** are responding

### 3. Backup Strategy

- **Database backups** are handled by Supabase
- **Environment variables** should be backed up securely
- **Code repository** should be backed up
- **SSL certificates** are managed by hosting platform

## 🛠️ Troubleshooting

### Common Issues

#### Environment Validation Fails
```bash
# Check which variables are missing
npm run validate-env

# Verify all required variables are set
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Database Connection Issues
- Verify Supabase URL and keys
- Check if RLS policies are blocking access
- Ensure service role key has proper permissions

#### Authentication Issues
- Verify redirect URLs are configured correctly
- Check if user has proper role assignments
- Ensure Supabase auth is properly configured

### Getting Help

1. **Check application logs** for error messages
2. **Verify environment variables** are correctly set
3. **Test API endpoints** individually
4. **Check Supabase dashboard** for database issues
5. **Review deployment platform logs**

## 📞 Support

For additional support:

- **Documentation**: Check the README.md file
- **Issues**: Create an issue in the GitHub repository
- **Environment**: Use `npm run validate-env` to check configuration
- **Logs**: Check your hosting platform's log viewer

---

## 🔄 Maintenance

### Regular Tasks

- **Update dependencies** monthly
- **Rotate secrets** quarterly
- **Monitor performance** metrics
- **Review security** settings
- **Backup data** regularly

### Updates

- **Test updates** in staging environment first
- **Update environment variables** if needed
- **Run validation** after updates
- **Monitor application** after deployment

This completes the production environment setup guide. Your application should now be ready for production deployment!
