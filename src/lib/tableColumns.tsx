import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Column } from "@/components/DataTable";
import { cn } from "@/lib/utils";

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const salesforceOpportunityColumns = (
  targetCurrency: string
): Column[] => [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-xs" title={value}>
        {value || "-"}
      </span>
    ),
  },
  {
    key: "created_date",
    label: "Created",
    sortable: true,
  },
  {
    key: "close_date",
    label: "Close Date",
    sortable: true,
  },
  {
    key: "amount",
    label: "Amount (Original)",
    sortable: true,
    render: (value, record) =>
      value
        ? `${new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)} ${
            record.currency_iso_code || ""
          }`
        : "-",
  },
  {
    key: "stage_name",
    label: "Stage",
    sortable: true,
    render: (value) => (
      <Badge
        variant={
          value?.toLowerCase().includes("closed won")
            ? "default"
            : value?.toLowerCase().includes("closed lost")
            ? "destructive"
            : "secondary"
        }
        className="text-[10px]"
      >
        {value || "-"}
      </Badge>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
  },
  {
    key: "customer_country",
    label: "Country",
    sortable: true,
  },
];

export const salesforceQuoteColumns = (targetCurrency: string): Column[] => [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-xs">{value || "-"}</span>
    ),
  },
  {
    key: "start_date",
    label: "Start Date",
    sortable: true,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => (
      <Badge variant="outline" className="text-xs">
        {value || "-"}
      </Badge>
    ),
  },
  {
    key: "net_amount",
    label: "Net Amount (Original)",
    sortable: true,
    render: (value, record) =>
      value
        ? `${new Intl.NumberFormat("en-US").format(value)} ${
            record.currency_iso_code || ""
          }`
        : "-",
  },
  {
    key: "net_amount",
    label: "Net Amount (Original)",
    sortable: true,
    render: (value, record) =>
      value
        ? `${new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)} ${
            record.currency_iso_code || ""
          }`
        : "-",
  },
  {
    key: "quote_type",
    label: "Type",
    sortable: true,
  },
  {
    key: "billing_country",
    label: "Billing Country",
    sortable: true,
  },
  {
    key: "payment_terms",
    label: "Payment Terms",
    sortable: true,
  },
  {
    key: "billing_frequency",
    label: "Billing Frequency",
    sortable: true,
  },
];

export const salesforceOrderColumns = (targetCurrency: string): Column[] => [
  {
    key: "order_number",
    label: "Order Number",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-xs">{value || "-"}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => (
      <Badge variant="outline" className="text-xs">
        {value || "-"}
      </Badge>
    ),
  },
  {
    key: "effective_date",
    label: "Effective Date",
    sortable: true,
  },
  {
    key: "total_amount",
    label: "Total Amount (Original)",
    sortable: true,
    render: (value, record) =>
      value
        ? `${new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)} ${
            record.currency_iso_code || ""
          }`
        : "-",
  },
  {
    key: "total_amount",
    label: "Total Amount (Original)",
    sortable: true,
    render: (value, record) =>
      value
        ? `${new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)} ${
            record.currency_iso_code || ""
          }`
        : "-",
  },
  {
    key: "created_date",
    label: "Created Date",
    sortable: true,
  },
  {
    key: "order_type",
    label: "Type",
    sortable: true,
  },
  {
    key: "billing_frequency",
    label: "Billing Frequency",
    sortable: true,
  },
  {
    key: "shipping_country_code",
    label: "Shipping Country",
    sortable: true,
  },
];

export const netsuiteInvoiceColumns: Column[] = [
  {
    key: "tran_id",
    label: "Invoice #",
    sortable: true,
    render: (value) => <span className="font-mono text-xs">{value}</span>,
  },
  {
    key: "entity_name",
    label: "Customer",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-xs" title={value}>
        {value}
      </span>
    ),
  },
  {
    key: "tran_date",
    label: "Date",
    sortable: true,
  },
  {
    key: "total",
    label: "Amount",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs text-right">
        {value?.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) || "0.00"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => (
      <Badge className={cn("capitalize text-xs", getStatusColor(value))}>
        {value || "Unknown"}
      </Badge>
    ),
  },
  {
    key: "custbody_cw_sfdcordernumber",
    label: "SF Order #",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs text-blue-600">
        {value || "-"}
      </span>
    ),
  },
];

export const netsuitePaymentColumns: Column[] = [
  {
    key: "tran_id",
    label: "Payment #",
    sortable: true,
    render: (value) => <span className="font-mono text-xs">{value}</span>,
  },
  {
    key: "entity_name",
    label: "Customer",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-xs" title={value}>
        {value}
      </span>
    ),
  },
  {
    key: "tran_date",
    label: "Date",
    sortable: true,
  },
  {
    key: "total",
    label: "Amount",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs text-right">
        {value?.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) || "0.00"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => (
      <Badge className={cn("capitalize text-xs", getStatusColor(value))}>
        {value || "Unknown"}
      </Badge>
    ),
  },
  {
    key: "payment_method",
    label: "Payment Method",
    sortable: true,
    render: (value) => (
      <span className="text-xs">
        {value || "-"}
      </span>
    ),
  },
  {
    key: "reference_number",
    label: "Reference #",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs">
        {value || "-"}
      </span>
    ),
  },
];

export const costMetricsColumns: Column[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-xs" title={value}>
        {value || "-"}
      </span>
    ),
  },
  {
    key: "total",
    label: "Total",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs text-right">
        {value?.toLocaleString("en-US") || "0"}
      </span>
    ),
  },
  {
    key: "active",
    label: "Active",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs text-right text-green-600">
        {value?.toLocaleString("en-US") || "0"}
      </span>
    ),
  },
  {
    key: "inactive",
    label: "Inactive",
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs text-right text-gray-500">
        {value?.toLocaleString("en-US") || "0"}
      </span>
    ),
  },
  {
    key: "calculation_date",
    label: "Calculation Date",
    sortable: true,
    render: (value) => (
      <span className="text-xs">
        {value ? new Date(value).toLocaleDateString() : "-"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => (
      <Badge variant="outline" className="text-xs">
        {value || "-"}
      </Badge>
    ),
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    render: (value) => (
      <span className="text-xs">
        {value ? new Date(value).toLocaleDateString() : "-"}
      </span>
    ),
  },
  {
    key: "updated_at",
    label: "Updated",
    sortable: true,
    render: (value) => (
      <span className="text-xs">
        {value ? new Date(value).toLocaleDateString() : "-"}
      </span>
    ),
  },
];
