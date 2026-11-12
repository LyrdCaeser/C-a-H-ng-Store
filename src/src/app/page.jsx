"use client";

import { useEffect, useState } from "react";

const platformInfo = {
  apk: { name: "Android APK", desc: "Bộ cài đặt dành cho điện thoại Android", symbol: "▣", hint: "Tệp .apk" },
  exe: { name: "Windows EXE", desc: "Bộ cài đặt dành cho máy tính Windows", symbol: "▣", hint: "Tệp .exe" },
  ios: { name: "Ứng dụng iOS", desc: "Phiên bản dành cho iPhone và iPad", symbol: "●", hint: "Tệp .ipa" },
  mobileconfig: { name: "MobileConfig", desc: "Hồ sơ cấu hình thiết bị di động của Apple", symbol: "⚙", hint: "Tệp .mobileconfig" },
};
const groups = [
  { id: "ch-play", title: "CH PLAY", sub: "Dành cho Android và máy tính Windows", keys: ["apk", "exe"] },
  { id: "app-store", title: "APP STORE", sub: "Dành cho thiết bị Apple và hồ sơ cấu hình", keys: ["ios", "mobileconfig"] },
];
const initialData = { releases: [], stats: {}, comments: [] };

function prepareDownloadIdentity() {
  try {
    const key = "gxb3_download_device_id";
    const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("gxb3_portal_cid="));
    let id = localStorage.getItem(key) || (entry ? entry.slice("gxb3_portal_cid=".length) : "");
    if (!id) id = window.crypto?.randomUUID?.() || ("gxb3-" + Date.now() + "-" + Math.random().toString(16).slice(2));
    localStorage.setItem(key, id);
    document.cookie = "gxb3_portal_cid=" + id + "; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
  } catch {
    // The server's HttpOnly visitor cookie remains the fallback identity.
  }
}

function ReleaseCard({ release }) {
  const info = platformInfo[release.platform_key];
  if (!info) return null;
  return (
    <article className="vn-card">
      <div className="vn-cardtop">
        <div className={"vn-icon " + release.platform_key}>{info.symbol}</div>
        <span className={"vn-status " + (release.available ? "live" : "wait")}>{release.available ? "ĐÃ PHÁT HÀNH" : "CHƯA PHÁT HÀNH"}</span>
      </div>
      <h3>{info.name}</h3>
      <p>{info.desc}</p>
      <div className="vn-meta">
        <span>Phiên bản: <b>{release.version_name || "Chưa công bố"}</b></span>
        <span>{release.file_size || info.hint}</span>
      </div>
      <div className="vn-download-count"><span aria-hidden="true">⇩</span><b>{Number(release.download_count || 0).toLocaleString("vi-VN")} lượt tải</b><small>Riêng phiên bản đang phát hành</small></div>
      {release.requirements ? <p className="vn-small">Yêu cầu: {release.requirements}</p> : null}
      {release.release_notes ? <details className="vn-notes"><summary>Ghi chú phiên bản</summary><p>{release.release_notes}</p></details> : null}
      {release.available ? <a className="vn-download" href={"/api/download/" + release.platform_key} onClick={prepareDownloadIdentity}>Tải xuống</a> : <button className="vn-download disabled" disabled>Đang chuẩn bị</button>}
    </article>
  );
}
function Stat({ symbol, value, label }) {
  return <div className="vn-stat"><span>{symbol}</span><div><b>{value}</b><small>{label}</small></div></div>;
}

