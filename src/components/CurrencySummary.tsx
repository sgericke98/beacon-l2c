import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurrencySummaryProps {
  data: any[];
  exchangeRates: any[];
  targetCurrency: string;
  currencyLastUpdated: string | null;
  setTargetCurrency: (currency: string) => void;
  currencyLoading: boolean;
  currencyField?: string;
}

// Currency loading component for Suspense
function CurrencyLoadingComponent() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm text-muted-foreground">
          Loading currency data...
        </span>
      </div>
    </div>
  );
}

export function CurrencySummary({
  data,
  exchangeRates,
  targetCurrency,
  currencyLastUpdated,
  setTargetCurrency,
  currencyLoading,
  currencyField = "CurrencyIsoCode",
}: CurrencySummaryProps) {
  if (data.length === 0) {
    return null;
  }

  // Show loading state if currency data is loading
  if (currencyLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Currency Summary & Exchange Rates
          </CardTitle>
          <CardDescription>Loading currency data...</CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencyLoadingComponent />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Currency Summary & Exchange Rates
            </CardTitle>
            <CardDescription>
              Total amounts by currency and current exchange rates to{" "}
              {targetCurrency}
              {currencyLastUpdated && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Last updated: {new Date(currencyLastUpdated).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="target-currency" className="text-xs font-medium">
              Target Currency:
            </Label>
            <Select value={targetCurrency} onValueChange={setTargetCurrency}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Get unique currencies from data */}
                {(() => {
                  const uniqueCurrencies = Array.from(
                    new Set(
                      data
                        .map((record) => record[currencyField])
                        .filter(Boolean)
                    )
                  ).sort();

                  return uniqueCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Exchange Rates Used */}
          {(() => {
            const currenciesInData = Array.from(
              new Set(
                data
                  .map((record) => record[currencyField])
                  .filter(Boolean)
              )
            );
            const ratesUsed = exchangeRates.filter(
              (rate) =>
                currenciesInData.includes(rate.currency) &&
                rate.currency !== "USD"
            );

            return ratesUsed.length > 0 ? (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-3">
                  Exchange Rates
                </h4>
                <div className="flex flex-wrap gap-2">
                  {ratesUsed.map((rate) => (
                    <div
                      key={rate.currency}
                      className="flex items-center p-2 bg-muted/50 rounded-lg"
                    >
                      <p className="text-xs font-medium whitespace-nowrap">
                        1 {rate.currency} = {rate.rate.toFixed(3)}{" "}
                        {targetCurrency}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
