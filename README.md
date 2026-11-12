# Cửa Hàng Store — GXB3 Download Center

Cổng phát hành và tải xuống độc lập cho Goddess Battle 3.

## Cấu trúc

Ứng dụng Next.js nằm trong thư mục `src/` (Vercel Root Directory: `src`).

- Android APK và Windows EXE — CH PLAY
- iOS IPA/ZIP và MobileConfig — APP STORE
- Trang quản trị tại `/admin`
- API phát hành, tải xuống, đánh giá và bình luận
- Neon database riêng cho cổng tải; không dùng Neon Production của game GXB3

## Cấu hình môi trường

Thiết lập các biến sau trong Vercel Project Settings → Environment Variables:

- `DATABASE_URL` — Neon connection string của database cổng tải
- `VISITOR_HASH_SECRET` — secret ngẫu nhiên dùng để băm mã khách truy cập
- `PORTAL_ADMIN_TOKEN` — mã quản trị của cổng tải
- `BLOB_READ_WRITE_TOKEN` — token Vercel Blob

Không đưa giá trị bí mật vào Git.

## Chạy cục bộ

```bash
cd src
npm install
npm run build
npm start
```

## Ghi chú khôi phục source

Các tệp cấu hình, thư viện database, visitor và API công khai được phục hồi nguyên vẹn từ Deployment Production. Bốn tệp dài bị giới hạn khi đọc từ Vercel Deployment API (trang chủ, trang quản trị, API lưu phiên bản và API upload) được tái dựng dựa trên bundle Production và phần source còn đọc được. Tệp lưu phiên bản đã sửa biểu thức xử lý tiền tố Bearer bị escape sai. Không thay đổi database hoặc dữ liệu Production trong quá trình khôi phục.
