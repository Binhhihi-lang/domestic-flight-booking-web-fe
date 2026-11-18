# 04 — Hợp đồng API

> **Nguồn:** `be/docs/API_Design_Website_Dat_Ve_May_Bay_v0.4.md` (15/10/2026), đối chiếu 22 controller thật trong `be/src/main/java/.../controller` (13/11/2026).
> **Nguyên tắc:** code BE là chuẩn cuối cùng; tài liệu chỉ mô tả bề mặt. Chỗ lệch được ghi ở mục 9.

---

## 1. Quy ước chung

| Mục | Giá trị |
|---|---|
| Base path | `/api` — **không còn `/v1`**; gọi `/api/v1/**` sẽ 401 |
| Vùng public | `/api/public/**` — GET, `permitAll` |
| Vùng quản trị | `/api/admin/**` — đã đăng nhập + `@PreAuthorize` |
| Vùng self-service | `/api/profile`, `/api/voucher-store`, `/api/my-vouchers`, `/api/bookings…` |
| JSON | **snake_case** toàn cục |
| Auth | `Authorization: Bearer <access_token>`; JWT chứa claim `permissions` |
| Envelope | `{ code, message, data }`; HTTP status phản ánh đúng lỗi |
| Ngày | `YYYY-MM-DD`; thời điểm `timestamptz` UTC |
| Tiền | `number` VND |
| GUEST | Không phải role; là trạng thái chưa đăng nhập |

---

## 2. Mã lỗi

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `1000` | 200/201 | Thành công |
| `1001` | 400 | Dữ liệu không hợp lệ; `data` là mảng `{field, message}` |
| `1002` | 401 | Chưa đăng nhập / token hết hạn |
| `1003` | 403 | Không có quyền |
| `1004` | 404 | Không tìm thấy tài nguyên |
| `1005` | 409 | Trùng dữ liệu (mã, email…) |
| `1006` | 409 | Vi phạm quy tắc nghiệp vụ |
| `1007` | 400 | Sai email/mật khẩu |
| `1008` | 403 | Tài khoản bị khóa |
| `9999` | 500 | Lỗi hệ thống |

---

## 3. Phân trang, lọc, sắp xếp

- `page` bắt đầu từ **1**; `size` mặc định **20**, tối đa **100**.
- `keyword` tìm theo trường của từng module.
- `sort=<field>,asc|desc`.
- Danh sách trả `PageData`:

```json
{
  "items": [],
  "pagination": { "page": 1, "size": 20, "total_items": 0, "total_pages": 1 }
}
```

- Ngoại lệ trả **mảng trần**: `GET /admin/roles`, `GET /admin/permissions`, `GET /public/news-categories`, `GET /voucher-store`.

---

## 4. Thao tác hàng loạt (bulk)

Chỉ ở `/api/admin/**`, tối đa **100 id** mỗi lần:

| Method + path | Body | Kết quả |
|---|---|---|
| `PATCH /admin/{resource}/bulk` | `{ ids, status }` | Đổi trạng thái từng bản ghi |
| `DELETE /admin/{resource}/bulk` | `{ ids }` | Xóa mềm từng bản ghi |

Response luôn là kết quả **từng phần**:

```json
{
  "succeeded": [1, 2],
  "failed": [{ "id": 3, "code": 1006, "message": "Không thể xóa" }]
}
```

News dùng `status` riêng: `PUBLISHED` / `UNPUBLISHED`.

---

## 5. Endpoint theo module

### 5.1 Auth & Profile

| Method + path | Quyền | Chức năng |
|---|---|---|
| `POST /auth/register` | public | Đăng ký |
| `POST /auth/login` | public | Đăng nhập, trả access + refresh token |
| `POST /auth/logout` | `LOGOUT` | Đăng xuất, đưa access token vào blacklist |
| `POST /auth/refresh` | public | Xoay vòng refresh token |
| `POST /auth/password-reset/request` | public | Gửi yêu cầu đặt lại; trả `reset_token` |
| `POST /auth/password-reset/confirm` | public | Đặt mật khẩu mới bằng token |
| `POST /auth/change-password` | `PASSWORD_CHANGE_SELF` | Đổi mật khẩu |
| `GET /profile` | `PROFILE_READ_SELF` | Xem hồ sơ |
| `PUT /profile` | `PROFILE_UPDATE_SELF` | Sửa hồ sơ |
| `POST /profile/avatar` | `PROFILE_UPDATE_SELF` | Upload avatar (Cloudinary) |

### 5.2 Người dùng & RBAC (ADMIN)

