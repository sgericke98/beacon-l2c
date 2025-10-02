import { env } from './env';

// Error log entry interface
export interface ErrorLogEntry {
  id: string;
  message: string;
  stack?: string;
  digest?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'client' | 'server' | 'network' | 'validation' | 'auth' | 'database';
  ip?: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

// Error logger configuration
interface ErrorLoggerConfig {
  enabled: boolean;
  sampleRate: number;
  maxRetries: number;
  batchSize: number;
  flushInterval: number;
  storage: 'memory' | 'database' | 'external';
  externalService?: {
    url: string;
    apiKey: string;
    timeout: number;
  };
}

// Default configuration
const defaultConfig: ErrorLoggerConfig = {
  enabled: process.env.NODE_ENV === 'production',
  sampleRate: 1.0,
  maxRetries: 3,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  storage: 'memory',
  externalService: {
    url: process.env.ERROR_TRACKING_SERVICE_URL || '',
    apiKey: process.env.ERROR_TRACKING_API_KEY || '',
    timeout: 5000
  }
};

// In-memory error storage
class ErrorStorage {
  private errors: ErrorLogEntry[] = [];
  private maxSize: number = 1000;

  add(error: ErrorLogEntry): void {
    this.errors.push(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxSize) {
      this.errors = this.errors.slice(-this.maxSize);
    }
  }

  getAll(): ErrorLogEntry[] {
    return [...this.errors];
  }

  getById(id: string): ErrorLogEntry | undefined {
    return this.errors.find(error => error.id === id);
  }

  getBySeverity(severity: string): ErrorLogEntry[] {
    return this.errors.filter(error => error.severity === severity);
  }

  getByCategory(category: string): ErrorLogEntry[] {
    return this.errors.filter(error => error.category === category);
  }

  getRecent(limit: number = 50): ErrorLogEntry[] {
    return this.errors
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    recent: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recent = this.errors.filter(error => 
      new Date(error.timestamp) > oneHourAgo
    ).length;

    const bySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = this.errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errors.length,
      bySeverity,
      byCategory,
      recent
    };
  }

  clear(): void {
    this.errors = [];
  }
}

// Error logger class
class ErrorLogger {
  private config: ErrorLoggerConfig;
  private storage: ErrorStorage;
  private batchQueue: ErrorLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private retryQueue: ErrorLogEntry[] = [];

  constructor(config: ErrorLoggerConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
    this.storage = new ErrorStorage();
    this.startFlushTimer();
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if error should be logged based on sample rate
  private shouldLog(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < this.config.sampleRate;
  }

  // Add error to batch queue
  private addToBatch(error: ErrorLogEntry): void {
    this.batchQueue.push(error);
    
    if (this.batchQueue.length >= this.config.batchSize) {
      this.flushBatch();
    }
  }

  // Flush batch queue
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      await this.sendToExternalService(batch);
      console.log(`Successfully logged ${batch.length} errors`);
    } catch (error) {
      console.error('Failed to log errors:', error);
      // Add to retry queue
      this.retryQueue.push(...batch);
    }
  }

  // Send errors to external service
  private async sendToExternalService(errors: ErrorLogEntry[]): Promise<void> {
    if (!this.config.externalService?.url || !this.config.externalService?.apiKey) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.externalService.timeout);

    try {
      const response = await fetch(this.config.externalService.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.externalService.apiKey}`,
          'X-Service': 'error-logger'
        },
        body: JSON.stringify({
          errors,
          timestamp: new Date().toISOString(),
          source: 'beacon-app'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Start flush timer
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushBatch();
      this.processRetryQueue();
    }, this.config.flushInterval);
  }

  // Process retry queue
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) return;

    const retryBatch = [...this.retryQueue];
    this.retryQueue = [];

    try {
      await this.sendToExternalService(retryBatch);
      console.log(`Successfully retried ${retryBatch.length} errors`);
    } catch (error) {
      console.error('Retry failed:', error);
      // Add back to retry queue with exponential backoff
      retryBatch.forEach(error => {
        error.metadata = {
          ...error.metadata,
          retryCount: (error.metadata?.retryCount || 0) + 1,
          lastRetry: new Date().toISOString()
        };
      });
      
      this.retryQueue.push(...retryBatch.filter(error => 
        (error.metadata?.retryCount || 0) < this.config.maxRetries
      ));
    }
  }

  // Log error
  public async logError(
    error: Error,
    context: {
      userId?: string;
      sessionId?: string;
      url?: string;
      userAgent?: string;
      ip?: string;
      metadata?: Record<string, any>;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'client' | 'server' | 'network' | 'validation' | 'auth' | 'database';
    } = {}
  ): Promise<string> {
    if (!this.shouldLog()) {
      return '';
    }

    const errorId = this.generateErrorId();
    const errorLog: ErrorLogEntry = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      digest: (error as any).digest,
      timestamp: new Date().toISOString(),
      url: context.url || (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      userId: context.userId,
      sessionId: context.sessionId,
      ip: context.ip,
      severity: context.severity || this.getErrorSeverity(error),
      category: context.category || this.getErrorCategory(error),
      metadata: context.metadata
    };

    // Store in memory
    this.storage.add(errorLog);

    // Add to batch queue
    this.addToBatch(errorLog);

    return errorId;
  }

  // Get error severity
  private getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    if (message.includes('out of memory') || 
        message.includes('maximum call stack') ||
        message.includes('cannot read property')) {
      return 'critical';
    }
    
    if (message.includes('network error') ||
        message.includes('fetch failed') ||
        message.includes('timeout')) {
      return 'high';
    }
    
    if (message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('unauthorized')) {
      return 'medium';
    }
    
    return 'low';
  }

  // Get error category
  private getErrorCategory(error: Error): 'client' | 'server' | 'network' | 'validation' | 'auth' | 'database' {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('auth')) {
      return 'auth';
    }
    
    if (message.includes('database') || message.includes('sql') || message.includes('query')) {
      return 'database';
    }
    
    if (message.includes('server') || message.includes('internal')) {
      return 'server';
    }
    
    return 'client';
  }

  // Get error statistics
  public getStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    recent: number;
  } {
    return this.storage.getStats();
  }

  // Get recent errors
  public getRecentErrors(limit: number = 50): ErrorLogEntry[] {
    return this.storage.getRecent(limit);
  }

  // Get error by ID
  public getErrorById(id: string): ErrorLogEntry | undefined {
    return this.storage.getById(id);
  }

  // Clear all errors
  public clearErrors(): void {
    this.storage.clear();
  }

  // Update configuration
  public updateConfig(config: Partial<ErrorLoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.startFlushTimer();
  }

  // Destroy logger
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBatch();
  }
}

// Global error logger instance
export const errorLogger = new ErrorLogger();

// Convenience functions
export const logError = (error: Error, context?: any) => errorLogger.logError(error, context);
export const getErrorStats = () => errorLogger.getStats();
export const getRecentErrors = (limit?: number) => errorLogger.getRecentErrors(limit);
export const getErrorById = (id: string) => errorLogger.getErrorById(id);
export const clearErrors = () => errorLogger.clearErrors();

// Error logger hook for React components
export function useErrorLogger() {
  return {
    logError: (error: Error, context?: any) => errorLogger.logError(error, context),
    getStats: () => errorLogger.getStats(),
    getRecentErrors: (limit?: number) => errorLogger.getRecentErrors(limit),
    getErrorById: (id: string) => errorLogger.getErrorById(id)
  };
}

export default errorLogger;
