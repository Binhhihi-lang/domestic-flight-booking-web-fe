# 08 — Nhật ký quyết định thiết kế

> Mỗi mục ghi **bối cảnh → quyết định → lý do → hệ quả**. Đây là phần giải thích “vì sao”, không phải hướng dẫn code.
> Cập nhật: 13/11/2026.

---

## QĐ-01 — Monolith hai repo, không microservice

- **Bối cảnh:** đồ án 2 người, thời gian ngắn; FE và BE phát triển song song.
- **Quyết định:** một repo Angular + một repo Spring Boot, giao tiếp qua HTTP/JSON; không tách service.
- **Lý do:** giảm hạ tầng, dễ chạy local, hợp đồng API là điểm chốt duy nhất.
- **Hệ quả:** mọi thay đổi hợp đồng phải cập nhật API Design và mock FE cùng lúc.

---

## QĐ-02 — Bỏ `/v1`, tách `/api/admin` và `/api/public`

- **Bối cảnh:** API v0.2 dùng `/api/v1`; v0.4 cần phân vùng rõ ràng.
- **Quyết định:** base path là `/api`; vùng quản trị `/api/admin/**`; vùng khách `/api/public/**`; auth `/api/auth/**`.
- **Lý do:** tránh versioning khi chưa có nhu cầu; tách public/admin giúp `permitAll` chính xác và tránh lộ dữ liệu nháp.
- **Hệ quả:** FE không còn `/api/v1`; mọi service mới phải trỏ đúng vùng.

---

## QĐ-03 — JWT + Redis cho token

- **Bối cảnh:** cần đăng xuất thật và thu hồi token trước khi hết hạn.
- **Quyết định:** JWT HS256 stateless; Redis giữ blacklist access token, whitelist refresh token, cache permission, token reset mật khẩu.
- **Lý do:** JWT không tự thu hồi được; Redis cho phép vô hiệu tức thời mà không query DB mỗi request.
- **Hệ quả:** môi trường chạy phải có Redis; refresh token xoay vòng mỗi lần refresh.

---

## QĐ-04 — Bỏ ví tiền và hoàn tiền tự động

- **Bối cảnh:** mô hình ví làm phức tạp Phase 1, không cần cho đồ án.
- **Quyết định:** xóa `wallets`, `wallet_transactions`, hai cột hoàn tiền trong `bookings`, quyền `WALLET_READ_SELF`. Hủy vé chỉ đổi trạng thái; khách liên hệ đại lý để hoàn tiền.
- **Lý do:** giảm phạm vi; tránh xử lý giao dịch tài chính nội bộ.
- **Hệ quả:** không có màn “Ví của tôi”. **Ví voucher vẫn tồn tại** (`user_vouchers`) — đừng nhầm hai khái niệm.

---

## QĐ-05 — `is_active` ở request, `status` ở response/bulk

- **Bối cảnh:** tài liệu v0.4 từng ghi “luôn dùng status”, nhưng code BE thực tế khác.
- **Quyết định:**
  - Request promotion/voucher dùng `is_active` boolean.
  - Response master data dùng `status` string.
  - Bulk dùng `status` string.
  - News có bộ trạng thái riêng `DRAFT/PUBLISHED/UNPUBLISHED`.
- **Lý do:** giữ tương thích với DTO hiện có của BE.
- **Hệ quả:** FE model dùng `status`; payload form dùng `is_active`. Đã ghi chú ở API v0.4 mục 1.8.

---

## QĐ-06 — Voucher chỉ qua ví, khách không gõ mã

- **Bối cảnh:** hai mô hình “nhập mã” và “nhận vào ví” cùng tồn tại trong tài liệu cũ.
- **Quyết định:** chỉ dùng mô hình ví. Khách nhận voucher GLOBAL vào ví rồi chọn khi thanh toán; `voucher_code` chỉ để ADMIN tra cứu; API nhận `user_voucher_id`.
- **Lý do:** một luồng duy nhất, tránh rối; khớp bảng `user_vouchers`.
- **Hệ quả:** không thiết kế ô nhập mã ở bất kỳ màn khách nào; UI hiển thị tên chương trình + giá trị, không hiện mã.

---

## QĐ-07 — Khuyến mãi và voucher là hai thực thể riêng

- **Bối cảnh:** người dùng dễ gọi chung là “mã giảm giá”.
- **Quyết định:** promotion giảm thẳng vào dòng vé, **tự động**; voucher phải nhận vào ví và chọn khi thanh toán.
- **Lý do:** khác bảng, khác thời điểm áp dụng, khác quyền.
- **Hệ quả:** hai màn quản trị riêng; copy UI không dùng chữ “mã giảm giá” cho promotion.

---

## QĐ-08 — Chỉ bán vé bay thẳng nội địa

- **Bối cảnh:** dữ liệu `flights` không có bảng chặng trung gian/điểm dừng.
- **Quyết định:** bỏ mọi trường `stops`/`hasStop`, bỏ bộ lọc “Điểm dừng”.
- **Lý do:** phạm vi đồ án; tránh dữ liệu giả.
- **Hệ quả:** màn kết quả chỉ có chuyến bay thẳng; bộ lọc chỉ gồm hãng, hạng vé, giờ, khoảng giá.

---

## QĐ-09 — Chọn hạng vé riêng từng chặng

