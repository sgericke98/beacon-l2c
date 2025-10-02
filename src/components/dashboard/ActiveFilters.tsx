"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ActiveFiltersProps {
  filters: any;
  onClearFilter: (key: string, value: any) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onClearFilter, onClearAll }: ActiveFiltersProps) {
  const clearFilter = (key: string) => {
    const clearedValue = key === "dateRange" 
      ? { from: undefined, to: undefined }
      : "all";
    onClearFilter(key, clearedValue);
  };

  return (
    <div className="flex items-center gap-2 pt-2 border-t">
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {Object.entries(filters).map(([key, value]) => {
        if (key === "dateRange") {
          const dateRange = value as { from?: Date; to?: Date } | undefined;
          if (dateRange?.from || dateRange?.to) {
            return (
              <Badge key={key} variant="secondary" className="text-xs">
                Date Range
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter(key)}
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
              {key}: {String(value)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter(key)}
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
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Clear all
      </Button>
    </div>
  );
}
