# Rà soát 4 file wireframe — nhật ký thực thi

> **Ngày:** 18/11/2026
> **Phạm vi:** `wf-01-dat-ve.html`, `wf-02-khu-hoi.html`, `wf-03-admin.html`, `wf-04-staff.html`
> **Nguồn chuẩn:** `docs/du-an/09-nghiep-vu-toan-dien.md`, `08-quyet-dinh-thiet-ke.md`, `06-man-hinh-va-luong.md`, DB migration V1–V17, API v0.4.
> **Nhánh làm việc:** `feature/hoàn-thiện-wireframe` (tách từ `feature/wireframe-khach-hang`).
> **Cách duyệt:** đã duyệt toàn bộ ngày 18/11/2026; tài liệu này giữ làm nhật ký quyết định và thay đổi.

---

## Trạng thái thực thi — 18/11/2026

Bạn đã duyệt toàn bộ các cụm và chốt: **D1 = mô hình mã đơn hàng riêng với PNR**, **D2 = A**, **D3 = A**, **D4 = A**, **D5 = A**, **D6 = B**, **D7 = A**, **D8 = A/B**, **D9 = B**, **D10 = chờ BE**, **D11 = mã hạng vé gồm mã hãng**.

Đã áp dụng xong trên nhánh `feature/hoàn-thiện-wireframe`:

| Cụm | Kết quả |
|---|---|
| 1. Thanh toán & giữ chỗ | Đồng hồ ≤ 15 phút; W-RT-21 hiện **mã đơn hàng DH-1049**, PNR chỉ hiện sau khi thanh toán; footer VNPay/VietQR; bỏ “trả tại quầy” |
| 2. Giá vé & hoàn vé | % hoàn theo 7 hạng vé; chính sách hoàn không tự hoàn tiền; W-ADM-26 sửa hạn 09:29, hoàn 90%, tổng 2.750.000, thêm nút huỷ; W-ADM-17 đủ 7 hạng; bỏ màn đổi ngày |
| 3. Khoang & dữ liệu nền | Bỏ FIRST; bỏ sân bay Bangkok; **mã hạng vé có tiền tố hãng** (`VN_ECON_SAVER`, `VJ_ECON_FLEX`); tuổi NL ≥12 / TE 2–11; note hồ sơ 2 khối |
| 4. Trạng thái & quản trị | “Sắp hết” thành badge tồn ghế; cột Vận hành hiện đúng enum; W-ADM-23 mở dropdown 7 trạng thái; staff dashboard bỏ doanh thu; user list bỏ checkbox; chuông ghi rõ placeholder |
| 5. Cấu trúc & mobile | wf-01 còn đúng 4 màn; wf-02 còn 44 màn / 88 artboard; bổ sung mobile cho W-RT-13, 15, 17a, 25, 27, 09a, 02b; danh mục B có nút “Xem tất cả” |
| 6. Khoảng cách | Không sửa theo D9=B; giữ kết quả đo 0 overflow |
| 7. Đã đúng | Không đụng |

**Việc còn lại ngoài wireframe:** D10 — sửa seed BE `BIZ_STANDARD` 80% → 90% và migration V18 đổi mã hạng vé có tiền tố hãng (chờ Bình); cập nhật mock/service FE sang mã mới; triển khai bảng/API notifications theo `00-nghiep-vu-thong-bao.md`.

---

## 0. Trạng thái working tree hiện tại

Toàn bộ các cụm đã được áp dụng **chưa commit** trên nhánh `feature/hoàn-thiện-wireframe`:

```
docs/design/wf-01-dat-ve.html        | 974 dòng (cắt 3 màn trùng)
docs/design/wf-02-khu-hoi.html       | 819 dòng (sửa nội dung + mobile)
docs/design/wf-03-admin.html         | 162 dòng
docs/design/wf-04-staff.html         |  76 dòng
docs/du-an/03-co-so-du-lieu.md       |   7 dòng
docs/du-an/06-man-hinh-va-luong.md   |  13 dòng
docs/du-an/09-nghiep-vu-toan-dien.md |   8 dòng
docs/design/00-ra-soat-wireframe.md  | file mới
docs/design/00-nghiep-vu-thong-bao.md| file mới
```

Đã kiểm tra lại sau khi sửa: `<section>`/`<div>`/`<table>` cân bằng 100% ở cả 4 file; đo Chrome 1440/375: **0 overflow, 0 nội dung bị cắt**.

---

## 1. Quyết định cần bạn chốt trước

