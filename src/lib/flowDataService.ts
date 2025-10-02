import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';
import { getPeriodComparison, getExtendedDateRange, calculatePercentageChange } from './dateUtils';

export interface FlowFilters {
  dealSize?: string;
  customerTier?: string;
  geolocation?: string;
  productType?: string;
  stage?: string;
  leadType?: string;
  customerType?: string;
  opportunityToQuoteTime?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
  daysBack?: number;
}

export interface FlowDataResult {
  opportunityToQuoteData: any[];
  quoteToOrderData: any[];
  stages: any[];
  detailedData: any;
}

export interface PeriodComparisonResult {
  current: FlowDataResult;
  lastMonth: FlowDataResult;
  lastQuarter: FlowDataResult;
  periods: {
    current: { from: string; to: string };
    lastMonth: { from: string; to: string };
    lastQuarter: { from: string; to: string };
  };
}

/**
 * Shared service for flow data operations with database-level filtering
 */
export class FlowDataService {
  
  /**
   * Apply database-level filters to a Supabase query
   */
  private static applyFilters(query: any, filters: FlowFilters): any {
    // Date range filters - use opportunity_created_date for views
    
    if (filters.dateRange?.from) {
      query = query.gte('opportunity_created_date', filters.dateRange.from);
    }
    if (filters.dateRange?.to) {
      query = query.lte('opportunity_created_date', filters.dateRange.to);
    }

    // Customer tier filter
    if (filters.customerTier && filters.customerTier !== 'all') {
      query = query.eq('customer_tier', filters.customerTier);
    }

    // Geolocation filter (customer country)
    if (filters.geolocation && filters.geolocation !== 'all') {
      query = query.eq('customer_country', filters.geolocation);
    }

    // Product type filter (using market segment as proxy)
    if (filters.productType && filters.productType !== 'all') {
      query = query.eq('market_segment', filters.productType);
    }

    // Stage filter
    if (filters.stage && filters.stage !== 'all') {
      query = query.eq('stage_name', filters.stage);
    }

    // Lead type filter (using lead source)
    if (filters.leadType && filters.leadType !== 'all') {
      query = query.eq('lead_source', filters.leadType);
    }

    // Customer type filter
    if (filters.customerType && filters.customerType !== 'all') {
      query = query.eq('opportunity_type', filters.customerType);
    }

    return query;
  }

  /**
   * Apply deal size filter using USD amounts
   */
  private static applyDealSizeFilter(query: any, filters: FlowFilters, amountField: string): any {
    if (filters.dealSize && filters.dealSize !== 'all') {
      switch (filters.dealSize) {
        case 'small':
          query = query.lt(amountField, 10000);
          break;
        case 'medium':
          query = query.gte(amountField, 10000).lt(amountField, 100000);
          break;
        case 'large':
          query = query.gte(amountField, 100000).lt(amountField, 1000000);
          break;
        case 'enterprise':
          query = query.gte(amountField, 1000000);
          break;
      }
    }
    return query;
  }

  /**
   * Fetch opportunity to quote data with database-level filtering and retry logic
   * Uses materialized view for better performance with pagination to get all records
   */
  static async fetchOpportunityToQuoteData(filters: FlowFilters, retries = 3): Promise<any[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        let allData: any[] = [];
        let page = 0;
        const pageSize = 10000;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from('mv_opportunity_quote_pairs_optimized' as any)
            .select('*')
            .not('opportunity_created_date', 'is', null)
            .not('quote_created_date', 'is', null) // Only opportunities with quotes
            .not('amount_usd_final', 'is', null) // Exclude records with null amount_usd_final
            .order('opportunity_created_date', { ascending: false }) // Get most recent records first
            .range(page * pageSize, (page + 1) * pageSize - 1);

          // Apply filters
          query = this.applyFilters(query, filters);
          query = this.applyDealSizeFilter(query, filters, 'amount_usd_final');

          const { data, error } = await query;

          if (error) {
            // Check for statement timeout error (PostgreSQL error code 57014)
            if (error.code === '57014' && attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
            throw new Error(`Database error: ${error.message}`);
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            // Check if we got fewer records than expected (end of data)
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }

          // Safety check to prevent infinite loops
          if (page > 1000) {
            break;
          }
        }

        return allData;
      } catch (error: any) {
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return [];
  }

