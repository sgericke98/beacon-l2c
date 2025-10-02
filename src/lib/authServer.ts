import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin"; 

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function extractBearerToken(headerValue: string | null): string | undefined {
  if (!headerValue) return undefined;
  const [scheme, token] = headerValue.split(" ");
  if (!token) return undefined;
  if (scheme.toLowerCase() !== "bearer") return undefined;
  return token.trim();
}

async function getAccessToken(request: NextRequest): Promise<string> {
  const headerToken = extractBearerToken(request.headers.get("authorization"));
  if (headerToken) {
    return headerToken;
  }

  const cookieStore = cookies();
  const cookieToken = cookieStore.get("sb-access-token")?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const helperCookie = cookieStore.get("supabase-auth-token")?.value;
  if (helperCookie) {
    try {
      const parsed = JSON.parse(helperCookie) as { access_token?: string } | undefined;
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    } catch {
      // ignore malformed cookie
    }
  }

  throw new UnauthorizedError();
}

export async function requireUser(request: NextRequest): Promise<User> {
  const accessToken = await getAccessToken(request);
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new UnauthorizedError();
  }

  return data.user;
}

export async function resolveTenantId(userId: string): Promise<string> {
  const { data, error } = await (supabaseAdmin as any)
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("member_is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve tenant for user ${userId}: ${error.message}`);
  }

  if (!data?.organization_id) {
    // If no membership exists, create a default tenant and membership
    return await createDefaultTenantAndMembership(userId);
  }

  return data.organization_id;
}

async function createDefaultTenantAndMembership(userId: string): Promise<string> {
  try {
    // Create a new organization first
    const { data: orgData, error: orgError } = await (supabaseAdmin as any)
      .from("organizations")
      .insert({
        organization_name: "Default Organization",
        organization_slug: `org-${userId.slice(0, 8)}`,
        organization_settings: {}
      })
      .select("organization_id")
      .single();

    if (orgError) {
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }

    // Create membership for the user
    const { data: memberData, error: memberError } = await (supabaseAdmin as any)
      .from("organization_members")
      .insert({
        organization_id: orgData.organization_id,
        user_id: userId,
        member_role: "admin",
        member_is_active: true
      })
      .select("organization_id")
      .single();

    if (memberError) {
      throw new Error(`Failed to create membership: ${memberError.message}`);
    }

    console.log(`✅ [Auth] Created default organization and membership for user ${userId}`);
    return memberData.organization_id;
  } catch (error) {
    console.error(`❌ [Auth] Failed to create default organization and membership:`, error);
    throw new ForbiddenError("User does not belong to a tenant and could not create one");
  }
}

export async function requireTenant(request: NextRequest) {
  const user = await requireUser(request);
  const organizationId = await resolveTenantId(user.id);
  return { user, tenantId: organizationId }; // Keep tenantId for backward compatibility
}
