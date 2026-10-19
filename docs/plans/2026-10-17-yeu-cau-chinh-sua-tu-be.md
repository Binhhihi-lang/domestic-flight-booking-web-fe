# YÊU CẦU CHỈNH SỬA — FRONTEND (từ BE)

**Ngày:** 17/10/2026
**Nhánh:** `binh` (cả BE và FE)
**Căn cứ:** API Design **v0.4** · Database Design **v0.5** · Permission Matrix **v2.1** (đều nằm ở repo `domestic-flight-booking-web-backend/docs/`)
**Mức độ:** 🔴 **Breaking change** — có thay đổi path và xóa chức năng

> **Vị trí tài liệu:** file này nằm ở **repo FE** (`docs/plans/`) vì nội dung là việc FE cần làm. Các tài liệu căn cứ (API/DB/Permission Matrix) nằm ở **repo BE** — xem cùng nhánh `binh`.

---

## 0. Tóm tắt nhanh (đọc mục này trước)

| # | Việc cần làm | Mức | Ảnh hưởng |
|---|---|---|---|
| 1 | **Bỏ `/v1`** khỏi `apiBaseUrl` | 🔴 Cao | Mọi request — sửa 1 chỗ |
| 2 | **Tách `/admin` và `/public`** trong path từng service | 🔴 Cao | `catalog.service.ts` (11 dòng) + `airline.service.ts` |
| 3 | **Xóa màn Ví** và mọi code liên quan | 🟡 TB | `app.routes.ts`, `account-layout.ts`, `account-bookings.*` |
| 4 | **Bỏ phần hoàn tiền** ở màn chi tiết booking, thêm khối liên hệ đại lý | 🟡 TB | Màn chi tiết booking |
| 5 | **Đổi `GET /news/{id}` → `/public/news/{id}`** và chặn DRAFT | 🟢 Thấp | Màn chi tiết tin |
| 6 | **Dropdown chuyên mục tin** dùng endpoint public mới | 🟢 Thấp | Trang Tin tức |
| 7 | **Bulk action: chuyển sang gọi endpoint bulk + gửi `status`** | 🟡 TB | `shared/crud/crud-page.ts` |
| 8 | **Bỏ field hoàn tiền** khỏi model booking | 🟢 Thấp | Model + form |
| 9 | **Loại ghế: thêm `color_hex`** | 🟢 Thấp | Màn Loại ghế + Sơ đồ ghế |
| 10 | **Sửa mock registry** (`mock-registry.ts` + spec) | 🔴 Cao | Toàn bộ mock path — dễ quên |

> ⚠️ **Mục 10 là bẫy dễ quên nhất.** `mock-registry.ts` đăng ký path **cứng** dạng `/api/v1/airlines` (khoảng 20 chỗ). Nếu chỉ sửa `apiBaseUrl` mà không sửa registry, `useMock = true` sẽ **trả 404 giả** cho mọi request — FE tưởng API hỏng.

---

## 1. 🔴 Bỏ `/v1` khỏi base URL

### Hiện tại
```ts
// src/environments/environment.ts
apiBaseUrl: 'http://localhost:8080/api/v1',
```

### Cần sửa
```ts
apiBaseUrl: 'http://localhost:8080/api',
```

### Vì sao
Dự án chưa có client bên ngoài phụ thuộc version. Ranh giới quản trị/khách đã thể hiện rõ bằng `/admin` và `/public`, nên segment `/v1` là thừa. Xem API v0.4 mục 1.1.

### Kéo theo
- Toàn bộ test mock đang dùng `/api/v1/...` phải đổi → `/api/...`:
  `src/app/core/mock/mock-registry.spec.ts` (khoảng 10 chỗ).
- Mock registry phải khớp path mới, nếu không `useMock = true` sẽ trả 404 giả.

---

## 2. 🔴 Tách vùng `/admin` và `/public`

