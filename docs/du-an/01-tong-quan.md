# 01 — Tổng quan dự án

> **Nguồn:** `be/docs/API_Design…v0.4.md`, `Database_Design…v0.5.md`, `Permission_Matrix_v2.1.md`, `Kien_truc_Tong_the_He_Thong.md`, `Tech_Stack…md`; quyết định nghiệp vụ đã chốt trong quá trình duyệt wireframe.
> **Cập nhật:** 13/11/2026.

---

## 1. Dự án là gì?

**VinaFly** — website đặt vé máy bay nội địa, đồ án chuyên đề. Hệ thống gồm 3 khu vực:

| Khu vực | Người dùng | Chức năng chính |
|---|---|---|
| Public website | Khách vãng lai | Tìm chuyến, xem giá, khuyến mãi, tin tức, tra cứu đặt chỗ |
| Customer account | Khách đã đăng nhập | Đặt vé, thanh toán, ví voucher, quản lý vé |
| Khu vận hành | STAFF / ADMIN | Quản trị dữ liệu nền, chuyến bay, đặt chỗ, người dùng, RBAC, báo cáo |

**Định vị:** chỉ bán **vé máy bay nội địa, bay thẳng** — không có chặng dừng, không bán vé quốc tế.

---

## 2. Ba phase

| Phase | Phạm vi | Trạng thái |
|---|---|---|
| **Phase 1** | Auth/Account, Profile, User, RBAC, Master Data (hãng/TP/sân bay/máy bay/loại ghế/sơ đồ ghế), Promotion, Voucher, News, Bulk | BE xong; FE phần lớn xong |
| **Phase 2** | Flight & Fare: chuyến bay, hạng vé, quy định hoàn vé, giá bán, tồn ghế | BE mới có entity/migration, **chưa có service/controller** |
| **Phase 3** | Booking, Payment, E-Ticket, hoàn/hủy vé | BE mới có entity/migration |

Phase 4 không thuộc phạm vi đồ án.

---

## 3. Actor và vai trò

| Actor | Mô tả | Đăng nhập |
|---|---|---|
| **GUEST** | Khách vãng lai: tìm chuyến, xem khuyến mãi/tin tức, tra cứu đặt chỗ bằng mã + email/SĐT | Không |
| **CUSTOMER** | Khách có tài khoản: đặt vé, thanh toán, ví voucher, xem vé của mình | Có |
| **STAFF** | Nhân viên vận hành: xem chuyến bay, đặt chỗ, tra cứu; không quản trị dữ liệu nền | Có |
| **ADMIN** | Quản trị toàn hệ thống: master data, người dùng, RBAC, khuyến mãi, voucher, tin tức | Có |

Chi tiết quyền: [05-phan-quyen.md](05-phan-quyen.md).

---

## 4. Hai repo và phân công

| Repo | Công nghệ | Người phụ trách | Nhánh làm việc (13/11/2026) |
|---|---|---|---|
| `domestic-flight-booking-web-fe` | Angular 22 + Material 22 + Tailwind 3.4 | Đức Anh | `feature/wireframe-khach-hang` |
| `domestic-flight-booking-web-be` | Java 17 + Spring Boot 4.1.1 + PostgreSQL + Redis | Bình | `feature/phase-2-chuyen-bay-va-gia-ve` |

Hai repo tách riêng, giao tiếp qua **hợp đồng API v0.4**. FE có mock layer để phát triển trước khi BE có endpoint.

---

## 5. Thương hiệu

- **Tên:** VinaFly
- **Tagline:** “Bay nội địa, giá tốt mỗi ngày”
- **Logo:** SVG nội tuyến trong `shared/components/brand-logo` — chữ V vẽ thành đường bay, kết thúc bằng điểm tròn (điểm đến); badge gradient `#0D47A2 → #0194F3`.
- **Áp dụng:** topbar/footer khách, panel trái trang đăng nhập, sidebar quản trị.
- **Màu chủ đạo:** xanh dương tươi; nền tối dùng `#05285D`; không dùng màu quá đậm.

---

## 6. Công nghệ tóm tắt

| Thành phần | Công nghệ |
|---|---|
| Frontend | Angular 22 (standalone + signals), TypeScript 6, RxJS 7.8, Angular Material/CDK 22, Tailwind 3.4 |
| Backend | Java 17, Spring Boot 4.1.1, Spring Security + JWT, Hibernate 7.4.5 |
| CSDL | PostgreSQL 18.6 (Aiven), Flyway (V1–V15) |
| Cache/token | Redis 7.2 (Docker) |
| Kiểm thử | JUnit + Mockito (BE), Vitest + jsdom (FE) |

