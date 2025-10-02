"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterControls } from "./FilterControls";
import { QuickDateFilters } from "./QuickDateFilters";
import { ActiveFilters } from "./ActiveFilters";

interface DashboardFiltersProps {
  onFiltersChange: (filters: any) => void;
  data?: any;
  filters?: any;
}

export function DashboardFilters({ 
  onFiltersChange, 
  data = {}, 
  filters = {} 
}: DashboardFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  const handleQuickDate = useCallback((days: number) => {
    const now = new Date();
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const fromDate = new Date(now);
    fromDate.setUTCDate(now.getUTCDate() - days + 1);
    const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
    
    handleFilterChange("dateRange", { from, to });
  }, [handleFilterChange]);

  const clearAllFilters = useCallback(() => {
    // Reset to default 30-day range instead of clearing date range
    const now = new Date();
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const fromDate = new Date(now);
    fromDate.setUTCDate(now.getUTCDate() - 30 + 1);
    const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
    
    const clearedFilters = {
      dealSize: "all",
      customerTier: "all", 
      geolocation: "all",
      productType: "all",
      stage: "all",
      leadType: "all",
      customerType: "all",
      opportunityToQuoteTime: "all",
      dateRange: { from, to },
    };
    onFiltersChange(clearedFilters);
  }, [onFiltersChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (key === "dateRange") {
        // Don't count the default 30-day range as an active filter
        if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
          const now = new Date();
          const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
          const fromDate = new Date(now);
          fromDate.setUTCDate(now.getUTCDate() - 30 + 1);
          const defaultFrom = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
          
          const dateRange = value as { from: Date; to: Date };
          const isDefaultRange = 
            Math.abs(new Date(dateRange.from).getTime() - defaultFrom.getTime()) < 24 * 60 * 60 * 1000 &&
            Math.abs(new Date(dateRange.to).getTime() - to.getTime()) < 24 * 60 * 60 * 1000;
          
          if (!isDefaultRange) count++;
        }
      } else if (value && value !== "all") {
        count++;
      }
    });
    return count;
  }, [filters]);

  return (
    <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-secondary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Dashboard Analytics</CardTitle>
              <p className="text-sm text-muted-foreground">
                Smart filters that dynamically update available options
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <QuickDateFilters 
          onQuickDate={handleQuickDate}
          currentFilters={filters}
        />

        <FilterControls
          data={data}
          filters={filters}
          onFilterChange={handleFilterChange}
          isExpanded={isExpanded}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
        />

        {activeFilterCount > 0 && (
          <ActiveFilters
            filters={filters}
            onClearFilter={handleFilterChange}
            onClearAll={clearAllFilters}
          />
        )}
      </CardContent>
    </Card>
  );
}
