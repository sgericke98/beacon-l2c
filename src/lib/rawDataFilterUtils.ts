// Define types locally since they're not exported from useRawData
interface NetsuiteInvoice {
  id: string;
  netsuite_id: string;
  tran_id: string;
  tran_date: string;
  entity_name: string;
  total: number;
  status: string;
  created_date: string;
  custbody_cw_sfdcopportunity: string;
  currency_iso_code?: string | null;
}

interface SalesforceOpportunity {
  id: string;
  name: string;
  created_date: string;
  close_date?: string | null;
  amount?: number | null;
  currency_iso_code?: string | null;
  stage_name: string;
  type?: string | null;
  lead_source?: string | null;
  customer_tier?: string | null;
  market_segment?: string | null;
  channel?: string | null;
  customer_country?: string | null;
  sbqq_primary_quote_id?: string | null;
  convertedAmount?: number | null;
  exchangeRate?: number | null;
  conversionTimestamp?: string | null;
  attributes?: {
    type: string;
    url: string;
  };
}

interface SalesforceQuote {
  id: string;
  salesforce_id: string;
  name: string | null;
  created_at: string | null;
  start_date: string | null;
  status: string | null;
  net_amount: number | null;
  convertedNetAmount?: number | null;
  quote_type: string | null;
  billing_country: string | null;
  payment_terms: string | null;
  billing_frequency: string | null;
  currency_iso_code: string | null;
  opportunity_id: string | null;
  expiration_date: string | null;
  grand_total: number | null;
  subtotal: number | null;
  customer_tier?: string | null;
  customer_country?: string | null;
}

export interface BaseFilterOptions {
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

export interface OpportunityFilterOptions extends BaseFilterOptions {
  dealSize: "all" | "small" | "medium" | "large" | "enterprise";
  customerTier: string;
  region: string;
  productType: string;
  stage: string;
  leadType: string;
  customerType: string;
}

export interface QuoteFilterOptions extends BaseFilterOptions {
  dealSize: "all" | "small" | "medium" | "large" | "enterprise";
  status: string;
  leadType: string;
  country: string;
  paymentTerms: string;
  billingFrequency: string;
}

export interface OrderFilterOptions extends BaseFilterOptions {
  dealSize: "all" | "small" | "medium" | "large" | "enterprise";
  status: string;
  orderType: string;
  billingFrequency: string;
  region: string;
}

export type FilterOptions = OpportunityFilterOptions | QuoteFilterOptions | OrderFilterOptions;

export interface SearchAndFilterParams<T> {
  searchQuery: string;
  filters: T;
}

// Extract unique values for dynamic filter options
export const getUniqueValues = (data: any[], field: string): string[] => {
  const values = data
    .map((item) => item[field])
    .filter((value) => value && value.trim() !== "")
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();
  return values;
};

// Filter Salesforce opportunities
export const filterSalesforceOpportunities = (
  data: SalesforceOpportunity[],
  { searchQuery, filters }: SearchAndFilterParams<OpportunityFilterOptions>,
  targetCurrency: string = "USD"
): SalesforceOpportunity[] => {
  return data.filter((record) => {
    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = record.name?.toLowerCase().includes(searchLower);
      const stageMatch = record.stage_name?.toLowerCase().includes(searchLower);
      const customerTierMatch =
        record.customer_tier?.toLowerCase().includes(searchLower);
      const countryMatch = record.customer_country
        ?.toLowerCase()
        .includes(searchLower);
      const typeMatch = record.type?.toLowerCase().includes(searchLower);
      const leadSourceMatch =
        record.lead_source?.toLowerCase().includes(searchLower);

      if (
        !nameMatch &&
        !stageMatch &&
        !customerTierMatch &&
        !countryMatch &&
        !typeMatch &&
        !leadSourceMatch
      ) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const createdDate = new Date(record.created_date);
      if (filters.dateRange.from) {
        const fromDate = new Date(filters.dateRange.from);
        if (createdDate < fromDate) return false;
      }
      if (filters.dateRange.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (createdDate > toDate) return false;
      }
    }

    // Deal size filter (using converted amount in USD)
    if (filters.dealSize !== "all") {
      const amount = record.convertedAmount || record.amount || 0;
      if (!amount || amount <= 0) return false;

      switch (filters.dealSize) {
        case "small":
          if (amount >= 10000) return false;
          break;
        case "medium":
          if (amount < 10000 || amount >= 100000) return false;
          break;
        case "large":
          if (amount < 100000 || amount >= 1000000) return false;
          break;
        case "enterprise":
          if (amount < 1000000) return false;
          break;
      }
    }

    // Customer tier filter
    if (filters.customerTier !== "all") {
      if (record.customer_tier !== filters.customerTier) return false;
    }

    // Region filter (using customer_country)
    if (filters.region !== "all") {
      if (record.customer_country !== filters.region) return false;
    }

    // Product type filter (using Market Segment as proxy)
    if (filters.productType !== "all") {
      if (record.market_segment !== filters.productType) return false;
    }

    // Stage filter
    if (filters.stage !== "all") {
      if (record.stage_name !== filters.stage) return false;
    }

    // Lead type filter
    if (filters.leadType !== "all") {
      if (record.lead_source !== filters.leadType) return false;
    }

    // Customer type filter
    if (filters.customerType !== "all") {
      if (record.type !== filters.customerType) return false;
    }

    return true;
  });
};

