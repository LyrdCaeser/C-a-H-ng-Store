import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";

function readCookie(cookieHeader, name) {
  const entry = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.toLowerCase().startsWith(name.toLowerCase() + "="));
  const value = entry ? entry.slice(name.length + 1) : "";
  return /^[a-f0-9-]{36}$/i.test(value) ? value : null;
}

function scopedHash(secret, kind, id, releaseKey) {
  return createHmac("sha256", secret).update(kind + ":" + id + ":release:" + releaseKey).digest("hex");
}

export function visitorFromRequest(request, releaseKey = "global") {
  const cookieHeader = request.headers.get("cookie") || "";
  const serverId = readCookie(cookieHeader, "gxb3_portal_vid") || randomUUID();
  const clientId = readCookie(cookieHeader, "gxb3_portal_cid");
  const secret = process.env.VISITOR_HASH_SECRET;
  if (!secret) throw new Error("VISITOR_HASH_SECRET is missing");

  // Hash IP for diagnostics only. Never use shared Wi-Fi/IP as a deduplication key.
  const ipCandidate = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ip = ipCandidate.trim();
  const ipHash = isIP(ip) ? createHmac("sha256", secret).update("ip:" + ip).digest("hex") : null;

  const userAgent = (request.headers.get("user-agent") || "unknown").slice(0, 300);
  return {
    hash: releaseKey === "global" ? createHmac("sha256", secret).update("device:" + serverId).digest("hex") : scopedHash(secret, "server-device", serverId, releaseKey),
    clientDeviceHash: clientId ? scopedHash(secret, "client-device", clientId, releaseKey) : null,
    ipHash,
    userAgent,
    setCookie: readCookie(cookieHeader, "gxb3_portal_vid")
      ? null
      : "gxb3_portal_vid=" + serverId + "; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax"
  };
}

export function attachCookie(response, cookie) {
  if (cookie) response.headers.set("Set-Cookie", cookie);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
