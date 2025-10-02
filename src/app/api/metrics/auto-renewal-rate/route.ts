import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPeriodComparison } from '@/lib/dateUtils';
import { getMetricTargets } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filters, sortBy, sortDirection, page = 1, pageSize = 50 } = body;
    
    // Use the same date range logic as other metrics
    let effectiveFilters = { ...filters };
    
    // If daysBack is provided, override dateRange
    if (filters?.daysBack) {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - filters.daysBack);
      effectiveFilters.dateRange = {
        from: dateFrom.toISOString().split("T")[0],
        to: new Date().toISOString().split("T")[0],
      };
    }

    // Calculate period length from the selected date range
    let periodLengthDays = 30; // Default fallback
    let currentPeriod = null;
    
    if (effectiveFilters.dateRange?.from && effectiveFilters.dateRange?.to) {
      currentPeriod = {
        from: effectiveFilters.dateRange.from,
        to: effectiveFilters.dateRange.to
      };
      const fromDate = new Date(effectiveFilters.dateRange.from);
      const toDate = new Date(effectiveFilters.dateRange.to);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      periodLengthDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else if (filters?.daysBack) {
      periodLengthDays = filters.daysBack;
    }
    
    // Get date ranges for current vs last month vs last quarter comparison
    const periods = getPeriodComparison(currentPeriod, periodLengthDays);
    
    // Use the current period date range
    const currentFilters = {
      ...effectiveFilters,
      dateRange: periods.current
    };

    // Build base query for opportunities
    let baseQuery = supabaseAdmin
      .from('salesforce_opportunities' as any)
      .select('id, name, close_date, stage_name, sbqq_renewal, auto_renew_quote, amount, currency_iso_code, customer_tier, customer_country, market_segment, lead_source, type')
      .eq('tenant_id', '10139684-7b8d-4af7-b66a-62991fd49c74')
      .eq('sbqq_renewal', true); // Only renewal opportunities

    // Apply date range filters
    if (currentFilters.dateRange?.from) {
      baseQuery = baseQuery.gte('close_date', currentFilters.dateRange.from);
    }
    if (currentFilters.dateRange?.to) {
      baseQuery = baseQuery.lte('close_date', currentFilters.dateRange.to);
    }

    // Apply other filters
    if (currentFilters.customerTier && currentFilters.customerTier.length > 0) {
      baseQuery = baseQuery.in('customer_tier', currentFilters.customerTier);
    }
    if (currentFilters.customerCountry && currentFilters.customerCountry.length > 0) {
      baseQuery = baseQuery.in('customer_country', currentFilters.customerCountry);
    }
    if (currentFilters.marketSegment && currentFilters.marketSegment.length > 0) {
      baseQuery = baseQuery.in('market_segment', currentFilters.marketSegment);
    }
    if (currentFilters.leadSource && currentFilters.leadSource.length > 0) {
      baseQuery = baseQuery.in('lead_source', currentFilters.leadSource);
    }
    if (currentFilters.opportunityType && currentFilters.opportunityType.length > 0) {
      baseQuery = baseQuery.in('type', currentFilters.opportunityType);
    }

    // Get current period data
    const { data: currentData, error: currentError } = await baseQuery;
    
    if (currentError) {
      console.error('Error fetching current period data:', currentError);
      throw currentError;
    }

    // Calculate current period metrics
    const totalRenewalOpportunities = currentData?.length || 0;
    const autoRenewedOpportunities = currentData?.filter((opp: any) => opp.auto_renew_quote === true).length || 0;
    const autoRenewalRate = totalRenewalOpportunities > 0 ? (autoRenewedOpportunities / totalRenewalOpportunities) * 100 : 0;

    // Calculate last month comparison
    let lastMonthQuery = supabaseAdmin
      .from('salesforce_opportunities' as any)
      .select('id, auto_renew_quote')
      .eq('tenant_id', '10139684-7b8d-4af7-b66a-62991fd49c74')
      .eq('sbqq_renewal', true)
      .gte('close_date', periods.lastMonth.from)
      .lte('close_date', periods.lastMonth.to);

    // Apply same filters for last month
    if (currentFilters.customerTier && currentFilters.customerTier.length > 0) {
      lastMonthQuery = lastMonthQuery.in('customer_tier', currentFilters.customerTier);
    }
    if (currentFilters.customerCountry && currentFilters.customerCountry.length > 0) {
      lastMonthQuery = lastMonthQuery.in('customer_country', currentFilters.customerCountry);
    }
    if (currentFilters.marketSegment && currentFilters.marketSegment.length > 0) {
      lastMonthQuery = lastMonthQuery.in('market_segment', currentFilters.marketSegment);
    }
    if (currentFilters.leadSource && currentFilters.leadSource.length > 0) {
      lastMonthQuery = lastMonthQuery.in('lead_source', currentFilters.leadSource);
    }
    if (currentFilters.opportunityType && currentFilters.opportunityType.length > 0) {
      lastMonthQuery = lastMonthQuery.in('type', currentFilters.opportunityType);
    }

    // Calculate last quarter comparison
    let lastQuarterQuery = supabaseAdmin
      .from('salesforce_opportunities' as any)
      .select('id, auto_renew_quote')
      .eq('tenant_id', '10139684-7b8d-4af7-b66a-62991fd49c74')
      .eq('sbqq_renewal', true)
      .gte('close_date', periods.lastQuarter.from)
      .lte('close_date', periods.lastQuarter.to);

    // Apply same filters for last quarter
    if (currentFilters.customerTier && currentFilters.customerTier.length > 0) {
      lastQuarterQuery = lastQuarterQuery.in('customer_tier', currentFilters.customerTier);
    }
    if (currentFilters.customerCountry && currentFilters.customerCountry.length > 0) {
      lastQuarterQuery = lastQuarterQuery.in('customer_country', currentFilters.customerCountry);
    }
    if (currentFilters.marketSegment && currentFilters.marketSegment.length > 0) {
      lastQuarterQuery = lastQuarterQuery.in('market_segment', currentFilters.marketSegment);
    }
    if (currentFilters.leadSource && currentFilters.leadSource.length > 0) {
      lastQuarterQuery = lastQuarterQuery.in('lead_source', currentFilters.leadSource);
    }
    if (currentFilters.opportunityType && currentFilters.opportunityType.length > 0) {
      lastQuarterQuery = lastQuarterQuery.in('type', currentFilters.opportunityType);
    }

    const [lastMonthResult, lastQuarterResult] = await Promise.all([
      lastMonthQuery,
      lastQuarterQuery
    ]);

    // Calculate last month metrics
    const lastMonthTotal = lastMonthResult.data?.length || 0;
    const lastMonthAutoRenewed = lastMonthResult.data?.filter((opp: any) => opp.auto_renew_quote === true).length || 0;
    const lastMonthRate = lastMonthTotal > 0 ? (lastMonthAutoRenewed / lastMonthTotal) * 100 : 0;

    // Calculate last quarter metrics
    const lastQuarterTotal = lastQuarterResult.data?.length || 0;
    const lastQuarterAutoRenewed = lastQuarterResult.data?.filter((opp: any) => opp.auto_renew_quote === true).length || 0;
    const lastQuarterRate = lastQuarterTotal > 0 ? (lastQuarterAutoRenewed / lastQuarterTotal) * 100 : 0;

    // Determine status based on target range (70-85%)
    let status = "good";
    if (autoRenewalRate < 70) {
      status = "bad";
    } else if (autoRenewalRate < 75) {
      status = "okay";
    }

    const response = {
      metric_name: "Auto-renewed opportunities (%)",
      value: Math.round(autoRenewalRate * 100) / 100,
      target_min: getMetricTargets("Auto-renewed opportunities (%)").targetMin,
      target_max: getMetricTargets("Auto-renewed opportunities (%)").targetMax,
      status: status,
      change_percent: 0, // Will be calculated by comparison data
      direction: "stable", // Will be determined by comparison data
      updated_at: new Date().toISOString(),
      details: {
        total_renewal_opportunities: totalRenewalOpportunities,
        auto_renewed_opportunities: autoRenewedOpportunities,
        auto_renewal_rate: Math.round(autoRenewalRate * 100) / 100,
        calculation_date: new Date().toISOString().split('T')[0]
      },
      vsLastMonth: {
        avgDaysChange: Math.round((autoRenewalRate - lastMonthRate) * 100) / 100,
        performanceChange: 0, // Not applicable for percentage
        recordCountChange: autoRenewedOpportunities - lastMonthAutoRenewed,
        hasData: lastMonthTotal > 0,
        previousAvgDays: Math.round(lastMonthRate * 100) / 100,
        previousPerformance: 0, // Not applicable for percentage
        previousRecordCount: lastMonthAutoRenewed,
        avgDaysMetadata: {
          current: Math.round(autoRenewalRate * 100) / 100,
          previous: Math.round(lastMonthRate * 100) / 100,
          change: Math.round((autoRenewalRate - lastMonthRate) * 100) / 100
        }
      },
      vsLastQuarter: {
        avgDaysChange: Math.round((autoRenewalRate - lastQuarterRate) * 100) / 100,
        performanceChange: 0, // Not applicable for percentage
        recordCountChange: autoRenewedOpportunities - lastQuarterAutoRenewed,
        hasData: lastQuarterTotal > 0,
        previousAvgDays: Math.round(lastQuarterRate * 100) / 100,
        previousPerformance: 0, // Not applicable for percentage
        previousRecordCount: lastQuarterAutoRenewed,
        avgDaysMetadata: {
          current: Math.round(autoRenewalRate * 100) / 100,
          previous: Math.round(lastQuarterRate * 100) / 100,
          change: Math.round((autoRenewalRate - lastQuarterRate) * 100) / 100
        }
      },
      detailed_data: currentData || []
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ [Auto-renewal Rate Metric] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}