import { useState, useEffect, useCallback, useMemo } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Shared interfaces and constants
export interface FilterState {
  dealSize: string;
  customerTier: string;
  geolocation: string;
  productType: string;
  stage: string;
  leadType: string;
  customerType: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

interface UnifiedFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  data?: any[];
  filters?: FilterState;
  title?: string;
  showExpandableFilters?: boolean;
  showFlowMetrics?: boolean;
  flowData?: any;
  dataType?: 'opportunities' | 'quotes' | 'orders' | 'flow';
  variant?: 'default' | 'compact' | 'expanded';
}

// Shared constants
const QUICK_DATE_OPTIONS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 60 days", days: 60 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 120 days", days: 120 },
];

const DEAL_SIZE_OPTIONS = [
  { value: "all", label: "All Deal Sizes" },
  { value: "small", label: "Small (<$10K)" },
  { value: "medium", label: "Medium ($10K-$100K)" },
  { value: "large", label: "Large ($100K-$1M)" },
  { value: "enterprise", label: "Enterprise (>$1M)" },
];

// Filter field mapping - using original field names from sampleRecords
const FILTER_FIELD_MAP: Record<string, string> = {
  customerTier: 'customer_tier',
  productType: 'market_segment',
  stage: 'stage_name',
  geolocation: 'customer_country',
  leadType: 'lead_source',
  customerType: 'type', // Use 'type' field which exists in the data
};

// Utility functions
const getUniqueValues = (data: any[], field: string): string[] => {
  return data
    .map((item) => item[field])
    .filter((value) => value && value.trim() !== "")
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();
};

const getActiveFilterCount = (filters: FilterState): number => {
  let count = 0;
  Object.entries(filters).forEach(([key, value]) => {
    if (key === "dateRange") {
      if (value.from || value.to) count++;
    } else if (value && value !== "all") {
      count++;
    }
  });
  return count;
};

