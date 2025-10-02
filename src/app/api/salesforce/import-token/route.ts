import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/authServer";
import { sfTokenStore } from "@/lib/sfTokenStore";
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenant(req);
    
    // Read the token from the local file
    const tokenPath = path.join(process.cwd(), '.data', 'sf-token.json');
    
    if (!fs.existsSync(tokenPath)) {
      return NextResponse.json({ 
        error: "Token file not found at .data/sf-token.json" 
      }, { status: 404 });
    }
    
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    
    // Import the token into the database
    await sfTokenStore.set(tenantId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      instance_url: tokenData.instance_url,
      issued_at: tokenData.issued_at,
      token_type: tokenData.token_type,
    });
    
    return NextResponse.json({ 
      message: "Token imported successfully",
      tenantId: tenantId
    });
    
  } catch (error: any) {
    console.error("Token import error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to import token" 
    }, { status: 500 });
  }
}
