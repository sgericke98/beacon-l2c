"use client";

import React from "react";
import { MetricCard } from "../MetricCard";
import { METRIC_CONFIGS } from "@/lib/constants";
import { createMetricCardProps, MetricData } from "@/lib/metricUtils";
import { MetricCardSkeleton } from "@/components/ui/loading";

interface MetricsGridProps {
  metrics: MetricData[];
  metricNames: string[];
  onMetricClick?: (metric: MetricData) => void;
  loading?: boolean;
}

export function MetricsGrid({ 
  metrics, 
  metricNames,
  onMetricClick, 
  loading = false
}: MetricsGridProps) {
  const getMetricByName = (name: string) => {
    return metrics.find((metric) => metric.metric_name === name);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 items-stretch">
        {metricNames.map((metricName) => (
          <MetricCardSkeleton key={metricName} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 items-stretch">
      {metricNames.map((metricName) => {
        const config = METRIC_CONFIGS[metricName];
        if (!config) {
          console.warn(`No configuration found for metric: ${metricName}`);
          return null;
        }

        const metric = getMetricByName(metricName);
        if (!metric) {
          console.warn(`No data available for metric: ${metricName}`);
          return (
            <div key={metricName} className="col-span-1">
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-4 h-full flex flex-col items-start justify-center">
                <div className="text-gray-400 mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">{config.name}</h3>
                <p className="text-xs text-gray-400">No data available with current filters</p>
              </div>
            </div>
          );
        }

        try {
          const props = createMetricCardProps(metricName, metric, config, onMetricClick);
          return <MetricCard key={metricName} {...props} />;
        } catch (error) {
          console.error(`Error creating metric card for ${metricName}:`, error);
          return null;
        }
      })}
    </div>
  );
}
