import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const RequestSchema = z.object({
  filters: z.object({}).optional().default({}),
  sortBy: z.string().optional().default("name"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.number().optional().default(1),
  pageSize: z.number().optional().default(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, sortBy = 'name', sortDirection = 'asc', page = 1, pageSize = 100 } = RequestSchema.parse(body);

    // Fetch ALL products using offset-based pagination (like dashboard-unified does)
    const PAGE_SIZE = 1000;
    let offset = 0;
    const allProducts: any[] = [];

    console.log(`📊 [Products Metrics] Fetching all products from products_raw table`);

    while (true) {
      const { data: productRecords, error } = await (supabaseAdmin as any)
        .from("products_raw")
        .select("*")
        .order(sortBy, { ascending: sortDirection === 'asc' })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("❌ [Products Metrics API] Database error:", error);
        return NextResponse.json(
          { error: "Failed to fetch products", details: error },
          { status: 500 }
        );
      }

      if (!productRecords || productRecords.length === 0) {
        break; // No more data
      }

      allProducts.push(...productRecords);
      offset += PAGE_SIZE;

      if (productRecords.length < PAGE_SIZE) {
        break; // No more pages
      }
    }

    console.log(`📊 [Products Metrics] Fetched ${allProducts.length} total products`);

    // Transform the data for the table
    const detailedData = allProducts.map((product: any) => ({
      id: product.id,
      name: product.name,
      product_code: product.product_code,
      is_active: product.is_active,
      status: product.is_active ? "Active" : "Inactive",
      created_date: product.created_date,
      last_modified_date: product.last_modified_date,
    }));

    const summary = {
      total_products: allProducts.length,
      active_products: allProducts.filter((p: any) => p.is_active).length,
      inactive_products: allProducts.filter((p: any) => !p.is_active).length,
    };

    return NextResponse.json({
      success: true,
      detailed_data: detailedData, // This contains ALL individual product records
      summary,
      pagination: {
        page: 1,
        pageSize: allProducts.length,
        total: allProducts.length,
      },
    });
  } catch (error) {
    console.error("❌ [Products Metrics API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products metrics", details: error },
      { status: 500 }
    );
  }
}
