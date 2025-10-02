import { sfTokenStore } from "./sfTokenStore";

function domain() {
  return process.env.SF_DOMAIN || "https://login.salesforce.com";
}

export function salesforceAuthUrl() {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SF_CLIENT_ID!,
    redirect_uri: process.env.SF_REDIRECT_URI!,
    scope: "api refresh_token offline_access", // keep minimal scopes
  });
  return `${domain()}/services/oauth2/authorize?${q.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  tenantId: string
) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.SF_CLIENT_ID!,
    client_secret: process.env.SF_CLIENT_SECRET!, // keep checked: “require secret…”
    redirect_uri: process.env.SF_REDIRECT_URI!,
    code_verifier: codeVerifier, // ← PKCE!
  });

  const res = await fetch(`${domain()}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  await sfTokenStore.set(tenantId, {
    access_token: data.access_token,
    refresh_token: data.refresh_token, // may be undefined on some org policies
    instance_url: data.instance_url,
    issued_at: data.issued_at,
    token_type: data.token_type,
  });
  return data;
}

export async function refreshAccessToken(tenantId: string) {
  const saved = await sfTokenStore.get(tenantId);
  if (!saved?.refresh_token)
    throw new Error("No refresh_token stored. Connect first.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: saved.refresh_token,
    client_id: process.env.SF_CLIENT_ID!,
    client_secret: process.env.SF_CLIENT_SECRET!,
  });

  const res = await fetch(`${domain()}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  await sfTokenStore.set(tenantId, {
    access_token: data.access_token,
    refresh_token: saved.refresh_token, // SF often omits it on refresh
    instance_url: data.instance_url || saved.instance_url,
    issued_at: data.issued_at,
    token_type: data.token_type,
  });
  return data;
}

export async function getValidAccessToken(
  tenantId: string
): Promise<{
  accessToken: string;
  instanceUrl: string;
}> {
  const saved = await sfTokenStore.get(tenantId);
  if (!saved)
    throw new Error(
      "Not connected to Salesforce. Hit /api/salesforce/auth/start first."
    );
  return { accessToken: saved.access_token, instanceUrl: saved.instance_url };
}
