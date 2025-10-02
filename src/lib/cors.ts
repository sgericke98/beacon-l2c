import { NextRequest, NextResponse } from 'next/server';
import { env } from './env';

// CORS configuration interface
export interface CorsConfig {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

// Default CORS configuration
const defaultCorsConfig: CorsConfig = {
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-RateLimit-Window',
    'X-Forwarded-For',
    'X-Real-IP',
    'CF-Connecting-IP'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-RateLimit-Window',
    'X-Total-Count',
    'X-Page-Count'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Production CORS configuration
const productionCorsConfig: CorsConfig = {
  origin: [
    // Add your production domains here
    'https://localhost3000.com',
    'https://caseware-probe-demo.vercel.app',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-RateLimit-Window',
    'X-Forwarded-For',
    'X-Real-IP',
    'CF-Connecting-IP'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-RateLimit-Window',
    'X-Total-Count',
    'X-Page-Count'
  ],
  credentials: true,
  maxAge: 86400
};

// Get CORS configuration based on environment
function getCorsConfig(): CorsConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isDevelopment) {
    return defaultCorsConfig;
  }
  
  if (isProduction) {
    return productionCorsConfig;
  }
  
  // Default to development config for other environments
  return defaultCorsConfig;
}

// Check if origin is allowed
function isOriginAllowed(origin: string, allowedOrigins: string | string[] | boolean): boolean {
  if (allowedOrigins === true) {
    return true; // Allow all origins
  }
  
  if (typeof allowedOrigins === 'string') {
    return origin === allowedOrigins;
  }
  
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin);
  }
  
  return false;
}

// Handle preflight requests
export function handleCorsPreflight(request: NextRequest): NextResponse | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }
  
  const corsConfig = getCorsConfig();
  const origin = request.headers.get('origin');
  
  // Check if origin is allowed
  if (origin && !isOriginAllowed(origin, corsConfig.origin)) {
    return new NextResponse(null, { status: 403 });
  }
  
  const response = new NextResponse(null, { status: 200 });
  
  // Set CORS headers
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
  response.headers.set('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
  response.headers.set('Access-Control-Allow-Credentials', corsConfig.credentials.toString());
  response.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString());
  
  return response;
}

// Add CORS headers to response
export function addCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const corsConfig = getCorsConfig();
  const origin = request.headers.get('origin');
  
  // Check if origin is allowed
  if (origin && isOriginAllowed(origin, corsConfig.origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (corsConfig.origin === true) {
    // Allow all origins
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }
  
  response.headers.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
  response.headers.set('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
  response.headers.set('Access-Control-Allow-Credentials', corsConfig.credentials.toString());
  response.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString());
  
  return response;
}

// CORS middleware wrapper
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    const preflightResponse = handleCorsPreflight(request);
    if (preflightResponse) {
      return preflightResponse;
    }
    
    // Execute the handler
    const response = await handler(request);
    
    // Add CORS headers to the response
    return addCorsHeaders(request, response);
  };
}

// CORS configuration for specific endpoints
export const corsConfigs = {
  // Public endpoints (more permissive)
  public: {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: [],
    credentials: false,
    maxAge: 3600
  },
  
  // Authentication endpoints
  auth: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Auth-Token', 'X-Refresh-Token'],
    credentials: true,
    maxAge: 3600
  },
  
  // API endpoints (restrictive)
  api: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com', 'https://app.yourdomain.com']
      : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Total-Count'
    ],
    credentials: true,
    maxAge: 86400
  },
  
  // Download endpoints (very restrictive)
  download: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com', 'https://app.yourdomain.com']
      : true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
    credentials: true,
    maxAge: 3600
  }
};

// CORS middleware for specific endpoint types
export function withCorsForType(
  type: keyof typeof corsConfigs,
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const config = corsConfigs[type];
      const origin = request.headers.get('origin');
      
      if (origin && !isOriginAllowed(origin, config.origin)) {
        return new NextResponse(null, { status: 403 });
      }
      
      const response = new NextResponse(null, { status: 200 });
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
      response.headers.set('Access-Control-Allow-Credentials', config.credentials.toString());
      response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
      
      return response;
    }
    
    // Execute the handler
    const response = await handler(request);
    
    // Add CORS headers
    const config = corsConfigs[type];
    const origin = request.headers.get('origin');
    
    if (origin && isOriginAllowed(origin, config.origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (config.origin === true) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
    }
    
    response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', config.credentials.toString());
    response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
    
    return response;
  };
}

// Convenience functions for different endpoint types
export const withPublicCors = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withCorsForType('public', handler);

export const withAuthCors = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withCorsForType('auth', handler);

export const withApiCors = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withCorsForType('api', handler);

export const withDownloadCors = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withCorsForType('download', handler);
