import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request) {
  const expected = process.env.PORTAL_ADMIN_TOKEN || "";
  const header = request.headers.get("authorization") || "";
  const provided = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Mã quản trị không hợp lệ." }, { status: 401 });
  }

  try {
    const [summary, versions, trend] = await Promise.all([
      db`SELECT COUNT(*)::int AS total_downloads FROM portal.download_events`,
      db`
        SELECT
          rv.platform_key, rv.release_key, rv.version_name, rv.version_code,
          rv.sha256, rv.file_size, rv.created_at,
          COUNT(de.id)::int AS downloads
        FROM portal.release_versions rv
        LEFT JOIN portal.download_events de
          ON de.platform_key = rv.platform_key AND de.release_key = rv.release_key
        GROUP BY rv.platform_key, rv.release_key, rv.version_name, rv.version_code,
                 rv.sha256, rv.file_size, rv.created_at
        ORDER BY rv.created_at DESC, rv.platform_key ASC
      `,
      db`
        SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
               COUNT(de.id)::int AS downloads
        FROM generate_series(
          date_trunc('day', now()) - interval '29 days',
          date_trunc('day', now()),
          interval '1 day'
        ) AS days(day)
        LEFT JOIN portal.download_events de
          ON de.created_at >= days.day AND de.created_at < days.day + interval '1 day'
        GROUP BY days.day
        ORDER BY days.day ASC
      `
    ]);

    return NextResponse.json({
      totalDownloads: summary[0]?.total_downloads || 0,
      versions,
      trend
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("download analytics failed", error);
    return NextResponse.json({ error: "Không thể tải thống kê lượt tải." }, { status: 500 });
  }
}
