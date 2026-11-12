# PHÂN TÍCH 3 VẤN ĐỀ GHẾ NGỒI

**Ngày:** 19/10/2026 · **Phạm vi:** FE `da` (đã sửa Cụm 1) + BE `1f52d30`

---

## VẤN ĐỀ 1 — Phổ thông ngồi ghế thương gia thì tính thêm tiền

### Hiện trạng dữ liệu (đã kiểm chứng)

Schema **đã có sẵn cơ chế**, không cần thêm bảng:

| Bảng | Cột | Ý nghĩa |
|---|---|---|
| `fare_classes` | `seat_class` (ECONOMY/BUSINESS/FIRST) | Hạng vé khách mua |
| `seat_types` | `seat_class` (ECONOMY/BUSINESS/FIRST) | Hạng ghế vật lý |
| `flight_seats` | **`seat_surcharge NUMERIC(12,2)`** | **Phụ thu khi chọn ghế này** |
| `seat_holds` | `surcharge_at_booking` | Chụp lại phụ thu lúc giữ ghế |
| `bookings` | `seat_surcharge_amount` | Tổng phụ thu ghế |

DB v0.5 mục 5.3 bước 4 ghi rõ:
> **tổng thanh toán** = giá sau khuyến mãi − giảm voucher **+ phụ thu ghế** + hành lý

Và giả định #7:
> **Phụ thu ghế và hành lý KHÔNG được giảm bởi khuyến mãi hay voucher.**

### Nhưng có 3 lỗ hổng nghiệp vụ

| # | Lỗ hổng | Hệ quả |
|---|---|---|
| **A** | **Không có nơi nào định nghĩa "phụ thu = bao nhiêu".** `flight_seats.seat_surcharge` mặc định `0`. Không có bảng/cột nào nói "ECONOMY ngồi BUSINESS +500K". | ADMIN phải tự nhập tay từng ghế trên từng chuyến → 300 ghế × N chuyến = không khả thi |
| **B** | **Không có ràng buộc chặn việc này.** `SeatMapService` chỉ kiểm tra `seat_type` tồn tại + active. Không kiểm tra `seat_type.seat_class` có khớp `fare_class.seat_class` của khách hay không. | Khách ECONOMY chọn ghế BUSINESS được, phụ thu = 0 |
| **C** | **Phase 3 chưa có endpoint chọn ghế.** Chưa có `SeatSelectionController`, chưa có `GET /flights/{id}/seats`, chưa có `POST /seat-holds`. Chỉ có entity `FlightSeat` + `SeatHold`. | Chưa thể hiện thực hoá luồng tính tiền |

### 3 phương án (cần bạn chọn)

#### Phương án 1 — Phụ thu theo cặp (seat_class → seat_class) ⭐ đề xuất

Thêm bảng cấu hình **`seat_class_surcharges`**:

```sql
CREATE TABLE seat_class_surcharges (
    id            BIGINT IDENTITY PRIMARY KEY,
    from_class    VARCHAR(20) NOT NULL,   -- hạng vé khách mua
    to_class      VARCHAR(20) NOT NULL,   -- hạng ghế vật lý
    surcharge     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (surcharge >= 0),
    is_active     BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (from_class, to_class)
);
-- seed:
-- ECONOMY → ECONOMY  = 0
-- ECONOMY → BUSINESS = 500000
-- ECONOMY → FIRST    = 1200000
-- BUSINESS → ECONOMY = 0     (nâng hạng thì ngồi hạng thấp: không phụ thu, không hoàn)
-- BUSINESS → FIRST   = 700000
-- FIRST → *          = 0
```

- **Ưu:** ADMIN cấu hình 1 lần, áp cho mọi chuyến. Đúng nghiệp vụ hãng bay thật (phụ thu nâng hạng).
- **Nhược:** không linh hoạt theo chuyến (chuyến Tết có thể muốn phụ thu cao hơn).
- **Ảnh hưởng:** thêm 1 bảng + 1 màn CRUD admin + migration V14.

#### Phương án 2 — Dùng `flight_seats.seat_surcharge` có sẵn

Giữ nguyên schema, chỉ cần **màn admin nhập phụ thu theo lô** khi tạo Seat Inventory cho chuyến.

- **Ưu:** không đổi schema, tận dụng cột đã có.
- **Nhược:** ADMIN phải nhập tay từng chuyến. Với 300 ghế/chuyến và nhiều chuyến → không thực tế. Có thể nhập theo "khối" giống seat map nhưng vẫn phải làm lại mỗi chuyến.
- **Phù hợp nếu:** đồ án chỉ demo vài chuyến.

#### Phương án 3 — Kết hợp ⭐⭐ thực tế nhất

