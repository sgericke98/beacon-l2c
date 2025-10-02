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
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().min(1).optional(), // No maximum limit
  daysBack: z.number().min(1).max(365).default(30),
  stream: z.boolean().default(false), // Enable streaming progress updates
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();
    const { dateFrom, dateTo, limit, daysBack, stream } = RequestSchema.parse(body);

    // Calculate date range if not provided
    let startDate: Date;
    let endDate: Date;

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    } else {
      // Default to daysBack if no dates provided
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
    }

    const where = `WHERE CreatedDate >= ${
      startDate.toISOString().split("T")[0]
    }T00:00:00Z AND CreatedDate <= ${
      endDate.toISOString().split("T")[0]
    }T23:59:59Z`;
    let orders: any[] = [];
    let soql: string;

    try {
      // Full query with all custom fields
      soql = `
        SELECT
          Id,
          OrderNumber,
          OpportunityId,
          Status,
          EffectiveDate,
          TotalAmount,
          CreatedDate,
          Type,
          SBQQ__Quote__c,
          Billing_Frequency__c,
          Shipping_Address_Country_Code__c,
          CurrencyIsoCode,
          LastModifiedDate,
          AccountId,
          OwnerId
        FROM Order
        ${where}
        ORDER BY CreatedDate DESC
        ${limit ? `LIMIT ${limit}` : ''}
      `;
      orders = await soqlQuery<any>(soql, tenantId);

    } catch (queryError: any) {
      console.error("❌ [Salesforce Orders] Query failed:", queryError);
      throw new Error(`Failed to download orders from Salesforce: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`);
    }

    // Deduplicate orders by Id to prevent ON CONFLICT errors
    const uniqueOrders = orders.reduce((acc: any[], order: any) => {
      if (!acc.find(o => o.Id === order.Id)) {
        acc.push(order);
      }
      return acc;
    }, []);
    // Save orders to Supabase with progress tracking
    let successCount = 0;
    let errorCount = 0;
    const totalOrders = uniqueOrders.length;

    if (uniqueOrders.length > 0) {
      console.log(`📊 [Salesforce Orders] Starting to process ${totalOrders} orders...`);
      
      // If streaming is enabled, set up streaming response
      if (stream) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send initial progress
            const initialProgress = {
              type: 'progress',
              data: {
                total: totalOrders,
                processed: 0,
                percentage: 0,
                successCount: 0,
                errorCount: 0,
                completed: false
              }
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialProgress)}\n\n`));
          },
          async pull(controller) {
            // Process orders in batches for better performance
            const BATCH_SIZE = 10; // Reduced to prevent 502 errors
            const totalBatches = Math.ceil(uniqueOrders.length / BATCH_SIZE);

            for (let i = 0; i < uniqueOrders.length; i += BATCH_SIZE) {
              const batch = uniqueOrders.slice(i, i + BATCH_SIZE);
              const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
              const progress = Math.round(((i + batch.length) / totalOrders) * 100);

              console.log(`📦 [Salesforce Orders] Processing batch ${batchNumber}/${totalBatches} (${batch.length} orders) - Progress: ${i + batch.length}/${totalOrders} (${progress}%)`);

              // Transform orders to include proper field mapping and lookups
              const transformedBatch = await Promise.all(batch.map(async (order: any) => {
                // Look up opportunity_id if OpportunityId exists
                let opportunityId = null;
                if (order.OpportunityId) {
                  const { data: oppData } = await (supabaseAdmin as any)
                    .from("salesforce_opportunities")
                    .select("id")
                    .eq("salesforce_id", order.OpportunityId)
                    .single();
                  opportunityId = oppData?.id || null;
                }

                // Look up quote_id if SBQQ__Quote__c exists
                let quoteId = null;
                if (order.SBQQ__Quote__c) {
                  const { data: quoteData } = await (supabaseAdmin as any)
                    .from("salesforce_quotes")
                    .select("id")
                    .eq("salesforce_id", order.SBQQ__Quote__c)
                    .single();
                  quoteId = quoteData?.id || null;
                }

                return {
                  salesforce_id: order.Id,
                  name: order.OrderNumber,
                  status: order.Status,
                  effective_date: order.EffectiveDate,
                  total_amount: order.TotalAmount,
                  order_type: order.Type,
                  account_id: order.AccountId,
                  billing_frequency: order.Billing_Frequency__c,
                  order_number: order.OrderNumber,
                  shipping_country_code: order.Shipping_Address_Country_Code__c,
                  currency_iso_code: order.CurrencyIsoCode,
                  created_date: order.CreatedDate,
                  opportunity_id_raw: order.OpportunityId,
                  opportunity_id: opportunityId,
                  quote_id_raw: order.SBQQ__Quote__c,
                  quote_id: quoteId,
                  raw_data: order,
                  fetched_at: new Date().toISOString(),
                  tenant_id: tenantId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
              }));

              // Use batch upsert function for better performance
              const maxRetries = 3;
              let retryCount = 0;
              let batchSuccess = false;
              
              while (retryCount < maxRetries && !batchSuccess) {
                try {
                  console.log(`💾 [Salesforce Orders] Upserting batch ${batchNumber} with ${transformedBatch.length} orders...`);
                  const { data, error } = await (supabaseAdmin as any)
                    .from("salesforce_orders")
                    .upsert(transformedBatch, {
                      onConflict: "salesforce_id",
                      ignoreDuplicates: false,
                    });

                  if (error) {
                    // Check for 502 Bad Gateway or similar errors
                    if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                      if (retryCount < maxRetries - 1) {
                        retryCount++;
                        console.log(`🔄 [Salesforce Orders] Retrying batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                        continue;
                      }
                    }
                    
                    console.error(`❌ [Salesforce Orders] Error in batch ${batchNumber}:`, error);
                    errorCount += batch.length;
                    batchSuccess = true; // Exit retry loop
                  } else {
                    successCount += transformedBatch.length;
                    console.log(`✅ [Salesforce Orders] Batch ${batchNumber} upserted successfully: ${transformedBatch.length} orders`);
                    batchSuccess = true; // Exit retry loop
                  }
                } catch (saveError) {
                  if (retryCount < maxRetries - 1) {
                    retryCount++;
                    console.log(`🔄 [Salesforce Orders] Retrying batch ${batchNumber} due to exception (attempt ${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                    continue;
                  }
                  console.error(`❌ [Salesforce Orders] Error in batch ${batchNumber}:`, saveError);
                  errorCount += batch.length;
                  batchSuccess = true; // Exit retry loop
                }
              }

              // Send progress update
              const progressUpdate = {
                type: 'progress',
                data: {
                  total: totalOrders,
                  processed: i + batch.length,
                  percentage: progress,
                  successCount,
                  errorCount,
                  completed: i + batch.length >= uniqueOrders.length
                }
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressUpdate)}\n\n`));

              // Add delay between batches to prevent overwhelming the database
              if (i + BATCH_SIZE < uniqueOrders.length) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
              }
            }
            
            // Send final result
            const finalResult = {
              type: 'complete',
              data: {
                success: true,
                count: uniqueOrders.length,
                successCount,
                errorCount,
                dateRange: {
                  from: startDate.toISOString(),
                  to: endDate.toISOString(),
                },
                message: errorCount > 0
                  ? `Downloaded ${uniqueOrders.length} orders. ${successCount} saved successfully, ${errorCount} had errors.`
                  : `Successfully downloaded and saved ${uniqueOrders.length} orders.`,
              }
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalResult)}\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } else {
        // Non-streaming processing with batching
        if (uniqueOrders.length > 0) {
          console.log(`📊 [Salesforce Orders] Starting to process ${uniqueOrders.length} orders...`);

          // Process in batches of 10 to avoid overwhelming the database
          const BATCH_SIZE = 10;

          for (let i = 0; i < uniqueOrders.length; i += BATCH_SIZE) {
            const batch = uniqueOrders.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(uniqueOrders.length / BATCH_SIZE);
            const progress = Math.round(((i + batch.length) / uniqueOrders.length) * 100);

            console.log(`📦 [Salesforce Orders] Processing batch ${batchNumber}/${totalBatches} (${batch.length} orders) - Progress: ${i + batch.length}/${uniqueOrders.length} (${progress}%)`);

            // Transform orders to include proper field mapping and lookups
            const transformedBatch = await Promise.all(batch.map(async (order: any) => {
            // Look up opportunity_id if OpportunityId exists
            let opportunityId = null;
            if (order.OpportunityId) {
              const { data: oppData } = await (supabaseAdmin as any)
                .from("salesforce_opportunities")
                .select("id")
                .eq("salesforce_id", order.OpportunityId)
                .single();
              opportunityId = oppData?.id || null;
            }

            // Look up quote_id if SBQQ__Quote__c exists
            let quoteId = null;
            if (order.SBQQ__Quote__c) {
              const { data: quoteData } = await (supabaseAdmin as any)
                .from("salesforce_quotes")
                .select("id")
                .eq("salesforce_id", order.SBQQ__Quote__c)
                .single();
              quoteId = quoteData?.id || null;
            }

              return {
                salesforce_id: order.Id,
                name: order.OrderNumber,
                status: order.Status,
                effective_date: order.EffectiveDate,
                total_amount: order.TotalAmount,
                order_type: order.Type,
                account_id: order.AccountId,
                billing_frequency: order.Billing_Frequency__c,
                order_number: order.OrderNumber,
                shipping_country_code: order.Shipping_Address_Country_Code__c,
                currency_iso_code: order.CurrencyIsoCode,
                created_date: order.CreatedDate,
                opportunity_id_raw: order.OpportunityId,
                opportunity_id: opportunityId,
                quote_id_raw: order.SBQQ__Quote__c,
                quote_id: quoteId,
                raw_data: order,
                fetched_at: new Date().toISOString(),
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            }));

            // Use batch upsert function for better performance
            const maxRetries = 3;
            let retryCount = 0;
            let batchSuccess = false;
            
            while (retryCount < maxRetries && !batchSuccess) {
              try {
                console.log(`💾 [Salesforce Orders] Upserting batch ${batchNumber} with ${transformedBatch.length} orders...`);
                const { data, error } = await (supabaseAdmin as any)
                  .from("salesforce_orders")
                  .upsert(transformedBatch, {
                    onConflict: "salesforce_id",
                    ignoreDuplicates: false,
                  });

                if (error) {
                  // Check for 502 Bad Gateway or similar errors
                  if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                    if (retryCount < maxRetries - 1) {
                      retryCount++;
                      console.log(`🔄 [Salesforce Orders] Retrying batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                      continue;
                    }
                  }
                  
                  console.error(`❌ [Salesforce Orders] Error in batch ${batchNumber}:`, error);
                  errorCount += batch.length;
                  batchSuccess = true; // Exit retry loop
                } else {
                  successCount += transformedBatch.length;
                  console.log(`✅ [Salesforce Orders] Batch ${batchNumber} upserted successfully: ${transformedBatch.length} orders`);
                  batchSuccess = true; // Exit retry loop
                }
              } catch (saveError) {
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`🔄 [Salesforce Orders] Retrying batch ${batchNumber} due to exception (attempt ${retryCount + 1}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                  continue;
                }
                console.error(`❌ [Salesforce Orders] Error in batch ${batchNumber}:`, saveError);
                errorCount += batch.length;
                batchSuccess = true; // Exit retry loop
              }
            }

            console.log(`✅ [Salesforce Orders] Batch ${batchNumber} completed - Success: ${successCount}, Errors: ${errorCount}`);

            // Add delay between batches to prevent overwhelming the database
            if (i + BATCH_SIZE < uniqueOrders.length) {
              await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
            }
          }
          console.log(`✅ [Salesforce Orders] Completed processing ${uniqueOrders.length} orders. Final: ${successCount} success, ${errorCount} errors`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: uniqueOrders.length,
      successCount,
      errorCount,
      progress: {
        total: uniqueOrders.length,
        processed: uniqueOrders.length,
        percentage: 100,
        completed: true
      },
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      message:
        errorCount > 0
          ? `Downloaded ${uniqueOrders.length} orders. ${successCount} saved successfully, ${errorCount} had errors.`
          : `Successfully downloaded and saved ${uniqueOrders.length} orders.`,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("❌ [Salesforce Orders] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to download orders",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
