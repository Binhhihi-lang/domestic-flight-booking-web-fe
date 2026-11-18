# 06 — Màn hình, luồng & design system

> **Nguồn:** `be/docs/Danh_sach_toan_bo_UI_Website_Dat_Ve_May_Bay_Noi_Dia.docx` (77 màn), `fe/docs/design/wf-02-khu-hoi.html`, `wf-03-admin.html`, `wf-04-staff.html`, `01-design-system.html`, `app.routes.ts`, `src/_tokens.scss`.
> **Cập nhật:** 17/11/2026.

---

## 1. Ba khu vực

| Khu vực | Layout | Đăng nhập | Ghi chú |
|---|---|---|---|
| Public / Customer | `client-layout` (topbar + footer) | Không bắt buộc | Trang chủ, tìm chuyến, tin tức, khuyến mãi |
| Customer Account | `account-layout` (sidebar tài khoản) | Bắt buộc (`authGuard`) | Vé của tôi, voucher, hồ sơ |
| Admin / Staff | `admin-layout` (sidebar + header breadcrumb + footer) | Bắt buộc (`staffGuard`; ADMIN cho module quản trị) | Không dùng topbar ngang |

Ba màn xác thực (`/login`, `/register`, `/forgot-password`) nằm **ngoài** `client-layout`, không có footer.

---

## 2. Danh sách màn hình

### 2.1 Public / Customer website

| Mã | Màn hình | Route | Hạng | Code hiện tại |
|---|---|---|---|---|
| A1 | Trang chủ | `/` | S | ✅ |
| A2 | Đăng ký | `/register` | A | ✅ |
| A3 | Đăng nhập | `/login` | A | ✅ |
| A4 | Quên mật khẩu | `/forgot-password` | A | ❌ |
| A5 | Đặt lại mật khẩu | `/reset-password` | A | ❌ |
| A6 | Đổi mật khẩu | `/account/security` | A | ⏳ coming-soon |
| A7 | Danh sách tin | `/news` | A | ✅ |
| A8 | Chi tiết tin | `/news/:id` | A | ✅ |
| A9 | Tin theo chuyên mục | `/news/category/:slug` | B | ❌ (W-RT-16b) |
| A10 | Danh sách khuyến mãi | `/promotions` | A | ✅ |
| A11 | Chi tiết khuyến mãi | `/promotions/:id` | A | ✅ |
| A12–A13 | Danh sách / chi tiết hãng bay | `/airlines`, `/airlines/:id` | B | ❌ (W-RT-29, 29a) |
| A14–A15 | Danh sách / chi tiết thành phố | `/cities`, `/cities/:id` | B | ❌ (W-RT-31, không có trang chi tiết) |
| A16–A17 | Danh sách / chi tiết sân bay | `/airports`, `/airports/:id` | B | ❌ (W-RT-30, không có trang chi tiết) |

### 2.2 Tìm chuyến & đặt vé

| Mã | Màn hình | Route / vị trí | Hạng | Code |
|---|---|---|---|---|
| B1 | Form tìm chuyến | component `flight-search-card` | S | ✅ |
| B2 | Kết quả tìm chuyến | `/flights` | S | ✅ (dữ liệu tĩnh) |
| B3 | Chi tiết chuyến | `/flights/:id` | S | ❌ (W-RT-02b) |
| B4 | Chọn hạng vé | trong luồng đặt vé | S | ❌ |
| B5 | Chọn hành lý | trong luồng đặt vé | A | ❌ |
| B6 | Sơ đồ ghế khả dụng | `/flight/:id/seats` | S | ❌ |
| B6a | Chọn ghế khoang Phổ thông | `/booking/seats` (W-RT-05) | S | ❌ |
| B6b | Chọn ghế khoang Thương gia | `/booking/seats` (W-RT-05a) | S | ❌ |
| C1 | Thông tin hành khách | `/booking/passengers` | S | ❌ |
| C2 | Xem lại đơn & giá | `/booking/review` | S | ❌ |
| C3 | Chọn ghế + giữ ghế | `/booking/seats` | S | ❌ |
| C4 | Tạo booking | action từ C2 | S | ❌ |
| C5 | Thanh toán | `/booking/payment` | S | ❌ |
| C6 | Đang xử lý thanh toán | trạng thái của C5 | S | ❌ |
| C7 | Thanh toán thất bại / thử lại | `/booking/payment-result` | S | ❌ |
| C8 | Xác nhận đặt vé | `/booking/confirmation` | S | ❌ |
| C9 | Vé điện tử | `/account/tickets/:id` | S | ❌ |

### 2.3 Tài khoản khách

