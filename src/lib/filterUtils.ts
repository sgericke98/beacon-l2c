import { DEAL_SIZE_THRESHOLDS } from './constants';

export interface FilterParams {
  dealSize?: string;
  customerTier?: string;
  geolocation?: string;
  productType?: string;
  stage?: string;
  leadType?: string;
  customerType?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

/**
 * Applies common filters to a Supabase query
 */
export function applyCommonFilters<T extends any>(
  query: T,
  filters: FilterParams
): T {
  let filteredQuery = query;

  // Date range filters
  if (filters.dateRange?.from) {
    filteredQuery = (filteredQuery as any).gte('opportunity_created_date', filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    filteredQuery = (filteredQuery as any).lte('opportunity_created_date', filters.dateRange.to);
  }

  // Customer tier filter
  if (filters.customerTier && filters.customerTier !== 'all') {
    filteredQuery = (filteredQuery as any).eq('customer_tier', filters.customerTier);
  }

  // Geolocation filter (customer country)
  if (filters.geolocation && filters.geolocation !== 'all') {
    filteredQuery = (filteredQuery as any).eq('customer_country', filters.geolocation);
  }

  // Product type filter (using market segment as proxy)
  if (filters.productType && filters.productType !== 'all') {
    filteredQuery = (filteredQuery as any).eq('market_segment', filters.productType);
  }

  // Stage filter
  if (filters.stage && filters.stage !== 'all') {
    filteredQuery = (filteredQuery as any).eq('stage_name', filters.stage);
  }

  // Lead type filter (using lead source)
  if (filters.leadType && filters.leadType !== 'all') {
    filteredQuery = (filteredQuery as any).eq('lead_source', filters.leadType);
  }

  // Customer type filter
  if (filters.customerType && filters.customerType !== 'all') {
    filteredQuery = (filteredQuery as any).eq('type', filters.customerType);
  }

  // Deal size filter
  if (filters.dealSize && filters.dealSize !== 'all') {
    const thresholds = DEAL_SIZE_THRESHOLDS[filters.dealSize as keyof typeof DEAL_SIZE_THRESHOLDS];
    if (thresholds) {
      if (thresholds.max === Infinity) {
        filteredQuery = (filteredQuery as any).gte('amount', thresholds.min);
      } else {
        filteredQuery = (filteredQuery as any).gte('amount', thresholds.min).lt('amount', thresholds.max);
      }
    }
  }

  return filteredQuery;
}

/**
 * Processes date range filters for API requests
 */
export function processDateRange(filters: FilterParams): FilterParams {
  if (!filters.dateRange) return filters;

  return {
    ...filters,
    dateRange: {
      from: filters.dateRange.from ? new Date(filters.dateRange.from).toISOString().split('T')[0] : undefined,
      to: filters.dateRange.to ? new Date(filters.dateRange.to).toISOString().split('T')[0] : undefined,
    }
  };
}

/**
 * Creates default filters for API requests
 */
export function createDefaultFilters(daysBack: number = 30): FilterParams {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysBack);
  
  return {
    dealSize: "all",
    customerTier: "all",
    geolocation: "all",
    productType: "all",
    stage: "all",
    leadType: "all",
    customerType: "all",
    dateRange: {
      from: dateFrom.toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
  };
}
