import { getPeriodComparison, getExtendedDateRange } from '../dateUtils';

describe('DateUtils - Single Fetch Optimization', () => {
  describe('getPeriodComparison', () => {
    it('should calculate correct periods for 30 days from today', () => {
      const result = getPeriodComparison(null, 30);
      
      // Current period should be 30 days from today
      const today = new Date();
      const expectedCurrentTo = new Date(today);
      const expectedCurrentFrom = new Date(today);
      expectedCurrentFrom.setDate(expectedCurrentFrom.getDate() - 30);
      
      expect(result.current.from).toBe(expectedCurrentFrom.toISOString().split('T')[0]);
      expect(result.current.to).toBe(expectedCurrentTo.toISOString().split('T')[0]);
      
      // Last month should be 30 days before current period
      const expectedLastMonthTo = new Date(expectedCurrentFrom);
      const expectedLastMonthFrom = new Date(expectedCurrentFrom);
      expectedLastMonthFrom.setDate(expectedLastMonthFrom.getDate() - 30);
      
      expect(result.lastMonth.from).toBe(expectedLastMonthFrom.toISOString().split('T')[0]);
      expect(result.lastMonth.to).toBe(expectedLastMonthTo.toISOString().split('T')[0]);
      
      // Last quarter should be 90 days before current period
      const expectedLastQuarterTo = new Date(expectedLastMonthFrom);
      const expectedLastQuarterFrom = new Date(expectedLastMonthFrom);
      expectedLastQuarterFrom.setDate(expectedLastQuarterFrom.getDate() - 90);
      
      expect(result.lastQuarter.from).toBe(expectedLastQuarterFrom.toISOString().split('T')[0]);
      expect(result.lastQuarter.to).toBe(expectedLastQuarterTo.toISOString().split('T')[0]);
    });

    it('should calculate correct periods for 60 days from today', () => {
      const result = getPeriodComparison(null, 60);
      
      const today = new Date();
      const expectedCurrentTo = new Date(today);
      const expectedCurrentFrom = new Date(today);
      expectedCurrentFrom.setDate(expectedCurrentFrom.getDate() - 60);
      
      expect(result.current.from).toBe(expectedCurrentFrom.toISOString().split('T')[0]);
      expect(result.current.to).toBe(expectedCurrentTo.toISOString().split('T')[0]);
    });

    it('should calculate correct periods for 90 days from today', () => {
      const result = getPeriodComparison(null, 90);
      
      const today = new Date();
      const expectedCurrentTo = new Date(today);
      const expectedCurrentFrom = new Date(today);
      expectedCurrentFrom.setDate(expectedCurrentFrom.getDate() - 90);
      
      expect(result.current.from).toBe(expectedCurrentFrom.toISOString().split('T')[0]);
      expect(result.current.to).toBe(expectedCurrentTo.toISOString().split('T')[0]);
    });

    it('should handle custom date range', () => {
      const customPeriod = {
        from: '2024-01-01',
        to: '2024-01-31'
      };
      
      const result = getPeriodComparison(customPeriod, 30);
      
      expect(result.current.from).toBe('2024-01-01');
      expect(result.current.to).toBe('2024-01-31');
    });
  });

  describe('getExtendedDateRange', () => {
    it('should extend date range by 3 months for single fetch', () => {
      const periodComparison = {
        current: { from: '2024-01-01', to: '2024-01-31' },
        lastMonth: { from: '2023-12-01', to: '2023-12-31' },
        lastQuarter: { from: '2023-09-01', to: '2023-11-30' }
      };
      
      const result = getExtendedDateRange(periodComparison);
      
      // Should start from the earliest date (last quarter start) and go to current period end
      expect(result.from).toBe('2023-09-01');
      expect(result.to).toBe('2024-01-31');
    });

    it('should handle edge case where last quarter is before last month', () => {
      const periodComparison = {
        current: { from: '2024-03-01', to: '2024-03-31' },
        lastMonth: { from: '2024-02-01', to: '2024-02-29' },
        lastQuarter: { from: '2023-12-01', to: '2024-02-29' }
      };
      
      const result = getExtendedDateRange(periodComparison);
      
      expect(result.from).toBe('2023-12-01');
      expect(result.to).toBe('2024-03-31');
    });
  });

  describe('Contract Parity', () => {
    it('should maintain same response structure as before', () => {
      const result = getPeriodComparison(null, 30);
      
      // Ensure all required fields are present
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('lastMonth');
      expect(result).toHaveProperty('lastQuarter');
      
      expect(result.current).toHaveProperty('from');
      expect(result.current).toHaveProperty('to');
      expect(result.lastMonth).toHaveProperty('from');
      expect(result.lastMonth).toHaveProperty('to');
      expect(result.lastQuarter).toHaveProperty('from');
      expect(result.lastQuarter).toHaveProperty('to');
      
      // Ensure dates are in correct format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(result.current.from).toMatch(dateRegex);
      expect(result.current.to).toMatch(dateRegex);
      expect(result.lastMonth.from).toMatch(dateRegex);
      expect(result.lastMonth.to).toMatch(dateRegex);
      expect(result.lastQuarter.from).toMatch(dateRegex);
      expect(result.lastQuarter.to).toMatch(dateRegex);
    });
  });
});