| Mã | Vấn đề | Lựa chọn | Đề xuất |
|---|---|---|---|
| **D1** | Mã hiển thị trước khi thanh toán | **CHỐT 18/11/2026:** vẫn tạo booking `PENDING_PAYMENT` để giữ ghế 15 phút, nhưng trước khi thanh toán chỉ hiển thị **mã đơn hàng** (lấy từ `bookings.id`, format `DH-xxxx`); **mã đặt chỗ (PNR)** chỉ hiện sau khi thanh toán thành công. `bookings.booking_code` vẫn là PNR, sinh/hiển thị sau khi thanh toán. | Đã áp dụng ở wireframe; BE cần đảm bảo không trả PNR trước khi thanh toán |
| **D2** | Tuổi hành khách | **A.** NL ≥ 12 · TE 2–11 · EB < 2 (doc 09 §5.2). **B.** NL ≥ 13 · TE 2–12 · EB < 2 (wireframe + doc 06). | **A** theo chuẩn hàng không; nhưng phải sửa wireframe + doc 06 |
| **D3** | Cơ sở tính % hoàn | **A.** Trên giá vé đã gồm thuế & phí (W-RT-26 đang nói vậy). **B.** Trên giá vé không gồm thuế & phí (W-ADM-18a đang nói vậy). | **A** — khách chỉ thấy một giá trọn gói, không tách thuế |
| **D4** | Admin có được huỷ hộ booking? | **A.** Có — QĐ-13 ghi “admin booking read-only + hành động huỷ”. **B.** Không — giữ như W-ADM-26 hiện tại (“khách tự huỷ”). | Cần bạn chốt; nếu **A** thêm nút Huỷ + xác nhận vào W-ADM-26 |
| **D5** | Chuông thông báo trên header admin/staff | **A.** Giữ nhưng ghi rõ là placeholder, không có màn danh sách thông báo. **B.** Bỏ chuông + note “mở danh sách việc cần xử lý”. | **A** — nhưng phải bỏ câu hứa “mở danh sách việc cần xử lý” |
| **D6** | Màn “Đổi ngày bay” W-RT-08a | **A.** Giữ và bổ sung `change_fee`/API đổi ngày (ngoài phạm vi hiện tại). **B.** Bỏ khỏi wireframe vì DB `fare_rules` chỉ có hoàn vé, API chưa có endpoint đổi ngày, và W-ADM-26 ghi “đổi chuyến ngoài phạm vi Phase 1–3”. | **Đã chốt B** — đã bỏ màn, nút và phí đổi ngày |
| **D7** | wf-01 còn 7 artboard dù bìa ghi “4 màn nhập liệu” | **A.** Cắt W-BOK-03/04/05 (đã có bản đầy đủ ở WF-02). **B.** Giữ và sửa lại bìa/endnote cho đúng 7 màn. | **A** — tránh 2 bản trôi lệch nhau |
| **D8** | 12 artboard mobile mỏng hơn desktop | **A.** Bổ sung đủ nội dung mobile trước mockup. **B.** Chấp nhận mobile là bản rút gọn, ghi chú rõ trong tài liệu. | **A** cho các màn S-tier; **B** cho màn danh mục phụ |
| **D9** | Chuẩn hoá khoảng cách/token | **A.** Chuẩn hoá ngay trong wireframe. **B.** Giữ wireframe, chỉ áp token khi làm mockup. | **B** — wireframe không cần đúng token 4px; mockup mới là nơi chốt |
| **D10** | Seed BE `BIZ_STANDARD` | V16 đang cho `BIZ_STANDARD` = **80%** (nhánh ELSE), tài liệu + wireframe ghi **90%**. | Sửa seed BE thành 90% (việc của Bình) |
| **D11** | Mã hạng vé trùng giữa các hãng | **CHỐT 18/11/2026:** mã hạng vé lưu đầy đủ `<mã_hãng>_<mã_hạng>` (`VN_ECON_SAVER`, `VJ_ECON_FLEX`…), duy nhất toàn hệ thống. | Đã áp dụng wireframe/docs; BE cần migration V18 |

---

## 2. Cụm 1 — Thanh toán & giữ chỗ

### 1.1 Đồng hồ giữ chỗ vượt 15 phút — **ĐÃ SỬA, chờ duyệt**
- **Hiện trạng:** `29:41` (wf-01: 4 chỗ; wf-02: 10 chỗ), `29:12`, `18:40` — đều lớn hơn hạn 15 phút.
- **Đã sửa:** `29:41 → 12:35`, `29:12 → 11:52`, `18:40 → 08:30` ở cả desktop, mobile và phần ghi chú.
- **Còn lại:** W-ADM-26 ghi `09:14 → 09:44` = 30 phút (mục 2.4).
- [x] Đã duyệt & áp dụng 1.1

