import React, { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { DataTable, Column } from "./DataTable";
import { costMetricsColumns, productsColumns } from "@/lib/tableColumnsMaterializedViews";

interface MetricDetailsTableProps {
  metricName: string;
  data: any[];
  loading?: boolean;
  onSortChange?: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export function MetricDetailsTable({
  metricName,
  data,
  loading = false,
  onSortChange,
}: MetricDetailsTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);
  
  // Reset to first page when data changes or when current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [data.length, currentPage, totalPages]);
  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const yyyy = d.getUTCFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: string | number) => {
    if (!amount || amount === "N/A") return "-";
    if (typeof amount === "string") return amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDurationValue = (value: any) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") return value.toFixed(1);
    const match = String(value).match(/-?\d+(\.\d+)?/);
    return match ? match[0] : String(value);
  };

  // Define columns based on the metric type
  const getColumns = (): Column[] => {
    if (metricName.toLowerCase().includes("opportunity to quote")) {
      return [
        {
          key: "id",
          label: "Opportunity ID",
          sortable: true,
          render: (value) => (
            <span className="font-mono text-xs">{value || "-"}</span>
          ),
        },
        {
          key: "opportunity",
          label: "Opportunity Name",
          sortable: true,
          render: (value) => (
            <span className="font-medium text-xs max-w-[200px] truncate block" title={value}>
              {value || "-"}
            </span>
          ),
        },
        {
          key: "startDate",
          label: "Opportunity Created",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "endDate",
          label: "Quote Created",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "duration",
          label: "Days to Quote",
          sortable: true,
          render: (value) => (
            <Badge variant="outline" className="text-xs">
              {formatDurationValue(value)}
            </Badge>
          ),
        },
        {
          key: "opportunityAmountUSD",
          label: "Opportunity Amount (USD)",
          sortable: true,
          render: (value) => formatCurrency(value),
        },
        {
          key: "region",
          label: "Country",
          sortable: true,
          render: (value) => (
            <Badge variant="secondary" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
        {
          key: "status",
          label: "Status",
          sortable: true,
          render: (value) => (
            <Badge variant="default" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
      ];
    } else if (metricName.toLowerCase().includes("quote to order")) {
      return [
        {
          key: "id",
          label: "Quote ID",
          sortable: true,
          render: (value) => (
            <span className="font-mono text-xs">{value || "-"}</span>
          ),
        },
        {
          key: "opportunity",
          label: "Opportunity Name",
          sortable: true,
          render: (value) => (
            <span className="font-medium text-xs max-w-[200px] truncate block" title={value}>
              {value || "-"}
            </span>
          ),
        },
        {
          key: "startDate",
          label: "Quote Created",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "endDate",
          label: "Order Created",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "duration",
          label: "Days to Order",
          sortable: true,
          render: (value) => (
            <Badge variant="outline" className="text-xs">
              {formatDurationValue(value)}
            </Badge>
          ),
        },
        {
          key: "opportunityAmountUSD",
          label: "Opportunity Amount (USD)",
          sortable: true,
          render: (value) => formatCurrency(value),
        },
        {
          key: "orderTotalAmountUSD",
          label: "Order Total (USD)",
          sortable: true,
          render: (value) => formatCurrency(value),
        },
        {
          key: "region",
          label: "Country",
          sortable: true,
          render: (value) => (
            <Badge variant="secondary" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
        {
          key: "status",
          label: "Order Status",
          sortable: true,
          render: (value) => (
            <Badge 
              variant={value?.toLowerCase().includes("completed") ? "default" : "secondary"} 
              className="text-xs"
            >
              {value || "-"}
            </Badge>
          ),
        },
      ];
    } else if (metricName.toLowerCase().includes("order to cash time")) {
      return [
        {
          key: "opportunity",
          label: "Order Number",
          sortable: true,
          render: (value) => (
            <span className="font-mono text-xs font-medium">{value || "-"}</span>
          ),
        },
        {
          key: "invoice_number",
          label: "Invoice Number",
          sortable: true,
          render: (value) => (
            <span className="font-mono text-xs">
              {value || "-"}
            </span>
          ),
        },
        {
          key: "startDate",
          label: "Order Created Date",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "invoice_date",
          label: "Invoice Created Date",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "duration",
          label: "Gap (Days)",
          sortable: true,
          render: (value) => (
            <Badge variant="outline" className="text-xs">
              {formatDurationValue(value)}
            </Badge>
          ),
        },
        {
          key: "orderTotalUSD",
          label: "Order Total (USD)",
          sortable: true,
          render: (value) => formatCurrency(value),
        },
        {
          key: "invoiceTotalUSD",
          label: "Invoice Total (USD)",
          sortable: true,
          render: (value) => formatCurrency(value),
        },
        {
          key: "dealSize",
          label: "Deal Size (USD)",
          sortable: true,
          render: (value) => formatCurrency(value),
        },
        {
          key: "region",
          label: "Region",
          sortable: true,
          render: (value) => (
            <Badge variant="secondary" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
      ];
    } else if (metricName.toLowerCase().includes("invoice to payment")) {
      return [
        {
          key: "opportunity",
          label: "Invoice Number",
          sortable: true,
          render: (value) => (
            <span className="font-mono text-xs font-medium">{value || "-"}</span>
          ),
        },
        {
          key: "startDate",
          label: "Invoice Date",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "endDate",
          label: "Payment Date",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "duration",
          label: "Days to Payment",
          sortable: true,
          render: (value) => (
            <Badge variant="outline" className="text-xs">
              {formatDurationValue(value)}
            </Badge>
          ),
        },
        {
          key: "invoiceTotalUSD",
          label: "Invoice Amount (USD)",
          sortable: true,
          render: (value) => formatCurrency(value),
        },
        {
          key: "region",
          label: "Customer",
          sortable: true,
          render: (value) => (
            <Badge variant="secondary" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
        {
          key: "status",
          label: "Status",
          sortable: true,
          render: (value) => (
            <Badge variant="default" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
      ];
    } else if (metricName.toLowerCase().includes("active price books")) {
      // Use the cost metrics columns for price books
      return costMetricsColumns;
    } else if (metricName.toLowerCase().includes("size of product catalogue")) {
      // Use the products columns for products
      return productsColumns;
    } else {
      // Default columns for other metrics
      return [
        {
          key: "id",
          label: "ID",
          sortable: true,
          render: (value) => (
            <span className="font-mono text-xs">{value || "-"}</span>
          ),
        },
        {
          key: "opportunity",
          label: "Name",
          sortable: true,
          render: (value) => (
            <span className="font-medium text-xs max-w-[200px] truncate block" title={value}>
              {value || "-"}
            </span>
          ),
        },
        {
          key: "startDate",
          label: "Start Date",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "endDate",
          label: "End Date",
          sortable: true,
          render: (value) => formatDate(value),
        },
        {
          key: "duration",
          label: "Duration",
          sortable: true,
          render: (value) => (
            <Badge variant="outline" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
        {
          key: "dealSize",
          label: "Deal Size",
          sortable: true,
          render: (value) => formatCurrency(value),
        },
        {
          key: "region",
          label: "Region",
          sortable: true,
          render: (value) => (
            <Badge variant="secondary" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
        {
          key: "status",
          label: "Status",
          sortable: true,
          render: (value) => (
            <Badge variant="default" className="text-xs">
              {value || "-"}
            </Badge>
          ),
        },
      ];
    }
  };

  const columns = getColumns();
  const [sorting, setSorting] = useState<{ field: string; direction: "asc" | "desc" }>({ field: "startDate", direction: "desc" });
  
  // Client-side sorting: sort the data based on current sorting state
  const sortedData = React.useMemo(() => {
    if (!data || data.length === 0) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sorting.field];
      const bValue = b[sorting.field];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return sorting.direction === 'asc' ? 1 : -1;
      if (bValue === null || bValue === undefined) return sorting.direction === 'asc' ? -1 : 1;
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sorting.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle date values
      if (aValue instanceof Date && bValue instanceof Date) {
        return sorting.direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
      }
      
      // Handle string dates
      if (typeof aValue === 'string' && typeof bValue === 'string' && 
          (aValue.includes('T') || aValue.includes('-')) && 
          (bValue.includes('T') || bValue.includes('-'))) {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return sorting.direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
        }
      }
      
      // Handle string values
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return sorting.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sorting.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sorting]);

  // Map component field names to API field names (based on actual database column names)
  const mapFieldToApiField = (field: string): string => {
    // Different field mappings for different metric types
    if (metricName.toLowerCase().includes("quote to order")) {
      const fieldMapping: Record<string, string> = {
        'id': 'opportunity_id',
        'opportunity': 'opportunity_name', 
        'startDate': 'quote_created_date',
        'endDate': 'order_created_date',
        'duration': 'days_quote_to_order',
        'opportunityAmountUSD': 'amount',
        'orderTotalAmountUSD': 'order_total_amount',
        'region': 'customer_country',
        'status': 'order_status',
        'customerTier': 'customer_tier',
        'marketSegment': 'market_segment',
        'leadSource': 'lead_source',
        'type': 'type',
        'orderStatus': 'order_status',
        'orderType': 'order_order_type'
      };
      return fieldMapping[field] || field;
    } else if (metricName.toLowerCase().includes("order to cash time")) {
      // Mapping for Order to Cash Time metric
      const fieldMapping: Record<string, string> = {
        'opportunity': 'order_number',
        'invoice_number': 'invoice_number',
        'startDate': 'order_created_date',
        'invoice_date': 'invoice_date',
        'duration': 'days_order_to_invoice',
        'orderTotalUSD': 'order_total_amount_usd',
        'invoiceTotalUSD': 'invoice_total_usd',
        'dealSize': 'opportunity_amount_usd',
        'region': 'customer_country',
        'status': 'order_status',
        'type': 'order_billing_frequency'
      };
      return fieldMapping[field] || field;
    } else if (metricName.toLowerCase().includes("invoice to payment")) {
      // Mapping for Invoice to Payment metric
      const fieldMapping: Record<string, string> = {
        'opportunity': 'invoice_number',
        'startDate': 'invoice_created_date',
        'endDate': 'payment_date',
        'duration': 'durationValue', // Use durationValue for sorting
        'invoiceTotalUSD': 'invoice_total_usd',
        'region': 'invoice_entity_name',
        'status': 'invoice_status',
        'type': 'payment_status'
      };
      return fieldMapping[field] || field;
    } else if (metricName.toLowerCase().includes("active price books")) {
      // Mapping for price books
      const fieldMapping: Record<string, string> = {
        'name': 'name',
        'status': 'status',
        'created_date': 'created_date',
        'last_modified_date': 'last_modified_date'
      };
      return fieldMapping[field] || field;
    } else if (metricName.toLowerCase().includes("size of product catalogue")) {
      // Mapping for products
      const fieldMapping: Record<string, string> = {
        'name': 'name',
        'product_code': 'product_code',
        'status': 'status',
        'created_date': 'created_date',
        'last_modified_date': 'last_modified_date'
      };
      return fieldMapping[field] || field;
    } else {
      // Default mapping for Opportunity to Quote and other metrics
      const fieldMapping: Record<string, string> = {
        'id': 'opportunity_id',
        'opportunity': 'opportunity_name', 
        'startDate': 'opportunity_created_date',
        'endDate': 'quote_created_date',
        'duration': 'days_to_quote',
        'opportunityAmountUSD': 'amount',
        'orderTotalAmountUSD': 'order_total_amount',
        'region': 'customer_country',
        'status': 'stage_name',
        'customerTier': 'customer_tier',
        'marketSegment': 'market_segment',
        'leadSource': 'lead_source',
        'type': 'type',
        'orderStatus': 'order_status',
        'orderType': 'order_order_type'
      };
      return fieldMapping[field] || field;
    }
  };

  const handleSort = (field: string) => {
    const newSorting = sorting.field === field
      ? { field, direction: sorting.direction === "asc" ? "desc" as const : "asc" as const }
      : { field, direction: "asc" as const };

    setSorting(newSorting);
    
    // Optional: notify parent component for server-side sorting if needed
    // For now, we're doing client-side sorting only
    if (onSortChange) {
      const apiField = mapFieldToApiField(field);
      onSortChange(apiField, newSorting.direction);
    }
  };

  return (
    <div className="overflow-auto max-h-[70vh]">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-muted-foreground">Loading data...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">No data available</p>
          <p className="text-xs text-gray-500 mb-2">This metric may not have any records in the current filter selection.</p>
          <p className="text-xs text-gray-400">Try adjusting your filters or check if the data source is available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table Header with Pagination Info */}
          {data.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data.length} {data.length === 1 ? 'record' : 'records'} found
              </span>
              {totalPages > 1 && (
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
          )}
          
          <DataTable
            data={sortedData.slice(startIndex, endIndex)}
            columns={columns}
            sorting={sorting}
            onSort={handleSort}
            loading={false}
            emptyMessage="No records found for this metric"
            emptySubMessage="Try adjusting your filters or check if data exists for this metric"
          />
        </div>
      )}

      {data.length > 0 && (
        <div className="border-t pt-4 mt-4 space-y-4">
          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length} records
              </span>
              <span className="mx-2">•</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                className="px-2 py-1 text-xs border rounded-md bg-background"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                First
              </button>
              
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-xs border rounded-md ${
                      currentPage === pageNum
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                Next
              </button>
              
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                Last
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
