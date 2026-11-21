# Đặc tả 3 bản prototype HTML

> Đọc kỹ trước khi viết code. Ba bản phải **nhìn như cùng một sản phẩm**.

## 1. Cấu trúc file

```
docs/design/prototype/
├── assets/
│   ├── tokens.css      ← ĐÃ CÓ, không sửa
│   ├── base.css        ← ĐÃ CÓ, không sửa
│   ├── proto.js        ← ĐÃ CÓ, không sửa
│   └── data.js         ← ĐÃ CÓ, không sửa
├── customer.html       ← agent 1 viết
├── admin.html          ← agent 2 viết
├── staff.html          ← agent 3 viết
├── customer.css        ← agent 1 viết
├── admin.css           ← agent 2 viết
└── staff.css           ← agent 3 viết
```

**Tuyệt đối không** tạo file trong `assets/`, không sửa 4 file ở đó. Cần thêm
biến CSS thì khai trong file `.css` riêng của mình, phạm vi giới hạn bằng
selector gốc của mình (`.cust-*`, `.adm-*`, `.stf-*`).

## 2. Bắt buộc về kỹ thuật

- Mở bằng double-click là chạy. **Không** build, không npm, không framework.
- Mỗi file HTML tự chứa phần thân; chỉ `<link>` tới 3 CSS và `<script>` tới 2 JS ở trên.
- Chỉ dùng CSS thuần + JS thuần (ES5/ES6 cơ bản). Không thư viện ngoài trừ
  Google Fonts (`Be Vietnam Pro`, `Inter`) và Material Icons — hai cái này
  **phải** có, giống `mockup-6-khuon.html`.
- Mọi màn hình là `<section class="screen" data-screen="ten-man" data-title="Tên hiển thị">`.
- Điều hướng: `href="#/ten-man"` hoặc `data-go="ten-man"`.
- Overlay/modal: `<div class="overlay" id="ov-ten">` + nút `data-overlay="ten"` để mở,
  `data-close` để đóng.
- Mỗi file phải có thanh công cụ prototype ở cuối `<body>`:
  ```html
  <div class="proto-bar">
    <button id="proto-home" title="Về màn đầu"><span class="material-icons">home</span></button>
    <button id="proto-back" title="Quay lại"><span class="material-icons">arrow_back</span></button>
    <span id="proto-label"></span>
    <span id="proto-count"></span>
  </div>
  ```
  và đặt `<body data-default-screen="ten-man-dau">`.

## 3. Màu & chữ

**Chỉ dùng `var(--color-*)`, `var(--text-*)`, `var(--sp-*)`, `var(--radius*)`,
`var(--shadow*)` từ `tokens.css`.** Không viết mã màu hex trong file của mình.

Ngoại lệ duy nhất: gradient sidebar phải dùng
`linear-gradient(180deg, var(--color-sidebar-top), var(--color-sidebar-bottom))`.

Font: tiêu đề `var(--font-heading)` (Be Vietnam Pro), thân `var(--font-body)` (Inter).
`base.css` đã đặt sẵn cho `h1..h4` và `body`, không cần khai lại.

## 4. Dữ liệu

Dùng `window.VF` trong `data.js`. **Không bịa số liệu mới** cho những thứ đã có
(`VF.bookings`, `VF.booking`, `VF.schedule`, `VF.adminBookings`, `VF.vouchers`,
`VF.users`, `VF.stats`, `VF.fares`, `VF.flights`, `VF.cities`…).

Định dạng tiền: `VF.fmt.money(2959000)` → `2.959.000đ`.
Số lượng lớn: `VF.fmt.short(4820000000)` → `4,8 tỷ`.

Ảnh: `VF.img.hero`, `VF.img.hanoi`… (Unsplash, cần mạng). Mỗi `<img>` phải có
`alt` và `loading="lazy"`, và khối chứa phải có `background: var(--color-border-soft)`
để nếu offline vẫn thấy khung, không thấy khoảng trắng.

## 5. Bố cục ba khu vực

| Khu vực | Layout | Đặc trưng bắt buộc |
|---|---|---|
| **customer.html** | `client-layout`: topbar navy + footer navy | Topbar dùng `--color-dark`; body nền `--color-bg`; thẻ trắng bo `--radius-lg` |
| **admin.html** | `admin-layout`: **sidebar dọc** trái (gradient navy), header có breadcrumb, footer | KHÔNG dùng topbar ngang. Sidebar rộng 248px, mục đang chọn nền trắng chữ xanh (`--color-sidebar-active-bg/fg`) |
| **staff.html** | `admin-layout` giống admin | Cùng khung sidebar nhưng **ít mục hơn** (staff không thấy module quản trị hệ thống) |

Admin/staff: sidebar cố định, vùng nội dung `margin-left: 248px`, header
breadcrumb cao 64px dính trên, footer trong vùng nội dung.

## 6. Màn hình phải có

