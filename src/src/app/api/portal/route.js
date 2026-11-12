import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { visitorFromRequest, attachCookie } from "../../../lib/visitor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    const v = visitorFromRequest(request);
    const [releases, stats, comments] = await Promise.all([
      db`SELECT platform_key,platform_group,title,version_name,version_code,file_size,requirements,release_notes,published,download_url,updated_at FROM portal.platform_releases ORDER BY CASE platform_key WHEN 'apk' THEN 1 WHEN 'exe' THEN 2 WHEN 'ios' THEN 3 ELSE 4 END`,
      db`SELECT (SELECT COUNT(*)::int FROM portal.download_events) AS downloads,(SELECT COALESCE(ROUND(AVG(rating)::numeric,1),0)::float FROM portal.reviews) AS rating_average,(SELECT COUNT(*)::int FROM portal.reviews) AS review_count,(SELECT COUNT(*)::int FROM portal.comments) AS comment_count`,
      db`SELECT id,display_name,content,created_at FROM portal.comments ORDER BY created_at DESC LIMIT 30`
    ]);
    const safeReleases = releases.map(({download_url,...r})=>({...r,available:Boolean(download_url && r.published)}));
    return attachCookie(NextResponse.json({releases:safeReleases,stats:stats[0],comments}),v.setCookie);
  } catch (e) {
    console.error("portal read failed",e);
    return NextResponse.json({error:"Không thể tải dữ liệu."},{status:500});
  }
}