| Method + path | Quyền | Chức năng |
|---|---|---|
| `GET /admin/users` | `USER_READ` | Danh sách |
| `GET /admin/users/{id}` | `USER_READ_DETAIL` | Chi tiết |
| `POST /admin/users` | `USER_CREATE` | Tạo; `roles` bắt buộc, chỉ CUSTOMER/STAFF/ADMIN |
| `PUT /admin/users/{id}` | `USER_UPDATE` | Sửa |
| `DELETE /admin/users/{id}` | `USER_DELETE` | Xóa mềm; không xóa ADMIN |
| `POST /admin/users/{id}/reset-password` | `USER_UPDATE` | Trả `temporary_password` |
| `GET /admin/roles` | `ROLE_READ` | Mảng trần role |
| `GET /admin/permissions` | `ROLE_READ` | Mảng trần permission |

> `UserController` **không** kế thừa `BaseCrudController`: không có `/active`, không có bulk.

### 5.3 Master data

Mỗi module (airline, city, airport, aircraft, seat-type) có cùng khuôn:

| Method + path | Quyền | Chức năng |
|---|---|---|
| `GET /public/{module}` | public | Danh sách đang hoạt động |
| `GET /public/{module}/{id}` | public | Chi tiết |
| `GET /admin/{module}` | `{MODULE}_READ` | Danh sách quản trị |
| `GET /admin/{module}/{id}` | `{MODULE}_READ_DETAIL` | Chi tiết |
| `POST /admin/{module}` | `{MODULE}_CREATE` | Tạo |
| `PUT /admin/{module}/{id}` | `{MODULE}_UPDATE` | Sửa |
| `PUT /admin/{module}/{id}/active` | `{MODULE}_UPDATE` | Bật/tắt |
| `DELETE /admin/{module}/{id}` | `{MODULE}_DELETE` | Xóa mềm |
| `PATCH/DELETE /admin/{module}/bulk` | `{MODULE}_UPDATE`/`DELETE` | Bulk |

Riêng:

- **Seat type** dùng quyền `SEAT_CONFIG_*`.
- **Promotion/Voucher (định nghĩa)** dùng `PROMOTION_*`, `VOUCHER_*`; có thêm `POST /admin/vouchers/{id}/assign`.
- **News** có `POST /admin/news/{id}/publish` (`NEWS_PUBLISH`) và `/unpublish` (`NEWS_UNPUBLISH`); `PUT /{id}/active` vẫn tồn tại.
- **News category** dùng `NEWS_CATEGORY_*`.

### 5.4 Sơ đồ ghế & phụ thu chọn ghế

| Method + path | Quyền | Chức năng |
|---|---|---|
| `GET /admin/aircrafts/{aircraftId}/seat-map` | `SEAT_CONFIG_READ_DETAIL` | Xem sơ đồ |
| `PUT /admin/aircrafts/{aircraftId}/seat-map` | `SEAT_CONFIG_UPDATE` | Lưu toàn bộ ghế |
| `GET/POST /admin/seat-types` | `SEAT_CONFIG_*` | Loại ghế, có `surcharge` |
| `GET/PUT/DELETE /admin/seat-types/{id}` | `SEAT_CONFIG_*` | Chi tiết / sửa / xóa |

> **Đã bỏ (V16, 14/11/2026):** toàn bộ `/admin/seat-class-surcharges` và bảng `seat_class_surcharges`.
> Phụ thu nằm ở `seat_types.surcharge`; `flight_seats.seat_surcharge` ghi đè theo chuyến.
> Đổi khoang là đổi hạng vé — không có phụ thu đổi khoang.

Quy tắc seat map:

- `PUT` gửi **toàn bộ** ghế; tổng số ghế phải bằng `aircrafts.seat_capacity`.
- `seat_type` phải đang ACTIVE.
- `aircraft` response có `aisle_after` (`"C"`, `"C,E"` hoặc null).
- `seat_type` có `color_hex`.

### 5.5 Voucher của khách

| Method + path | Quyền | Chức năng |
|---|---|---|
| `GET /voucher-store` | `VOUCHER_READ` | Kho voucher GLOBAL đang hiệu lực; **mảng trần** |
| `POST /vouchers/{id}/claim` | `VOUCHER_CLAIM` | Nhận voucher vào ví |
| `GET /my-vouchers` | `VOUCHER_READ` | Ví của tôi; `PageData` |
| `GET /my-vouchers/{id}` | `VOUCHER_READ_DETAIL` | Chi tiết voucher trong ví |

### 5.6 Public content

| Method + path | Chức năng |
|---|---|
| `GET /public/promotions`, `/{id}` | Khuyến mãi đang hiệu lực |
| `GET /public/news`, `/{id}` | Tin PUBLISHED; bài khác trả `1004` |
| `GET /public/news-categories` | Mảng trần `{id, name}` |

---

## 6. Quy ước trạng thái

