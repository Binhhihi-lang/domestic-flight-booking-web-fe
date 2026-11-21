# 03 — Cơ sở dữ liệu

> **Nguồn:** `be/docs/Database_Design_Domestic_Flight_Booking_v0.5.md` (15/10/2026) + migration thực tế trong `be/src/main/resources/db/migration` (V1–V15).
> **Lưu ý:** v0.5 mô tả 34 bảng (33 bảng đã dựng + `notifications` chưa tạo). Nghiệp vụ thông báo đã chốt tại `design/00-nghiep-vu-thong-bao.md`; bảng sẽ tạo ở migration V18. V14 thêm `seat_class_surcharges` nhưng V16 đã xoá bảng này ⇒ hiện có **33 bảng đã dựng**; tính cả `notifications` là **34 bảng trong thiết kế**.

---

## 1. Các nhóm bảng

> Nhóm E — Wallet đã bị bỏ hoàn toàn ở V13; còn 5 nhóm đang dùng.

| Nhóm | Số bảng | Vai trò |
|---|---|---|
| A — Xác thực & RBAC | 4 | Tài khoản, role, quyền |
| B — Dữ liệu nền | 16 | Hãng, thành phố, sân bay, máy bay, ghế, khuyến mãi, voucher, tin tức |
| C — Chuyến bay & giá vé | 5 | Chuyến, hạng vé, quy định hoàn, giá, tồn ghế |
| D — Đặt vé & thanh toán | 8 | Booking, hành khách, giữ ghế, thanh toán, vé điện tử |
| F — Thông báo | 1 (chưa tạo) | `notifications` |

---

## 2. Danh sách bảng

### A — Xác thực & RBAC

| Bảng | Mục đích |
|---|---|
| `users` | Tài khoản CUSTOMER/STAFF/ADMIN; mỗi user đúng 1 role; xóa mềm |
| `roles` | 3 role cố định ADMIN/STAFF/CUSTOMER; chỉ seed, chỉ xem |
| `permissions` | Danh mục quyền theo module (`module` thêm ở V10) |
| `role_permissions` | Bảng nối N–N role ↔ permission |

### B — Dữ liệu nền

| Bảng | Mục đích |
|---|---|
| `airlines` | Hãng hàng không |
| `cities` | Thành phố; có `image_url` từ V10 |
| `airports` | Sân bay thuộc thành phố |
| `aircrafts` | Máy bay; V15 thêm `aisle_after` (vị trí lối đi) |
| `seat_types` | Loại ghế; V12 thêm `color_hex`; V16 thêm `surcharge` (phụ thu chọn ghế) |
| `aircraft_seats` | Sơ đồ ghế vật lý của máy bay |
| `promotions` | Khuyến mãi; V10 thêm `image_url`, `description`, `badge_label`; **không có cột giới hạn lượt/khách — cố ý (chốt 17/11/2026)** |
| `promotion_scopes` | Phạm vi áp dụng (hãng / hạng vé / tuyến / chuyến) |
| `promotion_excluded_flights` | Chuyến bị loại trừ; **chỉ có `promotion_id` + `flight_id`, không có cột lý do** |
| `vouchers` | Voucher GLOBAL/ASSIGNED; `claim_limit` (tổng lượt phát) + `claimed_count`; `per_user_limit` đã xoá ở V7 |
| `voucher_scopes` | Phạm vi voucher |
| `voucher_excluded_flights` | Chuyến bị loại trừ |
| `user_vouchers` | Ví voucher của khách; có `booking_id`, `discount_amount`; `UNIQUE (user_id, voucher_id)` → mỗi khách 1 lần/voucher |
| `news_categories` | Chuyên mục tin |
| `news_items` | Bài viết; nội dung HTML |
| `news_category_mapping` | Bài ↔ chuyên mục (N–N) |

### C — Chuyến bay & giá vé

| Bảng | Mục đích |
|---|---|
| `flights` | Chuyến bay; `operation_status` + `sales_status`; `parent_flight_id` cho chuyến bổ sung |
| `fare_classes` | Hạng vé thuộc một hãng: mã đầy đủ `<mã_hãng>_<mã_hạng>` (`VN_ECON_SAVER` … `QH_BIZ_FLEX`), duy nhất toàn hệ thống; `airline_id` từ V17 |
| `fare_rules` | Quy định hoàn vé theo hạng, có version |
| `flight_fares` | Giá người lớn theo chuyến/hạng: `base_fare` + `tax_fee` |
| `flight_seats` | Tồn ghế từng chuyến; `seat_surcharge`, `version` khóa lạc quan |

