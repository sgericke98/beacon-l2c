# Error Boundary Guide

This guide explains the comprehensive error handling system implemented in your Next.js application, including client-side error boundaries, server-side error handling, and global error management.

## Overview

The error boundary system provides:
1. **Client-side error boundaries** - Catch React component errors
2. **Global error handling** - Handle unhandled errors and promise rejections
3. **Server-side error pages** - Custom error pages for different scenarios
4. **Error logging** - Centralized error reporting and tracking
5. **User-friendly error UI** - Graceful error recovery and user guidance

## Components

### 1. ErrorBoundary Component (`src/components/ErrorBoundary.tsx`)

A React error boundary that catches JavaScript errors anywhere in the component tree.

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Basic usage
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// With custom error handler
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Custom error handler:', error);
  }}
  resetOnPropsChange={true}
  resetKeys={['userId', 'page']}
>
  <MyComponent />
</ErrorBoundary>
```

**Features:**
- Automatic error recovery
- Custom error UI
- Error reporting
- Retry functionality
- Development error details

### 2. Global Error Pages

#### `src/app/global-error.tsx`
Handles critical application errors that can't be recovered from.

#### `src/app/error.tsx`
Handles page-level errors with recovery options.

#### `src/app/not-found.tsx`
Custom 404 page with navigation options.

### 3. Error Logging API (`src/app/api/errors/route.ts`)

Centralized error logging endpoint with validation and rate limiting.

```typescript
// Log an error
fetch('/api/errors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Error message',
    stack: 'Error stack trace',
    severity: 'high',
    category: 'client'
  })
});
```

### 4. Error Handler Utilities (`src/lib/error-handler.ts`)

Comprehensive error handling utilities for different scenarios.

```typescript
import { 
  handleClientError, 
  handleServerError, 
  reportError,
  getUserFriendlyMessage 
} from '@/lib/error-handler';

// Handle client-side errors
handleClientError(error, errorInfo, { userId: '123' });

// Handle server-side errors
handleServerError(error, { userId: '123' });

// Manual error reporting
reportError(error, { category: 'validation' });

// Get user-friendly message
const message = getUserFriendlyMessage(error);
```

## Error Categories

### Severity Levels
- **Low**: Minor issues, non-critical
- **Medium**: Moderate issues, may affect functionality
- **High**: Significant issues, affects user experience
- **Critical**: Application-breaking errors

### Error Categories
- **Client**: Frontend JavaScript errors
- **Server**: Backend API errors
- **Network**: Connection and API failures
- **Validation**: Input validation errors
- **Auth**: Authentication and authorization errors
- **Database**: Database connection and query errors

## Usage Examples

### 1. Basic Error Boundary

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### 2. Error Boundary with Custom Fallback

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

const customFallback = (
  <div className="error-fallback">
    <h2>Something went wrong</h2>
    <p>Please try again later.</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary fallback={customFallback}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### 3. Higher-Order Component

```typescript
import { withErrorBoundary } from '@/components/ErrorBoundary';

const MyComponent = () => {
  // Component logic
};

const WrappedComponent = withErrorBoundary(MyComponent, {
  onError: (error, errorInfo) => {
    console.error('Component error:', error);
  }
});
```

### 4. Error Hook

```typescript
import { useErrorHandler } from '@/components/ErrorBoundary';

function MyComponent() {
  const handleError = useErrorHandler();

  const handleAsyncOperation = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error);
    }
  };
}
```

### 5. Manual Error Reporting

```typescript
import { reportError } from '@/lib/error-handler';

function handleUserAction() {
  try {
    // Some operation
  } catch (error) {
    reportError(error, {
      userId: '123',
      category: 'user_action'
    });
  }
}
```

## Configuration

### Environment Variables

```env
# Error tracking service (optional)
ERROR_TRACKING_SERVICE_URL=https://your-tracking-service.com
ERROR_TRACKING_API_KEY=your-api-key

