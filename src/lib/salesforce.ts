/**
 * READ-ONLY Salesforce Integration
 *
 * This module provides read-only access to Salesforce data.
 * All operations are restricted to SELECT queries only.
 * No INSERT, UPDATE, DELETE, or other write operations are allowed.
 */

import { DashboardFilters } from "./types";
import { getValidAccessToken, refreshAccessToken } from "./salesforceAuth";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  max = 3,
  base = 300
) {
  let err: any;
  for (let i = 0; i < max; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 || (res.status >= 500 && res.status < 600))
        err = new Error(`HTTP ${res.status}`);
      else
        throw new Error(`Salesforce error ${res.status}: ${await res.text()}`);
    } catch (e) {
      err = e;
    }
    await delay(base * 2 ** i + Math.random() * 100);
  }
  throw err;
}

export async function soqlQuery<T>(
  soql: string,
  tenantId: string
): Promise<T[]> {
  // Ensure read-only operations only
  const normalizedSoql = soql.trim().toUpperCase();
  if (
    normalizedSoql.startsWith("INSERT") ||
    normalizedSoql.startsWith("UPDATE") ||
    normalizedSoql.startsWith("DELETE") ||
    normalizedSoql.startsWith("UPSERT") ||
    normalizedSoql.startsWith("MERGE")
  ) {
    throw new Error(
      "Write operations are not allowed. This is a read-only interface."
    );
  }
  // 1st attempt with current token
  let { accessToken, instanceUrl } = await getValidAccessToken(tenantId);
  const apiVersion = process.env.SF_API_VERSION ?? "v62.0";
  async function runOnce(
    token: string
  ): Promise<{ ok: boolean; records?: T[]; status?: number; text?: string }> {
    let url = `${instanceUrl}/services/data/${apiVersion}/query/?q=${encodeURIComponent(
      soql
    )}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Sforce-Query-Options": "batchSize=2000",
    } as const;
    const out: T[] = [];
    while (url) {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.status === 401)
        return { ok: false, status: 401, text: await res.text() };
      if (!res.ok)
        throw new Error(
          `Salesforce query failed (${res.status}): ${await res.text()}`
        );
      const json = (await res.json()) as {
        records: T[];
        done: boolean;
        nextRecordsUrl?: string;
      };
      out.push(...json.records);
      if (json.done) break;
      url = `${instanceUrl}${json.nextRecordsUrl}`;
    }
    return { ok: true, records: out };
  }

  let attempt = await runOnce(accessToken);
  if (!attempt.ok && attempt.status === 401) {
    await refreshAccessToken(tenantId);
    ({ accessToken, instanceUrl } = await getValidAccessToken(tenantId));
    attempt = await runOnce(accessToken);
    if (!attempt.ok)
      throw new Error(`Unauthorized after refresh: ${attempt.text}`);
  }
  return attempt.records!;
}

/** Builds WHERE clause for SOQL queries based on filters. */
export function buildSalesforceWhere(
  filters: Partial<DashboardFilters>
): string {
  const clauses: string[] = [];
  const dr = filters.dateRange;

  if (dr?.from) {
    clauses.push(`CreatedDate >= ${toSFDate(dr.from)}`);
  }
  if (dr?.to) {
    clauses.push(`CreatedDate <= ${toSFDate(dr.to)}`);
  }

  // Add region filter (country-based)
  if (filters.region && filters.region.length > 0) {
    const regionClause = filters.region
      .map((region) => `CustomerCountry__c = '${region.replace(/'/g, "\\'")}'`)
      .join(" OR ");
    clauses.push(`(${regionClause})`);
  }

  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

/** Convierte fechas ISO en el formato requerido por SOQL (`YYYY-MM-DDTHH:MM:SSZ`). */
function toSFDate(iso: string) {
  return iso.includes("T")
    ? iso.endsWith("Z")
      ? iso
      : `${iso}Z`
    : `${iso}T00:00:00Z`;
}
