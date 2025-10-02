import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MetricData } from "@/lib/metricUtils";
import { CacheManager, cacheKeys, CACHE_CONFIG } from "@/lib/cache";
import { authenticatedApiCall } from "@/lib/apiClient";
import { 
  getMetricTargets, 
  getMetricStatus, 
  getTrendDirection,
  METRIC_STATUS,
  DEFAULT_METRIC_VALUES 
} from "@/lib/constants";

interface Filters {
  dealSize?: string;
  customerTier?: string;
  geolocation?: string;
  productType?: string;
  stage?: string;
  leadType?: string;
  customerType?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

// Reusable function to get cost metrics data
const getCostMetricsData = async (filters: Filters) => {
  try {
    // Convert Date objects to ISO strings for API compatibility
    const apiFilters = {
      ...filters,
      dateRange: filters.dateRange?.from || filters.dateRange?.to ? {
        from: filters.dateRange.from?.toISOString(),
        to: filters.dateRange.to?.toISOString()
      } : undefined
    };

    // Fetch cost metrics from the cost-metrics API
    const costMetricsResponse = await authenticatedApiCall('/api/metrics/cost-metrics', {
      method: 'GET'
    });

    if (!costMetricsResponse.success) {
      console.error("Error fetching cost metrics data:", costMetricsResponse.error);
      throw new Error("Failed to fetch cost metrics data");
    }

    const responseData = costMetricsResponse.data;
    if (!responseData || !responseData.success) {
      throw new Error("Failed to fetch cost metrics data");
    }

    const summary = responseData.summary || {};
    const metrics: MetricData[] = [];

    // Active Price Books
    if (summary.active_pricebooks !== undefined) {
      const activePriceBooksTargets = getMetricTargets("Active Price Books");
      metrics.push({
        metric_name: "Active Price Books",
        value: summary.active_pricebooks,
        target_min: activePriceBooksTargets.targetMin,
        target_max: activePriceBooksTargets.targetMax,
        status: getMetricStatus(
          summary.active_pricebooks,
          activePriceBooksTargets.targetMin,
          activePriceBooksTargets.targetMax,
          summary.active_pricebooks !== null && summary.active_pricebooks !== undefined
        ),
        change_percent: 0, // Cost metrics don't have trend data yet
        direction: "stable",
        updated_at: new Date().toISOString(),
        detailed_data: [], // Will be fetched separately when modal opens
      });
    }

    // Size of Product Catalogue
    if (summary.active_products !== undefined) {
      const productCatalogueTargets = getMetricTargets("Size of Product Catalogue");
      metrics.push({
        metric_name: "Size of Product Catalogue",
        value: summary.active_products,
        target_min: productCatalogueTargets.targetMin,
        target_max: productCatalogueTargets.targetMax,
        status: getMetricStatus(
          summary.active_products,
          productCatalogueTargets.targetMin,
          productCatalogueTargets.targetMax,
          summary.active_products !== null && summary.active_products !== undefined
        ),
        change_percent: 0,
        direction: "stable",
        updated_at: new Date().toISOString(),
        detailed_data: responseData.historical?.product_metrics || [],
      });
    }

    // Credit Memos to Invoice Ratio (fallback for missing data)
    const creditMemoTargets = getMetricTargets("Credit Memos to Invoice Ratio");
    metrics.push({
      metric_name: "Credit Memos to Invoice Ratio",
      value: summary.credit_memo_ratio || 0,
      target_min: creditMemoTargets.targetMin,
      target_max: creditMemoTargets.targetMax,
      status: getMetricStatus(
        summary.credit_memo_ratio || 0,
        creditMemoTargets.targetMin,
        creditMemoTargets.targetMax,
        summary.credit_memo_ratio !== null && summary.credit_memo_ratio !== undefined
      ),
      change_percent: 0,
      direction: "stable",
      updated_at: new Date().toISOString(),
      detailed_data: [],
    });

    // Auto-renewed opportunities (%)
    if (summary.auto_renewal_rate !== undefined) {
      const autoRenewalTargets = getMetricTargets("Auto-renewed opportunities (%)");
      metrics.push({
        metric_name: "Auto-renewed opportunities (%)",
        value: summary.auto_renewal_rate,
        target_min: autoRenewalTargets.targetMin,
        target_max: autoRenewalTargets.targetMax,
        status: getMetricStatus(
          summary.auto_renewal_rate,
          autoRenewalTargets.targetMin,
          autoRenewalTargets.targetMax,
          summary.auto_renewal_rate !== null && summary.auto_renewal_rate !== undefined
        ),
        change_percent: 0,
        direction: "stable",
        updated_at: new Date().toISOString(),
        detailed_data: responseData.historical?.auto_renewal_metrics || [],
      });
    }

    return { metrics, filterOptions: {} };
  } catch (error) {
    console.error("Error getting cost metrics:", error);
    return null;
  }
};

// Reusable function to get real metrics data using unified materialized view
const getRealMetricsData = async (filters: Filters, metricType: 'time' | 'cost' = 'time') => {
  try {
    // Convert Date objects to ISO strings for API compatibility
    const apiFilters = {
      ...filters,
      dateRange: filters.dateRange?.from || filters.dateRange?.to ? {
        from: filters.dateRange.from?.toISOString(),
        to: filters.dateRange.to?.toISOString()
      } : undefined
    };

    if (metricType === 'cost') {
      return await getCostMetricsData(filters);
    }

    // Use the new unified dashboard API that queries mv_lead_to_cash_flow
    const dashboardResponse = await authenticatedApiCall('/api/metrics/dashboard-unified', {
      method: 'POST',
      body: JSON.stringify({ filters: apiFilters })
    });

    if (!dashboardResponse.success) {
      console.error("Error fetching unified dashboard data:", dashboardResponse.error);
      return null;
    }

    const responseData = dashboardResponse.data;
    if (!responseData || !responseData.data || !responseData.data.stages) {
      throw new Error("Failed to fetch unified dashboard data");
    }

    // Extract filter options from the response
    const filterOptions = responseData.filterOptions || {};

    // Extract the processed data from the unified response
    const processedData = responseData.data;
    const detailedData = processedData.detailed_data || {};

    // Transform to MetricData format using the unified data
    const metrics: MetricData[] = [];

    // Opportunity to Quote Time
    const opportunityToQuoteStage = processedData.stages.find((s: any) => s.stage === "Opportunity to Quote");
    if (opportunityToQuoteStage) {
      const trendData = opportunityToQuoteStage.vsLastMonth || {};
      const changePercent = trendData.avgDaysChange || DEFAULT_METRIC_VALUES.AVG_DAYS_CHANGE;
      const direction = getTrendDirection(changePercent);
      
      const oppToQuoteDetailedData = detailedData["Opportunity to Quote"] || [];
      const oppToQuoteTargets = getMetricTargets("Opportunity to Quote Time");
      const changePercentAbs = Math.abs(changePercent);
      
      metrics.push({
        metric_name: "Opportunity to Quote Time",
        value: opportunityToQuoteStage.avgDays,
        target_min: oppToQuoteTargets.targetMin,
        target_max: oppToQuoteTargets.targetMax,
        status: getMetricStatus(
          opportunityToQuoteStage.avgDays, 
          oppToQuoteTargets.targetMin, 
          oppToQuoteTargets.targetMax,
          opportunityToQuoteStage.avgDays !== null && opportunityToQuoteStage.avgDays !== undefined
        ),
        change_percent: changePercentAbs,
        direction: direction,
        updated_at: new Date().toISOString(),
        detailed_data: oppToQuoteDetailedData,
        vsLastMonth: trendData,
        vsLastQuarter: opportunityToQuoteStage.vsLastQuarter || {},
      });
    }

    // Quote to Order Time
    const quoteToOrderStage = processedData.stages.find((s: any) => s.stage === "Quote to Order");
    if (quoteToOrderStage) {
      const trendData = quoteToOrderStage.vsLastMonth || {};
      const changePercent = trendData.avgDaysChange || DEFAULT_METRIC_VALUES.AVG_DAYS_CHANGE;
      const direction = getTrendDirection(changePercent);
      
      const quoteToOrderDetailedData = detailedData["Quote to Order"] || [];
      const quoteToOrderTargets = getMetricTargets("Quote to Order Time");
      
      metrics.push({
        metric_name: "Quote to Order Time",
        value: quoteToOrderStage.avgDays,
        target_min: quoteToOrderTargets.targetMin,
        target_max: quoteToOrderTargets.targetMax,
        status: getMetricStatus(
          quoteToOrderStage.avgDays, 
          quoteToOrderTargets.targetMin, 
          quoteToOrderTargets.targetMax,
          quoteToOrderStage.avgDays !== null && quoteToOrderStage.avgDays !== undefined
        ),
        change_percent: Math.abs(changePercent),
        direction: direction,
        updated_at: new Date().toISOString(),
        detailed_data: quoteToOrderDetailedData,
        vsLastMonth: trendData,
        vsLastQuarter: quoteToOrderStage.vsLastQuarter || {},
      });
    }

    // Order to Invoice (from stages array)
    const orderToInvoiceStage = processedData.stages.find((s: any) => s.stage === "Order to Invoice");
    if (orderToInvoiceStage) {
      const trendData = orderToInvoiceStage.vsLastMonth || {};
      const changePercent = trendData.avgDaysChange || DEFAULT_METRIC_VALUES.AVG_DAYS_CHANGE;
      const direction = getTrendDirection(changePercent);
      
      const orderToCashTargets = getMetricTargets("Order to Cash Time");
      const orderToInvoiceHasData = orderToInvoiceStage.avgDays !== null && orderToInvoiceStage.avgDays !== undefined;
      
      metrics.push({
        metric_name: "Order to Cash Time",
        value: orderToInvoiceStage.avgDays,
        target_min: orderToCashTargets.targetMin,
        target_max: orderToCashTargets.targetMax,
        status: getMetricStatus(
          orderToInvoiceStage.avgDays, 
          orderToCashTargets.targetMin, 
          orderToCashTargets.targetMax,
          orderToInvoiceHasData
        ),
        change_percent: Math.abs(changePercent),
        direction: direction,
        updated_at: new Date().toISOString(),
        detailed_data: detailedData["Order to Invoice"] || [],
        vsLastMonth: trendData,
        vsLastQuarter: orderToInvoiceStage.vsLastQuarter || {},
      });
    }

    // Invoice to Payment (from stages array)
    const invoiceToPaymentStage = processedData.stages.find((s: any) => s.stage === "Invoice to Payment");
    if (invoiceToPaymentStage) {
      const trendData = invoiceToPaymentStage.vsLastMonth || {};
      const changePercent = trendData.avgDaysChange || DEFAULT_METRIC_VALUES.AVG_DAYS_CHANGE;
      const direction = getTrendDirection(changePercent);
      
      const invoiceToPaymentTargets = getMetricTargets("Invoice to Payment");
      const invoiceToPaymentHasData = invoiceToPaymentStage.avgDays !== null && invoiceToPaymentStage.avgDays !== undefined;
      
      metrics.push({
        metric_name: "Invoice to Payment",
        value: invoiceToPaymentStage.avgDays,
        target_min: invoiceToPaymentTargets.targetMin,
        target_max: invoiceToPaymentTargets.targetMax,
        status: getMetricStatus(
          invoiceToPaymentStage.avgDays, 
          invoiceToPaymentTargets.targetMin, 
          invoiceToPaymentTargets.targetMax,
          invoiceToPaymentHasData
        ),
        change_percent: Math.abs(changePercent),
        direction: direction,
        updated_at: new Date().toISOString(),
        detailed_data: detailedData["Invoice to Payment"] || [],
        vsLastMonth: trendData,
        vsLastQuarter: invoiceToPaymentStage.vsLastQuarter || {},
      });
    }

    // Note: Cost metrics are not included in this unified approach
    // They would need separate API endpoints or additional processing
    return { metrics, filterOptions };
  } catch (error) {
    console.error("Error getting real metrics:", error);
    return null;
  }
};

export const useDashboardData = (filters?: Filters, metricType: 'time' | 'cost' = 'time') => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterData, setFilterData] = useState<any[]>([]);
  const [detailedDataLoading, setDetailedDataLoading] = useState(false);
  
  // Use ref to track if we're already loading to prevent duplicate requests
  const isLoadingRef = useRef(false);
  const lastFiltersRef = useRef<string>("");

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  useEffect(() => {
    async function loadData() {
      // Prevent duplicate requests
      if (isLoadingRef.current) {
        return;
      }

      const filtersKey = JSON.stringify(memoizedFilters || {});
      
      // Skip if filters haven't changed
      if (lastFiltersRef.current === filtersKey) {
        return;
      }

      isLoadingRef.current = true;
      lastFiltersRef.current = filtersKey;
      
      setLoading(true);
      setError(null);

      try {
        // Generate cache key based on filters
        const cacheKey = cacheKeys.metrics(memoizedFilters || {});
        
        // Check cache first
        const cachedData = CacheManager.get(cacheKey);
        if (cachedData) {
          setMetrics(cachedData.metrics);
          setFilterData(cachedData.allData);
          setLoading(false);
          isLoadingRef.current = false;
          return;
        }
        
        // Get real metrics data using the shared utility function
        const result = await getRealMetricsData(memoizedFilters || {}, metricType);
        
        if (result && result.metrics) {
          // Cache the results
          CacheManager.set(cacheKey, {
            metrics: result.metrics,
            allData: result.metrics.find(m => m.metric_name === "Opportunity to Quote Time")?.detailed_data || []
          }, CACHE_CONFIG.API_TTL.METRICS);

          setMetrics(result.metrics);
          if (result.filterOptions) {
            setFilterData(result.filterOptions);
          }
        } else {
          throw new Error("Failed to fetch real metrics data");
        }

      } catch (err) {
        console.error("Error loading metrics:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to load metrics: ${errorMessage}. Please check your connection and try again.`);
        setMetrics([]);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }

    loadData();
  }, [memoizedFilters]);

  const handleMetricClick = useCallback(async (metric: MetricData) => {
    // If it's the Active Price Books metric and we don't have detailed data, fetch it
    if (metric.metric_name === "Active Price Books" && (!metric.detailed_data || metric.detailed_data.length === 0)) {
      try {
        setDetailedDataLoading(true);
        
        const response = await fetch('/api/metrics/pricebook-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {},
            page: 1,
            pageSize: 100
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.detailed_data) {
            // Update the metric with the detailed data
            const updatedMetric = {
              ...metric,
              detailed_data: data.detailed_data
            };
            return updatedMetric;
          }
        }
      } catch (error) {
        console.error('Error fetching pricebook details:', error);
      } finally {
        setDetailedDataLoading(false);
      }
    }
    
    if (metric.detailed_data && metric.detailed_data.length > 0) {
      return metric;
    } else {
      console.warn('No detailed data available for metric:', metric.metric_name);
      return metric;
    }
  }, []);

  const handleSortChange = useCallback(async (sortBy: string, sortDirection: 'asc' | 'desc') => {
    setDetailedDataLoading(true);
    
    // Use requestAnimationFrame to ensure smooth UI updates
    requestAnimationFrame(() => {
      try {
        // For better performance, we'll do client-side sorting on the already loaded data
        // This avoids re-fetching 20k+ records from the database
        setMetrics(prevMetrics => {
          return prevMetrics.map(metric => {
            if (!metric.detailed_data || metric.detailed_data.length === 0) {
              return metric;
            }

            // Map API field names back to UI field names for client-side sorting
            const mapApiFieldToUIField = (apiField: string): string => {
              // Reverse mapping from API fields to UI fields
              const reverseMapping: Record<string, string> = {
                'opportunity_id': 'id',
                'opportunity_name': 'opportunity',
                'opportunity_created_date': 'startDate',
                'quote_created_date': 'startDate',
                'order_created_date': 'startDate', // For Order to Cash: Order Created Date
                'invoice_created_date': 'startDate', // For Invoice to Payment: Invoice Date
                'payment_date': 'endDate', // For Invoice to Payment: Payment Date
                'days_to_quote': 'duration',
                'days_quote_to_order': 'duration',
                'days_order_to_invoice': 'duration',
                'days_invoice_to_payment': 'duration',
                'amount': 'invoiceTotalUSD', // Map to existing field
                'opportunity_amount_usd': 'invoiceTotalUSD', // Map to existing field
                'opportunityAmountUSD': 'invoiceTotalUSD', // Map to existing field
                'order_total_amount': 'invoiceTotalUSD', // Map to existing field
                'order_total_amount_usd': 'invoiceTotalUSD', // Map to existing field
                'orderTotalUSD': 'invoiceTotalUSD', // Map to existing field
                'dealSize': 'invoiceTotalUSD', // Map to existing field
                'invoice_total_amount_usd': 'invoiceTotalUSD',
                'invoice_total_usd': 'invoiceTotalUSD',
                'customer_country': 'region',
                'customer_tier': 'customerTier',
                'market_segment': 'marketSegment',
                'lead_source': 'leadSource',
                'order_status': 'status',
                'invoice_status': 'status',
                'order_number': 'opportunity',
                'invoice_number': 'opportunity',
                'invoice_date': 'invoice_date',
                'order_billing_frequency': 'type',
                // Mappings for fields that exist in the actual data
                'durationValue': 'duration',
                'invoice_entity_name': 'region'
              };
              return reverseMapping[apiField] || apiField;
            };

            const uiField = mapApiFieldToUIField(sortBy);
            
            
            // Create a copy of the detailed data to avoid mutating the original
            const sortedData = [...metric.detailed_data].sort((a, b) => {
              let aValue = a[uiField];
              let bValue = b[uiField];

              // Handle null/undefined values
              if (aValue === null || aValue === undefined) aValue = '';
              if (bValue === null || bValue === undefined) bValue = '';

              // Handle different data types
              if (typeof aValue === 'string' && typeof bValue === 'string') {
                // For dates, convert to Date objects for proper comparison
                if (aValue.includes('T') || aValue.includes('-')) {
                  const aDate = new Date(aValue);
                  const bDate = new Date(bValue);
                  if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
                    aValue = aDate;
                    bValue = bDate;
                  }
                }
              }

              // Compare values
              let comparison = 0;
              if (aValue < bValue) comparison = -1;
              else if (aValue > bValue) comparison = 1;

              // Apply sort direction
              return sortDirection === 'asc' ? comparison : -comparison;
            });

            return {
              ...metric,
              detailed_data: sortedData
            };
          });
        });
      } catch (error) {
        console.error("Error sorting data:", error);
        // Don't show error to user for sorting failures, just log it
      } finally {
        setDetailedDataLoading(false);
      }
    });
  }, []);

  return {
    metrics,
    loading,
    error,
    filterData,
    handleMetricClick,
    handleSortChange,
    detailedDataLoading
  };
};