// Filter Salesforce quotes
export const filterSalesforceQuotes = (
  data: SalesforceQuote[],
  { searchQuery, filters }: SearchAndFilterParams<QuoteFilterOptions>,
  targetCurrency: string = "USD"
): SalesforceQuote[] => {
  return data.filter((record) => {
    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = record.name?.toLowerCase().includes(searchLower);
      const statusMatch = record.status?.toLowerCase().includes(searchLower);
      const opportunityIdMatch = record.opportunity_id
        ?.toLowerCase()
        .includes(searchLower);
      const typeMatch = record.quote_type?.toLowerCase().includes(searchLower);
      const countryMatch = record.billing_country
        ?.toLowerCase()
        .includes(searchLower);
      const paymentTermsMatch = record.payment_terms
        ?.toLowerCase()
        .includes(searchLower);
      const billingFrequencyMatch = record.billing_frequency
        ?.toLowerCase()
        .includes(searchLower);

      if (
        !nameMatch &&
        !statusMatch &&
        !opportunityIdMatch &&
        !typeMatch &&
        !countryMatch &&
        !paymentTermsMatch &&
        !billingFrequencyMatch
      ) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const startDate = new Date(record.start_date || "");
      if (filters.dateRange.from) {
        const fromDate = new Date(filters.dateRange.from);
        if (startDate < fromDate) return false;
      }
      if (filters.dateRange.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (startDate > toDate) return false;
      }
    }

    // Deal size filter (using converted net amount in USD)
    if (filters.dealSize !== "all") {
      const amount = record.convertedNetAmount || record.net_amount || 0;
      if (!amount || amount <= 0) return false;

      switch (filters.dealSize) {
        case "small":
          if (amount >= 10000) return false;
          break;
        case "medium":
          if (amount < 10000 || amount >= 100000) return false;
          break;
        case "large":
          if (amount < 100000 || amount >= 1000000) return false;
          break;
        case "enterprise":
          if (amount < 1000000) return false;
          break;
      }
    }

    // Status filter
    if (filters.status !== "all") {
      if (record.status !== filters.status) return false;
    }

    // Lead type filter (using quote_type)
    if (filters.leadType !== "all") {
      if (record.quote_type !== filters.leadType) return false;
    }

    // Country filter (using billing_country)
    if (filters.country !== "all") {
      if (record.billing_country !== filters.country) return false;
    }

    // Payment terms filter
    if (filters.paymentTerms !== "all") {
      if (record.payment_terms !== filters.paymentTerms) return false;
    }

    // Billing frequency filter
    if (filters.billingFrequency !== "all") {
      if (record.billing_frequency !== filters.billingFrequency) return false;
    }

    return true;
  });
};

// Filter Salesforce orders
export const filterSalesforceOrders = (
  data: any[],
  { searchQuery, filters }: SearchAndFilterParams<OrderFilterOptions>,
  targetCurrency: string = "USD"
): any[] => {
  return data.filter((record) => {
    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const orderNumberMatch = record.order_number?.toLowerCase().includes(searchLower);
      const statusMatch = record.status?.toLowerCase().includes(searchLower);
      const orderTypeMatch = record.order_type?.toLowerCase().includes(searchLower);
      const countryMatch = record.shipping_country_code?.toLowerCase().includes(searchLower);

      if (
        !orderNumberMatch &&
        !statusMatch &&
        !orderTypeMatch &&
        !countryMatch
      ) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const createdDate = new Date(record.created_date || "");
      if (filters.dateRange.from) {
        const fromDate = new Date(filters.dateRange.from);
        if (createdDate < fromDate) return false;
      }
      if (filters.dateRange.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (createdDate > toDate) return false;
      }
    }

    // Deal size filter (using converted total amount in USD)
    if (filters.dealSize !== "all") {
      const amount = record.convertedTotalAmount || record.total_amount || 0;
      if (!amount || amount <= 0) return false;

      switch (filters.dealSize) {
        case "small":
          if (amount >= 10000) return false;
          break;
        case "medium":
          if (amount < 10000 || amount >= 100000) return false;
          break;
        case "large":
          if (amount < 100000 || amount >= 1000000) return false;
          break;
        case "enterprise":
          if (amount < 1000000) return false;
          break;
      }
    }

    // Status filter
    if (filters.status !== "all") {
      if (record.status !== filters.status) return false;
    }

    // Order type filter
    if (filters.orderType !== "all") {
      if (record.order_type !== filters.orderType) return false;
    }

    // Billing frequency filter
    if (filters.billingFrequency !== "all") {
      if (record.billing_frequency !== filters.billingFrequency) return false;
    }

    // Region filter (using shipping_country_code)
    if (filters.region !== "all") {
      if (record.shipping_country_code !== filters.region) return false;
    }

    return true;
  });
};