export default function HomePage() {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [reviewName, setReviewName] = useState("");
  const [rating, setRating] = useState(5);
  const [commentName, setCommentName] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function refresh() {
    try {
      const response = await fetch("/api/portal", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tải dữ liệu.");
      setData({ ...initialData, ...result });
    } catch (error) {
      setMessage(error.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  }
  async function submitReview(event) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: reviewName, rating }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể lưu đánh giá.");
      setMessage("Đã ghi nhận đánh giá của bạn. Cảm ơn bạn!");
      await refresh();
    } catch (error) {
      setMessage(error.message || "Không thể gửi đánh giá.");
    } finally {
      setSending(false);
    }
  }
  async function submitComment(event) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: commentName, content: comment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể đăng bình luận.");
      setComment("");
      setMessage("Bình luận đã được đăng.");
      await refresh();
    } catch (error) {
      setMessage(error.message || "Không thể đăng bình luận.");
    } finally {
      setSending(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  const stats = data.stats || {};
  return (
    <main className="vn-portal">
      <div className="vn-wrap">
        <header className="vn-header">
          <a href="/" className="vn-brand"><span className="vn-emblem">女</span><span><b>GODDESS BATTLE 3</b><small>CỔNG TẢI CHÍNH THỨC</small></span></a>
          <nav className="vn-nav"><a href="#ch-play">CH PLAY</a><a href="#app-store">APP STORE</a><a href="#cong-dong">Cộng đồng</a><a href="/admin">Quản trị</a></nav>
        </header>
        <section className="vn-hero">
          <div className="vn-eyebrow">GXB3 · NỮ THẦN CHIẾN ĐẤU 3</div>
          <h1>Khám phá thế giới<br />Nữ Thần Chiến Đấu 3</h1>
          <p>Tải phiên bản phù hợp với thiết bị của bạn. Mọi bản phát hành được quản lý tại cổng tải riêng của GXB3.</p>
        </section>
        <section className="vn-stats">
          <Stat symbol="⇩" value={Number(stats.downloads || 0).toLocaleString("vi-VN")} label="Tổng lượt tải" />
          <Stat symbol="★" value={Number(stats.rating_average || 0).toFixed(1)} label="Điểm đánh giá trung bình" />
          <Stat symbol="✦" value={Number(stats.review_count || 0).toLocaleString("vi-VN")} label="Lượt đánh giá" />
          <Stat symbol="☷" value={Number(stats.comment_count || 0).toLocaleString("vi-VN")} label="Bình luận" />
        </section>
        {groups.map((group) => (
          <section id={group.id} className="vn-section" key={group.id}>
            <div className="vn-head"><span>GXB3 · KHO TẢI XUỐNG</span><h2>{group.title}</h2><p>{group.sub}</p></div>
            <div className="vn-grid">
              {group.keys.map((key) => {
                const release = (data.releases || []).find((item) => item.platform_key === key);
                return release ? <ReleaseCard release={release} key={key} /> : null;
              })}
            </div>
          </section>
        ))}
        <section id="cong-dong" className="vn-section">
          <div className="vn-head"><span>KẾT NỐI NGƯỜI CHƠI</span><h2>Cộng đồng GXB3</h2><p>Đánh giá trải nghiệm và chia sẻ cảm nhận của bạn.</p></div>
          <div className="vn-community">
            <div className="vn-panel">
              <h3>Đánh giá trò chơi</h3><p>Mỗi trình duyệt có thể cập nhật một đánh giá của mình.</p>
              <form onSubmit={submitReview}>
                <input value={reviewName} onChange={(event) => setReviewName(event.target.value)} maxLength={32} placeholder="Tên hiển thị (không bắt buộc)" className="vn-field" />
                <div className="vn-stars">{[1,2,3,4,5].map((value) => <button type="button" onClick={() => setRating(value)} aria-label={value + " sao"} style={{ opacity: value <= rating ? 1 : 0.35 }} className="vn-star" key={value}>★</button>)}</div>
                <button disabled={sending} className="vn-send">Gửi đánh giá</button>
              </form>
              <p>Điểm hiện tại: <b>{Number(stats.rating_average || 0).toFixed(1)}/5</b> · {Number(stats.review_count || 0)} lượt đánh giá</p>
            </div>
            <div className="vn-panel">
              <h3>Gửi bình luận</h3><p>Chia sẻ ý kiến của bạn với cộng đồng người chơi.</p>
              <form onSubmit={submitComment}>
                <input value={commentName} onChange={(event) => setCommentName(event.target.value)} maxLength={32} placeholder="Tên hiển thị" className="vn-field" />
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} minLength={2} maxLength={1000} rows={4} required placeholder="Viết bình luận của bạn..." className="vn-field" />
                <button disabled={sending || comment.trim().length < 2} className="vn-send">Đăng bình luận</button>
              </form>
            </div>
          </div>
          {message ? <div role="status" className="vn-message">{message}</div> : null}
          <div style={{ marginTop: 18 }} className="vn-panel">
            <h3>Bình luận mới nhất</h3>
            {loading ? <p>Đang tải bình luận...</p> : (data.comments || []).length ? data.comments.map((item) => (
              <article className="vn-comment" key={item.id}>
                <b>{item.display_name || "Người chơi"}</b>
                <time>{(() => { try { return new Date(item.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }); } catch { return ""; } })()}</time>
                <p>{item.content}</p>
              </article>
            )) : <p>Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nhận!</p>}
          </div>
        </section>
        <footer className="vn-foot">Goddess Battle 3 · Cổng tải riêng dành cho cộng đồng người chơi<br />Lượt tải được ghi nhận khi người dùng nhấn nút tải xuống. <a href="/admin">Trang quản trị</a></footer>
      </div>
    </main>
  );
}
