import { supabase } from '@/integrations/supabase/client';

/**
 * Make an authenticated API request using the current Supabase session
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No active session found. Please log in.');
  }

  // Get organization context from localStorage
  const selectedOrganizationId = localStorage.getItem('selectedOrganizationId');
  
  // Add the authorization header and organization context
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...(selectedOrganizationId && { 'x-organization-id': selectedOrganizationId }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get a 401, the token might be expired, try to refresh
  if (response.status === 401) {
    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
    
    if (refreshedSession?.access_token) {
      // Retry with the new token
      const retryHeaders = {
        ...headers,
        'Authorization': `Bearer ${refreshedSession.access_token}`,
      };

      return fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    }
  }

  return response;
}

/**
 * Make an authenticated API request with automatic error handling
 */
export async function authenticatedApiCall<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; success: boolean }> {
  try {
    const response = await authenticatedFetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
