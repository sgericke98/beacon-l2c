import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  requireTenant,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/authServer";

export async function POST(request: NextRequest) {
  let tenantId: string | null = null;
  try {
    const tenant = await requireTenant(request);
    tenantId = tenant.tenantId;

    // Fetch exchange rates from a free API (using exchangerate-api.com)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Convert the API response to our format - get ALL currencies
    const rates = [];
    
    // Process all currencies returned by the API
    for (const [currency, rate] of Object.entries(data.rates)) {
      // Skip USD since it's the base currency (rate would be 1)
      if (currency !== 'USD' && typeof rate === 'number') {
        // The API returns rates where USD is the base (1 USD = rate * currency)
        // But we need to store rates where the source currency is the base (1 currency = 1/rate USD)
        rates.push({
          from_currency: currency,
          to_currency: 'USD',
          rate: 1 / rate  // Convert from "1 USD = rate * currency" to "1 currency = 1/rate USD"
        });
      }
    }

    // Upsert the rates using the database function
    const { error } = await (supabaseAdmin as any).rpc('upsert_exchange_rates', {
      p_rates: rates,
      p_effective_date: data.date, // Use the date from the API
      p_tenant_id: tenantId!
    } as any);

    if (error) {
      console.error("❌ [Currency Update] Database error:", error);
      return NextResponse.json(
        { error: "Failed to update exchange rates in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Exchange rates updated successfully",
      date: data.date,
      base: data.base,
      ratesUpdated: rates.length,
      rates: rates.map(r => `${r.from_currency} -> ${r.to_currency}: ${r.rate}`)
    });

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("❌ [Currency Update] Error:", error);

    // If the API fails, return an error instead of using fallback rates
    if (error instanceof Error && error.message.includes('Exchange rate API error')) {
      return NextResponse.json(
        { 
          error: "Failed to fetch exchange rates from external API",
          details: "Exchange rate service is currently unavailable. Please try again later.",
          suggestion: "Check your internet connection and ensure the exchange rate API is accessible."
        },
        { status: 503 } // Service Unavailable
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
