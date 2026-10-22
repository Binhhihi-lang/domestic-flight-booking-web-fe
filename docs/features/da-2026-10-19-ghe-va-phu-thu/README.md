# Nhánh `da` — 2026-10-19 · Ghế & phụ thu nâng hạng (FE)

Thư mục tài liệu phía FE cho cụm thay đổi về ghế ngồi.

## Tài liệu đầy đủ nằm ở repo BE

Thiết kế, kế hoạch và hợp đồng API nằm ở repo BE (nơi chứa phần lớn thay đổi và tài liệu chuẩn của dự án):

```
D:\ChuyenDeTT\domestic-flight-booking-web-be\docs\features\da-2026-10-19-ghe-va-phu-thu\
├── README.md    ← tổng quan + trạng thái
├── design.md    ← thiết kế: schema, API, quyết định
└── plan.md      ← kế hoạch 10 task
```

## Việc thuộc phía FE

| Task | Nội dung | File chính |
|---|---|---|
| 6 | Model + service + mock cho phụ thu | `core/models/seat-surcharge.model.ts`, `core/services/catalog.service.ts`, `core/mock/data/seat-surcharge.mock.ts` |
| 7 | Sửa 6 lỗi giao diện lưới ghế | `features/admin/pages/seat-configurations/seat-grid.{ts,html,css}` |
| 8 | Color picker + cột màu trong CRUD | `shared/crud/crud-config.ts`, `crud-page.{ts,html,css}` |
| 9 | Màn CRUD phụ thu + 2 mục sidebar | `features/admin/pages/seat-class-surcharges/`, `app.routes.ts`, `admin-layout.ts` |

## Quyết định ảnh hưởng tới FE

- `color_hex = null` gửi lên là **`null`**, không phải `''` — BE validate `@Pattern` sẽ trượt với chuỗi rỗng.
- Lưới ghế tô theo `color_hex`, fallback theo `seat_class` khi null.
- Chữ trên ô ghế chọn trắng/đen theo độ tương phản WCAG 2.1 (**có gamma linearization**).
- Cặp `(from_class, to_class)` không có dòng trong bảng = **chưa có chính sách**, không phải phụ thu 0.

## Ghi chú

- Không commit — user tự commit.
- Sau khi xong, re-index codebase memory cho cả 2 repo.
