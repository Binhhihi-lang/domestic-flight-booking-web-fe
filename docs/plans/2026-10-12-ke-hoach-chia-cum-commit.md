# Kế hoạch commit theo cụm — đợt 12/10/2026

**Repo:** `domestic-flight-booking-web-fe`
**Commit gần nhất:** `bec9cba` — *feat: mockup design giao diện login, register, dashboard, home, account-booking, account-layout, brand-logo, flight-result, flight-search-card*
**Trạng thái làm việc:** 69 mục thay đổi chưa commit (32 file sửa + 37 file/thư mục mới)
**Kiểm chứng trước khi commit:** `ng build` ✅ (330.95 kB / 89.78 kB) · `ng test` ✅ 22/22 pass

---

## Vì sao phải chia cụm

Đợt này gộp nhiều loại thay đổi khác nhau về bản chất:

1. **Đổi cơ chế import toàn dự án** (path alias) — động vào 46 file, phần lớn không liên quan tới tính năng nào.
2. **Tách template/style ra file riêng** — đổi hình thức 12 component, không đổi hành vi.
3. **Thêm hạ tầng mới** (lớp CRUD dùng chung, mock tổng quát).
4. **Thêm 8 màn CRUD + 2 form nghiệp vụ + khối tin tức trang chủ** — tính năng thật.

Nếu commit gộp một lần thì: không review được, `git bisect` vô dụng, và khi cần revert phần alias cũng phải revert lẫn tính năng. Chia cụm để mỗi commit **một ý định, tự đứng được**.

---

## Thứ tự commit đề xuất

> Thứ tự quan trọng: commit hạ tầng trước, tính năng sau — để mỗi commit sau đó build được trên nền commit trước.

### Cụm 1 — Hạ tầng: path alias

**Vì sao đứng đầu:** mọi file sau đều import qua alias, nên phải có trước.

| Loại | File |
|---|---|
| Sửa | `tsconfig.json` — thêm `paths` (`@core/*`, `@shared/*`, `@features/*`, `@env/*`), KHÔNG dùng `baseUrl` (TS 6 deprecate) |
| Sửa | 46 file `.ts` — đổi import tương đối `../../` sang alias |

Trong 46 file đó, **14 file CHỈ đổi import** (không có thay đổi nào khác):
```
src/app/app.config.ts
src/app/core/guards/auth.guard.ts
src/app/core/interceptors/auth.interceptor.ts
src/app/core/mock/data/auth.mock.ts
src/app/core/mock/mock-registry.spec.ts
src/app/core/mock/mock-response.ts
src/app/core/mock/mock.interceptor.ts
src/app/core/services/airline.service.ts
src/app/core/services/base-crud.service.spec.ts
src/app/core/services/base-crud.service.ts
src/app/features/admin/pages/airlines/airlines.integration.spec.ts
src/app/shared/components/auth-aside/auth-aside.ts
src/app/shared/components/empty-state/empty-state.spec.ts
src/app/shared/components/empty-state/empty-state.ts
```
31 file còn lại vừa đổi import vừa có thay đổi thật → **nằm ở cụm của chúng**, không tách riêng.

**Lưu ý khi commit:** `templateUrl`/`styleUrl` **phải** giữ đường dẫn tương đối (`./x.html`). Script đổi alias từng đổi nhầm cả 13 chỗ này và làm build đổ (`NG2008`). Đã sửa lại.

**Đề xuất message:**
```
refactor: dùng path alias @core/@shared/@features thay cho đường dẫn tương đối

Đếm ../ theo độ sâu thư mục dễ sai khi thêm màn ở tầng sâu (đã sai 3 lần).
Alias làm import không phụ thuộc vị trí file.

- tsconfig.json: thêm paths, không dùng baseUrl (TS 6 deprecate)
- 14 file chỉ đổi import, không đổi hành vi
- templateUrl/styleUrl giữ tương đối vì Angular resolve theo vị trí file
```

---

### Cụm 2 — Tách template/style khỏi file .ts

**Vì sao tách cụm:** đây là thay đổi **hình thức**, không đổi hành vi. Tách ra thì commit sau (tính năng) đọc diff sạch, không lẫn 5000 dòng HTML/CSS.

