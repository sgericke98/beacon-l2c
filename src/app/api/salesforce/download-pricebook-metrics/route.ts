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
  // No date range needed for pricebook metrics as they are current state
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();
    RequestSchema.parse(body);

    const calculationDate = new Date().toISOString().split('T')[0];

    console.log(`📊 [Pricebook Metrics] Calculating current pricebook metrics`);

    // Query for all pricebooks
    const pricebooksSoql = `
      SELECT Id, Name, IsActive, CreatedDate, LastModifiedDate
      FROM Pricebook2
      ORDER BY CreatedDate DESC
    `;

    let pricebooks: any[] = [];
    try {
      pricebooks = await soqlQuery<any>(pricebooksSoql, tenantId);
    } catch (error) {
      console.error("❌ [Pricebook Metrics] Query failed:", error);
      throw new Error(`Failed to query pricebooks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const totalPricebooks = pricebooks.length;
    const activePricebooks = pricebooks.filter(pb => pb.IsActive === true).length;

    console.log(`📊 [Pricebook Metrics] Found ${totalPricebooks} total pricebooks, ${activePricebooks} active`);

    // Prepare pricebook data for upsert - storing individual pricebooks
    const pricebookData = pricebooks.map(pricebook => ({
      id: pricebook.Id,
      name: pricebook.Name,
      is_active: pricebook.IsActive,
      created_date: pricebook.CreatedDate,
      last_modified_date: pricebook.LastModifiedDate,
    }));

    // Upsert the pricebook data
    const { data, error } = await (supabaseAdmin as any)
      .from("pricebook_raw")
      .upsert(pricebookData, {
        onConflict: "id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("❌ [Pricebook Metrics] Error upserting data:", error);
      throw new Error(`Failed to save pricebook metrics: ${error.message}`);
    }

    console.log(`✅ [Pricebook Metrics] Successfully saved ${pricebookData.length} pricebooks to pricebook_raw`);

    return NextResponse.json({
      success: true,
      metric: {
        total_pricebooks: totalPricebooks,
        active_pricebooks: activePricebooks,
        pricebooks_saved: pricebookData.length,
        calculation_date: calculationDate,
      },
      message: `Successfully downloaded and saved ${pricebookData.length} pricebooks to pricebook_raw. Found ${totalPricebooks} total pricebooks with ${activePricebooks} active.`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("❌ [Pricebook Metrics] Error:", error);
    return NextResponse.json(
      { error: "Failed to download pricebook metrics", details: error },
      { status: 500 }
    );
  }
}
