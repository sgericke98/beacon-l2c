import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { env } from './env';

// Server-side Supabase client for API routes
// Uses validated environment variables for better security
const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create server client with service role key for elevated permissions
export const supabaseServer = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    // Disable auth persistence on server
    persistSession: false,
    autoRefreshToken: false,
  },
  // Add connection timeout for better reliability
  global: {
    headers: {
      'x-connection-timeout': '30000', // 30 seconds
    },
  },
});

// Legacy export for backward compatibility during migration
export const supabase = supabaseServer;
