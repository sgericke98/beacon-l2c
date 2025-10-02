import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { executeQueryWithTimeout } from "@/lib/queryTimeout";
import { z } from "zod";

const FiltersSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(1000).default(1000),
  sortBy: z.string().default("credit_memo_created_date"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  searchText: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = FiltersSchema.parse({
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "50"),
      sortBy: searchParams.get("sortBy") || "credit_memo_created_date",
      sortDirection: searchParams.get("sortDirection") || "desc",
      searchText: searchParams.get("searchText"),
    });

    let query = supabase
      .from("mv_credit_memos_with_usd")
      .select("*");

    // Apply search
    if (parsed.searchText && parsed.searchText.trim().length > 0) {
      const s = parsed.searchText.trim();
      query = query.or(
        `credit_memo_customer_name.ilike.%${s}%,credit_memo_transaction_id.ilike.%${s}%,credit_memo_status.ilike.%${s}%`
      );
    }

    // Apply default sorting by created date
    query = query.order("credit_memo_created_date", {
      ascending: false,
      nullsFirst: false
    });

    // Get total count first
    const countQuery = supabase
      .from("mv_credit_memos_with_usd")
      .select("*", { count: "exact", head: true });
    
    // Apply same filters to count query
    if (parsed.searchText && parsed.searchText.trim().length > 0) {
      const s = parsed.searchText.trim();
      countQuery.or(
        `credit_memo_customer_name.ilike.%${s}%,credit_memo_transaction_id.ilike.%${s}%,credit_memo_status.ilike.%${s}%`
      );
    }

    const { count, error: countError } = await executeQueryWithTimeout(countQuery);
    
    if (countError) {
      console.error("❌ [NetSuite Credit Memos] Count error:", countError);
      return NextResponse.json(
        { error: "Failed to count credit memos", details: countError.message },
        { status: 500 }
      );
    }

    // Apply pagination
    const from = (parsed.page - 1) * parsed.pageSize;
    const to = from + parsed.pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await executeQueryWithTimeout(query);

    if (error) {
      console.error("❌ [NetSuite Credit Memos] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch credit memos", details: error.message },
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
    console.error("❌ [NetSuite Credit Memos] Error:", error);
    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
