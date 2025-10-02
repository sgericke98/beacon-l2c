import { NextRequest, NextResponse } from "next/server";
import { suiteQL } from "../../../../../lib/netsuite";
import { requireUser, UnauthorizedError } from "@/lib/authServer";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    // Test NetSuite connection with a simple query
    const testQuery = "SELECT 1 as test FROM DUAL";
    await suiteQL(testQuery);
    
    return NextResponse.json({
      authenticated: true,
      message: "Successfully connected to NetSuite",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({
        authenticated: false,
        message: "Unauthorized",
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }
    console.error("NetSuite authentication check failed:", error);

    return NextResponse.json({
      authenticated: false,
      message: error.message || "Failed to connect to NetSuite",
      timestamp: new Date().toISOString(),
    });
  }
}