| Ngữ cảnh | Giá trị |
|---|---|
| Master data / User — response & bulk | `ACTIVE` / `INACTIVE` |
| Promotion / Voucher — request & filter | `is_active` boolean |
| Promotion / Voucher — response & bulk | `status` string |
| News | `DRAFT` / `PUBLISHED` / `UNPUBLISHED` |
| News — bulk | `PUBLISHED` / `UNPUBLISHED` |
| Flight (Phase 2) | `DRAFT` / `SCHEDULED` / `BOARDING` / `DELAYED` / `DEPARTED` / `ARRIVED` / `CANCELLED` + `OPEN` / `CLOSED` |

---

## 7. Điểm FE bắt buộc nhớ

1. `GET /voucher-store` trả **mảng trần** `ApiResponse<VoucherStoreItem[]>`; item có `claimed`, `claim_limit`, `claimed_count`, **không có `status`**.
2. `GET /my-vouchers` trả `PageData<MyVoucherResponse>`; `voucher` là **`VoucherBrief`** (id, code, name, description, discount_type, discount_value, min_order_amount, applicable_trip_type, start/end_date) — **không** có `status/scopes/claim_limit`; **không có `discount_amount`**.
3. Bài news không `PUBLISHED` trả **`1004`** (không phải `1003`).
4. `POST /auth/password-reset/request` luôn 200 và trả `data.reset_token` để test.
5. Admin tạo user: `roles` bắt buộc; reset password trả `temporary_password`.
6. Filter promotion/voucher dùng `?is_active=true`; request POST/PUT dùng `is_active` boolean.
7. Seat map PUT gửi toàn bộ ghế; tổng khớp `seat_capacity`.
8. Mock FE phải trả **đúng HTTP status** để lỗi đi vào `error` như backend thật.
9. **Lệch hợp đồng còn tồn tại trên nhánh `feature/wireframe-khach-hang`:**
   - `UserVoucherService.store()` vẫn khai `ApiResponse<PageData<VoucherStoreItem>>`, trong khi BE trả **mảng trần**.
   - `UserVoucher.voucher` vẫn dùng `Voucher` đầy đủ và còn đọc `discount_amount`; BE trả `VoucherBrief` và **không có** `discount_amount`.
   - Mock hiện cũng trả `PageData` cho `/voucher-store`. Sửa cả service + mock khi nối BE thật.

---

## 8. Phase 2–3 — tên endpoint đã khóa (chưa có code)

### Phase 2 — Flight & Fare

- Public: `GET /api/public/flights/search`.
- Admin: `/api/admin/flights`, `/api/admin/fare-classes`, `/api/admin/flight-fares`, `/api/admin/fare-rules`, `/api/admin/baggage-options`, `/api/admin/flights/{id}/seat-inventory`.

### Phase 3 — Booking & Payment

- Khách: `/api/bookings`, `/api/bookings/{id}/cancel`, `/api/bookings/{id}/passengers`, `/api/bookings/{id}/seats/hold`, `/api/bookings/{id}/baggages`, `/api/bookings/{id}/voucher`, `/api/bookings/{id}/payments`, `/api/bookings/{id}/e-tickets`.
- Payment: `/api/payments/{id}`, `/api/payments/callback`.
- Admin: `/api/admin/bookings`, `/api/admin/dashboard*`.

> Repo BE **chưa có controller** cho các path này. FE phải mock.

---

## 9. Tài liệu v0.4 đã cũ so với code

| # | Tài liệu ghi | Code thực tế |
|---|---|---|
| 1 | User có bulk + `/active` | Không có; `UserController` không kế thừa BaseCrud |
| 2 | Không nhắc phụ thu loại ghế | `SeatTypeRequest/Response` có `surcharge` (V16); `/seat-class-surcharges` đã bỏ |
| 3 | Không nhắc `aircrafts.aisle_after` | Có trong request/response + migration V15 |
| 4 | Aircraft chỉ CRUD | Có thêm `/active` + bulk theo khuôn chung |
| 5 | `1006` là 409/422 | Code trả **409** |
| 6 | News chỉ `PUT` + publish/unpublish | Code có **cả** `PUT /{id}/active` và 2 endpoint publish/unpublish |
| 7 | Không nói shape `voucher-store` | Trả **mảng trần** |

---

## 10. Mock layer FE

- Bật bằng `environment.useMock = true`.
- `MockRegistry` giữ một nguồn dữ liệu duy nhất cho admin + public.
- Route mock khớp đúng path service: `/api/voucher-store`, `/api/my-vouchers`, `/api/vouchers/{id}/claim`.
- Lỗi trả `HttpErrorResponse` để component xử lý ở `error`.

---

## Đọc tiếp

- Phân quyền chi tiết: [05-phan-quyen.md](05-phan-quyen.md)
- Dữ liệu & bảng: [03-co-so-du-lieu.md](03-co-so-du-lieu.md)
