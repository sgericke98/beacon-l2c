import { useState, useEffect, useCallback } from "react";
import { CacheManager, cacheKeys, CACHE_CONFIG } from "@/lib/cache";

// Define filter types locally
export interface OpportunityFilterOptions {
  [key: string]: any;
}

export interface QuoteFilterOptions {
  [key: string]: any;
}

export interface OrderFilterOptions {
  [key: string]: any;
}

// Define default filter functions
export function getDefaultOpportunityFilters(): OpportunityFilterOptions {
  return {};
}

export function getDefaultQuoteFilters(): QuoteFilterOptions {
  return {};
}

export function getDefaultOrderFilters(): OrderFilterOptions {
  return {};
}

export function filterSalesforceOpportunities(data: any[], filters: OpportunityFilterOptions): any[] {
  return data;
}

interface NetsuiteInvoice {
  id: string;
  netsuite_id: string;
  tran_id: string;
  tran_date: string;
  entity_name: string;
  total: number;
  status: string;
  created_date: string;
  custbody_cw_sfdcopportunity: string;
  currency_iso_code?: string | null;
}

interface NetsuitePayment {
  id: string;
  netsuite_id: string;
  tran_id: string;
  tran_date: string;
  entity_name: string;
  total: number;
  status: string;
  created_date: string;
  payment_method?: string | null;
  reference_number?: string | null;
  currency_iso_code?: string | null;
}

interface SalesforceOpportunity {
  id: string;
  name: string;
  created_date: string;
  close_date?: string | null;
  amount?: number | null;
  currency_iso_code?: string | null;
  stage_name: string;
  type?: string | null;
  lead_source?: string | null;
  customer_tier?: string | null;
  market_segment?: string | null;
  channel?: string | null;
  customer_country?: string | null;
  sbqq_primary_quote_id?: string | null;
  convertedAmount?: number | null;
  exchangeRate?: number | null;
  conversionTimestamp?: string | null;
  attributes?: {
    type: string;
    url: string;
  };
}

interface SalesforceQuote {
  id: string;
  salesforce_id: string;
  name: string | null;
  created_at: string | null;
  start_date: string | null;
  status: string | null;
  net_amount: number | null;
  convertedNetAmount?: number | null;
  quote_type: string | null;
  billing_country: string | null;
  payment_terms: string | null;
  billing_frequency: string | null;
  currency_iso_code: string | null;
  opportunity_id: string | null;
  expiration_date: string | null;
  grand_total: number | null;
  subtotal: number | null;
  customer_tier?: string | null;
  customer_country?: string | null;
}

interface SalesforceOrder {
  id: string;
  salesforce_id: string;
  name: string | null;
  opportunity_id: string | null;
  quote_id: string | null;
  status: string | null;
  effective_date: string | null;
  end_date: string | null;
  total_amount: number | null;
  grand_total_amount: number | null;
  created_at: string | null;
  currency_iso_code?: string | null;
  order_number?: string | null;
  order_type?: string | null;
  billing_frequency?: string | null;
  shipping_country_code?: string | null;
  created_date?: string | null;
  convertedTotalAmount?: number | null;
  exchangeRate?: number | null;
  conversionTimestamp?: string | null;
}

interface Sorting {
  field: string;
  direction: "asc" | "desc";
}

interface Pagination {
  page: number;
  pageSize: number;
}

interface RawDataState {
  opportunities: SalesforceOpportunity[];
  quotes: SalesforceQuote[];
  orders: SalesforceOrder[];
  invoices: NetsuiteInvoice[];
  payments: NetsuitePayment[];
  loading: boolean;
  error: string | null;
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  sorting: Sorting;
  searchQuery: string;
  filters: OpportunityFilterOptions | QuoteFilterOptions | OrderFilterOptions;
  cascadingFilterOptions: any;
}