### 1.2 W-RT-21 hiện PNR trước khi thanh toán — **CHỜ CHỐT D1**
- **Vị trí:** W-RT-21, khối “Mã đặt chỗ AB3K9F” (desktop + mobile).
- **Vấn đề:** cổng VNPay chưa xác nhận nhưng đã hiện mã đặt chỗ.
- **Chốt 18/11/2026:** booking vẫn tạo trước để giữ ghế, nhưng W-RT-21 hiện **mã đơn hàng DH-1049** và ghi “Mã đặt chỗ (PNR) sẽ hiện sau khi thanh toán thành công”. Áp dụng tương tự cho đơn chờ thanh toán ở W-RT-09, W-ADM-25, W-STF-01, W-STF-06: cột “Mã đơn / PNR”, đơn chưa thanh toán chỉ có mã đơn.
- **DB/API:** `bookings.id` dùng làm mã đơn hàng; `bookings.booking_code` vẫn là PNR nhưng không trả/hiển thị trước khi thanh toán.
- [x] Đã duyệt & áp dụng

### 1.3 Footer hiển thị VISA / MoMo — **ĐÃ SỬA, chờ duyệt**
- **Hiện trạng:** mọi footer khách ghi `VISA · Napas · MoMo`.
- **Vấn đề:** QĐ-11 chỉ cho VNPay + chuyển khoản; không thẻ tín dụng, không ví MoMo.
- **Đã sửa:** `VNPay · VietQR · Napas 247` ở wf-01 và wf-02.
- [x] Đã duyệt & áp dụng 1.3

### 1.4 wf-01 còn câu “trả tại quầy”
- **Vị trí:** W-BOK-04 (Vé điện tử), ghi chú trạng thái: “Chờ xác nhận — dùng cho chuyển khoản / trả tại quầy”.
- **Đề xuất:** nằm trong D7 (cắt W-BOK-03/04/05) hoặc sửa thành “Chờ xác nhận — dùng cho chuyển khoản”.
- [x] Đã duyệt & áp dụng 1.4

### 1.5 Nhãn “Ví điện tử VNPay” (P2)
- **Vị trí:** W-RT-06/W-RT-21.
- **Vấn đề:** VNPay là cổng thanh toán, không chỉ ví điện tử.
- **Đề xuất:** đổi thành “Cổng thanh toán VNPay”.
- [x] Đã duyệt & áp dụng 1.5

### 1.6 Tổng tiền các màn đã khớp
- W-RT-05 → W-RT-06: `2.580.000 + 3.780.000 + 240.000 − 100.000 = 6.500.000 ₫` — đúng.
- Riêng khoản “Phụ thu ghế · 4 ghế = 240.000 ₫” xem mục 2.6.

---

## 3. Cụm 2 — Giá vé, hạng vé & hoàn vé

### 2.1 % hoàn sai — **ĐÃ SỬA, chờ duyệt**
| Vị trí | Trước | Sau | Chuẩn |
|---|---|---|---|
| W-RT-02a, ECON_FLEX (thẻ + bảng so sánh + mobile) | 80% | **90%** | V16/V17 |
| W-RT-02b, PREM_ECO_FLEX (desktop + mobile) | 100% | **95%** | V16/V17 |
| W-RT-07a, ECON_STANDARD | “Mất 30% trước 24h” | **“Hoàn 80% trước 24h”** | V16/V17 |
| W-RT-07a, mã hạng | `ECONOMY` | **`ECON_STANDARD`** | 7 mã hạng vé |

- [x] Đã duyệt & áp dụng 2.1

### 2.2 Trang Chính sách hoàn vé gộp theo hạng dịch vụ — **ĐÃ SỬA, chờ duyệt**
- **Hiện trạng:** Phổ thông 80% · PTĐB 80% · Thương gia 90%, trong khi chính trang đó nói “mức hoàn phụ thuộc hạng vé”.
- **Đã sửa:** bảng theo đúng 7 hạng vé (0 / 80 / 90 / 85 / 95 / 90 / 100), cả desktop và mobile.
- **Đã sửa:** câu “tiền hoàn về phương thức thanh toán trong 7–15 ngày” → “VinaFly không tự hoàn tiền; khách liên hệ đại lý…” (QĐ-04, BR-P3-07).
- [x] Đã duyệt & áp dụng 2.2

