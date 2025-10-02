import { useState, useEffect, useCallback, useMemo } from "react";
import { rawDataServiceMaterializedViews, DataType, Pagination, FilterOptions } from "@/lib/rawDataServiceMaterializedViews";

export type { DataType };

export interface RawDataState {
  data: any[];
  loading: boolean;
  error: string | null;
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  filters: FilterOptions;
  cascadingFilterOptions: Record<string, string[]>;
}

export const useRawDataMaterializedViews = (dataType: DataType) => {
  const [state, setState] = useState<RawDataState>(() => ({
    data: [],
    loading: false,
    error: null,
    totalRecords: 0,
    currentPage: 1,
    pageSize: 25, // Default to 25 records per page
    searchQuery: "",
    filters: rawDataServiceMaterializedViews.getDefaultFilters(dataType),
    cascadingFilterOptions: {},
  }));

  // Memoized pagination object
  const pagination = useMemo(
    () => ({
      page: state.currentPage,
      pageSize: state.pageSize,
    }),
    [state.currentPage, state.pageSize]
  );

  // Fetch data function
  const fetchData = useCallback(async () => {
    console.log(`Fetching ${dataType} data with:`, { pagination, filters: state.filters, searchQuery: state.searchQuery });
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await rawDataServiceMaterializedViews.fetchData(
        dataType,
        pagination,
        state.filters,
        state.searchQuery
      );

      console.log(`Fetched ${dataType} data:`, { dataLength: result.data.length, totalRecords: result.totalRecords });
      setState(prev => ({
        ...prev,
        data: result.data,
        totalRecords: result.totalRecords,
        loading: false,
      }));
    } catch (error) {
      console.error(`Error fetching ${dataType} data:`, error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "An error occurred",
        loading: false,
      }));
    }
  }, [dataType, pagination, state.filters, state.searchQuery]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update pagination
  const updatePagination = useCallback((page: number, pageSize?: number) => {
    setState(prev => ({
      ...prev,
      currentPage: page,
      pageSize: pageSize || prev.pageSize,
    }));
  }, []);


  // Update search query
  const updateSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      currentPage: 1, // Reset to first page when search changes
    }));
  }, []);

  // Update filters
  const updateFilters = useCallback((filters: FilterOptions) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
      currentPage: 1, // Reset to first page when filters change
    }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: rawDataServiceMaterializedViews.getDefaultFilters(dataType),
      currentPage: 1,
    }));
  }, [dataType]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Get column configuration
  const columnConfig = useMemo(() => {
    return rawDataServiceMaterializedViews.getColumnConfig(dataType);
  }, [dataType]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(state.totalRecords / state.pageSize);
  }, [state.totalRecords, state.pageSize]);

  // Check if there's a next page
  const hasNextPage = useMemo(() => {
    return state.currentPage < totalPages;
  }, [state.currentPage, totalPages]);

  // Check if there's a previous page
  const hasPreviousPage = useMemo(() => {
    return state.currentPage > 1;
  }, [state.currentPage]);

  return {
    // State
    data: state.data,
    loading: state.loading,
    error: state.error,
    totalRecords: state.totalRecords,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    searchQuery: state.searchQuery,
    filters: state.filters,
    cascadingFilterOptions: state.cascadingFilterOptions,
    
    // Computed values
    totalPages,
    hasNextPage,
    hasPreviousPage,
    columnConfig,
    
    // Actions
    updatePagination,
    updateSearchQuery,
    updateFilters,
    clearFilters,
    refresh,
    
    // Utility functions
    isValidDataType: rawDataServiceMaterializedViews.isValidDataType,
  };
};
