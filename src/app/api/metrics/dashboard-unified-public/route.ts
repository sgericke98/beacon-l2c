import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

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

export async function POST(request: NextRequest) {
  try {
    const { filters }: { filters?: Filters } = await request.json();
    const supabase = supabaseServer;
    let userPeriodDays = 30; // default

    // 1) Build the base filtered query ONCE
    let base = (supabase
      .from('mv_lead_to_cash_flow' as any)
      .select(COLUMNS, { count: 'exact' }) as any);

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

    // Get a small sample for testing
    const { data, error } = await base.limit(10);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch data', details: error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      totalRecords: data?.length || 0,
      message: 'Public endpoint working - no auth required'
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error', details: e }, { status: 500 });
  }
}
