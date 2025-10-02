import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  requireTenant,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/authServer";
import { netSuiteClient } from "@/lib/netsuiteClient";
import { z } from "zod";

// Helper function to normalize currency names to ISO codes
function normalizeCurrencyName(currencyName: string): string {
  const currencyMap: Record<string, string> = {
    // Common NetSuite currency names to ISO codes
    'US Dollar': 'USD',
    'United States Dollar': 'USD',
    'USD': 'USD',
    'Euro': 'EUR',
    'EUR': 'EUR',
    'British Pound': 'GBP',
    'Pound Sterling': 'GBP',
    'GBP': 'GBP',
    'Canadian Dollar': 'CAD',
    'CAD': 'CAD',
    'Australian Dollar': 'AUD',
    'AUD': 'AUD',
    'Japanese Yen': 'JPY',
    'JPY': 'JPY',
    'Swiss Franc': 'CHF',
    'CHF': 'CHF',
    'Swedish Krona': 'SEK',
    'SEK': 'SEK',
    'Norwegian Krone': 'NOK',
    'NOK': 'NOK',
    'Danish Krone': 'DKK',
    'DKK': 'DKK',
    'Chinese Yuan': 'CNY',
    'CNY': 'CNY',
    'Indian Rupee': 'INR',
    'INR': 'INR',
    'Brazilian Real': 'BRL',
    'BRL': 'BRL',
    'Mexican Peso': 'MXN',
    'MXN': 'MXN',
    'South African Rand': 'ZAR',
    'ZAR': 'ZAR',
    'Korean Won': 'KRW',
    'KRW': 'KRW',
    'Singapore Dollar': 'SGD',
    'SGD': 'SGD',
    'Hong Kong Dollar': 'HKD',
    'HKD': 'HKD',
    'New Zealand Dollar': 'NZD',
    'NZD': 'NZD',
    'Polish Zloty': 'PLN',
    'PLN': 'PLN',
    'Czech Koruna': 'CZK',
    'CZK': 'CZK',
    'Hungarian Forint': 'HUF',
    'HUF': 'HUF',
    'Israeli Shekel': 'ILS',
    'ILS': 'ILS',
    'Turkish Lira': 'TRY',
    'TRY': 'TRY',
    'Russian Ruble': 'RUB',
    'RUB': 'RUB',
    'Thai Baht': 'THB',
    'THB': 'THB',
    'Malaysian Ringgit': 'MYR',
    'MYR': 'MYR',
    'Philippine Peso': 'PHP',
    'PHP': 'PHP',
    'Indonesian Rupiah': 'IDR',
    'IDR': 'IDR',
    'Vietnamese Dong': 'VND',
    'VND': 'VND'
  };
  
  // Try exact match first
  const normalized = currencyMap[currencyName];
  if (normalized) {
    return normalized;
  }
  
  // Try case-insensitive match
  const lowerName = currencyName.toLowerCase();
  for (const [key, value] of Object.entries(currencyMap)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // If no match found, store the original currency name for manual review
  console.warn(`⚠️ [Currency] Unknown currency name: "${currencyName}", storing as-is for manual review`);
  return currencyName;
}

const RequestSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  daysBack: z.number().min(1).max(2000).default(365),
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();
    const { dateFrom, dateTo, daysBack } = RequestSchema.parse(body);

  

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

    const dateFromStr = startDate.toISOString().split('T')[0];
    const dateToStr = endDate.toISOString().split('T')[0];

   

    // Process credit memos in batches (like invoices)
    const BATCH_SIZE = 100;
    let totalProcessed = 0;
    let totalUpserted = 0;
    let offset = 0;
    let hasMore = true;

   

    while (hasMore) {
     
      
      // Fetch current batch from NetSuite
      const data = await netSuiteClient.fetchCreditMemos(dateFromStr, dateToStr, BATCH_SIZE, offset);
      
      if (!data.items || data.items.length === 0) {
     
        hasMore = false;
        break;
      }

      
      
      // Log total count estimate on first batch
      if (offset === 0 && data.totalResults) {
        console.log(`📈 [NetSuite] Total credit memos to download: ~${data.totalResults} (NetSuite reports ${data.totalResults} total)`);
      }
      
      // Transform current batch
      const processedCreditMemos = data.items.map((creditMemo: any, index: number) => {
        // Debug currency information for first few credit memos
        if (index < 3) {
          const currencyName = creditMemo.currency?.refName || 'US Dollar';
          const normalizedCurrency = normalizeCurrencyName(currencyName);
          console.log(`🔍 [NetSuite] Credit Memo ${creditMemo.tranId} currency debug:`, {
            currency_object: creditMemo.currency,
            currency_id: creditMemo.currency?.id,
            currency_name: creditMemo.currency?.refName,
            normalized_currency: normalizedCurrency,
            exchange_rate: creditMemo.exchangeRate,
            total: creditMemo.total
          });
        }
        
        // Normalize currency name to ISO code
        const currencyName = creditMemo.currency?.refName || 'US Dollar';
        const normalizedCurrency = normalizeCurrencyName(currencyName);
        
        return {
          netsuite_id: creditMemo.id,
          tran_id: creditMemo.tranId || null,
          trandate: creditMemo.tranDate || null,
          entity_id: creditMemo.entity?.id || null,
          entity_name: creditMemo.entity?.refName || null,
          memo: creditMemo.memo || null,
          status: creditMemo.status?.refName || null,
          subtotal: creditMemo.subTotal || null,
          tax_total: creditMemo.taxTotal || null,
          total: creditMemo.total || null,
          currency_id: normalizedCurrency, // Store ISO code instead of NetSuite ID
          created_date: creditMemo.createdDate || null,
          last_modified_date: creditMemo.lastModifiedDate || null,
          raw_data: creditMemo,
          fetched_at: new Date().toISOString(),
          tenant_id: tenantId,
        };
      });

      // Upsert current batch to Supabase in smaller batches
      const UPSERT_BATCH_SIZE = 25;
      
      for (let i = 0; i < processedCreditMemos.length; i += UPSERT_BATCH_SIZE) {
        const batch = processedCreditMemos.slice(i, i + UPSERT_BATCH_SIZE);
        const batchNumber = Math.floor(i/UPSERT_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(processedCreditMemos.length/UPSERT_BATCH_SIZE);
      
        console.log(`📦 [NetSuite] Processing credit memo upsert batch ${batchNumber}/${totalBatches} (${batch.length} credit memos)`);
        
        // Add retry logic for upsert operations
        const maxRetries = 3;
        let retryCount = 0;
        let batchSuccess = false;
        
        while (retryCount < maxRetries && !batchSuccess) {
          try {
            console.log(`💾 [NetSuite] Upserting credit memo batch ${batchNumber} with ${batch.length} credit memos...`);
            const { data: upsertData, error } = await (supabaseAdmin as any)
              .from("netsuite_credit_memos")
              .upsert(batch, {
                onConflict: "netsuite_id",
                ignoreDuplicates: false,
              });

            if (error) {
              // Check for 502 Bad Gateway or similar errors
              if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`🔄 [NetSuite] Retrying credit memo batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                  continue;
                }
              }
              console.error(`❌ [NetSuite] Error upserting credit memo batch ${batchNumber}:`, error);
              throw error;
            }

            totalUpserted += batch.length;
            batchSuccess = true;
            console.log(`✅ [NetSuite] Successfully upserted credit memo batch ${batchNumber} (${batch.length} credit memos)`);
            
          } catch (batchError) {
            if (retryCount < maxRetries - 1) {
              retryCount++;
              console.log(`🔄 [NetSuite] Retrying credit memo batch ${batchNumber} due to error (attempt ${retryCount + 1}/${maxRetries}):`, batchError);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            }
            console.error(`❌ [NetSuite] Error processing credit memo batch ${batchNumber}:`, batchError);
            throw batchError;
          }
        }
        
        // Small delay between upsert batches
        if (i + UPSERT_BATCH_SIZE < processedCreditMemos.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      totalProcessed += data.items.length;
      console.log(`✅ [NetSuite] Successfully processed ${data.items.length} credit memos for batch ${Math.floor(offset/BATCH_SIZE) + 1}`);
      
      // Check if we got fewer items than requested (end of data)
      if (data.items.length < BATCH_SIZE) {
        console.log(`📊 [NetSuite] Reached end of credit memos data (got ${data.items.length} < ${BATCH_SIZE})`);
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }

      // Small delay between NetSuite batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`📄 [NetSuite Credit Memos] Processing complete: ${totalUpserted} successful, ${totalProcessed - totalUpserted} errors`);

    return NextResponse.json({
      success: true,
      count: totalUpserted,
      total: totalProcessed,
      errors: totalProcessed - totalUpserted,
      message: `Successfully processed ${totalUpserted} credit memos`,
    });

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("❌ [NetSuite Credit Memos] Error:", error);
    return NextResponse.json(
      { error: "Failed to download credit memos", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
