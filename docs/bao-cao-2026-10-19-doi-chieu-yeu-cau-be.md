# BÁO CÁO PHÂN TÍCH — ĐỐI CHIẾU YÊU CẦU BE (CẬP NHẬT SAU KHI MERGE)

**Ngày báo cáo:** 19/10/2026 (cập nhật lần 2 — sau khi BE merge `binh` → `da`)
**Nhánh:** `da` cả 2 repo
**Nguồn yêu cầu:** `domestic-flight-booking-web-fe/docs/plans/2026-10-17-yeu-cau-chinh-sua-tu-be.md`
**Căn cứ:** API Design v0.4 · DB v0.5 · Permission Matrix v2.1

---

## 0. Kết luận trong một câu

> **BE giờ đã làm ĐỦ và ĐÚNG toàn bộ danh sách (commit `1f52d30`).**
> **FE mới xong ~80%, còn 1 lỗi build + 5 việc thiếu, và 2 chỗ lệch hợp đồng với BE thật.**

---

## 1. Git hiện trạng (đã xác minh)

| Repo | HEAD | Ghi chú |
|---|---|---|
| FE | `29f34b3` | sạch |
| BE | **`1f52d30`** `feat(api): nâng API v0.4 — tách admin/public, bỏ /v1 và ví, thêm bulk + color_hex` | sạch; `binh` cùng commit, `dev` còn cũ |

---

## 2. BE — ĐÃ XONG TOÀN BỘ ✅

| # | Yêu cầu | Bằng chứng |
|---|---|---|
| 1 | Bỏ `/v1` | **0 chỗ** `/api/v1` còn trong `src/main/java`. Auth `/api/auth`, Profile `/api/profile` |
| 2 | Tách `/admin` `/public` | 6 controller public mới: `AirlinePublicController`, `CityPublicController`, `AirportPublicController`, `PromotionPublicController`, `NewsPublicController`, `NewsCategoryPublicController`. Admin: `Aircraft`, `Airline`, `Airport`, `City`, `News`, `NewsCategory`, `Promotion`, `SeatType`, `User`, `Voucher` đều `/api/admin/*`. `RbacController` → `/api/admin` + `/roles` `/permissions` |
| 3 | Bỏ ví | Xóa `Wallet`, `WalletTransaction`, `WalletTransactionType`, 2 repository, code trong `DataInitializer` + `UserService`. Migration **V13** drop 2 bảng + quyền `WALLET_READ_SELF` |
| 4 | Bỏ hoàn tiền | `Booking.java` đã bỏ 2 cột; V13 drop cột |
| 5 | `GET /public/news/{id}` chặn DRAFT | `NewsService.getPublicById()` ném 1004 nếu ≠ PUBLISHED |
| 6 | `GET /public/news-categories` | `NewsCategoryPublicController` trả mảng trần `NewsCategoryBrief` |
| 7 | Bulk | `BaseCrudController.bulkToggle/bulkDelete` + `BulkRequest(ids, status)` + `BulkResult(succeeded, failed)`; `BaseCrudService` có `perRecord` chạy từng bản ghi trong transaction riêng. News override `applyBulkStatus` nhận PUBLISHED/UNPUBLISHED |
| 9 | `color_hex` | Migration **V12** + CHECK regex; `SeatType` entity/DTO/mapper; `SeatTypeRequest` validate `^#[0-9A-Fa-f]{6}$` |
| — | Security | `SecurityConfig` đã đổi: `GET /api/public/**` permitAll; `/api/auth/**` permitAll (trừ logout/change-password); còn lại authenticated |

**Test:** 57/57 pass (11 test class, gồm `NewsServiceTest` 4, `SeatTypeServiceTest` 5, `UserServiceTest` 3 mới).

**Index codebase memory:** đã re-index BE → 668 nodes / 1113 edges, khớp `head_sha = 1f52d30`.

---

## 3. FE — 🔴 CHẶN BUILD (ưu tiên số 1)

