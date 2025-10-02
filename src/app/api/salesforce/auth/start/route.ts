// /app/api/salesforce/auth/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, challengeFromVerifier } from "@/lib/pkce";
import { requireUser, UnauthorizedError } from "@/lib/authServer";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);

    const verifier = generateCodeVerifier();
    const challenge = challengeFromVerifier(verifier);

    // Check if this is a JSON request (from UI component)
    const acceptHeader = request.headers.get('accept');
    const isJsonRequest = acceptHeader?.includes('application/json');

    const authUrl = new URL(
      `/api/salesforce/auth/redirect?cc=${encodeURIComponent(challenge)}`,
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ).toString();

    if (isJsonRequest) {
      // Return JSON response for UI component
      const response = NextResponse.json({ 
        authUrl,
        message: "Authentication URL generated successfully"
      });
      
      // Set the cookie for the callback
      response.cookies.set("sf_pkce_verifier", verifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 300, // 5 min window
      });
      
      return response;
    } else {
      // Redirect for direct browser access
      const res = NextResponse.redirect(authUrl);
      res.cookies.set("sf_pkce_verifier", verifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 300, // 5 min window
      });
      return res;
    }
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
