import { NextRequest } from 'next/server';
import { healthCheck } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  return healthCheck(request);
}
