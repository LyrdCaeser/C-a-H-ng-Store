import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { visitorFromRequest, attachCookie } from "../../../lib/visitor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  try {
    const v = visitorFromRequest(request);
    const body = await request.json();
    const name = String(body.displayName || "Người chơi").trim().slice(0,32) || "Người chơi";
    const content = String(body.content || "").trim();
    if (content.length < 2 || content.length > 1000)
      return NextResponse.json({error:"Bình luận cần từ 2 đến 1.000 ký tự."},{status:400});
    const recent = await db`SELECT id FROM portal.comments WHERE visitor_hash=${v.hash} AND created_at>now()-interval '60 seconds' LIMIT 1`;
    if (recent.length) return NextResponse.json({error:"Vui lòng đợi một phút trước khi bình luận tiếp."},{status:429});
    const [comment] = await db`INSERT INTO portal.comments(visitor_hash,display_name,content) VALUES (${v.hash},${name},${content}) RETURNING id,display_name,content,created_at`;
    return attachCookie(NextResponse.json({ok:true,comment}),v.setCookie);
  } catch (e) {
    console.error("comment write failed",e);
    return NextResponse.json({error:"Không thể đăng bình luận."},{status:500});
  }
}