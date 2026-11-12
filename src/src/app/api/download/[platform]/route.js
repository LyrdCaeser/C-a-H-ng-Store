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
    const [release] = await db`
      SELECT download_url, current_release_key, version_name, version_code, sha256
      FROM portal.platform_releases
      WHERE platform_key = ${platform} AND published = true
      LIMIT 1
    `;

    if (!release?.download_url || !release.current_release_key) {
      return NextResponse.json({ error: "Bản tải chưa được phát hành đầy đủ thông tin phiên bản." }, { status: 404 });
    }

    const target = new URL(release.download_url);
    if (target.protocol !== "https:" || target.username || target.password) {
      return NextResponse.json({ error: "Liên kết tải không hợp lệ." }, { status: 503 });
    }

    const visitor = visitorFromRequest(request, release.current_release_key);

    // Existing pre-migration events used an unscoped visitor hash. Recognize
    // those only for the currently published release so the migration does not
    // count returning devices twice; a later release has a different release_key.
    const [legacyExisting] = await db`
      SELECT id
      FROM portal.download_events
      WHERE platform_key = ${platform}
        AND release_key = ${release.current_release_key}
        AND visitor_hash = ${visitor.legacyHash}
      LIMIT 1
    `;

    if (!legacyExisting) {
      // IP hash is stored only for diagnostics. IP/network fingerprints are not unique keys.
      await db`
        INSERT INTO portal.download_events
          (platform_key, release_key, version_name, version_code, sha256,
           visitor_hash, client_device_hash, ip_hash, network_fingerprint_hash, user_agent)
        VALUES
          (${platform}, ${release.current_release_key}, ${release.version_name},
           ${release.version_code}, ${release.sha256}, ${visitor.hash},
           ${visitor.clientDeviceHash}, ${visitor.ipHash}, NULL, ${visitor.userAgent})
        ON CONFLICT DO NOTHING
      `;
    }

    return attachCookie(NextResponse.redirect(target.toString(), 302), visitor.setCookie);
  } catch (error) {
    console.error("download redirect failed", error);
    return NextResponse.json({ error: "Không thể bắt đầu lượt tải." }, { status: 500 });
  }
}
