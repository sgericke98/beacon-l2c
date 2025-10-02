import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting utilities for multi-currency support
export function formatCurrency(amount: number | null | undefined, currencyCode: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === 0) {
    return "-";
  }

  // Default to USD if no currency code provided
  const currency = currencyCode || "USD";
  
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    // Fallback formatting if currency code is invalid
    return `${currency} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
}

// Group amounts by currency for proper aggregation
export function groupAmountsByCurrency(records: Array<{ Amount?: number | null; CurrencyIsoCode?: string | null }>): Record<string, number> {
  const grouped: Record<string, number> = {};
  
  records.forEach(record => {
    if (record.Amount && record.Amount > 0) {
      const currency = record.CurrencyIsoCode || "USD";
      grouped[currency] = (grouped[currency] || 0) + record.Amount;
    }
  });
  
  return grouped;
}