| File mới (.html + .css) | File .ts sửa |
|---|---|
| `client-layout.html/.css` | `client-layout.ts` |
| `account-layout.html/.css` | `account-layout.ts` |
| `home.html/.css` | `home.ts` |
| `flight-results.html/.css` | `flight-results.ts` |
| `login.html/.css` | `login.ts` |
| `register.html/.css` | `register.ts` |
| `account-bookings.html/.css` | `account-bookings.ts` |
| `admin-layout.html/.css` | `admin-layout.ts` |
| `dashboard.html/.css` | `dashboard.ts` |
| `style-guide.html/.css` | `style-guide.ts` |
| `flight-search-card.html/.css` | `flight-search-card.ts` |

Mỗi `.ts` chỉ đổi: bỏ `template:`/`styles:`, thêm `templateUrl`/`styleUrl`.

**Kết quả đo được:** `home.ts` 734 → 144 dòng · `admin-layout.ts` 835 → 219 dòng.

**Đề xuất message:**
```
refactor: tách template và style ra file riêng cho 11 component

Chủ dự án yêu cầu không gộp HTML/CSS trong file .ts (trừ component nhỏ).
Các file này 250–900 dòng, gộp cả ba loại vào một file thì khó đọc và khó sửa.

home.ts 734→144 dòng, admin-layout.ts 835→219 dòng.
Không đổi hành vi — build và 22 test vẫn xanh.
```

---

### Cụm 3 — Hạ tầng CRUD dùng chung + mock tổng quát

**Vì sao tách:** đây là **khuôn** mà 8 màn sau dùng lại. Commit riêng để khi màn nào lỗi thì biết lỗi ở khuôn hay ở màn.

| File mới | Vai trò |
|---|---|
| `shared/crud/crud-config.ts` | Kiểu khai báo: cột, trường, bộ lọc |
| `shared/crud/crud-page.ts/.html/.css` | Màn CRUD 3 chế độ: danh sách / chi tiết / form |
| `shared/crud/crud-routes.ts` | Sinh 4 route cho mỗi module |
| `core/mock/mock-resource.ts` | Tài nguyên CRUD giả tổng quát |
| `core/models/location.model.ts` | City, Airport |
| `core/models/promotion.model.ts` | Promotion, Voucher, Scope |
| `core/models/fleet-news.model.ts` | Aircraft, SeatType, News, NewsCategory |
| `core/services/catalog.service.ts` | 8 service CRUD |
| `core/mock/data/locations.mock.ts` | 12 thành phố + 12 sân bay |
| `core/mock/data/catalog.mock.ts` | Máy bay, loại ghế, khuyến mãi, voucher, tin tức |

| File sửa | Thay đổi |
|---|---|
| `core/mock/mock-registry.ts` | Nối 8 tài nguyên mới qua `MockResource` |
| `app.routes.ts` | Dùng `crudRoutes()` sinh route cho 8 module |

**Điểm nghiệp vụ quan trọng trong cụm này** (khớp API v0.2 + DB v0.4):
- `MockResource` lọc `is_deleted = false` ở mọi truy vấn (BR-LIST-04)
- UNIQUE chỉ tính bản ghi chưa xóa mềm (partial unique index của v0.4)
- Validate nghiệp vụ: `end_date >= start_date`, `discount_value > 0`, PERCENT ≤ 100, `seat_capacity > 0`

**Đề xuất message:**
```
feat: lớp CRUD dùng chung + mock tổng quát cho master data

8 module master data cùng một khuôn màn hình, chỉ khác cột và trường.
Viết một lần rồi mỗi module chỉ khai CrudConfig (~60 dòng) thay vì lặp
~300 dòng component tám lần.

- CrudPage: 3 chế độ danh sách/chi tiết/form, hàng bấm được để xem chi tiết
- crudRoutes(): sinh 4 route mỗi module (list/new/detail/edit)
- MockResource: tài nguyên CRUD giả tổng quát, lọc is_deleted theo BR-LIST-04
- 3 model + 2 bộ dữ liệu giả + 8 service theo API v0.2
```

---

### Cụm 4 — Tám màn quản trị master data

**Vì sao tách khỏi cụm 3:** khuôn ở cụm 3 đã đứng riêng; cụm này là **nội dung** từng màn.

