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
const initialData = { releases: [], stats: {}, comments: [], reviews: [] };

function prepareDownloadIdentity() {
  try {
    const key = "gxb3_download_device_id";
    const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("gxb3_portal_cid="));
    let id = localStorage.getItem(key) || (entry ? entry.slice("gxb3_portal_cid=".length) : "");
    if (!id) {
      if (window.crypto?.randomUUID) {
        id = window.crypto.randomUUID();
      } else {
        const bytes = window.crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
        id = hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
      }
    }
    localStorage.setItem(key, id);
    document.cookie = "gxb3_portal_cid=" + id + "; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
  } catch {
    // The server's HttpOnly visitor cookie remains the fallback identity.
  }
}

function PlatformReviews({ release, reviews = [], onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [stars, setStars] = useState(5);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [showAll, setShowAll] = useState(false);
  const count = Number(release.review_count || 0);
  const average = Number(release.rating_average || 0);
  const currentReviews = reviews.filter((item) =>
    item.platform_key === release.platform_key && item.release_key === release.current_release_key
  );
  const visibleReviews = showAll ? currentReviews : currentReviews.slice(0, 2);

  async function submit(event) {
    event.preventDefault();
    if (!release.available || sending) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformKey: release.platform_key,
          displayName, rating: stars, reason
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Không thể lưu đánh giá.");
      setNotice(result.updated ? "Đã cập nhật đánh giá của bạn." : "Đã ghi nhận đánh giá của bạn.");
      setReason("");
      await onSaved();
    } catch (error) {
      setNotice(error.message || "Không thể gửi đánh giá.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="vn-platform-reviews" aria-label={"Đánh giá " + release.platform_key}>
      <div className="vn-rating-header">
        <span className="vn-rating-value"><span aria-hidden="true">★</span> {count ? average.toFixed(1) : "—"}<small>/5</small></span>
        <div className="vn-rating-side">
          <span className="vn-rating-stars" aria-label={count ? "Trung bình " + average.toFixed(1) + " trên 5 sao" : "Chưa có đánh giá"}>★★★★★</span>
          <small>{count.toLocaleString("vi-VN")} đánh giá · Bản {release.version_name || "hiện tại"}</small>
        </div>
      </div>
      <button type="button" className="vn-review-toggle" disabled={!release.available} onClick={() => { setExpanded(!expanded); setNotice(""); }}>
        {expanded ? "Đóng biểu mẫu" : "☆ Đánh giá nền tảng này"}
      </button>
      {expanded && (
        <form onSubmit={submit} className="vn-review-form">
          <label htmlFor={"review-name-" + release.platform_key}>Tên hiển thị (không bắt buộc)</label>
          <input id={"review-name-" + release.platform_key} className="vn-field" maxLength={32} placeholder="Tên người chơi" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <label>Chấm điểm từ 1 đến 5 sao</label>
          <div className="vn-stars" role="group" aria-label="Chọn số sao">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" aria-pressed={stars === value} aria-label={value + " sao"} className={"vn-star " + (value <= stars ? "chosen" : "")} onClick={() => setStars(value)}>★</button>
            ))}
            <span className="vn-stars-label">{stars}/5</span>
          </div>
          <label htmlFor={"review-reason-" + release.platform_key}>Lý do đánh giá</label>
          <textarea id={"review-reason-" + release.platform_key} className="vn-field" required minLength={8} maxLength={600} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bạn thích điểm gì hoặc gặp vấn đề gì ở phiên bản này?" />
          <button type="submit" className="vn-send" disabled={sending || reason.trim().length < 8}>{sending ? "Đang gửi…" : "Gửi đánh giá"}</button>
          <p className="vn-review-hint">Mỗi thiết bị được tính một đánh giá trong mỗi phiên bản và có thể chỉnh sửa đánh giá đó.</p>
        </form>
      )}
      {notice && <p className="vn-review-notice" role="status">{notice}</p>}
      <div className="vn-review-list">
        {visibleReviews.length > 0 ? (
          <>
            <h4>Lý do người chơi đánh giá</h4>
            {visibleReviews.map((item, index) => (
              <article className="vn-review-entry" key={item.platform_key + item.release_key + item.updated_at + index}>
                <div><b>{item.display_name || "Người chơi"}</b><span className="vn-review-entry-stars">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span></div>
                <p>{item.reason}</p>
              </article>
            ))}
            {currentReviews.length > 2 && <button className="vn-review-more" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Thu gọn" : "Xem thêm lý do đánh giá"}</button>}
          </>
        ) : <p className="vn-review-empty">Chưa có đánh giá cho phiên bản này.</p>}
      </div>
    </section>
  );
}