- **Mặc định** lấy từ `seat_class_surcharges` (Phương án 1).
- **Ghi đè** được bằng `flight_seats.seat_surcharge` khi tạo inventory (Phương án 2).
- `seat_surcharge = 0` → dùng mặc định; `> 0` → ghi đè.

### Cần chốt thêm

1. **BUSINESS mua vé mà ngồi ghế ECONOMY** — có cho phép không?
   - Nếu cho: phụ thu = 0 (không hoàn tiền chênh lệch).
   - Nếu không: chặn ở API chọn ghế.
2. **FIRST** — seed hiện chỉ có 3 fare_class (ECONOMY, PREMIUM_ECONOMY, BUSINESS) nhưng `seat_types` có FIRST. Có cần bổ sung fare_class FIRST không?
3. **Phụ thu áp cho ai?** CHILD = 75% phụ thu? INFANT không có ghế riêng (BR-SEAT-04) → không áp.

### Việc cần làm nếu chọn Phương án 3

| Bên | Việc |
|---|---|
| BE | Migration V14 tạo `seat_class_surcharges` + seed |
| BE | Entity/Repository/Service/Controller CRUD cho bảng mới |
| BE | Phase 3: `SeatSelectionService` tính `surcharge = override > 0 ? override : default` |
| BE | Chặn ở API: `fare_class.seat_class` không được thấp hơn `seat_type.seat_class` (nếu chốt "không cho") |
| FE | Màn admin CRUD "Phụ thu nâng hạng" |
| FE | Màn chọn ghế khách: hiện phụ thu trên từng ghế + tổng tiền cập nhật realtime |

---

## VẤN ĐỀ 2 — Chưa có CRUD loại ghế để set màu

### Kiểm chứng: **CRUD ĐÃ CÓ**, nhưng thiếu 3 thứ

| Thành phần | Trạng thái |
|---|---|
| Route `/admin/seat-types` (list/new/:id/:id/edit) | ✅ có — `app.routes.ts:160` |
| Component `AdminSeatTypes` dùng `CrudPage` | ✅ có |
| Field `color_hex` trong form | ✅ có (`seat-types.ts:65`, type `text`, maxLength 7) |
| Service `SeatTypeService` → `/api/admin/seat-types` | ✅ có |
| BE CRUD đầy đủ + validate regex | ✅ có (`SeatTypeRequest.colorHex`) |

**Nhưng:**

| # | Thiếu | Hệ quả |
|---|---|---|
| **A** | **Không có link trên sidebar.** `admin-layout.ts` không có mục "Loại ghế" — chỉ có "Máy bay". | ADMIN **không tìm thấy đường vào**. Đây là lý do bạn nghĩ "chưa có CRUD" |
| **B** | **Ô nhập màu chỉ là `type: 'text'`.** Không có color picker, không có ô xem trước. | ADMIN phải gõ `#1E88E5` bằng tay — dễ sai, không thấy màu cho tới khi lưu |
| **C** | **Bảng danh sách không có cột màu.** `CrudColumn` chỉ hỗ trợ `value/tone/image/link/kind` — **không có `swatch`**. | Không thấy màu của từng loại ghế trong danh sách |

### Cách sửa (3 việc nhỏ)

1. **Thêm mục sidebar** "Loại ghế" vào nhóm "Danh mục hàng không", icon `event_seat`, path `/admin/seat-types`, `adminOnly: true`.
2. **Thêm `CrudFieldType = 'color'`** vào `crud-config.ts` + render ô `<input type="color">` kèm ô hex trong `crud-page.html`.
3. **Thêm `CrudColumn.swatch?: (row) => string | null`** + render ô vuông màu trong bảng.
   - Hoặc đơn giản hơn: dùng `image` với SVG data-URI — nhưng hacky, không nên.
   - Hoặc: thêm `kind: 'color'` vào `CrudColumn` — gọn hơn `swatch` riêng.

---

## VẤN ĐỀ 3 — Giao diện ghế của phi cơ có lỗi

### Lỗi thật (đã xác minh trong code)

#### 🔴 Lỗi 1 — Lưới ghế KHÔNG tô theo `color_hex`

`seat-grid.ts:58`:
```ts
protected classOf(seat: AircraftSeat): string {
  const cls = this.seatTypes().find((t) => t.id === seat.seat_type_id)?.seat_class ?? 'ECONOMY';
  return `cell cell--${cls.toLowerCase()}`;   // ← theo seat_class, KHÔNG theo color_hex
}
```

`seat-grid.css`:
```css
.cell--economy { background: var(--color-primary-bright); }
.cell--business { background: var(--color-accent); }
.cell--first { background: var(--color-danger); }
```

