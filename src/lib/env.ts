import { z } from 'zod';

// Check if we're in build mode (Vercel build process)
const isBuildMode = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';

// Environment variable validation schema
const envSchema = z.object({
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // Salesforce Integration
  SF_CLIENT_ID: z.string().min(1, 'Salesforce client ID is required'),
  SF_CLIENT_SECRET: z.string().min(1, 'Salesforce client secret is required'),
  SF_REDIRECT_URI: z.string().url('Invalid Salesforce redirect URI'),
  SF_DOMAIN: z.string().url('Invalid Salesforce domain'),
  
  // NetSuite Integration
  NS_ACCOUNT_ID: z.string().min(1, 'NetSuite account ID is required'),
  NS_CONSUMER_KEY: z.string().min(1, 'NetSuite consumer key is required'),
  NS_CONSUMER_SECRET: z.string().min(1, 'NetSuite consumer secret is required'),
  NS_TOKEN_ID: z.string().min(1, 'NetSuite token ID is required'),
  NS_TOKEN_SECRET: z.string().min(1, 'NetSuite token secret is required'),
  
  // Rate Limiting Configuration (optional)
  RATE_LIMIT_ENABLED: z.string().optional().transform(val => val === 'true'),
  RATE_LIMIT_REDIS_URL: z.string().url().optional(),
  
  // CORS Configuration (optional)
  CORS_ALLOWED_ORIGINS: z.string().optional().transform(val => 
    val ? val.split(',').map(origin => origin.trim()) : undefined
  ),
  CORS_ALLOW_CREDENTIALS: z.string().optional().transform(val => val === 'true'),
  
});

// Loose schema for build mode (allows missing variables)
const buildModeSchema = z.object({
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Salesforce Integration
  SF_CLIENT_ID: z.string().optional(),
  SF_CLIENT_SECRET: z.string().optional(),
  SF_REDIRECT_URI: z.string().optional(),
  SF_DOMAIN: z.string().optional(),
  
  // NetSuite Integration
  NS_ACCOUNT_ID: z.string().optional(),
  NS_CONSUMER_KEY: z.string().optional(),
  NS_CONSUMER_SECRET: z.string().optional(),
  NS_TOKEN_ID: z.string().optional(),
  NS_TOKEN_SECRET: z.string().optional(),
  
  // Rate Limiting Configuration (optional)
  RATE_LIMIT_ENABLED: z.string().optional().transform(val => val === 'true'),
  RATE_LIMIT_REDIS_URL: z.string().optional(),
  
  // CORS Configuration (optional)
  CORS_ALLOWED_ORIGINS: z.string().optional().transform(val => 
    val ? val.split(',').map(origin => origin.trim()) : undefined
  ),
  CORS_ALLOW_CREDENTIALS: z.string().optional().transform(val => val === 'true'),
  
});

// Validate environment variables
function validateEnv() {
  try {
    // Use loose validation during build mode
    const schema = isBuildMode ? buildModeSchema : envSchema;
    return schema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;


