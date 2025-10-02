// Example implementations showing how to use the new middleware

import { NextRequest, NextResponse } from 'next/server';
import { withApiMiddleware, withValidatedAuthApi, withValidatedAdminApi } from './api-middleware';
import { schemas } from './validation-schemas';

// Example 1: Simple API with CORS and rate limiting
export async function exampleHealthCheck(request: NextRequest) {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

// Apply middleware
export const GET = withApiMiddleware(
  { cors: 'public', rateLimit: { windowMs: 60000, maxRequests: 30 } },
  exampleHealthCheck
);

// Example 2: Validated API with authentication
export async function exampleCreateUser(request: NextRequest, validatedData: typeof schemas.user.createUser._type) {
  // validatedData is now type-safe and validated
  const { email, full_name, role } = validatedData;
  
  // Your business logic here
  return NextResponse.json({ 
    success: true, 
    message: 'User created successfully',
    data: { email, full_name, role }
  });
}

// Apply validated middleware
export const POST = withValidatedAuthApi(schemas.user.createUser, exampleCreateUser);

// Example 3: Admin API with custom validation
const adminUserUpdateSchema = schemas.user.updateUser.extend({
  userId: schemas.common.id
});

export async function exampleUpdateUser(request: NextRequest, validatedData: typeof adminUserUpdateSchema._type) {
  const { userId, full_name, role, is_active } = validatedData;
  
  // Your business logic here
  return NextResponse.json({ 
    success: true, 
    message: 'User updated successfully',
    data: { userId, full_name, role, is_active }
  });
}

// Apply admin middleware with custom validation
export const PUT = withValidatedAdminApi(adminUserUpdateSchema, exampleUpdateUser);

// Example 4: Download API with restrictive settings
export async function exampleDownloadData(request: NextRequest) {
  // Your download logic here
  const data = { message: 'Download data' };
  
  return new NextResponse(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="data.json"'
    }
  });
}

// Apply download middleware
export const GET_DOWNLOAD = withApiMiddleware(
  { cors: 'download', rateLimit: { windowMs: 3600000, maxRequests: 5 } },
  exampleDownloadData
);

// Example 5: Metrics API with validation
export async function exampleGetMetrics(request: NextRequest, validatedData: typeof schemas.metrics.dashboardFilters._type) {
  const { startDate, endDate, organizationId, metricType, period } = validatedData;
  
  // Your metrics logic here
  return NextResponse.json({ 
    success: true, 
    data: { startDate, endDate, organizationId, metricType, period }
  });
}

// Apply metrics middleware
export const GET_METRICS = withValidatedMetricsApi(schemas.metrics.dashboardFilters, exampleGetMetrics);
