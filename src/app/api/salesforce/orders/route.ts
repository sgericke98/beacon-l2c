import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { executeQueryWithTimeout } from "@/lib/queryTimeout";
import { z } from "zod";

const FiltersSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(1000).default(1000),
  sortBy: z.string().default("order_created_date"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  searchText: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = FiltersSchema.parse({
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "50"),
      sortBy: searchParams.get("sortBy") || "order_created_date",
      sortDirection: searchParams.get("sortDirection") || "desc",
      searchText: searchParams.get("searchText"),
    });

    let query = supabase
      .from("mv_orders_with_usd")
      .select("*");

    // Apply search
    if (parsed.searchText && parsed.searchText.trim().length > 0) {
      const s = parsed.searchText.trim();
      query = query.or(
        `order_name.ilike.%${s}%,order_status.ilike.%${s}%,order_type.ilike.%${s}%,shipping_country_code.ilike.%${s}%`
      );
    }

    // Apply default sorting by created date
    query = query.order("order_created_date", {
      ascending: false,
      nullsFirst: false
    });

    // Get total count first
    const countQuery = supabase
      .from("mv_orders_with_usd")
      .select("*", { count: "exact", head: true });
    
    // Apply same filters to count query
    if (parsed.searchText && parsed.searchText.trim().length > 0) {
      const s = parsed.searchText.trim();
      countQuery.or(
        `order_name.ilike.%${s}%,order_status.ilike.%${s}%,order_type.ilike.%${s}%,shipping_country_code.ilike.%${s}%`
      );
    }

    const { count, error: countError } = await executeQueryWithTimeout(countQuery);
    
    if (countError) {
      console.error("❌ [Salesforce Orders] Count error:", countError);
      return NextResponse.json(
        { error: "Failed to count orders", details: countError.message },
        { status: 500 }
      );
    }

    // Apply pagination
    const from = (parsed.page - 1) * parsed.pageSize;
    const to = from + parsed.pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await executeQueryWithTimeout(query);

    if (error) {
      console.error("❌ [Salesforce Orders] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders", details: error.message },
        { status: 500 }
      );
    }

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / parsed.pageSize);

    return NextResponse.json({
      data: data || [],
      totalRecords,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages,
      hasNextPage: parsed.page < totalPages,
      hasPreviousPage: parsed.page > 1,
    });
  } catch (error) {
    console.error("❌ [Salesforce Orders] Error:", error);
    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
