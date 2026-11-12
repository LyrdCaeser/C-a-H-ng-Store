import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { handleUpload } from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const extensions = {
  apk: [".apk"],
  exe: [".exe"],
  ios: [".ipa", ".zip"],
  mobileconfig: [".mobileconfig"],
};
const contentTypes = [
  "application/octet-stream",
  "application/vnd.android.package-archive",
  "application/vnd.microsoft.portable-executable",
  "application/x-msdownload",
  "application/x-apple-aspen-config",
  "application/x-itunes-ipa",
  "application/zip",
  "text/xml",
  "application/xml",
];

function validAdminToken(provided) {
  const expected = process.env.PORTAL_ADMIN_TOKEN || "";
  const value = String(provided || "");
  if (!expected || !value) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(value);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload;
        try { payload = JSON.parse(clientPayload || "{}"); }
        catch { throw new Error("Thông tin xác thực tải tệp không hợp lệ."); }
        if (!validAdminToken(payload.adminToken)) throw new Error("Mã quản trị không hợp lệ.");

        const platformKey = String(payload.platformKey || "");
        const allowed = extensions[platformKey];
        if (!allowed) throw new Error("Nền tảng không hợp lệ.");
        const prefix = "goddess-battle-3/" + platformKey + "/";
        if (!String(pathname || "").startsWith(prefix)) throw new Error("Đường dẫn lưu tệp không hợp lệ.");
        if (!allowed.some((extension) => String(pathname).toLowerCase().endsWith(extension))) {
          throw new Error("Định dạng tệp không phù hợp với nền tảng đã chọn.");
        }

        return {
          allowedContentTypes: contentTypes,
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("blob upload token failed", error);
    return NextResponse.json({ error: error?.message || "Không thể chuẩn bị tải tệp lên." }, { status: 400 });
  }
}
