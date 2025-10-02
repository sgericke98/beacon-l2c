/**
 * Comprehensive caching strategy for the application
 * Provides in-memory, persistent, and API response caching
 */

// In-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Persistent cache using localStorage (client-side only)
const persistentCache = {
  get: (key: string): any => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;
      const { data, timestamp, ttl } = JSON.parse(item);
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
  
  set: (key: string, data: any, ttl: number = 5 * 60 * 1000): void => {
    if (typeof window === 'undefined') return;
    try {
      const item = { data, timestamp: Date.now(), ttl };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`cache_${key}`);
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Cache configuration
export const CACHE_CONFIG = {
  // API response cache TTLs (in milliseconds)
  API_TTL: {
    METRICS: 2 * 60 * 1000, // 2 minutes
    FLOW_DATA: 5 * 60 * 1000, // 5 minutes
    RAW_DATA: 10 * 60 * 1000, // 10 minutes
    CURRENCY: 5 * 60 * 1000, // 5 minutes
    FILTER_OPTIONS: 30 * 60 * 1000, // 30 minutes
  },
  
  // Persistent cache TTLs
  PERSISTENT_TTL: {
    USER_PREFERENCES: 24 * 60 * 60 * 1000, // 24 hours
    FILTER_STATE: 60 * 60 * 1000, // 1 hour
    CURRENCY_RATES: 5 * 60 * 1000, // 5 minutes
  }
};

// Cache key generators
export const cacheKeys = {
  metrics: (filters: any) => `metrics_${JSON.stringify(filters)}`,
  flowData: (filters: any) => `flow_${JSON.stringify(filters)}`,
  rawData: (type: string, filters: any) => `raw_${type}_${JSON.stringify(filters)}`,
  currencyRates: () => 'currency_rates',
  filterOptions: (type: string) => `filter_options_${type}`,
  userPreferences: () => 'user_preferences',
  filterState: (page: string) => `filter_state_${page}`,
};

// Main cache utility
export class CacheManager {
  // Get cached data (checks both in-memory and persistent)
  static get(key: string, usePersistent: boolean = false): any {
    // Check in-memory cache first
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // Remove expired in-memory cache
    if (cached) {
      apiCache.delete(key);
    }
    
    // Check persistent cache if requested
    if (usePersistent) {
      return persistentCache.get(key);
    }
    
    return null;
  }
  
  // Set cached data
  static set(key: string, data: any, ttl: number, usePersistent: boolean = false): void {
    // Set in-memory cache
    apiCache.set(key, { data, timestamp: Date.now(), ttl });
    
    // Set persistent cache if requested
    if (usePersistent) {
      persistentCache.set(key, data, ttl);
    }
  }
  
  // Invalidate cache by key pattern
  static invalidate(pattern: string): void {
    // Clear in-memory cache
    for (const key of Array.from(apiCache.keys())) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
    
    // Clear persistent cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_') && key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  }
  
  // Clear all caches
  static clear(): void {
    apiCache.clear();
    persistentCache.clear();
  }
  
  // Clear specific cache by pattern
  static clearByPattern(pattern: string): void {
    // Clear in-memory cache
    for (const key of Array.from(apiCache.keys())) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
    
    // Clear persistent cache
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_') && key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      });
    }
  }
  
  // Get cache statistics
  static getStats(): { inMemorySize: number; persistentSize: number } {
    const persistentSize = Object.keys(localStorage)
      .filter(key => key.startsWith('cache_')).length;
    
    return {
      inMemorySize: apiCache.size,
      persistentSize
    };
  }
}

// Hook for cached API calls
export const useCachedFetch = () => {
  const fetchWithCache = async (
    url: string,
    options: RequestInit = {},
    cacheKey: string,
    ttl: number = CACHE_CONFIG.API_TTL.RAW_DATA
  ) => {
    // Check cache first
    const cached = CacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch fresh data
    const response = await fetch(url, {
      ...options,
      cache: 'no-store' // Prevent browser caching, we handle it ourselves
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    CacheManager.set(cacheKey, data, ttl);
    
    return data;
  };
  
  return { fetchWithCache };
};

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate all metric-related caches
  metrics: () => {
    CacheManager.invalidate('metrics');
    CacheManager.invalidate('flow');
  },
  
  // Invalidate all raw data caches
  rawData: () => {
    CacheManager.invalidate('raw_');
  },
  
  // Invalidate currency-related caches
  currency: () => {
    CacheManager.invalidate('currency');
  },
  
  // Invalidate filter-related caches
  filters: () => {
    CacheManager.invalidate('filter_');
  },
  
  // Invalidate all caches (use sparingly)
  all: () => {
    CacheManager.clear();
  }
};
