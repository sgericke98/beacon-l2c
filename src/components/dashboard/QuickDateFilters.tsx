"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface QuickDateFiltersProps {
  onQuickDate: (days: number) => void;
  currentFilters: any;
}

const QUICK_DATE_OPTIONS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 60 days", days: 60 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 120 days", days: 120 },
];

export function QuickDateFilters({ onQuickDate, currentFilters }: QuickDateFiltersProps) {
  const getActiveQuickDateOption = () => {
    if (!currentFilters.dateRange?.from || !currentFilters.dateRange?.to) return null;
    
    const now = new Date();
    const from = new Date(currentFilters.dateRange.from);
    const to = new Date(currentFilters.dateRange.to);
    
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const isToday = Math.abs(nowUTC.getTime() - to.getTime()) < 24 * 60 * 60 * 1000;
    
    if (!isToday) return null;
    
    const diffDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    return QUICK_DATE_OPTIONS.find(option => option.days === diffDays) || null;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_DATE_OPTIONS.map((option) => {
        const isActive = getActiveQuickDateOption()?.days === option.days;
        return (
          <Button
            key={option.days}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onQuickDate(option.days)}
            className={`text-xs ${isActive ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
