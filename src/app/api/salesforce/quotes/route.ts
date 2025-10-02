import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { executeQueryWithTimeout } from "@/lib/queryTimeout";
import { z } from "zod";

const FiltersSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(1000).default(1000),
  sortBy: z.string().default("quote_created_date"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  searchText: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = FiltersSchema.parse({
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "50"),
      sortBy: searchParams.get("sortBy") || "quote_created_date",
      sortDirection: searchParams.get("sortDirection") || "desc",
      searchText: searchParams.get("searchText"),
    });

    let query = supabase
      .from("mv_quotes_with_usd")
      .select("*");

    // Apply search
    if (parsed.searchText && parsed.searchText.trim().length > 0) {
      const s = parsed.searchText.trim();
      query = query.or(
        `quote_name.ilike.%${s}%,quote_status.ilike.%${s}%,quote_type.ilike.%${s}%,billing_country.ilike.%${s}%`
      );
    }

    // Apply default sorting by created date
    query = query.order("quote_created_date", {
      ascending: false,
      nullsFirst: false
    });

    // Get total count first
    const countQuery = supabase
      .from("mv_quotes_with_usd")
      .select("*", { count: "exact", head: true });
    
    // Apply same filters to count query
    if (parsed.searchText && parsed.searchText.trim().length > 0) {
      const s = parsed.searchText.trim();
      countQuery.or(
        `quote_name.ilike.%${s}%,quote_status.ilike.%${s}%,quote_type.ilike.%${s}%,billing_country.ilike.%${s}%`
      );
    }

    const { count, error: countError } = await executeQueryWithTimeout(countQuery);
    
    if (countError) {
      console.error("❌ [Salesforce Quotes] Count error:", countError);
      return NextResponse.json(
        { error: "Failed to count quotes", details: countError.message },
        { status: 500 }
      );
    }

    // Apply pagination
    const from = (parsed.page - 1) * parsed.pageSize;
    const to = from + parsed.pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await executeQueryWithTimeout(query);

    if (error) {
      console.error("❌ [Salesforce Quotes] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch quotes", details: error.message },
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
    console.error("❌ [Salesforce Quotes] Error:", error);
    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
