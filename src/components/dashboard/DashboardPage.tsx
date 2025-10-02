"use client";

import React, { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardFilters } from "./DashboardFilters";
import { MetricsGrid } from "./MetricsGrid";
import { MetricDetailsModal } from "./MetricDetailsModal";
import { DashboardLoading } from "@/components/ui/page-loading";
import { ErrorModal } from "@/components/ErrorModal";
import { useDashboardData } from "@/hooks/useDashboardData";
import { authenticatedApiCall } from "@/lib/apiClient";
import { TAB_CONFIGS } from "@/lib/constants";
import { MetricData } from "@/lib/metricUtils";

const TIME_METRICS = [
  "Opportunity to Quote Time",
  "Quote to Order Time", 
  "Order to Cash Time",
  "Invoice to Payment",
];

const COST_METRICS = [
  "Active Price Books",
  "Size of Product Catalogue",
  "Credit Memos to Invoice Ratio",
  "Auto-renewed opportunities (%)",
];

export default function DashboardPage() {
  // Initialize with default 30-day filter based on opportunity_created_date
  const getDefaultDateRange = () => {
    const now = new Date();
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const fromDate = new Date(now);
    fromDate.setUTCDate(now.getUTCDate() - 30 + 1);
    const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
    
    return { from, to };
  };

  const [filters, setFilters] = useState<any>({
    dateRange: getDefaultDateRange()
  });
  const [selectedMetric, setSelectedMetric] = useState<MetricData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    metrics: timeMetrics,
    loading: timeLoading,
    error: timeError,
    filterData,
    handleMetricClick: handleTimeMetricClick,
    handleSortChange: handleTimeSortChange,
    detailedDataLoading: timeDetailedDataLoading
  } = useDashboardData(filters, 'time');

  const {
    metrics: costMetrics,
    loading: costLoading,
    error: costError,
    handleMetricClick: handleCostMetricClick,
    handleSortChange: handleCostSortChange,
    detailedDataLoading: costDetailedDataLoading
  } = useDashboardData(filters, 'cost');

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  const handleTimeMetricSelect = useCallback((metric: MetricData) => {
    setSelectedMetric(metric);
    setIsModalOpen(true);
  }, []);

  const handleCostMetricSelect = useCallback(async (metric: MetricData) => {
    // If it's the Active Price Books metric, fetch detailed data first
    if (metric.metric_name === "Active Price Books" && (!metric.detailed_data || metric.detailed_data.length === 0)) {
      try {
        const response = await fetch('/api/metrics/pricebook-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {},
            page: 1,
            pageSize: 1000 // Increased to get all records
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.detailed_data) {
            // Update the metric with the detailed data
            const updatedMetric = {
              ...metric,
              detailed_data: data.detailed_data
            };
            setSelectedMetric(updatedMetric);
            setIsModalOpen(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching pricebook details:', error);
      }
    }
    
    // If it's the Size of Product Catalogue metric, fetch detailed data first
    if (metric.metric_name === "Size of Product Catalogue" && (!metric.detailed_data || metric.detailed_data.length === 0)) {
      try {
        const response = await authenticatedApiCall('/api/metrics/products-metrics', {
          method: 'POST',
          body: JSON.stringify({
            filters: {},
            sortBy: 'name',
            sortDirection: 'asc'
          })
        });
        
        if (response.success) {
          const data = response.data;
          
          if (data.success && data.detailed_data) {
            // Update the metric with the detailed data
            const updatedMetric = {
              ...metric,
              detailed_data: data.detailed_data
            };
            setSelectedMetric(updatedMetric);
            setIsModalOpen(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching products details:', error);
      }
    }
    
    setSelectedMetric(metric);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMetric(null);
  }, []);

  const loading = timeLoading || costLoading;
  const error = timeError || costError;

  console.log('🔥 Dashboard state:', { 
    timeLoading, 
    costLoading, 
    timeError, 
    costError, 
    timeMetrics: timeMetrics, 
    costMetrics: costMetrics,
    COST_METRICS 
  });

  if (loading) {
    return <DashboardLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <ErrorModal
          isOpen={true}
          onClose={() => window.location.reload()}
          onRetry={() => window.location.reload()}
          title="Dashboard Error"
          message={`Failed to load dashboard metrics: ${error}. This could be due to a connection issue or missing data. Please check your internet connection and try again.`}
          showRetry={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <DashboardFilters 
          onFiltersChange={handleFiltersChange}
          data={filterData}
          filters={filters}
        />

        <div className="space-y-6">
          <Tabs defaultValue="time-metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="time-metrics">Time Metrics</TabsTrigger>
              <TabsTrigger value="cost-metrics">Cost Metrics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="time-metrics" className="space-y-4">
              <MetricsGrid
                metrics={timeMetrics}
                metricNames={TIME_METRICS}
                onMetricClick={handleTimeMetricSelect}
                loading={timeLoading}
              />
            </TabsContent>
            
            <TabsContent value="cost-metrics" className="space-y-4">
              <MetricsGrid
                metrics={costMetrics}
                metricNames={COST_METRICS}
                onMetricClick={handleCostMetricSelect}
                loading={costLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MetricDetailsModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        metricName={selectedMetric?.metric_name || ""}
        data={selectedMetric?.detailed_data || []}
        loading={timeDetailedDataLoading || costDetailedDataLoading}
        onSortChange={selectedMetric?.metric_name && TIME_METRICS.includes(selectedMetric.metric_name) ? handleTimeSortChange : handleCostSortChange}
      />
    </div>
  );
}
