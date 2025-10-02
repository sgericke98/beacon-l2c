export interface MetricConfig {
  name: string;
  unit: string;
  targetUnit: string;
  isCountMetric?: boolean;
  targetMin: number;
  targetMax: number;
}

export const METRIC_CONFIGS: Record<string, MetricConfig> = {
  "Opportunity to Quote Time": {
    name: "Opportunity to Quote Cycle Time",
    unit: " days",
    targetUnit: " days",
    targetMin: 0,
    targetMax: 3,
  },
  "Quote to Order Time": {
    name: "Quote to Order Cycle Time",
    unit: " days",
    targetUnit: " days",
    targetMin: 0,
    targetMax: 5,
  },
  "Order to Cash Time": {
    name: "Order to Invoice Cycle Time",
    unit: " days",
    targetUnit: " days",
    targetMin: 10,
    targetMax: 15,
  },
  "Invoice to Payment": {
    name: "Invoice to Payment Cycle Time",
    unit: " days",
    targetUnit: " days",
    targetMin: 15,
    targetMax: 25,
  },
  "Active Price Books": {
    name: "Active Price Books",
    unit: "books",
    targetUnit: "books",
    isCountMetric: true,
    targetMin: 2,
    targetMax: 5,
  },
  "Size of Product Catalogue": {
    name: "Size of Product Catalogue",
    unit: "products",
    targetUnit: "products",
    isCountMetric: true,
    targetMin: 500,
    targetMax: 1000,
  },
  "Credit Memos to Invoice Ratio": {
    name: "Credit Memos to Invoice Ratio",
    unit: " %",
    targetUnit: " %",
    isCountMetric: false,
    targetMin: 5,
    targetMax: 10,
  },
  "Auto-renewed opportunities (%)": {
    name: "Auto-renewed opportunities (%)",
    unit: " %",
    targetUnit: " %",
    isCountMetric: false,
    targetMin: 70,
    targetMax: 85,
  },
};

export const DEAL_SIZE_THRESHOLDS = {
  small: { min: 0, max: 10000 },
  medium: { min: 10000, max: 100000 },
  large: { min: 100000, max: 1000000 },
  enterprise: { min: 1000000, max: Infinity },
} as const;

// Helper function to get last N days date range
export const getLastNDaysRange = (days: number = DEFAULT_PERIOD_DAYS) => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from, to };
};

// Helper function to get last 30 days date range (for backward compatibility)
export const getLast30DaysRange = () => getLastNDaysRange(DEFAULT_PERIOD_DAYS);

export const DEFAULT_FILTERS = {
  dealSize: "all",
  customerTier: "all",
  geolocation: "all",
  productType: "all",
  stage: "all",
  leadType: "all",
  customerType: "all",
  opportunityToQuoteTime: "all",
  dateRange: { from: undefined, to: undefined }, // Will be set dynamically
} as const;

export const TAB_CONFIGS = {
  "time-metrics": "Time Metrics",
  "cost-metrics": "Cost Metrics",
} as const;

// Performance thresholds for metrics (legacy - will be replaced by range-based logic)
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
} as const;

// Status tolerance percentage for range-based status calculation
export const STATUS_TOLERANCE_PERCENTAGE = 20;

// Status values
export const METRIC_STATUS = {
  GOOD: "good",
  OKAY: "okay", 
  BAD: "bad",
  EXCELLENT: "excellent",
  STABLE: "stable",
  NO_DATA: "no_data",
  UNKNOWN: "unknown",
  ACTIVE: "Active",
} as const;

// Direction values
export const TREND_DIRECTION = {
  UP: "up",
  DOWN: "down", 
  STABLE: "stable",
} as const;

// Default values for metrics
export const DEFAULT_METRIC_VALUES = {
  CHANGE_PERCENT: 0,
  AVG_DAYS_CHANGE: 0,
  PERFORMANCE_CHANGE: 0,
  RECORD_COUNT_CHANGE: 0,
  PREVIOUS_AVG_DAYS: 0,
  PREVIOUS_PERFORMANCE: 0,
  PREVIOUS_RECORD_COUNT: 0,
} as const;

// Default period length in days
export const DEFAULT_PERIOD_DAYS = 30;

/**
 * Get target configuration for a metric
 */