### Nguyên tắc
- **Màn quản trị** (ADMIN/STAFF) → `/api/admin/...`
- **Dữ liệu khách xem** (trang chủ, danh sách công khai) → `/api/public/...`
- **Self-service của khách** (profile, voucher của tôi, booking của tôi) → **giữ nguyên** (chỉ bỏ `/v1`)

### Bảng đối chiếu đầy đủ

| Module | Path cũ | Path mới | Dùng ở màn nào |
|---|---|---|---|
| Auth | `/api/v1/auth/**` | `/api/auth/**` | Login/Register |
| Profile | `/api/v1/profile` | `/api/profile` | Hồ sơ cá nhân |
| **User** | `/api/v1/users` | `/api/admin/users` | Quản lý người dùng |
| **Role** | `/api/v1/roles` | `/api/admin/roles` | Vai trò |
| **Permission** | `/api/v1/permissions` | `/api/admin/permissions` | Quyền |
| **Airline** | `/api/v1/airlines` | `/api/public/airlines` (đọc)<br>`/api/admin/airlines` (quản trị) | Trang chủ vs Quản lý hãng |
| **City** | `/api/v1/cities` | `/api/public/cities` · `/api/admin/cities` | Trang chủ vs Quản lý TP |
| **Airport** | `/api/v1/airports` | `/api/public/airports` · `/api/admin/airports` | Tìm chuyến vs Quản lý SB |
| **Aircraft** | `/api/v1/aircrafts` | `/api/admin/aircrafts` | Quản lý máy bay |
| **Seat Type** | `/api/v1/seat-types` | `/api/admin/seat-types` | Loại ghế |
| **Seat Map** | `/api/v1/aircrafts/{id}/seat-map` | `/api/admin/aircrafts/{id}/seat-map` | Sơ đồ ghế |
| **Promotion** | `/api/v1/promotions` | `/api/public/promotions` · `/api/admin/promotions` | Trang chủ vs Quản lý KM |
| **Voucher (định nghĩa)** | `/api/v1/vouchers` | `/api/admin/vouchers` | Quản lý voucher |
| Voucher (khách) | `/api/v1/voucher-store` | `/api/voucher-store` | Kho voucher |
| Voucher (khách) | `/api/v1/my-vouchers` | `/api/my-vouchers` | Voucher của tôi |
| Voucher (khách) | `/api/v1/vouchers/{id}/claim` | `/api/vouchers/{id}/claim` | Nút Nhận |
| **News** | `/api/v1/news` | `/api/public/news` · `/api/admin/news` | Trang Tin tức vs Quản lý tin |
| **News Category** | `/api/v1/news-categories` | `/api/public/news-categories` · `/api/admin/news-categories` | Lọc danh mục vs Quản lý CM |
| **Bulk** | `/api/v1/{resource}/bulk` | `/api/admin/{resource}/bulk` | Mọi màn danh sách |

### Gợi ý sửa code
FE đang gom hết service master data vào **một file** `src/app/core/services/catalog.service.ts`, mỗi lớp con gọi `super('<path>')`. Đây là **điểm sửa duy nhất** cho hầu hết module:

| Dòng | Hiện tại | Sửa thành | Ghi chú |
|---|---|---|---|
| `catalog.service.ts:34` | `super('cities')` | `super('admin/cities')` | Màn quản trị TP |
| `catalog.service.ts:41` | `super('airports')` | `super('admin/airports')` | Màn quản trị SB |
| `catalog.service.ts:48` | `super('promotions')` | `super('admin/promotions')` | Màn quản trị KM |
| `catalog.service.ts:55` | `super('vouchers')` | `super('admin/vouchers')` | Quản lý voucher |
| `catalog.service.ts:62` | `super('aircrafts')` | `super('admin/aircrafts')` | |
| `catalog.service.ts:69` | `super('seat-types')` | `super('admin/seat-types')` | |
| `catalog.service.ts:76` | `super('news')` | `super('admin/news')` | Màn quản trị tin |
| `catalog.service.ts:83` | `super('news-categories')` | `super('admin/news-categories')` | |
| `catalog.service.ts:101` | `super('roles')` | `super('admin/roles')` | |
| `catalog.service.ts:108` | `super('permissions')` | `super('admin/permissions')` | |
| `catalog.service.ts:137` | `super('users')` | `super('admin/users')` | |
| `airline.service.ts:14` | `super('airlines')` | `super('admin/airlines')` | |

