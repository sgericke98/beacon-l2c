import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { withApiAuth, AuthContext } from '@/lib/auth-middleware';
import { withEnhancedAuth, EnhancedAuthContext, applyOrganizationFilterToQuery } from '@/lib/enhanced-auth-middleware';

// Columns you actually need downstream
const COLUMNS = `
  opportunity_id,
  opportunity_name,
  opportunity_amount_usd,
  opportunity_stage_name,
  opportunity_type,
  opportunity_lead_source,
  opportunity_created_date,
  customer_tier,
  customer_market_segment,
  customer_country,
  customer_sales_channel,
  has_quote,
  has_order,
  has_invoice,
  has_payment,
  days_to_quote,
  days_quote_to_order,
  days_order_to_invoice,
  days_invoice_to_payment,
  quote_created_date,
  quote_name,
  order_created_date,
  order_name,
  invoice_transaction_id,
  invoice_created_date,
  invoice_customer_name,
  payment_application_date,
  quote_status,
  order_status,
  invoice_status,
  quote_total_amount_usd,
  order_total_amount_usd,
  invoice_total_amount_usd
`;

type Filters = {
  customerTier?: string;
  productType?: string;
  geolocation?: string;
  stage?: string;
  leadType?: string;
  customerType?: string;
  dateRange?: { from?: string; to?: string };
  dealSize?: 'small' | 'medium' | 'large' | 'enterprise' | 'all';
  opportunityToQuoteTime?: 'all' | 'fast' | 'slow';
};

