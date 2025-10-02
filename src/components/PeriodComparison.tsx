import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PeriodComparisonProps {
  currentValue: number;
  previousValue: number;
  period: "month" | "quarter";
  className?: string;
  // Optional metadata for better edge case handling
  metadata?: {
    hasCurrentData: boolean;
    hasPreviousData: boolean;
    isNoData: boolean;
    isZeroToZero: boolean;
    changePercent?: number;
  };
  // Whether higher values are better (default: false, meaning lower is better for timing metrics)
  higherIsBetter?: boolean;
}

export function PeriodComparison({ currentValue, previousValue, period, className, metadata, higherIsBetter = false }: PeriodComparisonProps) {
  
  // Ensure values are numbers
  const current = typeof currentValue === 'number' ? currentValue : parseFloat(currentValue) || 0;
  const previous = typeof previousValue === 'number' ? previousValue : parseFloat(previousValue) || 0;
  
  // Use metadata if available, otherwise calculate
  const hasCurrentData = metadata?.hasCurrentData ?? (current > 0);
  const hasPreviousData = metadata?.hasPreviousData ?? (previous > 0);
  const isNoData = metadata?.isNoData ?? (!hasCurrentData && !hasPreviousData);
  const isZeroToZero = metadata?.isZeroToZero ?? (current === 0 && previous === 0);
  
  const changeValue = current - previous;
  // Use metadata.changePercent if available, otherwise calculate
  const changePercent = metadata?.changePercent !== undefined ? metadata.changePercent : (previous !== 0 ? (changeValue / previous) * 100 : 0);
  
  
  // Determine display text and styling based on edge cases
  let displayText: string;
  let Icon = Minus;
  let color = "text-muted-foreground";
  let bgColor = "bg-muted";
  let borderColor = "border-muted";
  
  if (isNoData || isZeroToZero) {
    // No data in either period OR both are zero - show as "No data"
    displayText = "No data";
    Icon = Minus;
    color = "text-muted-foreground";
    bgColor = "bg-gray-50";
    borderColor = "border-gray-200";
  } else if (!hasPreviousData || !hasCurrentData) {
    // Missing data in either period - show as "No data"
    displayText = "No data";
    Icon = Minus;
    color = "text-muted-foreground";
    bgColor = "bg-gray-50";
    borderColor = "border-gray-200";
  } else {
    // Normal percentage calculation
    // For timing metrics: negative change (faster) is good
    // For percentage metrics like auto-renewal: positive change (higher rate) is good
    const isGood = higherIsBetter ? changePercent > 0 : changePercent < 0;
    const isNeutral = Math.abs(changePercent) < 0.1;
    
    // Keep original arrow logic: up for positive, down for negative
    Icon = isNeutral ? Minus : changePercent > 0 ? TrendingUp : TrendingDown;
    // Only change colors based on whether the change is good or bad
    color = isNeutral ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-red-600";
    bgColor = isNeutral ? "bg-muted" : isGood ? "bg-emerald-50" : "bg-red-50";
    borderColor = isNeutral ? "border-muted" : isGood ? "border-emerald-200" : "border-red-200";
    
    displayText = isNeutral ? "No change" : `${changePercent > 0 ? "+" : ""}${Number(changePercent).toFixed(1)}%`;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge variant="outline" className={`${bgColor} ${borderColor} ${color} border text-xs font-medium px-2 py-0.5`}>
        <Icon className="h-3 w-3 mr-1" />
        {displayText}
      </Badge>
      <span className="text-xs text-muted-foreground">vs last {period}</span>
    </div>
  );
}