### 2.3 W-ADM-18a: cơ sở tính % hoàn — **CHỜ CHỐT D3**
- **Vị trí:** wf-03, W-ADM-18a, dòng 4719.
- **Hiện trạng:** “Phần trăm hoàn tính trên giá vé, **không gồm thuế và phí**”.
- **Mâu thuẫn:** W-RT-26 ghi thuế/phí nằm trong giá vé và hoàn theo cùng tỉ lệ.
- **Đề xuất D3 = A:** đổi thành “tính trên giá vé đã gồm thuế và phí”.
- [x] Đã duyệt & áp dụng 2.3

### 2.4 W-ADM-26 (Đặt chỗ — chi tiết) sai số & thiếu hành động
| Mục | Hiện trạng | Đề xuất |
|---|---|---|
| Hạn thanh toán | tạo 09:14, hạn 09:44 = **30 phút** | 09:29 (15 phút) |
| Hạng vé “Linh hoạt” | “Hoàn 80% trước 24h” | **90%** (ECON_FLEX) |
| Tổng tiền | danh sách 2.660.000 ₫, chi tiết 2.610.000 ₫ | thống nhất **2.610.000 ₫** (theo bảng cộng trừ chi tiết) |
| Nút huỷ | không có; note “không huỷ hộ khách” | chờ **D4** |

- [x] Đã duyệt & áp dụng 2.4

### 2.5 W-ADM-17 (Hạng vé) lệch seed
- **Hiện trạng:** 6 dòng, thiếu `ECON_STANDARD` và `PREM_ECO_FLEX`, lại có `ECON_PROMO` không có trong seed 7 hạng vé.
- **Đề xuất:** hiển thị đúng 7 hạng vé seed; bỏ `ECON_PROMO` khỏi danh sách (hoặc thêm cột “nguồn seed/demo” nếu muốn giữ).
- [x] Đã duyệt & áp dụng 2.5

### 2.6 W-RT-05: phụ thu ghế 4 ghế = 240.000 ₫
- **Hiện trạng:** chặng đi chọn 5A (thoát hiểm 120.000 ₫) + 2B (0 ₫); chặng về thuộc khoang Thương gia/PTĐB, phụ thu 0 ₫. Tổng hợp lý là **120.000 ₫**, nhưng màn thanh toán ghi **240.000 ₫**.
- **Đề xuất:** chốt lại dữ liệu mẫu: hoặc 2 ghế thoát hiểm ở chặng đi, hoặc sửa tổng về 120.000 ₫.
- [x] Đã duyệt & áp dụng 2.6

### 2.7 Màn “Đổi ngày bay” W-RT-08a — **ĐÃ ÁP DỤNG, D6 = B**
- **Vấn đề:** `fare_rules` chỉ có `is_refundable`, `refund_min_hours_before_departure`, `refund_percent`; **không có phí đổi ngày**; API v0.4 **không có endpoint đổi ngày**; wf-03 W-ADM-26 ghi “không thiết kế hoàn tiền/đổi chuyến — ngoài phạm vi Phase 1–3”.
- **Hiện trạng wireframe:** W-RT-08a + các nút “Đổi ngày bay” + phí 500.000/250.000 ₫ + “miễn phí 1 lần”.
- **Đề xuất D6 = B:** bỏ màn + các nút/phí liên quan khỏi wireframe.
- [x] Đã duyệt & áp dụng 2.7

### 2.8 Seed BE lệch tài liệu
- V16: `BIZ_STANDARD` rơi vào `ELSE 80` → **80%**, trong khi doc 09 §2.3 và W-ADM-18 ghi **90%**.
- **Đề xuất:** Bình sửa V16/V17 thành 90% (hoặc chốt lại tài liệu nếu 80% mới đúng).
- [ ] Chờ Bình sửa seed BE (V16/V17) thành 90%

### 2.9 Giá trẻ em / em bé
- Đã kiểm: 75% / 10% của giá người lớn (base + tax) — khớp `flight_fares` và W-ADM-20a. Không sửa.

---

## 4. Cụm 3 — Khoang, hạng vé & dữ liệu nền

### 3.1 Dòng FIRST trong W-ADM-16 — **ĐÃ SỬA một phần**
- **Đã sửa:** xoá dòng `FIRST / Hạng nhất` khỏi bảng.
- **Còn sót:** note dòng 4074 “Hạng nhất ở trạng thái ‘Không dùng’…” — đề xuất đổi thành “Mô hình nội địa không có Hạng nhất; chỉ mở lại khi mở rộng bay quốc tế.”
- [x] Đã duyệt & áp dụng 3.1

