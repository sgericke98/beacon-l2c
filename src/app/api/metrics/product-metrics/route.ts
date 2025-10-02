import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  requireTenant,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/authServer";
import { z } from "zod";

const RequestSchema = z.object({
  filters: z.object({
    dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional(),
    customerTier: z.string().optional(),
    marketSegment: z.string().optional(),
    leadSource: z.string().optional(),
    opportunityType: z.string().optional(),
    customerCountry: z.string().optional(),
    dealSize: z.string().optional(),
  }).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();
    const { filters, sortBy = 'calculation_date', sortDirection = 'desc', page = 1, pageSize = 100 } = RequestSchema.parse(body);

    

    // Get the latest product metrics
    const { data: productMetrics, error } = await supabaseAdmin
      .from("salesforce_product_metrics")
      .select("*")
      .eq("tenant_id", tenantId)
      .order(sortBy, { ascending: sortDirection === 'asc' })
      .limit(pageSize)
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error("❌ [Product Metrics API] Error fetching data:", error);
      throw new Error(`Failed to fetch product metrics: ${error.message}`);
    }

    // Transform the data for the modal
    const detailedData = (productMetrics || []).map((metric: any) => ({
      id: metric.id,
      name: "Product Catalogue",
      total: metric.total_products || 0,
      active: metric.active_products || 0,
      inactive: (metric.total_products || 0) - (metric.active_products || 0),
      calculation_date: metric.calculation_date,
      status: "Active",
      created_at: metric.created_at,
      updated_at: metric.updated_at,
    }));

    // Calculate summary statistics
    const summary = {
      total_records: detailedData.length,
      latest_total_products: detailedData.length > 0 ? detailedData[0].total : 0,
      latest_active_products: detailedData.length > 0 ? detailedData[0].active : 0,
      latest_calculation_date: detailedData.length > 0 ? detailedData[0].calculation_date : null,
    };

   

    return NextResponse.json({
      success: true,
      detailed_data: detailedData,
      summary,
      pagination: {
        page,
        pageSize,
        total: detailedData.length,
      },
    });

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("❌ [Product Metrics API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product metrics", details: error },
      { status: 500 }
    );
  }
}
