# 02 — Kiến trúc hệ thống

> **Nguồn:** `be/docs/Kien_truc_Tong_the_He_Thong.md` (v1.0, 14/10/2026), `be/docs/Tech_Stack_Website_Dat_Ve_May_Bay.md` (cập nhật 13/10/2026), `be/docs/Ke_hoach_Kiem_Soat_Chat_Luong_va_Merge_Main.md` (13/10/2026), `be/docs/features/da-2026-10-19-ghe-va-phu-thu/`.
> **Đối chiếu code:** BE `feature/phase-2-chuyen-bay-va-gia-ve`, FE `feature/wireframe-khach-hang` (13/11/2026).

---

## 1. Bức tranh tổng thể

Hệ thống là **monolith hai repo**, không phải microservice:

```
Người dùng (trình duyệt)
        │
        ▼
┌─────────────────────────────┐
│ Frontend — Angular 22       │  localhost:4200
│ core/ · shared/ · features/ │
│ mock layer (environment.useMock)
└─────────────┬───────────────┘
              │ HTTP/JSON (snake_case) + Bearer JWT
              ▼
┌─────────────────────────────┐
│ Backend — Spring Boot 4.1.1 │  localhost:8080
│ controller → service → repo │
│ Spring Security + JWT       │
└──────┬──────────────┬───────┘
       │              │
       ▼              ▼
 PostgreSQL 18.6    Redis 7.2
 (Aiven, cloud)     (Docker): blacklist/whitelist token,
                    cache permission, token reset
       │
       ▼
   Cloudinary (ảnh) + jsoup (sanitize HTML tin tức)
```

**Vì sao tách 2 repo:** BE và FE phát triển song song bởi 2 người. Hợp đồng giữa hai bên là **API Design v0.4**; FE có mock layer để không phải chờ BE.

---

## 2. Backend — 3 tầng

| Tầng | Package | Trách nhiệm | Không được làm |
|---|---|---|---|
| Web | `controller/` | Nhận request, `@Valid`, `@PreAuthorize`, bọc `ApiResponse` | Chứa nghiệp vụ |
| Nghiệp vụ | `service/`, `mapper/` (MapStruct) | Quy tắc nghiệp vụ, `@Transactional`, ném `BusinessException(1006)` / `ResourceNotFound(1004)` | Trả Entity ra ngoài |
| Dữ liệu | `repository/`, `entity/` | Truy vấn Spring Data JPA, ánh xạ bảng | Chứa nghiệp vụ |

### Khuôn CRUD dùng chung

`BaseCrudController` + `BaseCrudService` dùng **Template Method**:

- 6 endpoint chung: `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `PUT /{id}/active`, `DELETE /{id}`.
- 9 module master data kế thừa: Airline, City, Airport, Aircraft, SeatType, Promotion, Voucher, News, NewsCategory.
- Lớp con chỉ override: `createEntity`, `updateEntity`, `softDelete`, `setActive`, `search`, `toResponse`.
- Bulk dùng thêm `PATCH /bulk` (đổi trạng thái) và `DELETE /bulk` (xóa mềm), trả `BulkResult(succeeded, failed[])`.

### Quy ước BE

- Entity dùng `@ManyToOne(LAZY)`, **không** dùng `@OneToMany`.
- Schema do **Flyway** quản lý; Hibernate `ddl-auto=validate`.
- JSON toàn cục **snake_case** (`spring.jackson.property-naming-strategy=SNAKE_CASE`).
- Response luôn `{code, message, data}`; danh sách nằm trong `data: {items, pagination}`.
- Lỗi tập trung ở `GlobalExceptionHandler`.
- Tiền `NUMERIC(12,2)`, thời gian `TIMESTAMPTZ`, xóa mềm bằng `is_deleted`.

---

## 3. Frontend — 3 vùng

| Vùng | Tiêu chí | Nội dung |
|---|---|---|
| `core/` | Singleton, hạ tầng toàn app | `services/`, `interceptors/`, `guards/`, `models/`, `mock/` |
| `shared/` | Dùng ở nhiều màn | `crud/` (CrudPage, CrudConfig), `ui/`, `components/` |
| `features/` | Thuộc một nhóm màn, lazy-load | `admin/pages/*`, `client/pages/*` |

- Alias: `@core`, `@shared`, `@features`, `@env` — không dùng `../../..`.
- Component tách `.ts` / `.html` / `.css`.
- Model FE khớp DTO snake_case của BE.
- `auth.interceptor` gắn Bearer token và bắt 401.
- **Mock layer:** bật bằng `environment.useMock`; interceptor chặn request và trả dữ liệu giả qua `MockRegistry`. Tắt mock không phải sửa service/component.

Chi tiết khuôn CRUD và cách thêm màn mới: xem `docs/superpowers/specs/` và `shared/crud/`.

---

## 4. Bảo mật

- JWT ký **HS256**, stateless; cặp **access + refresh token**.
- Redis:
  - blacklist access token đã logout;
  - whitelist refresh token;
  - cache permission;
  - token đặt lại mật khẩu (TTL 15 phút).
- `CustomJwtDecoder` kiểm chữ ký, hạn và blacklist.
- `CustomJwtAuthenticationConverter` map claim `permissions` → `GrantedAuthority`.
- Phân quyền bằng `@PreAuthorize` ở **tầng method controller**.
- Path:
  - `/api/auth/**` — permitAll (trừ logout/change-password);
  - `GET /api/public/**` — permitAll;
  - còn lại — `authenticated()`.
- 401 → `JwtAuthenticationEntryPoint`; 403 → `CustomAccessDeniedHandler`.
- Refresh token xoay vòng: `POST /auth/refresh` phát cặp mới và vô hiệu token cũ (BE có, FE chưa nối).

Chi tiết quyền theo vai trò: [05-phan-quyen.md](05-phan-quyen.md).

---

## 5. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | Java 17 · Spring Boot 4.1.1 · Spring MVC · Spring Security + OAuth2 Resource Server · Hibernate 7.4.5 |
| CSDL | PostgreSQL 18.6 (Aiven) · HikariCP · Flyway 12.4.0 |
| Cache/token | Redis 7.2-alpine (Docker) |
| Tiện ích BE | Lombok · MapStruct 1.6.3 · Cloudinary 2.0.0 · jsoup 1.18.3 |
| Frontend | Angular 22 (standalone + signals) · TypeScript 6.0 · RxJS 7.8 · Angular Material/CDK 22.1 · Tailwind 3.4.19 |
| Test | JUnit 5 + Mockito + AssertJ (BE) · Vitest + jsdom (FE) |
| Build/dev | Maven Wrapper · Angular CLI · `docker-compose.dev.yml` |

> **Lưu ý lệch phiên bản:** Tech Stack ghi Flyway V1–V11, Kiến trúc ghi V1–V12; thực tế repo đã tới **V15**. Luôn lấy migration trong `src/main/resources/db/migration` làm chuẩn.

---

## 6. Kiểm thử & CI

Ba tầng kiểm thử:

| Tầng | Công cụ | Chạy khi nào |
|---|---|---|
| Unit | JUnit 5 + Mockito (BE), Vitest (FE) | Mỗi lần sửa code |
| Integration | `@SpringBootTest` + Testcontainers | `mvn verify` — kiểm context load + Flyway + validate |
| API | Postman + Newman | App đang chạy; assertion 200/201/401/403/1001/1005/1006 |

Kế hoạch chất lượng còn đề xuất (theo tài liệu 13/10, cần xác nhận lại với repo):

- Sinh collection Postman từ `/v3/api-docs`.
- GitHub Actions chạy `mvn -B verify` trên PR vào `main`.
- Checklist trước merge: test xanh, migration sạch, `.env` không commit, không hard-code secret, `git status` sạch.

---

## 7. Chạy local

```bash
# Hạ tầng (Redis 6379 + Postgres 5433)
docker compose -f docker-compose.dev.yml up -d

# Backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# Frontend
npm install
npm start          # http://localhost:4200
```

Biến môi trường cần có (chỉ tên, **không chép giá trị**):

`FLIGHTBOOKING_DB_URL` (bắt buộc bắt đầu bằng `jdbc:`), `DB_FB_USERNAME`, `DB_FB_PASSWORD`, `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Profile `local` dùng Docker; profile `dev` dùng Aiven và đọc `.env` ở gốc repo BE. Biến môi trường OS/IDE **đè** `.env`.

Bật mock FE: sửa `src/environments/environment.ts` → `useMock: true` (khi BE chưa chạy).

---

## 8. Cấu trúc thư mục

### Backend

```
src/main/java/com/example/domesticflightbookingwebbackend/
├── common/        ApiResponse, PageData, ListQuery, PageMapper, HtmlSanitizer
├── config/        Security, CORS, OpenApi, Cloudinary, DataInitializer
├── controller/    BaseCrudController + controller từng module
├── dto/           request/ · response/
├── entity/        entity JPA (+ entity/redis/)
├── exception/     GlobalExceptionHandler, BusinessException…
├── mapper/        MapStruct
├── repository/    Spring Data JPA
├── security/      JWT decoder/converter, entry point, access denied handler
└── service/       BaseCrudService + service từng module
```

### Frontend

```
src/app/
├── core/          guards/ · interceptors/ · mock/ · models/ · services/
├── shared/        crud/ · ui/ · components/
├── features/
│   ├── admin/     layout/ · pages/<module>/
│   ├── client/    layout/ · pages/<màn>/
│   └── style-guide/
└── app.routes.ts
```

---

## 9. Bổ sung 19–20/10: Ghế & phụ thu nâng hạng

Nằm ngoài tài liệu kiến trúc gốc, đã triển khai ở BE:

- **V14** tạo bảng `seat_class_surcharges`:
  - cột `from_class`, `to_class`, `surcharge`, `is_active`, `is_deleted`;
  - partial unique index theo cặp hạng khi `is_deleted = false`;
  - seed 6 dòng: ECONOMY→BUSINESS 500.000, ECONOMY→FIRST 1.200.000, BUSINESS→FIRST 700.000, các cặp cùng hạng 0; **không** seed FIRST→ECONOMY/BUSINESS.
- **V15** thêm `aircrafts.aisle_after` (`"C"` = 3-3, `"C,E"` = 3-2-2).
- API `/api/admin/seat-class-surcharges` dùng lại BaseCrud; quyền `SEAT_CONFIG_*`.
- Quy tắc:
  - `from_class` dùng `seat_class` (ECONOMY và PREMIUM_ECONOMY cùng mức phụ thu);
  - cặp chưa cấu hình = **không bán** (khác với `surcharge = 0`);
  - trẻ em phụ thu 100%;
  - BUSINESS→ECONOMY được phép, phụ thu 0.
- **Ngoài phạm vi:** Flight CRUD, sinh tồn ghế, API chọn ghế, booking — thuộc Phase 2/3.

Sơ đồ lớp: `be/docs/class-diagram/` — `00-kien-truc-chung.puml`, `01-phase1.puml`, `02-phase2.puml`, `03-phase3.puml` (Wallet đã bỏ).

---

## Đọc tiếp

- Dữ liệu & bảng: [03-co-so-du-lieu.md](03-co-so-du-lieu.md)
- Hợp đồng API: [04-api.md](04-api.md)
- Phân quyền: [05-phan-quyen.md](05-phan-quyen.md)
- Trạng thái & lộ trình: [07-trang-thai-va-lo-trinh.md](07-trang-thai-va-lo-trinh.md)