// Filter NetSuite invoices
export const filterNetsuiteInvoices = (
  data: NetsuiteInvoice[],
  { searchQuery, filters }: SearchAndFilterParams<any>
): NetsuiteInvoice[] => {
  return data.filter((record) => {
    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const tranIdMatch = record.tran_id?.toLowerCase().includes(searchLower);
      const entityNameMatch = record.entity_name
        ?.toLowerCase()
        .includes(searchLower);
      const statusMatch = record.status?.toLowerCase().includes(searchLower);

      if (!tranIdMatch && !entityNameMatch && !statusMatch) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const tranDate = new Date(record.tran_date);
      if (filters.dateRange.from) {
        const fromDate = new Date(filters.dateRange.from);
        if (tranDate < fromDate) return false;
      }
      if (filters.dateRange.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (tranDate > toDate) return false;
      }
    }

    // Amount filter (deal size)
    if (filters.dealSize !== "all") {
      const amount = record.total;
      if (!amount || amount <= 0) return false;

      switch (filters.dealSize) {
        case "small":
          if (amount >= 10000) return false;
          break;
        case "medium":
          if (amount < 10000 || amount >= 100000) return false;
          break;
        case "large":
          if (amount < 100000 || amount >= 1000000) return false;
          break;
        case "enterprise":
          if (amount < 1000000) return false;
          break;
      }
    }

    return true;
  });
};

// Get cascading filter options for Salesforce opportunities
export const getCascadingFilterOptions = (
  data: SalesforceOpportunity[],
  filters: OpportunityFilterOptions
) => {
  // Use original data to get all available options, not filtered data
  return {
    customerTier: getUniqueValues(data, "customer_tier"),
    productType: getUniqueValues(data, "market_segment"),
    stage: getUniqueValues(data, "stage_name"),
    region: getUniqueValues(data, "customer_country"),
    leadType: getUniqueValues(data, "lead_source"),
    customerType: getUniqueValues(data, "type"),
  };
};

// Get cascading filter options for Salesforce quotes
export const getCascadingQuoteFilterOptions = (
  data: SalesforceQuote[],
  filters: QuoteFilterOptions
) => {
  // Use original data to get all available options, not filtered data
  return {
    status: getUniqueValues(data, "status"),
    leadType: getUniqueValues(data, "quote_type"),
    country: getUniqueValues(data, "billing_country"),
    paymentTerms: getUniqueValues(data, "payment_terms"),
    billingFrequency: getUniqueValues(data, "billing_frequency"),
  };
};

// Get cascading filter options for Salesforce orders
export const getCascadingOrderFilterOptions = (
  data: any[],
  filters: OrderFilterOptions
) => {
  // Use original data to get all available options, not filtered data
  return {
    status: getUniqueValues(data, "status"),
    orderType: getUniqueValues(data, "order_type"),
    billingFrequency: getUniqueValues(data, "billing_frequency"),
    region: getUniqueValues(data, "shipping_country_code"),
  };
};

// Default filter states
export const getDefaultOpportunityFilters = (): OpportunityFilterOptions => ({
  dealSize: "all",
  customerTier: "all",
  region: "all",
  productType: "all",
  stage: "all",
  leadType: "all",
  customerType: "all",
  dateRange: {
    from: undefined,
    to: undefined,
  },
});

export const getDefaultQuoteFilters = (): QuoteFilterOptions => ({
  dealSize: "all",
  status: "all",
  leadType: "all",
  country: "all",
  paymentTerms: "all",
  billingFrequency: "all",
  dateRange: {
    from: undefined,
    to: undefined,
  },
});

export const getDefaultOrderFilters = (): OrderFilterOptions => ({
  dealSize: "all",
  status: "all",
  orderType: "all",
  billingFrequency: "all",
  region: "all",
  dateRange: {
    from: undefined,
    to: undefined,
  },
});
