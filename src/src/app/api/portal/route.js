import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { visitorFromRequest, attachCookie } from "../../../lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const v = visitorFromRequest(request);
    const [releases, stats, comments, appearance, reviews] = await Promise.all([
      db`
        SELECT p.platform_key,p.platform_group,p.title,p.version_name,p.version_code,
               p.sha256,p.current_release_key,p.file_size,p.requirements,p.release_notes,
               p.published,p.download_url,p.updated_at,
               (SELECT COUNT(*)::int FROM portal.download_events de
                WHERE de.platform_key = p.platform_key
                  AND de.release_key = p.current_release_key) AS download_count,
               (SELECT COUNT(*)::int FROM portal.platform_reviews pr
                WHERE pr.platform_key = p.platform_key
                  AND pr.release_key = p.current_release_key) AS review_count,
               (SELECT COALESCE(ROUND(AVG(pr.rating)::numeric,1),0)::float
                FROM portal.platform_reviews pr
                WHERE pr.platform_key = p.platform_key
                  AND pr.release_key = p.current_release_key) AS rating_average
        FROM portal.platform_releases p
        ORDER BY CASE p.platform_key WHEN 'apk' THEN 1 WHEN 'exe' THEN 2 WHEN 'ios' THEN 3 ELSE 4 END
      `,
      db`
        SELECT (SELECT COUNT(*)::int FROM portal.download_events) AS downloads,
               (SELECT COALESCE(ROUND(AVG(pr.rating)::numeric,1),0)::float
                FROM portal.platform_reviews pr JOIN portal.platform_releases p
                  ON p.platform_key=pr.platform_key AND p.current_release_key=pr.release_key) AS rating_average,
               ((SELECT COUNT(*)::int FROM portal.platform_reviews)
                + (SELECT COUNT(*)::int FROM portal.reviews)) AS review_count,
               (SELECT COUNT(*)::int FROM portal.reviews) AS legacy_review_count,
               (SELECT COUNT(*)::int FROM portal.comments) AS comment_count
      `,
      db`SELECT id,display_name,content,created_at FROM portal.comments ORDER BY created_at DESC LIMIT 30`,
      db`SELECT hero_url,app_icon_url FROM portal.store_appearance WHERE id = 1`,
      db`
        SELECT ranked.platform_key,ranked.release_key,ranked.rating,
               ranked.display_name,ranked.reason,ranked.updated_at
        FROM (
          SELECT pr.platform_key,pr.release_key,pr.rating,pr.display_name,pr.reason,
                 pr.updated_at,
                 ROW_NUMBER() OVER (PARTITION BY pr.platform_key ORDER BY pr.updated_at DESC) AS row_number
          FROM portal.platform_reviews pr
          JOIN portal.platform_releases p ON p.platform_key = pr.platform_key
            AND p.current_release_key = pr.release_key
        ) AS ranked
        WHERE ranked.row_number <= 4
        ORDER BY ranked.platform_key,ranked.updated_at DESC
      `
    ]);
    const safeReleases = releases.map(({download_url,...r}) => ({
      ...r, available: Boolean(download_url && r.published)
    }));
    return attachCookie(
      NextResponse.json({
        releases: safeReleases,
        stats: stats[0],
        comments,
        appearance: appearance[0] || {},
        reviews
      }),
      v.setCookie
    );
  } catch (error) {
    console.error("portal read failed", error);
    return NextResponse.json({ error: "Không thể tải dữ liệu." }, { status: 500 });
  }
}
