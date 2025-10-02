#!/usr/bin/env node

/**
 * Environment validation CLI script
 * Run this script to validate your environment variables before deployment
 * 
 * Usage:
 *   node scripts/validate-env.js
 *   npm run validate-env
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Required environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SF_CLIENT_ID',
  'SF_CLIENT_SECRET',
  'SF_REDIRECT_URI',
  'SF_DOMAIN',
  'NS_ACCOUNT_ID',
  'NS_CONSUMER_KEY',
  'NS_CONSUMER_SECRET',
  'NS_TOKEN_ID',
  'NS_TOKEN_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_ADMIN_EMAIL'
];

// Optional environment variables
const optionalVars = [
  'NEXT_PUBLIC_DEBUG',
  'RATE_LIMIT_MAX',
  'DB_CONNECTION_TIMEOUT',
  'SENTRY_DSN',
  'NEXT_PUBLIC_GA_ID',
  'EXCHANGE_RATE_API_KEY',
  'EXCHANGE_RATE_BASE_URL'
];

// Validation functions
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidJwtSecret(secret) {
  return secret && secret.length >= 32;
}

function isValidApiVersion(version) {
  return /^v\d+\.\d+$/.test(version);
}

// Validation rules
const validationRules = {
  'NEXT_PUBLIC_SUPABASE_URL': (value) => isValidUrl(value),
  'SUPABASE_URL': (value) => isValidUrl(value),
  'SF_REDIRECT_URI': (value) => isValidUrl(value),
  'SF_DOMAIN': (value) => isValidUrl(value),
  'SF_API_VERSION': (value) => isValidApiVersion(value),
  'EXCHANGE_RATE_BASE_URL': (value) => isValidUrl(value),
  'NEXT_PUBLIC_APP_URL': (value) => isValidUrl(value),
  'NEXT_PUBLIC_ADMIN_EMAIL': (value) => isValidEmail(value),
  'JWT_SECRET': (value) => isValidJwtSecret(value),
};

// Main validation function
function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');
  
  const errors = [];
  const warnings = [];
  const missing = [];
  
  // Check required variables
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      missing.push(varName);
      return;
    }
    
    // Check for placeholder values
    if (value.includes('your_') || value.includes('your-')) {
      errors.push(`${varName}: Contains placeholder value "${value}"`);
      return;
    }
    
    // Apply validation rules
    const validator = validationRules[varName];
    if (validator && !validator(value)) {
      errors.push(`${varName}: Invalid format or value`);
    }
  });
  
  // Check optional variables
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value.includes('your_')) {
      warnings.push(`${varName}: Contains placeholder value "${value}"`);
    }
  });
  
  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      warnings.push('NEXT_PUBLIC_DEBUG: Debug mode is enabled in production');
    }
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.SUPABASE_ANON_KEY) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY: Using anon key instead of service role key');
    }
  }
  
  // Print results
  console.log('📋 Environment Validation Report');
  console.log('================================');
  
  if (errors.length === 0 && missing.length === 0) {
    console.log('✅ All required environment variables are valid');
  } else {
    console.log('❌ Environment validation failed');
  }
  
  if (missing.length > 0) {
    console.log('\n🚨 Missing required variables:');
    missing.forEach(varName => console.log(`  • ${varName}`));
  }
  
  if (errors.length > 0) {
    console.log('\n🚨 Validation errors:');
    errors.forEach(error => console.log(`  • ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  • ${warning}`));
  }
  
  console.log('\n================================');
  
  // Exit with error code if validation failed
  if (errors.length > 0 || missing.length > 0) {
    console.log('\n💡 Tip: Copy .env.example to .env.local and fill in your values');
    process.exit(1);
  }
  
  console.log('\n🎉 Environment validation passed!');
  process.exit(0);
}

// Run validation
validateEnvironment();
