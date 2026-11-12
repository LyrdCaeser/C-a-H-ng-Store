import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";

export function visitorFromRequest(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)gxb3_portal_vid=([a-f0-9-]{36})(?:;|$)/i);
  const id = match?.[1] || randomUUID();
  const secret = process.env.VISITOR_HASH_SECRET;
  if (!secret) throw new Error("VISITOR_HASH_SECRET is missing");

  const ipCandidate =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "";
  const ip = ipCandidate.trim();
  const ipHash = isIP(ip)
    ? createHmac("sha256", secret).update(`ip:${ip}`).digest("hex")
    : null;

  const userAgent = (request.headers.get("user-agent") || "unknown").slice(0, 300);
  const language = (request.headers.get("accept-language") || "unknown").slice(0, 120);
  const networkHash = ipHash
    ? createHmac("sha256", secret)
        .update(`network:${ipHash}:${userAgent}:${language}`)
        .digest("hex")
    : null;

  return {
    hash: createHmac("sha256", secret).update(`device:${id}`).digest("hex"),
    ipHash,
    networkHash,
    setCookie: match ? null : `gxb3_portal_vid=${id}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
  };
}

export function attachCookie(response, cookie) {
  if (cookie) response.headers.set("Set-Cookie", cookie);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
