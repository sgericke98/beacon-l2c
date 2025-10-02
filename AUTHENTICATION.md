# 🔐 Authentication & Authorization Guide

This document explains the authentication and authorization system implemented in the Beacon L2C Analytics application.

## 🏗️ Architecture Overview

The application uses a **JWT-based authentication system** with Supabase Auth as the identity provider and custom middleware for API route protection.

### Key Components

- **Supabase Auth**: Identity provider and JWT token management
- **Authentication Middleware**: API route protection and user context
- **Role-based Access Control**: Admin, user, and custom role permissions
- **Rate Limiting**: API request throttling
- **CORS Protection**: Cross-origin request security

## 🔧 Authentication Flow

### 1. User Login
```typescript
// Frontend login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// JWT token is automatically stored in cookies
```

### 2. API Request Authentication
```typescript
// Frontend API calls include JWT token
const response = await fetch('/api/metrics/dashboard-unified', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ filters })
});
```

### 3. Server-side Validation
```typescript
// Middleware validates JWT and extracts user context
const authContext = await authenticateRequest(request);
if (!authContext) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## 🛡️ Middleware Types

### 1. Basic Authentication (`withAuth`)
Requires valid JWT token for access.

```typescript
export const GET = withAuth(async (request, context) => {
  // context.user contains authenticated user info
  return NextResponse.json({ data: 'protected data' });
});
```

### 2. Admin Authentication (`withAdminAuth`)
Requires admin role for access.

```typescript
export const GET = withAdminAuth(async (request, context) => {
  // Only admin users can access this
  return NextResponse.json({ data: 'admin data' });
});
```

### 3. Role-based Authentication (`withRoleAuth`)
Requires specific roles for access.

```typescript
export const GET = withRoleAuth(['admin', 'manager'])(async (request, context) => {
  // Only admin or manager users can access this
  return NextResponse.json({ data: 'role-protected data' });
});
```

### 4. Optional Authentication (`withOptionalAuth`)
Provides user context if authenticated, but doesn't require it.

```typescript
export const GET = withOptionalAuth(async (request, context) => {
  if (context) {
    // User is authenticated
    return NextResponse.json({ data: 'personalized data' });
  } else {
    // User is not authenticated
    return NextResponse.json({ data: 'public data' });
  }
});
```

### 5. Combined Middleware (`withApiAuth`, `withAdminApiAuth`)
Includes authentication, rate limiting, and CORS protection.

```typescript
// Standard API route with full protection
export const POST = withApiAuth(handler);

// Admin API route with full protection
export const POST = withAdminApiAuth(handler);
```

## 🔒 Security Features

### Rate Limiting
- **Default**: 100 requests per minute per user
- **Configurable**: Custom limits per endpoint
- **Headers**: `Retry-After` header on rate limit exceeded

```typescript
// Custom rate limiting
export const GET = withRateLimit(50, 60000)(handler); // 50 requests per minute
```

### CORS Protection
- **Origin validation**: Only allows requests from configured domain
- **Method restrictions**: Only allows specified HTTP methods
- **Header validation**: Validates required headers

### Input Validation
- **JWT token validation**: Verifies token signature and expiration
- **User existence**: Ensures user exists in database
- **Role verification**: Validates user permissions

## 📊 User Roles & Permissions

### Role Hierarchy
1. **Admin**: Full system access
2. **Manager**: Limited admin access
3. **User**: Standard user access
4. **Guest**: Read-only access (optional)

### Permission Matrix

| Endpoint | Admin | Manager | User | Guest |
|----------|-------|---------|------|-------|
| `/api/health` | ✅ | ✅ | ✅ | ✅ |
| `/api/metrics/*` | ✅ | ✅ | ✅ | ❌ |
| `/api/admin/*` | ✅ | ❌ | ❌ | ❌ |
| `/api/user/profile` | ✅ | ✅ | ✅ | ❌ |

## 🚀 API Usage Examples

### 1. Protected Dashboard Data
```typescript
// Frontend
const fetchDashboardData = async (filters) => {
  const response = await fetch('/api/metrics/dashboard-unified', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filters })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/auth';
    }
    throw new Error('Failed to fetch data');
  }
  
  return response.json();
};
```

### 2. Admin User Management
```typescript
// Frontend (admin only)
const createUser = async (userData) => {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  if (response.status === 403) {
    throw new Error('Admin access required');
  }
  
  return response.json();
};
```

### 3. User Profile Management
```typescript
// Frontend
const updateProfile = async (profileData) => {
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
  });
  
  return response.json();
};
```

## 🔧 Configuration

### Environment Variables
```bash
# Supabase configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Database Schema
```sql
-- Users table with RLS
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

-- Policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);
```

## 🚨 Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Max 100 requests per 60 seconds.",
  "retryAfter": 30
}
```

### Frontend Error Handling
```typescript
const handleApiError = (response: Response) => {
  switch (response.status) {
    case 401:
      // Redirect to login
      window.location.href = '/auth';
      break;
    case 403:
      // Show access denied message
      showError('Access denied. Insufficient permissions.');
      break;
    case 429:
      // Show rate limit message
      showError('Too many requests. Please try again later.');
      break;
    default:
      // Show generic error
      showError('An error occurred. Please try again.');
  }
};
```

## 🔍 Debugging & Monitoring

### Authentication Logs
```typescript
// Enable debug logging
console.log('Auth context:', {
  userId: context.user.id,
  email: context.user.email,
  role: context.user.role
});
```

### Health Check Endpoints
```bash
# Check application health
curl https://your-domain.com/api/health

# Check environment validation (admin only)
curl https://your-domain.com/api/validate-env \
  -H "Authorization: Bearer your-admin-token"
```

### Rate Limit Monitoring
```typescript
// Check rate limit status
const rateLimitStatus = await fetch('/api/rate-limit-status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🛠️ Development

### Testing Authentication
```bash
# Test with valid token
curl -X POST https://your-domain.com/api/metrics/dashboard-unified \
  -H "Authorization: Bearer valid-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"filters": {}}'

# Test without token (should return 401)
curl -X POST https://your-domain.com/api/metrics/dashboard-unified \
  -H "Content-Type: application/json" \
  -d '{"filters": {}}'
```

### Local Development
```bash
# Start development server
npm run dev

# Test authentication middleware
npm run validate-env
```

## 📚 Best Practices

### 1. Token Management
- **Store tokens securely** in HTTP-only cookies
- **Implement token refresh** for long-lived sessions
- **Clear tokens on logout**

### 2. Error Handling
- **Never expose sensitive information** in error messages
- **Log authentication failures** for monitoring
- **Implement proper error boundaries**

### 3. Security
- **Validate all inputs** before processing
- **Use HTTPS** in production
- **Implement proper CORS** configuration
- **Monitor for suspicious activity**

### 4. Performance
- **Cache user data** when appropriate
- **Implement request deduplication**
- **Use connection pooling** for database queries

This authentication system provides a robust, secure foundation for your application with proper role-based access control and comprehensive error handling.