  /**
   * Fetch quote to order data with database-level filtering and retry logic
   * Uses materialized view for better performance
   */
  static async fetchQuoteToOrderData(filters: FlowFilters, retries = 3): Promise<any[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        let allData: any[] = [];
        let page = 0;
        const pageSize = 10000;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from('mv_quote_order_pairs_optimized' as any)
            .select('*')
            .not('opportunity_created_date', 'is', null)
            .not('quote_created_date', 'is', null)
            .not('order_created_date', 'is', null) // Only quotes with orders
            .not('opportunity_amount_usd_final', 'is', null) // Exclude records with null amount_usd_final
            .order('opportunity_created_date', { ascending: false }) // Get most recent records first
            .range(page * pageSize, (page + 1) * pageSize - 1);

          // Apply filters
          query = this.applyFilters(query, filters);
          query = this.applyDealSizeFilter(query, filters, 'opportunity_amount_usd_final');

          const { data, error } = await query;

          if (error) {
            // Check for statement timeout error (PostgreSQL error code 57014)
            if (error.code === '57014' && attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
            throw new Error(`Database error: ${error.message}`);
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            // Check if we got fewer records than expected (end of data)
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }

          // Safety check to prevent infinite loops
          if (page > 1000) {
            break;
          }
        }

        return allData;
      } catch (error: any) {
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return [];
  }

  /**
   * Filter data by date range on the server side
   */
  private static filterDataByDateRange(data: any[], fromDate: string, toDate: string): any[] {
    // Parse dates and ensure we're comparing dates only (ignore time)
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    // Set to end of day for the 'to' date to be inclusive
    to.setHours(23, 59, 59, 999);
    
    const filtered = data.filter(record => {
      const recordDate = new Date(record.opportunity_created_date);
      const isInRange = recordDate >= from && recordDate <= to;
      return isInRange;
    });
    
    return filtered;
  }

  /**
   * Process flow data to calculate stage metrics
   */
  static processFlowData(
    opportunityToQuoteData: any[],
    quoteToOrderData: any[]
  ): { stages: any[]; detailedData: any } {
    const stages = [];
    const detailedData: any = {};

    // 1. Opportunity to Quote
    if (opportunityToQuoteData && opportunityToQuoteData.length > 0) {
      const validDays = opportunityToQuoteData
        .map((r: any) => r.days_to_quote)
        .filter((days: any) => days !== null) as number[];

      if (validDays.length > 0) {
        const sorted = validDays.sort((a, b) => a - b);
        const avg = validDays.reduce((a, b) => a + b, 0) / validDays.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const performance = Math.max(0, Math.round((3 / Math.max(median, 3)) * 100));

        stages.push({
          stage: "Opportunity to Quote",
          avgDays: +avg.toFixed(1), // Display value (rounded)
          rawAvgDays: avg, // Raw value for calculations
          medianDays: +median.toFixed(1),
          performance,
          recordCount: validDays.length,
        });

        // Store detailed data for modal with USD conversions
        // No need to filter for null amount_usd_final since it's now filtered at database level
        const oppToQuoteRecords = opportunityToQuoteData.filter((r: any) => 
          r.days_to_quote !== null
        );
        const oppToQuoteWithUSD = oppToQuoteRecords.map((r: any) => {
          const oppAmountUSD = r.amount_usd_final || r.amount || 0;
          
          return {
            id: r.opportunity_id,
            opportunity: r.opportunity_name,
            startDate: r.opportunity_created_date,
            endDate: r.quote_created_date,
            duration: `${r.days_to_quote?.toFixed(1)} days`,
            status: "Completed",
            opportunityAmountUSD: oppAmountUSD,
            region: r.customer_country || "N/A",
            type: r.opportunity_type,
          };
        });
        detailedData["opportunity-to-quote"] = oppToQuoteWithUSD;
      }
    }

    // 2. Quote to Order
    if (quoteToOrderData && quoteToOrderData.length > 0) {
      const validDays = quoteToOrderData
        .map((r: any) => r.days_quote_to_order)
        .filter((days: any) => days !== null) as number[];

      if (validDays.length > 0) {
        const sorted = validDays.sort((a, b) => a - b);
        const avg = validDays.reduce((a, b) => a + b, 0) / validDays.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const performance = Math.max(0, Math.round((5 / Math.max(median, 5)) * 100));

        stages.push({
          stage: "Quote to Order",
          avgDays: +avg.toFixed(1),
          medianDays: +median.toFixed(1),
          performance,
          recordCount: validDays.length,
        });

        // Store detailed data for modal with USD conversions
        // No need to filter for null opportunity_amount_usd_final since it's now filtered at database level
        const qToOrderRecords = quoteToOrderData.filter((r: any) => 
          r.days_quote_to_order !== null
        );
        const qToOrderWithUSD = qToOrderRecords.map((r: any) => {
          const oppAmountUSD = r.opportunity_amount_usd_final || r.opportunity_amount || 0;
          const orderTotalUSD = r.order_total_amount_usd_final || r.order_total_amount || 0;
          
          return {
            id: r.quote_id,
            opportunity: r.opportunity_name,
            startDate: r.quote_created_date,
            endDate: r.order_created_date,
            duration: `${r.days_quote_to_order?.toFixed(1)} days`,
            status: r.order_status || "Completed",
            opportunityAmountUSD: oppAmountUSD,
            orderTotalAmountUSD: orderTotalUSD,
            region: r.customer_country || "N/A",
            type: r.opportunity_type,
          };
        });
        detailedData["quote-to-order"] = qToOrderWithUSD;
      }
    }

    return { stages, detailedData };
  }