**Hệ quả:** 5 loại ECONOMY (`ECO`, `ECO_WIN`, `ECO_AIS`, `PREM_ECO`, `EXIT`) **cùng một màu xanh**. Không phân biệt được ghế thường với ghế thoát hiểm / ghế ưu tiên. Đúng vấn đề mà `color_hex` sinh ra để giải quyết.

#### 🔴 Lỗi 2 — Màu ghế có thể **không đọc được chữ**

`.cell { color: #fff }` cố định. Nếu ADMIN chọn màu sáng (ví dụ `#90CAF9` — đúng màu mock đang dùng!), chữ trắng trên nền sáng → **không đọc được**.

Mock data hiện tại: `ECO = #90CAF9` (xanh rất nhạt). Tô đúng màu này thì chữ trắng gần như vô hình.

→ Cần tính độ tương phản và đổi `color` sang đen khi nền sáng (WCAG AA ≥ 4.5:1).

#### 🟡 Lỗi 3 — Không có chú thích màu (legend)

Lưới có 8 loại ghế nhưng không có bảng chú giải. ADMIN nhìn màu không biết loại nào. Cần legend dưới lưới: ô màu + mã loại ghế.

#### 🟡 Lỗi 4 — Ghế không hiện phụ thu (liên quan Vấn đề 1)

Khi đã có phụ thu, lưới admin nên hiện phụ thu khi hover hoặc trong bảng chọn loại ghế.

#### 🟡 Lỗi 5 — `aria-label` thiếu tên loại ghế

`seat-grid.html:24`:
```html
[attr.aria-label]="'Ghế ' + row + col + ', loại ' + typeCode(seat.seat_type_id)"
```
`typeCode` trả mã (`ECO_WIN`), không phải tên (`Phổ thông - cửa sổ`). Screen reader đọc mã thô — kém tiếp cận. Nên dùng `seat_type_name`.

#### 🟡 Lỗi 6 — Không có trạng thái hover/focus rõ ràng

`.cell:hover { transform: scale(1.08) }` — chỉ phóng to, không đổi viền. Bàn phím Tab qua 300 ô thì **không biết đang ở ô nào** (không có `:focus-visible`).

### Lỗi tiềm ẩn (cần kiểm tra thêm khi chạy thật)

| # | Điểm | Rủi ro |
|---|---|---|
| A | `seatAt(row, col)` dùng `find()` trong vòng lặp lồng → **O(n²)**. 300 ghế × 300 ô = 90.000 phép so sánh mỗi lần render | Chậm khi sơ đồ lớn |
| B | `classOf()` gọi `find()` trên `seatTypes()` cho MỖI ô render | Nên precompute Map |
| C | `typeCode()` cũng `find()` mỗi ô | Như trên |
| D | Sơ đồ 300 ghế render 300 `<button>` trong 1 bảng | Có thể giật khi gõ vào ô khối (mỗi keystroke → regenerate) |

---

## Tổng hợp việc cần làm

### Cụm A — Sửa lỗi giao diện ghế (FE, ~1-2 giờ)
1. `seat-grid.ts`: tô theo `color_hex`, fallback theo `seat_class` khi null.
2. Tính độ tương phản → chữ trắng/đen tự động.
3. Thêm legend màu dưới lưới.
4. `aria-label` dùng tên loại ghế thay vì mã.
5. Thêm `:focus-visible`.
6. Precompute `Map<id, SeatType>` thay vì `find()` trong vòng lặp.

### Cụm B — Hoàn thiện CRUD loại ghế (FE, ~1 giờ)
7. Thêm mục sidebar "Loại ghế".
8. Thêm `CrudFieldType = 'color'` + color picker.
9. Thêm cột màu trong bảng danh sách.

### Cụm C — Phụ thu nâng hạng (BE + FE, lớn — cần chốt phương án)
10. Chốt phương án 1 / 2 / 3.
11. Migration + entity + CRUD (BE).
12. Màn admin cấu hình phụ thu (FE).
13. Phase 3: API chọn ghế tính phụ thu.

---

## Câu hỏi cần bạn quyết

1. **Phụ thu nâng hạng**: chọn Phương án 1 (bảng cấu hình), 2 (nhập tay mỗi chuyến), hay 3 (kết hợp)?
2. **BUSINESS mua vé ngồi ECONOMY**: cho phép (phụ thu 0) hay chặn?
3. **Có cần fare_class FIRST** không? (seed hiện chỉ có 3, thiếu FIRST dù seat_types có FIRST)
4. **Phụ thu cho CHILD**: 75% như giá vé, hay 100%?
5. **Thứ tự làm**: Cụm A (sửa lỗi ghế) trước, hay Cụm B (CRUD màu) trước?
