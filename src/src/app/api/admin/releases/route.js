import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const platforms = {
  apk: { group: "CH PLAY", title: "Android APK" },
  exe: { group: "CH PLAY", title: "Windows EXE" },
  ios: { group: "APP STORE", title: "Ứng dụng iOS" },
  mobileconfig: { group: "APP STORE", title: "MobileConfig" },
};

function authorized(request) {
  const expected = process.env.PORTAL_ADMIN_TOKEN || "";
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function PUT(request) {
  if (!authorized(request)) return NextResponse.json({ error: "Mã quản trị không hợp lệ." }, { status: 401 });
  try {
    const body = await request.json();
    const key = String(body.platformKey || "");
    const platform = platforms[key];
    if (!platform) return NextResponse.json({ error: "Nền tảng không hợp lệ." }, { status: 400 });

    const rawUrl = String(body.downloadUrl || "").trim();
    let safeUrl = null;
    if (rawUrl) {
      try { safeUrl = new URL(rawUrl); }
      catch { return NextResponse.json({ error: "Đường dẫn tải không hợp lệ." }, { status: 400 }); }
      if (safeUrl.protocol !== "https:" || safeUrl.username || safeUrl.password) {
        return NextResponse.json({ error: "Đường dẫn tải phải dùng HTTPS hợp lệ." }, { status: 400 });
      }
    }

    const versionName = String(body.versionName || "").trim().slice(0, 40) || null;
    const versionCode = String(body.versionCode || "").trim().slice(0, 40) || null;
    const fileSize = String(body.fileSize || "").trim().slice(0, 40) || null;
    const requirements = String(body.requirements || "").trim().slice(0, 1000) || null;
    const releaseNotes = String(body.releaseNotes || "").trim().slice(0, 5000) || null;
    const downloadUrl = safeUrl ? safeUrl.toString() : null;
    const published = Boolean(downloadUrl);

    await db`
      INSERT INTO portal.platform_releases (
        platform_key, platform_group, title, version_name, version_code,
        file_size, requirements, release_notes, download_url, published, updated_at
      )
      VALUES (
        ${key}, ${platform.group}, ${platform.title}, ${versionName}, ${versionCode},
        ${fileSize}, ${requirements}, ${releaseNotes}, ${downloadUrl}, ${published}, now()
      )
      ON CONFLICT (platform_key) DO UPDATE SET
        platform_group = EXCLUDED.platform_group,
        title = EXCLUDED.title,
        version_name = EXCLUDED.version_name,
        version_code = EXCLUDED.version_code,
        file_size = EXCLUDED.file_size,
        requirements = EXCLUDED.requirements,
        release_notes = EXCLUDED.release_notes,
        download_url = EXCLUDED.download_url,
        published = EXCLUDED.published,
        updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("release save failed", error);
    return NextResponse.json({ error: "Không thể lưu bản phát hành." }, { status: 500 });
  }
}
