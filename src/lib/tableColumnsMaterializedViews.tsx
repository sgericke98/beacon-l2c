import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Column } from "@/components/DataTable";
import { cn } from "@/lib/utils";

// Common column renderers for materialized views
export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "paid":
    case "paid in full":
    case "deposited":
      return "bg-green-100 text-green-800";
    case "pending":
    case "open":
      return "bg-yellow-100 text-yellow-800";
    case "overdue":
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const renderCurrency = (value: number | null, currency?: string) => {
  if (!value) return "-";
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)} ${currency || ""}`;
};

export const renderStatus = (status: string) => {
  if (!status) return "-";
  return (
    <Badge className={cn("text-xs", getStatusColor(status))}>
      {status}
    </Badge>
  );
};

export const renderDate = (date: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

// Salesforce Opportunities columns for materialized view
export const salesforceOpportunityColumnsMaterialized: Column[] = [
  {
    key: "source_system_opportunity_id",
    label: "Opportunity ID",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "opportunity_name",
    label: "Name",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "opportunity_amount_usd",
    label: "Amount (USD)",
    sortable: true,
    render: (value) => renderCurrency(value, "USD"),
  },
  {
    key: "opportunity_currency_code",
    label: "Currency",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "opportunity_stage_name",
    label: "Stage",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "opportunity_type",
    label: "Type",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "opportunity_lead_source",
    label: "Lead Source",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "opportunity_created_date",
    label: "Created Date",
    sortable: true,
    render: (value) => renderDate(value),
  },
  {
    key: "opportunity_close_date",
    label: "Close Date",
    sortable: true,
    render: (value) => renderDate(value),
  },
  {
    key: "customer_tier",
    label: "Customer Tier",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "customer_market_segment",
    label: "Market Segment",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "customer_sales_channel",
    label: "Sales Channel",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    key: "customer_country",
    label: "Country",
    sortable: true,
    render: (value) => value || "-",
  },
];

// Salesforce Quotes columns for materialized view
export const salesforceQuoteColumnsMaterialized: Column[] = [
  {
    key: "source_system_quote_id",
    label: "Quote ID",
    render: (value) => value || "-",
  },
  {
    key: "quote_name",
    label: "Name",
    render: (value) => value || "-",
  },
  {
    key: "quote_status",
    label: "Status",
    render: (value) => renderStatus(value),
  },
  {
    key: "quote_total_amount_usd",
    label: "Total Amount (USD)",
    render: (value) => renderCurrency(value, "USD"),
  },
  {
    key: "quote_currency_code",
    label: "Currency",
    render: (value) => value || "-",
  },
  {
    key: "quote_type",
    label: "Type",
    render: (value) => value || "-",
  },
  {
    key: "quote_created_date",
    label: "Created Date",
    render: (value) => renderDate(value),
  },
  {
    key: "quote_start_date",
    label: "Start Date",
    render: (value) => renderDate(value),
  },
  {
    key: "quote_expiration_date",
    label: "Expiration Date",
    render: (value) => renderDate(value),
  },
  {
    key: "quote_end_date",
    label: "End Date",
    render: (value) => renderDate(value),
  },
  {
    key: "is_primary_quote",
    label: "Primary",
    render: (value) => value ? "Yes" : "No",
  },
  {
    key: "is_renewal_quote",
    label: "Renewal",
    render: (value) => value ? "Yes" : "No",
  },
  {
    key: "quote_approval_status",
    label: "Approval Status",
    render: (value) => value || "-",
  },
];

// Salesforce Orders columns for materialized view
export const salesforceOrderColumnsMaterialized: Column[] = [
  {
    key: "source_system_order_id",
    label: "Order ID",
    render: (value) => value || "-",
  },
  {
    key: "order_name",
    label: "Name",
    render: (value) => value || "-",
  },
  {
    key: "order_status",
    label: "Status",
    render: (value) => renderStatus(value),
  },
  {
    key: "order_total_amount_usd",
    label: "Total Amount (USD)",
    render: (value) => renderCurrency(value, "USD"),
  },
  {
    key: "order_currency_code",
    label: "Currency",
    render: (value) => value || "-",
  },
  {
    key: "order_type",
    label: "Type",
    render: (value) => value || "-",
  },
  {
    key: "order_created_date",
    label: "Created Date",
    render: (value) => renderDate(value),
  },
  {
    key: "order_effective_date",
    label: "Effective Date",
    render: (value) => renderDate(value),
  },
  {
    key: "order_number",
    label: "Order Number",
    render: (value) => value || "-",
  },
  {
    key: "order_billing_frequency",
    label: "Billing Frequency",
    render: (value) => value || "-",
  },
];

// NetSuite Invoices columns for materialized view
export const netsuiteInvoiceColumnsMaterialized: Column[] = [
  {
    key: "source_system_invoice_id",
    label: "Invoice ID",
    render: (value) => value || "-",
  },
  {
    key: "invoice_transaction_id",
    label: "Transaction ID",
    render: (value) => value || "-",
  },
  {
    key: "invoice_customer_name",
    label: "Customer",
    render: (value) => value || "-",
  },
  {
    key: "invoice_transaction_date",
    label: "Transaction Date",
    render: (value) => renderDate(value),
  },
  {
    key: "invoice_total_amount_usd",
    label: "Total Amount (USD)",
    render: (value) => renderCurrency(value, "USD"),
  },
  {
    key: "invoice_currency_code",
    label: "Currency",
    render: (value) => value || "-",
  },
  {
    key: "invoice_status",
    label: "Status",
    render: (value) => renderStatus(value),
  },
  {
    key: "linked_order_number",
    label: "Linked Order",
    render: (value) => value || "-",
  },
  {
    key: "invoice_created_date",
    label: "Created Date",
    render: (value) => renderDate(value),
  },
  {
    key: "invoice_last_modified_date",
    label: "Last Modified",
    render: (value) => renderDate(value),
  },
];

// NetSuite Payments columns for materialized view
export const netsuitePaymentColumnsMaterialized: Column[] = [
  {
    key: "source_system_payment_id",
    label: "Payment ID",
    render: (value) => value || "-",
  },
  {
    key: "payment_transaction_id",
    label: "Transaction ID",
    render: (value) => value || "-",
  },
  {
    key: "payment_customer_name",
    label: "Customer",
    render: (value) => value || "-",
  },
  {
    key: "payment_transaction_date",
    label: "Transaction Date",
    render: (value) => renderDate(value),
  },
  {
    key: "payment_total_amount_usd",
    label: "Total Amount (USD)",
    render: (value) => renderCurrency(value, "USD"),
  },
  {
    key: "payment_currency_code",
    label: "Currency",
    render: (value) => value || "-",
  },
  {
    key: "payment_status",
    label: "Status",
    render: (value) => renderStatus(value),
  },
  {
    key: "payment_method",
    label: "Payment Method",
    render: (value) => value || "-",
  },
  {
    key: "payment_reference_number",
    label: "Reference Number",
    render: (value) => value || "-",
  },
  {
    key: "payment_created_date",
    label: "Created Date",
    render: (value) => renderDate(value),
  },
  {
    key: "payment_last_modified_date",
    label: "Last Modified",
    render: (value) => renderDate(value),
  },
];

// NetSuite Credit Memos columns for materialized view
export const netsuiteCreditMemoColumnsMaterialized: Column[] = [
  {
    key: "source_system_credit_memo_id",
    label: "Credit Memo ID",
    render: (value) => value || "-",
  },
  {
    key: "credit_memo_transaction_id",
    label: "Transaction ID",
    render: (value) => value || "-",
  },
  {
    key: "credit_memo_customer_name",
    label: "Customer",
    render: (value) => value || "-",
  },
  {
    key: "credit_memo_transaction_date",
    label: "Transaction Date",
    render: (value) => renderDate(value),
  },
  {
    key: "credit_memo_total_amount_usd",
    label: "Total Amount (USD)",
    render: (value) => renderCurrency(value, "USD"),
  },
  {
    key: "credit_memo_currency_code",
    label: "Currency",
    render: (value) => value || "-",
  },
  {
    key: "credit_memo_status",
    label: "Status",
    render: (value) => renderStatus(value),
  },
  {
    key: "credit_memo_created_date",
    label: "Created Date",
    render: (value) => renderDate(value),
  },
  {
    key: "credit_memo_last_modified_date",
    label: "Last Modified",
    render: (value) => renderDate(value),
  },
];

// Cost Metrics columns for MetricDetailsTable
export const costMetricsColumns: Column[] = [
  {
    key: "id",
    label: "ID",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs">{value || "-"}</span>
    ),
  },
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-sm max-w-[300px] truncate block" title={value}>
        {value || "-"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => renderStatus(value),
  },
  {
    key: "created_date",
    label: "Created Date",
    sortable: true,
    render: (value) => renderDate(value),
  },
  {
    key: "last_modified_date",
    label: "Last Modified",
    sortable: true,
    render: (value) => renderDate(value),
  },
];

// Products columns for MetricDetailsTable
export const productsColumns: Column[] = [
  {
    key: "id",
    label: "ID",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs">{value || "-"}</span>
    ),
  },
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-sm max-w-[300px] truncate block" title={value}>
        {value || "-"}
      </span>
    ),
  },
  {
    key: "product_code",
    label: "Product Code",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{value || "-"}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => renderStatus(value),
  },
  {
    key: "created_date",
    label: "Created Date",
    sortable: true,
    render: (value) => renderDate(value),
  },
  {
    key: "last_modified_date",
    label: "Last Modified",
    sortable: true,
    render: (value) => renderDate(value),
  },
];

// Export all column configurations
export const opportunityColumns = salesforceOpportunityColumnsMaterialized;
export const quoteColumns = salesforceQuoteColumnsMaterialized;
export const orderColumns = salesforceOrderColumnsMaterialized;
export const invoiceColumns = netsuiteInvoiceColumnsMaterialized;
export const paymentColumns = netsuitePaymentColumnsMaterialized;
export const creditMemoColumns = netsuiteCreditMemoColumnsMaterialized;