### D — Đặt vé, thanh toán, vé điện tử

| Bảng | Mục đích |
|---|---|
| `baggage_options` | Gói hành lý bán thêm |
| `bookings` | Đơn đặt vé; giữ chỗ 15 phút qua `payment_expires_at` |
| `booking_segments` | Chặng của booking (1–2 chặng); snapshot giá/phụ thu |
| `passengers` | Hành khách ADULT/CHILD/INFANT |
| `seat_holds` | Lượt giữ ghế, hết hạn theo `hold_expires_at` |
| `booking_baggages` | Hành lý mua theo hành khách |
| `payments` | Giao dịch thanh toán (VNPay/chuyển khoản), retry nhiều lần |
| `e_tickets` | Vé điện tử phát hành sau thanh toán |

### F — Thông báo

| Bảng | Mục đích |
|---|---|
| `notifications` | Thông báo cho user/booking — **chưa tạo bảng** |

---

## 3. Quan hệ chính

| Bảng con | Khóa ngoại | Bảng cha | Bản số | Ghi chú |
|---|---|---|---|---|
| `users` | `role_id` | `roles` | N–1 | Mỗi user đúng 1 role |
| `role_permissions` | `role_id`, `permission_id` | `roles`, `permissions` | N–N | |
| `airports` | `city_id` | `cities` | N–1 | |
| `aircraft_seats` | `aircraft_id`, `seat_type_id` | `aircrafts`, `seat_types` | N–1 | |
| `promotion_scopes` | `promotion_id` + cột theo `target_type` | nhiều bảng | 1–N | Chỉ dùng cột tương ứng loại phạm vi |
| `promotion_excluded_flights` | `promotion_id`, `flight_id` | `promotions`, `flights` | N–N | Loại trừ thắng phạm vi |
| `voucher_scopes` | `voucher_id` + cột theo `target_type` | nhiều bảng | 1–N | |
| `voucher_excluded_flights` | `voucher_id`, `flight_id` | `vouchers`, `flights` | N–N | |
| `user_vouchers` | `user_id`, `voucher_id`, `booking_id` | `users`, `vouchers`, `bookings` | N–N | `booking_id` UNIQUE → mỗi booking tối đa 1 voucher |
| `news_category_mapping` | `news_item_id`, `news_category_id` | `news_items`, `news_categories` | N–N | |
| `flights` | `airline_id`, `aircraft_id`, `departure_airport_id`, `arrival_airport_id`, `parent_flight_id` | `airlines`, `aircrafts`, `airports`, `flights` | N–1, self 1–N | |
| `flight_fares` | `flight_id`, `fare_class_id` | `flights`, `fare_classes` | N–1 | Chỉ lưu giá người lớn |
| `fare_rules` | `fare_class_id` | `fare_classes` | N–1 | Nhiều version |
| `flight_seats` | `flight_id`, `aircraft_seat_id` | `flights`, `aircraft_seats` | N–1 | Sinh từ sơ đồ máy bay |
| `bookings` | `user_id` | `users` | N–1 | |
| `booking_segments` | `booking_id`, `flight_id`, `fare_class_id`, `fare_rule_id`, `promotion_id` | | N–1 | 1 booking có 1–2 chặng |
| `passengers` | `booking_id` | `bookings` | N–1 | 1–9 khách |
| `seat_holds` | `booking_id`, `passenger_id`, `flight_seat_id` | | N–1 | INFANT không giữ ghế |
| `booking_baggages` | `booking_id`, `passenger_id`, `baggage_option_id` | | N–1 | |
| `payments` | `booking_id` | `bookings` | N–1 | Nhiều lần retry |
| `e_tickets` | `booking_id`, `booking_segment_id`, `passenger_id`, `flight_seat_id` | | N–1 | `flight_seat_id` NULL với INFANT |

---

## 4. Migration Flyway

