import { NextRequest, NextResponse } from "next/server";
import { authenticateWithServiceCredentials } from "@/lib/salesforceServiceAuth";
import { requireTenant } from "@/lib/authServer";

export async function GET(req: NextRequest) {
  try {
    // Get the tenant ID from the authenticated user
    const { tenantId } = await requireTenant(req);
    
    // Try to get a valid access token using service credentials
    const tokenData = await authenticateWithServiceCredentials(tenantId);
    
    if (tokenData) {
      return NextResponse.json({ 
        authenticated: true,
        message: "Successfully authenticated with Salesforce using service credentials"
      });
    } else {
      return NextResponse.json({ 
        authenticated: false,
        message: "Not authenticated with Salesforce"
      });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      authenticated: false,
      error: error.message || "Authentication check failed"
    });
  }
}