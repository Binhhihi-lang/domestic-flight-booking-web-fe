# Design System & Mock Layer — Thiết kế

**Ngày:** 11/10/2026
**Repo:** `domestic-flight-booking-web-fe` (Angular 22 + Material 3 + Tailwind 3.4)
**Căn cứ:** API Design v0.2 · Database Design v0.4 · Permission Matrix v2.0 · Kế hoạch Sprint 2
**Trạng thái:** Chờ duyệt

---

## 1. Vấn đề và mục tiêu

### 1.1 Vấn đề hiện tại

Repo FE đang có **hai hệ màu song song không khớp nhau**:

| Nơi khai báo | Giá trị primary | Được dùng bởi |
|---|---|---|
| `../../tailwind.config.js` | `#2563eb` (Tailwind blue-600) | `class="text-primary-600"` |
| `../../src/material-theme.scss` | `mat.$azure-palette` | `var(--mat-sys-primary)` |

Hai giá trị này **khác nhau**, nên cùng một "màu chính" lại ra hai màu khác nhau tuỳ chỗ dùng.

Các vấn đề kéo theo:

1. **Font lệch:** `../../tailwind.config.js` khai `Inter` nhưng `../../src/index.html` chỉ nạp `Roboto` → `font-sans` thực tế rơi về `system-ui` của hệ điều hành.
2. **Tailwind khai lại toàn bộ scale mặc định** (`spacing`, `fontSize`, `borderRadius`, `boxShadow`, `zIndex`) → không phân biệt được đâu là tuỳ biến thật, đâu là mặc định.
3. **Không có quy ước** khi nào dùng token Material (`var(--mat-sys-*)`), khi nào dùng utility Tailwind → mỗi file một kiểu (`page-header.ts` viết CSS tay + `--mat-sys-*`; `home.ts` dùng utility Tailwind).
4. **Dark mode không đồng bộ:** Tailwind khai `darkMode: 'class'` nhưng `material-theme.scss` hard-code `color-scheme: light`.
5. **Chưa có mock layer**, nên mọi màn hình mới đều bị chặn cho tới khi BE có controller thật (BE hiện chỉ có entity + repository).

### 1.2 Mục tiêu

- Một **nguồn chân lý duy nhất** cho màu / chữ / khoảng cách / bo góc / đổ bóng, được cả Tailwind lẫn Material đọc chung.
- **Quy ước rõ ràng** để người sau (hoặc thành viên mới) không phải đoán.
- **Bộ component nền** tái dùng cho mọi trang, gồm cả màn quản trị CRUD.
- **Mock layer** cho phép dựng UI trước khi BE xong, tắt mock không phải sửa code.
- **Trang style guide** để tra cứu token và đối chiếu khi làm trang mới.

### 1.3 Ngoài phạm vi

- Không viết lại component Angular Material.
- Không làm dark mode cho **mọi** màn hình — chỉ dựng hạ tầng token + xác nhận trên trang style guide.
- Không làm Payment, Notification (bảng `notifications` chưa triển khai).
- Không đổi cấu trúc route hiện có.

---

## 2. Hướng thị giác

Lấy **Traveloka** làm chuẩn tham chiếu (theo lựa chọn của chủ dự án), không lấy mặc định SaaS thông thường.

### 2.1 Bảng màu

| Vai trò | Mã | Dùng ở đâu |
|---|---|---|
| Primary | `#0194F3` | Thương hiệu, nút chính, link, trạng thái đang chọn |
| Primary hover/active | `#0770CD` | Trạng thái hover, nhấn |
| Primary nhạt | `#EAF7FF` | Nền vùng được chọn, chip đang bật |
| Accent (CTA phụ) | `#FF5E1F` | Giá khuyến mãi, badge "giá tốt", nhấn chuyển đổi |
| Thành công | `#00A651` | Badge "tiết kiệm", dấu ✓ tiện ích, trạng thái tốt |
| Cảnh báo | `#F2A81D` | Sắp hết ghế, cảnh báo mềm |
| Lỗi | `#E5484D` | Hết chỗ, không hoàn vé, lỗi chặn |
| Nền trang | `#F7F9FA` | Nền ngoài của mọi trang |
| Bề mặt | `#FFFFFF` | Card, panel, toolbar |
| Chữ chính | `#03121A` | Tiêu đề, nội dung |
| Chữ phụ | `#687176` | Nhãn, mô tả, metadata |
| Chữ mờ | `#9AA6AD` | Placeholder, ghi chú |
| Đường kẻ | `#DDE3E8` | Viền, đường phân cách |
| Đường kẻ nhạt | `#EDF1F4` | Phân cách trong bảng, trong card |

