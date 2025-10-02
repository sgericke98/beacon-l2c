import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('sb-access-token')?.value;
  
  return NextResponse.json({
    hasAuthHeader: !!authHeader,
    authHeader: authHeader,
    hasCookieToken: !!cookieToken,
    cookieToken: cookieToken ? 'present' : 'missing',
    allHeaders: Object.fromEntries(request.headers.entries()),
    allCookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value]))
  });
}
