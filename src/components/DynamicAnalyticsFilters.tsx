import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilterField {
  key: string;
  label: string;
  options: string[];
}

interface DynamicAnalyticsFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  filterFields: FilterField[];
  targetCurrency?: string;
  title?: string;
  hideDealSize?: boolean;
  hideDateRange?: boolean;
}

export function DynamicAnalyticsFilters({
  filters,
  onFiltersChange,
  filterFields,
  targetCurrency = "USD",
  title = "Filters",
  hideDealSize = false,
  hideDateRange = false,
}: DynamicAnalyticsFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // Get deal size options with USD currency
  const getDealSizeOptions = (currency: string) => {
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    return [
      { value: "all", label: "All Deal Sizes" },
      { value: "small", label: `Small (< ${formatAmount(10000)})` },
      { value: "medium", label: `Medium (${formatAmount(10000)} - ${formatAmount(100000)})` },
      { value: "large", label: `Large (${formatAmount(100000)} - ${formatAmount(1000000)})` },
      { value: "enterprise", label: `Enterprise (> ${formatAmount(1000000)})` },
    ];
  };

  const handleDateChange = (key: string, value: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [key]: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Deal Size Filter */}
          {!hideDealSize && (
            <div className="space-y-2">
              <Label htmlFor="dealSize" className="text-sm font-medium">
                Deal Size
              </Label>
              <Select
                value={filters.dealSize || "all"}
                onValueChange={(value) => handleFilterChange("dealSize", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deal size" />
                </SelectTrigger>
                <SelectContent>
                  {getDealSizeOptions(targetCurrency).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dynamic Filters */}
          {filterFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <Select
                value={filters[field.key] || "all"}
                onValueChange={(value) => handleFilterChange(field.key, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {field.label}</SelectItem>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Date Range Filters */}
          {!hideDateRange && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateRange?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange?.from ? (
                          format(filters.dateRange.from, "PPP")
                        ) : (
                          <span>From date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange?.from}
                        onSelect={(date) => handleDateChange("from", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">&nbsp;</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateRange?.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange?.to ? (
                          format(filters.dateRange.to, "PPP")
                        ) : (
                          <span>To date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange?.to}
                        onSelect={(date) => handleDateChange("to", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
