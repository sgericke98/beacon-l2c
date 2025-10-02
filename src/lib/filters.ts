import { DashboardFilters } from "./types";

/** Traduce la selección de `dealSize` en cláusulas de importe. Ajusta rangos a tu negocio. */
export function buildDealSizeClauses(dealSize?: string[]): string[] {
  if (!dealSize || !dealSize.length) return [];
  const mapping: Record<string, [number, number?]> = {
    small: [0, 10_000],
    medium: [10_000, 100_000],
    large: [100_000, 1_000_000],
    enterprise: [1_000_000],
  };
  return dealSize.flatMap((ds) => {
    const bounds = mapping[ds];
    if (!bounds) return [];
    return bounds.length === 1
      ? [`Amount >= ${bounds[0]}`]
      : [`(Amount >= ${bounds[0]} AND Amount < ${bounds[1]})`];
  });
}

/** Añade las cláusulas de dealSize a un WHERE existente. */
export function appendDealSize(where: string, dealSize?: string[]): string {
  const clauses = buildDealSizeClauses(dealSize);
  if (clauses.length === 0) return where;
  const sanitized = where.replace(/^WHERE\\s*/i, "").trim();
  const parts = [];
  if (sanitized) parts.push(sanitized);
  parts.push(`(${clauses.join(" OR ")})`);
  return `WHERE ${parts.join(" AND ")}`;
}