`ng build` **FAIL**, 4 lỗi TS. Nguyên nhân: model `Voucher` đã đổi sang `status`, mock chưa theo kịp.

| File | Dòng | Lỗi | Sửa |
|---|---|---|---|
| `core/mock/data/catalog.mock.ts` | 248 | `is_active: true` không có trong `Voucher` | → `status: 'ACTIVE'` |
| `core/mock/mock-registry.ts` | 528 | `v.is_active` | → `v.status === 'ACTIVE'` |
| `core/mock/mock-registry.ts` | 529 | `v.is_deleted` | bỏ điều kiện (mock lọc xóa mềm riêng) |
| `core/mock/mock-registry.ts` | 561 | `v.is_deleted` | bỏ điều kiện |
| `core/mock/mock-registry.spec.ts` | 331 | `v.is_active` trên `VoucherStoreItem` | → `v.status === 'ACTIVE'` (nếu model có) hoặc bỏ assertion |

---

## 4. FE — 🟡 CÒN THIẾU

| # | Việc | Hiện trạng |
|---|---|---|
| 3 | Xóa màn Ví | **Còn 5 nhóm chỗ**: `app.routes.ts:92`, `account-layout.ts:37`, `account-bookings.ts:36,143` (`WalletTx`+`walletHistory`), `account-bookings.html:2-7,88-110`, `account-bookings.css` (9 rule `.wallet*`), `auth.mock.ts:47` (`WALLET_READ_SELF`) |
| 4 | Bỏ hoàn tiền + khối liên hệ đại lý | **FE chưa có màn chi tiết booking** — chỉ có danh sách tĩnh. Chưa thể làm. |
| 5b | Xử lý `1004` ở chi tiết tin | Chưa phân biệt mã; chỉ `error: () => navigate('/news')` chung |
| 6 | Dropdown chuyên mục dùng public endpoint | **Chưa.** `news-list.ts:70` vẫn suy từ bài. `PublicNewsCategoryService` **không nơi nào inject** |
| 7b | Mock bulk cho 9 module còn lại | **Chỉ có `airlines`**. 9 module khác sẽ rơi ra mạng thật khi `useMock=true` |
| 9c | Sơ đồ ghế tô theo `color_hex` | **Chưa.** `seat-grid.ts:58` vẫn tô theo `seat_class` |
| 10 | `/api/v1` còn sót | `mock-registry.ts:263,266` + **14 chỗ trong `mock-registry.spec.ts`** |

---

## 5. 🔴 LỆCH HỢP ĐỒNG FE ↔ BE THẬT (mới phát hiện)

### 5.1 `/voucher-store` — FE mong `PageData`, BE trả **mảng trần**

| | |
|---|---|
| FE (`catalog.service.ts` `UserVoucherService.store`) | `ApiResponse<PageData<VoucherStoreItem>>` → đọc `res.data.items` |
| BE (`VoucherCustomerController.voucherStore`) | `ApiResponse<List<VoucherStoreItem>>` |
| Hệ quả | `res.data.items` = `undefined` → **màn Kho voucher trắng** khi gọi BE thật |

→ Sửa FE: đổi kiểu trả về thành `ApiResponse<VoucherStoreItem[]>` và dùng `res.data` trực tiếp. (Hoặc BE đổi sang `PageData` — nhưng BE đã khớp tài liệu "mảng trần", nên sửa FE.)

### 5.2 `my-vouchers` — `voucher` là object rút gọn, không phải `Voucher` đầy đủ

| | |
|---|---|
| FE `UserVoucher.voucher` | `Voucher` (đầy đủ: có `status`, `scopes`, `claim_limit`…) |
| BE `MyVoucherResponse.VoucherBrief` | chỉ `id, voucher_code, voucher_name, description, discount_type, discount_value, min_order_amount, applicable_trip_type, start_date, end_date` |
| Hệ quả | Các field FE đọc được thì vẫn có; nhưng **type sai** — dễ vỡ nếu sau này đọc `v.voucher.status` |
| Thêm | BE có `discount_amount`? **Không** — FE `UserVoucher.discount_amount` đang đọc field **BE không trả** (`my-vouchers.html:100-101`) |

