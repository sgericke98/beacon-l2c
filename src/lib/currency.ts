// Re-export currency functions from currencyService for API routes
export {
  convertMultipleCurrencies,
  convertCurrency,
  getExchangeRate,
  fetchExchangeRates,
  convertAmountWithCache,
  getExchangeRateSummary,
  type CurrencyConversion,
  type ExchangeRate
} from './currencyService';