| Version | Nội dung chính |
|---|---|
| V1 | Schema nền: users, roles, permissions, master data, news |
| V2 | Seed RBAC |
| V3 | Seed master data |
| V4 | `users.role_id`, bỏ `user_roles`, thêm `is_active`/xóa mềm, đổi tên `seat_configurations` → `aircraft_seats` |
| V5 | `flights`, `flight_fares`, `flight_seats` |
| V6 | `fare_rules` |
| V7 | Bảng scopes/excluded_flights, `applicable_trip_type`, bỏ `voucher_usages` |
| V8 | Booking: `bookings`, `booking_segments`, `passengers`, `seat_holds`, baggages, payments, e_tickets |
| V9 | `wallets`, `wallet_transactions` — **bị V13 xóa lại** |
| V10 | Ảnh/mô tả/nhãn cho News/City/Promotion; `permissions.module`; seed `VOUCHER_CLAIM`, `WALLET_READ_SELF` |
| V11 | Reset identity sequence các bảng seed ID cố định |
| V12 | `seat_types.color_hex VARCHAR(7)` + CHECK regex `^#[0-9A-Fa-f]{6}$` |
| V13 | Xóa 2 bảng ví; bỏ `bookings.applied_refund_percent`, `bookings.refund_amount`; xóa quyền `WALLET_READ_SELF` |
| **V14** | Bảng `seat_class_surcharges` + partial unique index + seed 6 dòng — **đã bị V16 xoá** |
| **V15** | `aircrafts.aisle_after VARCHAR(20)` + CHECK `^[A-Z](,[A-Z])*$` |
| **V16** | Bỏ `FIRST`, thêm `PREMIUM_ECONOMY`; thêm `seat_types.surcharge`; seed 7 hạng vé + fare_rules; **xoá `seat_class_surcharges`** |

> **V16 là bản mới nhất** (nhánh `feature/mo-hinh-khoang-hang-ve`, 14/11/2026). Xem thêm `be/docs/features/da-2026-10-19-ghe-va-phu-thu/`.

---

## 5. Quy ước dữ liệu

- **Đặt tên:** bảng số nhiều snake_case; PK là `id` BIGINT IDENTITY; FK `<bảng_số_ít>_id`; thời điểm `_at`; ngày `_date`; cờ `is_`; tiền `_amount`; màu `_hex`.
- **Enum:** lưu VARCHAR + CHECK (`@Enumerated(STRING)`).
- **Thời gian:** `TIMESTAMPTZ`.
- **Tiền:** `NUMERIC(12,2)` VND, không dùng float.
- **Xóa mềm:** `is_deleted` + `deleted_at`; mã duy nhất dùng **partial unique index** `WHERE is_deleted = false`.
- **Giá:** `flight_fares` chỉ lưu giá người lớn; trẻ em = 75%, em bé = 10% (cấu hình `application.yml`); giá đã gồm thuế/phí.
- **Khuyến mãi/voucher:** áp cho ADULT + CHILD, **không áp INFANT**; promotion tính theo dòng vé, voucher tính theo cả booking.
- **Ghế:** `flight_seats.version` khóa lạc quan; giữ ghế 15 phút; phụ thu theo **loại ghế** (`seat_types.surcharge`, ghi đè bằng `flight_seats.seat_surcharge`), áp 100% cho CHILD.
- **News:** khách chỉ thấy `PUBLISHED`; bài `DRAFT/UNPUBLISHED` trả về không tồn tại.

---

## 6. Những điểm FE cần nhớ

1. Không có bảng `wallets` — **ví voucher** (`user_vouchers`) vẫn tồn tại, khác ví tiền.
2. `bookings` không có cột hoàn tiền; hủy vé chỉ đổi trạng thái.
3. `flight_fares` chỉ có `base_fare` + `tax_fee`; không có cột thuế riêng.
4. Phụ thu gắn với **loại ghế** (`seat_types.surcharge`), ghi đè theo chuyến bằng `flight_seats.seat_surcharge`; không có bảng `seat_class_surcharges` (V16 đã xoá).
5. `notifications` chưa có bảng — đừng thiết kế màn phụ thuộc vào nó.

---

## Đọc tiếp

- Hợp đồng API: [04-api.md](04-api.md)
- Trạng thái & lộ trình: [07-trang-thai-va-lo-trinh.md](07-trang-thai-va-lo-trinh.md)
