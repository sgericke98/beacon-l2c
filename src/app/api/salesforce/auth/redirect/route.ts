// /app/api/salesforce/auth/redirect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/authServer";

function domain() {
  return process.env.SF_DOMAIN || "https://login.salesforce.com";
}

export async function GET(req: NextRequest) {
  try {
    // For popup authentication, we'll skip the user requirement check
    // and handle it in the callback instead
    const cc = req.nextUrl.searchParams.get("cc");
    if (!cc)
      return NextResponse.json(
        { error: "Missing code_challenge" },
        { status: 400 }
      );

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.SF_CLIENT_ID!,
      redirect_uri: process.env.SF_REDIRECT_URI!,
      scope: "api refresh_token offline_access",
      code_challenge: cc,
      code_challenge_method: "S256",
    });

    return NextResponse.redirect(
      `${domain()}/services/oauth2/authorize?${params.toString()}`
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
