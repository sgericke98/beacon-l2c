/**
 * Unified Currency Service
 * Uses Supabase database for all currency conversions
 * Features:
 * - Database-driven exchange rates
 * - Intelligent caching
 * - Comprehensive error handling
 * - No external API dependencies for regular operations
 */

export interface ExchangeRate {
  currency: string;
  rate: number;
  lastUpdated: string;
}

export interface CurrencyConversion {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  lastUpdated: string;
}

// Cache for exchange rates to avoid excessive database calls
const exchangeRateCache: Map<string, { rate: number; timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for client-side
const SERVER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for server-side

/**
 * Get exchange rate from Supabase database with caching
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string = "USD",
  useServerCache: boolean = false
): Promise<number> {
  if (fromCurrency === toCurrency) return 1;

  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const cached = exchangeRateCache.get(cacheKey);
  const cacheDuration = useServerCache ? SERVER_CACHE_DURATION : CACHE_DURATION;

  // Check if we have a valid cached rate
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    console.log(`📋 [Currency] Using cached rate for ${fromCurrency}->${toCurrency}: ${cached.rate}`);
    return cached.rate;
  }

  try {
    console.log(`🔄 [Currency] Fetching rate from database for ${fromCurrency}->${toCurrency}`);
    
    // Import supabaseAdmin dynamically to avoid circular dependencies
    const { supabaseAdmin } = await import('./supabaseAdmin');
    
    // Use the database function to get the exchange rate
    const { data: rate, error } = await (supabaseAdmin as any).rpc('get_exchange_rate', {
      p_from_currency: fromCurrency,
      p_to_currency: toCurrency,
      p_date: new Date().toISOString().split('T')[0], // Today's date
      p_tenant_id: 'default'
    });

    if (error) {
      console.error("❌ [Currency] Database error:", error);
      throw new Error(`Failed to get exchange rate from database: ${error.message}`);
    }

    if (rate === null || rate === undefined) {
      throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
    }

    // Cache the rate
    exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() });
    console.log(`✅ [Currency] Cached new rate for ${fromCurrency}->${toCurrency}: ${rate}`);

    return rate;
  } catch (error) {
    console.error(`❌ [Currency] Failed to get rate for ${fromCurrency}->${toCurrency}:`, error);
    
    // Try to use any available cached rate, even if expired
    if (cached) {
      console.log("📋 [Currency] Using expired cached rate as last resort");
      return cached.rate;
    }
    
    // No cached rate available, throw error
    throw new Error(`Unable to get exchange rate for ${fromCurrency} to ${toCurrency}. Please ensure exchange rates are available in the database.`);
  }
}

/**
 * Convert currency amount using database rates
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string = "USD",
  useServerCache: boolean = false
): Promise<CurrencyConversion> {
  if (!amount || amount <= 0) {
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: 0,
      targetCurrency: toCurrency,
      exchangeRate: 1,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const exchangeRate = await getExchangeRate(fromCurrency, toCurrency, useServerCache);
    const convertedAmount = amount * exchangeRate;

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      targetCurrency: toCurrency,
      exchangeRate,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ [Currency] Conversion failed:", error);
    throw new Error(`Currency conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert amount using cached exchange rate (server-side optimized)
 */
export async function convertAmountWithCache(
  amount: number,
  fromCurrency: string,
  toCurrency: string = "USD"
): Promise<number> {
  if (!amount || amount <= 0) return 0;
  
  const rate = await getExchangeRate(fromCurrency, toCurrency, true); // Use server cache
  return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert multiple currencies efficiently
 */
export async function convertMultipleCurrencies(
  records: Array<{ 
    amount?: number | null; 
    net_amount?: number | null;
    total_amount?: number | null;
    currency_iso_code?: string | null 
  }>,
  targetCurrency: string = "USD",
  useServerCache: boolean = false
): Promise<Array<{ original: any; converted: CurrencyConversion }>> {
  
  const conversions: Array<{ original: any; converted: CurrencyConversion }> = [];

  for (const record of records) {
    try {
      // Determine the amount field to use
      const amount = record.amount || record.net_amount || record.total_amount;
      
      if (amount && amount > 0 && record.currency_iso_code) {
        
        const conversion = await convertCurrency(
          amount,
          record.currency_iso_code,
          targetCurrency,
          useServerCache
        );
        
        conversions.push({ original: record, converted: conversion });
      } else {
        // No amount or currency, skip this record
        console.warn("⚠️ [Currency] Skipping record with no amount or currency:", record);
        continue;
      }
    } catch (error) {
      console.error("❌ [Currency] Failed to convert record:", error, record);
      throw new Error(`Failed to convert currency for record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return conversions;
}

/**
 * Pre-populate cache with exchange rates from database
 */
export async function prePopulateCacheFromDatabase(): Promise<void> {
  try {
    // Import supabaseAdmin dynamically to avoid circular dependencies
    const { supabaseAdmin } = await import('./supabaseAdmin');
    
    const { data: rates, error } = await supabaseAdmin
      .from('exchange_rates' as any)
      .select('from_currency, to_currency, rate')
      .eq('tenant_id', 'default')
      .order('effective_date', { ascending: false });
    
    if (error) {
      console.error("❌ [Currency] Failed to load rates from database:", error);
      return;
    }
    
    if (rates && rates.length > 0) {
      (rates as any[]).forEach((rate: any) => {
        const cacheKey = `${rate.from_currency}_${rate.to_currency}`;
        exchangeRateCache.set(cacheKey, { rate: rate.rate, timestamp: Date.now() });
      });
      
      console.log(`📋 [Currency] Pre-populated cache with ${rates.length} rates from database`);
    }
  } catch (error) {
    console.error("❌ [Currency] Failed to pre-populate cache from database:", error);
  }
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearCurrencyCache(): void {
  exchangeRateCache.clear();
}

/**
 * Get cache statistics
 */
export function getCurrencyCacheStats(): { size: number; keys: string[] } {
  return {
    size: exchangeRateCache.size,
    keys: Array.from(exchangeRateCache.keys())
  };
}

/**
 * Helper function to get currency symbol
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    JPY: "¥",
    CHF: "CHF",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
  };

  return symbols[currency] || currency;
}

/**
 * Get exchange rate summary for display
 */
export function getExchangeRateSummary(): Array<{
  currency: string;
  rate: number;
  symbol: string;
}> {
  const summary: Array<{ currency: string; rate: number; symbol: string }> = [];

  // If cache is empty, return empty array
  if (exchangeRateCache.size === 0) {
    console.warn("⚠️ [Currency] No exchange rates available in cache");
    return summary;
  }

  // Get from cache - the cache stores individual currency codes, not cross-rates
  exchangeRateCache.forEach((data, key) => {
    // Skip cross-rate keys (those with underscores)
    if (!key.includes("_")) {
      const currency = key;
      const symbol = getCurrencySymbol(currency);
      summary.push({
        currency,
        rate: data.rate,
        symbol,
      });
    }
  });

  return summary.sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * @deprecated This function is no longer needed since we use database functions directly
 * Exchange rates should be updated via the /api/currency/update-rates endpoint
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  throw new Error("fetchExchangeRates is deprecated. Exchange rates are now managed through the database. Use the /api/currency/update-rates endpoint to update rates.");
}