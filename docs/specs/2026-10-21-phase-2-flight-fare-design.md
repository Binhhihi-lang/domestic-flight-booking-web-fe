# Thiết kế — Phase 2: Flight & Fare (giao diện)

**Ngày:** 2026-10-21
**Repo:** `domestic-flight-booking-web-fe` (nhánh `feature/ghe-va-phu-thu`)
**Căn cứ:** API Design v0.4 mục 3 (Phase 2), DB v0.5 mục 3.3 (nhóm C), UI list (76 màn)
**Trạng thái BE:** Phase 2 **chưa có service/controller** — chỉ có entity + repository từ migration V5/V6. Toàn bộ đợt này chạy bằng mock.

---

## 1. Ý định

Khách tìm được chuyến bay thật và so sánh được giá theo **loại vé**, thấy rõ **thuế phí**.
Quản trị viên khai được chuyến, loại vé, giá bán, hành lý, quy định hoàn và tồn ghế —
đủ để Phase 3 (đặt vé) có dữ liệu mà chạy.

**Vì sao bây giờ:** Phase 1 đã đóng (auth, master data, nội dung). Phase 3 cần chuyến bay
và giá mới đặt được vé. Nếu để BE xong hết rồi FE mới làm, FE sẽ không kịp tiến độ.

---

## 2. Mục tiêu

1. Trang `/flights` chạy bằng dữ liệu (mock), nhận query string, có bộ lọc **loại vé** + hãng + giờ + giá, mỗi dòng chuyến hiện **giá thấp nhất + nhãn hạng vé + dòng `vé + thuế phí`**.
2. Hỗ trợ **cả một chiều và khứ hồi** trên trang kết quả.
3. 6 màn quản trị Phase 2 dùng chung khuôn `CrudPage`/form riêng như Phase 1.
4. Mock bám **đúng hợp đồng API v0.4**; phần hợp đồng còn thiếu (shape response tìm kiếm, tồn ghế theo hạng) do tài liệu này đề xuất và gửi BE đối chiếu.

## 3. Không làm (non-goals)

- Đặt vé, thanh toán, vé điện tử — thuộc Phase 3.
- Chuyến nối (multi-city), bay quá cảnh — dự án chỉ bán vé **bay thẳng**.
- Khứ hồi **nhiều chặng phức tạp** (open-jaw, nhiều điểm dừng) — chỉ hỗ trợ khứ hồi đơn giản 2 chặng.
- Sửa giá hàng loạt theo %, đồng bộ giá từ hệ thống ngoài.

## 4. Anti-goals (làm được mà vẫn coi là hỏng)

- Hiện giá thấp nhất **mà không nói hạng vé nào** → khách vào bước sau thấy giá khác, mất tin.
- Bộ lọc **không khớp** với dữ liệu trả về (đếm sai số chuyến, lọc hãng không có).
- Mock trả hình dạng **khác** API v0.4 → code viết theo mock vỡ khi nối BE.
- Màn quản trị cho **lưu dữ liệu không hợp lệ** (giờ đến trước giờ đi, giá chồng khoảng hiệu lực) mà BE sẽ từ chối.
- Bịa **giá gốc gạch ngang** khi không có nguồn dữ liệu → khách thấy giảm giá không có thật.

---

## 5. Ràng buộc

- **Angular 22 + Material 22 + Tailwind 3.4**, standalone component, `OnPush`.
- Dùng path alias `@core/@shared/@features`; `templateUrl` giữ tương đối.
- Tách `.html`/`.css` khỏi `.ts` (trừ component rất ngắn).
- Khu vực quản trị dùng sidebar + header breadcrumb + footer (không topbar ngang).
- Màu theo token thương hiệu VinaFly, responsive 375 → 1920.
- Mock theo `MockRegistry` + `MockResource` sẵn có; bật/tắt bằng `environment.useMock`.
- **User tự commit** — không tự ý commit/push.

---

## 6. Quyết định đã chốt cùng người dùng

