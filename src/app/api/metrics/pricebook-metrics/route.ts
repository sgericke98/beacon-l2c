import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
    const body = await request.json();
    const { filters, sortBy = 'name', sortDirection = 'asc', page = 1, pageSize = 100 } = RequestSchema.parse(body);

    // Get individual pricebook records from pricebook_raw table (no tenant filtering like dashboard-unified)
    const { data: pricebookRecords, error } = await (supabaseAdmin as any)
      .from("pricebook_raw")
      .select("*")
      .order(sortBy, { ascending: sortDirection === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error("❌ [Pricebook Metrics API] Error fetching data:", error);
      throw new Error(`Failed to fetch pricebook records: ${error.message}`);
    }

    // Transform the data for the modal - show individual pricebooks
    const detailedData = (pricebookRecords || []).map((pricebook: any) => ({
      id: pricebook.id,
      name: pricebook.name,
      is_active: pricebook.is_active,
      created_date: pricebook.created_date,
      last_modified_date: pricebook.last_modified_date,
      status: pricebook.is_active ? "Active" : "Inactive",
    }));

    // Calculate summary statistics
    const totalPricebooks = pricebookRecords?.length || 0;
    const activePricebooks = pricebookRecords?.filter((pb: any) => pb.is_active === true).length || 0;
    const inactivePricebooks = totalPricebooks - activePricebooks;

    const summary = {
      total_records: totalPricebooks,
      active_pricebooks: activePricebooks,
      inactive_pricebooks: inactivePricebooks,
      latest_calculation_date: new Date().toISOString().split('T')[0],
    };

    return NextResponse.json({
      success: true,
      detailed_data: detailedData,
      summary,
      pagination: {
        page,
        pageSize,
        total: totalPricebooks,
      },
    });

  } catch (error) {
    console.error("❌ [Pricebook Metrics API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricebook metrics", details: error },
      { status: 500 }
    );
  }
}
