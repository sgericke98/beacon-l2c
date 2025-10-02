import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRateLimit, RateLimitConfig, RATE_LIMIT_CONFIGS } from './rate-limit';
import { withCors, withCorsForType } from './cors';
import { withValidation } from './validation-schemas';

// Combined middleware types
export type ApiMiddlewareConfig = {
  rateLimit?: RateLimitConfig;
  cors?: 'public' | 'auth' | 'api' | 'download';
  validation?: z.ZodSchema<any>;
};

// Combined middleware function
export function withApiMiddleware<T = any>(
  config: ApiMiddlewareConfig,
  handler: (request: NextRequest, validatedData?: T) => Promise<NextResponse> | NextResponse
) {
  let middleware = handler;

  // Apply validation if schema provided
  if (config.validation) {
    middleware = withValidation(config.validation, middleware as any);
  }

  // Apply rate limiting if config provided
  if (config.rateLimit) {
    middleware = withRateLimit(config.rateLimit, middleware);
  }

  // Apply CORS if type provided
  if (config.cors) {
    middleware = withCorsForType(config.cors, middleware);
  }

  return middleware;
}

// Convenience functions for common patterns
export const withPublicApi = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withApiMiddleware({ cors: 'public' }, handler);

export const withAuthApi = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withApiMiddleware({ 
    cors: 'auth', 
    rateLimit: RATE_LIMIT_CONFIGS.auth 
  }, handler);

export const withAdminApi = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withApiMiddleware({ 
    cors: 'api', 
    rateLimit: RATE_LIMIT_CONFIGS.admin 
  }, handler);

export const withDownloadApi = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withApiMiddleware({ 
    cors: 'download', 
    rateLimit: RATE_LIMIT_CONFIGS.download 
  }, handler);

export const withMetricsApi = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withApiMiddleware({ 
    cors: 'api', 
    rateLimit: RATE_LIMIT_CONFIGS.metrics 
  }, handler);

export const withHealthApi = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withApiMiddleware({ 
    cors: 'public', 
    rateLimit: RATE_LIMIT_CONFIGS.health 
  }, handler);

// Validated API middleware
export function withValidatedApi<T>(
  schema: z.ZodSchema<T>,
  config: Omit<ApiMiddlewareConfig, 'validation'>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
) {
  return withApiMiddleware({ ...config, validation: schema }, handler);
}

// Validated convenience functions
export const withValidatedAuthApi = <T>(
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
) => withValidatedApi(schema, { cors: 'auth', rateLimit: RATE_LIMIT_CONFIGS.auth }, handler);

export const withValidatedAdminApi = <T>(
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
) => withValidatedApi(schema, { cors: 'api', rateLimit: RATE_LIMIT_CONFIGS.admin }, handler);

export const withValidatedDownloadApi = <T>(
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
) => withValidatedApi(schema, { cors: 'download', rateLimit: RATE_LIMIT_CONFIGS.download }, handler);

export const withValidatedMetricsApi = <T>(
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
) => withValidatedApi(schema, { cors: 'api', rateLimit: RATE_LIMIT_CONFIGS.metrics }, handler);
