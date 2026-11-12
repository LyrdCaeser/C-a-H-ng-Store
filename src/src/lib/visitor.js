import { createHmac, randomUUID } from "node:crypto";
export function visitorFromRequest(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\\s*)gxb3_portal_vid=([a-f0-9-]{36})(?:;|$)/i);
  const id = match?.[1] || randomUUID();
  const secret = process.env.VISITOR_HASH_SECRET;
  if (!secret) throw new Error("VISITOR_HASH_SECRET is missing");
  return {
    hash: createHmac("sha256", secret).update(id).digest("hex"),
    setCookie: match ? null : `gxb3_portal_vid=${id}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
  };
}
export function attachCookie(response, cookie) {
  if (cookie) response.headers.set("Set-Cookie", cookie);
  response.headers.set("Cache-Control", "no-store");
  return response;
}