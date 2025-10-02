import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from './supabase-server';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { AuthenticatedUser, AuthContext } from './auth-middleware';

// Create a client for auth operations
const supabase = createClient(
  env.SUPABASE_URL || process.env.SUPABASE_URL || '',
  env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export interface EnhancedAuthContext extends AuthContext {
  selectedOrganizationId?: string;
  selectedUserId?: string;
  isAdmin?: boolean;
  canAccessAllOrganizations?: boolean;
}

export interface OrganizationFilter {
  organization_id?: string;
  organization_ids?: string[];
}

export interface UserFilter {
  user_id?: string;
  user_ids?: string[];
  created_by_user_id?: string;
}

/**
 * Enhanced authentication middleware that supports organization and user filtering
 */
export async function authenticateRequestWithFilters(request: NextRequest): Promise<EnhancedAuthContext | null> {
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

    // Check if user is admin (can access all organizations)
    const isAdmin = (primaryMember as any).member_role === 'admin';
    const canAccessAllOrganizations = isAdmin;

    // Get selected organization from query params or headers
    const selectedOrgId = request.nextUrl.searchParams.get('organization_id') || 
                         request.headers.get('x-organization-id') ||
                         (primaryMember as any).organization_id;

    // Get selected user from query params or headers (for admin filtering)
    const selectedUserId = request.nextUrl.searchParams.get('user_id') || 
                          request.headers.get('x-user-id');

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
      supabase: supabaseServer,
      selectedOrganizationId: selectedOrgId || undefined,
      selectedUserId: selectedUserId || undefined,
      isAdmin,
      canAccessAllOrganizations
    };
  } catch (error) {
    console.error('Enhanced authentication middleware error:', error);
    return null;
  }
}

/**
 * Apply organization filtering to a Supabase query
 */
export function applyOrganizationFilter(
  query: any, 
  context: EnhancedAuthContext, 
  organizationFilter?: OrganizationFilter
) {
  const targetOrgId = organizationFilter?.organization_id || 
                     context.selectedOrganizationId || 
                     context.user.organization_id;

  if (targetOrgId) {
    // If user can access all organizations, allow filtering by specific org
    if (context.canAccessAllOrganizations) {
      if (organizationFilter?.organization_ids && organizationFilter.organization_ids.length > 0) {
        query = query.in('organization_id', organizationFilter.organization_ids);
      } else if (targetOrgId) {
        query = query.eq('organization_id', targetOrgId);
      }
    } else {
      // Regular users can only access their own organizations
      const userOrgIds = context.user.available_organizations?.map(org => org.organization_id) || [];
      if (userOrgIds.length > 0) {
        query = query.in('organization_id', userOrgIds);
      }
    }
  }

  return query;
}

/**
 * Apply user filtering to a Supabase query
 */
export function applyUserFilter(
  query: any, 
  context: EnhancedAuthContext, 
  userFilter?: UserFilter
) {
  const targetUserId = userFilter?.user_id || 
                      userFilter?.created_by_user_id ||
                      context.selectedUserId;

  if (targetUserId) {
    // Only allow user filtering if user is admin or filtering by their own data
    if (context.isAdmin || targetUserId === context.user.id) {
      if (userFilter?.user_ids && userFilter.user_ids.length > 0) {
        query = query.in('user_id', userFilter.user_ids);
      } else if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }
    }
  }

  return query;
}

/**
 * Enhanced middleware wrapper for API routes with organization/user filtering
 */
export function withEnhancedAuth(
  handler: (request: NextRequest, context: EnhancedAuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authContext = await authenticateRequestWithFilters(request);

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
 * Middleware for admin-only routes with cross-organization access
 */
export function withAdminCrossOrgAuth(
  handler: (request: NextRequest, context: EnhancedAuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authContext = await authenticateRequestWithFilters(request);

    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!authContext.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required for cross-organization operations' },
        { status: 403 }
      );
    }

    return handler(request, authContext);
  };
}

/**
 * Helper function to build organization-aware queries
 */
export function buildOrganizationAwareQuery(
  supabase: any,
  tableName: string,
  context: EnhancedAuthContext,
  organizationFilter?: OrganizationFilter,
  userFilter?: UserFilter
) {
  let query = supabase.from(tableName);

  // Apply organization filtering
  query = applyOrganizationFilter(query, context, organizationFilter);

  // Apply user filtering
  query = applyUserFilter(query, context, userFilter);

  return query;
}

/**
 * Helper function to apply organization filtering to an existing query
 */
export function applyOrganizationFilterToQuery(
  query: any,
  context: EnhancedAuthContext,
  organizationFilter?: OrganizationFilter
) {
  return applyOrganizationFilter(query, context, organizationFilter);
}

/**
 * Helper function to get user's accessible organization IDs
 */
export function getAccessibleOrganizationIds(context: EnhancedAuthContext): string[] {
  if (context.canAccessAllOrganizations) {
    // Admin users can access all organizations
    return [];
  }
  
  return context.user.available_organizations?.map(org => org.organization_id) || [];
}

/**
 * Helper function to validate organization access
 */
export function validateOrganizationAccess(
  context: EnhancedAuthContext, 
  targetOrganizationId: string
): boolean {
  if (context.canAccessAllOrganizations) {
    return true;
  }

  const accessibleOrgIds = getAccessibleOrganizationIds(context);
  return accessibleOrgIds.includes(targetOrganizationId);
}
