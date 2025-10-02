import { NextRequest, NextResponse } from "next/server";
import { soqlQuery } from "@/lib/salesforce";
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
    }T23:59:59Z AND SBQQ__Primary__c = true`;

    // SOQL query with conditional limit
    const soql = `
      SELECT 
        Id, Name, SBQQ__Status__c, SBQQ__ExpirationDate__c, CreatedDate, SBQQ__EndDate__c,
        SBQQ__NetAmount__c, SBQQ__Type__c, SBQQ__Account__c, SBQQ__PrimaryContact__c,
        SBQQ__BillingCountry__c, SBQQ__ShippingCountry__c, SBQQ__BillingCity__c, SBQQ__ShippingCity__c,
        SBQQ__BillingState__c, SBQQ__ShippingState__c, SBQQ__PaymentTerms__c, SBQQ__BillingFrequency__c,
        SBQQ__ContractingMethod__c, SBQQ__Ordered__c, SBQQ__Primary__c, Renewal__c, Amendment__c,
        Cancellation_Quote__c, ApprovalStatus__c, Subsidiary__c, CustomerCountry__c, OppShippingCountry__c,
        Quote_Total__c, Total_ARR__c, New_ARR__c, Annual_Recurring_Revenue__c, CurrencyIsoCode,
        OwnerId, SBQQ__Opportunity2__c, LastModifiedDate
      FROM SBQQ__Quote__c 
      ${where}
      ORDER BY CreatedDate DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    console.log(`📊 [Salesforce Quotes] Fetching quotes from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    const quotes = await soqlQuery<any>(soql, tenantId);

    // Deduplicate quotes by Id to prevent ON CONFLICT errors
    const uniqueQuotes = quotes.reduce((acc: any[], quote: any) => {
      const existingIndex = acc.findIndex(q => q.Id === quote.Id);
      if (existingIndex === -1) {
        acc.push(quote);
      } else {
        console.warn(`⚠️ [Salesforce Quotes] Duplicate quote found: ${quote.Id} - keeping first occurrence`);
      }
      return acc;
    }, []);

    // Keep only the newest primary quote per opportunity
    const quotesByOpportunity = new Map();
    uniqueQuotes.forEach(quote => {
      if (quote.SBQQ__Opportunity2__c && quote.SBQQ__Primary__c === true) {
        const existingQuote = quotesByOpportunity.get(quote.SBQQ__Opportunity2__c);
        if (!existingQuote || new Date(quote.CreatedDate) > new Date(existingQuote.CreatedDate)) {
          quotesByOpportunity.set(quote.SBQQ__Opportunity2__c, quote);
        }
      }
    });

    // Filter to keep only the newest primary quote per opportunity + all non-primary quotes
    const filteredQuotes = uniqueQuotes.filter(quote => {
      if (quote.SBQQ__Opportunity2__c && quote.SBQQ__Primary__c === true) {
        const newestPrimary = quotesByOpportunity.get(quote.SBQQ__Opportunity2__c);
        return newestPrimary && newestPrimary.Id === quote.Id;
      }
      return true; // Keep all non-primary quotes
    });

    console.log(`📊 [Salesforce Quotes] Filtered to ${filteredQuotes.length} quotes (kept newest primary per opportunity)`);

    let successCount = 0;
    let errorCount = 0;
    const totalQuotes = filteredQuotes.length;

    if (stream) {
      // Streaming processing with Server-Sent Events
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          // Send initial progress
          const initialProgress = {
            type: 'progress',
            data: {
              total: totalQuotes,
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
          
          // Process quotes in batches for better performance
          const BATCH_SIZE = 10; // Match orders batch size for consistency
          const totalBatches = Math.ceil(filteredQuotes.length / BATCH_SIZE);

          for (let i = 0; i < filteredQuotes.length; i += BATCH_SIZE) {
            const batch = filteredQuotes.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const progress = Math.round(((i + batch.length) / totalQuotes) * 100);

            console.log(`📦 [Salesforce Quotes] Processing batch ${batchNumber}/${totalBatches} (${batch.length} quotes) - Progress: ${i + batch.length}/${totalQuotes} (${progress}%)`);

            // Additional deduplication within batch to prevent ON CONFLICT errors
            const uniqueBatch = batch.reduce((acc: any[], quote: any) => {
              if (!acc.find(q => q.Id === quote.Id)) {
                acc.push(quote);
              }
              return acc;
            }, []);

            if (uniqueBatch.length !== batch.length) {
              console.warn(`⚠️ [Salesforce Quotes] Batch ${batchNumber} had ${batch.length - uniqueBatch.length} duplicates removed`);
            }

            // Transform quotes to include proper field mapping and lookups
            const transformedBatch = await Promise.all(uniqueBatch.map(async (quote: any) => {
              // Look up opportunity_id if SBQQ__Opportunity2__c exists
              let opportunityId = null;
              if (quote.SBQQ__Opportunity2__c) {
                const { data: oppData } = await (supabaseAdmin as any)
                  .from("salesforce_opportunities")
                  .select("id")
                  .eq("salesforce_id", quote.SBQQ__Opportunity2__c)
                  .single();
                opportunityId = oppData?.id || null;
              }

              return {
                salesforce_id: quote.Id,
                name: quote.Name,
                status: quote.SBQQ__Status__c,
                expiration_date: quote.SBQQ__ExpirationDate__c,
                start_date: quote.CreatedDate,
                end_date: quote.SBQQ__EndDate__c,
                net_amount: quote.SBQQ__NetAmount__c,
                quote_type: quote.SBQQ__Type__c,
                account_id: quote.SBQQ__Account__c,
                primary_contact_id: quote.SBQQ__PrimaryContact__c,
                billing_country: quote.SBQQ__BillingCountry__c,
                shipping_country: quote.SBQQ__ShippingCountry__c,
                billing_city: quote.SBQQ__BillingCity__c,
                shipping_city: quote.SBQQ__ShippingCity__c,
                billing_state: quote.SBQQ__BillingState__c,
                shipping_state: quote.SBQQ__ShippingState__c,
                payment_terms: quote.SBQQ__PaymentTerms__c,
                billing_frequency: quote.SBQQ__BillingFrequency__c,
                contracting_method: quote.SBQQ__ContractingMethod__c,
                is_ordered: quote.SBQQ__Ordered__c,
                is_primary: quote.SBQQ__Primary__c,
                is_renewal: quote.Renewal__c,
                is_amendment: quote.Amendment__c,
                is_cancellation: quote.Cancellation_Quote__c,
                approval_status: quote.ApprovalStatus__c,
                subsidiary: quote.Subsidiary__c,
                customer_country: quote.CustomerCountry__c,
                opp_shipping_country: quote.OppShippingCountry__c,
                quote_total: quote.Quote_Total__c,
                total_arr: quote.Total_ARR__c,
                new_arr: quote.New_ARR__c,
                annual_recurring_revenue: quote.Annual_Recurring_Revenue__c,
                currency_iso_code: quote.CurrencyIsoCode,
                owner_id: quote.OwnerId,
                opportunity_id_raw: quote.SBQQ__Opportunity2__c,
                opportunity_id: opportunityId,
                raw_data: quote,
                fetched_at: new Date().toISOString(),
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            }));

            // Final deduplication of transformed batch by salesforce_id
            const finalBatch = transformedBatch.reduce((acc: any[], transformedQuote: any) => {
              if (!acc.find(q => q.salesforce_id === transformedQuote.salesforce_id)) {
                acc.push(transformedQuote);
              } else {
                console.warn(`⚠️ [Salesforce Quotes] Duplicate salesforce_id in transformed batch: ${transformedQuote.salesforce_id}`);
              }
              return acc;
            }, []);

            // Use batch upsert function with retry logic
            const maxRetries = 3;
            let retryCount = 0;
            let batchSuccess = false;
            
            while (retryCount < maxRetries && !batchSuccess) {
              try {
                console.log(`💾 [Salesforce Quotes] Upserting batch ${batchNumber} with ${finalBatch.length} quotes...`);
                const { data, error } = await (supabaseAdmin as any)
                  .from("salesforce_quotes")
                  .upsert(finalBatch, {
                    onConflict: "salesforce_id",
                    ignoreDuplicates: false,
                  });

                if (error) {
                  // Check for duplicate conflict errors - fallback to individual upserts
                  if (error.code === '21000' && error.message.includes('cannot affect row a second time')) {
                    console.warn(`⚠️ [Salesforce Quotes] Batch conflict detected, falling back to individual upserts for batch ${batchNumber}`);
                    
                    let individualSuccessCount = 0;
                    let individualErrorCount = 0;
                    
                    for (const quote of finalBatch) {
                      try {
                        // Check if quote already exists
                        const { data: existingQuote } = await (supabaseAdmin as any)
                          .from("salesforce_quotes")
                          .select("id, updated_at")
                          .eq("salesforce_id", quote.salesforce_id)
                          .single();

                        if (existingQuote) {
                          // Update existing quote
                          const { error: updateError } = await (supabaseAdmin as any)
                            .from("salesforce_quotes")
                            .update({
                              ...quote,
                              id: existingQuote.id, // Keep existing ID
                              updated_at: new Date().toISOString()
                            })
                            .eq("salesforce_id", quote.salesforce_id);
                          
                          if (updateError) {
                            console.error(`❌ [Salesforce Quotes] Update failed for ${quote.salesforce_id}:`, updateError);
                            individualErrorCount++;
                          } else {
                            individualSuccessCount++;
                          }
                        } else {
                          // Insert new quote
                          const { error: insertError } = await (supabaseAdmin as any)
                            .from("salesforce_quotes")
                            .insert([quote]);
                          
                          if (insertError) {
                            console.error(`❌ [Salesforce Quotes] Insert failed for ${quote.salesforce_id}:`, insertError);
                            individualErrorCount++;
                          } else {
                            individualSuccessCount++;
                          }
                        }
                      } catch (individualSaveError) {
                        console.error(`❌ [Salesforce Quotes] Individual save exception for ${quote.salesforce_id}:`, individualSaveError);
                        individualErrorCount++;
                      }
                    }
                    
                    successCount += individualSuccessCount;
                    errorCount += individualErrorCount;
                    console.log(`✅ [Salesforce Quotes] Batch ${batchNumber} completed individually: ${individualSuccessCount} success, ${individualErrorCount} errors`);
                    batchSuccess = true;
                    break;
                  }
                  
                  // Check for 502 Bad Gateway or similar errors
                  if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                    if (retryCount < maxRetries - 1) {
                      retryCount++;
                      console.log(`🔄 [Salesforce Quotes] Retrying batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                      continue;
                    }
                  }
                  
                  console.error(`❌ [Salesforce Quotes] Error in batch ${batchNumber}:`, error);
                  errorCount += batch.length;
                  batchSuccess = true; // Exit retry loop
                } else {
                  successCount += finalBatch.length;
                  console.log(`✅ [Salesforce Quotes] Batch ${batchNumber} upserted successfully: ${finalBatch.length} quotes`);
                  batchSuccess = true; // Exit retry loop
                }
              } catch (saveError) {
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`🔄 [Salesforce Quotes] Retrying batch ${batchNumber} due to exception (attempt ${retryCount + 1}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                  continue;
                }
                console.error(`❌ [Salesforce Quotes] Error in batch ${batchNumber}:`, saveError);
                errorCount += batch.length;
                batchSuccess = true; // Exit retry loop
              }
            }

            // Send progress update
            const progressUpdate = {
              type: 'progress',
              data: {
                total: totalQuotes,
                processed: i + batch.length,
                percentage: progress,
                successCount,
                errorCount,
                completed: i + batch.length >= uniqueQuotes.length
              }
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressUpdate)}\n\n`));

            // Add delay between batches to prevent overwhelming the database
            if (i + BATCH_SIZE < uniqueQuotes.length) {
              await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
            }
          }
          
          // Send final result
          const finalResult = {
            type: 'complete',
            data: {
              success: true,
              count: totalQuotes,
              successCount,
              errorCount,
              progress: {
                total: totalQuotes,
                processed: totalQuotes,
                percentage: 100,
                completed: true
              },
              dateRange: {
                from: startDate.toISOString(),
                to: endDate.toISOString(),
              },
              message: errorCount > 0
                ? `Downloaded ${uniqueQuotes.length} quotes. ${successCount} saved successfully, ${errorCount} had errors.`
                : `Successfully downloaded and saved ${uniqueQuotes.length} quotes.`,
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
      if (filteredQuotes.length > 0) {
        console.log(`📊 [Salesforce Quotes] Starting to process ${filteredQuotes.length} quotes...`);

        // Process in batches of 10 to avoid overwhelming the database
        const BATCH_SIZE = 10;

        for (let i = 0; i < filteredQuotes.length; i += BATCH_SIZE) {
          const batch = filteredQuotes.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(filteredQuotes.length / BATCH_SIZE);
          const progress = Math.round(((i + batch.length) / filteredQuotes.length) * 100);

          console.log(`📦 [Salesforce Quotes] Processing batch ${batchNumber}/${totalBatches} (${batch.length} quotes) - Progress: ${i + batch.length}/${filteredQuotes.length} (${progress}%)`);

          // Additional deduplication within batch to prevent ON CONFLICT errors
          const uniqueBatch = batch.reduce((acc: any[], quote: any) => {
            if (!acc.find(q => q.Id === quote.Id)) {
              acc.push(quote);
            }
            return acc;
          }, []);

          if (uniqueBatch.length !== batch.length) {
            console.warn(`⚠️ [Salesforce Quotes] Batch ${batchNumber} had ${batch.length - uniqueBatch.length} duplicates removed`);
          }

          // Transform quotes to include proper field mapping and lookups
          const transformedBatch = await Promise.all(uniqueBatch.map(async (quote: any) => {
            // Look up opportunity_id if SBQQ__Opportunity2__c exists
            let opportunityId = null;
            if (quote.SBQQ__Opportunity2__c) {
              const { data: oppData } = await (supabaseAdmin as any)
                .from("salesforce_opportunities")
                .select("id")
                .eq("salesforce_id", quote.SBQQ__Opportunity2__c)
                .single();
              opportunityId = oppData?.id || null;
            }

            return {
              salesforce_id: quote.Id,
              name: quote.Name,
              status: quote.SBQQ__Status__c,
              expiration_date: quote.SBQQ__ExpirationDate__c,
              start_date: quote.CreatedDate,
              end_date: quote.SBQQ__EndDate__c,
              net_amount: quote.SBQQ__NetAmount__c,
              quote_type: quote.SBQQ__Type__c,
              account_id: quote.SBQQ__Account__c,
              primary_contact_id: quote.SBQQ__PrimaryContact__c,
              billing_country: quote.SBQQ__BillingCountry__c,
              shipping_country: quote.SBQQ__ShippingCountry__c,
              billing_city: quote.SBQQ__BillingCity__c,
              shipping_city: quote.SBQQ__ShippingCity__c,
              billing_state: quote.SBQQ__BillingState__c,
              shipping_state: quote.SBQQ__ShippingState__c,
              payment_terms: quote.SBQQ__PaymentTerms__c,
              billing_frequency: quote.SBQQ__BillingFrequency__c,
              contracting_method: quote.SBQQ__ContractingMethod__c,
              is_ordered: quote.SBQQ__Ordered__c,
              is_primary: quote.SBQQ__Primary__c,
              is_renewal: quote.Renewal__c,
              is_amendment: quote.Amendment__c,
              is_cancellation: quote.Cancellation_Quote__c,
              approval_status: quote.ApprovalStatus__c,
              subsidiary: quote.Subsidiary__c,
              customer_country: quote.CustomerCountry__c,
              opp_shipping_country: quote.OppShippingCountry__c,
              quote_total: quote.Quote_Total__c,
              total_arr: quote.Total_ARR__c,
              new_arr: quote.New_ARR__c,
              annual_recurring_revenue: quote.Annual_Recurring_Revenue__c,
              currency_iso_code: quote.CurrencyIsoCode,
              owner_id: quote.OwnerId,
              opportunity_id_raw: quote.SBQQ__Opportunity2__c,
              opportunity_id: opportunityId,
              raw_data: quote,
              fetched_at: new Date().toISOString(),
              tenant_id: tenantId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }));

          // Final deduplication of transformed batch by salesforce_id
          const finalBatch = transformedBatch.reduce((acc: any[], transformedQuote: any) => {
            if (!acc.find(q => q.salesforce_id === transformedQuote.salesforce_id)) {
              acc.push(transformedQuote);
            } else {
              console.warn(`⚠️ [Salesforce Quotes] Duplicate salesforce_id in transformed batch: ${transformedQuote.salesforce_id}`);
            }
            return acc;
          }, []);

          // Use batch upsert function with retry logic
          const maxRetries = 3;
          let retryCount = 0;
          let batchSuccess = false;
          
          while (retryCount < maxRetries && !batchSuccess) {
            try {
              console.log(`💾 [Salesforce Quotes] Upserting batch ${batchNumber} with ${finalBatch.length} quotes...`);
              const { data, error } = await (supabaseAdmin as any)
                .from("salesforce_quotes")
                .upsert(finalBatch, {
                  onConflict: "salesforce_id",
                  ignoreDuplicates: false,
                });

              if (error) {
                // Check for duplicate conflict errors - fallback to individual upserts
                if (error.code === '21000' && error.message.includes('cannot affect row a second time')) {
                  console.warn(`⚠️ [Salesforce Quotes] Batch conflict detected, falling back to individual upserts for batch ${batchNumber}`);
                  
                  let individualSuccessCount = 0;
                  let individualErrorCount = 0;
                  
                  for (const quote of finalBatch) {
                    try {
                      // Check if quote already exists
                      const { data: existingQuote } = await (supabaseAdmin as any)
                        .from("salesforce_quotes")
                        .select("id, updated_at")
                        .eq("salesforce_id", quote.salesforce_id)
                        .single();

                      if (existingQuote) {
                        // Update existing quote
                        const { error: updateError } = await (supabaseAdmin as any)
                          .from("salesforce_quotes")
                          .update({
                            ...quote,
                            id: existingQuote.id, // Keep existing ID
                            updated_at: new Date().toISOString()
                          })
                          .eq("salesforce_id", quote.salesforce_id);
                        
                        if (updateError) {
                          console.error(`❌ [Salesforce Quotes] Update failed for ${quote.salesforce_id}:`, updateError);
                          individualErrorCount++;
                        } else {
                          individualSuccessCount++;
                        }
                      } else {
                        // Insert new quote
                        const { error: insertError } = await (supabaseAdmin as any)
                          .from("salesforce_quotes")
                          .insert([quote]);
                        
                        if (insertError) {
                          console.error(`❌ [Salesforce Quotes] Insert failed for ${quote.salesforce_id}:`, insertError);
                          individualErrorCount++;
                        } else {
                          individualSuccessCount++;
                        }
                      }
                    } catch (individualSaveError) {
                      console.error(`❌ [Salesforce Quotes] Individual save exception for ${quote.salesforce_id}:`, individualSaveError);
                      individualErrorCount++;
                    }
                  }
                  
                  successCount += individualSuccessCount;
                  errorCount += individualErrorCount;
                  console.log(`✅ [Salesforce Quotes] Batch ${batchNumber} completed individually: ${individualSuccessCount} success, ${individualErrorCount} errors`);
                  batchSuccess = true;
                  break;
                }
                
                // Check for 502 Bad Gateway or similar errors
                if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                  if (retryCount < maxRetries - 1) {
                    retryCount++;
                    console.log(`🔄 [Salesforce Quotes] Retrying batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                    continue;
                  }
                }
                
                console.error(`❌ [Salesforce Quotes] Error in batch ${batchNumber}:`, error);
                errorCount += batch.length;
                batchSuccess = true; // Exit retry loop
              } else {
                successCount += finalBatch.length;
                console.log(`✅ [Salesforce Quotes] Batch ${batchNumber} upserted successfully: ${finalBatch.length} quotes`);
                batchSuccess = true; // Exit retry loop
              }
            } catch (saveError) {
              if (retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`🔄 [Salesforce Quotes] Retrying batch ${batchNumber} due to exception (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                continue;
              }
              console.error(`❌ [Salesforce Quotes] Error in batch ${batchNumber}:`, saveError);
              errorCount += batch.length;
              batchSuccess = true; // Exit retry loop
            }
          }

          console.log(`✅ [Salesforce Quotes] Batch ${batchNumber} completed - Success: ${successCount}, Errors: ${errorCount}`);

          // Add delay between batches to prevent overwhelming the database
          if (i + BATCH_SIZE < uniqueQuotes.length) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
          }
        }
        console.log(`✅ [Salesforce Quotes] Completed processing ${uniqueQuotes.length} quotes. Final: ${successCount} success, ${errorCount} errors`);
      }
    }

    return NextResponse.json({
      success: true,
      count: totalQuotes,
      successCount,
      errorCount,
      progress: {
        total: totalQuotes,
        processed: totalQuotes,
        percentage: 100,
        completed: true
      },
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      message: errorCount > 0
        ? `Downloaded ${uniqueQuotes.length} quotes. ${successCount} saved successfully, ${errorCount} had errors.`
        : `Successfully downloaded and saved ${uniqueQuotes.length} quotes.`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("❌ [Salesforce Quotes] Error:", error);
    return NextResponse.json(
      { error: "Failed to download quotes", details: error },
      { status: 500 }
    );
  }
}