| # | Vấn đề | Chốt |
|---|---|---|
| 1 | Loại vé hiển thị thế nào | **Hướng A** — thêm nhóm lọc "Loại vé" ở sidebar; tích thì danh sách chỉ còn chuyến có hạng đó và giá đổi theo hạng đã chọn |
| 2 | Chuyến không có hạng đang lọc | **Ẩn khỏi danh sách** |
| 3 | Thuế phí hiển thị ở đâu | **Tách ngay trên dòng chuyến**: giá gộp + dòng `Vé 760.000₫ + thuế phí 130.000₫` |
| 4 | Chưa tích hạng nào thì hiện giá gì | **Giá thấp nhất + nhãn hạng vé của giá đó** |
| 5 | Nguồn dữ liệu | **Mock theo hợp đồng API v0.4** |
| 6 | Phạm vi | **Toàn bộ Phase 2** |
| 7 | Chia đợt | **4 đợt**: khách → chuyến bay → loại vé + quy định hoàn → giá + hành lý + tồn ghế |
| 8 | Tồn ghế | **Màn riêng theo chuyến** `/admin/flights/:id/seat-inventory` |
| 9 | Hợp đồng response tìm kiếm chưa có | **Tài liệu này đề xuất shape**, ghi rõ để gửi BE đối chiếu |
| 10 | Bộ lọc tiện ích không có nguồn dữ liệu | **Bỏ bộ lọc tiện ích** và bỏ dòng tiện ích trên thẻ chuyến khỏi đợt này |
| 11 | Tồn ghế theo hạng vé | **Đề xuất BE thêm bảng tồn theo `(flight_id, fare_class_id)`**; trong lúc chờ, mock dựng sẵn theo shape đó |
| 12 | Khứ hồi | **Làm luôn cả khứ hồi** trong đợt 1 |

### Quyết định của người viết (cần người dùng kiểm khi đọc)

- **Lọc áp dụng ngay**, không có nút "Áp dụng" — kết quả đã nằm trong bộ nhớ.
- **Đếm số lượng trong bộ lọc tính trên tập kết quả đã lọc bởi các nhóm khác**, không phải toàn bộ kết quả. Nếu tính trên toàn bộ, khách tích hãng A rồi thấy "Bamboo 5" nhưng bấm vào lại rỗng.
- **Khoảng giá là một range 2 đầu** (min–max) thay vì slider một đầu như hiện tại, vì giá thay đổi theo hạng vé đã chọn.
- **Bỏ `oldPrice` (giá gốc gạch ngang)** — không có trường nào trong DB/API sinh ra nó; bịa ra là nói dối khách.
- **Bỏ nhóm lọc "Tiện ích"** và dòng tiện ích trên thẻ chuyến: `fare_rules` chỉ có hoàn vé, không có hành lý ký gửi hay đổi ngày.
- **Sắp xếp "Rẻ nhất" xếp theo giá của hạng đang chọn**, không theo giá tuyệt đối.
- **Query string giữ mã sân bay** (`from=HAN&to=DAD`) cho dễ đọc/chia sẻ; trang `/flights` tra sang id qua `PublicAirportService` trước khi gọi API.
- **Trạng thái bộ lọc khởi tạo là KHÔNG tích gì** (khác hiện tại: VN, VJ, sáng, chiều đang tích sẵn). Tích sẵn làm khách tưởng chỉ có mấy hãng đó.

---

## 7. Thiết kế

### 7.1 Trang khách `/flights`

**Hai chế độ: một chiều và khứ hồi.**

- **Một chiều**: một danh sách chuyến.
- **Khứ hồi**: hai bước trong cùng trang — chọn chuyến đi trước, rồi mới hiện danh sách chuyến về. Bước 2 có thanh tóm tắt chuyến đã chọn + nút "Đổi chuyến đi". Không chọn được chuyến về trước khi chọn chuyến đi.

**Đầu trang**: tuyến (`Hà Nội → Đà Nẵng`), ngày, số khách, hạng đang lọc, tổng số chuyến.
Nút "Sửa tìm kiếm" quay lại form ở trang chủ với query string hiện tại.

**Sidebar** — 4 nhóm, tất cả áp dụng ngay:

| Nhóm | Nguồn | Ghi chú |
|---|---|---|
| Hãng hàng không | suy từ kết quả tìm kiếm | kèm số chuyến |
| **Loại vé (mới)** | `fare_classes` đang hoạt động, có mặt trong kết quả | mỗi loại kèm dải giá; tích nhiều = HOẶC |
| Giờ khởi hành | 4 khung giờ | giữ nguyên |
| Khoảng giá | min–max của tập kết quả | range 2 đầu |

Không có nhóm "Tiện ích" — xem mục 6, quyết định 10.

**Dòng chuyến** — bố cục hiện tại giữ nguyên, khối giá đổi thành:

```
890.000₫                    ← giá gộp của hạng đang hiển thị
Phổ thông tiết kiệm         ← nhãn hạng (badge nhỏ)
Vé 760.000₫ + thuế phí 130.000₫
mỗi khách
[ Chọn ]
```