### 3.2 Sân bay quốc tế trong dropdown nội địa — **ĐÃ SỬA, chờ duyệt**
- **Hiện trạng:** W-RT-01a có “Sân bay Quốc tế Bangkok Suvarnabhumi (BKK) — Thái Lan”.
- **Đã sửa:** thay bằng “Sân bay Quốc tế Cam Ranh (CXR) — Nha Trang, Việt Nam”.
- [x] Đã duyệt & áp dụng 3.2

### 3.3 Nhãn “Hạng ghế” còn sót
- **Vị trí:** wf-01, W-BOK-01, dòng 550: `<span>Hạng ghế</span><b>Phổ thông</b>`.
- **Đề xuất:** “Hạng dịch vụ”.
- [x] Đã duyệt & áp dụng 3.3

### 3.4 Mã hạng vé trong thẻ chọn hạng
- **Vị trí:** W-RT-02a và W-RT-02b, các dòng mã hạng vé (desktop + mobile).
- **Đã sửa:** `ECONOMY · SAVER` → `VJ_ECON_SAVER`, `ECONOMY · STANDARD` → `VJ_ECON_STANDARD`, `ECONOMY · FLEX` → `VJ_ECON_FLEX` (chuyến VJ 123).
- [x] Đã duyệt & áp dụng 3.4

### 3.4a Mã hạng vé phải gồm mã hãng — **BỔ SUNG 18/11/2026**
- **Quy tắc:** mã lưu đầy đủ = `<mã_hãng>_<mã_hạng>`; ví dụ `VN_ECON_SAVER`, `VJ_ECON_FLEX`, `QH_BIZ_STANDARD`.
- **Lý do:** mỗi hãng có cùng 7 tên hạng vé; nếu mã chỉ là `ECON_SAVER` thì trùng giữa các hãng và không tra cứu được.
- **Đã sửa:** toàn bộ màn admin (W-ADM-17, 17a, 18, 18a, 20a, 26, 37), khách (W-RT-02a, 02b, 07a) và staff (W-STF-07); docs 03 và 09.
- **BE cần làm:** migration **V18** đổi `fare_classes.fare_class_code` hiện có sang dạng có tiền tố hãng và chuyển unique index về `fare_class_code` toàn hệ thống (xem mục 9).
- [x] Đã duyệt & áp dụng 3.4a

### 3.5 Tuổi hành khách — **ĐÃ ÁP DỤNG, D2 = A**
- Wireframe: NL ≥ 13 · TE 2–12 · EB < 2 (ổn định ở 4 vị trí).
- Doc 09 §5.2: ADULT ≥ 12 · CHILD 2–11 · INFANT < 2.
- **Đề xuất:** chốt D2 rồi sửa một lần cho cả wireframe + doc 06/09.
- [x] Đã duyệt & áp dụng 3.5

### 3.6 Note hồ sơ cá nhân — **ĐÃ SỬA, chờ duyệt**
- **Hiện trạng:** “Ba khối: ảnh đại diện · thông tin liên hệ · giấy tờ tuỳ thân”, trong khi note ngay dưới nói đã bỏ khối giấy tờ.
- **Đã sửa:** “Hai khối: ảnh đại diện · thông tin liên hệ”.
- [x] Đã duyệt & áp dụng 3.6

### 3.7 Từ vựng “khoang” / “hạng dịch vụ”
- **Wireframe:** dùng đúng — “khoang” chỉ ở sơ đồ ghế/khoang vật lý; bộ lọc và bảng dùng “hạng dịch vụ”.
- **Tài liệu lệch:** doc 06 dòng 170 vẫn ghi bộ lọc “hạng vé”; doc 09 §4.3 ghi “bộ lọc là khoang”. Đề xuất sửa tài liệu thành “hạng dịch vụ”. (Không phải lỗi wireframe.)
- [x] Đã duyệt & áp dụng 3.7 (sửa docs)

---

## 5. Cụm 4 — Trạng thái chuyến bay & màn quản trị

### 4.1 “Sắp hết” đang bị dùng như trạng thái vận hành — **CHỜ DUYỆT**
- **Vị trí:**
  - W-ADM-22 (danh sách chuyến): cột **Vận hành** hiện “Sắp hết”.
  - W-ADM-24 (chi tiết): header “Vận hành: **Sắp hết**”, nhưng dòng chi tiết lại ghi “Đã lên lịch (SCHEDULED)”.
  - W-STF-01/02 (staff): cột **Vận hành** cũng hiện “Sắp hết”.
