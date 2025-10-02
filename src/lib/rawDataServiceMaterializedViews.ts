import { CacheManager, cacheKeys, CACHE_CONFIG } from "@/lib/cache";

export type DataType = "opportunities" | "quotes" | "orders" | "invoices" | "payments" | "credit_memos";

export interface BaseRecord {
  id: string;
  [key: string]: any;
}


export interface Pagination {
  page: number;
  pageSize: number;
}

export interface FilterOptions {
  [key: string]: any;
}

export interface RawDataResponse {
  data: BaseRecord[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export interface FilterOptionsResponse {
  [key: string]: string[];
}

// Centralized data type configuration for materialized views
export const MATERIALIZED_VIEW_CONFIG = {
  opportunities: {
    tableName: "mv_opportunities_with_usd",
    idField: "opportunity_id",
    nameField: "opportunity_name",
    amountField: "opportunity_amount_usd",
    dateField: "opportunity_created_date",
    statusField: "opportunity_stage_name",
    currencyField: "opportunity_currency_code",
    defaultSort: "opportunity_created_date",
    searchFields: ["opportunity_name", "opportunity_stage_name", "customer_tier", "customer_country"],
  },
  quotes: {
    tableName: "mv_quotes_with_usd",
    idField: "quote_id",
    nameField: "quote_name",
    amountField: "quote_total_amount_usd",
    dateField: "quote_created_date",
    statusField: "quote_status",
    currencyField: "quote_currency_code",
    defaultSort: "quote_created_date",
    searchFields: ["quote_name", "quote_status", "quote_type", "billing_country"],
  },
  orders: {
    tableName: "mv_orders_with_usd",
    idField: "order_id",
    nameField: "order_name",
    amountField: "order_total_amount_usd",
    dateField: "order_created_date",
    statusField: "order_status",
    currencyField: "order_currency_code",
    defaultSort: "order_created_date",
    searchFields: ["order_name", "order_status", "order_type", "shipping_country_code"],
  },
  invoices: {
    tableName: "mv_invoices_with_usd",
    idField: "invoice_id",
    nameField: "invoice_customer_name",
    amountField: "invoice_total_amount_usd",
    dateField: "invoice_created_date",
    statusField: "invoice_status",
    currencyField: "invoice_currency_code",
    defaultSort: "invoice_created_date",
    searchFields: ["invoice_customer_name", "invoice_transaction_id", "invoice_status"],
  },
  payments: {
    tableName: "mv_payments_with_usd",
    idField: "payment_id",
    nameField: "payment_customer_name",
    amountField: "payment_total_amount_usd",
    dateField: "payment_created_date",
    statusField: "payment_status",
    currencyField: "payment_currency_code",
    defaultSort: "payment_created_date",
    searchFields: ["payment_customer_name", "payment_transaction_id", "payment_status"],
  },
  credit_memos: {
    tableName: "mv_credit_memos_with_usd",
    idField: "credit_memo_id",
    nameField: "credit_memo_customer_name",
    amountField: "credit_memo_total_amount_usd",
    dateField: "credit_memo_created_date",
    statusField: "credit_memo_status",
    currencyField: "credit_memo_currency_code",
    defaultSort: "credit_memo_created_date",
    searchFields: ["credit_memo_customer_name", "credit_memo_transaction_id", "credit_memo_status"],
  },
};

export class RawDataServiceMaterializedViews {
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager();
  }

  getConfig(dataType: DataType) {
    return MATERIALIZED_VIEW_CONFIG[dataType];
  }


  getDefaultFilters(dataType: DataType): FilterOptions {
    return {};
  }

  async fetchData(
    dataType: DataType,
    pagination: Pagination,
    filters: FilterOptions,
    searchQuery: string = ""
  ): Promise<RawDataResponse> {
    const config = this.getConfig(dataType);
    const cacheKey = cacheKeys.rawData(
      dataType,
      { pagination, filters, searchQuery }
    );

    // Check cache first
    console.log(`Checking cache for key: ${cacheKey}`);
    const cached = CacheManager.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${dataType}:`, { dataLength: cached.data?.length, totalRecords: cached.totalRecords });
      return cached;
    }
    console.log(`Cache miss for ${dataType}`);
    
    // Temporarily disable cache for debugging
    // if (cached) {
    //   return cached;
    // }

    try {
      // Build the API URL based on data type
      const apiUrl = this.getApiUrl(dataType);
      const requestBody = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        searchText: searchQuery,
        ...filters,
      };
      
      console.log(`Making API request to ${apiUrl} with body:`, requestBody);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`API response for ${dataType}:`, { dataLength: result.data?.length, totalRecords: result.totalRecords });
      
      // Cache the result
      CacheManager.set(cacheKey, result, CACHE_CONFIG.API_TTL.RAW_DATA);
      
      return result;
    } catch (error) {
      console.error(`Error fetching ${dataType} data:`, error);
      throw error;
    }
  }

  // No filter options needed for raw data tab

  private getApiUrl(dataType: DataType): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    console.log(`Base URL: ${baseUrl}`);
    
    switch (dataType) {
      case "opportunities":
        return `${baseUrl}/api/salesforce/opportunities`;
      case "quotes":
        return `${baseUrl}/api/salesforce/quotes`;
      case "orders":
        return `${baseUrl}/api/salesforce/orders`;
      case "invoices":
        return `${baseUrl}/api/netsuite/invoices`;
      case "payments":
        return `${baseUrl}/api/netsuite/payments`;
      case "credit_memos":
        return `${baseUrl}/api/netsuite/credit-memos`;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  // No filter options API needed for raw data tab

  // Helper method to get column configuration for a data type
  getColumnConfig(dataType: DataType) {
    const config = this.getConfig(dataType);
    return {
      idField: config.idField,
      nameField: config.nameField,
      amountField: config.amountField,
      dateField: config.dateField,
      statusField: config.statusField,
      currencyField: config.currencyField,
      searchFields: config.searchFields,
    };
  }

  // Helper method to validate data type
  isValidDataType(dataType: string): dataType is DataType {
    return Object.keys(MATERIALIZED_VIEW_CONFIG).includes(dataType);
  }
}

// Export singleton instance
export const rawDataServiceMaterializedViews = new RawDataServiceMaterializedViews();
