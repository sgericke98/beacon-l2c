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
  daysBack: z.number().min(1).max(2000).default(365),
  stream: z.boolean().default(false), // Enable streaming progress updates
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();
    const { dateFrom, dateTo, limit, daysBack, stream } = RequestSchema.parse(body);

    // Calculate date range
    let startDate: Date;
    let endDate: Date;
    
    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
    }

    const where = `WHERE CreatedDate >= ${
      startDate.toISOString().split("T")[0]
    }T00:00:00Z AND CreatedDate <= ${
      endDate.toISOString().split("T")[0]
    }T23:59:59Z`;

    let opportunities: any[] = [];
    let soql: string;

    try {
      // Full query with all custom fields including auto-renewal fields
      soql = `
        SELECT
          Id, Name, CreatedDate, CloseDate, Amount, StageName, Type, LeadSource, Description,
          Probability, IsClosed, IsWon, AccountId, OwnerId, CurrencyIsoCode, LastModifiedDate,
          Customer_Tier__c, Market_Segment__c, Channel__c, CustomerCountry__c,
          SBQQ__Renewal__c, Auto_Renew_Quote__c
        FROM Opportunity
        ${where}
        ORDER BY CreatedDate DESC
        ${limit ? `LIMIT ${limit}` : ''}
      `;
      opportunities = await soqlQuery<any>(soql, tenantId);
    } catch (error) {
      console.error("❌ [Salesforce Opportunities] Query failed:", error);
      throw new Error(`Failed to download opportunities from Salesforce: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Map Salesforce field names to database column names and deduplicate
    const uniqueOpportunities = opportunities.reduce((acc: any[], opportunity: any) => {
      if (!acc.find(o => o.salesforce_id === opportunity.Id)) {
        acc.push({
          salesforce_id: opportunity.Id,
          name: opportunity.Name,
          created_date: opportunity.CreatedDate,
          close_date: opportunity.CloseDate,
          amount: opportunity.Amount,
          stage_name: opportunity.StageName,
          type: opportunity.Type,
          lead_source: opportunity.LeadSource,
          customer_tier: opportunity.Customer_Tier__c,
          market_segment: opportunity.Market_Segment__c,
          channel: opportunity.Channel__c,
          currency_iso_code: opportunity.CurrencyIsoCode,
          customer_country: opportunity.CustomerCountry__c,
          sbqq_renewal: opportunity.SBQQ__Renewal__c,
          auto_renew_quote: opportunity.Auto_Renew_Quote__c,
          raw_data: opportunity,
          fetched_at: new Date().toISOString(),
          tenant_id: tenantId,
        });
      } else {
        console.warn(`⚠️ [Salesforce Opportunities] Duplicate opportunity found: ${opportunity.Id}`);
      }
      return acc;
    }, []);

    console.log(`📊 [Salesforce Opportunities] Found ${uniqueOpportunities.length} unique opportunities to process`);

    let successCount = 0;
    let errorCount = 0;
    const totalOpportunities = uniqueOpportunities.length;

    if (stream) {
      // Streaming processing with Server-Sent Events
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          // Send initial progress
          const initialProgress = {
            type: 'progress',
            data: {
              total: totalOpportunities,
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
          const encoder = new TextEncoder();
          
          // Process opportunities in batches for better performance
          const BATCH_SIZE = 25;
          const totalBatches = Math.ceil(uniqueOpportunities.length / BATCH_SIZE);

          for (let i = 0; i < uniqueOpportunities.length; i += BATCH_SIZE) {
            const batch = uniqueOpportunities.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const progress = Math.round(((i + batch.length) / totalOpportunities) * 100);

            console.log(`📦 [Salesforce Opportunities] Processing batch ${batchNumber}/${totalBatches} (${batch.length} opportunities) - Progress: ${i + batch.length}/${totalOpportunities} (${progress}%)`);

            // Use batch upsert function with retry logic
            const maxRetries = 3;
            let retryCount = 0;
            let batchSuccess = false;
            
            while (retryCount < maxRetries && !batchSuccess) {
              try {
                console.log(`💾 [Salesforce Opportunities] Upserting batch ${batchNumber} with ${batch.length} opportunities...`);
                const { data, error } = await (supabaseAdmin as any)
                  .from("salesforce_opportunities")
                  .upsert(batch, {
                    onConflict: "salesforce_id",
                    ignoreDuplicates: false,
                  });

                if (error) {
                  // Check for 502 Bad Gateway or similar errors
                  if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                    if (retryCount < maxRetries - 1) {
                      retryCount++;
                      console.log(`🔄 [Salesforce Opportunities] Retrying batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                      continue;
                    }
                  }
                  
                  console.error(`❌ [Salesforce Opportunities] Error in batch ${batchNumber}:`, error);
                  errorCount += batch.length;
                  batchSuccess = true; // Exit retry loop
                } else {
                  successCount += batch.length;
                  console.log(`✅ [Salesforce Opportunities] Batch ${batchNumber} upserted successfully: ${batch.length} opportunities`);
                  batchSuccess = true; // Exit retry loop
                }
              } catch (saveError) {
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`🔄 [Salesforce Opportunities] Retrying batch ${batchNumber} due to exception (attempt ${retryCount + 1}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                  continue;
                }
                console.error(`❌ [Salesforce Opportunities] Error in batch ${batchNumber}:`, saveError);
                errorCount += batch.length;
                batchSuccess = true; // Exit retry loop
              }
            }

            // Send progress update
            const progressUpdate = {
              type: 'progress',
              data: {
                total: totalOpportunities,
                processed: i + batch.length,
                percentage: progress,
                successCount,
                errorCount,
                completed: i + batch.length >= uniqueOpportunities.length
              }
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressUpdate)}\n\n`));

            // Add delay between batches to prevent overwhelming the database
            if (i + BATCH_SIZE < uniqueOpportunities.length) {
              await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
            }
          }
          
          // Send final result
          const finalResult = {
            type: 'complete',
            data: {
              success: true,
              count: uniqueOpportunities.length,
              successCount,
              errorCount,
              progress: {
                total: uniqueOpportunities.length,
                processed: uniqueOpportunities.length,
                percentage: 100,
                completed: true
              },
              dateRange: {
                from: startDate.toISOString(),
                to: endDate.toISOString(),
              },
              message: errorCount > 0
                ? `Downloaded ${uniqueOpportunities.length} opportunities. ${successCount} saved successfully, ${errorCount} had errors.`
                : `Successfully downloaded and saved ${uniqueOpportunities.length} opportunities.`,
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
      if (uniqueOpportunities.length > 0) {
        console.log(`📊 [Salesforce Opportunities] Starting to process ${uniqueOpportunities.length} opportunities...`);

        // Process in batches of 25 to avoid overwhelming the database
        const BATCH_SIZE = 25;

        for (let i = 0; i < uniqueOpportunities.length; i += BATCH_SIZE) {
          const batch = uniqueOpportunities.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(uniqueOpportunities.length / BATCH_SIZE);
          const progress = Math.round(((i + batch.length) / uniqueOpportunities.length) * 100);

          console.log(`📦 [Salesforce Opportunities] Processing batch ${batchNumber}/${totalBatches} (${batch.length} opportunities) - Progress: ${i + batch.length}/${uniqueOpportunities.length} (${progress}%)`);

          // Use batch upsert function with retry logic
          const maxRetries = 3;
          let retryCount = 0;
          let batchSuccess = false;
          
          while (retryCount < maxRetries && !batchSuccess) {
            try {
              console.log(`💾 [Salesforce Opportunities] Upserting batch ${batchNumber} with ${batch.length} opportunities...`);
              const { data, error } = await (supabaseAdmin as any)
                .from("salesforce_opportunities")
                .upsert(batch, {
                  onConflict: "salesforce_id",
                  ignoreDuplicates: false,
                });

              if (error) {
                // Check for 502 Bad Gateway or similar errors
                if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                  if (retryCount < maxRetries - 1) {
                    retryCount++;
                    console.log(`🔄 [Salesforce Opportunities] Retrying batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                    continue;
                  }
                }
                
                console.error(`❌ [Salesforce Opportunities] Error in batch ${batchNumber}:`, error);
                errorCount += batch.length;
                batchSuccess = true; // Exit retry loop
              } else {
                successCount += batch.length;
                console.log(`✅ [Salesforce Opportunities] Batch ${batchNumber} upserted successfully: ${batch.length} opportunities`);
                batchSuccess = true; // Exit retry loop
              }
            } catch (saveError) {
              if (retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`🔄 [Salesforce Opportunities] Retrying batch ${batchNumber} due to exception (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                continue;
              }
              console.error(`❌ [Salesforce Opportunities] Error in batch ${batchNumber}:`, saveError);
              errorCount += batch.length;
              batchSuccess = true; // Exit retry loop
            }
          }

          console.log(`✅ [Salesforce Opportunities] Batch ${batchNumber} completed - Success: ${successCount}, Errors: ${errorCount}`);

          // Add delay between batches to prevent overwhelming the database
          if (i + BATCH_SIZE < uniqueOpportunities.length) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
          }
        }
        console.log(`✅ [Salesforce Opportunities] Completed processing ${uniqueOpportunities.length} opportunities. Final: ${successCount} success, ${errorCount} errors`);
      }
    }

    return NextResponse.json({
      success: true,
      count: uniqueOpportunities.length,
      successCount,
      errorCount,
      progress: {
        total: uniqueOpportunities.length,
        processed: uniqueOpportunities.length,
        percentage: 100,
        completed: true
      },
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      message: errorCount > 0
        ? `Downloaded ${uniqueOpportunities.length} opportunities. ${successCount} saved successfully, ${errorCount} had errors.`
        : `Successfully downloaded and saved ${uniqueOpportunities.length} opportunities.`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("❌ [Salesforce Opportunities] Error:", error);
    return NextResponse.json(
      { error: "Failed to download opportunities", details: error },
      { status: 500 }
    );
  }
}