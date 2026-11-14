import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request) {
  const expected = process.env.PORTAL_ADMIN_TOKEN || "";
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i,"").trim();
  const e = Buffer.from(expected), p = Buffer.from(provided);
  return Boolean(expected && provided && e.length === p.length && timingSafeEqual(e, p));
}

export async function POST(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Mã quản trị không hợp lệ." }, { status: 401 });
  }
  try {
    const { kind, url } = await request.json();
    if (kind !== "hero" && kind !== "icon") {
      return NextResponse.json({ error: "Loại ảnh không hợp lệ." }, { status: 400 });
    }
    const src = new URL(String(url || ""));
    if (src.protocol !== "https:" ||
        !src.hostname.endsWith(".public.blob.vercel-storage.com") ||
        !src.pathname.includes("/goddess-battle-3/artwork/")) {
      return NextResponse.json({ error: "Ảnh phải nằm trong kho Vercel Blob của Store." }, { status: 400 });
    }

    const [result] = await db`
      UPDATE portal.store_appearance
      SET hero_url = CASE WHEN ${kind} = 'hero' THEN ${src.toString()} ELSE hero_url END,
          app_icon_url = CASE WHEN ${kind} = 'icon' THEN ${src.toString()} ELSE app_icon_url END,
          updated_at = now()
      WHERE id = 1
      RETURNING hero_url, app_icon_url
    `;
    return NextResponse.json({ ok: true, appearance: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("store artwork update failed", error);
    return NextResponse.json({ error: "Không thể lưu ảnh cửa hàng." }, { status: 500 });
  }
}