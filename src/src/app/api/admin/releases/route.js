import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const platforms = {
  apk: { group: "playstore", title: "Android APK" },
  exe: { group: "playstore", title: "Windows EXE" },
  ios: { group: "appstore", title: "Ứng dụng iOS" },
  mobileconfig: { group: "appstore", title: "MobileConfig" },
};

function authorized(request) {
  const expected = process.env.PORTAL_ADMIN_TOKEN || "";
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

function makeReleaseKey({ sha256, versionName, versionCode }) {
  // Same canonical format was used to backfill the currently published versions.
  return "v1|sha256:" + (sha256 || "") +
    "|name:" + (versionName || "").trim().toLowerCase() +
    "|code:" + (versionCode || "").trim().toLowerCase();
}

export async function PUT(request) {
  if (!authorized(request)) return NextResponse.json({ error: "Mã quản trị không hợp lệ." }, { status: 401 });
  try {
    const body = await request.json();
    const key = String(body.platformKey || "");
    const platform = platforms[key];
    if (!platform) return NextResponse.json({ error: "Nền tảng không hợp lệ." }, { status: 400 });

    const [currentRelease] = await db`
      SELECT current_release_key, version_name, version_code, sha256,
             file_size, requirements, release_notes, download_url
      FROM portal.platform_releases
      WHERE platform_key = ${key}
      LIMIT 1
    `;

    // Empty form fields mean "keep the currently published value", not "erase it".
    const versionName = String(body.versionName || currentRelease?.version_name || "").trim().slice(0, 40) || null;
    const versionCode = String(body.versionCode || currentRelease?.version_code || "").trim().slice(0, 40) || null;
    const inputSha256 = String(body.sha256 || "").trim().toLowerCase() || null;
    if (inputSha256 && !/^[a-f0-9]{64}$/.test(inputSha256)) {
      return NextResponse.json({ error: "SHA-256 phải gồm đúng 64 ký tự thập lục phân." }, { status: 400 });
    }

    const sameVersionLabels =
      (currentRelease?.version_name || "").trim().toLowerCase() === (versionName || "").trim().toLowerCase() &&
      (currentRelease?.version_code || "").trim().toLowerCase() === (versionCode || "").trim().toLowerCase();
    // If the admin doesn't supply a new hash while editing the same release,
    // carry forward the published SHA instead of accidentally creating a new release.
    const sha256 = inputSha256 || (sameVersionLabels ? currentRelease?.sha256 || null : null);
    if (!sha256 && !versionName && !versionCode) {
      return NextResponse.json({ error: "Cần có SHA-256 hoặc tên/mã phiên bản để tạo mã phát hành." }, { status: 400 });
    }

    const rawUrl = String(body.downloadUrl || currentRelease?.download_url || "").trim();
    let safeUrl = null;
    if (rawUrl) {
      try { safeUrl = new URL(rawUrl); }
      catch { return NextResponse.json({ error: "Đường dẫn tải không hợp lệ." }, { status: 400 }); }
      if (safeUrl.protocol !== "https:" || safeUrl.username || safeUrl.password) {
        return NextResponse.json({ error: "Đường dẫn tải phải dùng HTTPS hợp lệ." }, { status: 400 });
      }
    }

    const fileSize = String(body.fileSize || currentRelease?.file_size || "").trim().slice(0, 40) || null;
    const requirements = String(body.requirements || currentRelease?.requirements || "").trim().slice(0, 1000) || null;
    const releaseNotes = String(body.releaseNotes || currentRelease?.release_notes || "").trim().slice(0, 5000) || null;
    const downloadUrl = safeUrl ? safeUrl.toString() : null;
    const published = Boolean(downloadUrl);
    let releaseKey = makeReleaseKey({ sha256, versionName, versionCode });
    // On first SHA capture for the already-published version, keep its existing key
    // so the historical count is not reset just because SHA tracking was introduced.
    if (currentRelease?.current_release_key && !currentRelease.sha256 && sha256 &&
        sameVersionLabels && (versionName || versionCode)) {
      releaseKey = currentRelease.current_release_key;
    }

    // New SHA or version label creates a new release key; old rows stay in history.
    await db`
      INSERT INTO portal.release_versions
        (platform_key, release_key, version_name, version_code, sha256, file_size, download_url, created_at, updated_at)
      VALUES
        (${key}, ${releaseKey}, ${versionName}, ${versionCode}, ${sha256},
         ${fileSize}, ${downloadUrl}, now(), now())
      ON CONFLICT (platform_key, release_key) DO UPDATE SET
        version_name = EXCLUDED.version_name,
        version_code = EXCLUDED.version_code,
        sha256 = EXCLUDED.sha256,
        file_size = EXCLUDED.file_size,
        download_url = EXCLUDED.download_url,
        updated_at = now()
    `;

    await db`
      INSERT INTO portal.platform_releases (
        platform_key, platform_group, title, version_name, version_code,
        file_size, requirements, release_notes, download_url, published,
        current_release_key, sha256, updated_at
      )
      VALUES (
        ${key}, ${platform.group}, ${platform.title}, ${versionName}, ${versionCode},
        ${fileSize}, ${requirements}, ${releaseNotes}, ${downloadUrl}, ${published},
        ${releaseKey}, ${sha256}, now()
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
        current_release_key = EXCLUDED.current_release_key,
        sha256 = EXCLUDED.sha256,
        updated_at = now()
    `;

    return NextResponse.json({ ok: true, releaseKey });
  } catch (error) {
    console.error("release save failed", error);
    return NextResponse.json({ error: "Không thể lưu bản phát hành." }, { status: 500 });
  }
}