- **Vấn đề:** “Sắp hết” là cảnh báo tồn ghế, không thuộc enum `operation_status`.
- **Đề xuất:** cột “Vận hành” hiện đúng 7 trạng thái; “Sắp hết” chuyển thành badge cạnh cột “Ghế trống”.
- [x] Đã duyệt & áp dụng 4.1

### 4.2 Dropdown “Trạng thái vận hành” — **CHỜ DUYỆT**
- **Hiện trạng:** W-ADM-23 có select “Trạng thái vận hành” nhưng chỉ hiện một giá trị “Bản nháp (DRAFT)”, không thấy danh sách.
- **Đề xuất:** thêm artboard **W-ADM-23a — dropdown đang mở** trong luồng sửa chuyến, gồm 7 lựa chọn:

| Giá trị | Nhãn | Điều kiện |
|---|---|---|
| `DRAFT` | Bản nháp | Mặc định khi tạo |
| `SCHEDULED` | Đã lên lịch | Đã có giá + tồn ghế |
| `BOARDING` | Lên máy bay | Từ SCHEDULED/DELAYED |
| `DELAYED` | Trễ | Từ SCHEDULED/BOARDING |
| `DEPARTED` | Đã cất cánh | Khoá sửa lịch |
| `ARRIVED` | Đã hạ cánh | Kết thúc |
| `CANCELLED` | Đã huỷ | Trước DEPARTED; tự đóng bán; không tự hoàn tiền |

- Trạng thái bán (`OPEN/CLOSED`) vẫn là toggle riêng.
- [x] Đã duyệt & áp dụng 4.2

### 4.3 W-ADM-26 thiếu hành động huỷ — **CHỜ CHỐT D4**
- QĐ-13: “màn admin Booking là read-only + hành động hủy”.
- W-ADM-26: chỉ đọc, note “không huỷ hộ khách”.
- **Đề xuất D4 = A:** thêm nút “Huỷ đặt chỗ” + hộp xác nhận, ghi rõ “không tự hoàn tiền; khách liên hệ đại lý”.
- [x] Đã duyệt & áp dụng 4.3

### 4.4 Staff dashboard có “Doanh thu hôm nay”
- **Vị trí:** W-STF-01, thẻ số liệu thứ 3: 412 triệu.
- **Vấn đề:** doc 09 §5.8 định nghĩa dashboard vận hành gồm chuyến/ghế/booking; chính note của màn ghi “không lặp lại báo cáo doanh thu của admin”.
- **Đề xuất:** thay bằng “Tỷ lệ lấp đầy hôm nay” (hoặc số ghế đã bán), bỏ số tiền.
- [x] Đã duyệt & áp dụng 4.4

### 4.5 W-ADM-03 (Người dùng) có cột tích chọn
- **Vấn đề:** doc 09 §3.3 “Không có bulk cho user”, nhưng bảng có cột checkbox như các master data khác.
- **Đề xuất:** bỏ cột tích chọn ở W-ADM-03 (và kiểm tra W-ADM-04/05 không có bulk).
- [x] Đã duyệt & áp dụng 4.5

### 4.6 Chuông thông báo — **CHỜ CHỐT D5**
- **Hiện trạng:** mọi artboard admin/staff có chuông + chấm chưa đọc; note “Chuông trên header mở danh sách việc cần xử lý”.
- **Vấn đề:** bảng `notifications` **chưa được tạo** (doc 03 §6.5: “đừng thiết kế màn phụ thuộc vào nó”).
- **Đề xuất D5 = A:** giữ chuông như placeholder tĩnh, bỏ câu hứa mở danh sách; hoặc B: bỏ chuông.
- [x] Đã duyệt & áp dụng 4.6

### 4.7 Route Báo cáo & thống kê (P2)
- Wireframe: `/admin/reports`; doc 06 F25: `/admin/dashboard`. Đề xuất chốt `/admin/reports` và cập nhật doc 06.
- [x] Đã duyệt & áp dụng 4.7

---

## 6. Cụm 5 — Cấu trúc tài liệu & mobile

### 5.1 wf-01 còn 3 màn trùng WF-02 — **CHỜ CHỐT D7**
- **Hiện trạng:** bìa ghi “chỉ giữ 4 màn nhập liệu, các màn thanh toán/vé/chi tiết đã dồn về WF-02”, nhưng file vẫn có:
  - `W-BOK-03` Thanh toán (dòng 1639)
  - `W-BOK-04` Vé điện tử (dòng 1962)
  - `W-BOK-05` Chi tiết đặt chỗ (dòng 2250)
