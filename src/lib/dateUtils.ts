/**
 * Date utility functions for period comparisons
 */

export interface DateRange {
  from: string;
  to: string;
}

export interface PeriodComparison {
  current: DateRange;
  lastMonth: DateRange;
  lastQuarter: DateRange;
}

/**
 * Get date ranges for current vs last month vs last quarter comparison
 * @param currentPeriod - The current period date range (from UI filter)
 * @param periodLengthDays - Length of the current period in days (30/60/90 from UI)
 */
export function getPeriodComparison(
  currentPeriod: { from: string; to: string } | null = null,
  periodLengthDays: number = 30
): PeriodComparison {
  let currentFrom: Date;
  let currentTo: Date;
  
  if (currentPeriod) {
    // Use the provided current period from UI filter
    currentFrom = new Date(currentPeriod.from);
    currentTo = new Date(currentPeriod.to);
  } else {
    // Default: Last N days from today (UI filter options: 30/60/90 days)
    const now = new Date();
    currentTo = new Date(now);
    currentFrom = new Date(now);
    currentFrom.setDate(currentFrom.getDate() - periodLengthDays);
  }
  
  // For periods >= 60 days, use completely separate periods to avoid overlap
  if (periodLengthDays >= 60) {
    // Last month: 30 days completely before the current period (no overlap)
    const lastMonthTo = new Date(currentFrom);
    lastMonthTo.setDate(lastMonthTo.getDate() - 1); // Day before current period starts
    const lastMonthFrom = new Date(lastMonthTo);
    lastMonthFrom.setDate(lastMonthFrom.getDate() - 30); // 30 days before that
    
    // Last quarter: 90 days completely before the current period (no overlap)
    const lastQuarterTo = new Date(currentFrom);
    lastQuarterTo.setDate(lastQuarterTo.getDate() - 1); // Day before current period starts
    const lastQuarterFrom = new Date(lastQuarterTo);
    lastQuarterFrom.setDate(lastQuarterFrom.getDate() - 90); // 90 days before that
    
    const result = {
      current: {
        from: currentFrom.toISOString().split('T')[0],
        to: currentTo.toISOString().split('T')[0]
      },
      lastMonth: {
        from: lastMonthFrom.toISOString().split('T')[0],
        to: lastMonthTo.toISOString().split('T')[0]
      },
      lastQuarter: {
        from: lastQuarterFrom.toISOString().split('T')[0],
        to: lastQuarterTo.toISOString().split('T')[0]
      }
    };
    
    
    return result;
  }
  
  // For periods < 60 days, use original logic
  // Last month: 30 days immediately before current period
  const lastMonthTo = new Date(currentFrom);
  const lastMonthFrom = new Date(currentFrom);
  lastMonthFrom.setDate(lastMonthFrom.getDate() - 30);
  
  // Last quarter: 90 days immediately before current period
  const lastQuarterTo = new Date(currentFrom);
  const lastQuarterFrom = new Date(currentFrom);
  lastQuarterFrom.setDate(lastQuarterFrom.getDate() - 90);
  
  const result = {
    current: {
      from: currentFrom.toISOString().split('T')[0],
      to: currentTo.toISOString().split('T')[0]
    },
    lastMonth: {
      from: lastMonthFrom.toISOString().split('T')[0],
      to: lastMonthTo.toISOString().split('T')[0]
    },
    lastQuarter: {
      from: lastQuarterFrom.toISOString().split('T')[0],
      to: lastQuarterTo.toISOString().split('T')[0]
    }
  };
  
  
  return result;
}

/**
 * Calculate extended date range to cover current period + 3 months for single fetch
 * This ensures we have enough data to compute all period comparisons
 */
export function getExtendedDateRange(
  currentPeriod: { from: string; to: string } | null = null,
  periodLengthDays: number = 30
): { from: string; to: string } {
  // Always calculate from today, ignoring currentPeriod to ensure correct extended range
  const now = new Date();
  const currentTo = new Date(now);
  const currentFrom = new Date(now);
  currentFrom.setDate(currentFrom.getDate() - periodLengthDays);
  
  // Extend range to cover current + 90 days (quarter) before current period
  const extendedFrom = new Date(currentFrom);
  extendedFrom.setDate(extendedFrom.getDate() - 90);
  
  const result = {
    from: extendedFrom.toISOString().split('T')[0],
    to: currentTo.toISOString().split('T')[0]
  };
  
  
  return result;
}

/**
 * Calculate percentage change between two values
 * Returns an object with the percentage change and metadata about the calculation
 */
export function calculatePercentageChange(current: number, previous: number): {
  changePercent: number;
  hasCurrentData: boolean;
  hasPreviousData: boolean;
  isNoData: boolean;
  isZeroToZero: boolean;
} {
  // Handle null/undefined values properly
  const currentValue = current ?? 0;
  const previousValue = previous ?? 0;
  
  const hasCurrentData = currentValue > 0;
  const hasPreviousData = previousValue > 0;
  const isNoData = !hasCurrentData && !hasPreviousData;
  const isZeroToZero = currentValue === 0 && previousValue === 0;
  
  let changePercent = 0;
  
  if (isNoData) {
    // No data in either period
    changePercent = 0;
  } else if (!hasPreviousData && hasCurrentData) {
    // No previous data, but current data exists - show as new data
    changePercent = 100;
  } else if (hasPreviousData && !hasCurrentData) {
    // Previous data exists, but no current data - show as -100%
    changePercent = -100;
  } else if (isZeroToZero) {
    // Both are zero - no change
    changePercent = 0;
  } else {
    // Normal calculation - use precise values without rounding
    const rawChange = ((currentValue - previousValue) / previousValue) * 100;
    changePercent = Math.round(rawChange * 10) / 10; // Round to 1 decimal place for precision
  }
  
  return {
    changePercent,
    hasCurrentData,
    hasPreviousData,
    isNoData,
    isZeroToZero
  };
}

/**
 * Get trend direction and color based on percentage change
 */
export function getTrendInfo(change: number, isTimeMetric: boolean = true): {
  direction: 'up' | 'down' | 'stable';
  color: 'green' | 'red' | 'gray';
  label: string;
} {
  // For time metrics, lower is better (down is good)
  // For performance metrics, higher is better (up is good)
  const threshold = 5; // 5% change threshold
  
  if (Math.abs(change) < threshold) {
    return {
      direction: 'stable',
      color: 'gray',
      label: 'Stable'
    };
  }
  
  if (isTimeMetric) {
    // For time metrics: down is good (green), up is bad (red)
    if (change < 0) {
      return {
        direction: 'down',
        color: 'green',
        label: 'Faster'
      };
    } else {
      return {
        direction: 'up',
        color: 'red',
        label: 'Slower'
      };
    }
  } else {
    // For performance metrics: up is good (green), down is bad (red)
    if (change > 0) {
      return {
        direction: 'up',
        color: 'green',
        label: 'Better'
      };
    } else {
      return {
        direction: 'down',
        color: 'red',
        label: 'Worse'
      };
    }
  }
}

/**
 * Format percentage change for display
 */
export function formatPercentageChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change}%`;
}