  /**
   * Get flow data for a specific period with database-level filtering
   * Optimized to reduce concurrent database queries
   */
  static async getFlowDataForPeriod(filters: FlowFilters): Promise<FlowDataResult> {
    // Check if materialized views need refresh (only check occasionally to avoid overhead)
    const shouldRefresh = Math.random() < 0.05; // 5% chance to check (reduced from 10%)
    if (shouldRefresh && await this.shouldRefreshViews()) {
      try {
        await this.refreshMaterializedViews();
      } catch (error) {
        // Auto-refresh failed, continuing with existing data
      }
    }

    // Fetch data sequentially to avoid overwhelming the database with concurrent queries
    // This reduces the chance of statement timeouts
    const opportunityToQuoteData = await this.fetchOpportunityToQuoteData(filters);
    const quoteToOrderData = await this.fetchQuoteToOrderData(filters);

    const { stages, detailedData } = this.processFlowData(opportunityToQuoteData, quoteToOrderData);

    return {
      opportunityToQuoteData,
      quoteToOrderData,
      stages,
      detailedData
    };
  }

  /**
   * Get independent invoice-to-payment data (no filters applied)
   * Current: YTD 2025, vs Last Month: Dec 2024, vs Previous Quarter: Q4 2024
   */
  static async getIndependentInvoiceToPaymentData(): Promise<{
    current: { avgDays: number; count: number; rawAvgDays: number };
    vsLastMonth: { avgDays: number; count: number; rawAvgDays: number };
    vsPreviousQuarter: { avgDays: number; count: number; rawAvgDays: number };
  }> {
    try {
      // Current: Year to Date 2025 (Jan 1, 2025 to today)
      const currentFrom = '2025-01-01';
      const currentTo = new Date().toISOString().split('T')[0];
      
      // Last Month: December 2024
      const lastMonthFrom = '2024-12-01';
      const lastMonthTo = '2024-12-31';
      
      // Previous Quarter: Q4 2024 (Oct 1 - Dec 31, 2024)
      const previousQuarterFrom = '2024-10-01';
      const previousQuarterTo = '2024-12-31';

      // Fetch current period data
      const { data: currentData, error: currentError } = await supabase
        .from('mv_invoice_payment_pairs_optimized' as any)
        .select('days_invoice_to_payment')
        .gte('invoice_created_date', currentFrom)
        .lte('invoice_created_date', currentTo)
        .not('days_invoice_to_payment', 'is', null);

      if (currentError) throw currentError;

      // Fetch last month data
      const { data: lastMonthData, error: lastMonthError } = await supabase
        .from('mv_invoice_payment_pairs_optimized' as any)
        .select('days_invoice_to_payment')
        .gte('invoice_created_date', lastMonthFrom)
        .lte('invoice_created_date', lastMonthTo)
        .not('days_invoice_to_payment', 'is', null);

      if (lastMonthError) throw lastMonthError;

      // Fetch previous quarter data
      const { data: previousQuarterData, error: previousQuarterError } = await supabase
        .from('mv_invoice_payment_pairs_optimized' as any)
        .select('days_invoice_to_payment')
        .gte('invoice_created_date', previousQuarterFrom)
        .lte('invoice_created_date', previousQuarterTo)
        .not('days_invoice_to_payment', 'is', null);

      if (previousQuarterError) throw previousQuarterError;

      // Calculate averages
      const currentAvg = currentData && currentData.length > 0 
        ? currentData.reduce((sum, item) => sum + item.days_invoice_to_payment, 0) / currentData.length 
        : 0;
      
      const lastMonthAvg = lastMonthData && lastMonthData.length > 0 
        ? lastMonthData.reduce((sum, item) => sum + item.days_invoice_to_payment, 0) / lastMonthData.length 
        : 0;
      
      const previousQuarterAvg = previousQuarterData && previousQuarterData.length > 0 
        ? previousQuarterData.reduce((sum, item) => sum + item.days_invoice_to_payment, 0) / previousQuarterData.length 
        : 0;

      return {
        current: { 
          avgDays: Math.round(currentAvg * 10) / 10, 
          count: currentData?.length || 0,
          rawAvgDays: currentAvg
        },
        vsLastMonth: { 
          avgDays: Math.round(lastMonthAvg * 10) / 10, 
          count: lastMonthData?.length || 0,
          rawAvgDays: lastMonthAvg
        },
        vsPreviousQuarter: { 
          avgDays: Math.round(previousQuarterAvg * 10) / 10, 
          count: previousQuarterData?.length || 0,
          rawAvgDays: previousQuarterAvg
        }
      };
    } catch (error) {
      console.error('Error fetching independent invoice-to-payment data:', error);
      return {
        current: { avgDays: 0, count: 0, rawAvgDays: 0 },
        vsLastMonth: { avgDays: 0, count: 0, rawAvgDays: 0 },
        vsPreviousQuarter: { avgDays: 0, count: 0, rawAvgDays: 0 }
      };
    }
  }

