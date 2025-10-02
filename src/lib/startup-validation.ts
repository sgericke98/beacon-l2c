/**
 * Server-side startup validation
 * This runs when the Next.js server starts
 */

// Only run validation on server side, not during build, and not on Vercel build
const isBuildMode = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';
const isDevelopment = process.env.NODE_ENV === 'development';

if (typeof window === 'undefined' && !isBuildMode && isDevelopment) {
  try {
    // Import and run environment validation
    const { validateEnvironment, printEnvironmentStatus } = require('./validate-env');
    
    // Run validation
    const isValid = validateEnvironment();
    
    if (!isValid) {
      printEnvironmentStatus();
    }
  } catch (error) {
    console.error('❌ Failed to validate environment during startup:', error);
    
    // Only exit in development if environment is invalid
    console.error('💥 Exiting due to environment validation failure in development');
    process.exit(1);
  }
}