> **Cần BỔ SUNG service cho vùng public.** Hiện `catalog.service.ts` chỉ có service cho màn quản trị. Các trang khách (trang chủ, tìm chuyến, tin tức) cần service trỏ `/api/public/...`. Có thể làm theo một trong hai cách:
>
> **Cách 1 — tách lớp riêng (rõ ràng hơn):**
> ```ts
> /** Dữ liệu công khai cho khách — path /api/public/* */
> @Injectable({ providedIn: 'root' })
> export class PublicAirlineService extends BaseCrudService<Airline> {
>   constructor() { super('public/airlines'); }
> }
> // tương tự: PublicCityService, PublicAirportService,
> //           PublicPromotionService, PublicNewsService,
> //           PublicNewsCategoryService
> ```
>
> **Cách 2 — một service nhận `scope`:** thêm tham số vào constructor `BaseCrudService` để lớp con chọn `'admin'` hoặc `'public'`. Gọn hơn nhưng dễ nhầm khi gọi.
>
> **Đề xuất:** cách 1 — vì mỗi vùng có hình dạng response khác nhau (public chỉ trả bản ghi ACTIVE, không có filter `status`), tách lớp giúp tránh gọi nhầm.

> **Lưu ý:** `airline.service.ts` tách riêng khỏi `catalog.service.ts` (module mẫu). Nếu sau này gộp lại thì sửa 1 chỗ.

---

## 3. 🟡 Xóa màn Ví và mọi code liên quan

### Quyết định nghiệp vụ (15/10/2026)
Hệ thống **không còn ví khách hàng** và **không tự động hoàn tiền**. Khách muốn hoàn tiền **liên hệ đại lý** qua email + số điện thoại trên website.

### Đã bỏ ở BE
- Bảng `wallets`, `wallet_transactions` — migration **V13**
- Cột `bookings.applied_refund_percent`, `bookings.refund_amount`
- Quyền `WALLET_READ_SELF`
- Endpoint `GET /api/wallet`, `GET /api/wallet/transactions`

### FE cần xóa
Đã kiểm tra code FE (`nhánh binh`, 17/10/2026) — **chưa có service ví thật**, chỉ có 2 thứ:

| File | Nội dung hiện tại | Cần làm |
|---|---|---|
| `src/app/app.routes.ts:93` | `...comingSoonAccount('wallet', 'Ví của tôi')` | Xóa route này |
| `src/app/features/client/layout/account-layout.ts:36` | Menu `{ path: '/account/wallet', label: 'Ví của tôi', icon: 'account_balance_wallet' }` | Xóa dòng menu |
| `src/app/features/client/pages/account/account-bookings.ts:36,143` | `interface WalletTx` + mock `walletHistory` (dữ liệu giả) | Xóa interface + mock |
| `src/app/features/client/pages/account/account-bookings.html` | Khối hiển thị lịch sử ví (nếu có) | Xóa khối |
| `src/app/features/client/pages/account/account-bookings.css` | Style của khối ví | Xóa style |

> **Không cần xóa** `wallet.service.ts` hay model `Wallet` — **chưa từng tồn tại** ở FE. Toàn bộ phần ví hiện là màn "coming soon" + mock.

> **Kiểm tra lại bằng lệnh:** `grep -rn "wallet\|Wallet" src/app` — sau khi xóa phải **không còn kết quả** (trừ comment lịch sử nếu muốn giữ).

---

## 4. 🟡 Màn chi tiết booking — bỏ hoàn tiền, thêm liên hệ đại lý

