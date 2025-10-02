import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

// Default rate limiting configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests, please try again later.'
  },
  
  // Authentication endpoints (more restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts, please try again later.'
  },
  
  // Admin endpoints (very restrictive)
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
    message: 'Too many admin requests, please try again later.'
  },
  
  // Health check endpoints (more lenient)
  health: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Health check rate limit exceeded.'
  },
  
  // Data download endpoints (restrictive for large operations)
  download: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    message: 'Download rate limit exceeded, please try again later.'
  },
  
  // Metrics endpoints (moderate)
  metrics: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 30,
    message: 'Metrics rate limit exceeded, please try again later.'
  }
} as const;

// In-memory store for rate limiting (in production, consider using Redis)
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    this.store.forEach((value, key) => {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    });
  }

  get(key: string): { count: number; resetTime: number } | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, count: number, resetTime: number) {
    this.store.set(key, { count, resetTime });
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.get(key);
    
    if (!entry) {
      const resetTime = now + windowMs;
      this.set(key, 1, resetTime);
      return { count: 1, resetTime };
    }
    
    const newCount = entry.count + 1;
    this.set(key, newCount, entry.resetTime);
    return { count: newCount, resetTime: entry.resetTime };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limit store instance
const rateLimitStore = new RateLimitStore();

// Get client identifier from request
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (for different deployment scenarios)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  let ip = forwarded?.split(',')[0]?.trim() || 
           realIp || 
           cfConnectingIp || 
           'unknown';
  
  // For development, use a fallback
  if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
    ip = 'localhost';
  }
  
  return ip;
}

// Rate limiting middleware
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const clientId = getClientIdentifier(request);
    const key = `rate_limit:${clientId}`;
    
    const { count, resetTime } = rateLimitStore.increment(key, config.windowMs);
    
    // Check if rate limit exceeded
    if (count > config.maxRequests) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: config.message || 'Too many requests, please try again later.',
          retryAfter,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: new Date(resetTime).toISOString()
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'X-RateLimit-Window': config.windowMs.toString()
          }
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const response = await handler(request);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count).toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
    response.headers.set('X-RateLimit-Window', config.windowMs.toString());
    
    return response;
  };
}

// Rate limiting with validation middleware
export function withRateLimitAndValidation<T>(
  config: RateLimitConfig,
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
) {
  return withRateLimit(config, async (request: NextRequest): Promise<NextResponse> => {
    try {
      let data: unknown;
      
      // Parse data based on request method
      if (request.method === 'GET') {
        const url = new URL(request.url);
        data = Object.fromEntries(url.searchParams.entries());
      } else {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await request.json();
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          data = Object.fromEntries(formData.entries());
        } else {
          return NextResponse.json(
            { error: 'Unsupported content type' },
            { status: 400 }
          );
        }
      }

      // Validate data
      const validation = schema.safeParse(data);
      
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validation.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        );
      }

      return await handler(request, validation.data);
    } catch (error) {
      console.error('Rate limit with validation middleware error:', error);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
  });
}

// Convenience functions for different endpoint types
export const withGeneralRateLimit = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withRateLimit(RATE_LIMIT_CONFIGS.general, handler);

export const withAuthRateLimit = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withRateLimit(RATE_LIMIT_CONFIGS.auth, handler);

export const withAdminRateLimit = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withRateLimit(RATE_LIMIT_CONFIGS.admin, handler);

export const withHealthRateLimit = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withRateLimit(RATE_LIMIT_CONFIGS.health, handler);

export const withDownloadRateLimit = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withRateLimit(RATE_LIMIT_CONFIGS.download, handler);

export const withMetricsRateLimit = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withRateLimit(RATE_LIMIT_CONFIGS.metrics, handler);

// Cleanup function for graceful shutdown
export function cleanupRateLimit() {
  rateLimitStore.destroy();
}

// Export the store for testing purposes
export { rateLimitStore };
