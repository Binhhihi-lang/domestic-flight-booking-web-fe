# 05 — Phân quyền & quy tắc nghiệp vụ

> **Nguồn:** `be/docs/Permission_Matrix_v2.1.md` (15/10/2026), DB seed `V2__seed_rbac.sql` + `V10`, Use Case Specification Phase 1 v2.3 / Phase 2–3 v2.1.
> **Nguyên tắc:** khi tài liệu lệch nhau, lấy **Permission Matrix v2.1 + DB seed** làm chuẩn.

---

## 1. Actor

| Actor | Loại | Quyền hạn chính | Giới hạn |
|---|---|---|---|
| **GUEST** | End user | Xem master data public, khuyến mãi, tin tức; tìm chuyến | Không tạo booking |
| **CUSTOMER** | End user | Đặt vé, hành khách, chọn ghế, thanh toán, voucher của mình, e-ticket, hồ sơ | Chỉ thấy dữ liệu của chính mình |
| **STAFF** | Nội bộ | Quản lý chuyến bay, giá, tồn ghế; xem booking; dashboard vận hành | Không quản lý User/RBAC/master data; không sửa payment |
| **ADMIN** | Nội bộ | Toàn quyền hệ thống | Không thanh toán hộ, không gán ghế hộ |
| **PAYMENT GATEWAY** | Bên ngoài | Xử lý giao dịch và trả kết quả | — |

Role là **cố định**: CUSTOMER / STAFF / ADMIN. MVP không tạo/sửa/xóa role.

---

## 2. Ma trận quyền theo module

| Module | GUEST | CUSTOMER | STAFF | ADMIN |
|---|---|---|---|---|
| Auth / Profile | Register, Login, Password reset | + Logout, Change password, Profile self | Như CUSTOMER | Như CUSTOMER |
| User & RBAC | — | — | — | `USER_*`, `ROLE_READ` |
| Airline / City / Airport | Read + detail | Read | Read + detail | Full CRUD |
| Aircraft / Seat config | — | — | Read + detail | Full CRUD |
| Promotion | Read + detail | Read | Read | Full CRUD |
| Voucher | — | Read, detail, apply, **claim** | Read, detail | Full CRUD |
| News / News category | Read + detail (bài PUBLISHED) | Read | Read | Full CRUD + publish/unpublish |
| Flight (Phase 2) | Search, read, detail | Search, read | Full đọc/ghi/activate | Full |
| Fare class / Fare rule / Baggage | — | — | Full CRUD | Full |
| Flight fare / Seat inventory | — | Read + detail | Read + ghi/manage | Full |
| Booking / Payment / E-ticket (Phase 3) | — | Tạo, đọc self, hủy self, payment, e-ticket self | Xem booking, dashboard vận hành | + Xem booking, dashboard |

**Key đáng chú ý:**

- `VOUCHER_CLAIM` — mới ở v2.1, cấp cho CUSTOMER.
- `FLIGHT_DETAIL_READ` — tên đúng là vậy, **không phải** `FLIGHT_READ_DETAIL`.
- `VOUCHER_READ` cấp cho cả CUSTOMER và STAFF.
- STAFF có toàn quyền Fare / FareRule / Baggage / FlightFare / Seat Inventory (BR-FLIGHT-01).

---

## 3. Use case theo Phase

### Phase 1 — Nền tảng & dữ liệu nền (58 UC)

| Nhóm | Mã UC |
|---|---|
| Auth | AUTH-01…06: đăng ký, đăng nhập, đăng xuất, quên/đặt lại mật khẩu, đổi mật khẩu, xác thực/phân quyền |
| Profile | PRO-01, PRO-02 |
| User / RBAC | USR-01…05, RBAC-01…02 |
| Master data | AIR-01…05, CITY-01…05, APT-01…05, AC-01…05, SEAT-01 |
| Promotion / Voucher | PROMO-01…05, VOU-01…05 |
| News | NEWS-01…07, NEWS-CAT-01…05 |

### Phase 2 — Chuyến bay & giá vé (31 UC)

| Nhóm | Mã UC |
|---|---|
| Chuyến bay | FLT-01…07: danh sách, chi tiết, tạo, sửa, đổi trạng thái, mở/đóng bán, xóa mềm |
| Tìm chuyến | SRCH-01 (một chiều), SRCH-02 (khứ hồi) |
| Hạng vé / quy định / hành lý | FCL-01…05, FRL-01…05, BAG-01…05 |
| Giá bán | FFR-01…02 |
| Tồn ghế | INV-01…03: sinh tồn ghế, xem sơ đồ, khóa/mở ghế |

