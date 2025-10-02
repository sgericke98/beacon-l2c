/**
 * Server-side startup validation
 * This runs when the Next.js server starts
 */

// Only run validation on server side and not during build
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
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
    if (process.env.NODE_ENV === 'development') {
      console.error('💥 Exiting due to environment validation failure in development');
      process.exit(1);
    }
  }
}
