import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { visitorFromRequest, attachCookie } from "../../../lib/visitor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  try {
    const v = visitorFromRequest(request);
    const body = await request.json();
    const rating = Number(body.rating);
    const name = String(body.displayName || "Người chơi").trim().slice(0,32) || "Người chơi";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return NextResponse.json({error:"Điểm đánh giá phải từ 1 đến 5."},{status:400});
    await db`INSERT INTO portal.reviews(visitor_hash,rating,display_name) VALUES (${v.hash},${rating},${name})
      ON CONFLICT(visitor_hash) DO UPDATE SET rating=EXCLUDED.rating,display_name=EXCLUDED.display_name,updated_at=now()`;
    return attachCookie(NextResponse.json({ok:true}),v.setCookie);
  } catch (e) {
    console.error("review write failed",e);
    return NextResponse.json({error:"Không thể lưu đánh giá."},{status:500});
  }
}