export function UnifiedFilters({
  onFiltersChange,
  data = [],
  filters: externalFilters,
  title = "Data Filters",
  showExpandableFilters = true,
  showFlowMetrics = false,
  flowData,
  dataType = 'flow',
  variant = 'default',
}: UnifiedFiltersProps) {
  // State management
  const [internalFilters, setInternalFilters] = useState<FilterState>({
    dealSize: "all",
    customerTier: "all",
    geolocation: "all",
    productType: "all",
    stage: "all",
    leadType: "all",
    customerType: "all",
    dateRange: { from: undefined, to: undefined },
  });

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(variant === 'expanded');
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Use external filters if provided, otherwise use internal filters
  const filters = externalFilters || internalFilters;

  // Memoized filter update logic to prevent unnecessary re-renders
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    if (externalFilters) {
      onFiltersChange(newFilters);
    } else {
      setInternalFilters(newFilters);
      onFiltersChange(newFilters);
    }
  }, [filters, externalFilters, onFiltersChange]);

  // Memoized dynamic filter options generation to prevent unnecessary recalculations
  const getDynamicFilterOptions = useCallback((
    filterType: "customerTier" | "productType" | "stage" | "geolocation" | "leadType" | "customerType" | "dealSize"
  ) => {
    if (filterType === 'dealSize') {
      return DEAL_SIZE_OPTIONS;
    }

    const baseOptions = [{ value: "all", label: "All" }];
    const fieldName = FILTER_FIELD_MAP[filterType];
    
    // Check if the field exists in the data
    if (fieldName && data.length > 0 && data[0] && fieldName in data[0]) {
      const uniqueValues = getUniqueValues(data, fieldName);
      const dynamicOptionsList = uniqueValues.map((value) => ({ value, label: value }));

      // Include current filter value even if it's not in current options (for cascading filters)
      const currentValue = filters[filterType];
      if (currentValue && currentValue !== "all") {
        const valueExists = dynamicOptionsList.some(option => option.value === currentValue);
        if (!valueExists) {
          dynamicOptionsList.push({ value: currentValue, label: currentValue });
        }
      }

      return [...baseOptions, ...dynamicOptionsList];
    }
    return baseOptions;
  }, [data, filters]);

  // Date range utilities
  const setQuickDateRange = (days: number) => {
    const now = new Date();
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const fromDate = new Date(now);
    fromDate.setUTCDate(now.getUTCDate() - days + 1);
    const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
    updateFilter("dateRange", { from, to });
  };

  const getActiveQuickDateOption = () => {
    if (!filters.dateRange.from || !filters.dateRange.to) return null;
    
    const now = new Date();
    const from = new Date(filters.dateRange.from);
    const to = new Date(filters.dateRange.to);
    
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const isToday = Math.abs(nowUTC.getTime() - to.getTime()) < 24 * 60 * 60 * 1000;
    
    if (!isToday) return null;
    
    const diffDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    return QUICK_DATE_OPTIONS.find(option => option.days === diffDays) || null;
  };

  // Filter management
  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      dealSize: "all",
      customerTier: "all",
      geolocation: "all",
      productType: "all",
      stage: "all",
      leadType: "all",
      customerType: "all",
      dateRange: { from: undefined, to: undefined },
    };
    
    if (externalFilters) {
      onFiltersChange(clearedFilters);
    } else {
      setInternalFilters(clearedFilters);
      onFiltersChange(clearedFilters);
    }
  };

  const clearFilter = (key: keyof FilterState) => {
    const clearedValue = key === "dateRange" 
      ? { from: undefined, to: undefined }
      : "all";
    updateFilter(key, clearedValue);
  };

  const activeFilterCount = getActiveFilterCount(filters);

  // Render based on variant
  if (variant === 'compact') {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{title}</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs h-auto py-1 px-2"
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            <Select value={filters.dealSize} onValueChange={(value) => updateFilter("dealSize", value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Deal Size" />
              </SelectTrigger>
              <SelectContent>
                {getDynamicFilterOptions("dealSize").map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {["customerTier", "geolocation", "productType", "stage", "leadType", "customerType"].map((filterType) => (
              <Select
                key={filterType}
                value={filters[filterType as keyof FilterState] as string}
                onValueChange={(value) => updateFilter(filterType as keyof FilterState, value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={filterType === "geolocation" ? "Region" : filterType} />
                </SelectTrigger>
                <SelectContent>
                  {getDynamicFilterOptions(filterType as any).map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}

            {/* Quick Date Range Buttons */}
            <div className="flex gap-1">
              {QUICK_DATE_OPTIONS.map((option) => {
                const isActive = getActiveQuickDateOption()?.days === option.days;
                return (
                  <Button
                    key={option.days}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuickDateRange(option.days)}
                    className={`h-8 text-xs ${isActive ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default/expanded variant
  return (
    <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-secondary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {showFlowMetrics 
                  ? "AI-powered performance analysis with real-time status indicators"
                  : "Smart filters that dynamically update available options"
                }
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Date Range Buttons */}
        <div className="flex flex-wrap gap-2">
          {QUICK_DATE_OPTIONS.map((option) => {
            const isActive = getActiveQuickDateOption()?.days === option.days;
            return (
              <Button
                key={option.days}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickDateRange(option.days)}
                className={`text-xs ${isActive ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        {/* Basic Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["dealSize", "customerTier", "geolocation", "productType"].map((filterType) => (
            <div key={filterType} className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                {filterType === "dealSize" ? "Deal Size" :
                 filterType === "customerTier" ? "Customer Tier" :
                 filterType === "geolocation" ? "Country" :
                 filterType === "productType" ? "Product Type" : filterType}
                {isLoadingOptions && (
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </label>
              <Select 
                value={filters[filterType as keyof FilterState] as string} 
                onValueChange={(value) => updateFilter(filterType as keyof FilterState, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${filterType.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {getDynamicFilterOptions(filterType as any).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Expandable Advanced Filters */}
        {showExpandableFilters && (
          <>
            <Button
              variant="ghost"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="w-full justify-between"
            >
              <span>Advanced Filters</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isFiltersExpanded && "rotate-180")} />
            </Button>

            {isFiltersExpanded && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t">
                {["stage", "leadType", "customerType"].map((filterType) => (
                  <div key={filterType} className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      {filterType === "stage" ? "Stage" :
                       filterType === "leadType" ? "Lead Source" :
                       filterType === "customerType" ? "Customer Type" : filterType}
                      {isLoadingOptions && (
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </label>
                    <Select 
                      value={filters[filterType as keyof FilterState] as string} 
                      onValueChange={(value) => updateFilter(filterType as keyof FilterState, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${filterType.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getDynamicFilterOptions(filterType as any).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {Object.entries(filters).map(([key, value]) => {
              if (key === "dateRange") {
                if (value.from || value.to) {
                  return (
                    <Badge key={key} variant="secondary" className="text-xs">
                      Date Range
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearFilter(key as keyof FilterState)}
                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                }
              } else if (value && value !== "all") {
                return (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearFilter(key as keyof FilterState)}
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              }
              return null;
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}