  /**
   * Get period comparison data (current vs last month vs last quarter)
   * Optimized to use single fetch with server-side filtering
   */
  static async getPeriodComparison(filters: FlowFilters): Promise<PeriodComparisonResult> {
    const startTime = Date.now();
    
    // Calculate period length from the selected date range
    let periodLengthDays = 30; // Default fallback
    let currentPeriod = null;
    
    if (filters.dateRange?.from && filters.dateRange?.to) {
      currentPeriod = {
        from: filters.dateRange.from,
        to: filters.dateRange.to
      };
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      periodLengthDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else if (filters.daysBack) {
      periodLengthDays = filters.daysBack;
    }
    
    // Get date ranges for current vs last month vs last quarter comparison
    // Always pass null for currentPeriod to ensure calculation from today
    const periods = getPeriodComparison(null, periodLengthDays);
    
    // Calculate extended date range to cover all periods in one fetch
    // Always pass null for currentPeriod to ensure calculation from today
    const extendedRange = getExtendedDateRange(null, periodLengthDays);
    
    
    // Fetch all data in one query using the extended range
    const flowDataStart = Date.now();
    const allData = await this.getFlowDataForPeriod({
      ...filters,
      dateRange: extendedRange
    });
    
    // Filter the data for each period on the server side
    const currentOpportunityToQuote = this.filterDataByDateRange(
      allData.opportunityToQuoteData, 
      periods.current.from, 
      periods.current.to
    );
    const currentQuoteToOrder = this.filterDataByDateRange(
      allData.quoteToOrderData, 
      periods.current.from, 
      periods.current.to
    );
    const { stages: currentStages, detailedData: currentDetailedData } = this.processFlowData(
      currentOpportunityToQuote, 
      currentQuoteToOrder
    );
    
    const lastMonthOpportunityToQuote = this.filterDataByDateRange(
      allData.opportunityToQuoteData, 
      periods.lastMonth.from, 
      periods.lastMonth.to
    );
    const lastMonthQuoteToOrder = this.filterDataByDateRange(
      allData.quoteToOrderData, 
      periods.lastMonth.from, 
      periods.lastMonth.to
    );
    const { stages: lastMonthStages, detailedData: lastMonthDetailedData } = this.processFlowData(
      lastMonthOpportunityToQuote, 
      lastMonthQuoteToOrder
    );
    
    const lastQuarterOpportunityToQuote = this.filterDataByDateRange(
      allData.opportunityToQuoteData, 
      periods.lastQuarter.from, 
      periods.lastQuarter.to
    );
    const lastQuarterQuoteToOrder = this.filterDataByDateRange(
      allData.quoteToOrderData, 
      periods.lastQuarter.from, 
      periods.lastQuarter.to
    );
    const { stages: lastQuarterStages, detailedData: lastQuarterDetailedData } = this.processFlowData(
      lastQuarterOpportunityToQuote, 
      lastQuarterQuoteToOrder
    );

    // Calculate trend comparisons for the current period stages
    const currentData = {
      opportunityToQuoteData: currentOpportunityToQuote,
      quoteToOrderData: currentQuoteToOrder,
      stages: currentStages,
      detailedData: currentDetailedData
    };
    
    const lastMonthData = {
      opportunityToQuoteData: lastMonthOpportunityToQuote,
      quoteToOrderData: lastMonthQuoteToOrder,
      stages: lastMonthStages,
      detailedData: lastMonthDetailedData
    };
    
    const lastQuarterData = {
      opportunityToQuoteData: lastQuarterOpportunityToQuote,
      quoteToOrderData: lastQuarterQuoteToOrder,
      stages: lastQuarterStages,
      detailedData: lastQuarterDetailedData
    };

    // Calculate trend comparisons and add them to current stages
    const stagesWithTrends = this.calculateTrendComparisons(currentData, lastMonthData, lastQuarterData);

    return {
      current: {
        ...currentData,
        stages: stagesWithTrends
      },
      lastMonth: lastMonthData,
      lastQuarter: lastQuarterData,
      periods
    };
  }

  /**
   * Calculate trend comparisons between periods
   */
  static calculateTrendComparisons(currentData: FlowDataResult, lastMonthData: FlowDataResult, lastQuarterData: FlowDataResult) {
    return currentData.stages.map((currentStage: any) => {
      const lastMonthStage = lastMonthData.stages.find((p: any) => p.stage === currentStage.stage);
      const lastQuarterStage = lastQuarterData.stages.find((p: any) => p.stage === currentStage.stage);
      
      // Get raw values for calculations
      const currentRaw = currentStage.rawAvgDays || currentStage.avgDays;
      const lastMonthRaw = lastMonthStage?.rawAvgDays || lastMonthStage?.avgDays;
      
      const vsLastMonth = lastMonthStage ? {
        avgDaysChange: calculatePercentageChange(currentRaw, lastMonthRaw).changePercent,
        performanceChange: calculatePercentageChange(currentStage.performance, lastMonthStage.performance).changePercent,
        recordCountChange: calculatePercentageChange(currentStage.recordCount, lastMonthStage.recordCount).changePercent,
        hasData: true,
        previousAvgDays: lastMonthStage.avgDays,
        previousPerformance: lastMonthStage.performance,
        previousRecordCount: lastMonthStage.recordCount,
        avgDaysMetadata: calculatePercentageChange(currentRaw, lastMonthRaw),
        performanceMetadata: calculatePercentageChange(currentStage.performance, lastMonthStage.performance),
        recordCountMetadata: calculatePercentageChange(currentStage.recordCount, lastMonthStage.recordCount)
      } : {
        avgDaysChange: 0,
        performanceChange: 0,
        recordCountChange: 0,
        hasData: false,
        avgDaysMetadata: { changePercent: 0, hasCurrentData: false, hasPreviousData: false, isNoData: true, isZeroToZero: false },
        performanceMetadata: { changePercent: 0, hasCurrentData: false, hasPreviousData: false, isNoData: true, isZeroToZero: false },
        recordCountMetadata: { changePercent: 0, hasCurrentData: false, hasPreviousData: false, isNoData: true, isZeroToZero: false }
      };
      
      // Calculate vs last quarter trends
      const vsLastQuarter = lastQuarterStage ? {
        avgDaysChange: calculatePercentageChange(currentStage.rawAvgDays || currentStage.avgDays, lastQuarterStage.rawAvgDays || lastQuarterStage.avgDays).changePercent,
        performanceChange: calculatePercentageChange(currentStage.performance, lastQuarterStage.performance).changePercent,
        recordCountChange: calculatePercentageChange(currentStage.recordCount, lastQuarterStage.recordCount).changePercent,
        hasData: true,
        previousAvgDays: lastQuarterStage.avgDays,
        previousPerformance: lastQuarterStage.performance,
        previousRecordCount: lastQuarterStage.recordCount,
        avgDaysMetadata: calculatePercentageChange(currentStage.rawAvgDays || currentStage.avgDays, lastQuarterStage.rawAvgDays || lastQuarterStage.avgDays),
        performanceMetadata: calculatePercentageChange(currentStage.performance, lastQuarterStage.performance),
        recordCountMetadata: calculatePercentageChange(currentStage.recordCount, lastQuarterStage.recordCount)
      } : {
        avgDaysChange: 0,
        performanceChange: 0,
        recordCountChange: 0,
        hasData: false,
        avgDaysMetadata: { changePercent: 0, hasCurrentData: false, hasPreviousData: false, isNoData: true, isZeroToZero: false },
        performanceMetadata: { changePercent: 0, hasCurrentData: false, hasPreviousData: false, isNoData: true, isZeroToZero: false },
        recordCountMetadata: { changePercent: 0, hasCurrentData: false, hasPreviousData: false, isNoData: true, isZeroToZero: false }
      };
      

      return {
        ...currentStage,
        vsLastMonth,
        vsLastQuarter
      };
    });
  }

  /**
   * Refresh materialized views to ensure data is up to date
   * This should be called periodically or after data updates
   */
  static async refreshMaterializedViews(): Promise<void> {
    try {
      // Refresh all materialized views using direct SQL with timeout handling
      const refreshPromises = [
        supabase.rpc('refresh_materialized_view', {
          view_name: 'mv_opportunity_quote_pairs_optimized'
        }),
        supabase.rpc('refresh_materialized_view', {
          view_name: 'mv_quote_order_pairs_optimized'
        }),
        supabase.rpc('refresh_materialized_view', {
          view_name: 'mv_order_invoice_pairs_with_invoices_only'
        }),
        supabase.rpc('refresh_materialized_view', {
          view_name: 'mv_invoice_payment_pairs_optimized'
        })
      ];
      
      const results = await Promise.allSettled(refreshPromises);
      
      let hasErrors = false;
      const viewNames = [
        'mv_opportunity_quote_pairs_optimized',
        'mv_quote_order_pairs_optimized', 
        'mv_order_invoice_pairs_with_invoices_only',
        'mv_invoice_payment_pairs_optimized'
      ];
      
      results.forEach((result, index) => {
        const viewName = viewNames[index];
        if (result.status === 'rejected') {
          hasErrors = true;
        } else if (result.value.error) {
          hasErrors = true;
        }
      });
      
      if (hasErrors) {
        throw new Error('One or more materialized view refreshes failed');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if materialized views need refresh based on data freshness
   * Returns true if views should be refreshed
   */
  static async shouldRefreshViews(): Promise<boolean> {
    try {
      // Simple check - just verify the views exist and have data
      const { data, error } = await supabase
        .from('mv_opportunity_quote_pairs_optimized')
        .select('opportunity_id')
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return true;
      }
      
      // For now, we'll refresh occasionally (5% chance) to keep data fresh
      // In production, you might want to implement a more sophisticated refresh strategy
      return Math.random() < 0.05;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get basic opportunity summary data (for dashboard tab) with retry logic
   * Now uses materialized views for better performance
   */
  static async getOpportunitySummary(filters: FlowFilters, retries = 3): Promise<{
    totalRecords: number;
    sampleRecords: any[];
    allStages: string[];
    dateRange: { earliest: number | null; latest: number | null };
    summary: {
      totalAmount: number;
      averageAmount: number;
      closedWon: number;
      closedLost: number;
    };
  }> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Use materialized view for better performance
        let query = supabase
          .from('mv_opportunity_quote_pairs_optimized')
          .select('opportunity_amount, stage_name, opportunity_created_date, customer_tier, market_segment, customer_country, lead_source, opportunity_type')
          .not('opportunity_created_date', 'is', null);

        // Apply filters - use opportunity_created_date for materialized view
        if (filters.dateRange?.from) {
          query = query.gte('opportunity_created_date', filters.dateRange.from);
        }
        if (filters.dateRange?.to) {
          query = query.lte('opportunity_created_date', filters.dateRange.to);
        }
        
        // Apply other filters
        if (filters.customerTier && filters.customerTier !== 'all') {
          query = query.eq('customer_tier', filters.customerTier);
        }
        if (filters.geolocation && filters.geolocation !== 'all') {
          query = query.eq('customer_country', filters.geolocation);
        }
        if (filters.productType && filters.productType !== 'all') {
          query = query.eq('market_segment', filters.productType);
        }
        if (filters.stage && filters.stage !== 'all') {
          query = query.eq('stage_name', filters.stage);
        }
        if (filters.leadType && filters.leadType !== 'all') {
          query = query.eq('lead_source', filters.leadType);
        }
        if (filters.customerType && filters.customerType !== 'all') {
          query = query.eq('opportunity_type', filters.customerType);
        }
        query = this.applyDealSizeFilter(query, filters, 'opportunity_amount');

        const { data: opportunities, error } = await query;

        if (error) {
          // Check for statement timeout error (PostgreSQL error code 57014)
          if (error.code === '57014' && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      if (!opportunities || opportunities.length === 0) {
        return {
          totalRecords: 0,
          sampleRecords: [],
          allStages: [],
          dateRange: { earliest: null, latest: null },
          summary: {
            totalAmount: 0,
            averageAmount: 0,
            closedWon: 0,
            closedLost: 0
          }
        };
      }

        // Calculate summary statistics
        const totalRecords = opportunities.length;
        const amounts = opportunities.map(opp => opp.opportunity_amount || 0).filter(amount => amount > 0);
        const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
        const averageAmount = amounts.length > 0 ? totalAmount / amounts.length : 0;
        
        const closedWon = opportunities.filter(opp => 
          opp.stage_name?.toLowerCase().includes('closed won')
        ).length;
        const closedLost = opportunities.filter(opp => 
          opp.stage_name?.toLowerCase().includes('closed lost')
        ).length;

        const allStages = Array.from(
          new Set(opportunities.map(opp => opp.stage_name).filter(Boolean))
        );

        const dates = opportunities.map(opp => new Date(opp.opportunity_created_date).getTime());
        const earliest = dates.length > 0 ? Math.min(...dates) : null;
        const latest = dates.length > 0 ? Math.max(...dates) : null;

        return {
          totalRecords,
          sampleRecords: opportunities.slice(0, 100).map(opp => ({
            amount: opp.opportunity_amount,
            stage_name: opp.stage_name,
            created_date: opp.opportunity_created_date,
            customer_tier: opp.customer_tier,
            market_segment: opp.market_segment,
            customer_country: opp.customer_country,
            lead_source: opp.lead_source,
            type: opp.opportunity_type
          })),
          allStages,
          dateRange: { earliest, latest },
          summary: {
            totalAmount,
            averageAmount,
            closedWon,
            closedLost
          }
        };
      } catch (error: any) {
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return {
      totalRecords: 0,
      sampleRecords: [],
      allStages: [],
      dateRange: { earliest: null, latest: null },
      summary: {
        totalAmount: 0,
        averageAmount: 0,
        closedWon: 0,
        closedLost: 0
      }
    };
  }

  static async getIndependentCreditMemoRatioData(): Promise<{
    current: { ratio: number; invoices: number; creditMemos: number; rawRatio: number };
    vsLastMonth: { ratio: number; invoices: number; creditMemos: number; rawRatio: number };
    vsPreviousQuarter: { ratio: number; invoices: number; creditMemos: number; rawRatio: number };
    detailedData: any[];
  }> {
    try {
      // Current: Year to Date 2025 (Jan 1, 2025 to today)
      const currentFrom = '2025-01-01';
      const currentTo = new Date().toISOString().split('T')[0];
      
      // Last Month: December 2024
      const lastMonthFrom = '2024-12-01';
      const lastMonthTo = '2024-12-31';
      
      // Previous Quarter: Q4 2024 (Oct 1 - Dec 31, 2024)
      const previousQuarterFrom = '2024-10-01';
      const previousQuarterTo = '2024-12-31';

      const tenantId = "10139684-7b8d-4af7-b66a-62991fd49c74";

      // Fetch current period data
      const { data: currentInvoices, error: currentInvoiceError } = await supabaseAdmin
        .from('netsuite_raw_invoices' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('tran_date', currentFrom)
        .lte('tran_date', currentTo);

      if (currentInvoiceError) throw currentInvoiceError;

      const { data: currentCreditMemos, error: currentCreditMemoError } = await supabaseAdmin
        .from('netsuite_credit_memos' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('trandate', currentFrom)
        .lte('trandate', currentTo);

      if (currentCreditMemoError) throw currentCreditMemoError;

      // Fetch last month data
      const { data: lastMonthInvoices, error: lastMonthInvoiceError } = await supabaseAdmin
        .from('netsuite_raw_invoices' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('tran_date', lastMonthFrom)
        .lte('tran_date', lastMonthTo);

      if (lastMonthInvoiceError) throw lastMonthInvoiceError;

      const { data: lastMonthCreditMemos, error: lastMonthCreditMemoError } = await supabaseAdmin
        .from('netsuite_credit_memos' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('trandate', lastMonthFrom)
        .lte('trandate', lastMonthTo);

      if (lastMonthCreditMemoError) throw lastMonthCreditMemoError;

      // Fetch previous quarter data
      const { data: previousQuarterInvoices, error: previousQuarterInvoiceError } = await supabaseAdmin
        .from('netsuite_raw_invoices' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('tran_date', previousQuarterFrom)
        .lte('tran_date', previousQuarterTo);

      if (previousQuarterInvoiceError) throw previousQuarterInvoiceError;

      const { data: previousQuarterCreditMemos, error: previousQuarterCreditMemoError } = await supabaseAdmin
        .from('netsuite_credit_memos' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('trandate', previousQuarterFrom)
        .lte('trandate', previousQuarterTo);

      if (previousQuarterCreditMemoError) throw previousQuarterCreditMemoError;

      // Calculate ratios
      const currentInvoiceCount = currentInvoices?.length || 0;
      const currentCreditMemoCount = currentCreditMemos?.length || 0;
      const currentRatio = currentInvoiceCount > 0 ? (currentCreditMemoCount / currentInvoiceCount) * 100 : 0;

      const lastMonthInvoiceCount = lastMonthInvoices?.length || 0;
      const lastMonthCreditMemoCount = lastMonthCreditMemos?.length || 0;
      const lastMonthRatio = lastMonthInvoiceCount > 0 ? (lastMonthCreditMemoCount / lastMonthInvoiceCount) * 100 : 0;

      const previousQuarterInvoiceCount = previousQuarterInvoices?.length || 0;
      const previousQuarterCreditMemoCount = previousQuarterCreditMemos?.length || 0;
      const previousQuarterRatio = previousQuarterInvoiceCount > 0 ? (previousQuarterCreditMemoCount / previousQuarterInvoiceCount) * 100 : 0;

      // Fetch detailed data for current period (YTD 2025)
      const { data: detailedInvoices, error: detailedInvoiceError } = await supabaseAdmin
        .from('netsuite_raw_invoices' as any)
        .select('id, tran_id, tran_date, entity_name, total, status')
        .eq('tenant_id', tenantId)
        .gte('tran_date', currentFrom)
        .lte('tran_date', currentTo)
        .order('tran_date', { ascending: false })
        .limit(1000);

      if (detailedInvoiceError) throw detailedInvoiceError;

      const { data: detailedCreditMemos, error: detailedCreditMemoError } = await supabaseAdmin
        .from('netsuite_credit_memos' as any)
        .select('id, tran_id, trandate, entity_name, total, status')
        .eq('tenant_id', tenantId)
        .gte('trandate', currentFrom)
        .lte('trandate', currentTo)
        .order('trandate', { ascending: false })
        .limit(1000);

      if (detailedCreditMemoError) throw detailedCreditMemoError;

      // Transform detailed data for the modal
      const detailedData = [
        ...(detailedInvoices || []).map((invoice: any) => ({
          id: invoice.id,
          type: 'Invoice',
          number: invoice.tran_id,
          date: invoice.tran_date,
          entity: invoice.entity_name,
          amount: parseFloat(invoice.total) || 0,
          status: invoice.status || 'Posted',
          period: 'YTD 2025'
        })),
        ...(detailedCreditMemos || []).map((creditMemo: any) => ({
          id: creditMemo.id,
          type: 'Credit Memo',
          number: creditMemo.tran_id,
          date: creditMemo.trandate,
          entity: creditMemo.entity_name,
          amount: parseFloat(creditMemo.total) || 0,
          status: creditMemo.status || 'Posted',
          period: 'YTD 2025'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        current: { 
          ratio: Math.round(currentRatio * 100) / 100, 
          invoices: currentInvoiceCount,
          creditMemos: currentCreditMemoCount,
          rawRatio: currentRatio
        },
        vsLastMonth: { 
          ratio: Math.round(lastMonthRatio * 100) / 100, 
          invoices: lastMonthInvoiceCount,
          creditMemos: lastMonthCreditMemoCount,
          rawRatio: lastMonthRatio
        },
        vsPreviousQuarter: { 
          ratio: Math.round(previousQuarterRatio * 100) / 100, 
          invoices: previousQuarterInvoiceCount,
          creditMemos: previousQuarterCreditMemoCount,
          rawRatio: previousQuarterRatio
        },
        detailedData
      };
    } catch (error) {
      console.error('Error fetching independent credit memo ratio data:', error);
      return {
        current: { ratio: 0, invoices: 0, creditMemos: 0, rawRatio: 0 },
        vsLastMonth: { ratio: 0, invoices: 0, creditMemos: 0, rawRatio: 0 },
        vsPreviousQuarter: { ratio: 0, invoices: 0, creditMemos: 0, rawRatio: 0 },
        detailedData: []
      };
    }
  }
}