### customer.html (14 màn)
| data-screen | Tiêu đề | Ghi chú |
|---|---|---|
| `home` | Trang chủ | hero ảnh + form tìm 4 ô + tuyến phổ biến + ưu đãi + tin tức |
| `login` | Đăng nhập | chia đôi màn hình, nền trái navy + ảnh, form phải. Không có topbar/footer |
| `register` | Đăng ký | cùng khung với login |
| `results` | Kết quả tìm chuyến | bộ lọc trái + 4 chuyến từ `VF.flights` |
| `flight-detail` | Chi tiết chuyến | 3 hạng vé từ `VF.fares`, so sánh cột |
| `seats` | Chọn ghế | sơ đồ ghế 3-3, khoang Phổ thông, giá theo loại ghế |
| `passengers` | Thông tin hành khách | form 2 hành khách (NL + TE) + thông tin liên hệ |
| `review` | Xem lại đơn | tóm tắt + bảng giá chi tiết + ô voucher |
| `payment` | Thanh toán | **mã đơn DH-1049**, đồng hồ giữ chỗ 15:00 đang chạy, VNPay + chuyển khoản, ghi rõ "PNR cấp sau khi thanh toán" |
| `confirmation` | Xác nhận đặt vé | mã PNR X7K2MP, vé điện tử, nút tải PDF |
| `my-bookings` | Vé của tôi | 3 đơn từ `VF.bookings`, tab lọc trạng thái |
| `booking-detail` | Chi tiết đặt chỗ | DH-1049 đầy đủ, nút huỷ vé mở overlay |
| `vouchers` | Voucher của tôi | 4 voucher từ `VF.vouchers`, tab Dùng được / Hết hạn / Đã dùng |
| `profile` | Hồ sơ cá nhân | form thông tin + đổi mật khẩu |

Overlay: `cancel-booking` (xác nhận huỷ, hiện % hoàn theo quy định), `passenger-edit` (popup chỉnh sửa hành khách W-BOK-01a), `baggage` (popup chọn hành lý ký gửi theo chặng × hành khách, mở từ nút "Chọn" trong khối Hành lý ở màn `passengers`), `city-picker` (chọn sân bay).

### admin.html (10 màn)
| data-screen | Tiêu đề |
|---|---|
| `dashboard` | Dashboard — 4 thẻ KPI + biểu đồ cột `VF.stats.revenueByDay` + top tuyến + đơn gần đây |
| `reports` | Báo cáo & thống kê — bộ lọc thời gian + bảng doanh thu |
| `flights` | Quản lý chuyến bay — bảng `VF.schedule` + nút thêm/sửa |
| `flight-form` | Chuyến bay — biểu mẫu |
| `aircraft` | Máy bay — bảng `VF.aircraft` |
| `seat-map` | Sơ đồ ghế theo máy bay — lưới ghế + loại ghế |
| `fare-classes` | Hạng vé — bảng + form |
| `bookings` | Đặt chỗ — bảng `VF.adminBookings` |
| `booking-detail` | Đặt chỗ — chi tiết DH-1049, timeline thanh toán |
| `users` | Người dùng — bảng `VF.users` + form |

Overlay: `delete-confirm` (dùng chung, nút xoá mở ra).

### staff.html (8 màn)
| data-screen | Tiêu đề |
|---|---|
| `dashboard` | Dashboard — KPI ca trực + chuyến hôm nay + việc cần xử lý |
| `flights` | Danh sách chuyến bay — `VF.schedule` |
| `flight-detail` | Chi tiết chuyến bay — thông tin + danh sách khách |
| `flight-edit` | Sửa chuyến bay — đổi giờ, trạng thái |
| `bookings` | Danh sách đặt chỗ — `VF.adminBookings` |
| `booking-detail` | Chi tiết đặt chỗ — check-in, in vé |
| `aircraft` | Máy bay — `VF.aircraft` (chỉ đọc) |
| `profile` | Hồ sơ cá nhân |

Overlay: `checkin-confirm`.

## 7. Chất lượng — tự kiểm trước khi báo xong

1. Mở file bằng trình duyệt thật, bấm qua **mọi** màn, không console error.
2. Không có chữ tiếng Anh lẫn trong nội dung tiếng Việt (trừ thuật ngữ: PNR, VNPay, check-in).
3. Không tràn ngang ở 375px, 768px, 1440px.
4. Mọi số tiền đúng định dạng `1.234.000đ`.
5. Số liệu chéo phải khớp: DH-1049 ở customer hiện 2.959.000đ thì ở admin cũng 2.959.000đ.
6. Ảnh có `alt`, có nền dự phòng.
7. Không hex màu trong CSS riêng — grep lại `#[0-9a-fA-F]{3,6}` phải rỗng (trừ `#fff` trong
   `.switch span::before` đã có ở base.css).

## 8. Điều KHÔNG được làm

- Không sửa 4 file trong `assets/`.
- Không tạo màn mới ngoài danh sách trên (thêm thì phải báo lại).
- Không bịa số liệu khác với `data.js`.
- Không dùng `<iframe>`.
- Không nhúng toàn bộ CSS vào HTML — phải tách file riêng.
- Không dùng ảnh ngoài danh sách `VF.img`.