| Mã | Màn hình | Route | Hạng | Code |
|---|---|---|---|---|
| D1 | Tổng quan tài khoản | `/account` | A | ✅ (đang là danh sách vé) |
| D2 | Hồ sơ cá nhân | `/account/profile` | A | ⏳ coming-soon |
| D3 | Sửa hồ sơ | `/account/profile/edit` | A | ❌ |
| D4 | Đổi mật khẩu | `/account/security` | A | ⏳ coming-soon |
| D5 | Vé của tôi | `/account/bookings` | S | ✅ (dữ liệu tĩnh) |
| D6 | Chi tiết đặt chỗ | `/account/bookings/:id` | S | ❌ |
| D7 | Xác nhận hủy vé | modal từ D6 | A | ❌ |
| D8 | Vé điện tử của tôi | `/account/tickets` | A | ❌ (W-RT-09a) |
| D9 | Voucher của tôi | `/account/vouchers` | A | ✅ |
| D10 | Đổi ngày bay | `/account/bookings/:id/change` | A | ❌ (W-RT-08a) |

### 2.4 Admin

| Mã | Màn hình | Route | Code |
|---|---|---|---|
| F1 | Dashboard | `/admin/dashboard` | ✅ |
| F2–F5 | Người dùng: danh sách / chi tiết / tạo / sửa | `/admin/users...` | ✅ |
| F6 | Vai trò | `/admin/roles` | ✅ chỉ đọc |
| F7 | Danh mục quyền | `/admin/permissions` | ✅ chỉ đọc |
| F8–F10 | Hãng / Thành phố / Sân bay | `/admin/airlines`, `/cities`, `/airports` | ✅ |
| F11–F12 | Máy bay / Sơ đồ ghế | `/admin/aircrafts`, `/admin/seat-configurations/:id` | ✅ |
| F13–F14 | Khuyến mãi / Voucher | `/admin/promotions`, `/vouchers` | ✅ |
| F15–F16 | Danh mục tin / Tin tức | `/admin/news-categories`, `/news` | ✅ |
| F17 | Quản lý chuyến bay | `/admin/flights` | ⏳ coming-soon |
| F18 | Hạng vé | `/admin/fare-classes` | ❌ |
| F19 | Quy định hoàn vé | `/admin/fare-rules` | ❌ |
| F20 | Gói hành lý | `/admin/baggage-options` | ❌ |
| F21 | Giá bán theo chuyến | `/admin/flight-fares` | ❌ |
| F22 | Tồn ghế | `/admin/flight-seat-inventory` | ❌ |
| F23–F24 | Đặt chỗ: danh sách / chi tiết | `/admin/bookings` | ⏳ coming-soon |
| F25 | Báo cáo & thống kê | `/admin/dashboard` | ❌ |
| F26 | Hồ sơ admin | `/admin/profile` | ⏳ coming-soon |

Wireframe admin có thêm (vượt danh sách trên): **W-ADM-16** Hạng dịch vụ, **W-ADM-17…21** Hạng vé / Quy định hoàn / Gói hành lý / Giá bán theo chuyến / Tồn ghế, **W-ADM-26** Đặt chỗ chi tiết, **W-ADM-02** Báo cáo & thống kê.
Bổ sung 15/11/2026 — khép kín CRUD của quản trị: **W-ADM-11a / 12a / 13a / 15a / 17a / 18a / 19a / 20a / 34a / 35a** là mười biểu mẫu thêm–sửa cho Thành phố, Sân bay, Máy bay, Loại ghế, Hạng vé, Quy định hoàn vé, Gói hành lý, Giá bán theo chuyến, Tin tức, Danh mục tin — mọi màn danh sách đều có biểu mẫu riêng, không mượn "khuôn W-ADM-09" cho module có trường đặc thù nữa; **W-ADM-37** hộp thoại xác nhận xoá dùng chung (một bản ghi + hàng loạt); **W-ADM-38** đăng xuất. Mục **Đăng xuất** cũng được thêm vào sidebar nhóm *Hệ thống* của mọi artboard.
Wireframe quản trị hiện là **50 màn / 51 artboard** (W-ADM-37 có hai artboard).

Bổ sung 17/11/2026 — chốt nghiệp vụ khuyến mãi & voucher: bảng voucher đổi cột **"Lượt nhận" → "Đã phát"** (W-ADM-30) vì voucher ASSIGNED do ADMIN tặng, không phải khách nhận; bảng chuyến loại trừ (W-ADM-29) bỏ cột "Lý do" vì `promotion_excluded_flights` không có cột lưu lý do. Khuyến mãi **không** có giới hạn lượt/khách — chỉ voucher mới có `claim_limit`.

