import { METRIC_CONFIGS, MetricConfig } from './constants';

export interface MetricData {
  metric_name: string;
  value: number;
  target_min: number;
  target_max: number;
  status: string;
  change_percent: number;
  direction: string;
  updated_at: string;
  detailed_data?: any[];
  // Trend comparison data
  vsLastMonth?: {
    avgDaysChange: number;
    performanceChange: number;
    recordCountChange: number;
    hasData: boolean;
    previousAvgDays?: number;
    previousPerformance?: number;
    previousRecordCount?: number;
    avgDaysMetadata?: any;
    performanceMetadata?: any;
    recordCountMetadata?: any;
  };
  vsLastQuarter?: {
    avgDaysChange: number;
    performanceChange: number;
    recordCountChange: number;
    hasData: boolean;
    previousAvgDays?: number;
    previousPerformance?: number;
    previousRecordCount?: number;
    avgDaysMetadata?: any;
    performanceMetadata?: any;
    recordCountMetadata?: any;
  };
}

export interface FormattedMetricData {
  value: string;
  trend: string;
  trendValue: string;
  target: string;
  status: string;
}

// Shared function to get real metrics data (used by both dashboard and flow tabs)
export const getRealMetricsData = async (filters: any) => {
  try {
    // Get real time metrics data using the same approach as flow tab
    const [opportunityToQuoteData, quoteToOrderData] = await Promise.all([
      fetch('/api/metrics/opportunity-to-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      }).then(res => res.json()).catch(err => {
        console.error("❌ [getRealMetricsData] Error fetching opportunity-to-quote:", err);
        return null;
      }),
      
      fetch('/api/metrics/quote-to-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      }).then(res => res.json()).catch(err => {
        console.error("❌ [getRealMetricsData] Error fetching quote-to-order:", err);
        return null;
      })
    ]);

    return {
      opportunityToQuote: opportunityToQuoteData,
      quoteToOrder: quoteToOrderData
    };
  } catch (error) {
    console.error("❌ [getRealMetricsData] Error getting real metrics:", error);
    return null;
  }
};

/**
 * Formats metric data - requires real data, no fallbacks
 */
export function formatMetricData(
  metricName: string,
  metric: MetricData,
  config: MetricConfig
): FormattedMetricData {
  if (!metric) {
    throw new Error(`No data available for metric: ${metricName}`);
  }

  // Check if we have actual data or if the value is 0 due to no data
  const hasData = metric.detailed_data && metric.detailed_data.length > 0;
  const isZeroValue = metric.value === 0;
  
  let formattedValue: string;
  if (!hasData && isZeroValue) {
    // Show "No data available" when we have no records and value is 0
    formattedValue = "No data available";
  } else if (config.isCountMetric) {
    const roundedValue = Math.round(metric.value);
    formattedValue = roundedValue.toLocaleString("en-US");
  } else {
    // For time metrics, use more precision to avoid showing 0.0 for small values
    // Use 2 decimal places for values < 1, 1 decimal place for values >= 1
    if (Math.abs(metric.value) < 1) {
      formattedValue = metric.value.toFixed(2);
    } else {
      formattedValue = metric.value.toFixed(1);
    }
  }

  return {
    value: formattedValue,
    trend: metric.direction,
    trendValue: `${Math.abs(metric.change_percent)}%`,
    target: `${metric.target_min}-${metric.target_max}`,
    status: metric.status,
  };
}

/**
 * Gets metric configuration by name
 */
export function getMetricConfig(metricName: string): MetricConfig | undefined {
  return METRIC_CONFIGS[metricName];
}

/**
 * Creates a MetricCard component with proper data formatting - requires real data
 */
export function createMetricCardProps(
  metricName: string,
  metric: MetricData,
  config: MetricConfig,
  onMetricClick?: (metric: MetricData) => void
) {
  if (!metric) {
    throw new Error(`No data available for metric: ${metricName}`);
  }

  const formattedData = formatMetricData(metricName, metric, config);
  
  // Convert trend string to expected union type
  const trend = formattedData.trend === "up" || formattedData.trend === "down" 
    ? formattedData.trend 
    : "neutral";
  
  // Convert status string to expected union type
  const status = formattedData.status === "good" || formattedData.status === "okay" || formattedData.status === "bad" || formattedData.status === "no_data"
    ? formattedData.status
    : "good";
  
  // For cost metrics, don't show comparison data since they don't have historical trend data
  const isCostMetric = metricName === "Active Price Books" || 
                      metricName === "Size of Product Catalogue" || 
                      metricName === "Credit Memos to Invoice Ratio" || 
                      metricName === "Auto-renewed opportunities (%)";
  
  // Check if we have actual data for period comparisons
  const hasData = metric.detailed_data && metric.detailed_data.length > 0;
  const isZeroValue = metric.value === 0;
  const showNoData = !hasData && isZeroValue;
  
  return {
    title: config.name,
    value: formattedData.value,
    unit: config.unit,
    trend: trend as "up" | "down" | "neutral",
    trendValue: formattedData.trendValue,
    target: formattedData.target,
    targetUnit: config.targetUnit,
    status: status as "good" | "okay" | "bad",
    // Use real trend data from the metric
    // For cost metrics, don't pass comparison data
    // For "No data" cases, don't show period comparisons
    currentValue: isCostMetric || showNoData ? undefined : metric.value,
    previousMonthValue: isCostMetric || showNoData ? undefined : metric.vsLastMonth?.previousAvgDays,
    previousQuarterValue: isCostMetric || showNoData ? undefined : metric.vsLastQuarter?.previousAvgDays,
    // Pass metadata for better edge case handling
    monthMetadata: isCostMetric || showNoData ? undefined : metric.vsLastMonth?.avgDaysMetadata,
    quarterMetadata: isCostMetric || showNoData ? undefined : metric.vsLastQuarter?.avgDaysMetadata,
    clickable: !!onMetricClick,
    onClick: onMetricClick ? () => onMetricClick(metric) : undefined,
    // For auto-renewal rate, higher values are better (green for increases)
    higherIsBetter: metricName === "Auto-renewed opportunities (%)",
  };
}
