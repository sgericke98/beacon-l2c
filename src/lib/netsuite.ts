/**
 * READ-ONLY NetSuite Integration
 * 
 * This module provides read-only access to NetSuite data.
 * All operations are restricted to SELECT queries only.
 * No INSERT, UPDATE, DELETE, or other write operations are allowed.
 */

import crypto from "crypto";
import { RawInvoiceFilters } from "./types";

/** Retraso auxiliar. */
function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Fetch con reintentos para NetSuite (gestiona 429 y 5xx). */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxAttempts = 3,
  baseDelay = 300
) {
  let attempt = 0;
  let lastError: any;
  while (attempt < maxAttempts) {
    try {
      const res = await fetch(url, options);
      if (res.status >= 200 && res.status < 300) return res;
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        throw new Error(
          `NetSuite request failed (${res.status}): ${await res.text()}`
        );
      }
    } catch (err) {
      lastError = err;
    }
    attempt++;
    const delay = baseDelay * 2 ** (attempt - 1) + Math.random() * 100;
    await wait(delay);
  }
  throw lastError;
}

/** Carga variables de entorno para NetSuite. */
interface NetSuiteEnv {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}
function loadEnv(): NetSuiteEnv {
  const {
    NS_ACCOUNT_ID,
    NS_CONSUMER_KEY,
    NS_CONSUMER_SECRET,
    NS_TOKEN_ID,
    NS_TOKEN_SECRET,
  } = process.env;
  const missing = [];
  if (!NS_ACCOUNT_ID) missing.push("NS_ACCOUNT_ID");
  if (!NS_CONSUMER_KEY) missing.push("NS_CONSUMER_KEY");
  if (!NS_CONSUMER_SECRET) missing.push("NS_CONSUMER_SECRET");
  if (!NS_TOKEN_ID) missing.push("NS_TOKEN_ID");
  if (!NS_TOKEN_SECRET) missing.push("NS_TOKEN_SECRET");
  if (missing.length) {
    throw new Error(`Missing NetSuite configuration: ${missing.join(", ")}`);
  }
  
  // Convert account ID to lowercase with dash format for API hostname (matching Python working code)
  let accountId = NS_ACCOUNT_ID!.toLowerCase();
  if (accountId.includes('_')) {
    accountId = accountId.replace('_', '-');
  }
  
  return {
    accountId,
    consumerKey: NS_CONSUMER_KEY!,
    consumerSecret: NS_CONSUMER_SECRET!,
    tokenId: NS_TOKEN_ID!,
    tokenSecret: NS_TOKEN_SECRET!,
  };
}

/** Construye la cabecera OAuth1 para NetSuite con HMAC-SHA256 - matching Python working code exactly. */
function oauthHeader(url: string, method: string): string {
  const env = loadEnv();
  const oauth_nonce = crypto.randomBytes(16).toString("hex");
  const oauth_timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    oauth_consumer_key: env.consumerKey,
    oauth_token: env.tokenId,
    oauth_nonce,
    oauth_timestamp,
    oauth_signature_method: "HMAC-SHA256",
    oauth_version: "1.0",
  };
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sorted),
  ].join("&");
  // Create signing key - match Python exactly (no double encoding)
  const signingKey = `${env.consumerSecret}&${env.tokenSecret}`;
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(baseString)
    .digest("base64");
  const headerParams: Record<string, string> = {
    ...params,
    oauth_signature: signature,
  };
  // Add realm parameter like Python code - use the original account ID format
  const realm = process.env.NS_ACCOUNT_ID;
  return (
    `OAuth realm="${realm}", ` +
    Object.keys(headerParams)
      .sort()
      .map(
        (k) =>
          `${encodeURIComponent(k)}="${encodeURIComponent(headerParams[k])}"`
      )
      .join(", ")
  );
}

/**
 * Ejecuta una consulta SuiteQL.  NetSuite expone el servicio `/services/rest/query/v1/suiteql`,
 * al que se envía un POST con JSON `{"q": "...", "parameters": [...]}`:contentReference[oaicite:8]{index=8}.
 */
export async function suiteQL<T>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  // Ensure read-only operations only
  const normalizedSql = sql.trim().toUpperCase();
  if (normalizedSql.startsWith('INSERT') || 
      normalizedSql.startsWith('UPDATE') || 
      normalizedSql.startsWith('DELETE') || 
      normalizedSql.startsWith('MERGE') ||
      normalizedSql.startsWith('CREATE') ||
      normalizedSql.startsWith('DROP') ||
      normalizedSql.startsWith('ALTER')) {
    throw new Error('Write operations are not allowed. This is a read-only interface.');
  }
  
  const env = loadEnv();
  const url = `https://${env.accountId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
  
  // Debug logging for NetSuite connection
  
  const body = JSON.stringify({ q: sql, parameters: params });
  const headers = {
    Authorization: oauthHeader(url, "POST"),
    "Content-Type": "application/json",
  } as const;
  
  try {
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    const json = (await res.json()) as { items: T[] };
    console.log(`✅ [NetSuite] Successfully retrieved ${json.items?.length || 0} records`);
    return json.items ?? [];
  } catch (error) {
    console.error(`❌ [NetSuite] Connection failed:`, error);
    throw error;
  }
}

/** Genera WHERE y parámetros para filtrar facturas (CustInvc) por filtros. */
export function buildSuiteQLWhere(f: Partial<RawInvoiceFilters>): {
  where: string;
  params: any[];
} {
  const clauses: string[] = ["type = 'CustInvc'"];
  const params: any[] = [];
  if (f.dateFrom) {
    clauses.push("trandate >= TO_DATE(?)");
    params.push(f.dateFrom);
  }
  if (f.dateTo) {
    clauses.push("trandate <= TO_DATE(?)");
    params.push(f.dateTo);
  }
  if (typeof f.minAmount === "number") {
    clauses.push("fxamount >= ?");
    params.push(f.minAmount);
  }
  if (typeof f.maxAmount === "number") {
    clauses.push("fxamount <= ?");
    params.push(f.maxAmount);
  }
  if (Array.isArray(f.status) && f.status.length > 0) {
    clauses.push(`status IN (${f.status.map(() => "?").join(",")})`);
    params.push(...f.status);
  }
  if (f.searchText && f.searchText.trim()) {
    clauses.push("(tranid ILIKE ? OR entityname ILIKE ?)");
    const like = `%${f.searchText}%`;
    params.push(like, like);
  }
  return { where: `WHERE ${clauses.join(" AND ")}`, params };
}
