import { NextRequest, NextResponse } from "next/server";
import { soqlQuery } from "../../../../lib/salesforce";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  requireTenant,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/authServer";
import { z } from "zod";

const RequestSchema = z.object({
  // No date range needed for product metrics as they are current state
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();
    RequestSchema.parse(body);

    const calculationDate = new Date().toISOString().split('T')[0];

    console.log(`📊 [Product Metrics] Calculating current product metrics`);

    // Query for all products
    const productsSoql = `
      SELECT Id, Name, ProductCode, IsActive, CreatedDate, LastModifiedDate
      FROM Product2
      ORDER BY CreatedDate DESC
    `;

    let products: any[] = [];
    try {
      products = await soqlQuery<any>(productsSoql, tenantId);
    } catch (error) {
      console.error("❌ [Product Metrics] Query failed:", error);
      throw new Error(`Failed to query products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const totalProducts = products.length;
    const activeProducts = products.filter(product => product.IsActive === true).length;

    console.log(`📊 [Product Metrics] Found ${totalProducts} total products, ${activeProducts} active`);

    // Prepare product data for upsert - storing individual products
    const productData = products.map(product => ({
      id: product.Id,
      name: product.Name,
      product_code: product.ProductCode || 'N/A', // Handle null ProductCode
      is_active: product.IsActive,
      created_date: product.CreatedDate,
      last_modified_date: product.LastModifiedDate,
    }));

    // Upsert the product data
    const { data, error } = await (supabaseAdmin as any)
      .from("products_raw")
      .upsert(productData, {
        onConflict: "id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("❌ [Product Metrics] Error upserting data:", error);
      throw new Error(`Failed to save product metrics: ${error.message}`);
    }

    console.log(`✅ [Product Metrics] Successfully saved ${productData.length} products to products_raw`);

    return NextResponse.json({
      success: true,
      metric: {
        total_products: totalProducts,
        active_products: activeProducts,
        products_saved: productData.length,
        calculation_date: calculationDate,
      },
      message: `Successfully downloaded and saved ${productData.length} products to products_raw. Found ${totalProducts} total products with ${activeProducts} active.`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("❌ [Product Metrics] Error:", error);
    return NextResponse.json(
      { error: "Failed to download product metrics", details: error },
      { status: 500 }
    );
  }
}