async function handleDashboardRequest(request: NextRequest, context: EnhancedAuthContext) {
  try {
    const { filters }: { filters?: Filters } = await request.json();
    const supabase = context.supabase;
    let userPeriodDays = 30; // default

    // 1) Build the base filtered query with organization awareness
    let base = (supabase
      .from('mv_lead_to_cash_flow' as any)
      .select(COLUMNS, { count: 'exact' }) as any);
    
    // Apply organization filtering
    base = applyOrganizationFilterToQuery(base, context, { organization_id: context.selectedOrganizationId });

    if (filters?.customerTier && filters.customerTier !== 'all') {
      base = base.eq('customer_tier' as any, filters.customerTier as any);
    }
    if (filters?.productType && filters.productType !== 'all') {
      base = base.eq('customer_market_segment' as any, filters.productType as any);
    }
    if (filters?.geolocation && filters.geolocation !== 'all') {
      base = base.eq('customer_country' as any, filters.geolocation as any);
    }
    if (filters?.stage && filters.stage !== 'all') {
      base = base.eq('opportunity_stage_name' as any, filters.stage as any);
    }
    if (filters?.leadType && filters.leadType !== 'all') {
      base = base.eq('opportunity_lead_source' as any, filters.leadType as any);
    }
    if (filters?.customerType && filters.customerType !== 'all') {
      base = base.eq('opportunity_type' as any, filters.customerType as any);
    }
    if (filters?.dateRange?.from) {
      base = base.gte('opportunity_created_date', filters.dateRange.from);
    }
    if (filters?.dateRange?.to) {
      base = base.lte('opportunity_created_date', filters.dateRange.to);
    }
    if (filters?.dealSize && filters.dealSize !== 'all') {
      const thresholds = {
        small: { min: 0, max: 10000 },
        medium: { min: 10000, max: 100000 },
        large: { min: 100000, max: 1000000 },
        enterprise: { min: 1000000, max: Infinity },
      } as const;
      const t = thresholds[filters.dealSize];
      base = base.gte('opportunity_amount_usd', t.min);
      if (t.max !== Infinity) base = base.lt('opportunity_amount_usd', t.max);
    }
    if (filters?.opportunityToQuoteTime && filters.opportunityToQuoteTime !== 'all') {
      if (filters.opportunityToQuoteTime === 'fast') {
        // Fast: 0-0.5 days
        base = base.gte('days_to_quote', 0).lte('days_to_quote', 0.5);
      } else if (filters.opportunityToQuoteTime === 'slow') {
        // Slow: >= 0.5 days
        base = base.gte('days_to_quote', 0.5);
      }
    }

    // 2) For period comparisons, we need more historical data
    // Calculate how much data we need based on the current filter
    // 3) Filter data to current period for detailed data, but keep extended data for period comparisons
    const currentFilterTo = filters?.dateRange?.to ? new Date(filters.dateRange.to) : new Date();
    const currentFilterFrom = filters?.dateRange?.from ? new Date(filters.dateRange.from) : new Date(Date.now() - (userPeriodDays * 24 * 60 * 60 * 1000));
    
    // Calculate the user's selected period length
    if (currentFilterFrom && currentFilterTo) {
      const diffTime = currentFilterTo.getTime() - currentFilterFrom.getTime();
      userPeriodDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Always extend backwards by 90 days for quarter comparisons
    // Total data needed = user period + 90 days
    let extendedFromDate = currentFilterFrom;
    if (currentFilterFrom) {
      const extendedDate = new Date(currentFilterFrom);
      extendedDate.setDate(extendedDate.getDate() - 90);
      extendedFromDate = extendedDate;
    }
    
    // Build extended query for period comparisons with organization awareness
    let extendedBase = (supabase
      .from('mv_lead_to_cash_flow' as any)
      .select(COLUMNS, { count: 'exact' }) as any);
    
    // Apply organization filtering
    extendedBase = applyOrganizationFilterToQuery(extendedBase, context, { organization_id: context.selectedOrganizationId });

    // Apply all the same filters except extend the date range backwards
      if (filters?.customerTier && filters.customerTier !== 'all') {
        extendedBase = extendedBase.eq('customer_tier' as any, filters.customerTier as any);
      }
      if (filters?.productType && filters.productType !== 'all') {
        extendedBase = extendedBase.eq('customer_market_segment' as any, filters.productType as any);
      }
      if (filters?.geolocation && filters.geolocation !== 'all') {
        extendedBase = extendedBase.eq('customer_country' as any, filters.geolocation as any);
      }
      if (filters?.stage && filters.stage !== 'all') {
        extendedBase = extendedBase.eq('opportunity_stage_name' as any, filters.stage as any);
      }
      if (filters?.leadType && filters.leadType !== 'all') {
        extendedBase = extendedBase.eq('opportunity_lead_source' as any, filters.leadType as any);
      }
      if (filters?.customerType && filters.customerType !== 'all') {
        extendedBase = extendedBase.eq('opportunity_type' as any, filters.customerType as any);
    }
    if (extendedFromDate) {
      extendedBase = extendedBase.gte('opportunity_created_date', extendedFromDate.toISOString());
    }
    if (currentFilterTo) {
      extendedBase = extendedBase.lte('opportunity_created_date', currentFilterTo.toISOString());
    }
    if (filters?.dealSize && filters.dealSize !== 'all') {
      const thresholds = {
        small: { min: 0, max: 10000 },
        medium: { min: 10000, max: 100000 },
        large: { min: 100000, max: 1000000 },
        enterprise: { min: 1000000, max: Infinity },
      } as const;
      const t = thresholds[filters.dealSize];
      extendedBase = extendedBase.gte('opportunity_amount_usd', t.min);
      if (t.max !== Infinity) extendedBase = extendedBase.lt('opportunity_amount_usd', t.max);
    }
    if (filters?.opportunityToQuoteTime && filters.opportunityToQuoteTime !== 'all') {
      if (filters.opportunityToQuoteTime === 'fast') {
        // Fast: 0-0.5 days
        extendedBase = extendedBase.gte('days_to_quote', 0).lte('days_to_quote', 0.5);
      } else if (filters.opportunityToQuoteTime === 'slow') {
        // Slow: >= 0.5 days
        extendedBase = extendedBase.gte('days_to_quote', 0.5);
      }
    }

    // Optimized pagination with extended data for period comparisons
    const PAGE = 1000;
    let lastDate: string | null = null;
    const all: any[] = [];

    while (true) {
      let q = extendedBase.order('opportunity_created_date', { ascending: false });

      if (lastDate) {
        // fetch strictly OLDER than lastDate because we're ordering DESC
        q = q.lt('opportunity_created_date', lastDate);
      }

      // request PAGE items; PostgREST enforces range anyway
      q = q.limit(PAGE);

      const { data, error } = await q;
      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
      }
      if (!data || data.length === 0) break;

      all.push(...data);
      lastDate = (data[data.length - 1] as any).opportunity_created_date;
      if (data.length < PAGE) break; // no more pages
    }
    
    

    
    // Filter to current period only for detailed data
    const currentPeriodData = all.filter(record => {
      const createdDate = new Date(record.opportunity_created_date);
      return createdDate >= currentFilterFrom && createdDate <= currentFilterTo;
    });
    
    const processedData = processTimeMetrics(all, userPeriodDays, currentPeriodData);
    const filterOptions = extractFilterOptions(all);
    

    return NextResponse.json({
      success: true,
      data: processedData,
      totalRecords: currentPeriodData.length,
      filterOptions,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export with enhanced authentication middleware
export const POST = withEnhancedAuth(handleDashboardRequest);


function processTimeMetrics(data: any[], userPeriodDays: number = 30, currentPeriodData?: any[]) {
  // Use current period data for detailed data, but extended data for period comparisons
  const dataForDetailed = currentPeriodData || data;
  
  // Filter data for each time metric (use current period for detailed data)
  // Match Supabase query: has_quote = true AND days_to_quote IS NOT NULL AND opportunity_amount_usd IS NOT NULL
  const opportunityToQuoteData = dataForDetailed.filter(record => 
    record.has_quote === true && 
    record.days_to_quote !== null && 
    record.opportunity_amount_usd !== null
  );
  
  const quoteToOrderData = dataForDetailed.filter(record => 
    record.has_quote === true && 
    record.has_order === true && 
    record.days_quote_to_order !== null && 
    record.opportunity_amount_usd !== null
  );
  
  const orderToInvoiceData = dataForDetailed.filter(record => 
    record.has_order === true && 
    record.has_invoice === true && 
    record.days_order_to_invoice !== null && 
    record.opportunity_amount_usd !== null
  );
  
  const invoiceToPaymentData = dataForDetailed.filter(record => 
    record.has_invoice === true && 
    record.has_payment === true && 
    record.days_invoice_to_payment !== null && 
    record.opportunity_amount_usd !== null
  );
  
  // Calculate averages using current period data, trends using extended data for period comparisons
  const opportunityToQuote = calculateMetricStats(data, 'days_to_quote', userPeriodDays, opportunityToQuoteData);
  const quoteToOrder = calculateMetricStats(data, 'days_quote_to_order', userPeriodDays, quoteToOrderData);
  const orderToInvoice = calculateMetricStats(data, 'days_order_to_invoice', userPeriodDays, orderToInvoiceData);
  const invoiceToPayment = calculateMetricStats(data, 'days_invoice_to_payment', userPeriodDays, invoiceToPaymentData);
  
  return {
    stages: [
      {
        stage: "Opportunity to Quote",
        avgDays: opportunityToQuote.average,
        recordCount: opportunityToQuoteData.length,
        vsLastMonth: opportunityToQuote.vsLastMonth,
        vsLastQuarter: opportunityToQuote.vsLastQuarter
      },
      {
        stage: "Quote to Order", 
        avgDays: quoteToOrder.average,
        recordCount: quoteToOrderData.length,
        vsLastMonth: quoteToOrder.vsLastMonth,
        vsLastQuarter: quoteToOrder.vsLastQuarter
      },
      {
        stage: "Order to Invoice",
        avgDays: orderToInvoice.average,
        recordCount: orderToInvoiceData.length,
        vsLastMonth: orderToInvoice.vsLastMonth,
        vsLastQuarter: orderToInvoice.vsLastQuarter
      },
      {
        stage: "Invoice to Payment",
        avgDays: invoiceToPayment.average,
        recordCount: invoiceToPaymentData.length,
        vsLastMonth: invoiceToPayment.vsLastMonth,
        vsLastQuarter: invoiceToPayment.vsLastQuarter
      }
    ],
    orderToInvoice: {
      summary: {
        avgDays: orderToInvoice.average,
        recordCount: orderToInvoiceData.length,
        vsLastMonth: orderToInvoice.vsLastMonth,
        vsLastQuarter: orderToInvoice.vsLastQuarter
      },
      data: orderToInvoiceData
    },
    invoiceToPayment: {
      summary: {
        avgDays: invoiceToPayment.average,
        recordCount: invoiceToPaymentData.length,
        vsLastMonth: invoiceToPayment.vsLastMonth,
        vsLastQuarter: invoiceToPayment.vsLastQuarter
      },
      data: invoiceToPaymentData
    },
    detailed_data: {
      "Opportunity to Quote": opportunityToQuoteData.map(record => ({
        id: record.opportunity_id || '',
        opportunity: record.opportunity_name || '',
        startDate: record.opportunity_created_date || '',
        endDate: record.quote_created_date || '',
        duration: record.days_to_quote || 0,
        opportunityAmountUSD: record.opportunity_amount_usd || 0,
        region: record.customer_country || '',
        status: record.opportunity_stage_name || ''
      })),
      "Quote to Order": quoteToOrderData.map(record => ({
        id: record.quote_name || '',
        opportunity: record.opportunity_name || '',
        startDate: record.quote_created_date || '',
        endDate: record.order_created_date || '',
        duration: record.days_quote_to_order || 0,
        opportunityAmountUSD: record.opportunity_amount_usd || 0,
        orderTotalAmountUSD: record.order_total_amount_usd || 0,
        region: record.customer_country || '',
        status: record.order_status || ''
      })),
      "Order to Invoice": orderToInvoiceData.map(record => ({
        opportunity: record.order_name || '',
        invoice_number: record.invoice_transaction_id || '',
        startDate: record.order_created_date || '',
        invoice_date: record.invoice_created_date || '',
        duration: record.days_order_to_invoice || 0,
        orderTotalUSD: record.order_total_amount_usd || 0,
        invoiceTotalUSD: record.invoice_total_amount_usd || 0,
        dealSize: record.opportunity_amount_usd || 0,
        region: record.customer_country || ''
      })),
      "Invoice to Payment": invoiceToPaymentData.map(record => ({
        opportunity: record.invoice_transaction_id || '',
        startDate: record.invoice_created_date || '',
        endDate: record.payment_application_date || '',
        duration: record.days_invoice_to_payment || 0,
        invoiceTotalUSD: record.invoice_total_amount_usd || 0,
        region: record.invoice_customer_name || '',
        status: record.invoice_status || ''
      }))
    }
  };
}

function extractFilterOptions(data: any[]) {
  const uniqueValues = (field: string) => {
    const values = data
      .map(record => record[field])
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(value => String(value));
    return Array.from(new Set(values)).sort();
  };

  return {
    customerTiers: uniqueValues('customer_tier'),
    productTypes: uniqueValues('customer_market_segment'),
    geolocations: uniqueValues('customer_country'),
    stages: uniqueValues('opportunity_stage_name'),
    leadTypes: uniqueValues('opportunity_lead_source'),
    customerTypes: uniqueValues('opportunity_type'),
    salesChannels: uniqueValues('customer_sales_channel')
  };
}

// Helper function to filter records based on metric type (matches Supabase query logic)
function filterValidRecords(data: any[], field: string) {
  if (field === 'days_to_quote') {
    // Opportunity to Quote: has_quote = true AND days_to_quote IS NOT NULL
    return data.filter(record => 
      record.has_quote === true && 
      record[field] !== null && 
      record[field] !== undefined &&
      record.opportunity_amount_usd !== null
    );
  } else if (field === 'days_quote_to_order') {
    // Quote to Order: has_quote = true AND has_order = true AND days_quote_to_order IS NOT NULL
    return data.filter(record => 
      record.has_quote === true && 
      record.has_order === true && 
      record[field] !== null && 
      record[field] !== undefined &&
      record.opportunity_amount_usd !== null
    );
  } else if (field === 'days_order_to_invoice') {
    // Order to Invoice: has_order = true AND has_invoice = true AND days_order_to_invoice IS NOT NULL
    return data.filter(record => 
      record.has_order === true && 
      record.has_invoice === true && 
      record[field] !== null && 
      record[field] !== undefined &&
      record.opportunity_amount_usd !== null
    );
  } else if (field === 'days_invoice_to_payment') {
    // Invoice to Payment: has_invoice = true AND has_payment = true AND days_invoice_to_payment IS NOT NULL
    return data.filter(record => 
      record.has_invoice === true && 
      record.has_payment === true && 
      record[field] !== null && 
      record[field] !== undefined &&
      record.opportunity_amount_usd !== null
    );
  } else {
    // Fallback to original logic
    return data.filter(record => 
      record[field] !== null && 
      record[field] !== undefined &&
      record.opportunity_amount_usd !== null
    );
  }
}

function calculateMetricStats(data: any[], field: string, userPeriodDays: number = 30, currentPeriodDataParam?: any[]) {
  if (data.length === 0) {
    return {
      average: 0,
      vsLastMonth: { avgDaysChange: 0, hasData: false },
      vsLastQuarter: { avgDaysChange: 0, hasData: false }
    };
  }
  
  if (data.length === 0) {
    return {
      average: 0,
      vsLastMonth: { avgDaysChange: 0, hasData: false },
      vsLastQuarter: { avgDaysChange: 0, hasData: false }
    };
  }
  
  const latestDate = new Date();
  
  // Calculate period boundaries correctly
  // Current period: most recent userPeriodDays days
  const currentPeriodEnd = new Date(latestDate);
  const currentPeriodStart = new Date(latestDate);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - userPeriodDays);
  
  // Previous period: 30 days immediately before current period (days 60-90)
  // Start 30 days before current period, end where current period starts
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
  const previousPeriodEnd = new Date(currentPeriodStart);
  
  // Previous quarter: 90 days immediately before current period (days 60-150)
  // Start 90 days before current period, end where current period starts
  const lastQuarterStart = new Date(currentPeriodStart);
  lastQuarterStart.setDate(lastQuarterStart.getDate() - 90);
  const lastQuarterEnd = new Date(currentPeriodStart);
  
  // Use provided current period data if available, otherwise filter from extended data
  const currentPeriodData = currentPeriodDataParam && currentPeriodDataParam.length > 0
    ? currentPeriodDataParam
    : data.filter(record => {
        const createdDate = new Date(record.opportunity_created_date);
        return createdDate >= currentPeriodStart && createdDate <= currentPeriodEnd;
      });
  
  // Filter data for previous period (same duration as current period, immediately before)
  const previousPeriodData = data.filter(record => {
    const createdDate = new Date(record.opportunity_created_date);
    return createdDate >= previousPeriodStart && createdDate <= previousPeriodEnd;
  });
  // Filter data for last quarter (90 days before current period)
  const lastQuarterData = data.filter(record => {
    const createdDate = new Date(record.opportunity_created_date);
    return createdDate >= lastQuarterStart && createdDate <= lastQuarterEnd;
  });
  
  // Calculate current average using the current period data
  const currentAverage = currentPeriodData.length > 0
    ? currentPeriodData.reduce((sum, record) => sum + parseFloat(record[field] || 0), 0) / currentPeriodData.length
    : 0;
  
  
  // Filter records using the correct logic for each metric type
  const validPreviousRecords = filterValidRecords(previousPeriodData, field);
  
  // Calculate previous period average using only valid records (matching Supabase query logic)
  const previousPeriodAverage = validPreviousRecords.length > 0 
    ? validPreviousRecords.reduce((sum, record) => sum + parseFloat(record[field] || 0), 0) / validPreviousRecords.length
    : 0;
  
  // Calculate last quarter average using only valid records (matching Supabase query logic)
  const validLastQuarterRecords = filterValidRecords(lastQuarterData, field);
  
  const lastQuarterAverage = validLastQuarterRecords.length > 0
    ? validLastQuarterRecords.reduce((sum, record) => sum + parseFloat(record[field] || 0), 0) / validLastQuarterRecords.length
    : 0;
  
  // Calculate percentage changes
  const vsLastMonthChangePercent = (() => {
    if (previousPeriodAverage === 0) {
      if (currentAverage === 0) return 0; // Both 0: no change
      return 100; // Current > 0, Previous = 0: infinite improvement
    }
    if (currentAverage === 0 && previousPeriodAverage > 0) {
      return -99; // Current = 0, Previous > 0: show as -99% (excellent improvement)
    }
    return ((currentAverage - previousPeriodAverage) / Math.abs(previousPeriodAverage)) * 100;
  })();
  
  const vsLastQuarterChangePercent = (() => {
    if (lastQuarterAverage === 0) {
      if (currentAverage === 0) return 0; // Both 0: no change
      return 100; // Current > 0, Previous = 0: infinite improvement
    }
    if (currentAverage === 0 && lastQuarterAverage > 0) {
      return -99; // Current = 0, Previous > 0: show as -99% (excellent improvement)
    }
    return ((currentAverage - lastQuarterAverage) / Math.abs(lastQuarterAverage)) * 100;
  })();
  
  return {
    average: currentAverage,
    vsLastMonth: {
      avgDaysChange: currentAverage - previousPeriodAverage,
      hasData: previousPeriodData.length > 0,
      previousAvgDays: previousPeriodAverage,
      avgDaysMetadata: {
        changePercent: vsLastMonthChangePercent,
        hasCurrentData: currentPeriodData.length > 0,
        hasPreviousData: previousPeriodData.length > 0,
        isNoData: currentPeriodData.length === 0 && previousPeriodData.length === 0,
        isZeroToZero: currentAverage === 0 && previousPeriodAverage === 0
      }
    },
    vsLastQuarter: {
      avgDaysChange: currentAverage - lastQuarterAverage,
      hasData: lastQuarterData.length > 0,
      previousAvgDays: lastQuarterAverage,
      avgDaysMetadata: {
        changePercent: vsLastQuarterChangePercent,
        hasCurrentData: currentPeriodData.length > 0,
        hasPreviousData: lastQuarterData.length > 0,
        isNoData: currentPeriodData.length === 0 && lastQuarterData.length === 0,
        isZeroToZero: currentAverage === 0 && lastQuarterAverage === 0
      }
    }
  };
}
