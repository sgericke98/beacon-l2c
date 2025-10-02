import { sfTokenStore } from "./sfTokenStore";

function domain() {
  return process.env.SF_DOMAIN || "https://login.salesforce.com";
}

/**
 * Refresh an access token using the refresh token
 */
async function refreshAccessToken(refreshToken: string, tenantId: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.SF_CLIENT_ID!,
    client_secret: process.env.SF_CLIENT_SECRET!,
  });

  const response = await fetch(`${domain()}/services/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Update the stored token
  await sfTokenStore.set(tenantId, {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep the original refresh token
    instance_url: data.instance_url,
    issued_at: Math.floor(Date.now() / 1000).toString(),
    token_type: data.token_type,
  });

  return data;
}

/**
 * Authenticate using Username-Password OAuth flow (service credentials)
 * This doesn't require user interaction and uses stored credentials
 */
export async function authenticateWithServiceCredentials(tenantId: string): Promise<{
  accessToken: string;
  instanceUrl: string;
}> {
  // Check if we already have a valid token
  const existing = await sfTokenStore.get(tenantId);
  if (existing && existing.access_token) {
    // Check if token is still valid (not expired)
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = existing.issued_at ? (now - parseInt(existing.issued_at)) : 0;
    
    // Token is valid for 2 hours (7200 seconds), but we'll refresh if it's older than 1 hour
    if (tokenAge < 3600) { 
      return {
        accessToken: existing.access_token,
        instanceUrl: existing.instance_url
      };
    }
    
    // Try to refresh the token if we have a refresh token
    if (existing.refresh_token) {
      try {
        const refreshedToken = await refreshAccessToken(existing.refresh_token, tenantId);
        return {
          accessToken: refreshedToken.access_token,
          instanceUrl: refreshedToken.instance_url
        };
      } catch (error) {
        console.warn('Failed to refresh token, will try service credentials:', error);
        // Fall through to service credentials authentication
      }
    }
  }

  // Get credentials from environment variables
  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const securityToken = process.env.SF_SECURITY_TOKEN;
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;

  if (!username || !password || !clientId || !clientSecret) {
    throw new Error(
      "No valid Salesforce token found and missing service credentials. Either authenticate via OAuth or set SF_USERNAME, SF_PASSWORD, SF_CLIENT_ID, and SF_CLIENT_SECRET environment variables."
    );
  }

  // Combine password and security token if provided
  const fullPassword = securityToken ? `${password}${securityToken}` : password;

  // Make the authentication request
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    client_secret: clientSecret,
    username: username,
    password: fullPassword,
  });

  const response = await fetch(`${domain()}/services/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Salesforce authentication failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Store the token for future use
  await sfTokenStore.set(tenantId, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    instance_url: data.instance_url,
    issued_at: Math.floor(Date.now() / 1000).toString(),
    token_type: data.token_type,
  });

  return {
    accessToken: data.access_token,
    instanceUrl: data.instance_url
  };
}

/**
 * Get a valid access token using service credentials
 */
export async function getValidServiceAccessToken(tenantId: string): Promise<{
  accessToken: string;
  instanceUrl: string;
}> {
  try {
    return await authenticateWithServiceCredentials(tenantId);
  } catch (error) {
    throw new Error(`Failed to authenticate with Salesforce: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
