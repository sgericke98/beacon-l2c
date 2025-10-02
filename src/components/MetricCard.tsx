
import { ArrowUp, ArrowDown, TrendingUp, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PeriodComparison } from "./PeriodComparison";

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  target?: string;
  targetUnit?: string;
  status?: "good" | "okay" | "bad" | "no_data";
  // New props for period comparisons
  currentValue?: number;
  previousMonthValue?: number;
  previousQuarterValue?: number;
  // Metadata for better edge case handling
  monthMetadata?: {
    hasCurrentData: boolean;
    hasPreviousData: boolean;
    isNoData: boolean;
    isZeroToZero: boolean;
  };
  quarterMetadata?: {
    hasCurrentData: boolean;
    hasPreviousData: boolean;
    isNoData: boolean;
    isZeroToZero: boolean;
  };
  // New props for click functionality
  onClick?: () => void;
  clickable?: boolean;
  // Whether higher values are better for this metric (default: false for timing metrics)
  higherIsBetter?: boolean;
}

export const MetricCard = ({
  title,
  value,
  unit,
  trend,
  trendValue,
  target,
  targetUnit,
  status = "good",
  currentValue,
  previousMonthValue,
  previousQuarterValue,
  monthMetadata,
  quarterMetadata,
  onClick,
  clickable = false,
  higherIsBetter = false,
}: MetricCardProps) => {
  
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <ArrowUp className="w-4 h-4" />;
      case "down":
        return <ArrowDown className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getStatusColors = () => {
    switch (status) {
      case "good":
        return {
          bg: "bg-white",
          border: "border-green-200",
          text: "text-slate-700",
          value: "text-slate-900",
          badge: "bg-green-100 text-green-800 border-green-200",
          accent: "border-l-green-500",
        };
      case "okay":
        return {
          bg: "bg-white",
          border: "border-yellow-200", 
          text: "text-slate-700",
          value: "text-slate-900",
          badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
          accent: "border-l-yellow-500",
        };
      case "bad":
        return {
          bg: "bg-white",
          border: "border-red-200",
          text: "text-slate-700",
          value: "text-slate-900",
          badge: "bg-red-100 text-red-800 border-red-200",
          accent: "border-l-red-500",
        };
      case "no_data":
        return {
          bg: "bg-white",
          border: "border-gray-200",
          text: "text-gray-600",
          value: "text-gray-400",
          badge: "bg-gray-100 text-gray-600 border-gray-200",
          accent: "border-l-gray-400",
        };
      default:
        return {
          bg: "bg-white",
          border: "border-slate-200",
          text: "text-slate-700",
          value: "text-slate-900",
          badge: "bg-slate-100 text-slate-800 border-slate-200",
          accent: "border-l-slate-500",
        };
    }
  };

  const colors = getStatusColors();

  const getStatusLabel = () => {
    switch (status) {
      case "good": return "On Target";
      case "okay": return "Attention";
      case "bad": return "Critical";
      case "no_data": return "No Data";
      default: return "Normal";
    }
  };

  return (
    <TooltipProvider>
      <Card 
        className={`${colors.bg} ${colors.border} ${colors.accent} border-2 border-l-4 hover:shadow-xl transition-all duration-300 group h-full flex flex-col ${
          clickable ? 'cursor-pointer hover:scale-105' : ''
        }`}
        onClick={clickable ? onClick : undefined}
      >
        <div className="p-6 flex flex-col h-full">
          
          {/* Header with Status Badge - Fixed height */}
          <div className="flex items-start justify-between h-16 mb-4">
            <div className="flex-1">
              <h3 className={`text-base font-semibold ${colors.text} font-inter leading-tight`}>
                {title}
              </h3>
            </div>
            <Badge className={`${colors.badge} border text-xs font-medium h-fit`}>
              {getStatusLabel()}
            </Badge>
          </div>
          
          {/* Main Value - Fixed height */}
          <div className="flex items-baseline space-x-2 h-16 mb-4">
            {value === "No data available" ? (
              <div className="flex flex-col items-start justify-center w-full">
                <span className="text-sm font-medium text-gray-500 leading-tight">
                  No data available
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  with current filters
                </span>
              </div>
            ) : (
              <>
                <span className={`text-4xl font-bold ${colors.value} font-inter`}>
                  {value}
                </span>
                <span className={`text-lg font-medium ${colors.text}`}>
                  {unit}
                </span>
              </>
            )}
          </div>

          {/* Target - Compact spacing */}
          <div className="h-8 mb-2 flex items-center">
            {target && (
              <div className="pt-1 border-t border-slate-100 w-full">
                <div className={`text-sm ${colors.text} flex items-center gap-1`}>
                  <Target className="w-3 h-3" />
                  <span>Target: {target} {targetUnit}</span>
                </div>
              </div>
            )}
          </div>

          {/* Period comparisons - Balanced compact spacing */}
          <div className="h-10 mb-1">
            {(currentValue !== undefined || previousMonthValue !== undefined) && (
              <div className="pt-1 border-t border-slate-100">
                <PeriodComparison
                  currentValue={currentValue || 0}
                  previousValue={previousMonthValue || 0}
                  period="month"
                  className="text-xs"
                  metadata={monthMetadata}
                  higherIsBetter={higherIsBetter}
                />
              </div>
            )}
          </div>

          <div className="h-8">
            {(currentValue !== undefined || previousQuarterValue !== undefined) && (
              <div className="pt-0.5">
                <PeriodComparison
                  currentValue={currentValue || 0}
                  previousValue={previousQuarterValue || 0}
                  period="quarter"
                  className="text-xs"
                  metadata={quarterMetadata}
                  higherIsBetter={higherIsBetter}
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};
