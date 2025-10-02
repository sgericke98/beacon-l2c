import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

// Force dynamic rendering since we use request.url
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().min(1).max(1000).default(30),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const limit = parseInt(searchParams.get('limit') || '30');

    const validatedParams = RequestSchema.parse({
      dateFrom,
      dateTo,
      limit,
    });

    // Build date filter
    let dateFilter = '';
    if (validatedParams.dateFrom && validatedParams.dateTo) {
      dateFilter = `AND calculation_date >= '${validatedParams.dateFrom}' AND calculation_date <= '${validatedParams.dateTo}'`;
    } else if (validatedParams.dateFrom) {
      dateFilter = `AND calculation_date >= '${validatedParams.dateFrom}'`;
    } else if (validatedParams.dateTo) {
      dateFilter = `AND calculation_date <= '${validatedParams.dateTo}'`;
    }

    // Fetch auto-renewal metrics (no tenant filtering like dashboard-unified)
    const { data: autoRenewalData, error: autoRenewalError } = await (supabaseAdmin as any)
      .from("salesforce_auto_renewal_metrics")
      .select("*")
      .order("calculation_date", { ascending: false })
      .limit(validatedParams.limit);

    if (autoRenewalError) {
      console.error("❌ [Cost Metrics API] Error fetching auto-renewal metrics:", autoRenewalError);
    }

    // Fetch pricebook metrics (no tenant filtering like dashboard-unified)
    const { data: pricebookData, error: pricebookError } = await (supabaseAdmin as any)
      .from("salesforce_pricebook_metrics")
      .select("*")
      .order("calculation_date", { ascending: false })
      .limit(validatedParams.limit);

    if (pricebookError) {
      console.error("❌ [Cost Metrics API] Error fetching pricebook metrics:", pricebookError);
    }

    // Fetch credit memo to invoice ratio metrics (no tenant filtering like dashboard-unified)
    const { data: creditMemoRatioData, error: creditMemoRatioError } = await (supabaseAdmin as any)
      .from("credit_memo_invoice_ratio_metrics")
      .select("*")
      .order("calculation_date", { ascending: false })
      .limit(validatedParams.limit);

    if (creditMemoRatioError) {
      console.error("❌ [Cost Metrics API] Error fetching credit memo ratio metrics:", creditMemoRatioError);
    }

    // Get product counts using count queries (more efficient than fetching all records)
    const { count: totalProducts, error: totalProductsError } = await (supabaseAdmin as any)
      .from("products_raw")
      .select("*", { count: "exact", head: true });

    const { count: activeProducts, error: activeProductsError } = await (supabaseAdmin as any)
      .from("products_raw")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (totalProductsError) {
      console.error("❌ [Cost Metrics API] Error counting total products:", totalProductsError);
    }
    if (activeProductsError) {
      console.error("❌ [Cost Metrics API] Error counting active products:", activeProductsError);
    }

    // Calculate auto-renewal rate from quotes_raw table using count queries (year-to-date 2025)
    const { count: totalQuotes, error: totalQuotesError } = await (supabaseAdmin as any)
      .from("quotes_raw")
      .select("*", { count: "exact", head: true })
      .gte("quote_created_date", "2025-01-01")
      .lte("quote_created_date", new Date().toISOString().split('T')[0]);

    const { count: renewalQuotes, error: renewalQuotesError } = await (supabaseAdmin as any)
      .from("quotes_raw")
      .select("*", { count: "exact", head: true })
      .eq("quote_type", "Renewal")
      .gte("quote_created_date", "2025-01-01")
      .lte("quote_created_date", new Date().toISOString().split('T')[0]);

    if (totalQuotesError) {
      console.error("❌ [Cost Metrics API] Error counting total quotes:", totalQuotesError);
    }
    if (renewalQuotesError) {
      console.error("❌ [Cost Metrics API] Error counting renewal quotes:", renewalQuotesError);
    }

    // Calculate auto-renewal rate
    const autoRenewalRate = totalQuotes > 0 ? Math.round((renewalQuotes / totalQuotes) * 100 * 100) / 100 : 0;

    // Get latest metrics for summary
    const latestAutoRenewal = autoRenewalData?.[0] || null;
    const latestPricebook = pricebookData?.[0] || null;
    // Get the most recent credit memo ratio record with actual data (non-zero ratio)
    const latestCreditMemoRatio = creditMemoRatioData?.find((record: any) => record.credit_memo_to_invoice_ratio > 0) || creditMemoRatioData?.[0] || null;

    const summary = {
      auto_renewal_rate: autoRenewalRate, // Use calculated rate from quotes_raw
      total_renewals: renewalQuotes,
      auto_renewals: renewalQuotes,
      total_pricebooks: latestPricebook?.total_pricebooks || 0,
      active_pricebooks: latestPricebook?.active_pricebooks || 0,
      total_products: totalProducts,
      active_products: activeProducts,
      credit_memo_ratio: latestCreditMemoRatio?.credit_memo_to_invoice_ratio || 0,
      last_updated: latestAutoRenewal?.updated_at || latestPricebook?.updated_at || latestCreditMemoRatio?.updated_at || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      summary,
      historical: {
        auto_renewal_metrics: autoRenewalData || [],
        pricebook_metrics: pricebookData || [],
        product_metrics: [], // No historical data for products since we fetch directly from raw table
        credit_memo_ratio_metrics: creditMemoRatioData || [],
      },
      filters: {
        dateFrom: validatedParams.dateFrom,
        dateTo: validatedParams.dateTo,
        limit: validatedParams.limit,
      },
    });
  } catch (error) {
    console.error("❌ [Cost Metrics API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost metrics", details: error },
      { status: 500 }
    );
  }
}
