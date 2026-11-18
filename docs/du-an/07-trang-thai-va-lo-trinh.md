# 07 — Trạng thái & lộ trình

> **Cập nhật:** 13/11/2026. Trạng thái code phụ thuộc nhánh — số liệu dưới đây ghi rõ nhánh đo.

---

## 1. Ảnh chụp nhanh

| Hạng mục | Trạng thái |
|---|---|
| Wireframe khách | ✅ Đủ (36 màn / 71 artboard) |
| Wireframe admin | ✅ Đủ 35 artboard (F1–F26 + 3 khuôn CRUD) |
| Wireframe staff | ✅ Đủ 9 artboard (E1–E9) |
| BE Phase 1 | ✅ Xong, đã merge |
| BE Phase 2/3 | ⛔ Mới có entity + migration, **chưa có service/controller** |
| FE Phase 1 | 🟡 Phần lớn xong; một số màn còn `coming-soon` |
| FE Phase 2/3 | ⛔ Chưa làm; `flight-results` đang dùng dữ liệu tĩnh |

**Đo trên nhánh `feature/wireframe-khach-hang` (13/11/2026):**

- `ng build` ✅
- `ng test` ✅ **115/115** (16 file)
- `ng serve` ✅ chạy được; lỗi build voucher đã sửa.

---

## 2. Bản đồ nhánh

| Repo | Nhánh | Nội dung |
|---|---|---|
| FE | `main` | Baseline |
| FE | `da` | Nhánh tích hợp chung (đã merge `binh`) |
| FE | `feature/ghe-va-phu-thu` | Phụ thu nâng hạng + sơ đồ ghế + Cụm 3 (theo báo cáo 21/10: 147/147 test) |
| FE | `feature/phase-2-chuyen-bay-va-gia-ve` | Nhánh chuẩn bị Phase 2, chưa có code |
| **FE** | **`feature/wireframe-khach-hang`** | **Đang làm việc** — wireframe + code nền Phase 1 |
| BE | `main` / `da` | Phase 1 |
| BE | `feature/phase-2-chuyen-bay-va-gia-ve` | Docs `is_active` + phụ thu ghế; chưa có code Phase 2 |

> Trước khi làm tiếp, xác nhận mình đang ở đúng nhánh. Các cụm “xóa ví”, “hồ sơ cá nhân”, “phụ thu ghế” đã xong ở nhánh `feature/ghe-va-phu-thu` nhưng **chưa có** trên nhánh wireframe hiện tại.

---

## 3. Đã xong

### Phase 1 — BE

- Auth/Profile/User/RBAC; master data; promotion/voucher; news; bulk.
- Tách `/api/admin` và `/api/public`, bỏ `/api/v1`.
- JWT + Redis; phân quyền `@PreAuthorize`.
- Migration tới **V15**.
- Feature ghế & phụ thu: `seat_class_surcharges`, `aircrafts.aisle_after`, `seat_types.color_hex`.
- Test: 64/64 (theo báo cáo 21/10).

### Phase 1 — FE

- Design system + layout khách/admin.
- Auth: đăng nhập, đăng ký; quên mật khẩu (ở nhánh Cụm 3).
- Trang chủ, tìm chuyến, kết quả tìm chuyến (dữ liệu tĩnh), khuyến mãi, tin tức.
- Kho voucher + voucher của tôi.
- Admin CRUD: hãng, thành phố, sân bay, máy bay, loại ghế, khuyến mãi, voucher, tin tức, danh mục tin, người dùng.
- RBAC chỉ đọc: vai trò, quyền.
- Sơ đồ ghế theo máy bay; phụ thu nâng hạng (nhánh `feature/ghe-va-phu-thu`).
- Bulk action dùng chung; mock layer phủ Phase 1.

### Wireframe

- `wf-02-khu-hoi.html` — toàn bộ luồng khách.
- `wf-03-admin.html` — 35 artboard, có nhóm “Giá vé & hành lý”.
- `wf-04-staff.html` — 9 artboard Staff Portal.

---

## 4. Còn thiếu / đang chặn

### BE chưa có

| Việc | Ảnh hưởng |
|---|---|
| `FlightController` / `FlightService` | FE không có API chuyến bay thật; `flight-results` vẫn tĩnh |
| `BookingController` / `BookingService` | Không có màn chi tiết booking, không đặt vé thật |
| Payment + E-ticket | Phase 3 |
| `notifications` | Chưa có bảng; không làm màn thông báo |

### FE còn thiếu so với wireframe/UI list

