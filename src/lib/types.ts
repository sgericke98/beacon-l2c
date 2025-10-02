export type DateRange = { from?: string; to?: string };

export type ExchangeRateInfo = {
  currency: string;
  rate: number;
  symbol: string;
};

export type ConvertedOpportunity = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
};

export type DashboardFilters = {
  dealSize?: string[];
  customerTier?: string[];
  region?: string[];
  productType?: string[];
  codeType?: string[];
  leadType?: string[];
  customerType?: string[];
  opportunityToQuoteTime?: string[];
  currency?: string[]; // Add currency filter
  dateRange?: DateRange;
};

export type RawInvoiceFilters = {
  searchText?: string;
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string[]; // Add currency filter
  pageSize?: number;
  page?: number;
};

export type CycleMetric = {
  avgDays: number;
  medianDays: number;
  trendVsLastMonth?: number;
  trendVsLastQuarter?: number;
  status: "On Target" | "Attention" | "Needs Focus";
};

export type DashboardMetrics = {
  opportunityToQuote: CycleMetric;
  quoteToOrder: CycleMetric;
  orderToInvoice: CycleMetric;
  invoiceToPayment: CycleMetric;
};

export type InvoiceRow = {
  invoiceId: string;
  transactionId?: string;
  date: string;
  customer: string;
  amount: number;
  currency?: string; // Add currency field
  status: string;
  opportunityId?: string | null;
};

export type Paged<T> = {
  rows: T[];
  total?: number;
  page: number;
  pageSize: number;
};

// Multi-currency types
export type CurrencyAmount = {
  amount: number;
  currency: string;
};

export type MultiCurrencySummary = {
  totals: Record<string, number>; // currency code -> total amount
  recordCount: number;
  currencyCount: number;
};

export type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
  totalAmount: number;
  recordCount: number;
};

