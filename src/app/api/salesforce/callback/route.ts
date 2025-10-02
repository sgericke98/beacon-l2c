// /app/api/salesforce/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/salesforceAuth";
import {
  requireTenant,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/authServer";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(
        new URL("/api/salesforce/auth/start", req.url)
      );
    }
    const verifier = req.cookies.get("sf_pkce_verifier")?.value;
    if (!verifier) {
      return NextResponse.json(
        { error: "Missing PKCE verifier" },
        { status: 400 }
      );
    }

    const { tenantId } = await requireTenant(req);
    await exchangeCodeForTokens(code, verifier, tenantId);

    // clear cookie
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set("sf_pkce_verifier", "", { path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
