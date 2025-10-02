/**
 * Server-side startup validation
 * This runs when the Next.js server starts
 */

// Only run validation on server side
if (typeof window === 'undefined') {
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
    
    // In production, we want to fail fast if environment is invalid
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting due to environment validation failure');
      process.exit(1);
    }
  }
}
