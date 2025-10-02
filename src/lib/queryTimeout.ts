/**
 * Utility function to handle database query timeouts
 * Provides better error messages and prevents long-running queries
 */

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Query timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${errorMessage} after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Wraps a Supabase query with timeout handling
 */
export async function executeQueryWithTimeout<T>(
  queryBuilder: any,
  timeoutMs: number = 10000
): Promise<{ data: T | null; error: any; count?: number | null }> {
  try {
    const result = await withTimeout(queryBuilder, timeoutMs, 'Database query timeout');
    return result as { data: T | null; error: any; count?: number | null };
  } catch (error: any) {
    if (error.message.includes('timeout')) {
      console.error('❌ Query timeout:', error.message);
      throw new Error(`Database query timed out after ${timeoutMs}ms. The query may be too complex or the database may be under heavy load.`);
    }
    throw error;
  }
}
