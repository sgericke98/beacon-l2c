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
  limit: z.number().min(1).optional(), // No maximum limit
  daysBack: z.number().min(1).max(2000).default(365),
  stream: z.boolean().default(false), // Enable streaming progress updates
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

    const operationPromise = processInvoiceDownload(tenantId, dateFrom || '', dateTo || '', limit, daysBack, stream);
    
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
    console.error("❌ [NetSuite] Invoice download error:", error);
    return NextResponse.json(
      {
        error: "NETSUITE_INVOICE_DOWNLOAD_ERROR",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function processInvoiceDownload(tenantId: string, dateFrom: string, dateTo: string, limit?: number, daysBack?: number, stream?: boolean) {
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

    // Process in batches for efficient processing
    const BATCH_SIZE = 50;
    let totalProcessed = 0;
    let totalLineItems = 0;
    let successCount = 0;
    let errorCount = 0;
    let allRawData: any[] = [];
    let offset = 0;
    let hasMore = true;

    console.log(`🔍 [NetSuite] Starting batch processing of invoices from ${effectiveDateFrom} to ${effectiveDateTo} (batch size: ${BATCH_SIZE})${limit ? `, limit: ${limit}` : ' (no limit)'}`);

    while (hasMore && (!limit || totalProcessed < limit)) {
      const currentBatchSize = limit ? Math.min(BATCH_SIZE, limit - totalProcessed) : BATCH_SIZE;
      
      console.log(`📦 [NetSuite] Processing batch ${Math.floor(offset/BATCH_SIZE) + 1} - fetching ${currentBatchSize} invoices (offset: ${offset})`);
      
      // Fetch current batch from NetSuite
      const data = await netSuiteClient.fetchInvoices(effectiveDateFrom, effectiveDateTo, currentBatchSize, offset);
      
      if (!data.items || data.items.length === 0) {
        console.log(`📊 [NetSuite] No more invoices found at offset ${offset}`);
        hasMore = false;
        break;
      }

      console.log(`📊 [NetSuite] Retrieved ${data.items.length} invoices for batch ${Math.floor(offset/BATCH_SIZE) + 1}`);
      
      // Log total count estimate on first batch
      if (offset === 0 && data.totalResults) {
        const estimatedTotal = limit ? Math.min(data.totalResults, limit) : data.totalResults;
        console.log(`📈 [NetSuite] Total invoices to download: ~${estimatedTotal} (NetSuite reports ${data.totalResults} total)${limit ? ` (limited to ${limit})` : ''}`);
      }
      
      // Store raw data for backup
      allRawData.push(...data.items);

      // Transform current batch
      const transformedInvoices = data.items.map((invoice: any, index: number) => {
        // Debug currency information for first few invoices
        if (index < 3) {
          const currencyName = invoice.currency?.refName || 'US Dollar';
          const normalizedCurrency = normalizeCurrencyName(currencyName);
          console.log(`🔍 [NetSuite] Invoice ${invoice.tranId} currency debug:`, {
            currency_object: invoice.currency,
            currency_id: invoice.currency?.id,
            currency_name: invoice.currency?.refName,
            normalized_currency: normalizedCurrency,
            exchange_rate: invoice.exchangeRate,
            total: invoice.total
          });
        }
        
        // Normalize currency name to ISO code
        const currencyName = invoice.currency?.refName || 'US Dollar';
        const normalizedCurrency = normalizeCurrencyName(currencyName);
        
        return {
          netsuite_id: invoice.id?.toString(),
          tran_id: invoice.tranId,
          tran_date: invoice.tranDate,
          entity_name: invoice.entity?.refName || null,
          entity_id: invoice.entity?.id?.toString() || null,
          total: invoice.total ? parseFloat(invoice.total) : 0,
          status: invoice.status?.refName || null,
          memo: invoice.memo || null,
          currency_id: normalizedCurrency, // Store ISO code instead of NetSuite ID
          exchange_rate: 1, // Set to 1 since we'll use our own exchange rates
        created_date: invoice.createdDate,
        last_modified_date: invoice.lastModifiedDate,
        subtotal: invoice.subTotal ? parseFloat(invoice.subTotal) : 0,
        tax_total: invoice.taxTotal ? parseFloat(invoice.taxTotal) : 0,
        discount_total: invoice.discountTotal ? parseFloat(invoice.discountTotal) : 0,
        custbody_cw_sfdcordernumber: invoice.custbody_cw_sfdcordernumber || null,
        custbody_cw_sfdcopportunity: invoice.custbody_cw_sfdcopportunity || null,
        custbody_cw_sfdcquote: invoice.custbody_cw_sfdcquote || null,
        raw_data: invoice,
        tenant_id: tenantId,
        };
      });

      // Process line items for current batch
      const batchLineItems: any[] = [];
      data.items.forEach((invoice: any, invoiceIndex: number) => {
        if (invoice.item?.items && Array.isArray(invoice.item.items)) {
          invoice.item.items.forEach((lineItem: any) => {
            batchLineItems.push({
              invoice_id: null, // We'll link this after inserting invoices
              item_id: lineItem.item?.id?.toString() || null,
              item_name: lineItem.item?.refName || lineItem.item?.name || null,
              description: lineItem.description || null,
              quantity: lineItem.quantity ? parseFloat(lineItem.quantity) : 0,
              rate: lineItem.rate ? parseFloat(lineItem.rate) : 0,
              amount: lineItem.amount ? parseFloat(lineItem.amount) : 0,
              tax_code: lineItem.taxCode || null,
              tax_rate: lineItem.taxRate ? parseFloat(lineItem.taxRate) : 0,
              tax_amount: lineItem.taxAmount ? parseFloat(lineItem.taxAmount) : 0,
              raw_data: lineItem,
              tenant_id: tenantId,
              // Store the NetSuite invoice ID in raw_data for linking
              _netsuite_invoice_id: invoice.id?.toString(),
            });
          });
        }
      });

      // Upsert invoices to Supabase in smaller batches to avoid timeout
      const UPSERT_BATCH_SIZE = 25; // Smaller batches for better performance
      let totalUpserted = 0;
      
      for (let i = 0; i < transformedInvoices.length; i += UPSERT_BATCH_SIZE) {
        const batch = transformedInvoices.slice(i, i + UPSERT_BATCH_SIZE);
        const batchNumber = Math.floor(i/UPSERT_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(transformedInvoices.length/UPSERT_BATCH_SIZE);
        const progress = Math.round(((i + batch.length) / transformedInvoices.length) * 100);
      
        console.log(`📦 [NetSuite] Processing invoice batch ${batchNumber}/${totalBatches} (${batch.length} invoices) - Progress: ${i + batch.length}/${transformedInvoices.length} (${progress}%)`);
        
        // Add retry logic for upsert operations
        const maxRetries = 3;
        let retryCount = 0;
        let batchSuccess = false;
        
        while (retryCount < maxRetries && !batchSuccess) {
          try {
            console.log(`💾 [NetSuite] Upserting invoice batch ${batchNumber} with ${batch.length} invoices...`);
            const { data: upsertData, error } = await supabaseAdmin
              .from("netsuite_raw_invoices" as any)
              .upsert(batch, {
                onConflict: "netsuite_id",
                ignoreDuplicates: false,
              });

            if (error) {
              // Check for 502 Bad Gateway or similar errors
              if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`🔄 [NetSuite] Retrying invoice batch ${batchNumber} (attempt ${retryCount + 1}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                  continue;
                }
              }
              
              console.error("❌ [NetSuite] Supabase upsert error for batch:", error);
              errorCount += batch.length;
              batchSuccess = true; // Exit retry loop
            } else {
              successCount += batch.length;
              totalUpserted += batch.length;
              console.log(`✅ [NetSuite] Invoice batch ${batchNumber} upserted successfully: ${batch.length} invoices`);
              batchSuccess = true; // Exit retry loop
            }
          } catch (batchError) {
            if (retryCount < maxRetries - 1) {
              retryCount++;
              console.log(`🔄 [NetSuite] Retrying invoice batch ${batchNumber} due to exception (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            }
            console.error(`❌ [NetSuite] Error processing invoice batch ${batchNumber}:`, batchError);
            errorCount += batch.length;
            batchSuccess = true; // Exit retry loop
          }
        }
        
        // Small delay between batches to avoid overwhelming the database
        if (i + UPSERT_BATCH_SIZE < transformedInvoices.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`✅ [NetSuite] Successfully upserted ${totalUpserted} invoices for batch ${Math.floor(offset/BATCH_SIZE) + 1}`);

      // Process line items for current batch
      if (batchLineItems.length > 0) {
        // Get the inserted invoice UUIDs to link line items
        const { data: insertedInvoices, error: fetchError } = await supabaseAdmin
          .from("netsuite_raw_invoices" as any)
          .select("id, netsuite_id")
          .eq("tenant_id", tenantId)
          .in("netsuite_id", transformedInvoices.map((inv:any) => inv.netsuite_id));

        if (fetchError) {
          console.error("❌ [NetSuite] Error fetching inserted invoices:", fetchError);
          throw new Error(`Failed to fetch inserted invoices: ${fetchError.message}`);
        }

        // Create a mapping from NetSuite ID to UUID
        const invoiceIdMap = new Map();
        (insertedInvoices as any[])?.forEach((inv: any) => {
          invoiceIdMap.set(inv.netsuite_id, inv.id);
        });

        // Update line items with correct invoice UUIDs
        const linkedLineItems = batchLineItems.map(lineItem => {
          const { _netsuite_invoice_id, ...lineItemData } = lineItem;
          return {
            ...lineItemData,
            invoice_id: invoiceIdMap.get(_netsuite_invoice_id) || null,
          };
        });

        // Insert line items in batches to avoid timeout
        const LINE_ITEM_BATCH_SIZE = 50;
        let totalLineItemsInserted = 0;
        
        for (let i = 0; i < linkedLineItems.length; i += LINE_ITEM_BATCH_SIZE) {
          const batch = linkedLineItems.slice(i, i + LINE_ITEM_BATCH_SIZE);
          const batchNumber = Math.floor(i/LINE_ITEM_BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(linkedLineItems.length/LINE_ITEM_BATCH_SIZE);
          
          console.log(`📦 [NetSuite] Processing line items batch ${batchNumber}/${totalBatches} (${batch.length} line items)`);
          
          const { data: lineItemsData, error: lineItemsError } = await supabaseAdmin
            .from("netsuite_invoice_line_items" as any)
            .insert(batch);

          if (lineItemsError) {
            console.error("❌ [NetSuite] Line items insert error for batch:", lineItemsError);
            throw new Error(`Failed to save line items to database: ${lineItemsError.message}`);
          }
          
          totalLineItemsInserted += batch.length;
          
          // Small delay between batches
          if (i + LINE_ITEM_BATCH_SIZE < linkedLineItems.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        console.log(`✅ [NetSuite] Successfully inserted ${totalLineItemsInserted} line items for batch ${Math.floor(offset/BATCH_SIZE) + 1}`);
        totalLineItems += totalLineItemsInserted;
      }

      // Update counters and offset for next batch
      totalProcessed += data.items.length;
      offset += BATCH_SIZE;
      
      // Check if we should continue
      if (data.items.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // Backup all raw data to CSV
    const rawDataBackupPath = arrayToCSV(allRawData, `netsuite_invoices_raw_${dateFrom}_to_${effectiveDateTo}`);
    console.log(`💾 [Backup] All raw NetSuite data backed up to: ${rawDataBackupPath}`);

    // Final summary log
    console.log(`🎯 [NetSuite] Download completed: ${totalProcessed} invoices processed, ${successCount} saved successfully, ${errorCount} errors, ${totalLineItems} line items`);

    return NextResponse.json({
      success: true,
      count: totalProcessed,
      successCount,
      errorCount,
      lineItemsCount: totalLineItems,
      progress: {
        total: totalProcessed,
        processed: totalProcessed,
        percentage: 100,
        completed: true
      },
        dateRange: {
          from: effectiveDateFrom,
          to: effectiveDateTo
        },
      message: errorCount > 0
        ? `Downloaded ${totalProcessed} invoices with ${totalLineItems} line items. ${successCount} saved successfully, ${errorCount} had errors.`
        : `Successfully downloaded and saved ${totalProcessed} invoices with ${totalLineItems} line items.`,
      backups: {
        rawData: rawDataBackupPath,
        lineItems: totalLineItems > 0 ? `line_items_${dateFrom}_to_${effectiveDateTo}` : null
      }
    });
  } catch (error: any) {
    console.error("❌ [NetSuite] Invoice processing error:", error);
    throw error; // Re-throw to be handled by the main function
  }
}