- Không có giá gạch ngang (xem mục 6).
- "Hết chỗ" khi tồn ghế của hạng đó bằng 0.
- "Bay thẳng" giữ nguyên (dự án chỉ bán bay thẳng).
- Giá hiển thị là **giá người lớn**. Khi có trẻ em/em bé, dòng "mỗi khách" đổi thành
  "tổng N khách" và tính theo tỉ lệ BE trả sẵn (trẻ em 75%, em bé 10%).

**Trạng thái**: đang tải (skeleton), rỗng (không có chuyến), lỗi (nút thử lại), không có kết quả sau khi lọc (nút xóa lọc).

**Query string**: `from`, `to` (mã IATA), `depart`, `return` (khi khứ hồi), `adults`, `children`, `infants`, `trip_type` (`ONE_WAY` | `ROUND_TRIP`).
Trang `/flights` tra `from`/`to` sang id qua `PublicAirportService` rồi gọi API với `departure_airport_id`/`arrival_airport_id`. Bắt buộc gửi `trip_type` theo API v0.4.

### 7.2 Màn quản trị

| Màn | Route | Khuôn | Ghi chú |
|---|---|---|---|
| Chuyến bay | `/admin/flights` | `CrudPage` + form riêng | Danh sách + thêm/sửa; nút Mở/Đóng bán riêng; cột dẫn sang tồn ghế |
| Loại vé | `/admin/fare-classes` | `CrudPage` | Mã, tên, `seat_class`, trạng thái |
| Quy định hoàn | `/admin/fare-rules` | `CrudPage` + form riêng | Theo `fare_class` + `version`; nhiều version theo thời gian |
| Giá theo chuyến | `/admin/flight-fares` | `CrudPage` + form riêng | Theo `(flight, fare_class)`; khoảng hiệu lực; chặn chồng lấn |
| Hành lý | `/admin/baggage-options` | `CrudPage` | Tên, kg, giá |
| Tồn ghế | `/admin/flights/:id/seat-inventory` | Màn riêng | Xem + khởi tạo tồn ghế theo sơ đồ máy bay |

### 7.3 Model + service + mock

**Model mới** (`@core/models/`): `flight.model.ts`, `fare.model.ts` (gồm `FareClass`, `FareRule`, `FlightFare`), `baggage.model.ts`.

Trường snake_case đúng hợp đồng v0.4. Response tìm kiếm trả **cả 3 giá** (`adult_price`, `child_price`, `infant_price`) vì BE tính sẵn.

**Service**:
- `PublicFlightService` — `search()`, `list()`, `getById()`
- `AdminFlightService`, `FareClassService`, `FareRuleService`, `FlightFareService`, `BaggageOptionService`, `SeatInventoryService`

**Mock**: mở rộng `MockRegistry`, thêm dữ liệu mẫu theo tuyến HAN–DAD để khớp trang hiện tại, đủ 3–4 hãng, mỗi chuyến 2–3 loại vé với giá và thuế khác nhau.

Mock cần handler riêng (ngoài `MockResource`, vốn chỉ lo list/get/create/update/delete/bulk):
- `GET /api/public/flights/search` — lọc theo tuyến/ngày/loại hành trình, trả shape ở mục 7.5
- `POST /api/admin/flights/{id}/activate` và `/deactivate`
- `GET /api/admin/flights/{id}/seat-map`, `PUT .../seat-inventory`

### 7.5 Đề xuất hợp đồng còn thiếu (gửi BE đối chiếu)

API v0.4 chỉ đặc tả object `flight_fares`, chưa có shape cho response tìm kiếm và chưa có tồn ghế theo hạng vé. Đề xuất:

**`GET /api/public/flights/search`** — trả `PageData<FlightSearchItem>`:

```json
{
  "flight_id": 55,
  "flight_number": "VN165",
  "airline": { "id": 1, "airline_code": "VN", "airline_name": "Vietnam Airlines", "logo_url": null },
  "aircraft": { "id": 3, "aircraft_code": "VN-A321-05", "model": "Airbus A321neo" },
  "departure_airport": { "id": 1, "airport_code": "HAN", "airport_name": "Nội Bài" },
  "arrival_airport": { "id": 3, "airport_code": "DAD", "airport_name": "Đà Nẵng" },
  "scheduled_departure": "2026-11-15T06:15:00Z",
  "scheduled_arrival": "2026-11-15T07:40:00Z",
  "duration_minutes": 85,
  "operation_status": "SCHEDULED",
  "sales_status": "OPEN",
  "fares": [
    {
      "fare_class_id": 2,
      "fare_class_code": "ECO_SAVER",
      "fare_class_name": "Phổ thông tiết kiệm",
      "seat_class": "ECONOMY",
      "base_fare": 760000.00,
      "tax_fee": 130000.00,
      "adult_price": 890000.00,
      "child_price": 667500.00,
      "infant_price": 89000.00,
      "currency": "VND",
      "seats_available": 4,
      "is_refundable": false
    }
  ]
}
```