- **Hệ quả:** nội dung cũ (footer VISA/MoMo, “trả tại quầy”, đồng hồ 29:41) và endnote nói “5 màn/prototype” — trái với bìa.
- **Đề xuất D7 = A:** cắt 3 section, cập nhật endnote.
- [x] Đã duyệt & áp dụng 5.1

### 5.2 Mobile chưa đủ nội dung — **CHỜ CHỐT D8**
Các artboard mobile có lượng chữ < 30% desktop (đo bằng DOM, không phải cảm tính):

| Màn | Desktop | Mobile | Tỉ lệ |
|---|---|---|---|
| W-RT-02b Chi tiết chuyến | 2.967 | 652 | 22% |
| W-RT-05 Chọn ghế | 1.487 | 363 | 24% |
| W-RT-05a Chọn ghế Thương gia | 1.626 | 349 | 21% |
| W-RT-29/29a Hãng bay | 1.204/1.622 | 190/350 | 16/22% |
| W-RT-30 Sân bay | 1.374 | 230 | 17% |
| W-RT-31 Thành phố | 1.174 | 174 | 15% |
| W-RT-17a Chi tiết voucher | 2.141 | 330 | 15% |

- **Ví dụ rõ nhất:** W-RT-13 mobile chỉ có bước 1/3; W-RT-30 mobile ghi “9 sân bay” nhưng chỉ vẽ 3.
- **Đề xuất:** bổ sung trước mockup cho các màn S/A-tier; màn danh mục phụ có thể ghi chú “rút gọn”.
- [x] Đã duyệt & áp dụng 5.2

### 5.3 Đếm màn / artboard sau rà soát
- wf-02: **44 màn / 88 artboard** (44 desktop + 44 mobile) — đủ cặp.
- wf-03: **50 màn / 51 artboard** (W-ADM-37 có 2 artboard).
- wf-04: **9 màn / 9 artboard** (chỉ desktop).
- wf-01: **7 artboard** — nếu D7 = A còn **4**.

---

## 7. Cụm 6 — Khoảng cách & design token

### 7.1 Kết quả đo thật bằng Chrome
Đo trên trang thật ở bề rộng 1440 px (desktop) và 375 px (mobile), không dùng iframe ẩn:

| File | Artboard đo | Overflow ngang | Nội dung bị cắt | Hàng thẻ lệch cao |
|---|---|---|---|---|
| wf-01 | 7 × (1440+375) | 0 | 0 | 0 |
| wf-02 | 45 × (1440+375) | 0 | 0 | 0 |
| wf-03 | 51 × 1440 | 0 | 0 | 0 |
| wf-04 | 9 × 1440 | 0 | 0 | 0 |

**Kết luận:** không có lỗi vỡ layout/khoảng cách ở cấp artboard. Chiều cao artboard wf-03 đồng loạt 1.185 px do `.shell { min-height: 900px }` — đây là khung tài liệu, không phải lỗi màn hình.

### 7.2 Lệch thang giữa 4 tài liệu
| Thuộc tính | wf-01 / wf-02 (khách) | wf-03 / wf-04 (quản trị) |
|---|---|---|
| Header | 66 px | 56 px |
| Padding trang | `30px 32px 44px` | `22px 24px 26px` |
| Nút chuẩn | 38–40 px / padding 18–26 | 36 px / padding 16 |
| Nút nhỏ | 30 px / 12 | 28 px / 11 |
| Input | 40 px / 12 | 38 px / 11 |
| Khoảng cách giữa màn (`.row`) | 56 px | 52 px |

- Hai bộ kích thước này có thể là **chủ ý** (khách thoáng hơn, quản trị dày hơn), nhưng hiện chưa được ghi thành token.
- Giá trị lẻ đang dùng rộng rãi: `7 / 9 / 10 / 11 / 13 / 14 / 15 / 18 / 20 / 22 / 26 / 28 / 30 / 34`, trong khi Design System quy định thang `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`.
- **Đề xuất D9 = B:** không sửa hàng trăm giá trị lẻ trong wireframe; khi làm mockup mới snap về token và chốt hai mật độ (khách / quản trị) thành token riêng.
- [x] Đã chốt D9=B — không sửa khoảng cách trong wireframe, áp token ở mockup

### 7.3 Việc cần làm nếu muốn chuẩn hoá ngay (D9 = A)
1. Tạo token `--space-*` cho từng file.
2. Thay các cặp `10/14/18/22/26` bằng `8/12/16/24/32` theo ngữ cảnh.
3. Đồng bộ nút/input/header giữa 4 file.
4. Đo lại overflow + chụp ảnh 1440/375 trước khi chốt.

---

## 8. Cụm 7 — Đã kiểm tra và đang đúng (không sửa)