# Error reporting settings
ERROR_REPORTING_ENABLED=true
ERROR_REPORTING_SAMPLE_RATE=1.0
```

### Error Boundary Configuration

```typescript
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Custom error handling
  }}
  resetOnPropsChange={true}
  resetKeys={['userId', 'page']}
  fallback={<CustomErrorUI />}
>
  <MyComponent />
</ErrorBoundary>
```

## Error UI Components

### Default Error UI
- Error message and description
- Retry button
- Reload page button
- Go home button
- Report bug button
- Error ID for tracking

### Development Features
- Full error stack trace
- Component stack trace
- Error details in console
- Error boundary state

### Production Features
- User-friendly error messages
- Error ID for support
- Recovery options
- Bug reporting

## Error Recovery

### Automatic Recovery
- Error boundary resets on prop changes
- Automatic retry for transient errors
- Graceful degradation

### Manual Recovery
- Retry button
- Reload page
- Navigate to safe page
- Reset application state

## Monitoring and Analytics

### Error Metrics
- Error frequency by type
- Error severity distribution
- User impact analysis
- Error trends over time

### Error Tracking
- Unique error IDs
- User context
- Error categorization
- Performance impact

## Best Practices

### 1. Error Boundary Placement
```typescript
// Place at strategic locations
<ErrorBoundary>
  <Header />
  <ErrorBoundary>
    <Sidebar />
  </ErrorBoundary>
  <ErrorBoundary>
    <MainContent />
  </ErrorBoundary>
  <Footer />
</ErrorBoundary>
```

### 2. Error Handling in Async Operations
```typescript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    handleClientError(error, undefined, {
      category: 'network'
    });
    throw error;
  }
}
```

### 3. Error Context
```typescript
// Provide context for better error tracking
handleClientError(error, errorInfo, {
  userId: user.id,
  sessionId: session.id,
  feature: 'dashboard',
  action: 'load_data'
});
```

### 4. User-Friendly Messages
```typescript
// Use utility for consistent messaging
const message = getUserFriendlyMessage(error);
toast.error(message);
```

## Testing Error Boundaries

### 1. Test Error Boundary
```typescript
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

test('ErrorBoundary catches errors', () => {
  render(
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

### 2. Test Error Recovery
```typescript
test('ErrorBoundary recovers from errors', () => {
  const { rerender } = render(
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  
  rerender(
    <ErrorBoundary>
      <ThrowError shouldThrow={false} />
    </ErrorBoundary>
  );
  
  expect(screen.getByText('No error')).toBeInTheDocument();
});
```

## Migration Guide

### From Basic Error Handling
```typescript
// Before
try {
  riskyOperation();
} catch (error) {
  console.error(error);
  // Basic error handling
}

// After
try {
  riskyOperation();
} catch (error) {
  handleClientError(error, undefined, {
    category: 'operation'
  });
}
```

### From Manual Error Boundaries
```typescript
// Before
class MyErrorBoundary extends Component {
  // Manual error boundary implementation
}

// After
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

## Troubleshooting

### Common Issues

1. **Error boundary not catching errors**
   - Ensure error boundary is properly placed
   - Check that errors are thrown during render
   - Verify error boundary is not inside try-catch

2. **Error logging not working**
   - Check network connectivity
   - Verify API endpoint is accessible
   - Check console for error logging errors

3. **Error UI not displaying**
   - Ensure error boundary has proper fallback
   - Check CSS classes and styling
   - Verify error boundary state

### Debug Mode

Enable debug mode for detailed error information:

```typescript
<ErrorBoundary
  onError={(error, errorInfo) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary debug:', error, errorInfo);
    }
  }}
>
  <MyComponent />
</ErrorBoundary>
```

## Performance Considerations

- Error boundaries have minimal performance impact
- Error logging is asynchronous
- Error UI is only rendered when errors occur
- Error recovery is automatic and fast

## Security Considerations

- Error messages don't expose sensitive information
- Error IDs are generated securely
- Error logging respects user privacy
- Error data is sanitized before logging