### Bỏ
- Mọi hiển thị "số tiền hoàn", "hoàn về ví", "% hoàn đã áp dụng".
- Field `applied_refund_percent`, `refund_amount` khỏi model `Booking`.
- Nếu có nút "Hủy và hoàn tiền" → đổi nhãn thành **"Hủy vé"**.

### Thêm
Khối thông báo sau khi hủy vé thành công (và trong chi tiết booking đã hủy):

```
┌─────────────────────────────────────────────────────┐
│  Đã hủy vé thành công                               │
│                                                     │
│  Để được hoàn tiền, vui lòng liên hệ đại lý:        │
│  📧  hotro@tenmiencuaban.vn                          │
│  📞  0909 xxx xxx                                    │
│                                                     │
│  Vui lòng cung cấp mã booking: ABC123               │
└─────────────────────────────────────────────────────┘
```

> **Cần Bình xác nhận:** email và số điện thoại thật của đại lý. Hiện tài liệu đang dùng placeholder. Nếu chưa có, FE tạm để chỗ trống có ghi chú `TODO`.

### Chính sách hoàn vẫn hiển thị (tham khảo)
BE vẫn trả `fare_rules` (is_refundable, refund_percent, refund_min_hours_before_departure) trong chi tiết booking. FE **được phép hiển thị** để khách biết chính sách, nhưng phải ghi rõ là **tham khảo**:

```
Vé hoàn 80% nếu hủy trước 24 giờ.
→ Liên hệ đại lý để được hoàn tiền.
```

**Không** tự tính số tiền hoàn ở FE.

---

## 5. 🟢 Màn chi tiết tin — dùng endpoint public + chặn DRAFT

### Đổi path
```
GET /api/v1/news/{id}   →   GET /api/public/news/{id}
```

### Quy tắc mới ở BE
`GET /api/public/news/{id}` **chỉ trả bài `PUBLISHED`**. Bài `DRAFT`/`UNPUBLISHED` → trả `1004` (không tìm thấy).

### FE cần
- **Giữ nguyên** lớp chặn client hiện có (`news-detail.ts` kiểm tra `status !== 'PUBLISHED'`) — vẫn tốt cho UX.
- **Bổ sung** xử lý mã `1004` ở màn chi tiết tin: hiện thông báo "Bài viết không tồn tại" và điều hướng về danh sách.
- **Không** còn cần logic "nếu là admin thì cho xem DRAFT" ở màn **public**. Màn quản trị tin dùng path `/api/admin/news/{id}` riêng.

---

## 6. 🟢 Dropdown chuyên mục tin — dùng endpoint public mới

### Endpoint mới
```
GET /api/public/news-categories
```

Trả **mảng trần** (không phân trang), chỉ `id` + `name`, chỉ danh mục `is_active = true`:

```json
{
  "code": 1000,
  "message": "Success",
  "data": [
    { "id": 2, "name": "Khuyến mãi" },
    { "id": 5, "name": "Cẩm nang du lịch" }
  ]
}
```

### Thay đổi
- **Bỏ** cách hiện tại: suy danh mục từ dữ liệu `GET /public/news` trả về.
- **Dùng** endpoint mới để lấy danh sách chuyên mục đầy đủ (kể cả chuyên mục chưa có bài).

> **Vì sao:** cách suy từ news chỉ liệt kê được chuyên mục **có bài đã đăng** — thiếu chuyên mục rỗng, và không phải cách làm sạch.

---

## 7. 🟡 Bulk action — chuyển sang gọi endpoint bulk + dùng `status`

### Hiện trạng code FE (`shared/crud/crud-page.ts`)

```ts
// dòng 204-214
protected bulkSetActive(isActive: boolean): void {
  this.runBulk(
    ids,
    (id) => this.service().update(id, { is_active: isActive } as unknown as P),  // ← gửi is_active
  );
}
```