| Màn | File | Ghi chú nghiệp vụ |
|---|---|---|
| Thành phố | `admin/pages/cities/cities.ts` | 4 trường |
| Sân bay | `admin/pages/airports/airports.ts` | dropdown thành phố nạp từ API + toạ độ |
| Máy bay | `admin/pages/aircrafts/aircrafts.ts` | sức chứa, hãng sản xuất |
| Loại ghế | `admin/pages/seat-types/seat-types.ts` | 3 hạng ghế |
| Khuyến mãi | `admin/pages/promotions/promotions.ts` | danh sách |
| Voucher | `admin/pages/vouchers/vouchers.ts` | danh sách, cột lượt nhận |
| Tin tức | `admin/pages/news/news.ts` | cột ảnh, trạng thái Nháp/Đã đăng |
| Danh mục tin | `admin/pages/news-categories/news-categories.ts` | |

| File sửa | Thay đổi |
|---|---|
| `admin/pages/airlines/airlines.ts` | **Viết lại** dùng `CrudPage` — trước đây dùng bảng + form Material nên giao diện lệch với các màn khác |
| `admin/pages/airlines/airline-form-dialog.ts` | **Xoá** — form giờ là trang riêng |
| `admin/layout/admin-layout.ts/.html/.css` | Thêm mục sidebar mới |

**Đề xuất message:**
```
feat: 8 màn quản trị master data (thành phố, sân bay, máy bay, loại ghế, khuyến mãi, voucher, tin tức, danh mục tin)

Mỗi màn khai CrudConfig rồi dùng chung CrudPage. Hàng trong bảng bấm
được để mở trang chi tiết; form là trang riêng theo tài liệu UI (F4/F5).

- Airlines viết lại theo cùng khuôn (trước dùng Material nên lệch giao diện)
- Xoá airline-form-dialog.ts, thay bằng trang form chung
- Sidebar thêm mục cho các màn mới
```

---

### Cụm 5 — Ảnh: hiển thị + nhập từ URL hoặc từ máy

**Vì sao tách:** đây là **tính năng mới** xuyên nhiều màn, không thuộc riêng màn nào.

| File | Thay đổi |
|---|---|
| `shared/crud/crud-page.ts/.html/.css` | Thêm `image` vào cột; loại trường `image` (xem trước + dán URL + chọn file từ máy); xử lý ảnh lỗi |
| `shared/crud/crud-config.ts` | Thêm `image?: (row) => string \| null` và `CrudFieldType = 'image'` |
| `admin/pages/airlines/airlines.ts` | Cột Logo + trường `logo_url` kiểu `image` |
| `admin/pages/news/news.ts` | Cột Ảnh + trường `thumbnail_url` kiểu `image` |
| `core/mock/data/airlines.mock.ts` | 4 logo thật |
| `core/mock/data/catalog.mock.ts` | ảnh cho bài viết |
| `core/models/fleet-news.model.ts` | Thêm `thumbnail_url` (kèm ghi chú chờ BE thêm cột) |

**Quyết định thiết kế đáng chú ý:**
- Ảnh tải lỗi (URL hỏng, chặn hotlink) → chuyển sang khung nền có icon, **không bao giờ hiện icon ảnh vỡ** của trình duyệt. Đây là lỗi thật gặp khi test: logo Wikimedia trả 400.
- Ảnh từ máy đọc thành data URL (base64), giới hạn 2 MB vì base64 phình ~33% và đi kèm payload JSON. Khi BE có endpoint upload thì chỉ đổi chỗ đọc file.

**Đề xuất message:**
```
feat: hiển thị và nhập ảnh cho hãng bay và tin tức

Ô ảnh cho nhập bằng hai cách: dán URL hoặc chọn file từ máy (đọc thành
data URL, xem trước ngay, giới hạn 2 MB).

Ảnh lỗi hoặc chưa có thì hiện khung nền có icon thay vì icon ảnh vỡ của
trình duyệt — gặp thật khi test vì logo Wikimedia chặn hotlink.

DB v0.4 chưa có cột ảnh cho news_items; đã ghi đề xuất migration cho BE.
```

---

### Cụm 6 — Form nghiệp vụ khuyến mãi & voucher

**Vì sao tách khỏi cụm 4:** hai form này **không dùng** `CrudPage` — chúng có bảng con (phạm vi áp dụng, loại trừ chuyến bay) mà form trường phẳng không biểu diễn được.

| File mới | Nội dung |
|---|---|
| `admin/pages/promotions/promotion-form.ts/.html/.css` | Form khuyến mãi đầy đủ nghiệp vụ |
| `admin/pages/vouchers/voucher-form.ts/.html/.css` | Form voucher đầy đủ nghiệp vụ |

**Nghiệp vụ đã thể hiện đúng DB v0.4:**

