"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { FlowDetailsModal } from "@/components/FlowDetailsModal";
import { FlowLoading } from "@/components/ui/page-loading";
import { FlowVisualization } from "@/components/flow/FlowVisualization";
import { DEFAULT_FILTERS, getMetricStatus, getMetricTargets } from "@/lib/constants";




export default function FlowPage() {
  // Initialize with default 30-day filter based on opportunity_created_date (same as dashboard)
  const getDefaultDateRange = () => {
    const now = new Date();
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const fromDate = new Date(now);
    fromDate.setUTCDate(now.getUTCDate() - 30 + 1);
    const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
    
    return { from, to };
  };

  const [filters, setFilters] = useState<any>({
    ...DEFAULT_FILTERS,
    dateRange: getDefaultDateRange()
  });

  const {
    metrics,
    loading,
    error,
    filterData,
    handleSortChange,
    detailedDataLoading
  } = useDashboardData(filters);

  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Convert dashboard metrics to flow data format
  const flowData = {
    stages: metrics.map(metric => ({
      stage: metric.metric_name.replace(' Time', '').replace(' to ', ' to '),
      avgDays: Math.round(metric.value * 100) / 100,
      medianDays: Math.round(metric.value * 100) / 100, // Use same value for now
      performance: Math.round((metric.value / metric.target_max) * 100),
      vsLastMonth: metric.vsLastMonth,
      vsLastQuarter: metric.vsLastQuarter
    })),
    detailed_data: {
      "Opportunity to Quote": metrics.find(m => m.metric_name === "Opportunity to Quote Time")?.detailed_data || [],
      "Quote to Order": metrics.find(m => m.metric_name === "Quote to Order Time")?.detailed_data || [],
      "Order to Invoice": metrics.find(m => m.metric_name === "Order to Cash Time")?.detailed_data || [],
      "Invoice to Payment": metrics.find(m => m.metric_name === "Invoice to Payment")?.detailed_data || []
    }
  };

  // Create stage metrics function for FlowVisualization
  const getStageMetrics = useCallback((stageKey: string) => {
    const stageMap: Record<string, string> = {
      "opportunity-to-quote": "Opportunity to Quote Time",
      "quote-to-order": "Quote to Order Time", 
      "order-to-invoice": "Order to Cash Time",
      "invoice-to-payment": "Invoice to Payment"
    };
    
    const metricName = stageMap[stageKey];
    const metric = metrics.find(m => m.metric_name === metricName);
    
    if (!metric || !metric.detailed_data || metric.detailed_data.length === 0) {
      return {
        average: "No data",
        median: "No data",
        name: metricName,
        improvement: "No data available",
        vsLastMonth: null,
        vsLastQuarter: null,
        status: "no_data",
      };
    }
    
    // Use the same status calculation as dashboard
    const targets = getMetricTargets(metric.metric_name);
    const status = getMetricStatus(metric.value, targets.targetMin, targets.targetMax, true);
    
    return {
      average: `${Math.round(metric.value * 100) / 100} days`,
      median: `${Math.round(metric.value * 100) / 100} days`,
      name: metric.metric_name,
      improvement: `${Math.round((metric.value / metric.target_max) * 100)}% performance target achieved`,
      vsLastMonth: metric.vsLastMonth,
      vsLastQuarter: metric.vsLastQuarter,
      status: status,
    };
  }, [metrics]);

  // Get modal data for a specific stage
  const getModalData = useCallback((stage: string) => {
    const stageMap: Record<string, string> = {
      "opportunity-to-quote": "Opportunity to Quote Time",
      "quote-to-order": "Quote to Order Time",
      "order-to-invoice": "Order to Cash Time", 
      "invoice-to-payment": "Invoice to Payment"
    };
    
    const metricName = stageMap[stage];
    const metric = metrics.find(m => m.metric_name === metricName);
    return metric?.detailed_data || [];
  }, [metrics]);

  // Get stage title
  const getStageTitle = useCallback((stage: string) => {
    const titleMap: Record<string, string> = {
      "opportunity-to-quote": "Opportunity to Quote Time",
      "quote-to-order": "Quote to Order Time",
      "order-to-invoice": "Order to Invoice Time",
      "invoice-to-payment": "Invoice to Payment Time"
    };
    return titleMap[stage] || stage;
  }, []);

  // Calculate 90th percentile from actual data
  const calculate90thPercentile = useCallback((data: any[], field: string, metricKey?: string) => {
    if (!data || data.length === 0) return "No data";
    
    // Check if this metric has no data by looking at the metric itself
    if (metricKey) {
      const stageMap: Record<string, string> = {
        "opportunity-to-quote": "Opportunity to Quote Time",
        "quote-to-order": "Quote to Order Time", 
        "order-to-invoice": "Order to Cash Time",
        "invoice-to-payment": "Invoice to Payment"
      };
      
      const metricName = stageMap[metricKey];
      const metric = metrics.find(m => m.metric_name === metricName);
      
      if (!metric || !metric.detailed_data || metric.detailed_data.length === 0) {
        return "No data";
      }
    }
    
    const values = data
      .map(record => parseFloat(record[field] || 0))
      .filter(value => !isNaN(value) && value > 0)
      .sort((a, b) => a - b);
    
    if (values.length === 0) return "No data";
    
    const index = Math.ceil(values.length * 0.9) - 1;
    const percentile90 = values[index];
    return `${Math.round(percentile90 * 100) / 100} days`;
  }, [metrics]);

  const handleNodeClick = useCallback((stageKey: string) => {
    setSelectedStage(stageKey);
    setIsDialogOpen(true);
  }, []);

  const handleSortChangeWrapper = useCallback((sortBy: string, sortDirection: 'asc' | 'desc') => {
    if (selectedStage) {
      handleSortChange(sortBy, sortDirection);
    }
  }, [selectedStage, handleSortChange]);

  // Calculate overall health from dashboard metrics
  const getOverallHealth = useCallback(() => {
    // Check if we have any data
    const hasData = metrics.length > 0 && metrics.some(metric => {
      const hasValue = metric.value !== null && metric.value !== undefined;
      const hasDetailedData = metric.detailed_data && metric.detailed_data.length > 0;
      return hasValue && hasDetailedData;
    });
    
    if (!hasData) {
      return {
        status: "no_data",
        reasoning: "No data available"
      };
    }
    
    // Calculate average value and use the same status logic as dashboard
    const avgValue = metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
    
    // Get the average target range across all metrics
    const avgTargetMin = metrics.reduce((sum, metric) => {
      const targets = getMetricTargets(metric.metric_name);
      return sum + targets.targetMin;
    }, 0) / metrics.length;
    
    const avgTargetMax = metrics.reduce((sum, metric) => {
      const targets = getMetricTargets(metric.metric_name);
      return sum + targets.targetMax;
    }, 0) / metrics.length;
    
    const status = getMetricStatus(avgValue, avgTargetMin, avgTargetMax, true);
    
    return {
      status,
      reasoning: `Average value across all stages: ${Math.round(avgValue * 100) / 100} days`
    };
  }, [metrics]);

  if (loading) {
    return <FlowLoading />;
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Lead to Cash Flow
          </h1>
          <p className="text-destructive">
            Error loading metrics: {error}
          </p>
        </div>
      </div>
    );
  }

  const overallHealth = getOverallHealth();
  
  // Check if we have any data - look at detailed_data length for each metric
  const hasData = metrics.length > 0 && metrics.some(metric => {
    const hasValue = metric.value !== null && metric.value !== undefined;
    const hasDetailedData = metric.detailed_data && metric.detailed_data.length > 0;
    return hasValue && hasDetailedData;
  });
  
  return (
    <div className="space-y-8">
      <DashboardFilters 
        onFiltersChange={setFilters} 
        data={filterData}
        filters={filters}
      />
      
      <Card className="border-2 shadow-xl bg-gradient-to-br from-background to-secondary/30">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  Process Flow Analytics
                </CardTitle>
                <CardDescription className="text-base">
                  AI-powered performance analysis with real-time status indicators
                </CardDescription>
              </div>
            </div>
            {hasData && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  Overall Health
                </div>
                <Badge
                  variant={
                    overallHealth.status === "good"
                      ? "default"
                      : overallHealth.status === "okay"
                      ? "secondary"
                      : overallHealth.status === "bad"
                      ? "destructive"
                      : "outline"
                  }
                  className="mt-1"
                >
                  {overallHealth.status === "good"
                    ? "Good Performance"
                    : overallHealth.status === "okay"
                    ? "Needs Attention"
                    : overallHealth.status === "bad"
                    ? "Requires Action"
                    : "No Data Available"}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-500">No Data Available</h3>
              <p className="text-sm text-gray-400 text-center max-w-md">
                No flow metrics data found for the selected filters. Try adjusting your date range or other filter criteria.
              </p>
            </div>
          ) : (
            <>
              <FlowVisualization
                flowData={flowData}
                getStageMetrics={getStageMetrics}
                onStageClick={handleNodeClick}
                calculate90thPercentile={calculate90thPercentile}
              />

              <div className="mt-12 space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Hover over connecting lines to see detailed timing metrics and performance status
                  </p>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-emerald-500"></div>
                      <span>Good Performance</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-500"></div>
                      <span>Needs Attention</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-500"></div>
                      <span>Requires Action</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gray-400"></div>
                      <span>No Data Available</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <FlowDetailsModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        stageTitle={selectedStage ? getStageTitle(selectedStage) : ""}
        data={selectedStage ? getModalData(selectedStage) : []}
        loading={detailedDataLoading}
        onSortChange={handleSortChangeWrapper}
      />
    </div>
  );
}
