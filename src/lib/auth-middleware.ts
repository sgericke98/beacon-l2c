import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from './supabase-server';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Create a client for auth operations
const supabase = createClient(
  env.SUPABASE_URL || process.env.SUPABASE_URL || '',
  env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  organization_id?: string;
  organization_name?: string;
  available_organizations?: Array<{
    organization_id: string;
    organization_name: string;
    organization_slug: string;
    member_role: string;
  }>;
}

export interface AuthContext {
  user: AuthenticatedUser;
  supabase: typeof supabaseServer;
}

/**
 * Authentication middleware for API routes
 * Validates JWT token and extracts user information
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthContext | null> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value;

    if (!token) {
      return null;
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Authentication error:', error);
      return null;
    }

    // Get user details from organization_members table with organization info
    const { data: memberData, error: memberError } = await supabaseServer
      .from('organization_members')
      .select(`
        user_id,
        member_role,
        member_is_active,
        organization_id,
        organizations!inner(
          organization_id,
          organization_name,
          organization_slug
        )
      `)
      .eq('user_id' as any, user.id as any)
      .eq('member_is_active' as any, true as any);

    if (memberError || !memberData || memberData.length === 0) {
      console.error('Member data error:', memberError);
      return null;
    }

    // Get all user's organizations for context
    const { data: allOrganizations, error: orgsError } = await supabaseServer
      .from('organization_members')
      .select(`
        organization_id,
        member_role,
        organizations!inner(
          organization_id,
          organization_name,
          organization_slug
        )
      `)
      .eq('user_id' as any, user.id as any)
      .eq('member_is_active' as any, true as any);

    if (orgsError) {
      console.error('Organizations data error:', orgsError);
      return null;
    }

    // Use the first organization as default, or allow selection
    const primaryMember = memberData[0];
    const availableOrgs = allOrganizations?.map(org => ({
      organization_id: (org as any).organization_id || '',
      organization_name: (org as any).organizations?.organization_name || '',
      organization_slug: (org as any).organizations?.organization_slug || '',
      member_role: (org as any).member_role || 'member'
    })) || [];

    // Get user details from auth.users
    const { data: authData, error: authError } = await supabaseServer.auth.admin.getUserById(user.id);
    
    if (authError || !authData?.user) {
      console.error('Auth data error:', authError);
      return null;
    }

    const fullName = authData.user.user_metadata?.full_name ||
                    authData.user.email ||
                    'Unknown User';

    return {
      user: {
        id: user.id,
        email: authData.user.email || 'unknown@example.com',
        role: (primaryMember as any).member_role || 'member',
        full_name: fullName,
        organization_id: (primaryMember as any).organization_id || undefined,
        organization_name: (primaryMember as any).organizations?.organization_name || undefined,
        available_organizations: availableOrgs
      },
      supabase: supabaseServer
    };
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return null;
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authContext = await authenticateRequest(request);

    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(request, authContext);
  };
}

/**
 * Middleware wrapper for API routes that require admin role
 */
export function withAdminAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authContext = await authenticateRequest(request);

    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authContext.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    return handler(request, authContext);
  };
}

/**
 * Middleware wrapper for API routes that require specific roles
 */
export function withRoleAuth(allowedRoles: string[]) {
  return function(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
    return async (request: NextRequest) => {
      const authContext = await authenticateRequest(request);

      if (!authContext) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      if (!allowedRoles.includes(authContext.user.role)) {
        return NextResponse.json(
          { error: 'Forbidden', message: `Access denied. Required roles: ${allowedRoles.join(', ')}` },
          { status: 403 }
        );
      }

      return handler(request, authContext);
    };
  };
}

/**
 * Optional authentication middleware
 * Provides user context if authenticated, but doesn't require it
 */
export function withOptionalAuth(handler: (request: NextRequest, context: AuthContext | null) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authContext = await authenticateRequest(request);
    return handler(request, authContext);
  };
}

/**
 * Rate limiting middleware
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return function(handler: (request: NextRequest, context?: AuthContext) => Promise<NextResponse>) {
    return async (request: NextRequest, context?: AuthContext) => {
      const identifier = context?.user?.id || 
                       request.ip || 
                       request.headers.get('x-forwarded-for') || 
                       'anonymous';

      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      rateLimitMap.forEach((value, key) => {
        if (value.resetTime < windowStart) {
          rateLimitMap.delete(key);
        }
      });

      const current = rateLimitMap.get(identifier);
      
      if (!current) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now });
      } else if (current.resetTime < windowStart) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now });
      } else if (current.count >= maxRequests) {
        return NextResponse.json(
          { 
            error: 'Too Many Requests', 
            message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
            retryAfter: Math.ceil((current.resetTime + windowMs - now) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((current.resetTime + windowMs - now) / 1000).toString()
            }
          }
        );
      } else {
        current.count++;
      }

      return handler(request, context);
    };
  };
}

/**
 * CORS middleware
 */
export function withCORS(handler: (request: NextRequest, context?: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: AuthContext) => {
    const response = await handler(request, context);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  };
}

/**
 * Combined middleware for common API routes
 */
export function withApiAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return withCORS(withRateLimit()(withAuth(handler)));
}

/**
 * Combined middleware for admin API routes
 */
export function withAdminApiAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return withCORS(withRateLimit()(withAdminAuth(handler)));
}

/**
 * Health check endpoint (no auth required)
 */
export async function healthCheck(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
}

/**
 * Environment validation endpoint (admin only)
 */
export async function validateEnvironmentEndpoint(request: NextRequest, context: AuthContext) {
  try {
    // This would run the same validation as the CLI script
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    const placeholder = requiredVars.filter(varName => 
      process.env[varName]?.includes('your_') || process.env[varName]?.includes('your-')
    );

    return NextResponse.json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      validation: {
        missing,
        placeholder,
        valid: missing.length === 0 && placeholder.length === 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Validation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