Bổ sung 17/11/2026 — hoàn thiện header và menu tài khoản: header mọi artboard có thêm **logo VinaFly**, **chuông thông báo** (có chấm báo chưa đọc) và **mũi tên mở menu tài khoản**; **W-ADM-39** vẽ trạng thái menu mở (Hồ sơ cá nhân · Về trang khách hàng · Liên hệ hỗ trợ · Đăng xuất); **W-ADM-40** là hộp thoại **Liên hệ hỗ trợ** mở giữa màn hình, hai đầu mối demo kèm email và số điện thoại, không rời trang đang làm.

**Từ vựng ba tầng (chốt 15/11/2026).** Tầng thứ nhất đổi tên từ *khoang* thành **hạng dịch vụ** — Phổ thông · Phổ thông đặc biệt · Thương gia — vì đó là sản phẩm khách mua và là thứ bộ lọc, cột bảng, màn W-ADM-16 quản lý. Chữ **khoang** chỉ còn dùng khi nói về **khoang vật lý trên máy bay**: sơ đồ ghế, dải ghế, câu "chọn ghế trong khoang đã mua". Ba tầng đọc là **hạng dịch vụ → hạng vé → loại ghế**.

### 2.5 Staff Portal

| Mã | Màn hình | Route | Code |
|---|---|---|---|
| E1 | Dashboard vận hành | `/staff/dashboard` | ❌ chỉ wireframe |
| E2–E5 | Chuyến bay: danh sách / chi tiết / tạo / sửa | `/staff/flights...` | ❌ |
| E6–E7 | Đặt chỗ: danh sách / chi tiết | `/staff/bookings...` | ❌ |
| E8 | Máy bay (chỉ đọc) | `/staff/aircrafts` | ❌ |
| E9 | Hồ sơ staff | `/staff/profile` | ❌ |

FE **chưa có module `features/staff`**; toàn bộ khu vực mới dừng ở `wf-04-staff.html` (9 artboard).


### 2.6 Quy ước đặt tên ghế (chốt 14/11/2026)

- Tên loại ghế gọi **theo đúng tên ghế trên máy bay**, không lặp tên khoang:
  Ghế tiêu chuẩn · Ghế cửa sổ · Ghế lối đi · Ghế hàng đầu · Ghế thoát hiểm · Ghế ngả rộng · Ghế thương gia.
- Sơ đồ ghế khai báo **theo khoang**: mỗi khối gồm `khoang × hàng từ–đến × cột × loại ghế`;
  **khoang và loại ghế là dropdown**, danh sách loại ghế chỉ hiện loại thuộc khoang đang chọn.
- Lưới xem trước **chia dải theo khoang**: dòng phân cách ghi tên khoang + khoảng hàng + ghi chú phụ thu.
- **Sinh lưới là sinh đủ ghế của mọi khối** — không có ô "không có ghế". Ghế hỏng/khóa xử lý ở màn **Tồn ghế theo chuyến**.

### 2.7 Màn wireframe bổ sung ngoài tài liệu UI

| Mã | Màn hình | Ghi chú |
|---|---|---|
| W-RT-01b | Popover số hành khách | đã code trong `flight-search-card` |
| W-RT-02b | Chi tiết chuyến bay — hạng vé gom theo hạng dịch vụ | chưa code (B3) |
| W-RT-06a | Trang mã VietQR | chưa code |
| W-RT-08a | Đổi ngày bay | chưa code |
| W-RT-09a | Vé điện tử của tôi | chưa code |
| W-RT-10/10a | Tra cứu đặt chỗ khách vãng lai | chưa code |
| W-RT-16b | Tin theo chuyên mục | chưa code |
| W-RT-17a | Chi tiết voucher | chưa code |
| W-RT-18 | Kho voucher | ✅ đã code |
| W-RT-21/22 | Thanh toán đang xử lý / thất bại | chưa code |
| W-RT-23/25/26/27 | Trợ giúp, hướng dẫn đặt vé, chính sách hoàn vé, liên hệ | chưa code |
| W-RT-28 | Điểm đến phổ biến | chưa code |
| W-RT-29/29a | Hãng hàng không: danh sách / chi tiết | chưa code |
| W-RT-30 | Sân bay (danh mục, không có trang chi tiết) | chưa code |
| W-RT-31 | Thành phố (ảnh lấy từ cột Ảnh của W-ADM-11) | chưa code |

---

## 3. Luồng đặt vé chính

```
Trang chủ (chọn tuyến, ngày, khách)
  → Kết quả tìm chuyến (/flights)
    → Chọn hạng vé từng chặng
      → Thông tin hành khách
        → Chọn ghế + giữ ghế (15 phút)
          → Xem lại đơn + chọn voucher từ ví
            → Thanh toán (VNPay | chuyển khoản VietQR)
              → Đang xử lý → Thành công (vé điện tử) | Thất bại (thử lại) | Hết hạn
```

Quy tắc UI:

