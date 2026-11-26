# Tài liệu dự án VinaFly — bộ đọc nhanh

Thư mục này là **bản tóm tắt sạch** của các tài liệu dự án, gom từ `be/docs` (nhiều bản nháp, plan, báo cáo Word) về một chỗ để đọc lại cho dễ.

- **Dự án:** Website đặt vé máy bay nội địa **VinaFly**
- **Cập nhật:** 13/11/2026
- **Nguyên tắc:** chỉ giữ **bản mới nhất đã chốt**; khi cần chi tiết thô mới mở tài liệu gốc trong `be/docs`.
- **Nguồn chuẩn:** API Design **v0.4**, Database **v0.5** + migration **V15**, Permission Matrix **v2.1**, Kiến trúc **v1.0**.

---

## Đọc theo mục đích

| Bạn muốn… | Đọc |
|---|---|
| Hiểu dự án làm gì, phạm vi, actor, thương hiệu | [01-tong-quan.md](01-tong-quan.md) |
| Hiểu hệ thống gồm khối nào, chạy local ra sao | [02-kien-truc.md](02-kien-truc.md) |
| Biết dữ liệu lưu ở bảng nào | [03-co-so-du-lieu.md](03-co-so-du-lieu.md) |
| Viết service / nối API | [04-api.md](04-api.md) |
| Làm guard, ẩn/hiện nút theo quyền | [05-phan-quyen.md](05-phan-quyen.md) |
| Làm UI, đối chiếu wireframe | [06-man-hinh-va-luong.md](06-man-hinh-va-luong.md) |
| Biết cái gì xong, cái gì còn thiếu, làm gì tiếp | [07-trang-thai-va-lo-trinh.md](07-trang-thai-va-lo-trinh.md) |
| Hiểu “vì sao lại làm thế này” | [08-quyet-dinh-thiet-ke.md](08-quyet-dinh-thiet-ke.md) |
| Hiểu toàn bộ nghiệp vụ 3 phase | [09-nghiep-vu-toan-dien.md](09-nghiep-vu-toan-dien.md) |

---

## Mục lục

| # | File | Nội dung chính |
|---|---|---|
| 01 | [Tổng quan](01-tong-quan.md) | Dự án, 3 phase, actor, hai repo, thương hiệu, 10 nguyên tắc nghiệp vụ |
| 02 | [Kiến trúc](02-kien-truc.md) | Monolith 2 repo, 3 tầng BE, 3 vùng FE, JWT + Redis, test/CI, chạy local |
| 03 | [Cơ sở dữ liệu](03-co-so-du-lieu.md) | 34 bảng đã dựng theo nhóm, quan hệ, migration V1–V15, quy ước dữ liệu |
| 04 | [API](04-api.md) | Quy ước chung, mã lỗi, endpoint theo module, bulk, trạng thái, điểm FE cần nhớ |
| 05 | [Phân quyền](05-phan-quyen.md) | Actor, ma trận quyền, use case 3 phase, quy tắc nghiệp vụ |
| 06 | [Màn hình & luồng](06-man-hinh-va-luong.md) | 77 màn theo khu vực, route, design system, luồng đặt vé |
| 07 | [Trạng thái & lộ trình](07-trang-thai-va-lo-trinh.md) | Đã xong, còn thiếu, bản đồ nhánh, việc kế tiếp |
| 08 | [Quyết định thiết kế](08-quyet-dinh-thiet-ke.md) | 18 quyết định lớn kèm lý do và hệ quả |
| 09 | [Nghiệp vụ toàn dự án](09-nghiep-vu-toan-dien.md) | Nghiệp vụ 3 phase, mô hình Khoang–Hạng vé–Loại ghế, luồng end-to-end, lỗi cần sửa |

---

## Đọc nhanh trong 5 phút

- **Sản phẩm:** khách tìm chuyến bay nội địa **thẳng**, chọn hạng vé **từng chặng**, giữ chỗ **15 phút**, thanh toán **VNPay hoặc chuyển khoản**.
- **Ba khu vực:** public website · tài khoản khách · quản trị (STAFF/ADMIN).
- **Công nghệ:** Angular 22 + Spring Boot 4.1.1 + PostgreSQL + Redis, hai repo riêng, hợp đồng qua API v0.4.
- **Tiến độ:** BE xong Phase 1; FE phần lớn xong Phase 1; wireframe đủ 3 khu vực; Phase 2–3 chưa có API nên FE đang mock.
- **Điều dễ nhầm nhất:** *promotion* (tự động vào giá vé) khác *voucher* (nhận vào ví rồi chọn); vé chỉ **bay thẳng**; giá vé **đã gồm thuế/phí**.

---

## Khi nào cập nhật bộ tài liệu này

- Có thay đổi **hợp đồng API** → sửa `04-api.md` và ghi rõ version/tài liệu gốc.
- Có **migration mới** → thêm dòng vào bảng migration trong `03-co-so-du-lieu.md`.
- Chốt **quyết định thiết kế** mới → thêm mục vào `08-quyet-dinh-thiet-ke.md`.
- Xong một cụm việc → cập nhật `07-trang-thai-va-lo-trinh.md` (kèm ngày và nhánh đo).

> Không chép nguyên văn tài liệu gốc vào đây; chỉ giữ thông tin đã chốt và chỉ rõ nguồn để tra ngược.
