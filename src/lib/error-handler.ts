// Global error handling utilities
import { errorLogger, logError } from './error-logger';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  componentStack?: string;
  errorId?: string;
  category?: 'client' | 'server' | 'network' | 'validation' | 'auth' | 'database';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ip?: string;
}

export interface ErrorLog {
  message: string;
  stack?: string;
  digest?: string;
  componentStack?: string;
  errorId: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'client' | 'server' | 'network' | 'validation' | 'auth' | 'database';
  ip?: string;
}

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const
};

// Error categories
export const ERROR_CATEGORY = {
  CLIENT: 'client' as const,
  SERVER: 'server' as const,
  NETWORK: 'network' as const,
  VALIDATION: 'validation' as const,
  AUTH: 'auth' as const,
  DATABASE: 'database' as const
};

// Determine error severity based on error type
export function getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
  const message = error.message.toLowerCase();
  
  // Critical errors
  if (message.includes('out of memory') || 
      message.includes('maximum call stack') ||
      message.includes('cannot read property') ||
      message.includes('cannot access before initialization')) {
    return ERROR_SEVERITY.CRITICAL;
  }
  
  // High severity errors
  if (message.includes('network error') ||
      message.includes('fetch failed') ||
      message.includes('timeout') ||
      message.includes('connection refused')) {
    return ERROR_SEVERITY.HIGH;
  }
  
  // Medium severity errors
  if (message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')) {
    return ERROR_SEVERITY.MEDIUM;
  }
  
  // Default to low severity
  return ERROR_SEVERITY.LOW;
}

// Determine error category based on error type
export function getErrorCategory(error: Error): 'client' | 'server' | 'network' | 'validation' | 'auth' | 'database' {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return ERROR_CATEGORY.NETWORK;
  }
  
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return ERROR_CATEGORY.VALIDATION;
  }
  
  if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('auth')) {
    return ERROR_CATEGORY.AUTH;
  }
  
  if (message.includes('database') || message.includes('sql') || message.includes('query')) {
    return ERROR_CATEGORY.DATABASE;
  }
  
  if (message.includes('server') || message.includes('internal')) {
    return ERROR_CATEGORY.SERVER;
  }
  
  return ERROR_CATEGORY.CLIENT;
}

// Generate unique error ID
export function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create error log entry
export function createErrorLog(
  error: Error,
  context: ErrorContext = {}
): ErrorLog {
  return {
    message: error.message,
    stack: error.stack,
    digest: (error as any).digest,
    componentStack: context.componentStack,
    errorId: context.errorId || generateErrorId(),
    timestamp: context.timestamp || new Date().toISOString(),
    url: context.url || (typeof window !== 'undefined' ? window.location.href : ''),
    userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    userId: context.userId,
    sessionId: context.sessionId,
    severity: getErrorSeverity(error),
    category: getErrorCategory(error)
  };
}

// Log error to external service
export async function logErrorToService(errorLog: ErrorLog): Promise<void> {
  try {
    const response = await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorLog)
    });

    if (!response.ok) {
      console.error('Failed to log error to service:', response.statusText);
    }
  } catch (error) {
    console.error('Error logging failed:', error);
  }
}

// Enhanced error logging with proper error logger
export async function logErrorWithContext(
  error: Error,
  context: ErrorContext = {}
): Promise<string> {
  try {
    const errorId = await logError(error, {
      userId: context.userId,
      sessionId: context.sessionId,
      url: context.url,
      userAgent: context.userAgent,
      ip: context.ip,
      metadata: {
        componentStack: context.componentStack,
        errorId: context.errorId,
        timestamp: context.timestamp
      }
    });
    
    return errorId;
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError);
    return '';
  }
}

// Handle client-side errors
export function handleClientError(
  error: Error,
  errorInfo?: { componentStack?: string },
  context: ErrorContext = {}
): void {
  // Use the new error logger
  logErrorWithContext(error, {
    ...context,
    componentStack: errorInfo?.componentStack,
    errorId: generateErrorId()
  });
}

// Handle server-side errors
export function handleServerError(
  error: Error,
  context: ErrorContext = {}
): void {
  // Use the new error logger
  logErrorWithContext(error, {
    ...context,
    errorId: generateErrorId()
  });
}

// React Error Boundary error handler
export function handleErrorBoundaryError(
  error: Error,
  errorInfo: { componentStack: string },
  context: ErrorContext = {}
): void {
  // Use the new error logger
  logErrorWithContext(error, {
    ...context,
    componentStack: errorInfo.componentStack,
    errorId: generateErrorId()
  });
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    handleClientError(error, undefined, {
      category: ERROR_CATEGORY.CLIENT
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message);
    handleClientError(error, undefined, {
      category: ERROR_CATEGORY.CLIENT
    });
  });
}

// Error reporting utility for manual error reporting
export function reportError(
  error: Error,
  context: ErrorContext = {}
): void {
  // Use the new error logger
  logErrorWithContext(error, {
    ...context,
    errorId: generateErrorId()
  });
}

// Utility to check if error is retryable
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors are usually retryable
  if (message.includes('network') || 
      message.includes('timeout') || 
      message.includes('connection') ||
      message.includes('fetch failed')) {
    return true;
  }
  
  // Server errors (5xx) are usually retryable
  if (message.includes('500') || 
      message.includes('502') || 
      message.includes('503') || 
      message.includes('504')) {
    return true;
  }
  
  return false;
}

// Utility to get user-friendly error message
export function getUserFriendlyMessage(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  if (message.includes('unauthorized')) {
    return 'You are not authorized to perform this action.';
  }
  
  if (message.includes('forbidden')) {
    return 'Access denied. You do not have permission to perform this action.';
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Invalid input. Please check your data and try again.';
  }
  
  if (message.includes('not found')) {
    return 'The requested resource was not found.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}