- Thẻ chuyến chỉ hiện **một giá “Giá từ”** + số hạng vé; bấm Chọn mới mở bảng hạng.
- Bộ lọc gồm 4 nhóm: **hãng · hạng vé · giờ khởi hành · khoảng giá**.
- Sắp xếp: **Rẻ nhất · Nhanh nhất · Sớm nhất · Muộn nhất**.
- Ô hành khách là **popover 3 bộ đếm** (người lớn ≥13, trẻ em 2–12, em bé <2); tổng ≤ 9; em bé ≤ người lớn.
- Không có ô nhập mã voucher, không có bộ lọc “điểm dừng”.

### Tra cứu đặt chỗ (khách vãng lai)

- `W-RT-10`: nhập **mã đặt chỗ + email/SĐT** (bắt buộc cả hai).
- `W-RT-10a`: kết quả **chỉ đọc** — trạng thái, hành trình, ghế, thanh toán, tải vé PDF; không có nút hủy/đổi ngày.

---

## 4. Design system

### Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `primary` | `#0770CD` | Nút chính, liên kết |
| `primary-hover` | `#0A57A8` | Hover |
| `primary-bright` | `#0194F3` | Viền/icon nhấn |
| `primary-soft` | `#EAF7FF` | Nền nhạt |
| `accent` | `#FF5E1F` | CTA, giá |
| `accent-hover` | `#E84A0C` | Hover |
| `dark` | `#05285D` | Footer, sidebar, nền tối |
| `dark-2` | `#083A7D` | Nền tối phụ |
| `success` | `#00A651` / `#DCFCE7` | Trạng thái thành công |
| `warning` | `#F2A81D` / `#FEF3C7` | Cảnh báo |
| `danger` | `#E5484D` / `#FEE2E2` | Lỗi, hủy |
| `info` | `#0194F3` / `#E0F2FE` | Thông tin |
| `bg` | `#F7F9FA` | Nền trang |
| `surface` | `#FFFFFF` | Card, bảng |
| `ink` | `#03121A` | Chữ chính |
| `ink-muted` | `#687176` | Chữ phụ |
| `border` | `#DDE3E8` | Viền |

Token khai trong `src/_tokens.scss`; Tailwind trỏ `var(--color-*)`, **không hard-code hex**.

### Typography

- Heading: **Be Vietnam Pro**; Body: **Inter**.
- Thang: Display 32/40 Bold · H1 24/30 Bold · H2 20/25 SemiBold · H3 17/21 SemiBold · Body 15/22 · Small 13/20 · Caption 11/17.

### Khoảng cách & bo góc

- Thang 4px: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Bo góc: 6 / 10 / 14 / 16 px.

### Component dùng chung

Button (primary/secondary/outline/ghost/danger, disabled/loading), Badge trạng thái, Input (text/search/select/date/passenger + lỗi), Card chuyến bay, Data Table (sort/filter/pagination/empty/loading), Toast/Modal/Confirm/Skeleton.

### Quy ước layout

- Khu quản trị: **sidebar + header breadcrumb + footer**, không dùng topbar ngang.
- Footer khách: 4 cột — Hỗ trợ · Khám phá · Liên hệ; giống nhau ở **mọi** màn.
- Trang xác thực: panel trái 50% (logo + tagline + 3 số liệu), panel phải form; không footer.
- Mockup dùng thang xám; chỉ artboard Trang chủ dùng màu.

---

## 5. Quy trình làm wireframe / prototype

8 bước, điểm duyệt sau bước 3, 5, 7:

1. Phân tích yêu cầu.
2. Flow & sitemap.
3. Wireframe đen trắng.
4. Design system.
5. Mockup.
6. Prototype.
7. Đánh giá.
8. Bàn giao & hiện thực.

Công cụ: Figma Design (3–5), FigJam (2), Prototype mode (6), Figma AI/Make (5–6), Figma MCP (8). File thiết kế: **VinaFly — Design**.

---

## 6. Lưu ý lệch giữa tài liệu UI và code

- Tài liệu dùng `/news/:slug`; code dùng `/news/:id`.
- `/forgot-password` và `/reset-password` có trong tài liệu nhưng **chưa có route** trên nhánh hiện tại.
- `/account/profile`, `/account/security`, `/admin/profile` đang là `coming-soon`.
- Tài liệu UI đếm 77 màn; wireframe khách đã vẽ **45 màn / 90 artboard** (mỗi màn một desktop + một mobile), có thêm các màn ngoài tài liệu (tra cứu đặt chỗ, chi tiết voucher, đổi ngày bay, danh mục hãng bay / sân bay / thành phố).

---

## Đọc tiếp

- Trạng thái từng màn: [07-trang-thai-va-lo-trinh.md](07-trang-thai-va-lo-trinh.md)
- Quyết định luồng đặt vé: [08-quyet-dinh-thiet-ke.md](08-quyet-dinh-thiet-ke.md)
