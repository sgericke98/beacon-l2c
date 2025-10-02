import React from "react";
import { Clock, Target, BarChart3, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PeriodComparison } from "@/components/PeriodComparison";
import { 
  STATUS_COLORS, 
  STATUS_LABELS, 
  STAGE_KEY_MAP, 
  PERCENTILE_90_VALUES 
} from "@/lib/flowConstants";

type FlowStatus = "good" | "okay" | "bad" | "no_data" | "excellent" | "warning";

interface FlowLineProps {
  metricKey: string;
  getStageMetrics: (stage: string) => any;
  flowData: any;
  onClick?: () => void;
  calculate90thPercentile?: (data: any[], field: string, metricKey?: string) => string;
}

export const FlowLine: React.FC<FlowLineProps> = ({
  metricKey,
  getStageMetrics,
  flowData,
  onClick,
  calculate90thPercentile,
}) => {
  const metric = getStageMetrics(metricKey);
  const stageKey = STAGE_KEY_MAP[metricKey as keyof typeof STAGE_KEY_MAP];
  const stageMetrics = getStageMetrics(stageKey);

  if (!metric) {
    return (
      <div className="flex items-center justify-center flex-1 -mx-2 p-3 rounded-xl">
        <div className="flex items-center w-full relative">
          <div className="h-0 flex-1 transition-all duration-700 ease-out relative overflow-hidden bg-gray-200">
          </div>
          <div className="flow-connector w-3 h-3 rounded-full bg-gray-300 relative z-10 transition-all duration-700 ease-out">
          </div>
          <div className="h-0 flex-1 transition-all duration-700 ease-out relative overflow-hidden bg-gray-200">
          </div>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[(metric?.status as FlowStatus) || "good"];
  const statusLabel = STATUS_LABELS[(metric?.status as FlowStatus) || "good"];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flow-line flex items-center cursor-pointer group flex-1 -mx-2 p-3 rounded-xl transition-all duration-500 ease-out hover:bg-gradient-to-r hover:from-black/5 hover:to-black/10 hover:backdrop-blur-sm hover:shadow-lg"
            onClick={onClick}
          >
            <div className="flex items-center w-full relative">
              <div
                className={`h-0 group-hover:h-[2px] flex-1 transition-all duration-700 ease-out group-hover:shadow-lg relative overflow-hidden`}
                style={{
                  background: `linear-gradient(90deg, ${statusColor} 0%, ${statusColor} 50%, transparent 50%, transparent 100%)`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
              </div>
              <div
                className={`flow-connector w-3 h-3 group-hover:w-4 group-hover:h-4 rounded-full ${statusColor} relative z-10 transition-all duration-700 ease-out group-hover:shadow-2xl group-hover:scale-110`}
                style={{
                  boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.2), 0 0 0 3px ${statusColor}30, 0 4px 12px ${statusColor}40`
                }}
              >
                <div className="absolute inset-0 rounded-full animate-pulse opacity-40" />
                <div className="absolute inset-0.5 rounded-full bg-white/30 group-hover:inset-1 transition-all duration-700" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
              <div
                className={`h-0 group-hover:h-[2px] flex-1 transition-all duration-700 ease-out group-hover:shadow-lg relative overflow-hidden`}
                style={{
                  background: `linear-gradient(90deg, transparent 0%, transparent 50%, ${statusColor} 50%, ${statusColor} 100%)`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="metric-tooltip p-4 w-80">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">{metric.name}</h4>
              </div>
              <Badge variant="outline" className="text-xs">
                {(() => {
                  // Map metric keys to stage names for accessing detailed data
                  const stageNameMap: Record<string, string> = {
                    "opportunity-to-quote": "Opportunity to Quote",
                    "quote-to-order": "Quote to Order", 
                    "order-to-invoice": "Order to Invoice",
                    "invoice-to-payment": "Invoice to Payment"
                  };
                  const stageName = stageNameMap[metricKey];
                  return flowData?.detailed_data?.[stageName]?.length || 0;
                })()} records
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Average</span>
                </div>
                <p className="font-semibold text-foreground">{metric.average}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Median</span>
                </div>
                <p className="font-semibold text-foreground">{metric.median}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">90th %</span>
                </div>
                <p className="font-semibold text-foreground">
                  {(() => {
                    if (calculate90thPercentile && flowData?.detailed_data) {
                      // Map metric keys to stage names and field names
                      const stageNameMap: Record<string, string> = {
                        "opportunity-to-quote": "Opportunity to Quote",
                        "quote-to-order": "Quote to Order", 
                        "order-to-invoice": "Order to Invoice",
                        "invoice-to-payment": "Invoice to Payment"
                      };
                      const fieldMap: Record<string, string> = {
                        "opportunity-to-quote": "duration",
                        "quote-to-order": "duration",
                        "order-to-invoice": "duration", 
                        "invoice-to-payment": "duration"
                      };
                      
                      const stageName = stageNameMap[metricKey];
                      const field = fieldMap[metricKey];
                      const data = flowData.detailed_data[stageName] || [];
                      
                      return calculate90thPercentile(data, field, metricKey);
                    }
                    return PERCENTILE_90_VALUES[metricKey as keyof typeof PERCENTILE_90_VALUES] || "N/A";
                  })()}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>vs Last Month</span>
                  </div>
                  {metric.vsLastMonth ? (
                    <PeriodComparison
                      currentValue={parseFloat(metric.average.replace(' days', ''))}
                      previousValue={metric.vsLastMonth.previousAvgDays || 0}
                      period="month"
                      className="text-xs"
                      metadata={metric.vsLastMonth.avgDaysMetadata}
                    />
                  ) : (
                    <p className="font-semibold text-muted-foreground">No data</p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>vs Last Quarter</span>
                  </div>
                  {metric.vsLastQuarter ? (
                    <PeriodComparison
                      currentValue={parseFloat(metric.average.replace(' days', ''))}
                      previousValue={metric.vsLastQuarter.previousAvgDays || 0}
                      period="quarter"
                      className="text-xs"
                      metadata={metric.vsLastQuarter.avgDaysMetadata}
                    />
                  ) : (
                    <p className="font-semibold text-muted-foreground">No data</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
