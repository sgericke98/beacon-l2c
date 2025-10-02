import { NextRequest } from 'next/server';
import { withAdminApiAuth, validateEnvironmentEndpoint } from '@/lib/auth-middleware';

export const GET = withAdminApiAuth(validateEnvironmentEndpoint);