| Điểm | Khuyến mãi | Voucher |
|---|---|---|
| Phạm vi | `promotion_scopes` — 4 loại: hãng / hạng vé / tuyến / chuyến | `voucher_scopes` — giống |
| Loại trừ | `promotion_excluded_flights` | `voucher_excluded_flights` |
| Trần giảm tính trên | **mỗi dòng vé** | **cả booking** |
| Cách phát | — | `distribution_type`: GLOBAL (khách tự nhận) / ASSIGNED (tặng riêng) |
| Giới hạn lượt | — | `claim_limit` đếm lượt **nhận**, chỉ áp GLOBAL |

Quy tắc đã cài trong form: không có dòng phạm vi = áp **tất cả** chuyến bay; nhiều dòng là điều kiện **HOẶC**; tuyến **có hướng** (muốn hai chiều phải thêm dòng đảo); **loại trừ luôn thắng phạm vi**; trần giảm chỉ bật khi chọn PERCENT.

**Đề xuất message:**
```
feat: form khuyến mãi và voucher theo nghiệp vụ DB v0.4

Hai form này không dùng CrudPage chung vì có bảng con: phạm vi áp dụng
(4 loại) và loại trừ chuyến bay — form trường phẳng không biểu diễn được.

Thể hiện đúng khác biệt giữa hai loại:
- Trần giảm: khuyến mãi tính mỗi dòng vé, voucher tính cả booking
- Voucher có cách phát hành (kho chung / tặng riêng) và giới hạn lượt nhận
- Phạm vi rỗng = áp tất cả; nhiều dòng = HOẶC; loại trừ thắng phạm vi
```

---

### Cụm 7 — Trang chủ: khối tin tức

**Vì sao tách riêng:** một tính năng nhỏ, độc lập với phần quản trị.

| File | Thay đổi |
|---|---|
| `client/pages/home/home.ts/.html/.css` | Thêm khối "Tin tức & cẩm nang": 3 bài mới nhất, ảnh, ngày, mô tả trích từ nội dung, link "Xem tất cả" |

**Chi tiết:** nạp qua `NewsService`, **tự lọc `status = PUBLISHED`** vì mock trả cả bản nháp (Backend thật đã lọc sẵn cho GUEST theo BR-LIST-04, nhưng lọc ở FE để hai chế độ hành xử giống nhau). Có trạng thái đang tải (skeleton) và rỗng.

**Đề xuất message:**
```
feat: khối tin tức trên trang chủ

Thêm khối "Tin tức & cẩm nang" hiển thị 3 bài mới nhất kèm ảnh, ngày
đăng và mô tả trích từ nội dung.

Tự lọc status = PUBLISHED để chế độ mock và API thật hành xử giống nhau.
Có skeleton khi đang tải và trạng thái rỗng.
```

---

## Bảng tóm tắt 7 cụm

| # | Cụm | Loại | File mới | File sửa |
|---|---|---|---|---|
| 1 | Path alias | Hạ tầng | 0 | `tsconfig.json` + 14 file chỉ đổi import |
| 2 | Tách template/style | Hình thức | 22 (.html/.css) | 11 |
| 3 | Lớp CRUD + mock tổng quát | Hạ tầng | 10 | 2 |
| 4 | 8 màn master data | Tính năng | 8 | 3 (+1 xoá) |
| 5 | Ảnh | Tính năng | 0 | 7 |
| 6 | Form khuyến mãi/voucher | Tính năng | 6 | 1 |
| 7 | Khối tin tức trang chủ | Tính năng | 0 | 3 |

**Tổng:** 46 file mới + 32 file sửa + 1 file xoá.

---

## Cách đẩy từng cụm

Vì các cụm **dùng chung file** ở vài chỗ (ví dụ `crud-page.ts` có ở cụm 3, 5; `home.ts` có ở cụm 2, 7), không thể `git add` theo cụm một cách máy móc. Hai cách:

**Cách A — tách theo file, chấp nhận cụm gộp nhẹ (khuyến nghị):**
Gộp cụm 3+4+5 làm một (đều là "hệ thống CRUD"), và cụm 2+7 làm một (đều là "trang chủ + tách file"). Còn lại 5 commit, mỗi commit `git add` theo đường dẫn là được ngay, không cần `git add -p`.

**Cách B — tách chính xác 7 cụm:**
Cần `git add -p` cho các file dùng chung, hoặc commit lần lượt: làm cụm 1 → commit → cụm 2 → commit… (cách này cần hoàn tác tạm phần sau, tốn công).

