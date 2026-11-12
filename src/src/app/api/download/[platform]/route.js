import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { visitorFromRequest, attachCookie } from "../../../../lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set(["apk", "exe", "ios", "mobileconfig"]);

export async function GET(request, context) {
  const { platform } = await context.params;
  if (!allowed.has(platform)) {
    return NextResponse.json({ error: "Nền tảng không hợp lệ." }, { status: 404 });
  }

  try {
    const visitor = visitorFromRequest(request);
    const [release] = await db`
      SELECT download_url
      FROM portal.platform_releases
      WHERE platform_key = ${platform} AND published = true
      LIMIT 1
    `;

    if (!release?.download_url) {
      return attachCookie(
        NextResponse.json({ error: "Bản tải chưa được phát hành." }, { status: 404 }),
        visitor.setCookie
      );
    }

    const target = new URL(release.download_url);
    if (target.protocol !== "https:") {
      return NextResponse.json({ error: "Liên kết không hợp lệ." }, { status: 503 });
    }

    const userAgent = (request.headers.get("user-agent") || "").slice(0, 300);

    // The unique indexes enforce lifetime deduplication even for concurrent requests.
    // A repeat request still redirects to the file but does not add another count.
    await db`
      INSERT INTO portal.download_events
        (platform_key, visitor_hash, ip_hash, network_fingerprint_hash, user_agent)
      VALUES
        (${platform}, ${visitor.hash}, ${visitor.ipHash}, ${visitor.networkHash}, ${userAgent})
      ON CONFLICT DO NOTHING
    `;

    return attachCookie(NextResponse.redirect(target.toString(), 302), visitor.setCookie);
  } catch (error) {
    console.error("download redirect failed", error);
    return NextResponse.json({ error: "Không thể bắt đầu lượt tải." }, { status: 500 });
  }
}
