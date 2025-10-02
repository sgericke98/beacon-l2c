import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).optional()
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date"
    }
  ),

  // Sort order
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // ID validation
  id: z.string().uuid('Invalid ID format'),
  numericId: z.coerce.number().int().positive('ID must be a positive integer')
};

// User management schemas
export const userSchemas = {
  createUser: z.object({
    email: z.string().email('Invalid email format'),
    full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
    role: z.enum(['admin', 'member', 'viewer']).default('member')
  }),

  updateUser: z.object({
    full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long').optional(),
    role: z.enum(['admin', 'member', 'viewer']).optional(),
    is_active: z.boolean().optional()
  }),

  updateProfile: z.object({
    full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long')
  })
};

// Metrics and analytics schemas
export const metricsSchemas = {
  dashboardFilters: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    organizationId: z.string().uuid().optional(),
    metricType: z.enum(['revenue', 'conversion', 'retention', 'churn']).optional(),
    period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional()
  }),

  metricQuery: z.object({
    metric: z.string().min(1, 'Metric name is required'),
    filters: z.record(z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
    aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).default('sum')
  })
};

// Salesforce integration schemas
export const salesforceSchemas = {
  opportunityQuery: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    stage: z.string().optional(),
    ownerId: z.string().optional(),
    accountId: z.string().optional(),
    ...commonSchemas.pagination.shape
  }),

  orderQuery: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.string().optional(),
    accountId: z.string().optional(),
    ...commonSchemas.pagination.shape
  }),

  quoteQuery: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.string().optional(),
    accountId: z.string().optional(),
    ...commonSchemas.pagination.shape
  }),

  downloadRequest: z.object({
    format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
    includeHeaders: z.boolean().default(true),
    filters: z.record(z.any()).optional()
  })
};

// NetSuite integration schemas
export const netsuiteSchemas = {
  invoiceQuery: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.string().optional(),
    customerId: z.string().optional(),
    ...commonSchemas.pagination.shape
  }),

  paymentQuery: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.string().optional(),
    customerId: z.string().optional(),
    ...commonSchemas.pagination.shape
  }),

  creditMemoQuery: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.string().optional(),
    customerId: z.string().optional(),
    ...commonSchemas.pagination.shape
  })
};

// Currency and pricing schemas
export const currencySchemas = {
  updateRates: z.object({
    baseCurrency: z.string().length(3, 'Base currency must be 3 characters').toUpperCase(),
    targetCurrencies: z.array(z.string().length(3, 'Currency code must be 3 characters')).min(1, 'At least one target currency required'),
    forceUpdate: z.boolean().default(false)
  }),

  currencyConversion: z.object({
    from: z.string().length(3, 'From currency must be 3 characters').toUpperCase(),
    to: z.string().length(3, 'To currency must be 3 characters').toUpperCase(),
    amount: z.number().positive('Amount must be positive'),
    date: z.string().datetime().optional()
  })
};

// Flow and process schemas
export const flowSchemas = {
  flowQuery: z.object({
    processType: z.enum(['opportunity-to-quote', 'quote-to-order', 'order-to-invoice', 'invoice-to-payment']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.string().optional(),
    ...commonSchemas.pagination.shape
  }),

  refreshViews: z.object({
    viewType: z.enum(['all', 'opportunities', 'orders', 'invoices', 'payments']).default('all'),
    forceRefresh: z.boolean().default(false)
  })
};

// Authentication schemas
export const authSchemas = {
  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  }),

  signup: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
    organization_name: z.string().min(1, 'Organization name is required').max(100, 'Organization name too long')
  }),

  resetPassword: z.object({
    email: z.string().email('Invalid email format')
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters')
  })
};

// Generic validation helper
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Invalid request data'] };
  }
}

// Middleware for request validation
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      let data: unknown;
      
      // Parse data based on request method
      if (request.method === 'GET') {
        const url = new URL(request.url);
        data = Object.fromEntries(url.searchParams.entries());
      } else {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await request.json();
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          data = Object.fromEntries(formData.entries());
        } else {
          return NextResponse.json(
            { error: 'Unsupported content type' },
            { status: 400 }
          );
        }
      }

      const validation = validateRequest(schema, data);
      
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validation.errors
          },
          { status: 400 }
        );
      }

      return await handler(request, validation.data);
    } catch (error) {
      console.error('Validation middleware error:', error);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
  };
}

// Export all schemas for easy access
export const schemas = {
  common: commonSchemas,
  user: userSchemas,
  metrics: metricsSchemas,
  salesforce: salesforceSchemas,
  netsuite: netsuiteSchemas,
  currency: currencySchemas,
  flow: flowSchemas,
  auth: authSchemas
};
