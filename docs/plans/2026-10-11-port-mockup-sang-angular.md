# Kế hoạch tiếp theo — Port mockup sang Angular + đồng bộ token

**Ngày lập:** 11/10/2026
**Repo:** `D:\ChuyenDeTT\domestic-flight-booking-web-fe`
**Trạng thái:** Chờ thực thi ở session mới
**Tiền đề:** Design system + mock layer đã xong (14 task, 22/22 test pass). Mockup 6 khuôn đã duyệt qua nhiều vòng.

---

## 1. Tình trạng hiện tại

### Đã xong

| Hạng mục | File | Trạng thái |
|---|---|---|
| Token | `src/_tokens.scss` | ✅ có, nhưng **lệch** so với mockup (xem mục 2) |
| Tailwind nối token | `../../tailwind.config.js` | ✅ |
| Material nối token | `../../src/material-theme.scss` | ✅ đã sửa lỗi typography Roboto → Inter |
| Component nền | `src/app/shared/ui/*` | ✅ 7 component (StatusBadge, AppCard, AppAlert, SkeletonBlock, LoadingState, AppButton, EmptyState) |
| Mock layer | `src/app/core/mock/*` | ✅ interceptor + registry + dữ liệu giả Airline + auth |
| BaseCrudService | `../../src/app/core/services/base-crud.service.ts` | ✅ |
| Màn mẫu Airlines | `src/app/features/admin/pages/airlines/*` | ✅ CRUD đầy đủ |
| Trang style guide | `../../src/app/features/style-guide/style-guide.ts` | ✅ route `/admin/style-guide` |
| **Mockup 6 khuôn** | `../design/mockup-6-khuon.html` | ✅ **nguồn chân lý thị giác** |

### Chưa làm

- **Port mockup sang Angular** — toàn bộ 6 khuôn trong mockup CHƯA có trong code Angular
- **Đồng bộ token** — màu badge, nền tối trong Angular còn là bản CŨ (xem mục 2)

---

## 2. ⚠️ LỆCH GIỮA MOCKUP VÀ ANGULAR — việc đầu tiên phải sửa

Mockup đã qua nhiều vòng chỉnh theo yêu cầu chủ dự án, nhưng **Angular chưa cập nhật theo**. Cụ thể:

| Token | Angular (CŨ) | Mockup (ĐÃ DUYỆT) | Ghi chú |
|---|---|---|---|
| `on-success-soft` | `#00602f` | `#15803d` | Chủ dự án chê màu cũ **xỉn/nâu**, muốn **tươi** |
| `on-warning-soft` | `#7a5400` | `#b45309` | 〃 |
| `on-danger-soft` | `#8e2024` | `#b91c1c` | 〃 |
| nền tối (sidebar/footer) | `#0b1524` (đen ngả xám) | `#05285d` (navy ngả xanh dương) | Lấy đúng màu footer Traveloka |

**Kiểm chứng:** đã đo tương phản WCAG, các màu mới đều đạt ≥ 4.5:1:
- `#15803d` trên `#dcfce7` = 4.57:1
- `#b45309` trên `#fef3c7` = 4.51:1
- `#b91c1c` trên `#fee2e2` = 5.30:1

**KHÔNG dùng** `#dc2626` (3.95:1) và `#0284c7` (3.57:1) — không đạt chuẩn.

### Việc cần làm ở mục này

1. `src/_tokens.scss` — đổi 3 màu `on-*-soft` sang giá trị mockup
2. `src/_tokens.scss` — thêm biến `--dark: #05285d`, `--dark-2`, `--dark-line`; dùng cho sidebar/footer
3. `../../src/material-theme.scss` — cập nhật `--mat-sys-error-container`, `--mat-sys-on-error-container` cho khớp
4. Kiểm chứng: mở `/admin/style-guide`, đo lại tương phản

---

## 3. Sáu khuôn cần port (theo thứ tự ưu tiên)

Nguồn: `../design/mockup-6-khuon.html` — mở file này để xem chính xác mọi giá trị.