**Lưu ý về độ tin cậy:** bảng màu này dựng lại **theo quan sát** trang Traveloka, không trích xuất từ CSS của họ (họ dùng Vanilla Extract với biến bị hash nên không đọc được giá trị gốc). Cần đối chiếu lại bằng mắt khi dựng trang style guide, và điều chỉnh nếu lệch.

### 2.2 Chữ

| Vai trò | Font | Ghi chú |
|---|---|---|
| Tiêu đề | Be Vietnam Pro | Thiết kế cho tiếng Việt, dấu cân đối |
| Nội dung | Inter | Bảng biểu, số liệu |
| Mã / giờ bay | Inter + `font-variant-numeric: tabular-nums` | Chữ số thẳng cột |

Thang chữ (rem, line-height 1.5 cho nội dung):

| Token | Cỡ | Dùng cho |
|---|---|---|
| `display` | 2rem / 700 | Tiêu đề trang lớn |
| `h1` | 1.5rem / 700 | Tiêu đề trang |
| `h2` | 1.25rem / 700 | Tiêu đề mục |
| `h3` | 1.0625rem / 600 | Tiêu đề phụ, tiêu đề card |
| `body` | 0.9375rem / 400 | Nội dung |
| `small` | 0.8125rem / 400 | Nhãn, metadata |
| `caption` | 0.6875rem / 500 | Ghi chú nhỏ nhất |

**Quy ước:** KHÔNG dùng chữ hoa giãn cách (`text-transform: uppercase` + `letter-spacing`) cho nhãn chung. Chữ hoa chỉ dành cho **mã sân bay, số hiệu chuyến, mã đặt chỗ** — nơi đúng quy ước ngành hàng không.

### 2.3 Bo góc, đổ bóng, khoảng cách

| Token | Giá trị | Dùng cho |
|---|---|---|
| `radius-sm` | 6px | Nút nhỏ, chip, badge |
| `radius` | 10px | Nút, ô nhập liệu |
| `radius-lg` | 14px | Card, panel |
| `radius-xl` | 16px | Khối lớn, widget tìm kiếm |
| `shadow-sm` | `0 1px 4px rgba(3,18,26,.06)` | Hàng trong danh sách |
| `shadow` | `0 2px 10px rgba(3,18,26,.07)` | Card |
| `shadow-lg` | `0 4px 16px rgba(3,18,26,.10)` | Dialog, popover |

Đổ bóng dùng **tông xanh đen** (`#03121A`), không dùng đen thuần — để hợp với nền sáng xanh của Traveloka.

Thang khoảng cách: bám mặc định Tailwind (4px base) — **không khai lại**, chỉ thêm nếu thật sự thiếu.

### 2.4 Quy ước dùng token

| Việc | Dùng |
|---|---|
| Component có sẵn của Material (form field, button, dialog, table, snackbar, tooltip) | Angular Material — để có sẵn hành vi + accessibility |
| Bố cục, khoảng cách, responsive, màu trạng thái | Utility Tailwind |
| Màu / chữ / bo góc | Token CSS variable (dùng qua Tailwind hoặc `var()`) |

**Không** viết lại component Material bằng Tailwind. **Không** hard-code mã màu trong component — luôn dùng token.

---

## 3. Kiến trúc

### 3.1 Cấu trúc file

```
src/
├── styles.css              # sửa — import token + reset + tiện ích nền
├── material-theme.scss     # sửa — Material đọc từ token
├── _tokens.scss            # MỚI — nguồn chân lý duy nhất (CSS custom properties)
├── app/
│   ├── core/
│   │   ├── mock/           # MỚI — mock layer
│   │   │   ├── mock.interceptor.ts
│   │   │   ├── mock-registry.ts
│   │   │   └── data/       # dữ liệu giả theo từng module
│   │   └── models/         # bổ sung — model khớp API v0.2
│   ├── shared/
│   │   ├── components/     # bổ sung component nền
│   │   └── ui/             # MỚI — component trình bày thuần
│   └── features/
│       └── style-guide/    # MỚI — trang tra cứu token
└── environments/
    └── environment.ts      # sửa — thêm cờ useMock
```

**Lưu ý:** `material-theme.scss` và `styles.css` hiện nằm ở `../../src` (khai trong `../../angular.json` → `"styles": ["src/material-theme.scss", "src/styles.css"]`). Giữ nguyên vị trí này, không di chuyển — chỉ thêm `_tokens.scss` cùng cấp.

### 3.2 Thứ tự thực hiện

Phải theo đúng thứ tự này vì phần sau phụ thuộc phần trước:

