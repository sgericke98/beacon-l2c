import { env } from './env';

/**
 * Environment validation utility
 * Call this function at application startup to validate all required environment variables
 */
export function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  try {
    // This will throw if any required environment variables are missing or invalid
    const validatedEnv = env;
    
    console.log('✅ Environment validation passed');
    console.log(`📊 App URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Not set'}`);
    console.log(`🔐 Supabase URL: ${validatedEnv.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`⚡ Debug mode: ${process.env.NEXT_PUBLIC_DEBUG === 'true' ? 'enabled' : 'disabled'}`);
    console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error instanceof Error ? error.message : error);
    
    // In production, exit the process if environment validation fails
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting due to environment validation failure in production');
      process.exit(1);
    }
    
    return false;
  }
}

/**
 * Check if all required environment variables are present
 * Returns a detailed report of missing or invalid variables
 */
export function getEnvironmentStatus() {
  const status = {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
    missing: [] as string[],
  };

  try {
    env;
  } catch (error) {
    if (error instanceof Error) {
      status.valid = false;
      status.errors.push(error.message);
    }
  }

  // Check for common issues
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      status.warnings.push('Debug mode is enabled in production');
    }
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY === 'your_supabase_service_role_key') {
      status.errors.push('Supabase service role key is not configured');
    }
    
    if (process.env.SF_CLIENT_SECRET === 'your_salesforce_client_secret') {
      status.errors.push('Salesforce client secret is not configured');
    }
  }

  return status;
}

/**
 * Print environment status to console
 */
export function printEnvironmentStatus() {
  const status = getEnvironmentStatus();
  
  console.log('\n📋 Environment Status Report:');
  console.log('================================');
  
  if (status.valid) {
    console.log('✅ All required environment variables are valid');
  } else {
    console.log('❌ Environment validation failed');
  }
  
  if (status.errors.length > 0) {
    console.log('\n🚨 Errors:');
    status.errors.forEach(error => console.log(`  • ${error}`));
  }
  
  if (status.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    status.warnings.forEach(warning => console.log(`  • ${warning}`));
  }
  
  if (status.missing.length > 0) {
    console.log('\n❓ Missing variables:');
    status.missing.forEach(missing => console.log(`  • ${missing}`));
  }
  
  console.log('================================\n');
}
