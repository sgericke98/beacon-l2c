import { createClient } from "@supabase/supabase-js";
import { env } from './env';

// Use validated environment variables
export const supabase = createClient(
  env.SUPABASE_URL || process.env.SUPABASE_URL || '',
  env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);