- **Bối cảnh:** Traveloka gộp khứ hồi rồi chọn một hạng.
- **Quyết định:** mỗi chặng chọn hạng riêng; thẻ chuyến chỉ hiện “Giá từ” + số hạng; bấm Chọn mới mở bảng hạng.
- **Lý do:** đúng dữ liệu `booking_segments` (mỗi chặng có `fare_class_id` riêng).
- **Hệ quả:** UI phức tạp hơn nhưng khớp DB; bộ lọc hạng ghế đổi giá thẻ theo hạng thấp nhất.

---

## QĐ-10 — Giữ chỗ 15 phút

- **Bối cảnh:** cần tránh giữ ghế vô hạn.
- **Quyết định:** `bookings.payment_expires_at` = tạo đơn + 15 phút; `seat_holds.hold_expires_at` tương ứng; UI ghi “Thời hạn thanh toán”.
- **Lý do:** đủ thời gian thanh toán, giải phóng ghế tự động.
- **Hệ quả:** có màn trạng thái đang xử lý / thất bại / hết hạn.

---

## QĐ-11 — Hai phương thức thanh toán

- **Bối cảnh:** cần chốt phạm vi thanh toán.
- **Quyết định:** chỉ **VNPay** và **chuyển khoản ngân hàng (VietQR)**. Không thẻ tín dụng, không trả tại quầy.
- **Lý do:** giảm phạm vi và tránh lưu dữ liệu thẻ.
- **Hệ quả:** VNPay là chuyển hướng sang cổng, **không vẽ QR**; QR chỉ thuộc VietQR ở màn riêng; chưa phụ thuộc PayOS.

---

## QĐ-12 — Giá vé trọn gói, thuế phí gộp một cột

- **Bối cảnh:** hóa đơn hàng không thường tách thuế/phí, nhưng đồ án cần đơn giản.
- **Quyết định:** `flight_fares.base_fare` + `tax_fee` (gộp thuế và phí sân bay); API trả `adult_price = base_fare + tax_fee`.
- **Lý do:** một con số cho khách, dễ lọc giá; không có toggle “chưa gồm thuế”.
- **Hệ quả:** admin nhập hai số ở màn Giá bán theo chuyến; client không có ô thuế/phí.

---

## QĐ-13 — Booking chỉ xem và hủy

- **Bối cảnh:** đơn đặt vé là chứng từ, không phải dữ liệu nhập tay.
- **Quyết định:** không có thêm/sửa/xóa booking ở cả khách và admin; chỉ xem chi tiết và hủy.
- **Lý do:** tránh sai lệch với thanh toán/vé điện tử.
- **Hệ quả:** màn admin Booking là read-only + hành động hủy.

---

## QĐ-14 — Xóa mềm và tách “trạng thái” khỏi “kích hoạt”

- **Bối cảnh:** master data vừa cần ẩn khỏi public vừa cần giữ lịch sử.
- **Quyết định:** dùng `is_deleted` + `deleted_at` cho xóa mềm; `status`/`is_active` cho trạng thái sử dụng; update ≠ activate.
- **Lý do:** không mất dữ liệu tham chiếu; public chỉ thấy bản ghi ACTIVE.
- **Hệ quả:** unique code dùng partial index; mọi query phải lọc xóa mềm.

---

## QĐ-15 — Sơ đồ ghế cấu hình được

- **Bối cảnh:** máy bay khác nhau về bố trí và lối đi.
- **Quyết định:** `aircrafts.aisle_after` mô tả lối đi; `seat_types.color_hex` tô màu; `seat_class_surcharges` quy định phụ thu nâng hạng.
- **Lý do:** một sơ đồ dùng lại cho nhiều chuyến; admin tự cấu hình.
- **Hệ quả:** cặp hạng chưa cấu hình = **không bán**; `surcharge = 0` = miễn phí có chủ đích; trẻ em phụ thu 100%.

---

## QĐ-16 — Mock layer ở FE

- **Bối cảnh:** BE chưa có endpoint trong nhiều giai đoạn.
- **Quyết định:** interceptor + `MockRegistry` giả lập toàn bộ API, bật bằng `environment.useMock`.
- **Lý do:** service/component giữ nguyên code thật; nối API chỉ đổi cờ.
- **Hệ quả:** mock phải trả đúng envelope và **đúng HTTP status** (lỗi đi vào `error`, không vào `next`).

---

## QĐ-17 — Sanitize HTML tin tức hai lớp

- **Bối cảnh:** nội dung tin là HTML do ADMIN nhập.
- **Quyết định:** BE sanitize bằng jsoup; FE sanitize bằng DOMPurify trước khi `[innerHTML]`.
- **Lý do:** chặn XSS kể cả khi một lớp bị bỏ qua.
- **Hệ quả:** test XSS ở `news-detail.spec.ts` kiểm tra kết quả cuối trong DOM.

---

## QĐ-18 — Thương hiệu VinaFly

- **Bối cảnh:** đồ án cần tên riêng, không trùng thương hiệu.
- **Quyết định:** tên VinaFly, tagline “Bay nội địa, giá tốt mỗi ngày”, logo SVG nội tuyến.
- **Lý do:** nhận diện riêng; logo vector sắc ở mọi mật độ.
- **Hệ quả:** mọi header/footer dùng `<app-brand-logo>`, không gõ tên thô.

---

## Đọc tiếp

- Tổng quan: [01-tong-quan.md](01-tong-quan.md)
- Trạng thái & lộ trình: [07-trang-thai-va-lo-trinh.md](07-trang-thai-va-lo-trinh.md)
