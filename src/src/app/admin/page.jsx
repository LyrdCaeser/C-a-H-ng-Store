"use client";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

const platforms = [
  { key: "apk", name: "Android APK", group: "CH PLAY", accept: ".apk" },
  { key: "exe", name: "Windows EXE", group: "CH PLAY", accept: ".exe" },
  { key: "ios", name: "Ứng dụng iOS", group: "APP STORE", accept: ".ipa,.zip" },
  { key: "mobileconfig", name: "MobileConfig", group: "APP STORE", accept: ".mobileconfig" },
];
function formatBytes(value) {
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(value || 0), index = 0;
  if (!size) return "";
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return size.toFixed(index ? 2 : 0) + " " + units[index];
}
const sectionStyle = { background: "rgba(16,25,41,.9)", border: "1px solid rgba(219,185,119,.18)", borderRadius: 16, padding: 20 };
const labelStyle = { display: "block", marginBottom: 8, color: "#d9c8a8", fontSize: 13, fontWeight: 700 };
const fieldStyle = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(219,185,119,.25)", background: "#0b1220", color: "#f5eddf", outline: "none", fontSize: 14 };
const primaryButton = { border: 0, borderRadius: 10, padding: "12px 16px", background: "linear-gradient(135deg,#d9b56f,#a9823d)", color: "#17130b", fontWeight: 800, cursor: "pointer" };

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [platformKey, setPlatformKey] = useState("apk");
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [requirements, setRequirements] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const fileInput = useRef(null);
  const selectedPlatform = platforms.find((item) => item.key === platformKey) || platforms[0];

  function notify(value, type = "info") { setMessage(value); setMessageType(type); }

  async function uploadFile() {
    if (!adminToken.trim()) return notify("Vui lòng nhập mã quản trị trước khi tải tệp lên.", "error");
    if (!selectedFile) return notify("Vui lòng chọn tệp cần tải lên.", "error");
    if (!selectedPlatform.accept.split(",").some((ext) => selectedFile.name.toLowerCase().endsWith(ext))) return notify("Định dạng tệp không phù hợp với nền tảng đã chọn.", "error");
    setUploading(true); setProgress(0); notify("Đang tải tệp lên kho lưu trữ…");
    try {
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const pathname = "goddess-battle-3/" + platformKey + "/" + Date.now() + "-" + safeName;
      const blob = await upload(pathname, selectedFile, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        clientPayload: JSON.stringify({ platformKey, adminToken }),
        multipart: selectedFile.size > 0xa00000,
        onUploadProgress: (event) => setProgress(Math.round(event.percentage || 0)),
      });
      setDownloadUrl(blob.url);
      setFileSize(formatBytes(selectedFile.size));
      notify("Tải tệp lên thành công. Địa chỉ tải đã được điền tự động; hãy lưu bản phát hành.", "success");
    } catch (error) { notify(error?.message || "Không thể tải tệp lên. Vui lòng thử lại.", "error"); }
    finally { setUploading(false); }
  }

  async function saveRelease(event) {
    event.preventDefault();
    if (!adminToken.trim()) return notify("Vui lòng nhập mã quản trị.", "error");
    setSaving(true); notify("Đang lưu thông tin bản phát hành…");
    try {
      const response = await fetch("/api/admin/releases", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
        body: JSON.stringify({ platformKey, versionName, versionCode, fileSize, requirements, downloadUrl, releaseNotes }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Không thể lưu bản phát hành.");
      notify("Đã lưu bản phát hành thành công.", "success");
    } catch (error) { notify(error?.message || "Không thể lưu bản phát hành.", "error"); }
    finally { setSaving(false); }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "34px 16px 60px", background: "radial-gradient(ellipse at top,#17263b 0%,#080c15 58%)", color: "#f1eadb" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <a href="/" style={{ color: "#d9b56f", textDecoration: "none", fontSize: 13 }}>← Về cổng tải</a>
        <header style={{ margin: "24px 0" }}>
          <div style={{ color: "#d9b56f", letterSpacing: 3, fontSize: 11, fontWeight: 800 }}>GODDESS BATTLE 3</div>
          <h1 style={{ margin: "8px 0", fontSize: "clamp(28px,5vw,40px)", color: "#f5e8cc" }}>Quản trị cửa hàng tải game</h1>
          <p style={{ margin: 0, color: "#aab5c5", lineHeight: 1.7 }}>Quản lý phiên bản và phát hành tệp cho bốn nền tảng. Có thể tải tệp trực tiếp hoặc dùng đường dẫn HTTPS có sẵn.</p>
        </header>
        <form onSubmit={saveRelease} style={{ display: "grid", gap: 16 }}>
          <section style={sectionStyle}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>1. Xác thực quản trị</h2>
            <label style={labelStyle} htmlFor="admin-token">Mã quản trị</label>
            <input id="admin-token" type="password" autoComplete="current-password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="Nhập mã quản trị" style={fieldStyle} />
            <p style={{ color: "#8593a7", fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>Mã được gửi qua HTTPS và xác minh ở máy chủ trước khi cấp quyền tải tệp.</p>
          </section>
          <section style={sectionStyle}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>2. Chọn nền tảng</h2>
            <label style={labelStyle} htmlFor="platform">Nền tảng phát hành</label>
            <select id="platform" value={platformKey} onChange={(event) => { setPlatformKey(event.target.value); setSelectedFile(null); }} style={fieldStyle}>
              {platforms.map((item) => <option value={item.key} key={item.key}>{item.group} · {item.name}</option>)}
            </select>
            <p style={{ color: "#aab5c5", fontSize: 13, marginBottom: 0 }}>Định dạng cho phép: {selectedPlatform.accept}</p>
          </section>
          <section style={sectionStyle}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>3. Tệp cài đặt</h2>
            <p style={{ color: "#aab5c5", fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>Chọn tệp từ thư viện trên điện thoại hoặc máy tính. Tệp sẽ được tải lên Vercel Blob và tự điền địa chỉ tải.</p>
            <input ref={fileInput} type="file" accept={selectedPlatform.accept} onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} style={{ ...fieldStyle, padding: 10 }} />
            {selectedFile ? <p style={{ color: "#d9c8a8", fontSize: 12 }}>{selectedFile.name} · {formatBytes(selectedFile.size)}</p> : null}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" disabled={uploading || !selectedFile} onClick={uploadFile} style={{ ...primaryButton, opacity: uploading || !selectedFile ? 0.55 : 1 }}>{uploading ? "Đang tải tệp…" : "Tải tệp từ thiết bị"}</button>
              {uploading ? <span style={{ color: "#d9c8a8", fontSize: 12 }}>{progress}%</span> : null}
            </div>
            {uploading ? <div style={{ height: 5, borderRadius: 99, background: "#293447", marginTop: 12, overflow: "hidden" }}><div style={{ width: progress + "%", height: "100%", background: "#d9b56f" }} /></div> : null}
            <div style={{ marginTop: 20 }}>
              <label style={labelStyle} htmlFor="download-url">Hoặc nhập đường dẫn tải HTTPS</label>
              <input id="download-url" type="url" value={downloadUrl} onChange={(event) => setDownloadUrl(event.target.value)} placeholder="https://…" style={fieldStyle} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle} htmlFor="filesize">Dung lượng tệp</label>
              <input id="filesize" value={fileSize} onChange={(event) => setFileSize(event.target.value)} placeholder="Tự điền sau khi tải lên, hoặc nhập thủ công" style={fieldStyle} />
            </div>
          </section>
          <section style={sectionStyle}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>4. Thông tin phiên bản</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              <div><label style={labelStyle} htmlFor="version">Tên phiên bản</label><input id="version" value={versionName} onChange={(event) => setVersionName(event.target.value)} placeholder="Ví dụ: 1.2.1" style={fieldStyle} /></div>
              <div><label style={labelStyle} htmlFor="version-code">Mã phiên bản</label><input id="version-code" value={versionCode} onChange={(event) => setVersionCode(event.target.value)} placeholder="Ví dụ: 121" style={fieldStyle} /></div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle} htmlFor="requirements">Yêu cầu hệ thống</label>
              <textarea id="requirements" rows={3} value={requirements} onChange={(event) => setRequirements(event.target.value)} placeholder="Phiên bản hệ điều hành, cấu hình tối thiểu…" style={{ ...fieldStyle, resize: "vertical" }} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle} htmlFor="notes">Ghi chú cập nhật</label>
              <textarea id="notes" rows={5} value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} placeholder="Nội dung cập nhật của phiên bản…" style={{ ...fieldStyle, resize: "vertical" }} />
            </div>
          </section>
          {message ? <div role="status" style={{ padding: 14, borderRadius: 10, border: "1px solid " + (messageType === "error" ? "rgba(248,113,113,.4)" : messageType === "success" ? "rgba(74,222,128,.35)" : "rgba(219,185,119,.25)"), background: messageType === "error" ? "rgba(127,29,29,.18)" : messageType === "success" ? "rgba(20,83,45,.18)" : "rgba(30,41,59,.55)", color: messageType === "error" ? "#fca5a5" : messageType === "success" ? "#86efac" : "#e7d5b0" }}>{message}</div> : null}
          <button type="submit" disabled={saving || uploading} style={{ ...primaryButton, padding: "15px 18px", fontSize: 15, opacity: saving || uploading ? 0.6 : 1 }}>{saving ? "Đang lưu…" : "Lưu và phát hành bản cập nhật"}</button>
        </form>
        <p style={{ marginTop: 20, textAlign: "center", color: "#738196", fontSize: 12 }}>Cổng quản trị độc lập · Không kết nối cơ sở dữ liệu trò chơi GXB3</p>
      </div>
    </main>
  );
}