Comment ở dòng 199–202 ghi rõ: *"Gọi TUẦN TỰ từng bản ghi qua `update()` thay vì endpoint bulk. Vì sao: API v0.2 hiện CHƯA có endpoint bulk… Khi BE có, chỉ cần đổi thân hàm này thành một lời gọi."*

**Nay BE đã có endpoint bulk** (API v0.4 mục 2.10) → đổi thân hàm.

### Hai việc phải sửa

**a) Thêm method bulk vào `BaseCrudService`** (hiện chưa có):

```ts
// src/app/core/services/base-crud.service.ts
bulkSetStatus(status: string): Observable<ApiResponse<BulkResult>> {
  return this.http.patch<ApiResponse<BulkResult>>(
    `${this.baseUrl}/bulk`,
    { ids: [...this.selectedIds], status },
  );
}

bulkDelete(ids: number[]): Observable<ApiResponse<BulkResult>> {
  return this.http.delete<ApiResponse<BulkResult>>(
    `${this.baseUrl}/bulk`,
    { body: { ids } },   // DELETE có body — phải dùng option `body`
  );
}
```

> ⚠️ **`HttpClient.delete` không nhận body qua tham số thứ 2.** Phải dùng `{ body: { ids } }` trong options, nếu không Spring sẽ không nhận được danh sách id.

**b) Sửa `crud-page.ts`** — thay vòng lặp bằng một lời gọi:

```ts
protected bulkSetActive(isActive: boolean): void {
  const ids = [...this.selectedIds()];
  if (ids.length === 0) return;

  this.service().bulkSetStatus(isActive ? 'ACTIVE' : 'INACTIVE').subscribe({...});
}
```

### Field gửi lên: `status`, không phải `is_active`

| Module | Body gửi |
|---|---|
| airlines, cities, airports, aircrafts, seat-types, promotions, vouchers, news-categories, users | `{ "ids": [...], "status": "ACTIVE" \| "INACTIVE" }` |
| news | `{ "ids": [...], "status": "PUBLISHED" \| "UNPUBLISHED" }` |
| Xóa mềm (mọi module) | `{ "ids": [...] }` |

> **Vì sao đổi:** API master data **luôn dùng `status`** dạng chuỗi. DB lưu `is_active` boolean nhưng API chuẩn hóa thành `status`. Code FE hiện gửi `is_active` → BE sẽ **bỏ qua field lạ** (không lỗi, nhưng **không có tác dụng**) — đây là bug tiềm ẩn.

### Response cần xử lý
```json
{
  "code": 1000,
  "message": "Đã cập nhật 13/15 bản ghi",
  "data": {
    "succeeded": [1, 2, 3, 5, 6, 7],
    "failed": [
      { "id": 4, "code": 1006, "message": "Hãng còn chuyến bay đang hoạt động" }
    ]
  }
}
```

FE cần hiện thông báo **kết quả từng phần** — không chỉ "thành công/thất bại". Ví dụ: *"Đã cập nhật 13/15. 2 bản ghi bị chặn: id 4 (hãng còn chuyến bay), id 15 (ADMIN cuối cùng)."*

> **Vì sao không all-or-nothing:** nếu chọn 15 bản ghi mà 1 bản ghi vi phạm ràng buộc, all-or-nothing sẽ chặn cả 15 — trải nghiệm tệ. Xem API v0.4 mục 2.10.

---

## 8. 🟢 Bỏ field hoàn tiền khỏi model booking

Xóa khỏi interface TypeScript (nếu có):

```ts
// XÓA
applied_refund_percent: number | null;
refund_amount: number | null;
```

Giữ lại:
```ts
cancelled_at: string | null;
cancel_reason: string | null;
```

---

## 9. 🟢 Loại ghế — thêm `color_hex`

### Thay đổi ở BE
`seat_types` có thêm cột `color_hex VARCHAR(7) NULL` (migration **V12**). API trả/nhận field này.

### FE cần