- Giữ chỗ **15 phút** trong toàn bộ text (sau khi sửa đồng hồ).
- Chỉ bán **bay thẳng nội địa**; đã bỏ điểm dừng/điểm dừng trong bộ lọc (sau khi bỏ BKK).
- Chọn ghế **chỉ trong khoang của hạng vé đã mua**; W-RT-05a khoang Thương gia không hiện loại ghế.
- Dòng “Phụ thu ghế · 0 ₫” vẫn hiện ở khoang Thương gia/PTĐB — đúng yêu cầu đối chiếu.
- Phụ thu theo **loại ghế**, không có phụ thu đổi khoang; đã bỏ màn Phụ thu nâng hạng.
- 9 hành khách tối đa; em bé ≤ người lớn; em bé không chọn ghế.
- Giá vé **trọn gói** đã gồm thuế/phí; admin nhập `base_fare` + `tax_fee` gộp một cột.
- Thanh toán chỉ **VNPay + chuyển khoản VietQR** (sau khi sửa footer); VNPay là chuyển hướng, QR chỉ ở W-RT-06a.
- Voucher chọn **từ ví**, không nhập mã; mỗi khách 1 lần/voucher; mỗi booking 1 voucher; cộng dồn với khuyến mãi.
- Khuyến mãi **tự động**, không giới hạn lượt/khách (sau khi sửa copy).
- Master data xoá mềm; bulk tối đa 100; không bulk user (trừ cột checkbox cần bỏ — mục 4.5).
- RBAC: Vai trò/Quyền chỉ đọc; STAFF không vào master data/user.
- Tin tức: `DRAFT/PUBLISHED/UNPUBLISHED`; phải có chuyên mục trước khi publish; public chỉ thấy PUBLISHED.
- Sơ đồ ghế: khoang suy ra từ loại ghế; màu theo `color_hex`; lối đi `aisle_after`; tổng ghế = sức chứa.
- Không có ví tiền, không có hoàn tiền tự động, không có thẻ tín dụng/trả tại quầy (sau khi bỏ câu ở 1.4).

---

## 9. Cách thực thi sau khi duyệt

1. Bạn trả lời: `Duyệt cụm 1,2,4` + `D1=A, D2=A, D3=A, D4=A, D5=A, D6=B, D7=A, D8=A, D9=B` (ví dụ).
2. Tôi sửa đúng cụm được duyệt, **không đụng cụm chưa duyệt**.
3. Sau mỗi cụm: kiểm tra tag balance, mở Chrome đo lại 1440/375, gửi diff tóm tắt để bạn duyệt.
4. Bạn tự commit (theo quy ước của bạn); tôi không commit/push.

### Lệnh kiểm tra nhanh (PowerShell, một dòng)

```powershell
git checkout -b "feature/hoàn-thiện-wireframe"
git status
git diff -- docs/design
```

Nếu tên nhánh có dấu gây lỗi trên máy, dùng: `feature/hoan-thien-wireframe`.

### 9.1 Migration V18 đề xuất cho BE (mã hạng vé gồm mã hãng)

```sql
-- V18__fare_class_code_with_airline.sql
-- Mã hạng vé đầy đủ = <mã_hãng>_<mã_hạng>, duy nhất toàn hệ thống.

UPDATE fare_classes fc
SET fare_class_code = a.airline_code || '_' || fc.fare_class_code
FROM airlines a
WHERE fc.airline_id = a.id
  AND fc.fare_class_code NOT LIKE a.airline_code || '\_%' ESCAPE '\';

DROP INDEX IF EXISTS uq_fare_classes_code_per_airline;
CREATE UNIQUE INDEX uq_fare_classes_code_full
    ON fare_classes (fare_class_code)
    WHERE is_deleted = false;
```

- Chạy sau V17; không sửa V16/V17 đã áp dụng.
- API trả `fareClassCode` mới (`VN_ECON_SAVER`…); FE mock và mọi so sánh mã phải đổi theo.
- W-ADM-17a: mã hạng vé nhập **kèm mã hãng**, không sửa sau khi có giá bán.

---

## 10. Tóm tắt số lượng

| Loại | Số mục |
|---|---|
| Quyết định cần chốt | 11 (D1–D11) |
| Đã sửa, chờ duyệt lại | 8 nhóm (1.1, 1.3, 2.1, 2.2, 3.1, 3.2, 3.6 + footer wf-01) |
| Chờ duyệt để sửa | 17 mục |
| Đã kiểm tra, đúng | 14 nhóm |
| Lỗi layout/khoảng cách cấp artboard | 0 |
