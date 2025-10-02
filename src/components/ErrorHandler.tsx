'use client';

import { useEffect } from 'react';
import { setupGlobalErrorHandlers } from '@/lib/error-handler';

export function ErrorHandler() {
  useEffect(() => {
    // Setup global error handlers
    setupGlobalErrorHandlers();
  }, []);

  return null; // This component doesn't render anything
}

export default ErrorHandler;
