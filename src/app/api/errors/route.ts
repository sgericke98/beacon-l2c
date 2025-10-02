import { NextRequest, NextResponse } from 'next/server';
import { withApiMiddleware } from '@/lib/api-middleware';
import { z } from 'zod';

// Error logging schema
const errorLogSchema = z.object({
  message: z.string().min(1, 'Error message is required'),
  stack: z.string().optional(),
  digest: z.string().optional(),
  componentStack: z.string().optional(),
  errorId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  url: z.string().url().optional(),
  userAgent: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.enum(['client', 'server', 'network', 'validation', 'auth', 'database']).default('client')
});

async function logError(request: NextRequest, validatedData: typeof errorLogSchema._type) {
  try {
    const {
      message,
      stack,
      digest,
      componentStack,
      errorId,
      timestamp,
      url,
      userAgent,
      userId,
      sessionId,
      severity,
      category
    } = validatedData;

    // Create error log entry
    const errorLog = {
      id: errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      stack,
      digest,
      componentStack,
      timestamp: timestamp || new Date().toISOString(),
      url,
      userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
      userId,
      sessionId,
      severity,
      category,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          request.headers.get('cf-connecting-ip') || 
          'unknown'
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog);
    }

    // In production, you would typically:
    // 1. Store in database
    // 2. Send to external error tracking service (Sentry, LogRocket, etc.)
    // 3. Send alerts for critical errors
    // 4. Aggregate error metrics

    // Example: Store in database (if you have a database)
    // await storeErrorInDatabase(errorLog);

    // Example: Send to external service
    // await sendToErrorTrackingService(errorLog);

    // Example: Send alert for critical errors
    if (severity === 'critical') {
      // await sendCriticalErrorAlert(errorLog);
    }

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
      errorId: errorLog.id
    });

  } catch (error) {
    console.error('Failed to log error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to log error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Apply middleware with validation
export const POST = withApiMiddleware(
  { 
    cors: 'api', 
    rateLimit: { windowMs: 60000, maxRequests: 10 } // Limit error logging
  },
  async (request: NextRequest) => {
    try {
      const data = await request.json();
      const validation = errorLogSchema.safeParse(data);
      
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: validation.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        );
      }

      return await logError(request, validation.data);
    } catch (error) {
      console.error('Error in error logging endpoint:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request format' 
        },
        { status: 400 }
      );
    }
  }
);

// Get error statistics (for admin use)
async function getErrorStats(request: NextRequest) {
  try {
    // This would typically query your error database
    // For now, return mock data
    const stats = {
      totalErrors: 0,
      errorsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      errorsByCategory: {
        client: 0,
        server: 0,
        network: 0,
        validation: 0,
        auth: 0,
        database: 0
      },
      recentErrors: [],
      errorRate: 0
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Failed to get error stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get error statistics' 
      },
      { status: 500 }
    );
  }
}

export const GET = withApiMiddleware(
  { 
    cors: 'api', 
    rateLimit: { windowMs: 60000, maxRequests: 5 } // Limit stats requests
  },
  getErrorStats
);
