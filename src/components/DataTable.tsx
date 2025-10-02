import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Database, ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { DataTableSkeleton } from "@/components/ui/loading";

export interface Column {
  key: string;
  label: string;
  render?: (value: any, record: any) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  loading?: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
  sorting?: { field: string; direction: 'asc' | 'desc' };
  onSort?: (field: string) => void;
}

export function DataTable({
  data,
  columns,
  loading = false,
  emptyMessage = "No data found",
  emptySubMessage,
  sorting,
  onSort,
}: DataTableProps) {
  const renderCell = (column: Column, record: any) => {
    const value = record[column.key];
    
    if (column.render) {
      return column.render(value, record);
    }

    // Default rendering based on data type
    if (value === null || value === undefined) {
      return "-";
    }

    if (typeof value === "string" && value.includes("T")) {
      // Try to parse as date
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return format(date, "dd/MM/yyyy");
      }
    }

    if (typeof value === "number") {
      return value.toLocaleString();
    }

    return value;
  };


  if (loading) {
    return <DataTableSkeleton rows={10} columns={columns.length} />;
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table className="text-xs w-full">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortable ? (
                  <button
                    onClick={() => onSort?.(column.key)}
                    className="flex items-center gap-1 font-semibold hover:text-primary transition-colors"
                  >
                    <span>{column.label}</span>
                    {sorting?.field === column.key && (
                      sorting.direction === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                  </button>
                ) : (
                  <span className="font-semibold">{column.label}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-12">
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Database className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{emptyMessage}</p>
                    {emptySubMessage && (
                      <p className="text-xs text-gray-500 mt-1">{emptySubMessage}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Try adjusting your filters or check your data connection
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((record, index) => (
              <TableRow key={record.id || index} className="hover:bg-muted/50">
                {columns.map((column) => (
                  <TableCell key={column.key} className="text-xs py-2">
                    {renderCell(column, record)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
