"use client";

import React, { useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterControlsProps {
  data: any;
  filters: any;
  onFilterChange: (key: string, value: any) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const DEAL_SIZE_OPTIONS = [
  { value: "all", label: "All Deal Sizes" },
  { value: "small", label: "Small (<$10K)" },
  { value: "medium", label: "Medium ($10K-$100K)" },
  { value: "large", label: "Large ($100K-$1M)" },
  { value: "enterprise", label: "Enterprise (>$1M)" },
];

const OPPORTUNITY_TO_QUOTE_TIME_OPTIONS = [
  { value: "all", label: "All Quote Times" },
  { value: "fast", label: "Fast (0 - 1 days)" },
  { value: "slow", label: "Slow (≥ 1 days)" },
];

const FILTER_OPTIONS_MAP: Record<string, string> = {
  customerTier: 'customerTiers',
  productType: 'productTypes',
  stage: 'stages',
  geolocation: 'geolocations',
  leadType: 'leadTypes',
  customerType: 'customerTypes',
};

export function FilterControls({ 
  data, 
  filters, 
  onFilterChange, 
  isExpanded, 
  onToggleExpanded 
}: FilterControlsProps) {
  
  const getDynamicOptions = useCallback((filterType: string) => {
    if (filterType === 'dealSize') {
      return DEAL_SIZE_OPTIONS;
    }
    
    if (filterType === 'opportunityToQuoteTime') {
      return OPPORTUNITY_TO_QUOTE_TIME_OPTIONS;
    }

    const baseOptions = [{ value: "all", label: "All" }];
    const optionsKey = FILTER_OPTIONS_MAP[filterType];
    
    if (optionsKey && data && data[optionsKey] && Array.isArray(data[optionsKey])) {
      const uniqueValues = data[optionsKey] as string[];
      const dynamicOptions = uniqueValues.map((value) => ({ value, label: value }));

      const currentValue = filters[filterType];
      if (currentValue && currentValue !== "all") {
        const valueExists = dynamicOptions.some(option => option.value === currentValue);
        if (!valueExists) {
          dynamicOptions.push({ value: currentValue, label: currentValue });
        }
      }

      return [...baseOptions, ...dynamicOptions];
    }
    return baseOptions;
  }, [data, filters]);

  const basicFilters = ["dealSize", "customerTier", "geolocation", "productType"];
  const advancedFilters = ["stage", "leadType", "customerType", "opportunityToQuoteTime"];

  return (
    <>
      {/* Basic Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {basicFilters.map((filterType) => (
          <div key={filterType} className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {filterType === "dealSize" ? "Deal Size" :
               filterType === "customerTier" ? "Customer Tier" :
               filterType === "geolocation" ? "Country" :
               filterType === "productType" ? "Product Type" :
               filterType === "opportunityToQuoteTime" ? "Quote Time" : filterType}
            </label>
            <Select 
              value={filters[filterType] || "all"} 
              onValueChange={(value) => onFilterChange(filterType, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${filterType.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {getDynamicOptions(filterType).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Advanced Filters Toggle */}
      <Button
        variant="ghost"
        onClick={onToggleExpanded}
        className="w-full justify-between"
      >
        <span>Advanced Filters</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </Button>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
          {advancedFilters.map((filterType) => (
            <div key={filterType} className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {filterType === "stage" ? "Stage" :
                 filterType === "leadType" ? "Lead Source" :
                 filterType === "customerType" ? "Customer Type" :
                 filterType === "opportunityToQuoteTime" ? "Quote Time" : filterType}
              </label>
              <Select 
                value={filters[filterType] || "all"} 
                onValueChange={(value) => onFilterChange(filterType, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${filterType.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {getDynamicOptions(filterType).map((option) => (
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
  );
}