- Loại vé (`fare_classes`), Quy định hoàn vé (`fare_rules`), Gói hành lý (`baggage_options`).
- Giá bán theo chuyến (`flight_fares`) — đây là nơi admin nhập `base_fare` + `tax_fee`.
- Tồn ghế theo chuyến (`flight_seats`).
- Chuyến bay: danh sách / chi tiết / tạo / sửa.
- Đặt chỗ: danh sách / chi tiết.
- Báo cáo, dashboard vận hành.
- Staff Portal (mới có wireframe, chưa có code).

### Trên nhánh wireframe hiện tại vẫn còn `coming-soon`

- Khách: `account/wallet`, `account/profile`, `account/security`.
- Admin: `flights`, `bookings`, `profile`.

> Các mục này đã được xử lý một phần ở nhánh `feature/ghe-va-phu-thu`; cần merge hoặc làm lại khi chuyển nhánh.

### Lệch hợp đồng voucher cần sửa

- `UserVoucherService.store()` đang khai `PageData<VoucherStoreItem>`; BE trả **mảng trần**.
- `UserVoucher.voucher` đang dùng `Voucher` đầy đủ + `discount_amount`; BE trả `VoucherBrief`, không có `discount_amount`.
- Mock `/voucher-store` cũng đang trả `PageData`; phải sửa đồng bộ.

---

## 5. Việc kế tiếp (đề xuất)

1. **Chốt lại wireframe thành spec** cho các màn chưa có code (loại vé, quy định hoàn, hành lý, giá bán, tồn ghế, chuyến bay, đặt chỗ, báo cáo, staff).
2. **Làm lại màn hình flight cho chuẩn** — hiện `flight-results` dùng dữ liệu tĩnh; cần bám `FlightFilters`, `SortKey` và hợp đồng Phase 2.
3. **Hoàn thiện Phase 1 FE trên nhánh hiện tại**: xóa màn ví, bổ sung hồ sơ/đổi mật khẩu, đồng bộ route/sidebar.
4. **Chuẩn bị Phase 2**: chờ BE có `FlightController`; trong lúc chờ, mở rộng mock theo API Design Phase 2.
5. **Staff Portal**: chuyển 9 artboard `wf-04` thành component; tái dùng layout admin.

---


### 14/11/2026 — Chuẩn hoá mô hình Khoang – Hạng vé – Loại ghế

**BE (nhánh `feature/mo-hinh-khoang-hang-ve`, chưa merge):**
- Migration **V16**: bỏ `FIRST`, thêm `PREMIUM_ECONOMY`, thêm `seat_types.surcharge`, seed 7 hạng vé + `fare_rules`, xoá `seat_class_surcharges`.
- Code: thêm `surcharge` vào entity/DTO/mapper/service SeatType; xoá toàn bộ module `SeatClassSurcharge`.
- `mvnw test`: pass.

**FE wireframe (chưa sửa code Angular):**
- `wf-02`: bộ lọc/ tab đổi thành **khoang**; màn chọn ghế chỉ cho chọn trong khoang đã mua, phụ thu hiển thị theo loại ghế (0 / 70.000 / 120.000).
- `wf-03`: W-ADM-16 đổi từ "Phụ thu nâng hạng" thành **Khoang máy bay**; W-ADM-15 Loại ghế thêm cột **Khoang + Phụ thu**; W-ADM-17 đổi tên **Hạng vé**; sidebar thêm "Khoang máy bay", đổi "Loại vé" → "Hạng vé".
- `wf-04`: đổi "loại vé" → "hạng vé".
- Kiểm chứng: jsdom parse không lỗi; tag `<div>`/`<section>` cân bằng.

---

## 6. Câu hỏi còn treo

- Email và số điện thoại đại lý để hiển thị ở khối hoàn tiền (chờ màn chi tiết booking).
- Cổng xác nhận chuyển khoản tự động: dùng PayOS hay đối soát thủ công? (chưa chốt, màn hình không được phụ thuộc PayOS).

---

## 7. Kiểm chứng gần nhất

| Lệnh / kiểm tra | Kết quả |
|---|---|
| `ng build` (FE, 13/11) | ✅ |
| `ng test` (FE, 13/11) | ✅ 115/115 |
| `ng serve` + mở trình duyệt | ✅ HTTP 200, app render |
| `mvnw test` (BE, theo báo cáo 21/10) | ✅ 64/64 |
| Wireframe HTML tag balance | ✅ 0 lỗi (theo báo cáo 13/11) |

---

## Đọc tiếp

- Quyết định thiết kế: [08-quyet-dinh-thiet-ke.md](08-quyet-dinh-thiet-ke.md)
- Màn hình & luồng: [06-man-hinh-va-luong.md](06-man-hinh-va-luong.md)