| # | Khuôn | Màn áp dụng | Ghi chú |
|---|---|---|---|
| P1 | Trang chủ + widget tìm kiếm | A1 | Hero ảnh thật, 5 khối marketing, footer 4 cột |
| P2 | Kết quả tìm chuyến | B2 | Dày dữ liệu nhất, bộ lọc + hàng chuyến |
| P7 | Danh sách + bảng CRUD | F2, F8–F11, F13–F16, F23, E2, E6 | **Đã có bản Angular ở màn Airlines** — cần nâng cấp theo mockup |
| P9 | Dashboard | F1, F25, E1, D1 | Thẻ số liệu + biểu đồ cột + bảng |
| P6 | Đăng nhập / Đăng ký | A2–A6 | Chia đôi màn hình |
| P11 | Tài khoản khách | D2–D5, D7–D9, C9 | Ví, vé, voucher, lịch sử |

**15 khuôn còn lại** (P3, P4, P5, P8, P10, P12–P15) là biến thể — xem spec gốc `../specs/2026-10-11-design-system-va-mock-layer-design.md` mục 4.

---

## 4. Quy tắc BẮT BUỘC khi làm UI (chủ dự án đã nêu rõ)

1. **Màu ngữ nghĩa phải TƯƠI**, không dùng tông đậm/xỉn. Xem bảng mục 2.
2. **Dựng mockup trước, KHÔNG sửa code Angular để "xem thử".**
   Sửa Angular rồi rebuild mất 15 giây/vòng và không thấy tổng thể. Chủ dự án đã phàn nàn việc này.
3. **Tham chiếu thị giác:** Traveloka (chính) + VietFly (trang chủ).
4. **Phải responsive:** kiểm ở 375 / 390 / 768 / 1024 / 1440 / 1920px.
5. **Dùng công cụ trình duyệt để TỰ KIỂM**, không đoán. Đã cài `chrome-devtools` MCP.

---

## 5. Bài học kỹ thuật đã rút ra (đừng lặp lại)

### 5.1 Lỗi thứ tự CSS — đã mắc 2 lần
Media query khai **trước** rule gốc thì bị ghi đè. Luôn đặt media query **SAU** rule gốc.
- Đã gây lỗi: panel xanh P6 không ẩn trên mobile; thẻ vé P11 không chuyển 1 cột.

### 5.2 Grid/flex cần `min-width: 0`
Phần tử con của grid/flex mặc định `min-width: auto` → nội dung rộng (bảng, hàng chuyến) đẩy cả trang tràn ngang thay vì tự cuộn.
Đã gây lỗi: tràn ngang 509px ở mobile.

### 5.3 Xoá rule nhưng quên markup vẫn dùng
Khi viết lại CSS, đã xoá rule `.chip` nhưng markup vẫn `class="chip"` → chip mất hết định dạng.

### 5.4 Material ghi cứng tên font
`mat.theme(typography: 'Roboto')` khiến MỌI token `--mat-sys-*` dùng Roboto, bất kể CSS khai gì. Phải truyền `'Inter'` và override `--mat-sys-*` cho tiêu đề để dùng Be Vietnam Pro.

### 5.5 Mock interceptor nhận URL TUYỆT ĐỐI
`HttpClient` đưa `http://localhost:8080/api/v1/airlines` vào interceptor, không phải đường dẫn tương đối. Registry phải bỏ phần gốc URL trước khi so khớp.

---

## 6. Cách kiểm chứng (đã dùng, hiệu quả)

```bash
# 1. Dev server
npx ng serve --port 4210

# 2. Build + test
npx ng build --configuration development
npx ng test --watch=false        # hiện 22/22 pass

# 3. Kiểm responsive thật (dùng chrome-devtools MCP)
#    emulate viewport 375x667x2,mobile,touch
#    rồi evaluate_script đo: document.documentElement.scrollWidth - clientWidth
#    Kỳ vọng: = 0 ở MỌI khuôn, MỌI kích thước
```

---

## 7. Việc chủ dự án tự làm

- **Tự commit** — không nhờ agent commit (đã thống nhất).
- Duyệt mockup trước khi agent port sang Angular.
