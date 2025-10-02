// /lib/pkce.ts
import crypto from "crypto";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateCodeVerifier(length = 64) {
  // RFC 7636: 43–128 chars; use a random 64-byte buffer, base64url-encoded
  return base64url(crypto.randomBytes(length));
}

export function challengeFromVerifier(verifier: string) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64url(hash);
}
