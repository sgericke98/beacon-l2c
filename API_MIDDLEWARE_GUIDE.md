# API Middleware Guide

This guide explains how to use the comprehensive middleware system for API routes, including rate limiting, input validation, and CORS configuration.

## Overview

The middleware system provides three main features:
1. **Rate Limiting** - Prevents abuse and ensures fair usage
2. **Input Validation** - Validates request data using Zod schemas
3. **CORS Configuration** - Handles cross-origin requests properly

## Quick Start

### Basic API Route with Middleware

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withApiMiddleware } from '@/lib/api-middleware';

async function myHandler(request: NextRequest) {
  return NextResponse.json({ message: 'Hello World' });
}

export const GET = withApiMiddleware(
  { cors: 'api', rateLimit: { windowMs: 60000, maxRequests: 100 } },
  myHandler
);
```

### Validated API Route

```typescript
import { withValidatedAuthApi } from '@/lib/api-middleware';
import { schemas } from '@/lib/validation-schemas';

async function createUser(request: NextRequest, validatedData: typeof schemas.user.createUser._type) {
  // validatedData is type-safe and validated
  const { email, full_name, role } = validatedData;
  
  return NextResponse.json({ success: true, data: { email, full_name, role } });
}

export const POST = withValidatedAuthApi(schemas.user.createUser, createUser);
```

## Middleware Types

### 1. Rate Limiting

Rate limiting prevents abuse by limiting the number of requests per time window.

```typescript
// Predefined configurations
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

// General API: 100 requests per 15 minutes
RATE_LIMIT_CONFIGS.general

// Auth endpoints: 10 requests per 15 minutes
RATE_LIMIT_CONFIGS.auth

// Admin endpoints: 50 requests per 15 minutes
RATE_LIMIT_CONFIGS.admin

// Download endpoints: 5 requests per hour
RATE_LIMIT_CONFIGS.download

// Metrics endpoints: 30 requests per 5 minutes
RATE_LIMIT_CONFIGS.metrics

// Health check: 30 requests per minute
RATE_LIMIT_CONFIGS.health
```

### 2. CORS Configuration

CORS settings vary by endpoint type:

- **Public**: Permissive, for public APIs
- **Auth**: For authentication endpoints
- **API**: For authenticated API endpoints
- **Download**: Restrictive, for file downloads

### 3. Input Validation

Use Zod schemas to validate request data:

```typescript
import { schemas } from '@/lib/validation-schemas';

// Available schemas:
schemas.user.createUser
schemas.user.updateUser
schemas.metrics.dashboardFilters
schemas.salesforce.opportunityQuery
schemas.netsuite.invoiceQuery
// ... and more
```

## Convenience Functions

### Simple APIs

```typescript
import { 
  withPublicApi, 
  withAuthApi, 
  withAdminApi, 
  withDownloadApi,
  withMetricsApi,
  withHealthApi 
} from '@/lib/api-middleware';

// Public API (no auth required)
export const GET = withPublicApi(myHandler);

// Auth API (requires authentication)
export const POST = withAuthApi(myHandler);

// Admin API (requires admin role)
export const PUT = withAdminApi(myHandler);

// Download API (restrictive rate limits)
export const GET = withDownloadApi(myHandler);

// Metrics API (moderate rate limits)
export const GET = withMetricsApi(myHandler);

// Health check API
export const GET = withHealthApi(myHandler);
```

### Validated APIs

```typescript
import { 
  withValidatedAuthApi,
  withValidatedAdminApi,
  withValidatedDownloadApi,
  withValidatedMetricsApi 
} from '@/lib/api-middleware';

// Validated auth API
export const POST = withValidatedAuthApi(schemas.user.createUser, myHandler);

// Validated admin API
export const PUT = withValidatedAdminApi(schemas.user.updateUser, myHandler);

// Validated download API
export const POST = withValidatedDownloadApi(schemas.salesforce.downloadRequest, myHandler);

// Validated metrics API
export const GET = withValidatedMetricsApi(schemas.metrics.dashboardFilters, myHandler);
```

## Custom Configuration

### Custom Rate Limiting

```typescript
import { withApiMiddleware } from '@/lib/api-middleware';

export const GET = withApiMiddleware(
  {
    cors: 'api',
    rateLimit: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 50,
      message: 'Custom rate limit message'
    }
  },
  myHandler
);
```

### Custom CORS

```typescript
import { withCorsForType } from '@/lib/cors';

export const GET = withCorsForType('api', myHandler);
```

### Custom Validation

```typescript
import { z } from 'zod';
import { withValidatedApi } from '@/lib/api-middleware';

const customSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0)
});

export const POST = withValidatedApi(
  customSchema,
  { cors: 'api', rateLimit: { windowMs: 60000, maxRequests: 100 } },
  myHandler
);
```

## Environment Configuration

Add these environment variables to configure the middleware:

```env
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS_URL=redis://localhost:6379

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
CORS_ALLOW_CREDENTIALS=true
```

## Response Headers

The middleware automatically adds helpful headers:

### Rate Limiting Headers
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when the limit resets
- `X-RateLimit-Window`: Time window in milliseconds

### CORS Headers
- `Access-Control-Allow-Origin`: Allowed origins
- `Access-Control-Allow-Methods`: Allowed HTTP methods
- `Access-Control-Allow-Headers`: Allowed request headers
- `Access-Control-Expose-Headers`: Headers exposed to client
- `Access-Control-Allow-Credentials`: Whether credentials are allowed
- `Access-Control-Max-Age`: How long preflight results can be cached

## Error Responses

### Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests, please try again later.",
  "retryAfter": 900,
  "limit": 100,
  "remaining": 0,
  "resetTime": "2024-01-01T12:00:00.000Z"
}
```

### Validation Failed (400)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Best Practices

1. **Use appropriate middleware for endpoint types**
   - Public APIs: `withPublicApi`
   - Auth endpoints: `withAuthApi`
   - Admin endpoints: `withAdminApi`
   - Download endpoints: `withDownloadApi`

2. **Always validate input data**
   - Use `withValidatedAuthApi` for authenticated endpoints
   - Use `withValidatedAdminApi` for admin endpoints
   - Create custom schemas for specific use cases

3. **Configure CORS properly**
   - Use restrictive CORS for sensitive endpoints
   - Allow credentials only when necessary
   - Set appropriate max-age for preflight requests

4. **Monitor rate limiting**
   - Check rate limit headers in responses
   - Implement exponential backoff in clients
   - Consider different limits for different user types

5. **Handle errors gracefully**
   - Provide clear error messages
   - Include retry information
   - Log rate limit violations for monitoring

## Migration Guide

To migrate existing API routes:

1. **Replace basic handlers**:
   ```typescript
   // Before
   export async function GET(request: NextRequest) {
     return NextResponse.json({ data: 'hello' });
   }
   
   // After
   async function handler(request: NextRequest) {
     return NextResponse.json({ data: 'hello' });
   }
   export const GET = withPublicApi(handler);
   ```

2. **Add validation**:
   ```typescript
   // Before
   export async function POST(request: NextRequest) {
     const data = await request.json();
     // No validation
   }
   
   // After
   async function handler(request: NextRequest, validatedData: typeof schema._type) {
     // validatedData is type-safe
   }
   export const POST = withValidatedAuthApi(schema, handler);
   ```

3. **Update error handling**:
   ```typescript
   // The middleware handles validation and rate limiting errors automatically
   // Focus on business logic errors in your handlers
   ```
