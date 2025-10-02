/**
 * Constants for Flow tab functionality
 * Centralizes hardcoded values and configuration
 */

// Performance thresholds for status determination
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
} as const;

// Status color mappings (matching dashboard status values)
export const STATUS_COLORS = {
  good: "bg-emerald-500",
  okay: "bg-blue-500", 
  bad: "bg-red-500",
  no_data: "bg-gray-400",
  excellent: "bg-emerald-500", // Keep for backward compatibility
  warning: "bg-amber-500", // Keep for backward compatibility
} as const;

// Status label mappings (matching dashboard status values)
export const STATUS_LABELS = {
  good: "Good Performance",
  okay: "Needs Attention", 
  bad: "Requires Action",
  no_data: "No Data Available",
  excellent: "Optimal Performance", // Keep for backward compatibility
  warning: "Needs Focus", // Keep for backward compatibility
} as const;

// Stage key mappings for API calls
export const STAGE_KEY_MAP = {
  "opportunity-to-quote": "opportunity",
  "quote-to-order": "quote",
  "order-to-invoice": "order", 
  "invoice-to-payment": "payment",
} as const;

// Stage metric key mappings
export const STAGE_METRIC_MAP = {
  opportunity: "opportunity-to-quote",
  quote: "quote-to-order",
  order: "order-to-invoice", 
  invoice: "invoice-to-payment",
} as const;

// Hardcoded 90th percentile values (should ideally come from API)
export const PERCENTILE_90_VALUES = {
  "opportunity-to-quote": "3.1 days",
  "quote-to-order": "5.2 days",
  "order-to-invoice": "2.0 days", 
  "invoice-to-payment": "18.5 days",
} as const;

// Stage titles
export const STAGE_TITLES = {
  "opportunity-to-quote": "Opportunity to Quote Time",
  "quote-to-order": "Quote to Order Time",
  "order-to-invoice": "Order to Invoice Time",
  "invoice-to-payment": "Invoice to Payment Time",
} as const;

// API endpoint mappings
export const API_ENDPOINTS = {
  "opportunity-to-quote": "/api/metrics/opportunity-to-quote",
  "quote-to-order": "/api/metrics/quote-to-order", 
  "order-to-invoice": "/api/metrics/order-to-invoice",
  "invoice-to-payment": "/api/metrics/invoice-to-payment",
} as const;

// Field mapping for sorting operations
export const SORT_FIELD_MAPPINGS = {
  "quote-to-order": {
    'duration': 'days_quote_to_order',
    'opportunity': 'opportunity_name',
    'startDate': 'quote_created_date',
    'endDate': 'order_created_date',
    'opportunityAmountUSD': 'amount',
    'orderTotalAmountUSD': 'order_total_amount',
    'region': 'customer_country',
    'status': 'order_status',
  },
  "opportunity-to-quote": {
    'duration': 'days_to_quote',
    'opportunity': 'opportunity_name',
    'startDate': 'opportunity_created_date',
    'endDate': 'quote_created_date',
    'opportunityAmountUSD': 'amount',
    'region': 'customer_country',
    'status': 'stage_name',
  },
  "order-to-invoice": {
    'duration': 'days_order_to_invoice',
    'opportunity': 'order_number',
    'invoice_number': 'invoice_number',
    'startDate': 'order_created_date',
    'invoice_date': 'invoice_date',
    'endDate': 'invoice_date',
    'opportunityAmountUSD': 'order_total_amount_usd',
    'dealSize': 'order_total_amount_usd',
    'region': 'customer_country',
    'status': 'order_status',
  },
  "invoice-to-payment": {
    'duration': 'days_invoice_to_payment',
    'opportunity': 'invoice_number',
    'startDate': 'invoice_date',
    'endDate': 'payment_date',
    'opportunityAmountUSD': 'invoice_amount',
    'dealSize': 'invoice_amount',
    'region': 'invoice_customer',
    'status': 'invoice_status',
  },
} as const;
