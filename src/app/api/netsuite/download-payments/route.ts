import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  requireTenant,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/authServer";
import { netSuiteClient } from "@/lib/netsuiteClient";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
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

// Helper function to convert data to CSV format
function arrayToCSV(data: any[], filename: string, backupDir: string = "backups") {
  if (!data || data.length === 0) return null;
  
  // Create backup directory if it doesn't exist
  const backupPath = join(process.cwd(), backupDir);
  if (!existsSync(backupPath)) {
    mkdirSync(backupPath, { recursive: true });
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle null/undefined values
        if (value === null || value === undefined) return '';
        // Escape commas and quotes in string values
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        // Handle objects by stringifying them
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  // Write to file with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = join(backupPath, `${filename}_${timestamp}.csv`);
  writeFileSync(filePath, csvContent, 'utf8');
  
  console.log(`💾 [Backup] Saved ${data.length} records to ${filePath}`);
  return filePath;
}

const RequestSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().min(1).optional(),
  daysBack: z.number().min(1).max(2000).default(365),
  stream: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenant(req);
    const body = await req.json();
    const { dateFrom, dateTo, limit, daysBack, stream } = RequestSchema.parse(body);

    // Set a timeout for the entire operation (30 minutes)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout after 30 minutes')), 30 * 60 * 1000);
    });

    const operationPromise = processPaymentDownload(tenantId, dateFrom || '', dateTo || '', limit, daysBack, stream);
    
    return await Promise.race([operationPromise, timeoutPromise]) as NextResponse;
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        {
          error: "Forbidden",
          details: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    console.error("❌ [NetSuite] Payment download error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function processPaymentDownload(tenantId: string, dateFrom: string, dateTo: string, limit?: number, daysBack?: number, stream?: boolean) {
  try {
    // Calculate date range
    let effectiveDateFrom: string;
    let effectiveDateTo: string;
    
    if (dateFrom && dateTo) {
      effectiveDateFrom = dateFrom;
      effectiveDateTo = dateTo;
    } else {
      const today = new Date();
      effectiveDateTo = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (daysBack || 365));
      effectiveDateFrom = startDate.toISOString().split('T')[0];
    }

    const BATCH_SIZE = 50; // Fetch from NetSuite in smaller batches of 50
    let totalProcessed = 0;
    let totalApplyRelationships = 0;
    let allRawData: any[] = [];
    let allTransformedPayments: any[] = [];
    let allApplyRelationships: any[] = [];
    let offset = 0;
    let hasMore = true;

    console.log(`🔍 [NetSuite] Starting batch processing of payments from ${effectiveDateFrom} to ${effectiveDateTo} (batch size: ${BATCH_SIZE})${limit ? `, limit: ${limit}` : ' (no limit)'}`);

    while (hasMore && (!limit || totalProcessed < limit)) {
      const currentBatchSize = limit ? Math.min(BATCH_SIZE, limit - totalProcessed) : BATCH_SIZE;
      
      console.log(`📦 [NetSuite] Processing batch ${Math.floor(offset/BATCH_SIZE) + 1} - fetching ${currentBatchSize} payments (offset: ${offset})`);
      
      const data = await netSuiteClient.fetchCustomerPayments(effectiveDateFrom, effectiveDateTo, currentBatchSize, offset);
      
      if (!data.items || data.items.length === 0) {
        console.log(`📊 [NetSuite] No more payments found at offset ${offset}`);
        hasMore = false;
        break;
      }

      console.log(`📊 [NetSuite] Retrieved ${data.items.length} payments for batch ${Math.floor(offset/BATCH_SIZE) + 1}`);
      
      // Log total count estimate on first batch
      if (offset === 0 && data.totalResults) {
        const estimatedTotal = limit ? Math.min(data.totalResults, limit) : data.totalResults;
        console.log(`📈 [NetSuite] Total payments to download: ~${estimatedTotal} (NetSuite reports ${data.totalResults} total)${limit ? ` (limited to ${limit})` : ''}`);
      }
      
      allRawData.push(...data.items);

      // Transform payments
      const transformedPayments = data.items.map((payment: any, index: number) => {
        // Debug currency information for first few payments
        if (index < 3) {
          const currencyName = payment.currency?.refName || 'US Dollar';
          const normalizedCurrency = normalizeCurrencyName(currencyName);
          console.log(`🔍 [NetSuite] Payment ${payment.tranId} currency debug:`, {
            currency_object: payment.currency,
            currency_id: payment.currency?.id,
            currency_name: payment.currency?.refName,
            normalized_currency: normalizedCurrency,
            exchange_rate: payment.exchangeRate,
            total: payment.total
          });
        }
        
        // Normalize currency name to ISO code
        const currencyName = payment.currency?.refName || 'US Dollar';
        const normalizedCurrency = normalizeCurrencyName(currencyName);
        
        return {
          netsuite_id: payment.id?.toString(),
          tran_id: payment.tranId,
          tran_date: payment.tranDate,
          entity_name: payment.customer?.refName || null,
          entity_id: payment.customer?.id?.toString() || null,
          total: payment.total ? parseFloat(payment.total) : 0,
          status: payment.status?.refName || null,
          memo: payment.memo || null,
          currency_id: normalizedCurrency, // Store ISO code instead of NetSuite ID
          exchange_rate: 1, // Set to 1 since we'll use our own exchange rates
          created_date: payment.createdDate,
          last_modified_date: payment.lastModifiedDate,
          payment_method: payment.account?.refName || null,
          reference_number: payment.memo || null,
          raw_data: payment,
          tenant_id: tenantId,
        };
      });

      allTransformedPayments.push(...transformedPayments);

      // Process apply relationships
      const batchApplyRelationships = [];
      for (const payment of data.items) {
        if (payment.applyRelationships && payment.applyRelationships.length > 0) {
          for (const applyRel of payment.applyRelationships) {
            let daysToPayment = null;
            if (applyRel.applyDate && applyRel.paymentDate) {
              try {
                const invoiceDate = new Date(applyRel.applyDate);
                const paymentDate = new Date(applyRel.paymentDate);
                daysToPayment = Math.floor((paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
              } catch (error) {
                console.warn(`⚠️ [NetSuite] Could not calculate days to payment for ${applyRel.invoiceNumber}:`, error);
              }
            }

            batchApplyRelationships.push({
              payment_id: applyRel.paymentId?.toString(),
              payment_netsuite_id: applyRel.paymentId?.toString(),
              payment_number: applyRel.paymentNumber,
              payment_date: applyRel.paymentDate,
              payment_amount: applyRel.paymentAmount ? parseFloat(applyRel.paymentAmount) : 0,
              payment_customer: applyRel.paymentCustomer,
              
              invoice_id: applyRel.invoiceId?.toString(),
              invoice_netsuite_id: applyRel.invoiceId?.toString(),
              invoice_number: applyRel.invoiceNumber,
              invoice_date: applyRel.applyDate,
              invoice_amount: applyRel.applyAmount ? parseFloat(applyRel.applyAmount) : 0,
              invoice_customer: applyRel.invoiceCustomer,
              
              apply_date: applyRel.applyDate,
              apply_amount: applyRel.applyAmount ? parseFloat(applyRel.applyAmount) : 0,
              days_invoice_to_payment: daysToPayment,
              
              tenant_id: tenantId,
            });
          }
        }
      }

      allApplyRelationships.push(...batchApplyRelationships);

      // Upsert payments in smaller batches
      const UPSERT_BATCH_SIZE = 10;
      let totalUpserted = 0;
      
      for (let i = 0; i < transformedPayments.length; i += UPSERT_BATCH_SIZE) {
        const batch = transformedPayments.slice(i, i + UPSERT_BATCH_SIZE);
        const batchNumber = Math.floor(i/UPSERT_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(transformedPayments.length/UPSERT_BATCH_SIZE);
        
        console.log(`📦 [NetSuite] Processing payment batch ${batchNumber}/${totalBatches} (${batch.length} payments) - Progress: ${i + batch.length}/${transformedPayments.length}`);
        
        // Add retry logic for upsert operations
        const maxRetries = 3;
        let retryCount = 0;
        let batchSuccess = false;
        
        while (retryCount < maxRetries && !batchSuccess) {
          try {
            console.log(`💾 [NetSuite] Upserting payment batch ${batchNumber} with ${batch.length} payments...`);
            const { data: upsertData, error } = await supabaseAdmin
              .from("netsuite_raw_customer_payments" as any)
              .upsert(batch, {
                onConflict: "netsuite_id",
                ignoreDuplicates: false,
              });

            if (error) {
              // Check for 502 Bad Gateway or similar errors
              if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`🔄 [NetSuite] Retrying payment batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                  continue;
                }
              }
              
              console.error("❌ [NetSuite] Supabase upsert error for batch:", error);
              throw new Error(`Failed to save payments to database: ${error.message}`);
            } else {
              totalUpserted += batch.length;
              console.log(`✅ [NetSuite] Payment batch ${batchNumber} upserted successfully: ${batch.length} payments`);
              batchSuccess = true; // Exit retry loop
            }
          } catch (batchError) {
            if (retryCount < maxRetries - 1) {
              retryCount++;
              console.log(`🔄 [NetSuite] Retrying payment batch ${batchNumber} due to exception (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            }
            console.error(`❌ [NetSuite] Error processing payment batch ${batchNumber}:`, batchError);
            throw batchError;
          }
        }
        
        if (i + UPSERT_BATCH_SIZE < transformedPayments.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ [NetSuite] Successfully upserted ${totalUpserted} payments for batch ${Math.floor(offset/BATCH_SIZE) + 1}`);

      // Process apply relationships if any were found
      if (batchApplyRelationships.length > 0) {
        console.log(`🔍 [NetSuite] Storing ${batchApplyRelationships.length} apply relationships for batch ${Math.floor(offset/BATCH_SIZE) + 1}...`);
        
        // Remove duplicates within the batch
        const uniqueApplyRelationships = batchApplyRelationships.filter((rel, index, self) => 
          index === self.findIndex(r => 
            r.payment_netsuite_id === rel.payment_netsuite_id && 
            r.invoice_netsuite_id === rel.invoice_netsuite_id && 
            r.tenant_id === rel.tenant_id
          )
        );
        
        console.log(`🔍 [NetSuite] After deduplication: ${uniqueApplyRelationships.length} unique apply relationships`);
        
        // Insert in smaller batches
        const APPLY_BATCH_SIZE = 25;
        let successCount = 0;
        
        for (let i = 0; i < uniqueApplyRelationships.length; i += APPLY_BATCH_SIZE) {
          const batch = uniqueApplyRelationships.slice(i, i + APPLY_BATCH_SIZE);
          
          const { error: applyError } = await supabaseAdmin
            .from("netsuite_invoice_payment_applies" as any)
            .upsert(batch, {
              onConflict: "payment_netsuite_id,invoice_netsuite_id,tenant_id",
              ignoreDuplicates: false,
            });

          if (applyError) {
            console.error(`❌ [NetSuite] Failed to save apply relationships batch ${Math.floor(i/APPLY_BATCH_SIZE) + 1}:`, applyError);
          } else {
            successCount += batch.length;
            console.log(`✅ [NetSuite] Successfully stored apply batch ${Math.floor(i/APPLY_BATCH_SIZE) + 1} (${batch.length} relationships)`);
          }
        }
        
        console.log(`✅ [NetSuite] Successfully stored ${successCount} apply relationships for batch ${Math.floor(offset/BATCH_SIZE) + 1}`);
        totalApplyRelationships += successCount;
      }

      totalProcessed += data.items.length;
      offset += BATCH_SIZE;
      
      if (data.items.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // Backup all data to CSV
    const rawDataBackupPath = arrayToCSV(allRawData, `netsuite_payments_raw_${effectiveDateFrom}_to_${effectiveDateTo}`);
    console.log(`💾 [Backup] All raw NetSuite data backed up to: ${rawDataBackupPath}`);

    const transformedPaymentsBackupPath = arrayToCSV(allTransformedPayments, `transformed_payments_${effectiveDateFrom}_to_${effectiveDateTo}`);
    console.log(`💾 [Backup] All transformed payments backed up to: ${transformedPaymentsBackupPath}`);

    const applyRelationshipsBackupPath = allApplyRelationships.length > 0 ? 
      arrayToCSV(allApplyRelationships, `apply_relationships_${effectiveDateFrom}_to_${effectiveDateTo}`) : null;
    
    // Final summary log
    console.log(`🎯 [NetSuite] Download completed: ${totalProcessed} payments processed, ${totalApplyRelationships} apply relationships`);
    if (applyRelationshipsBackupPath) {
      console.log(`💾 [Backup] All apply relationships backed up to: ${applyRelationshipsBackupPath}`);
    }

    return {
      totalProcessed,
      totalApplyRelationships,
      backups: {
        rawData: rawDataBackupPath,
        transformedPayments: transformedPaymentsBackupPath,
        applyRelationships: applyRelationshipsBackupPath
      }
    };
  } catch (error: any) {
    console.error("❌ [NetSuite] Payment processing error:", error);
    throw error;
  }
}

