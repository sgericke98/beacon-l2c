import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "../../../../lib/supabase";
import { DEAL_SIZE_THRESHOLDS } from "@/lib/constants";
import { executeQueryWithTimeout } from "@/lib/queryTimeout";
import { withEnhancedAuth, EnhancedAuthContext, applyOrganizationFilterToQuery } from "@/lib/enhanced-auth-middleware";

// Check if a field requires database-level currency conversion
const requiresCurrencyConversion = (sortBy: string): boolean => {
  const convertedFields = ['convertedAmount', 'convertedNetAmount', 'convertedTotalAmount'];
  return convertedFields.includes(sortBy);
};

// Helper function to get opportunities with currency conversion using database function

const FiltersSchema = z.object({
  dateRange: z
    .object({ from: z.string().optional(), to: z.string().optional() })
    .optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  // Additional filters
  dealSize: z.array(z.string()).optional(),
  customerTier: z.array(z.string()).optional(),
  region: z.array(z.string()).optional(),
  productType: z.array(z.string()).optional(),
  codeType: z.array(z.string()).optional(),
  leadType: z.array(z.string()).optional(),
  customerType: z.array(z.string()).optional(),
  stage: z.array(z.string()).optional(),
  searchText: z.string().optional(),
});

async function handleOpportunitiesGET(req: NextRequest, context: EnhancedAuthContext) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "1000");
    const sortBy = searchParams.get("sortBy") || "created_date";
    const sortDirection =
      (searchParams.get("sortDirection") as "asc" | "desc") || "desc";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const region = searchParams.get("region");

    // Build the query using optimized materialized view with organization awareness
    let query = (context.supabase
      .from("mv_opportunities_with_usd" as any)
      .select("*") as any);
    
    // Apply organization filtering
    query = applyOrganizationFilterToQuery(query, context, { organization_id: context.selectedOrganizationId });

    // Apply date filters if provided
    if (dateFrom) {
      query = query.gte("opportunity_created_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("opportunity_created_date", dateTo);
    }

    // Apply region filter if provided
    if (region) {
      const regions = region.split(",");
      query = query.in("customer_country" as any, regions as any);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === "asc" });

    // Get total count first with organization awareness
    const countQuery = (context.supabase
      .from("mv_opportunities_with_usd" as any)
      .select("*", { count: "exact", head: true }) as any);
    
    // Apply organization filtering
    applyOrganizationFilterToQuery(countQuery, context, { organization_id: context.selectedOrganizationId });
    
    // Apply same filters to count query
    if (dateFrom) {
      countQuery.gte("opportunity_created_date", dateFrom);
    }
    if (dateTo) {
      countQuery.lte("opportunity_created_date", dateTo);
    }
    if (region) {
      const regions = region.split(",");
      countQuery.in("customer_country" as any, regions as any);
    }

    const { count, error: countError } = await executeQueryWithTimeout(countQuery);
    
    if (countError) {
      console.error("❌ [Salesforce Opportunities API] Count error:", countError);
      throw new Error(`Count error: ${countError.message}`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: opportunities, error } = await executeQueryWithTimeout(query);

    if (error) {
      console.error("❌ [Salesforce Opportunities API] Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / pageSize);

    return NextResponse.json({
      data: opportunities || [],
      totalRecords,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  } catch (err: any) {
    console.error("❌ [Salesforce Opportunities API] Error:", err);
    return NextResponse.json(
      {
        error: "SALESFORCE_OPPORTUNITIES_ERROR",
        details: err.message,
        traceId: Date.now().toString(),
      },
      { status: 500 }
    );
  }
}

async function handleOpportunitiesPOST(req: NextRequest, context: EnhancedAuthContext) {
  try {
    const body = await req.json();
    const filters = FiltersSchema.parse(body);

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 1000;
    const targetCurrency = "USD"; // Default target currency

    // Note: Database function temporarily disabled due to type mismatch
    // The optimized view already provides USD conversion, so we can sort by amount_usd directly
    // if (requiresCurrencyConversion(sortBy)) {
    //   return await getOpportunitiesWithCurrencyConversion(
    //     filters, page, pageSize, sortBy, sortDirection, targetCurrency
    //   );
    // }

    // Build the query using optimized materialized view with organization awareness
    let query = (context.supabase
      .from("mv_opportunities_with_usd" as any)
      .select("*") as any);
    
    // Apply organization filtering
    query = applyOrganizationFilterToQuery(query, context, { organization_id: context.selectedOrganizationId });

    // Apply date filters if provided
    if (filters.dateRange?.from) {
      query = query.gte("opportunity_created_date", filters.dateRange.from);
    }
    if (filters.dateRange?.to) {
      query = query.lte("opportunity_created_date", filters.dateRange.to);
    }

    // Apply region filter if provided
    if (filters.region && filters.region.length > 0) {
      query = query.in("customer_country" as any, filters.region as any);
    }

    // Apply customer tier filter
    if (filters.customerTier && filters.customerTier.length > 0) {
      query = query.in("customer_tier" as any, filters.customerTier as any);
    }

    // Apply stage filter
    if (filters.stage && filters.stage.length > 0) {
      query = query.in("opportunity_stage_name" as any, filters.stage as any);
    }

    // Apply lead type filter
    if (filters.leadType && filters.leadType.length > 0) {
      query = query.in("opportunity_lead_source" as any, filters.leadType as any);
    }

    // Apply product type filter (maps to `type`)
    if (filters.productType && filters.productType.length > 0) {
      query = query.in("opportunity_type" as any, filters.productType as any);
    }

    // Apply customer type filter (maps to `market_segment`)
    if (filters.customerType && filters.customerType.length > 0) {
      query = query.in("customer_market_segment" as any, filters.customerType as any);
    }

    // Apply simple search across key fields
    if (filters.searchText && filters.searchText.trim().length > 0) {
      const s = filters.searchText.trim();
      query = query.or(
        `opportunity_name.ilike.%${s}%,opportunity_stage_name.ilike.%${s}%,customer_tier.ilike.%${s}%,customer_country.ilike.%${s}%`
      );
    }

    // Apply default sorting by created date
    query = query.order("opportunity_created_date", { 
      ascending: false,
      nullsFirst: false
    });

    // Get total count first with organization awareness
    const countQuery = (context.supabase
      .from("mv_opportunities_with_usd" as any)
      .select("*", { count: "exact", head: true }) as any);
    
    // Apply organization filtering
    applyOrganizationFilterToQuery(countQuery, context, { organization_id: context.selectedOrganizationId });
    
    // Apply same filters to count query
    if (filters.dateRange?.from) {
      countQuery.gte("opportunity_created_date", filters.dateRange.from);
    }
    if (filters.dateRange?.to) {
      countQuery.lte("opportunity_created_date", filters.dateRange.to);
    }
    if (filters.region && filters.region.length > 0) {
      countQuery.in("customer_country" as any, filters.region as any);
    }
    if (filters.customerTier && filters.customerTier.length > 0) {
      countQuery.in("customer_tier" as any, filters.customerTier as any);
    }
    if (filters.stage && filters.stage.length > 0) {
      countQuery.in("opportunity_stage_name" as any, filters.stage as any);
    }
    if (filters.leadType && filters.leadType.length > 0) {
      countQuery.in("opportunity_lead_source" as any, filters.leadType as any);
    }
    if (filters.productType && filters.productType.length > 0) {
      countQuery.in("opportunity_type" as any, filters.productType as any);
    }
    if (filters.customerType && filters.customerType.length > 0) {
      countQuery.in("customer_market_segment" as any, filters.customerType as any);
    }
    if (filters.searchText && filters.searchText.trim().length > 0) {
      const s = filters.searchText.trim();
      countQuery.or(
        `opportunity_name.ilike.%${s}%,opportunity_stage_name.ilike.%${s}%,customer_tier.ilike.%${s}%,customer_country.ilike.%${s}%`
      );
    }

    const { count, error: countError } = await executeQueryWithTimeout(countQuery);
    
    if (countError) {
      console.error("❌ [Salesforce Opportunities API] Count error:", countError);
      throw new Error(`Count error: ${countError.message}`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: opportunities, error } = await executeQueryWithTimeout(query);

    if (error) {
      console.error("❌ [Salesforce Opportunities API] Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / pageSize);

    return NextResponse.json({
      data: opportunities || [],
      totalRecords,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  } catch (err: any) {
    console.error("❌ [Salesforce Opportunities API] Error:", err);
    return NextResponse.json(
      {
        error: "SALESFORCE_OPPORTUNITIES_ERROR",
        details: err.message,
        traceId: Date.now().toString(),
      },
      { status: 500 }
    );
  }
}

// Export handlers with enhanced authentication
export const GET = withEnhancedAuth(handleOpportunitiesGET);
export const POST = withEnhancedAuth(handleOpportunitiesPOST);
