import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  const expected = process.env.PORTAL_ADMIN_TOKEN || "";
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i,"").trim();
  const e=Buffer.from(expected), p=Buffer.from(provided);
  if (!expected || !provided || e.length !== p.length || !timingSafeEqual(e,p)) {
    return NextResponse.json({error:"Mã quản trị không hợp lệ. Vui lòng kiểm tra lại mã trước khi tải tệp."},{status:401});
  }
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