export const useRawData = (dataType: "opportunities" | "quotes" | "orders" | "invoices" | "payments") => {
  
  const [state, setState] = useState<RawDataState>({
    opportunities: [],
    quotes: [],
    orders: [],
    invoices: [],
    payments: [],
    loading: true,
    error: null,
    totalRecords: 0,
    currentPage: 1,
    pageSize: 50,
    sorting: { field: dataType === "opportunities" ? "created_date" : dataType === "quotes" ? "start_date" : dataType === "payments" ? "tran_date" : "created_at", direction: "desc" },
    searchQuery: "",
    filters: dataType === "opportunities" ? getDefaultOpportunityFilters() : 
            dataType === "quotes" ? getDefaultQuoteFilters() :
            dataType === "orders" ? getDefaultOrderFilters() :
            getDefaultOpportunityFilters(), // fallback
    cascadingFilterOptions: {},
  });

  // Target currency is now fixed to USD since conversion happens at database level
  const targetCurrency = "USD";

  // Load data with caching
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
             // Generate cache key based on data type, filters, sorting, and pagination
       const cacheKey = cacheKeys.rawData(dataType, {
         ...state.filters,
         sorting: state.sorting,
         currentPage: state.currentPage,
         pageSize: state.pageSize,
         searchQuery: state.searchQuery
       });
      
       // Check cache first
       const cachedData = CacheManager.get(cacheKey);
       if (cachedData) {
         setState(prev => ({
           ...prev,
           [dataType]: cachedData.data,
           totalRecords: cachedData.totalRecords,
           loading: false,
         }));
         return;
       }

      // Fetch fresh data if not cached
      const getApiPath = (type: string) => {
        switch (type) {
          case "opportunities":
            return "/api/salesforce/opportunities";
          case "quotes":
            return "/api/salesforce/quotes";
          case "orders":
            return "/api/salesforce/orders";
          case "invoices":
            return "/api/netsuite/invoices";
          case "payments":
            return "/api/netsuite/payments";
          default:
            throw new Error(`Unknown data type: ${type}`);
        }
      };

      const apiPath = getApiPath(dataType);

      // Helper to format dates as YYYY-MM-DD
      const toDateString = (value?: any): string | undefined => {
        if (!value) return undefined;
        const d = typeof value === "string" ? new Date(value) : value as Date;
        if (Number.isNaN(d.getTime())) return undefined;
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
          .toISOString()
          .split("T")[0];
      };

                    // Build request payload per data type to match API expectations
       const buildRequestPayload = () => {
         const sortBy = state.sorting.field;
         const sortDirection = state.sorting.direction;
         const page = state.currentPage;
         const pageSize = state.pageSize;
         
        const fromStr = toDateString((state.filters as any)?.dateRange?.from);
        const toStr = toDateString((state.filters as any)?.dateRange?.to);

        if (dataType === "opportunities") {
          // This endpoint expects dateRange and optional region array
          const region = (state.filters as any)?.region && (state.filters as any).region !== "all" ? [(state.filters as any).region] : undefined;
          return {
            page,
            pageSize,
            sortBy: sortBy || "created_date",
            sortDirection,
            // date filters removed for raw data tab
            region,
            // Send additional arrays for potential server-side filtering
            customerTier: (state.filters as any)?.customerTier && (state.filters as any).customerTier !== "all" ? [(state.filters as any).customerTier] : undefined,
            productType: (state.filters as any)?.productType && (state.filters as any).productType !== "all" ? [(state.filters as any).productType] : undefined,
            leadType: (state.filters as any)?.leadType && (state.filters as any).leadType !== "all" ? [(state.filters as any).leadType] : undefined,
            customerType: (state.filters as any)?.customerType && (state.filters as any).customerType !== "all" ? [(state.filters as any).customerType] : undefined,
            stage: (state.filters as any)?.stage && (state.filters as any).stage !== "all" ? [(state.filters as any).stage] : undefined,
            // deal size removed for raw data tab
            searchText: state.searchQuery || undefined,
          };
        }

        if (dataType === "quotes") {
          return {
            page,
            pageSize,
            sortBy: sortBy || "start_date",
            sortDirection,
            // date removed for raw data tab
            status: (state.filters as any)?.status && (state.filters as any).status !== "all" ? (state.filters as any).status : undefined,
            leadType: (state.filters as any)?.leadType && (state.filters as any).leadType !== "all" ? (state.filters as any).leadType : undefined,
            country: (state.filters as any)?.country && (state.filters as any).country !== "all" ? (state.filters as any).country : undefined,
            paymentTerms: (state.filters as any)?.paymentTerms && (state.filters as any).paymentTerms !== "all" ? (state.filters as any).paymentTerms : undefined,
            billingFrequency: (state.filters as any)?.billingFrequency && (state.filters as any).billingFrequency !== "all" ? (state.filters as any).billingFrequency : undefined,
            // deal size removed for raw data tab
            searchText: state.searchQuery || undefined,
          };
        }

        if (dataType === "orders") {
          return {
            page,
            pageSize,
            sortBy: sortBy || "created_at",
            sortDirection,
            // date removed for raw data tab
            status: (state.filters as any)?.status && (state.filters as any).status !== "all" ? (state.filters as any).status : undefined,
            orderType: (state.filters as any)?.orderType && (state.filters as any).orderType !== "all" ? (state.filters as any).orderType : undefined,
            billingFrequency: (state.filters as any)?.billingFrequency && (state.filters as any).billingFrequency !== "all" ? (state.filters as any).billingFrequency : undefined,
            region: (state.filters as any)?.region && (state.filters as any).region !== "all" ? (state.filters as any).region : undefined,
            // deal size removed for raw data tab
            searchText: state.searchQuery || undefined,
          };
        }

        if (dataType === "invoices") {
          return {
            page,
            pageSize,
            sortBy: sortBy || "tran_date",
            sortDirection,
            searchText: state.searchQuery || undefined,
            // date removed for raw data tab
            status: (state.filters as any)?.status && (state.filters as any).status !== "all" ? [(state.filters as any).status] : undefined,
          };
        }

        if (dataType === "payments") {
          return {
            page,
            pageSize,
            sortBy: sortBy || "tran_date",
            sortDirection,
            searchText: state.searchQuery || undefined,
            // date removed for raw data tab
            status: (state.filters as any)?.status && (state.filters as any).status !== "all" ? [(state.filters as any).status] : undefined,
          };
        }

        // fallback
        return {
          page,
          pageSize,
          searchText: state.searchQuery || undefined,
        };
      };

             const response = await fetch(apiPath, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(buildRequestPayload()),
       });

       if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }

       const data = await response.json();

      // Data is already converted at database level using optimized views
      let processedData = data.data || [];

      // Cache the results
      CacheManager.set(cacheKey, {
        data: processedData,
        totalRecords: data.totalRecords || 0
      }, CACHE_CONFIG.API_TTL.RAW_DATA);

             setState(prev => ({
           ...prev,
           [dataType]: processedData,
           totalRecords: data.totalRecords || 0,
           loading: false,
         }));

    } catch (error) {
      console.error(`Error loading ${dataType}:`, error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: `Failed to load ${dataType}. Please try again.`,
      }));
    }
  }, [dataType, state.filters, state.searchQuery, state.sorting, state.currentPage, state.pageSize]);

  // Load cascading filter options with caching
  const loadCascadingFilterOptions = useCallback(async () => {
    try {
      const cacheKey = cacheKeys.filterOptions(dataType);
      
      // Check cache first
      const cachedOptions = CacheManager.get(cacheKey);
      if (cachedOptions) {
        setState(prev => ({ ...prev, cascadingFilterOptions: cachedOptions }));
        return;
      }

      // Fetch fresh options if not cached
      const getFilterOptionsPath = (type: string) => {
        switch (type) {
          case "opportunities":
            return "/api/salesforce/opportunities/filter-options";
          case "quotes":
            return "/api/salesforce/quotes/filter-options";
          case "orders":
            return "/api/salesforce/orders/filter-options";
          case "invoices":
            return "/api/netsuite/invoices/filter-options";
          case "payments":
            return "/api/netsuite/payments/filter-options";
          default:
            throw new Error(`Unknown data type for filter options: ${type}`);
        }
      };

      const response = await fetch(getFilterOptionsPath(dataType), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: state.filters }),
      });

      if (response.ok) {
        const options = await response.json();
        
        // Cache the options
        CacheManager.set(cacheKey, options, CACHE_CONFIG.API_TTL.FILTER_OPTIONS);
        
        setState(prev => ({ ...prev, cascadingFilterOptions: options }));
      }
    } catch (error) {
      console.error(`Error loading filter options for ${dataType}:`, error);
    }
  }, [dataType, state.filters]);

  // Update filters and reload data
  const updateFilters = useCallback((newFilters: any) => {
    setState(prev => ({ ...prev, filters: newFilters, currentPage: 1 }));
  }, []);

  // Update search query and reload data
  const updateSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query, currentPage: 1 }));
  }, []);

  // Update sorting and reload data
  const updateSorting = useCallback((field: string, direction: "asc" | "desc") => {
    setState(prev => ({ ...prev, sorting: { field, direction }, currentPage: 1 }));
  }, []);

  // Update pagination and reload data
  const updatePagination = useCallback((page: number, pageSize?: number) => {
    setState(prev => ({ 
      ...prev, 
      currentPage: page, 
      pageSize: pageSize || prev.pageSize 
    }));
  }, []);

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load filter options when filters change
  useEffect(() => {
    loadCascadingFilterOptions();
  }, [loadCascadingFilterOptions]);

  const result = {
    ...state,
    updateFilters,
    updateSearchQuery,
    updateSorting,
    updatePagination,
    reloadData: loadData,
  };

  return result;
};