Chi tiết: [02-kien-truc.md](02-kien-truc.md).

---

## 7. Nguyên tắc nghiệp vụ cốt lõi

1. **Giá vé là giá trọn gói.** `adult_price = base_fare + tax_fee`; thuế và phí sân bay gộp một cột, không tách dòng ở bất kỳ màn hình nào.
2. **Chọn hạng vé riêng cho từng chặng.** Không gộp khứ hồi rồi chọn chung.
3. **Khuyến mãi ≠ voucher.**
   - *Promotion* giảm thẳng vào giá dòng vé, **tự động** khi tạo đơn.
   - *Voucher* khách phải **nhận vào ví** rồi chọn khi thanh toán; **không gõ mã**.
4. **Giữ chỗ 15 phút** tính từ lúc tạo đơn. Nhãn UI: “Thời hạn thanh toán”.
5. **Chỉ hai phương thức thanh toán:** VNPay và chuyển khoản ngân hàng (VietQR). Không thẻ tín dụng, không trả tại quầy.
6. **Booking chỉ xem và hủy** — không thêm/sửa/xóa ở cả khu khách lẫn admin.
7. **Tin tức:** khách chỉ thấy bài `PUBLISHED`; bài `DRAFT/UNPUBLISHED` coi như không tồn tại.
8. **Xóa mềm toàn hệ thống:** `is_deleted` + `deleted_at`; mọi truy vấn lọc bản ghi đã xóa.
9. **Trạng thái dùng chung:** `ACTIVE/INACTIVE` cho master data; `PUBLISHED/DRAFT/UNPUBLISHED` cho tin tức.
10. **Mỗi user đúng một role**; quyền gắn vào role qua `role_permissions`.

---

## 8. Bản đồ tài liệu

| File | Nội dung | Đọc khi |
|---|---|---|
| [02-kien-truc.md](02-kien-truc.md) | Kiến trúc, công nghệ, bảo mật, chạy local | Cần hiểu hệ thống gồm khối nào |
| [03-co-so-du-lieu.md](03-co-so-du-lieu.md) | 34 bảng, quan hệ, migration | Cần biết dữ liệu lưu ở đâu |
| [04-api.md](04-api.md) | Quy ước API, endpoint theo module, mã lỗi | Viết service / nối API |
| [05-phan-quyen.md](05-phan-quyen.md) | Actor, permission, quy tắc nghiệp vụ | Làm guard, ẩn/hiện nút |
| [06-man-hinh-va-luong.md](06-man-hinh-va-luong.md) | Danh sách màn, route, design system, luồng đặt vé | Làm UI / đối chiếu wireframe |
| [07-trang-thai-va-lo-trinh.md](07-trang-thai-va-lo-trinh.md) | Đã xong, còn thiếu, việc kế tiếp | Trước khi bắt đầu việc mới |
| [08-quyet-dinh-thiet-ke.md](08-quyet-dinh-thiet-ke.md) | Các quyết định lớn và lý do | Thắc mắc “sao lại làm thế” |

---

## 9. Tài liệu gốc (khi cần tra cứu sâu)

| Tài liệu | Đường dẫn | Phiên bản |
|---|---|---|
| API Design | `be/docs/API_Design_Website_Dat_Ve_May_Bay_v0.4.md` | v0.4 — 15/10/2026 |
| Database Design | `be/docs/Database_Design_Domestic_Flight_Booking_v0.5.md` | v0.5 — 15/10/2026 |
| Permission Matrix | `be/docs/Permission_Matrix_v2.1.md` | v2.1 — 15/10/2026 |
| Kiến trúc tổng thể | `be/docs/Kien_truc_Tong_the_He_Thong.md` | v1.0 — 14/10/2026 |
| Tech Stack | `be/docs/Tech_Stack_Website_Dat_Ve_May_Bay.md` | 13/10/2026 |
| Use Case Phase 1/2/3 | `be/docs/Phase_*_Use_Case_Specification_*.docx` | v2.3 / v2.1 |
| Danh sách UI | `be/docs/Danh_sach_toan_bo_UI_Website_Dat_Ve_May_Bay_Noi_Dia.docx` | 77 màn |
| Wireframe khách | `fe/docs/design/wf-02-khu-hoi.html` | 36 màn / 71 artboard |
| Wireframe admin | `fe/docs/design/wf-03-admin.html` | 35 artboard |
| Wireframe staff | `fe/docs/design/wf-04-staff.html` | 9 artboard |

> Tài liệu gốc trong `be/docs` có nhiều bản nháp/plan/báo cáo Word. Bộ `docs/du-an/` này chỉ giữ **bản mới nhất đã chốt**; khi cần chi tiết thô mới mở tài liệu gốc.