Hai trạng thái chuyến độc lập:

- **Operational:** `DRAFT`, `SCHEDULED`, `BOARDING`, `DELAYED`, `DEPARTED`, `ARRIVED`, `CANCELLED`.
- **Sales:** `OPEN`, `CLOSED`.

### Phase 3 — Booking (15 UC)

| Nhóm | Mã UC |
|---|---|
| Hành khách | PSG-01…03 |
| Ghế | SEAT-01 (chọn + giữ ghế) |
| Booking | BK-01…05: tạo `PENDING_PAYMENT`, xem danh sách/chi tiết, hủy (không hoàn tiền) |
| Thanh toán | PAY-01…03: tạo, thử lại, xem chi tiết |
| Vé & thông báo | TKT-01, NOTI-01 (chưa triển khai), DASH-01 |

---

## 4. Quy tắc nghiệp vụ quan trọng

| Mã | Quy tắc |
|---|---|
| **BR-RBAC-03** | MVP không tạo/sửa/activate/xóa Role |
| **BR-RBAC-04** | ADMIN **không xóa được** tài khoản role ADMIN, kể cả chính mình; phải hạ role trước |
| **BR-NEWS-01…03** | Bài có thể gán nhiều chuyên mục; được tạo DRAFT chưa có chuyên mục; **phải có ít nhất 1 chuyên mục trước khi Publish**; GUEST chỉ thấy PUBLISHED |
| **BR-FLIGHT-01** | STAFF tạo/sửa/activate chuyến bay nhưng không quản lý Airline/Airport/Aircraft |
| **BR-BOOKING-01/02** | GUEST không tạo booking; CUSTOMER đặt cho mình hoặc hành khách khác |
| **BR-DATA-01…04** | Update ≠ Activate/Deactivate; ưu tiên xóa mềm; `isActive` cho trạng thái dùng, `isDeleted/deletedAt` cho xóa mềm; entity có vòng đời phức tạp (Booking, Payment, News, Flight) dùng Status thay vì isActive |
| Voucher | ASSIGNED do ADMIN tặng, khách không tự nhận; chỉ GLOBAL vào kho và được claim |
| Hoàn tiền | Không tự động; khách liên hệ đại lý. **Ví voucher vẫn tồn tại**, khác ví tiền đã bỏ |

---

## 5. Khác biệt v2.1 so với v2.0

1. Bỏ `WALLET_READ_SELF` và toàn bộ module Wallet.
2. Đưa `VOUCHER_CLAIM` vào bảng chính.
3. Đổi `FLIGHT_READ_DETAIL` → `FLIGHT_DETAIL_READ`.
4. Bổ sung **BR-RBAC-04**.
5. Ghi rõ `PASSWORD_RESET` là public.
6. Đồng bộ matrix với DB seed, sửa 11 nhóm lệch (STAFF được đọc Airline/City/Airport/Aircraft/Seat/News; CUSTOMER + STAFF đọc Voucher; STAFF toàn quyền Fare/Baggage/Inventory; CUSTOMER đọc FlightFare/Seat Inventory).

---

## 6. Cảnh báo lệch tài liệu

Use Case Phase 1/2 cũ hơn Matrix v2.1 ở vài chỗ:

- FLT-03 ghi “Create Flight chỉ ADMIN” — matrix cho **STAFF**.
- NEWS-CAT-01…02 ghi ADMIN-only — matrix cho **mọi role đọc**.
- VOU-01/05 ghi CUSTOMER-only — matrix cho **STAFF đọc**.

→ Khi code, ưu tiên **Matrix v2.1 + DB seed**.

---

## 7. Áp dụng ở FE

- Guard route: `authGuard` (cần đăng nhập), `staffGuard` (STAFF/ADMIN), `adminGuard` (ADMIN).
- Ẩn/hiện nút theo quyền lấy từ token (claim `permissions`), không chỉ ẩn theo role.
- Khu admin: STAFF vào được nhưng không thấy menu quản trị dữ liệu nền; ADMIN thấy đầy đủ.
- 401 → xóa phiên, về đăng nhập; 403 → thông báo không có quyền.

---

## Đọc tiếp

- API và mã lỗi: [04-api.md](04-api.md)
- Màn hình theo khu vực: [06-man-hinh-va-luong.md](06-man-hinh-va-luong.md)