Lý do từng phần:
- `fares[]` lồng trong chuyến — một request trả đủ để dựng danh sách + bộ lọc loại vé, không phải gọi N+1.
- `duration_minutes` tính sẵn — FE không phải trừ giờ, tránh lệch múi giờ.
- `seats_available` theo **từng hạng vé** — đây là chỗ schema hiện tại chưa có (xem dưới).
- `is_refundable` lấy từ `fare_rules` đang hiệu lực — đủ cho nhãn "hoàn vé" nếu sau này cần.
- Chỉ trả chuyến `sales_status = OPEN` và `operation_status` chưa hủy.

**Tồn ghế theo hạng vé — đề xuất thêm bảng:**

Schema hiện tại có `flight_seats` (ghế vật lý theo `seat_class`) nhưng không trả lời được "hạng Phổ thông tiết kiệm còn mấy chỗ" khi nhiều `fare_class` cùng `seat_class`. Đề xuất thêm bảng đếm:

```
flight_fare_inventory
  flight_id      BIGINT  FK → flights.id
  fare_class_id  BIGINT  FK → fare_classes.id
  seats_total    INT
  seats_sold     INT     DEFAULT 0
  UNIQUE (flight_id, fare_class_id)
```

Nếu Bình không muốn thêm bảng, phương án lùi: `seats_available` trả theo `seat_class` (mọi fare class cùng hạng ra cùng số) — chấp nhận được nhưng kém chính xác.

**Hai điểm khác cần BE xác nhận:**
1. `GET /public/flights/search` nhận `passengers` dạng số tổng, hay tách `adults`/`children`/`infants`? Giá trẻ em/em bé phụ thuộc số lượng từng loại, nên FE đề nghị tách.
2. Khứ hồi: một request trả cả hai chiều, hay hai request riêng (`departure_date` và `return_date`)? FE đề nghị **hai request riêng** — người dùng chọn chuyến đi trước rồi mới xem chuyến về, gọi một lần là tải thừa.

### 7.4 Phân đợt

| Đợt | Nội dung | Xong khi |
|---|---|---|
| 1 | Trang khách `/flights`: model, service, mock, bộ lọc loại vé, khối giá + thuế, **một chiều + khứ hồi**, sửa trang chủ phát `trip_type`/`return` | Build + test xanh; kiểm tra trình duyệt 1440/375 |
| 2 | Quản lý chuyến bay (CRUD + mở/đóng bán, gồm `parent_flight_id`) | Như trên |
| 3 | Loại vé + quy định hoàn | Như trên |
| 4 | Giá theo chuyến + hành lý + tồn ghế | Như trên |

Mỗi đợt kết thúc: `ng build` ✅, `ng test` ✅, kiểm tra trình duyệt thật, re-index codebase memory.

---

## 8. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Mock lệch hợp đồng → vỡ khi nối BE | Mỗi model đối chiếu trực tiếp mục 3 API v0.4 + DB v0.5; test khẳng định hình dạng response |
| Shape search do FE đề xuất, BE làm khác | Mục 7.5 ghi rõ đề xuất; gửi Bình trước khi bắt đầu đợt 1; model tách riêng để sửa một chỗ |
| Schema thiếu tồn ghế theo hạng | Mock dựng sẵn `seats_available`; nếu BE không thêm bảng thì lùi về đếm theo `seat_class` |
| BE đổi hợp đồng giữa chừng | Đợt 1 chốt model trước, các đợt sau chỉ thêm màn |
| Bộ lọc + sắp xếp chồng chéo gây bug | Viết hàm lọc/sắp xếp thuần (pure) và test riêng |
| Khứ hồi làm tăng độ phức tạp đợt 1 | Tách logic hai bước thành signal riêng; test luồng chọn đi → chọn về → đổi chuyến đi |
| Tồn ghế phức tạp (theo sơ đồ máy bay) | Dùng lại màn `seat-configurations` Phase 1 làm mẫu |

## 9. Để người triển khai quyết

- Bố cục chính xác của form chuyến bay (số trường nhiều, cần nhóm theo khối).
- Cách hiển thị dải giá trong nhóm lọc loại vé.
- Có cần màn chi tiết chuyến bay (chỉ đọc) hay bấm vào là sang form sửa.
- Cách bố trí bước 2 của khứ hồi (thay chỗ danh sách hay hiện thêm bên dưới).
