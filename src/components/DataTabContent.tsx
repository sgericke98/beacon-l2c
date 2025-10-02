import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, Column } from "./DataTable";
import { Pagination } from "./Pagination";
import { DynamicAnalyticsFilters } from "./DynamicAnalyticsFilters";

interface DataTabContentProps {
  title: string;
  data: any[];
  columns: Column[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showFilters?: boolean;
  filters?: any;
  onFiltersChange?: (filters: any) => void;
  filterFields?: Array<{ key: string; label: string; options: string[] }>;
  targetCurrency?: string;
  emptyMessage?: string;
  emptySubMessage?: string;
  hideDealSize?: boolean;
  hideDateRange?: boolean;
  sorting?: { field: string; direction: 'asc' | 'desc' };
  onSort?: (field: string) => void;
}

export function DataTabContent({
  title,
  data,
  columns,
  loading,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  showFilters = false,
  filters,
  onFiltersChange,
  filterFields = [],
  targetCurrency = "USD",
  emptyMessage = "No data found",
  emptySubMessage,
  hideDealSize = false,
  hideDateRange = false,
  sorting,
  onSort,
}: DataTabContentProps) {
  const startItem = Math.max(1, (currentPage - 1) * pageSize + 1);
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-4">
      {/* Analytics Filters */}
      {showFilters && onFiltersChange && (
        <DynamicAnalyticsFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          filterFields={filterFields}
          targetCurrency={targetCurrency}
          hideDealSize={hideDealSize}
          hideDateRange={hideDateRange}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Showing {startItem} to {endItem} of {totalCount} records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTable
            data={data}
            columns={columns}
            loading={loading}
            emptyMessage={emptyMessage}
            emptySubMessage={emptySubMessage}
            sorting={sorting}
            onSort={onSort}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