function ReleaseCard({ release, appIconUrl, reviews, onSaved }) {
  const info = platformInfo[release.platform_key];
  if (!info) return null;
  return (
    <article className="vn-card">
      <div className="vn-cardtop">
        <div className={"vn-icon " + release.platform_key}>{appIconUrl ? <img className="vn-app-art" src={appIconUrl} alt="Ảnh Goddess Battle 3" /> : info.symbol}</div>
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
      <PlatformReviews release={release} reviews={reviews} onSaved={onSaved} />
    </article>
  );
}
function Stat({ symbol, value, label }) {
  return <div className="vn-stat"><span>{symbol}</span><div><b>{value}</b><small>{label}</small></div></div>;
}

export default function HomePage() {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
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
    <main className="vn-portal" style={{ "--store-background-image": data.appearance?.hero_url ? `url("${data.appearance.hero_url}")` : "none" }}>
      <div className="vn-wrap">
        <header className="vn-header">
          <a href="/" className="vn-brand"><span className="vn-emblem">女</span><span><b>GODDESS BATTLE 3</b><small>CỔNG TẢI CHÍNH THỨC</small></span></a>
          <nav className="vn-nav"><a href="#ch-play">CH PLAY</a><a href="#app-store">APP STORE</a><a href="#cong-dong">Cộng đồng</a><a href="/admin">Quản trị</a></nav>
        </header>
        <section className="vn-hero">
          <div className="vn-hero-copy">
          <div className="vn-eyebrow">GXB3 · NỮ THẦN CHIẾN ĐẤU 3</div>
          <h1>Khám phá thế giới<br />Nữ Thần Chiến Đấu 3</h1>
          <p>Tải phiên bản phù hợp với thiết bị của bạn. Mọi bản phát hành được quản lý tại cổng tải riêng của GXB3.</p>
          </div>
        </section>
        <section className="vn-stats">
          <Stat symbol="⇩" value={Number(stats.downloads || 0).toLocaleString("vi-VN")} label="Tổng lượt tải" />
          <Stat symbol="★" value={Number(stats.rating_average || 0).toFixed(1)} label="Điểm bản hiện tại" />
          <Stat symbol="✦" value={Number(stats.review_count || 0).toLocaleString("vi-VN")} label="Tổng lượt đánh giá" />
          <Stat symbol="☷" value={Number(stats.comment_count || 0).toLocaleString("vi-VN")} label="Bình luận" />
        </section>
        {groups.map((group) => (
          <section id={group.id} className="vn-section" key={group.id}>
            <div className="vn-head"><span>GXB3 · KHO TẢI XUỐNG</span><h2>{group.title}</h2><p>{group.sub}</p></div>
            <div className="vn-grid">
              {group.keys.map((key) => {
                const release = (data.releases || []).find((item) => item.platform_key === key);
                return release ? <ReleaseCard release={release} appIconUrl={data.appearance?.app_icon_url} reviews={data.reviews || []} onSaved={refresh} key={key} /> : null;
              })}
            </div>
          </section>
        ))}
        <section id="cong-dong" className="vn-section">
          <div className="vn-head"><span>KẾT NỐI NGƯỜI CHƠI</span><h2>Cộng đồng GXB3</h2><p>Đánh giá trải nghiệm và chia sẻ cảm nhận của bạn.</p></div>
          <div className="vn-community">
            <div className="vn-panel">
              <h3>Đánh giá theo nền tảng</h3>
              <p>Chọn mục Android APK, Windows EXE, iOS hoặc MobileConfig ở trên để chấm sao và chia sẻ lý do cụ thể cho phiên bản đang phát hành.</p>
              <p>Mỗi nền tảng có điểm và lượt đánh giá độc lập. Khi ra phiên bản mới, bộ đánh giá của phiên bản đó bắt đầu lại từ 0; lịch sử các phiên bản cũ vẫn được giữ lại.</p>
              <p>Điểm trung bình các bản đang phát hành: <b>{Number(stats.rating_average || 0).toFixed(1)}/5</b></p>
              <p>Tổng lượt đánh giá mọi phiên bản: <b>{Number(stats.review_count || 0).toLocaleString("vi-VN")}</b></p>
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