→ Sửa FE: tách `UserVoucherBrief` thay vì dùng `Voucher`; bỏ hoặc ẩn `discount_amount`.

### 5.3 `PublicNewsCategoryService` trả `NewsCategoryBrief` — khớp ✅

### 5.4 Bulk response — khớp ✅

FE `BulkResult` ↔ BE `BulkResult(succeeded, failed[{id, code, message}])` — đúng.

### 5.5 Public list shape — khớp ✅

BE public list đều trả `PageData<...>` (không phải mảng trần) trừ `news-categories`. FE `PublicCrudService.list()` dùng `PageData` — đúng.

### 5.6 `is_active` vs `status` — **đã rõ**

- **Request body** (POST/PUT promotion/voucher): BE nhận **`is_active` boolean** (`PromotionRequest.isActive`, `VoucherRequest.isActive`). FE gửi `is_active` — **ĐÚNG**.
- **Bulk**: BE nhận **`status`** string. FE gửi `status` — **ĐÚNG**.
- **Response**: BE trả `status` string cho mọi module master data. FE model đã dùng `status` — **ĐÚNG**.

→ **Tài liệu v0.4 viết "API luôn dùng `status`" là chưa chính xác với code BE** — request promotion/voucher vẫn dùng `is_active`. Không cần sửa code, chỉ cần ghi chú lại.

---

## 6. Thứ tự làm đề xuất

### Cụm 1 — FE build xanh (~15 phút)
1. Sửa 5 chỗ `is_active`/`is_deleted` trên `Voucher` (mục 3).
2. Đổi 2 path `/api/v1/voucher-store`, `/api/v1/my-vouchers` → `/api/...`.
3. Đổi 14 path trong `mock-registry.spec.ts`.
4. Sửa `UserVoucherService.store` theo mục 5.1 (mảng trần).
5. `ng build` + `ng test` phải xanh.

### Cụm 2 — FE xóa ví + nốt phần nhỏ
6. Xóa route/menu/mock/CSS/HTML ví + `WALLET_READ_SELF`.
7. `news-list.ts` → `PublicNewsCategoryService`.
8. `news-detail.ts` xử lý `1004`.
9. `seat-grid.ts` tô theo `color_hex` (fallback `seat_class`).
10. Mock bulk cho 9 module còn lại.
11. Tách `UserVoucherBrief` + bỏ `discount_amount` (mục 5.2).

### Cụm 3 — Đồng bộ tài liệu
12. Ghi chú `is_active` (request) vs `status` (response/bulk) vào API v0.4.

---

## 7. Câu hỏi cần bạn trả lời

1. **Email + SĐT đại lý** cho khối liên hệ hoàn tiền — dùng giá trị nào? (Chưa làm được mục 4.)
2. **Bulk cho `news`** — nhãn nút "Xuất bản"/"Ngừng xuất bản" thay vì "Kích hoạt"/"Ngừng"?

---

## 8. Kiểm chứng đã chạy

| Lệnh | Kết quả |
|---|---|
| `ng build` (FE) | ❌ **FAIL** — 4 lỗi TS |
| `ng test` (FE) | ❌ Không chạy được (build fail trước) |
| `mvnw test` (BE) | ✅ **57/57 pass** |
| `grep "/api/v1"` FE `src/` | còn **16 chỗ** |
| `grep "/api/v1"` BE `src/main/java` | **0 chỗ** ✅ |
| `grep wallet` BE `src/main/java` | **0 chỗ** ✅ |
| Index BE | ✅ 668 nodes / 1113 edges @ `1f52d30` |
| Index FE | ✅ 174 nodes / 250 edges @ `29f34b3` |