**a) Form Loại ghế** — thêm ô nhập màu:
```json
{
  "seat_type_code": "ECO_WIN",
  "seat_type_name": "Phổ thông - cửa sổ",
  "seat_class": "ECONOMY",
  "color_hex": "#0194F3",
  "status": "ACTIVE"
}
```

- Ô nhập hex + bộ chọn màu (color picker).
- Validate client: `null` hoặc đúng `^#[0-9A-Fa-f]{6}$`.
- Cho phép để trống (`null`) → BE/FE lùi về màu mặc định theo `seat_class`.

**b) Bảng Loại ghế** — thêm cột hiển thị màu (ô vuông màu + mã hex).

**c) Lưới Sơ đồ ghế** — đổi nguồn màu:
```
Trước: tô màu theo seat_class (hard-code)
Sau:   tô theo seat_type.color_hex
       nếu color_hex = null → lùi về màu mặc định theo seat_class
```

**Lý do:** DB cho phép nhiều loại ghế cùng một `seat_class` (5 loại ECONOMY: `ECO`, `ECO_WIN`, `ECO_AIS`, `PREM_ECO`, `EXIT`). Tô theo hạng thì không phân biệt được "Phổ thông" với "Phổ thông ưu tiên" hay "Ghế thoát hiểm".

---

## 10. 🔴 Sửa mock registry — dễ quên nhất

### Vấn đề
`src/app/core/mock/mock-registry.ts` đăng ký path **cứng** dạng chuỗi, không dùng biến. Ví dụ (dòng 192–199):

```ts
if (path === '/api/v1/airlines' && m === 'GET') { ... }
if (path === '/api/v1/airlines' && m === 'POST') { ... }
const idMatch = path.match(/^\/api\/v1\/airlines\/(\d+)$/);
```

Có **~20 chỗ** như vậy (airlines, auth, và các path khác).

### Hệ quả nếu chỉ sửa `apiBaseUrl`
`pathOf()` cắt origin nhưng **giữ nguyên `/api/v1/...`**. Khi đổi `apiBaseUrl` thành `/api`, request sẽ là `/api/airlines` — **không khớp** `/api/v1/airlines` → `resolve()` trả `undefined` → **request rơi ra mạng thật** → gọi BE (có thể chưa chạy) → FE báo lỗi mạng. Rất khó đoán nguyên nhân vì mock "im lặng".

### Cần sửa
1. Thay **tất cả** `/api/v1/` → `/api/` trong `mock-registry.ts`.
2. Thay path theo vùng mới:
   - Mock cho màn quản trị → `/api/admin/...`
   - Mock cho trang khách → `/api/public/...`
3. Sửa `mock-registry.spec.ts` (khoảng 10 chỗ) cho khớp.

### Nên làm luôn: gom path vào hằng số
Để lần sau đổi path chỉ sửa một chỗ:

```ts
const API = {
  admin:  (r: string) => `/api/admin/${r}`,
  public: (r: string) => `/api/public/${r}`,
  root:   (r: string) => `/api/${r}`,
};

if (path === API.admin('airlines') && m === 'GET') { ... }
const idMatch = path.match(new RegExp(`^${API.admin('airlines')}/(\\d+)$`));
```

### Kiểm tra
```bash
grep -rn "/api/v1" src/app/core/mock/
# phải không còn kết quả
```

---

## 11. Checklist nghiệm thu

**Path & hạ tầng**
- [ ] `environment.apiBaseUrl` = `http://localhost:8080/api`
- [ ] Không còn chuỗi `/api/v1` trong `src/` (trừ comment lịch sử)
- [ ] `mock-registry.ts`: **không còn** `/api/v1`, path khớp vùng `/admin` · `/public`
- [ ] `mock-registry.spec.ts` pass
- [ ] Mỗi service dùng đúng path `/admin` hoặc `/public`; có service public riêng cho trang khách

**Chức năng đã bỏ**
- [ ] Không còn màn Ví, menu Ví, mock `WalletTx` / `walletHistory`
- [ ] Model Booking không còn `applied_refund_percent` / `refund_amount`
- [ ] Màn chi tiết booking không hiển thị số tiền hoàn; có khối liên hệ đại lý