Tôi đề xuất **cách A**: 5 commit, mỗi commit vẫn một ý định rõ ràng và tự đứng được.

| Commit | Nội dung | `git add` |
|---|---|---|
| 1 | Path alias | `tsconfig.json` + 14 file chỉ đổi import |
| 2 | Tách template/style + khối tin tức trang chủ | các cặp `.html`/`.css` mới + `home.ts` |
| 3 | Hệ thống CRUD (khuôn + mock + 8 màn + ảnh) | `shared/crud/`, `core/models/`, `core/services/catalog.service.ts`, `core/mock/`, `admin/pages/` |
| 4 | Form khuyến mãi & voucher | `admin/pages/promotions/promotion-form.*`, `admin/pages/vouchers/voucher-form.*` |
| 5 | Route + layout admin | `app.routes.ts`, `admin/layout/`, `app.config.ts` |

---

## Kiểm chứng trước mỗi lần commit

```bash
cd D:/ChuyenDeTT/domestic-flight-booking-web-fe

npx ng build                  # phải không có ERROR
npx ng test --watch=false     # phải 22/22 pass
git status --short            # xem lại đúng file của cụm
```

---

## Việc kế tiếp (sau khi commit xong đợt này)

### Còn lại của Phase 1 — quản trị

| # | Màn | Route | Ghi chú |
|---|---|---|---|
| 1 | Vai trò | `/admin/roles` | Chỉ đọc — BR-RBAC-03 cấm CRUD role |
| 2 | Quyền | `/admin/permissions` | Chỉ đọc, có lọc theo `module` |
| 3 | Người dùng | `/admin/users` | CRUD + đổi role + toggle trạng thái + reset mật khẩu. Có ràng buộc: ADMIN không tự hạ quyền nếu là ADMIN cuối cùng đang ACTIVE → `1006` |
| 4 | Sơ đồ ghế | `/admin/seat-configurations` | **Màn phức tạp nhất Phase 1**: nhập theo khối (hàng từ–đến, cột, loại ghế) → sinh lưới xem trước → chỉnh lẻ → lưu cả sơ đồ. Ràng buộc: tổng ghế **khớp đúng** `seat_capacity`; máy bay đã có `flight_seats` thì từ chối sửa |

### Còn lại — trang khách

| # | Màn | Route | Ghi chú |
|---|---|---|---|
| 5 | Khuyến mãi | `/promotions`, `/promotions/:id` | Danh sách + chi tiết, chỉ hiện chương trình đang hiệu lực |
| 6 | Tin tức | `/news`, `/news/:id` | Danh sách + chi tiết. **Phải sanitize HTML** chống XSS trước khi render |
| 7 | Kho voucher | `/account/voucher-store` | Voucher GLOBAL còn lượt, nút **Nhận** → `POST /vouchers/{id}/claim` |
| 8 | Voucher của tôi | `/account/vouchers` | Đọc `user_vouchers`, trạng thái AVAILABLE/RESERVED/USED/EXPIRED |
| 9 | Hồ sơ cá nhân | `/account/profile` | Xem + sửa `full_name`, `phone`, upload avatar |
| 10 | Đổi mật khẩu | `/account/security` | `POST /auth/change-password` |
| 11 | Quên / đặt lại mật khẩu | `/forgot-password`, `/reset-password` | |

### Việc phía Backend cần

| # | Việc | Tài liệu |
|---|---|---|
| 1 | Thêm 5 cột ảnh/mô tả/nhãn qua migration `V5` | `../domestic-flight-booking-web-be/docs/De_xuat_bo_sung_DB_v0.5_truong_anh.md` (đã viết sẵn) |
| 2 | Chốt định dạng `content` của News (HTML — cần sanitize) | Open item #6 API v0.2 |
| 3 | Endpoint upload ảnh cho master data (hiện chỉ có avatar qua Cloudinary) | — |

### Việc kỹ thuật nên làm khi rảnh

| # | Việc | Lý do |
|---|---|---|
| 1 | Thêm test cho `CrudPage` | Hiện chỉ có test cho mock layer và màn Airlines |
| 2 | Sửa cảnh báo budget CSS | 4 component vượt 4 kB (home 6.01, flight-results 6.71, account-bookings 5.64, client-layout 4.89) |
| 3 | Sanitize HTML cho News | Bắt buộc trước khi render `content` — chống XSS |
| 4 | `City.image_url` khi BE xác nhận | Nối vào khối "Tuyến bay phổ biến" ở trang chủ |