export function getMetricTargets(metricName: string): { targetMin: number; targetMax: number } {
  const config = METRIC_CONFIGS[metricName];
  if (!config) {
    throw new Error(`No configuration found for metric: ${metricName}`);
  }
  return {
    targetMin: config.targetMin,
    targetMax: config.targetMax,
  };
}

/**
 * Determine metric status based on value and target range
 * Rules:
 * - NO_DATA: hasData is false or value is null/undefined (no data available)
 * - GOOD: value is within target range (targetMin <= value <= targetMax)
 * - OKAY: value is within 20% tolerance above/below the range
 * - BAD: value is outside the tolerance range
 */
export function getMetricStatus(
  value: number | null | undefined, 
  targetMin: number, 
  targetMax: number, 
  hasData: boolean = true
): string {
  console.log(`🔍 [getMetricStatus] Input:`, {
    value,
    valueType: typeof value,
    targetMin,
    targetMax,
    hasData,
    isNull: value === null,
    isUndefined: value === undefined
  });

  // NO_DATA: No data available
  if (!hasData || value === null || value === undefined) {
    console.log(`📊 [getMetricStatus] Result: NO_DATA (hasData: ${hasData}, value: ${value})`);
    return METRIC_STATUS.NO_DATA;
  }
  
  // Calculate tolerance range
  const range = targetMax - targetMin;
  const tolerance = (range * STATUS_TOLERANCE_PERCENTAGE) / 100;
  
  const minWithTolerance = Math.max(0, targetMin - tolerance);
  const maxWithTolerance = targetMax + tolerance;
  
  console.log(`📊 [getMetricStatus] Range calculation:`, {
    range,
    tolerance,
    minWithTolerance,
    maxWithTolerance
  });
  
  // GOOD: Within target range
  if (value >= targetMin && value <= targetMax) {
    console.log(`📊 [getMetricStatus] Result: GOOD (value: ${value} within ${targetMin}-${targetMax})`);
    return METRIC_STATUS.GOOD;
  }
  
  // OKAY: Within tolerance range (20% above/below)
  if (value >= minWithTolerance && value <= maxWithTolerance) {
    console.log(`📊 [getMetricStatus] Result: OKAY (value: ${value} within tolerance ${minWithTolerance}-${maxWithTolerance})`);
    return METRIC_STATUS.OKAY;
  }
  
  // BAD: Outside tolerance range
  console.log(`📊 [getMetricStatus] Result: BAD (value: ${value} outside tolerance range ${minWithTolerance}-${maxWithTolerance})`);
  return METRIC_STATUS.BAD;
}

/**
 * Legacy function for backward compatibility - determines status based on performance percentage
 * @deprecated Use getMetricStatus(value, targetMin, targetMax) instead
 */
export function getMetricStatusByPerformance(performance: number): string {
  if (performance >= PERFORMANCE_THRESHOLDS.EXCELLENT) return METRIC_STATUS.GOOD;
  if (performance >= PERFORMANCE_THRESHOLDS.GOOD) return METRIC_STATUS.OKAY;
  return METRIC_STATUS.BAD;
}

/**
 * Determine trend direction based on change percentage
 */
export function getTrendDirection(changePercent: number): string {
  if (changePercent > 0) return TREND_DIRECTION.UP;
  if (changePercent < 0) return TREND_DIRECTION.DOWN;
  return TREND_DIRECTION.STABLE;
}

/**
 * Example usage of the new status rules:
 * 
 * For "Opportunity to Quote Time" with targetMin: 0, targetMax: 3:
 * - Range: 3 - 0 = 3 days
 * - Tolerance: 3 * 20% = 0.6 days
 * - Min with tolerance: max(0, 0 - 0.6) = 0 days
 * - Max with tolerance: 3 + 0.6 = 3.6 days
 * 
 * Status rules:
 * - NO_DATA: hasData is false or value is null/undefined (no data available)
 * - GOOD: 0 < value <= 3 (within target range)
 * - OKAY: 0 < value <= 3.6 (within tolerance range)
 * - BAD: value > 3.6 (outside tolerance range)
 * 
 * Examples:
 * - hasData = false or value = null/undefined → NO_DATA (no data available)
 * - hasData = true, value = 0 → GOOD (real data with 0 days - within range)
 * - hasData = true, value = 1.5 days → GOOD (within 0-3 range)
 * - hasData = true, value = 3.3 days → OKAY (within 0-3.6 tolerance range)
 * - hasData = true, value = 4.0 days → BAD (outside tolerance range)
 */
