import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { visitorFromRequest, attachCookie } from "../../../lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const platforms = new Set(["apk", "exe", "ios", "mobileconfig"]);

export async function POST(request) {
  try {
    const body = await request.json();
    const platform = String(body.platformKey || "");
    const rating = Number(body.rating);
    const reason = String(body.reason || "").trim();
    const name = String(body.displayName || "Người chơi").trim().slice(0, 32) || "Người chơi";

    if (!platforms.has(platform)) {
      return NextResponse.json({ error: "Vui lòng chọn nền tảng hợp lệ." }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Vui lòng chọn từ 1 đến 5 sao." }, { status: 400 });
    }
    if (reason.length < 8 || reason.length > 600) {
      return NextResponse.json({ error: "Lý do đánh giá phải từ 8 đến 600 ký tự." }, { status: 400 });
    }

    const [release] = await db`
      SELECT current_release_key FROM portal.platform_releases
      WHERE platform_key = ${platform} AND published = true
        AND download_url IS NOT NULL LIMIT 1
    `;
    if (!release?.current_release_key) {
      return NextResponse.json({ error: "Nền tảng này chưa có bản phát hành để đánh giá." }, { status: 409 });
    }

    const releaseKey = release.current_release_key;
    const visitor = visitorFromRequest(request, releaseKey);

    // One review per device and platform+release. A return visit updates the
    // score/reason without increasing the number of reviews.
    // Server-generated version keys prevent a client from reviewing an old
    // release while pretending it is the current one.
    const [result] = await db`
      WITH updated AS (
        UPDATE portal.platform_reviews AS pr
        SET rating = ${rating}, reason = ${reason}, display_name = ${name}, updated_at = now()
        FROM portal.platform_releases AS published
        WHERE pr.platform_key = ${platform}
          AND pr.release_key = ${releaseKey}
          AND published.platform_key = pr.platform_key
          AND published.current_release_key = pr.release_key
          AND published.published = true
          AND (
            pr.visitor_hash = ${visitor.hash}
            OR (${visitor.clientDeviceHash}::text IS NOT NULL
                AND pr.client_device_hash = ${visitor.clientDeviceHash})
          )
        RETURNING pr.visitor_hash
      ), inserted AS (
        INSERT INTO portal.platform_reviews
          (platform_key, release_key, visitor_hash, client_device_hash,
           display_name, rating, reason)
        SELECT ${platform}, ${releaseKey}, ${visitor.hash},
               ${visitor.clientDeviceHash}, ${name}, ${rating}, ${reason}
        WHERE EXISTS (
          SELECT 1 FROM portal.platform_releases
          WHERE platform_key = ${platform} AND current_release_key = ${releaseKey}
            AND published = true
        )
        AND NOT EXISTS (SELECT 1 FROM updated)
        ON CONFLICT DO NOTHING
        RETURNING visitor_hash
      )
      SELECT (SELECT COUNT(*)::int FROM updated) AS updated_count,
             (SELECT COUNT(*)::int FROM inserted) AS inserted_count
    `;

    if (!result?.updated_count && !result?.inserted_count) {
      // Could be a concurrent duplicate or a release changed mid-request.
      const [current] = await db`
        SELECT current_release_key FROM portal.platform_releases
        WHERE platform_key = ${platform} LIMIT 1
      `;
      if (current?.current_release_key !== releaseKey) {
        return NextResponse.json({ error: "Phiên bản vừa được cập nhật. Hãy tải lại trang trước khi đánh giá." }, { status: 409 });
      }
    }

    return attachCookie(
      NextResponse.json({ ok: true, updated: Boolean(result?.updated_count), platformKey: platform }),
      visitor.setCookie
    );
  } catch (error) {
    console.error("platform review failed", error);
    return NextResponse.json({ error: "Không thể lưu đánh giá cho nền tảng này." }, { status: 500 });
  }
}
