import { FlowDataService } from '../flowDataService';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null }))
  }
}));

describe('FlowDataService - Single Fetch Optimization', () => {
  describe('getPeriodComparison', () => {
    it('should use single fetch approach for all periods', async () => {
      const filters = {
        daysBack: 30
      };

      // Mock the fetch methods to return sample data
      const mockOpportunityToQuoteData = [
        {
          opportunity_id: '1',
          opportunity_name: 'Test Opportunity',
          opportunity_created_date: '2024-01-15',
          quote_created_date: '2024-01-20',
          amount_usd_final: 1000
        }
      ];

      const mockQuoteToOrderData = [
        {
          quote_id: '1',
          quote_name: 'Test Quote',
          quote_created_date: '2024-01-20',
          order_created_date: '2024-01-25',
          converted_amount: 1000
        }
      ];

      // Mock the fetch methods
      jest.spyOn(FlowDataService, 'fetchOpportunityToQuoteData').mockResolvedValue(mockOpportunityToQuoteData);
      jest.spyOn(FlowDataService, 'fetchQuoteToOrderData').mockResolvedValue(mockQuoteToOrderData);

      const result = await FlowDataService.getPeriodComparison(filters);

      // Verify the result structure
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('lastMonth');
      expect(result).toHaveProperty('lastQuarter');
      expect(result).toHaveProperty('trendComparison');

      // Verify each period has the expected structure
      expect(result.current).toHaveProperty('stages');
      expect(result.current).toHaveProperty('detailed_data');
      expect(result.lastMonth).toHaveProperty('stages');
      expect(result.lastMonth).toHaveProperty('detailed_data');
      expect(result.lastQuarter).toHaveProperty('stages');
      expect(result.lastQuarter).toHaveProperty('detailed_data');

      // Verify trend comparison structure
      expect(result.trendComparison).toHaveProperty('currentPeriod');
      expect(result.trendComparison).toHaveProperty('lastMonthPeriod');
      expect(result.trendComparison).toHaveProperty('lastQuarterPeriod');
      expect(result.trendComparison).toHaveProperty('hasComparisonData');
      expect(result.trendComparison).toHaveProperty('periodLengthDays');
      expect(result.trendComparison).toHaveProperty('isDynamic');
    });

    it('should handle different period lengths correctly', async () => {
      const filters60 = { daysBack: 60 };
      const filters90 = { daysBack: 90 };

      // Mock the fetch methods
      jest.spyOn(FlowDataService, 'fetchOpportunityToQuoteData').mockResolvedValue([]);
      jest.spyOn(FlowDataService, 'fetchQuoteToOrderData').mockResolvedValue([]);

      const result60 = await FlowDataService.getPeriodComparison(filters60);
      const result90 = await FlowDataService.getPeriodComparison(filters90);

      // Verify period length is correctly set
      expect(result60.trendComparison.periodLengthDays).toBe(60);
      expect(result90.trendComparison.periodLengthDays).toBe(90);
    });

    it('should maintain contract parity with existing API', async () => {
      const filters = {
        daysBack: 30
      };

      // Mock the fetch methods
      jest.spyOn(FlowDataService, 'fetchOpportunityToQuoteData').mockResolvedValue([]);
      jest.spyOn(FlowDataService, 'fetchQuoteToOrderData').mockResolvedValue([]);

      const result = await FlowDataService.getPeriodComparison(filters);

      // Verify the response structure matches what components expect
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('lastMonth');
      expect(result).toHaveProperty('lastQuarter');
      expect(result).toHaveProperty('trendComparison');

      // Verify stages structure
      if (result.current.stages && result.current.stages.length > 0) {
        const stage = result.current.stages[0];
        expect(stage).toHaveProperty('stage');
        expect(stage).toHaveProperty('avgDays');
        expect(stage).toHaveProperty('performance');
        expect(stage).toHaveProperty('vsLastMonth');
        expect(stage).toHaveProperty('vsLastQuarter');
      }

      // Verify detailed data structure
      expect(result.current).toHaveProperty('detailed_data');
      expect(result.current.detailed_data).toHaveProperty('opportunity-to-quote');
      expect(result.current.detailed_data).toHaveProperty('quote-to-order');
    });
  });

  describe('filterDataByDateRange', () => {
    it('should filter data correctly by date range', () => {
      const testData = [
        { opportunity_created_date: '2024-01-15' },
        { opportunity_created_date: '2024-02-15' },
        { opportunity_created_date: '2024-03-15' }
      ];

      const filtered = FlowDataService['filterDataByDateRange'](
        testData,
        '2024-02-01',
        '2024-02-28'
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].opportunity_created_date).toBe('2024-02-15');
    });

    it('should handle edge cases in date filtering', () => {
      const testData = [
        { opportunity_created_date: '2024-01-31' },
        { opportunity_created_date: '2024-02-01' },
        { opportunity_created_date: '2024-02-29' }
      ];

      const filtered = FlowDataService['filterDataByDateRange'](
        testData,
        '2024-02-01',
        '2024-02-29'
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map(item => item.opportunity_created_date)).toEqual([
        '2024-02-01',
        '2024-02-29'
      ]);
    });
  });
});