**Chức năng mới/sửa**
- [ ] Màn chi tiết tin dùng `/api/public/news/{id}`, xử lý `1004`
- [ ] Dropdown chuyên mục dùng `/api/public/news-categories`
- [ ] Bulk gọi **endpoint bulk** (không vòng lặp `update()`), gửi `status`
- [ ] Bulk hiển thị **kết quả từng phần** (`succeeded` / `failed`)
- [ ] Loại ghế có ô màu; sơ đồ ghế tô theo `color_hex`

**Kiểm thử**
- [ ] `npm test` pass
- [ ] Bật `useMock = true` → mọi màn hoạt động (không rơi ra mạng thật)
- [ ] Tắt `useMock = false` → gọi BE thật thành công

---

## 12. Thứ tự làm đề xuất

| Bước | Việc | Vì sao thứ tự này |
|---|---|---|
| 1 | Bỏ `/v1` ở `apiBaseUrl` **+ `mock-registry.ts` + spec** | Phải làm cùng lúc, nếu không mock vỡ và khó debug |
| 2 | Tách `/admin` `/public` (service + mock) | Phụ thuộc bước 1; ảnh hưởng nhiều service nhất |
| 3 | Xóa ví + bỏ field hoàn tiền | Độc lập, xóa dần |
| 4 | Màn chi tiết booking + liên hệ đại lý | Phụ thuộc bước 3 |
| 5 | News: endpoint public + DRAFT + dropdown | Độc lập |
| 6 | Bulk: thêm method vào `BaseCrudService` + sửa `crud-page.ts` | Độc lập |
| 7 | `color_hex` | Độc lập, làm cuối |

---

## 13. Câu hỏi cần FE trả lời

1. **Email + số điện thoại đại lý** dùng trong khối liên hệ hoàn tiền — dùng giá trị nào? (Hiện tài liệu để placeholder.)
2. **Module dùng cả 2 vùng** (airline, city, airport, promotion, news) — FE muốn **2 service riêng** hay **1 service nhận `scope`**? Tôi đề xuất **2 service riêng** (mục 2) vì hình dạng response khác nhau.
3. **Màn chi tiết booking** — có cần hiển thị chính sách hoàn từ `fare_rules` (dạng tham khảo) hay ẩn hoàn toàn? Tôi đề xuất **hiển thị kèm ghi chú "liên hệ đại lý"**.
4. **Bulk cho `news`** — nút trên thanh hành động nên là "Xuất bản" / "Ngừng xuất bản" thay vì "Kích hoạt" / "Ngừng"? Vì news dùng `status` xuất bản, không phải bật/tắt.

---

## 14. Ghi chú kỹ thuật quan trọng

**a) `HttpClient.delete` không nhận body qua tham số thứ 2.**
```ts
// SAI — Spring không nhận được ids
this.http.delete(url, { ids });

// ĐÚNG
this.http.delete(url, { body: { ids } });
```

**b) `@PreAuthorize` không chạy cho path `permitAll`.**
Đây là lý do BE tách `/public` và `/admin` — quyền nay kiểm tra ở **path prefix**, không phụ thuộc service. Xem API v0.4 mục 4.9.

**c) Endpoint public chỉ trả bản ghi đang hoạt động.**
`/api/public/airlines` **không** có tham số `status` — luôn chỉ trả `ACTIVE`. Nếu FE cần xem cả `INACTIVE` thì phải gọi `/api/admin/airlines` (cần token ADMIN/STAFF).

**d) Voucher của khách giữ nguyên vùng common.**
`/api/voucher-store`, `/api/my-vouchers`, `/api/vouchers/{id}/claim` **không** nằm dưới `/admin` lẫn `/public` — đây là self-service của khách.

---

*Hết tài liệu. Cập nhật lại tài liệu này nếu có quyết định mới.*
