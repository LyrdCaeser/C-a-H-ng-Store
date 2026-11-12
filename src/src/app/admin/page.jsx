"use client";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { createSHA256 } from "hash-wasm";

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

function AnalyticsPanel({ adminToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    if (!adminToken.trim()) {
      setError("Nhập mã quản trị trước khi xem thống kê.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/analytics", {
        headers: { Authorization: "Bearer " + adminToken },
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tải thống kê.");
      setData(result);
    } catch (err) {
      setError(err.message || "Không thể tải thống kê.");
    } finally {
      setLoading(false);
    }
  }

  const trend = data?.trend || [];
  const values = trend.map((item) => Number(item.downloads || 0));
  const max = Math.max(1, ...values);
  const width = 720;
  const height = 210;
  const pad = 22;
  const points = values.map((value, index) => {
    const x = trend.length <= 1 ? width / 2 : pad + (index * (width - 2 * pad)) / (trend.length - 1);
    const y = height - pad - (value / max) * (height - 2 * pad);
    return [x, y];
  });
  const polyline = points.map(([x, y]) => x + "," + y).join(" ");
  const area = points.length
    ? "M " + points[0][0] + " " + (height - pad) + " L " +
      points.map(([x, y]) => x + " " + y).join(" L ") + " L " +
      points[points.length - 1][0] + " " + (height - pad) + " Z"
    : "";

  return (
    <section style={{ ...sectionStyle, marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 19 }}>5. Thống kê tổng lượt tải</h2>
          <p style={{ margin: 0, color: "#aab5c5", fontSize: 12 }}>Lịch sử không bị reset khi phát hành phiên bản mới.</p>
        </div>
        <button type="button" onClick={loadAnalytics} disabled={loading} style={{ ...primaryButton, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Đang tải thống kê…" : data ? "Làm mới thống kê" : "Xem thống kê"}
        </button>
      </div>
      {error ? <p role="alert" style={{ color: "#fca5a5", fontSize: 13 }}>{error}</p> : null}
      {data ? (
        <>
          <div style={{ marginTop: 18, padding: 18, borderRadius: 12, background: "#0b1220", border: "1px solid rgba(219,185,119,.18)" }}>
            <div style={{ color: "#aab5c5", fontSize: 12 }}>TỔNG LƯỢT TẢI TÍCH LŨY — TẤT CẢ PHIÊN BẢN</div>
            <div style={{ color: "#f2dfb5", fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{Number(data.totalDownloads || 0).toLocaleString("vi-VN")}</div>
          </div>
          <div style={{ marginTop: 22 }}>
            <h3 style={{ color: "#e5d4b1", fontSize: 15 }}>Biểu đồ xu hướng lượt tải · 30 ngày gần nhất</h3>
            <svg viewBox={"0 0 " + width + " " + height} role="img" aria-label="Biểu đồ số lượt tải theo ngày" style={{ width: "100%", display: "block", background: "#0b1220", borderRadius: 12, border: "1px solid rgba(219,185,119,.15)" }}>
              {[0,1,2,3].map((step) => {
                const y = pad + step * (height - 2 * pad) / 3;
                return <line key={step} x1={pad} y1={y} x2={width-pad} y2={y} stroke="#344154" strokeDasharray="4 5" />;
              })}
              {area ? <path d={area} fill="rgba(217,181,111,.14)" /> : null}
              {points.length > 1 ? <polyline points={polyline} fill="none" stroke="#d9b56f" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
              {points.map(([x,y],i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#f0d39a" />)}
              {points.length ? <text x={pad} y={height-5} fill="#99a4b5" fontSize="11">{trend[0]?.day || ""}</text> : null}
              {points.length > 1 ? <text x={width-pad} y={height-5} textAnchor="end" fill="#99a4b5" fontSize="11">{trend[trend.length-1]?.day || ""}</text> : null}
              <text x={width-pad} y={pad+10} textAnchor="end" fill="#d9b56f" fontSize="11">Đỉnh: {max.toLocaleString("vi-VN")}</text>
            </svg>
          </div>
          <div style={{ marginTop: 22, overflowX: "auto" }}>
            <h3 style={{ color: "#e5d4b1", fontSize: 15 }}>Bảng số liệu theo phiên bản</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620, fontSize: 12 }}>
              <thead><tr style={{ color: "#d9c8a8", textAlign: "left" }}>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #344154" }}>Nền tảng</th>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #344154" }}>Phiên bản</th>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #344154" }}>Lượt tải</th>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #344154" }}>SHA-256</th>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #344154" }}>Ngày ghi nhận</th>
              </tr></thead>
              <tbody>
                {(data.versions || []).map((item) => (
                  <tr key={item.platform_key + ":" + item.release_key}>
                    <td style={{ padding: "11px 8px", borderBottom: "1px solid #253044", color: "#e4d4b5" }}>{item.platform_key}</td>
                    <td style={{ padding: "11px 8px", borderBottom: "1px solid #253044", color: "#e4d4b5" }}>{item.version_name || "Chưa đặt tên"} {item.version_code ? "(" + item.version_code + ")" : ""}</td>
                    <td style={{ padding: "11px 8px", borderBottom: "1px solid #253044", color: "#f0d39a", fontWeight: 800 }}>{Number(item.downloads || 0).toLocaleString("vi-VN")}</td>
                    <td style={{ padding: "11px 8px", borderBottom: "1px solid #253044", color: "#99a4b5", fontFamily: "monospace" }}>{item.sha256 ? item.sha256.slice(0, 16) + "…" : "Chưa có"}</td>
                    <td style={{ padding: "11px 8px", borderBottom: "1px solid #253044", color: "#99a4b5" }}>{new Date(item.created_at).toLocaleDateString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.versions?.length ? <p style={{ color: "#99a4b5", fontSize: 12 }}>Chưa có lịch sử phiên bản.</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [platformKey, setPlatformKey] = useState("apk");
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [sha256, setSha256] = useState("");
  const [hashing, setHashing] = useState(false);
  const [hashProgress, setHashProgress] = useState(0);
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
    setHashing(true);
    setHashProgress(0);
    notify("Đang tính SHA-256 cho tệp…");
    let fileSha256 = "";
    try {
      const hasher = await createSHA256();
      hasher.init();
      const chunkSize = 8 * 1024 * 1024;
      for (let offset = 0; offset < selectedFile.size; offset += chunkSize) {
        const chunk = await selectedFile.slice(offset, Math.min(offset + chunkSize, selectedFile.size)).arrayBuffer();
        hasher.update(new Uint8Array(chunk));
        setHashProgress(Math.round((Math.min(offset + chunkSize, selectedFile.size) / selectedFile.size) * 100));
      }
      fileSha256 = hasher.digest("hex");
      setSha256(fileSha256);
    } catch (error) {
      notify("Không thể tính SHA-256: " + (error?.message || "lỗi không xác định"), "error");
      setHashing(false);
      return;
    }
    setHashing(false);
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
      setSha256(fileSha256);
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
        body: JSON.stringify({ platformKey, versionName, versionCode, sha256, fileSize, requirements, downloadUrl, releaseNotes }),
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
            <input ref={fileInput} type="file" accept={selectedPlatform.accept} onChange={(event) => { setSelectedFile(event.target.files?.[0] || null); setSha256(""); }} style={{ ...fieldStyle, padding: 10 }} />
            {selectedFile ? <p style={{ color: "#d9c8a8", fontSize: 12 }}>{selectedFile.name} · {formatBytes(selectedFile.size)}</p> : null}
            {hashing ? <p style={{ color: "#d9c8a8", fontSize: 12 }}>Đang tính SHA-256: {hashProgress}%</p> : null}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" disabled={hashing || uploading || !selectedFile} onClick={uploadFile} style={{ ...primaryButton, opacity: hashing || uploading || !selectedFile ? 0.55 : 1 }}>{hashing ? "Đang tính SHA-256…" : uploading ? "Đang tải tệp…" : "Tải tệp từ thiết bị"}</button>
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
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle} htmlFor="sha256">Mã SHA-256 của tệp</label>
              <input id="sha256" value={sha256} onChange={(event) => setSha256(event.target.value.trim().toLowerCase())} placeholder="Tự tính khi tải tệp lên, hoặc nhập 64 ký tự SHA-256" style={fieldStyle} />
              <p style={{ color: "#8593a7", fontSize: 11, marginBottom: 0 }}>SHA-256 hoặc tên/mã phiên bản được dùng để nhận diện bản phát hành.</p>
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
          <AnalyticsPanel adminToken={adminToken} />
          <button type="submit" disabled={saving || uploading || hashing} style={{ ...primaryButton, padding: "15px 18px", fontSize: 15, opacity: saving || uploading ? 0.6 : 1 }}>{saving ? "Đang lưu…" : "Lưu và phát hành bản cập nhật"}</button>
        </form>
        <p style={{ marginTop: 20, textAlign: "center", color: "#738196", fontSize: 12 }}>Cổng quản trị độc lập · Không kết nối cơ sở dữ liệu trò chơi GXB3</p>
      </div>
    </main>
  );
}