1. **Tokens** — nguồn chân lý duy nhất
2. **Nối Tailwind ↔ Material** — để hai hệ khớp nhau
3. **Component nền** — dùng token vừa định nghĩa
4. **Trang style guide** — xác nhận token + component đúng
5. **Mock layer** — độc lập với 1–4, có thể làm song song
6. **Màn hình mẫu** — dùng cả component nền lẫn mock layer

### 3.3 Mock layer

**Cơ chế:** HTTP interceptor chặn request khi `useMock = true`, trả `HttpResponse` giả từ registry.

Lý do chọn interceptor thay vì các cách khác:
- Service và component giữ nguyên y như code thật (vẫn gọi `HttpClient` qua `BaseCrudService`) → tắt mock **chỉ đổi một cờ**, không sửa code.
- Không phải viết hai bản service (khác với cách swap qua DI).
- Không thêm dependency (khác với MSW).

**Registry** ánh xạ `method + path pattern` → hàm sinh dữ liệu, có hỗ trợ:
- Phân trang, lọc, sắp xếp theo đúng tham số API v0.2 (`page`, `size`, `keyword`, `sort`, filter riêng module).
- Độ trễ giả lập để thấy trạng thái đang tải.
- Trả lỗi theo mã nghiệp vụ (1004, 1005, 1006) để thử nhánh lỗi.

**Ràng buộc:** dữ liệu giả phải khớp **shape envelope** của API v0.2 (`{code, message, data}`, `{items, pagination}`, snake_case). Không bịa shape khác.

---

## 4. Component nền

| Component | Vai trò | Ghi chú |
|---|---|---|
| `PageShell` | Khung trang: tiêu đề + mô tả + vùng hành động + nội dung | Mở rộng từ `PageHeader` hiện có |
| `AppCard` | Card 3 phần: đầu / thân / chân | Chân chỉ hiện khi có hành động |
| `StatusBadge` | Nhãn trạng thái theo màu ngữ nghĩa | Ánh xạ trạng thái DB → màu, dùng chung toàn hệ thống |
| `DataTable` | Bọc `MatTable` + phân trang + sắp xếp | Cột số căn phải, chữ số tabular |
| `FormField` | Bọc `MatFormField` + nhãn + gợi ý + lỗi | Lỗi luôn kèm chữ giải thích |
| `AppButton` | 5 biến thể: primary / secondary / ghost / danger / text | Quy ước: chỉ một nút primary mỗi vùng nhìn |
| `EmptyState` | Trạng thái rỗng | Đã có, mở rộng thêm nút hành động |
| `LoadingState` | Đang tải (spinner) | |
| `SkeletonBlock` | Khung xương khi tải | |
| `AppAlert` | 4 mức: thành công / thông tin / cảnh báo / lỗi | Biến thể A: nền nhạt + vạch trái |

**Bộ icon:** giữ **Material Icons** (bộ hiện tại). Không dùng emoji làm icon.

---

## 5. Kiểm chứng

| Hạng mục | Cách kiểm |
|---|---|
| Token khớp hai hệ | Trang style guide hiển thị `text-primary` (Tailwind) và `var(--mat-sys-primary)` cạnh nhau — phải cùng màu |
| Component nền | Style guide render mọi biến thể + trạng thái |
| Dark mode | Toggle trên style guide, kiểm tra tương phản ≥ 4.5:1 cho chữ |
| Mock layer | Bật cờ, gọi thử từng endpoint mẫu; kiểm phân trang / lọc / lỗi |
| Tắt mock | Đặt `useMock = false`, xác nhận request đi ra mạng thật, không còn nhánh mock |
| Responsive | Kiểm ở 375px / 768px / 1024px / 1440px |
| Accessibility | Focus bàn phím nhìn thấy được, `prefers-reduced-motion` được tôn trọng |

---

## 6. Rủi ro

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Bảng màu dựng lại theo quan sát, có thể lệch so với Traveloka thật | Trung | Đối chiếu bằng mắt ở bước 4; điều chỉnh trước khi áp cho màn hình |
| Material 3 khoá màu theo palette sinh sẵn, khó ép đúng `#0194F3` | Trung | Nếu không ép được, chấp nhận Material dùng sắc gần nhất và Tailwind dùng token riêng — nhưng phải ghi rõ trong tài liệu quy ước |
| Mock và API thật lệch shape | Trung | Registry bám API Design v0.2; khi nối API thật, tắt mock ngay, không giữ hai nhánh |
| Đổi token làm vỡ giao diện hiện có (home/login/register) | Thấp | Kiểm lại 3 trang này sau bước 2 |

---

## 7. Việc chủ dự án tự làm

- **Tự commit** mọi thay đổi (theo nguyên tắc đã thống nhất).
- Xác nhận bảng màu ở bước 4 trước khi áp cho màn hình mẫu.
