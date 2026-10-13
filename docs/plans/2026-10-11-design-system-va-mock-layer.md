# Design System & Mock Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng design system (token một nguồn chân lý, nối Tailwind ↔ Material, component nền, dark mode, trang style guide) và mock layer cho phép dựng UI trước khi Backend có controller.

**Architecture:** Token khai bằng CSS custom properties trong `_tokens.scss`; Tailwind đọc qua `../../tailwind.config.js`, Material đọc qua override `--mat-sys-*` sau `mat.theme()`. Mock layer là HTTP interceptor chặn request khi `useMock=true`, trả `HttpResponse` giả từ registry — service/component không đổi.

**Tech Stack:** Angular 22.1.5 (standalone, OnPush, template inline) · Angular Material 22.1.7 (M3) · Tailwind CSS 3.4.19 · TypeScript 6.0.2 · Vitest 4.1.11 · Sass

**Spec:** `../specs/2026-10-11-design-system-va-mock-layer-design.md`

## Global Constraints

- **Angular 22 standalone** — không dùng NgModule. Component dùng `imports: [...]` với mảng module, không khai `declarations`.
- **ChangeDetectionStrategy.OnPush** trên mọi component.
- **Template và style viết inline** trong decorator (`template: \`...\``, `styles: \`...\``) — theo đúng pattern hiện có của repo.
- **Tiền tố selector `app-`** (khai trong `../../angular.json` → `"prefix": "app"`).
- **Comment bằng tiếng Việt**, giải thích LÝ DO chứ không mô tả lại code.
- **Không hard-code mã màu trong component** — luôn dùng token.
- **KHÔNG dùng emoji làm icon** — chỉ Material Icons.
- **KHÔNG dùng chữ hoa giãn cách** (`text-transform: uppercase` + `letter-spacing`) cho nhãn chung; chỉ dùng cho mã sân bay / số hiệu chuyến / mã đặt chỗ.
- **Mọi model và mock data dùng `snake_case`** khớp API Design v0.2.
- **Envelope response luôn là** `{code, message, data}`; danh sách là `{items, pagination}`.
- **Bảng màu (từ spec mục 2.1), giá trị chính xác:**

| Vai trò | Mã |
|---|---|
| Primary | `#0194F3` |
| Primary hover/active | `#0770CD` |
| Primary nhạt | `#EAF7FF` |
| Accent (CTA phụ) | `#FF5E1F` |
| Thành công | `#00A651` |
| Cảnh báo | `#F2A81D` |
| Lỗi | `#E5484D` |
| Nền trang | `#F7F9FA` |
| Bề mặt | `#FFFFFF` |
| Chữ chính | `#03121A` |
| Chữ phụ | `#687176` |
| Chữ mờ | `#9AA6AD` |
| Đường kẻ | `#DDE3E8` |
| Đường kẻ nhạt | `#EDF1F4` |

- **Chữ:** tiêu đề Be Vietnam Pro, nội dung Inter, mã/giờ dùng `font-variant-numeric: tabular-nums`.
- **Bo góc:** `sm` 6px · `base` 10px · `lg` 14px · `xl` 16px.
- **Đổ bóng dùng tông xanh đen** `rgba(3,18,26,...)`, không dùng đen thuần.
- **Lệnh chạy test:** `npx ng test --watch=false` (Vitest; hiện có 2 file / 4 test đang pass — không được làm hỏng).
- **Lệnh build kiểm tra:** `npx ng build --configuration development`
- **Chủ dự án tự commit** — plan ghi lệnh `git add`/`git commit` để người thực thi chạy, nhưng không tự ý commit ngoài các bước đó.

## Review Focus

Các tình huống spec ngụ ý nhưng không có test nào phủ, dễ làm hỏng trải nghiệm người dùng thật:

1. **Đổi token làm vỡ 3 trang đang chạy** (`home`, `login`, `register`) — hiện đang dùng lẫn `var(--mat-sys-*)` và utility Tailwind. Sau khi nối token, chúng phải trông **đúng như trước**, không lệch màu hay font.
2. **Material và Tailwind ra hai màu khác nhau** — đây là lỗi gốc cần diệt. Trang style guide phải chứng minh `text-primary` (Tailwind) và `var(--mat-sys-primary)` là **cùng một màu**.
3. **Tương phản chữ dưới 4.5:1** — đặc biệt chữ phụ `#687176` trên nền `#F7F9FA`, và chữ trắng trên primary `#0194F3`. Phải đo, không đoán.
4. **Mock trả shape sai** (thiếu `pagination`, sai `snake_case`, `data` là mảng trần thay vì `{items, pagination}`) — component sẽ vỡ khi nối API thật.
5. **Tắt mock mà vẫn còn nhánh mock** — request phải đi ra mạng thật, không lọt vào interceptor.
6. **Bàn phím không thao tác được / không thấy focus** — mọi thành phần tương tác phải có focus nhìn thấy được.
7. **`prefers-reduced-motion` bị bỏ qua** — chuyển động phải tắt khi người dùng yêu cầu.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/_tokens.scss` | **MỚI** — nguồn chân lý duy nhất: mọi CSS custom property |
| `../../src/styles.css` | **SỬA** — import token, reset, tiện ích nền |
| `../../src/material-theme.scss` | **SỬA** — `mat.theme()` + override `--mat-sys-*` từ token |
| `../../tailwind.config.js` | **SỬA** — trỏ màu/chữ/bo góc/bóng vào biến token, bỏ khai lại scale mặc định |
| `../../src/index.html` | **SỬA** — nạp Be Vietnam Pro + Inter, bỏ Roboto |
| `../../src/environments/environment.ts` | **SỬA** — thêm cờ `useMock` |
| `../../src/app/core/mock/mock.interceptor.ts` | **MỚI** — chặn request khi `useMock` |
| `../../src/app/core/mock/mock-registry.ts` | **MỚI** — ánh xạ method+path → dữ liệu giả |
| `../../src/app/core/mock/mock-response.ts` | **MỚI** — helper dựng envelope, phân trang, lỗi |
| `../../src/app/core/mock/data/airlines.mock.ts` | **MỚI** — dữ liệu giả module Airline |
| `../../src/app/core/models/airline.model.ts` | **MỚI** — model khớp API v0.2 |
| `../../src/app/core/services/base-crud.service.ts` | **MỚI** — service CRUD tổng quát |
| `../../src/app/shared/ui/status-badge/status-badge.ts` | **MỚI** — nhãn trạng thái |
| `../../src/app/shared/ui/app-card/app-card.ts` | **MỚI** — card 3 phần |
| `../../src/app/shared/ui/app-alert/app-alert.ts` | **MỚI** — 4 mức thông báo |
| `../../src/app/shared/ui/skeleton-block/skeleton-block.ts` | **MỚI** — khung xương |
| `../../src/app/shared/ui/loading-state/loading-state.ts` | **MỚI** — đang tải |
| `../../src/app/shared/ui/app-button/app-button.ts` | **MỚI** — 5 biến thể nút |
| `../../src/app/features/style-guide/style-guide.ts` | **MỚI** — trang tra cứu token + component |
| `../../src/app/app.routes.ts` | **SỬA** — thêm route `/style-guide` |

**Thứ tự phụ thuộc:** Task 1 → 2 → 3 (token trước, rồi mới nối hai hệ). Task 4–9 (component nền) cần Task 1–3 xong. Task 10–12 (mock) độc lập, có thể làm song song. Task 13 (style guide) cần 1–9. Task 14 (màn mẫu) cần tất cả.

---

### Task 1: Token — nguồn chân lý duy nhất

**Files:**
- Create: `src/_tokens.scss`
- Modify: `../../src/styles.css`

**Interfaces:**
- Consumes: không (task đầu)
- Produces: mọi CSS custom property dùng bởi Task 2–14. Tên biến theo bảng dưới — các task sau tham chiếu đúng tên này.

- [ ] **Step 1: Tạo `src/_tokens.scss`**

```scss
// =====================================================================
// _tokens.scss — NGUỒN CHÂN LÝ DUY NHẤT cho design system.
//
// Vì sao có file này: trước đây tailwind.config.js và material-theme.scss
// khai màu riêng nên "màu chính" ra hai giá trị khác nhau. Từ đây mọi
// màu/chữ/khoảng cách chỉ định nghĩa MỘT LẦN, Tailwind và Material cùng đọc.
//
// Quy ước: giá trị gốc ở :root (chế độ sáng). Chế độ tối override ở
// [data-theme="dark"] — xem cuối file.
// =====================================================================

:root {
  // ---------- Màu thương hiệu ----------
  --color-primary: #0194f3;
  --color-primary-hover: #0770cd;
  --color-primary-soft: #eaf7ff;
  --color-on-primary: #ffffff;

  --color-accent: #ff5e1f;
  --color-accent-hover: #e84a0c;
  --color-on-accent: #ffffff;

  // ---------- Màu ngữ nghĩa ----------
  --color-success: #00a651;
  --color-success-soft: #e6f7ee;
  --color-on-success-soft: #00602f;

  --color-warning: #f2a81d;
  --color-warning-soft: #fff6e0;
  --color-on-warning-soft: #7a5400;

  --color-danger: #e5484d;
  --color-danger-soft: #fdecec;
  --color-on-danger-soft: #8e2024;

  --color-info: #0194f3;
  --color-info-soft: #eaf7ff;
  --color-on-info-soft: #08537f;

  // ---------- Bề mặt & chữ ----------
  --color-bg: #f7f9fa;
  --color-surface: #ffffff;
  --color-surface-alt: #fbfcfd;
  --color-ink: #03121a;
  --color-ink-muted: #687176;
  --color-ink-subtle: #9aa6ad;
  --color-border: #dde3e8;
  --color-border-soft: #edf1f4;

  // ---------- Chữ ----------
  --font-heading: 'Be Vietnam Pro', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;

  --text-display: 2rem;
  --text-h1: 1.5rem;
  --text-h2: 1.25rem;
  --text-h3: 1.0625rem;
  --text-body: 0.9375rem;
  --text-small: 0.8125rem;
  --text-caption: 0.6875rem;

  --leading-tight: 1.25;
  --leading-normal: 1.5;

  // ---------- Bo góc ----------
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  --radius-xl: 16px;

  // ---------- Đổ bóng (tông xanh đen, không dùng đen thuần) ----------
  --shadow-sm: 0 1px 4px rgba(3, 18, 26, 0.06);
  --shadow: 0 2px 10px rgba(3, 18, 26, 0.07);
  --shadow-lg: 0 4px 16px rgba(3, 18, 26, 0.1);

  // ---------- Chuyển động ----------
  --dur-fast: 130ms;
  --dur: 200ms;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}

// =====================================================================
// Chế độ tối — cùng tên biến, chỉ đổi giá trị.
// Material đọc qua override ở material-theme.scss; Tailwind đọc trực tiếp
// vì các utility trỏ vào var(--color-*).
// =====================================================================
[data-theme='dark'] {
  --color-primary: #4da9f7;
  --color-primary-hover: #6fb8f5;
  --color-primary-soft: #0d2b45;
  --color-on-primary: #04121f;

  --color-accent: #ff7a45;
  --color-accent-hover: #ff8f60;
  --color-on-accent: #2b1206;

  --color-success: #3dd68c;
  --color-success-soft: #102a20;
  --color-on-success-soft: #7fe8b4;

  --color-warning: #ffb020;
  --color-warning-soft: #33260c;
  --color-on-warning-soft: #ffd88a;

  --color-danger: #f87171;
  --color-danger-soft: #3a1a1c;
  --color-on-danger-soft: #f7b4b6;

  --color-info: #4da9f7;
  --color-info-soft: #0d2b45;
  --color-on-info-soft: #a8d8ff;

  --color-bg: #0b1524;
  --color-surface: #121f31;
  --color-surface-alt: #17263a;
  --color-ink: #e6edf5;
  --color-ink-muted: #93a7be;
  --color-ink-subtle: #6b7f96;
  --color-border: #1f3145;
  --color-border-soft: #2c4257;

  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.3);
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.45);
}

// Tôn trọng lựa chọn giảm chuyển động của người dùng.
@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-fast: 0ms;
    --dur: 0ms;
  }
}
```

- [ ] **Step 2: Sửa `../../src/styles.css` để nạp token**

Thay toàn bộ nội dung file bằng:

```css
@import './tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

/* =====================================================================
   Reset & nền tảng
   Token nằm ở _tokens.scss (biên dịch thành tokens.css qua angular.json).
   ===================================================================== */

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  background-color: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: var(--leading-normal);
}

h1,
h2,
h3,
h4 {
  font-family: var(--font-heading);
  line-height: var(--leading-tight);
  margin: 0;
}

a {
  color: var(--color-primary);
}

/* Chữ số thẳng cột — dùng cho bảng giá, giờ bay, mã.
   Đây là chi tiết nhỏ nhưng quyết định bảng giá có "sạch" hay không. */
.tabular {
  font-variant-numeric: tabular-nums;
}

/* Focus nhìn thấy được — không bao giờ xoá outline mà không thay bằng gì. */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Thêm `_tokens.scss` vào danh sách style của `../../angular.json`**

Sửa dòng 28 của `../../angular.json`:

```json
"styles": ["src/_tokens.scss", "src/material-theme.scss", "src/styles.css"],
```

Lý do: Angular CLI biên dịch từng file trong `styles` rồi nối lại theo thứ tự. `_tokens.scss` phải đứng **trước** để biến có mặt khi hai file sau dùng.

- [ ] **Step 4: Build kiểm tra**

Run: `npx ng build --configuration development`
Expected: build thành công, không lỗi Sass.

- [ ] **Step 5: Kiểm tra biến token đã vào bundle**

Run: `grep -c "color-primary" dist/domestic-flight-booking-web-frontend/browser/styles.css`
Expected: số > 0 (biến `--color-primary` có mặt trong CSS xuất ra).

- [ ] **Step 6: Commit**

```bash
git add src/_tokens.scss src/styles.css angular.json
git commit -m "feat(design-system): thêm token nguồn chân lý duy nhất"
```

---

### Task 2: Nối Tailwind vào token

**Files:**
- Modify: `../../tailwind.config.js` (viết lại toàn bộ)
- Test: `src/app/shared/ui/token-check.spec.ts` (MỚI — test tạm, xoá ở Task 13)

**Interfaces:**
- Consumes: tên biến từ Task 1 (`--color-primary`, `--radius`, `--font-heading`, ...)
- Produces: lớp utility Tailwind (`bg-primary`, `text-ink-muted`, `rounded-lg`, `font-heading`, `shadow`) dùng bởi Task 4–14.

- [ ] **Step 1: Viết test kiểm tra token**

Tạo `src/app/shared/ui/token-check.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Test bảo vệ: Tailwind phải trỏ vào biến token, không được khai mã màu
 * trực tiếp. Nếu ai đó hard-code hex vào config, test này báo lỗi ngay —
 * vì đó chính là lỗi gốc đã làm hai hệ màu lệch nhau.
 */
describe('tailwind.config.js', () => {
  const configPath = join(process.cwd(), 'tailwind.config.js');
  const raw = readFileSync(configPath, 'utf8');

  it('màu primary trỏ vào var(--color-primary)', () => {
    expect(raw).toContain('var(--color-primary)');
  });

  it('không khai lại thang khoảng cách mặc định của Tailwind', () => {
    expect(raw).not.toMatch(/spacing:\s*\{/);
  });

  it('không khai lại thang cỡ chữ mặc định của Tailwind', () => {
    expect(raw).not.toMatch(/fontSize:\s*\{/);
  });

  it('không còn mã màu hex trực tiếp trong phần colors', () => {
    const colorsBlock = raw.slice(raw.indexOf('colors:'), raw.indexOf('fontFamily:'));
    expect(colorsBlock).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — config hiện tại còn hex trực tiếp và khai lại `spacing`/`fontSize`.

- [ ] **Step 3: Viết lại `../../tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      // Màu trỏ vào biến token — KHÔNG khai mã hex ở đây.
      // Nhờ vậy Tailwind và Material dùng chung một nguồn, và chế độ tối
      // chỉ cần đổi biến là cả hai hệ theo.
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)',
          on: 'var(--color-on-primary)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          on: 'var(--color-on-accent)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)',
          'on-soft': 'var(--color-on-success-soft)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
          'on-soft': 'var(--color-on-warning-soft)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          soft: 'var(--color-danger-soft)',
          'on-soft': 'var(--color-on-danger-soft)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          soft: 'var(--color-info-soft)',
          'on-soft': 'var(--color-on-info-soft)',
        },
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          alt: 'var(--color-surface-alt)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
          subtle: 'var(--color-ink-subtle)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          soft: 'var(--color-border-soft)',
        },
      },

      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },

      fontSize: {
        display: 'var(--text-display)',
        h1: 'var(--text-h1)',
        h2: 'var(--text-h2)',
        h3: 'var(--text-h3)',
        body: 'var(--text-body)',
        small: 'var(--text-small)',
        caption: 'var(--text-caption)',
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)',
      },

      transitionDuration: {
        fast: 'var(--dur-fast)',
        DEFAULT: 'var(--dur)',
      },

      transitionTimingFunction: {
        DEFAULT: 'var(--ease)',
      },
    },
  },
  plugins: [],
};
```

**Điểm cốt lõi:** bỏ hẳn `spacing`, `zIndex`, và các thang `fontSize`/`borderRadius`/`boxShadow` khai lại mặc định. Chỉ giữ phần thật sự tuỳ biến. Tailwind sẽ tự dùng thang mặc định cho những gì không khai.

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS — 4 test cũ + 4 test mới.

- [ ] **Step 5: Build kiểm tra utility sinh ra đúng**

Run: `npx ng build --configuration development`
Expected: build thành công.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js src/app/shared/ui/token-check.spec.ts
git commit -m "feat(design-system): nối Tailwind vào token, bỏ khai lại scale mặc định"
```

---

### Task 3: Nối Material vào token + nạp font

**Files:**
- Modify: `../../src/material-theme.scss` (viết lại toàn bộ)
- Modify: `../../src/index.html`

**Interfaces:**
- Consumes: tên biến từ Task 1
- Produces: `--mat-sys-*` khớp token; font Be Vietnam Pro + Inter đã nạp

**Ghi chú kỹ thuật đã kiểm chứng:** `mat.theme()` emit 165 biến `--mat-sys-*` dùng hàm `light-dark()`. Override bằng cách khai lại biến **sau** lời gọi `mat.theme()` trong cùng scope `html` — bản sau thắng (đã thử nghiệm xác nhận). Không cần chế độ tối riêng cho Material: `light-dark()` tự chọn theo `color-scheme`.

- [ ] **Step 1: Viết lại `../../src/material-theme.scss`**

```scss
// =====================================================================
// material-theme.scss — Material 3 đọc màu từ token chung.
//
// Vì sao override: mat.theme() sinh màu từ palette có sẵn (azure → #005cbb),
// không cho nhét thẳng #0194F3. Nên ta để nó sinh trước, rồi ghi đè
// --mat-sys-* bằng token của mình. Nhờ vậy Tailwind và Material khớp nhau.
//
// light-dark(a, b) là hàm CSS chuẩn: tự chọn a hay b theo color-scheme,
// nên không cần khối dark riêng.
// =====================================================================
@use '@angular/material' as mat;

html {
  height: 100%;

  @include mat.theme(
    (
      color: (
        primary: mat.$azure-palette,
        tertiary: mat.$blue-palette,
      ),
      typography: Roboto,
      density: 0,
    )
  );

  // ---- Ghi đè màu Material bằng token chung ----
  --mat-sys-primary: light-dark(#0194f3, #4da9f7);
  --mat-sys-on-primary: light-dark(#ffffff, #04121f);
  --mat-sys-primary-container: light-dark(#eaf7ff, #0d2b45);
  --mat-sys-on-primary-container: light-dark(#08537f, #a8d8ff);

  --mat-sys-error: light-dark(#e5484d, #f87171);
  --mat-sys-on-error: light-dark(#ffffff, #3a1a1c);
  --mat-sys-error-container: light-dark(#fdecec, #3a1a1c);
  --mat-sys-on-error-container: light-dark(#8e2024, #f7b4b6);

  --mat-sys-surface: light-dark(#ffffff, #121f31);
  --mat-sys-surface-container: light-dark(#f7f9fa, #17263a);
  --mat-sys-surface-container-high: light-dark(#edf1f4, #1f3145);
  --mat-sys-on-surface: light-dark(#03121a, #e6edf5);
  --mat-sys-on-surface-variant: light-dark(#687176, #93a7be);
  --mat-sys-outline: light-dark(#dde3e8, #2c4257);
  --mat-sys-outline-variant: light-dark(#edf1f4, #1f3145);

  // Nền trang lấy từ token, không lấy mặc định của Material.
  --mat-sys-background: light-dark(#f7f9fa, #0b1524);
  --mat-sys-on-background: light-dark(#03121a, #e6edf5);
}

body {
  color-scheme: light;
  background-color: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-body);
  margin: 0;
  height: 100%;
}

// Chế độ tối: đổi color-scheme để light-dark() chọn nhánh tối.
[data-theme='dark'] body {
  color-scheme: dark;
}

// Chữ tiêu đề của Material dùng font tiêu đề.
.mat-typography h1,
.mat-typography h2,
.mat-typography h3,
h1,
h2,
h3 {
  font-family: var(--font-heading);
}
```

- [ ] **Step 2: Sửa `../../src/index.html` để nạp đúng font**

Thay khối `<link>` font (dòng 9–15) bằng:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <!-- Be Vietnam Pro cho tiêu đề (thiết kế riêng cho tiếng Việt, dấu cân đối),
         Inter cho nội dung. Bỏ Roboto vì trước đây khai Inter trong Tailwind
         nhưng chỉ nạp Roboto nên font-sans rơi về system-ui. -->
    <link
      href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
```

Đồng thời sửa `<html lang="en">` thành `<html lang="vi">` và `<title>` thành tên dự án thật:

```html
<html lang="vi">
...
    <title>Đặt vé máy bay nội địa</title>
```

- [ ] **Step 3: Build kiểm tra**

Run: `npx ng build --configuration development`
Expected: build thành công.

- [ ] **Step 4: Chạy toàn bộ test**

Run: `npx ng test --watch=false`
Expected: PASS toàn bộ.

- [ ] **Step 5: Kiểm tra bằng mắt 3 trang cũ không vỡ**

Run: `npx ng serve` rồi mở `http://localhost:4200/`
Kiểm tra: trang chủ, `/login`, `/register` — bố cục và màu **đúng như trước**, chữ tiêu đề đổi sang Be Vietnam Pro. Đây là Review Focus #1: đổi token không được làm vỡ trang đang chạy.

- [ ] **Step 6: Commit**

```bash
git add src/material-theme.scss src/index.html
git commit -m "feat(design-system): Material đọc token chung + nạp Be Vietnam Pro/Inter"
```

---

### Task 4: Component `StatusBadge`

**Files:**
- Create: `../../src/app/shared/ui/status-badge/status-badge.ts`
- Test: `src/app/shared/ui/status-badge/status-badge.spec.ts`

**Interfaces:**
- Consumes: lớp Tailwind từ Task 2
- Produces: `<app-status-badge [tone]="..." [label]="..." />`; `tone` nhận `'success' | 'warning' | 'danger' | 'info' | 'neutral'`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/app/shared/ui/status-badge/status-badge.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatusBadge] }).compileComponents();
  });

  it('hiển thị nhãn truyền vào', async () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('label', 'Còn vé');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Còn vé');
  });

  it('mặc định tone là neutral', async () => {
    const fixture = TestBed.createComponent(StatusBadge);
    await fixture.whenStable();
    expect(fixture.componentInstance.tone()).toBe('neutral');
  });

  it('áp đúng lớp màu theo tone', async () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('tone', 'success');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).className).toContain('success');
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './status-badge'`.

- [ ] **Step 3: Viết component**

Tạo `../../src/app/shared/ui/status-badge/status-badge.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * Nhãn trạng thái dùng chung toàn hệ thống.
 *
 * Vì sao cần component thay vì tự viết class mỗi nơi: cùng một trạng thái
 * (còn vé, đã hủy, chờ thanh toán...) phải ra CÙNG một màu ở mọi màn hình.
 * Ánh xạ màu nằm một chỗ duy nhất ở đây.
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="toneClass()">
      <span class="badge__dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: var(--text-caption);
      font-weight: 700;
      line-height: 1.4;
      white-space: nowrap;
    }

    .badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex: 0 0 auto;
    }

    .badge--success {
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
    }
    .badge--warning {
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }
    .badge--danger {
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
    }
    .badge--info {
      background: var(--color-info-soft);
      color: var(--color-on-info-soft);
    }
    .badge--neutral {
      background: var(--color-border-soft);
      color: var(--color-ink-muted);
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');

  protected readonly toneClass = computed(() => `badge--${this.tone()}`);
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS — 3 test mới của StatusBadge.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/status-badge/
git commit -m "feat(ui): StatusBadge — nhãn trạng thái dùng chung"
```

---

### Task 5: Component `AppCard`

**Files:**
- Create: `../../src/app/shared/ui/app-card/app-card.ts`
- Test: `src/app/shared/ui/app-card/app-card.spec.ts`

**Interfaces:**
- Consumes: lớp Tailwind từ Task 2
- Produces: `<app-app-card [title]="..." [subtitle]="...">` với slot `[cardActions]` (vùng đầu) và `[cardFooter]` (vùng chân, chỉ hiện khi có nội dung)

- [ ] **Step 1: Viết test thất bại**

Tạo `src/app/shared/ui/app-card/app-card.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { AppCard } from './app-card';

describe('AppCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppCard] }).compileComponents();
  });

  it('hiển thị tiêu đề', async () => {
    const fixture = TestBed.createComponent(AppCard);
    fixture.componentRef.setInput('title', 'Chuyến bay');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chuyến bay');
  });

  it('không render vùng chân khi không có nội dung', async () => {
    const fixture = TestBed.createComponent(AppCard);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.card__footer')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './app-card'`.

- [ ] **Step 3: Viết component**

Tạo `../../src/app/shared/ui/app-card/app-card.ts`:

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Card 3 phần: đầu / thân / chân.
 *
 * Vì sao chân chỉ hiện khi có nội dung: nếu luôn render, mọi card đều có
 * một dải trống ở dưới — chi tiết nhỏ nhưng làm giao diện trông thiếu chăm sóc.
 */
@Component({
  selector: 'app-app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      @if (title()) {
        <div class="card__header">
          <div>
            <h3 class="card__title">{{ title() }}</h3>
            @if (subtitle()) {
              <p class="card__subtitle">{{ subtitle() }}</p>
            }
          </div>
          <div class="card__actions">
            <ng-content select="[cardActions]" />
          </div>
        </div>
      }

      <div class="card__body">
        <ng-content />
      </div>

      @if (hasFooter()) {
        <div class="card__footer">
          <ng-content select="[cardFooter]" />
        </div>
      }
    </div>
  `,
  styles: `
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 17px;
      border-bottom: 1px solid var(--color-border);
    }

    .card__title {
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 600;
      margin: 0;
    }

    .card__subtitle {
      margin: 3px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .card__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
    }

    .card__body {
      padding: 17px;
    }

    .card__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 17px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface-alt);
    }
  `,
})
export class AppCard {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  /** Đặt true khi có nội dung ở slot cardFooter. */
  readonly hasFooter = input<boolean>(false);
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/app-card/
git commit -m "feat(ui): AppCard — card 3 phần"
```

---

### Task 6: Component `AppAlert`

**Files:**
- Create: `../../src/app/shared/ui/app-alert/app-alert.ts`
- Test: `src/app/shared/ui/app-alert/app-alert.spec.ts`

**Interfaces:**
- Consumes: lớp Tailwind từ Task 2
- Produces: `<app-alert [tone]="..." [title]="..." [message]="..." />`; `tone` nhận `'success' | 'info' | 'warning' | 'error'`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/app/shared/ui/app-alert/app-alert.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { AppAlert } from './app-alert';

describe('AppAlert', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppAlert] }).compileComponents();
  });

  it('hiển thị tiêu đề và nội dung', async () => {
    const fixture = TestBed.createComponent(AppAlert);
    fixture.componentRef.setInput('title', 'Đặt vé thành công');
    fixture.componentRef.setInput('message', 'Mã đặt chỗ là ABC123.');
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Đặt vé thành công');
    expect(text).toContain('Mã đặt chỗ là ABC123.');
  });

  it('dùng Material icon, không dùng emoji', async () => {
    const fixture = TestBed.createComponent(AppAlert);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-icon')).toBeTruthy();
    // Emoji sẽ nằm trong text node; icon phải nằm trong thẻ mat-icon.
    expect(el.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2705}\u{26A0}\u{26D4}\u{2139}]/u);
  });

  it('ánh xạ tone sang icon tương ứng', async () => {
    const fixture = TestBed.createComponent(AppAlert);
    fixture.componentRef.setInput('tone', 'warning');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('mat-icon')?.textContent).toContain(
      'warning',
    );
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './app-alert'`.

- [ ] **Step 3: Viết component**

Tạo `../../src/app/shared/ui/app-alert/app-alert.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type AlertTone = 'success' | 'info' | 'warning' | 'error';

/**
 * Thông báo 4 mức, biến thể "nền nhạt + vạch trái".
 *
 * Vì sao dùng Material icon thay vì emoji: emoji render khác nhau trên từng
 * máy, không đổi được màu theo trạng thái, và lệch hẳn với phần icon còn lại.
 */
@Component({
  selector: 'app-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="alert" [class]="toneClass()" role="status">
      <mat-icon class="alert__icon" aria-hidden="true">{{ iconName() }}</mat-icon>
      <div class="alert__text">
        <strong class="alert__title">{{ title() }}</strong>
        @if (message()) {
          <p class="alert__message">{{ message() }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .alert {
      display: flex;
      gap: 11px;
      align-items: flex-start;
      padding: 12px 15px;
      border-radius: var(--radius);
      border-left: 3px solid currentColor;
    }

    .alert__icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
      margin-top: 1px;
    }

    .alert__title {
      display: block;
      font-family: var(--font-heading);
      font-size: var(--text-small);
      margin-bottom: 2px;
    }

    .alert__message {
      margin: 0;
      font-size: var(--text-small);
      line-height: var(--leading-normal);
      opacity: 0.9;
    }

    .alert--success {
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
    }
    .alert--info {
      background: var(--color-info-soft);
      color: var(--color-on-info-soft);
    }
    .alert--warning {
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }
    .alert--error {
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
    }
  `,
})
export class AppAlert {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly tone = input<AlertTone>('info');

  protected readonly toneClass = computed(() => `alert--${this.tone()}`);

  protected readonly iconName = computed(() => {
    switch (this.tone()) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  });
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/app-alert/
git commit -m "feat(ui): AppAlert — 4 mức thông báo, dùng Material icon"
```

---

### Task 7: Component `SkeletonBlock` và `LoadingState`

**Files:**
- Create: `../../src/app/shared/ui/skeleton-block/skeleton-block.ts`
- Create: `../../src/app/shared/ui/loading-state/loading-state.ts`
- Test: `src/app/shared/ui/skeleton-block/skeleton-block.spec.ts`

**Interfaces:**
- Consumes: token Task 1
- Produces: `<app-skeleton-block [width]="'60%'" [height]="'13px'" />`; `<app-loading-state [message]="'Đang tải...'" />`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/app/shared/ui/skeleton-block/skeleton-block.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { LoadingState } from '../loading-state/loading-state';
import { SkeletonBlock } from './skeleton-block';

describe('SkeletonBlock', () => {
  it('áp chiều rộng và chiều cao truyền vào', async () => {
    await TestBed.configureTestingModule({ imports: [SkeletonBlock] }).compileComponents();
    const fixture = TestBed.createComponent(SkeletonBlock);
    fixture.componentRef.setInput('width', '60%');
    fixture.componentRef.setInput('height', '13px');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.style.width).toBe('60%');
    expect(el.style.height).toBe('13px');
  });

  it('có role trạng thái để trình đọc màn hình bỏ qua nội dung trang trí', async () => {
    await TestBed.configureTestingModule({ imports: [SkeletonBlock] }).compileComponents();
    const fixture = TestBed.createComponent(SkeletonBlock);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });
});

describe('LoadingState', () => {
  it('hiển thị thông điệp đang tải', async () => {
    await TestBed.configureTestingModule({ imports: [LoadingState] }).compileComponents();
    const fixture = TestBed.createComponent(LoadingState);
    fixture.componentRef.setInput('message', 'Đang tải dữ liệu…');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đang tải dữ liệu…');
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết `SkeletonBlock`**

Tạo `../../src/app/shared/ui/skeleton-block/skeleton-block.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Khối xương khi đang tải — giữ chỗ để bố cục không nhảy khi dữ liệu về.
 * aria-hidden vì đây là nội dung trang trí, trình đọc màn hình bỏ qua.
 */
@Component({
  selector: 'app-skeleton-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="sk"></span>`,
  styles: `
    :host {
      display: block;
    }

    .sk {
      display: block;
      width: 100%;
      height: 13px;
      border-radius: var(--radius-sm);
      background: linear-gradient(
        90deg,
        var(--color-border-soft) 25%,
        var(--color-border) 37%,
        var(--color-border-soft) 63%
      );
      background-size: 400% 100%;
      animation: sk-shimmer 1.3s ease infinite;
    }

    @keyframes sk-shimmer {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: -100% 0;
      }
    }

    /* Tôn trọng lựa chọn giảm chuyển động. */
    @media (prefers-reduced-motion: reduce) {
      .sk {
        animation: none;
      }
    }
  `,
  host: {
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    'aria-hidden': 'true',
  },
})
export class SkeletonBlock {
  readonly width = input<string>('100%');
  readonly height = input<string>('13px');
}
```

- [ ] **Step 4: Viết `LoadingState`**

Tạo `../../src/app/shared/ui/loading-state/loading-state.ts`:

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Trạng thái đang tải — spinner + thông điệp. */
@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading" role="status">
      <span class="loading__spinner" aria-hidden="true"></span>
      <p class="loading__message">{{ message() }}</p>
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 34px 16px;
      color: var(--color-ink-muted);
    }

    .loading__spinner {
      width: 22px;
      height: 22px;
      border: 2.5px solid var(--color-primary-soft);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading__message {
      margin: 0;
      font-size: var(--text-small);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .loading__spinner {
        animation-duration: 2.5s;
      }
    }
  `,
})
export class LoadingState {
  readonly message = input<string>('Đang tải dữ liệu…');
}
```

- [ ] **Step 5: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/ui/skeleton-block/ src/app/shared/ui/loading-state/
git commit -m "feat(ui): SkeletonBlock + LoadingState"
```

---

### Task 8: Component `AppButton`

**Files:**
- Create: `../../src/app/shared/ui/app-button/app-button.ts`
- Test: `src/app/shared/ui/app-button/app-button.spec.ts`

**Interfaces:**
- Consumes: token Task 1
- Produces: `<app-app-button [variant]="..." [size]="..." [disabled]="..." (clicked)="...">Nhãn</app-app-button>`; `variant` ∈ `'primary' | 'secondary' | 'ghost' | 'danger' | 'text'`, `size` ∈ `'md' | 'sm'`

**Ghi chú thiết kế:** đây là nút **thuần trình bày**, không bọc `MatButton`. Lý do: `MatButton` áp màu theo theme Material rất khó ép về đúng token, trong khi nút chỉ cần đúng màu + đúng hành vi. Vẫn giữ đủ accessibility (thẻ `<button>` thật, focus nhìn thấy, `disabled` thật).

- [ ] **Step 1: Viết test thất bại**

Tạo `src/app/shared/ui/app-button/app-button.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { AppButton } from './app-button';

describe('AppButton', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppButton] }).compileComponents();
  });

  it('hiển thị nội dung qua ng-content', async () => {
    const fixture = TestBed.createComponent(AppButton);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeTruthy();
  });

  it('mặc định là variant primary, size md', async () => {
    const fixture = TestBed.createComponent(AppButton);
    await fixture.whenStable();
    expect(fixture.componentInstance.variant()).toBe('primary');
    expect(fixture.componentInstance.size()).toBe('md');
  });

  it('phát sự kiện clicked khi bấm', async () => {
    const fixture = TestBed.createComponent(AppButton);
    await fixture.whenStable();
    let emitted = false;
    fixture.componentInstance.clicked.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    expect(emitted).toBe(true);
  });

  it('không phát sự kiện khi disabled', async () => {
    const fixture = TestBed.createComponent(AppButton);
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    let emitted = false;
    fixture.componentInstance.clicked.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    expect(emitted).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết component**

Tạo `../../src/app/shared/ui/app-button/app-button.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';
export type ButtonSize = 'md' | 'sm';

/**
 * Nút dùng chung — 5 biến thể, 2 kích thước.
 *
 * Vì sao không bọc MatButton: MatButton áp màu theo theme Material, rất khó
 * ép về đúng token thương hiệu. Nút chỉ cần đúng màu và đúng hành vi, nên
 * dùng thẻ <button> thật là đủ và vẫn giữ nguyên accessibility.
 *
 * Quy ước sử dụng: chỉ MỘT nút primary trong mỗi vùng nhìn. Nhiều nút primary
 * cạnh nhau làm người dùng không biết bấm cái nào.
 */
@Component({
  selector: 'app-app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="btn"
      [class]="classes()"
      [type]="type()"
      [disabled]="disabled()"
      (click)="onClick()"
    >
      <ng-content />
    </button>
  `,
  styles: `
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: 1.5px solid transparent;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      transition:
        background-color var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }

    .btn--md {
      padding: 11px 20px;
      font-size: var(--text-body);
    }

    .btn--sm {
      padding: 7px 13px;
      font-size: var(--text-small);
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }
    .btn--primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .btn--secondary {
      background: var(--color-surface);
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
    .btn--secondary:hover:not(:disabled) {
      background: var(--color-primary-soft);
    }

    .btn--ghost {
      background: transparent;
      color: var(--color-ink);
      border-color: var(--color-border);
    }
    .btn--ghost:hover:not(:disabled) {
      background: var(--color-surface-alt);
    }

    .btn--danger {
      background: var(--color-danger);
      color: #fff;
    }
    .btn--danger:hover:not(:disabled) {
      filter: brightness(0.93);
    }

    .btn--text {
      background: transparent;
      color: var(--color-primary);
      padding-left: 6px;
      padding-right: 6px;
    }
    .btn--text:hover:not(:disabled) {
      text-decoration: underline;
    }

    .btn:disabled {
      background: var(--color-border-soft);
      color: var(--color-ink-subtle);
      border-color: var(--color-border);
      cursor: not-allowed;
    }

    .btn:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  `,
})
export class AppButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input<boolean>(false);
  readonly type = input<'button' | 'submit'>('button');

  readonly clicked = output<void>();

  protected readonly classes = computed(() => `btn--${this.size()} btn--${this.variant()}`);

  protected onClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/app-button/
git commit -m "feat(ui): AppButton — 5 biến thể, 2 kích thước"
```

---

### Task 9: Mở rộng `EmptyState` và cập nhật `MATERIAL_IMPORTS`

**Files:**
- Modify: `../../src/app/shared/components/empty-state/empty-state.ts`
- Modify: `../../src/app/shared/components/empty-state/empty-state.spec.ts`
- Modify: `../../src/app/shared/material.ts`

**Interfaces:**
- Consumes: token Task 1
- Produces: `EmptyState` thêm input `actionLabel` và output `actionClicked`

- [ ] **Step 1: Viết test thất bại**

Thêm vào `../../src/app/shared/components/empty-state/empty-state.spec.ts` (giữ nguyên 2 test cũ, thêm 2 test mới):

```ts
  it('hiển thị nút hành động khi có actionLabel', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('actionLabel', 'Thêm hãng hàng không');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button')?.textContent).toContain('Thêm hãng hàng không');
  });

  it('phát sự kiện actionClicked khi bấm nút', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('actionLabel', 'Thêm');
    await fixture.whenStable();
    let emitted = false;
    fixture.componentInstance.actionClicked.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    expect(emitted).toBe(true);
  });
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — không có `actionLabel` / `actionClicked`.

- [ ] **Step 3: Mở rộng component**

Thay toàn bộ `../../src/app/shared/components/empty-state/empty-state.ts`:

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppButton } from '../../ui/app-button/app-button';

/**
 * Trạng thái danh sách rỗng.
 *
 * BR-LIST-02: kết quả rỗng là trạng thái hợp lệ, không phải lỗi — nên đây là
 * một component hiển thị bình thường, không phải màn hình lỗi. Có nút hành động
 * để biến màn rỗng thành lời mời làm việc, thay vì để người dùng bế tắc.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, AppButton],
  template: `
    <div class="empty-state">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      <p class="empty-state__title">{{ message() }}</p>
      @if (hint()) {
        <p class="empty-state__hint">{{ hint() }}</p>
      }
      @if (actionLabel()) {
        <app-app-button size="sm" (clicked)="actionClicked.emit()">
          {{ actionLabel() }}
        </app-app-button>
      }
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 44px 16px;
      text-align: center;
      color: var(--color-ink-muted);
    }

    .empty-state mat-icon {
      width: 48px;
      height: 48px;
      font-size: 48px;
      color: var(--color-ink-subtle);
    }

    .empty-state__title {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 600;
      color: var(--color-ink);
    }

    .empty-state__hint {
      margin: 0;
      font-size: var(--text-small);
    }
  `,
})
export class EmptyState {
  readonly message = input<string>('Không có dữ liệu');
  readonly hint = input<string>('');
  readonly icon = input<string>('inbox');
  readonly actionLabel = input<string>('');

  readonly actionClicked = output<void>();
}
```

- [ ] **Step 4: Cập nhật `MATERIAL_IMPORTS`**

Sửa `../../src/app/shared/material.ts` — thêm `MatSortModule` và `MatDatepickerModule` (dùng cho bảng CRUD ở task sau):

```ts
import { MatSortModule } from '@angular/material/sort';
import { MatDatepickerModule } from '@angular/material/datepicker';
```

và thêm vào mảng:

```ts
export const MATERIAL_IMPORTS = [
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDatepickerModule,
  MatDialogModule,
  MatDividerModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSelectModule,
  MatSidenavModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
] as const;
```

- [ ] **Step 5: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS toàn bộ (4 test cũ của EmptyState nay thành 6).

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/components/empty-state/ src/app/shared/material.ts
git commit -m "feat(ui): EmptyState có nút hành động + bổ sung Material module"
```

---

### Task 10: Model và mock layer cho Airline

**Files:**
- Create: `../../src/app/core/models/airline.model.ts`
- Create: `../../src/app/core/mock/mock-response.ts`
- Create: `../../src/app/core/mock/data/airlines.mock.ts`
- Create: `../../src/app/core/mock/mock-registry.ts`
- Create: `../../src/app/core/mock/mock.interceptor.ts`
- Modify: `../../src/environments/environment.ts`
- Modify: `../../src/app/app.config.ts`
- Test: `../../src/app/core/mock/mock-registry.spec.ts`

**Interfaces:**
- Consumes: `ApiResponse`, `PageData` từ `core/models/api-response.model.ts` (đã có)
- Produces:
  - `Airline { id, airline_code, airline_name, country, logo_url, is_active, is_deleted }`
  - `MockRegistry.resolve(method: string, url: string, body?: unknown): unknown | undefined` — trả `undefined` nghĩa là không có mock, để request đi tiếp
  - `mockInterceptor: HttpInterceptorFn`
  - `environment.useMock: boolean`

**Căn cứ API v0.2:** `GET /api/v1/airlines` (public), `GET/POST/PUT/DELETE /api/v1/airlines/{id}`. Envelope `{code, message, data}`, danh sách `{items, pagination}`. Mã lỗi: `1004` không tìm thấy, `1005` trùng mã.

- [ ] **Step 1: Viết test thất bại**

Tạo `../../src/app/core/mock/mock-registry.spec.ts`:

```ts
import { MockRegistry } from './mock-registry';

describe('MockRegistry', () => {
  let registry: MockRegistry;

  beforeEach(() => {
    registry = new MockRegistry();
  });

  it('trả undefined cho đường dẫn không có mock', () => {
    expect(registry.resolve('GET', '/api/v1/khong-ton-tai')).toBeUndefined();
  });

  it('trả danh sách hãng hàng không theo đúng envelope', () => {
    const res = registry.resolve('GET', '/api/v1/airlines?page=1&size=20') as any;
    expect(res.code).toBe(1000);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.pagination).toEqual(
      expect.objectContaining({ page: 1, size: 20, total_items: expect.any(Number) }),
    );
  });

  it('dùng snake_case cho trường dữ liệu', () => {
    const res = registry.resolve('GET', '/api/v1/airlines') as any;
    const first = res.data.items[0];
    expect(first).toHaveProperty('airline_code');
    expect(first).toHaveProperty('airline_name');
    expect(first).not.toHaveProperty('airlineCode');
  });

  it('lọc theo keyword', () => {
    const res = registry.resolve('GET', '/api/v1/airlines?keyword=Vietjet') as any;
    expect(res.data.items.length).toBeGreaterThan(0);
    expect(
      res.data.items.every((a: any) =>
        a.airline_name.toLowerCase().includes('vietjet'),
      ),
    ).toBe(true);
  });

  it('phân trang đúng — trang 2 khác trang 1', () => {
    const p1 = registry.resolve('GET', '/api/v1/airlines?page=1&size=2') as any;
    const p2 = registry.resolve('GET', '/api/v1/airlines?page=2&size=2') as any;
    expect(p1.data.items[0].id).not.toBe(p2.data.items[0].id);
    expect(p1.data.pagination.total_pages).toBeGreaterThan(1);
  });

  it('trả 1004 khi lấy id không tồn tại', () => {
    const res = registry.resolve('GET', '/api/v1/airlines/99999') as any;
    expect(res.code).toBe(1004);
  });

  it('trả 1005 khi tạo trùng mã hãng', () => {
    const res = registry.resolve('POST', '/api/v1/airlines', {
      airline_code: 'VN',
      airline_name: 'Trùng mã',
    }) as any;
    expect(res.code).toBe(1005);
  });

  it('xóa mềm rồi thì không còn thấy trong danh sách', () => {
    registry.resolve('DELETE', '/api/v1/airlines/1');
    const res = registry.resolve('GET', '/api/v1/airlines?size=100') as any;
    expect(res.data.items.some((a: any) => a.id === 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './mock-registry'`.

- [ ] **Step 3: Tạo model**

Tạo `../../src/app/core/models/airline.model.ts`:

```ts
/** Hãng hàng không — khớp API Design v0.2 mục 2.5 và bảng airlines (DB v0.4). */
export interface Airline {
  id: number;
  airline_code: string;
  airline_name: string;
  country: string | null;
  logo_url: string | null;
  /** Bật/tắt sử dụng (tách khỏi xóa mềm). */
  is_active: boolean;
  /** Xóa mềm — bản ghi vẫn giữ để tra lịch sử. */
  is_deleted: boolean;
}

export type AirlinePayload = Omit<Airline, 'id' | 'is_deleted'>;
```

- [ ] **Step 4: Tạo helper dựng response**

Tạo `../../src/app/core/mock/mock-response.ts`:

```ts
import { ApiCode, ApiResponse, PageData } from '../models/api-response.model';

/**
 * Dựng envelope giống hệt Backend thật.
 *
 * Vì sao phải giống hệt: mục đích của mock là để khi nối API thật chỉ cần
 * tắt cờ, không phải sửa component. Nếu mock trả shape khác, component sẽ
 * viết theo shape sai và vỡ khi gặp dữ liệu thật.
 */
export function ok<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { code: ApiCode.SUCCESS, message, data };
}

export function notFound(message = 'Không tìm thấy tài nguyên'): ApiResponse<null> {
  return { code: ApiCode.RESOURCE_NOT_FOUND, message, data: null };
}

export function duplicate(message = 'Tài nguyên đã tồn tại'): ApiResponse<null> {
  return { code: ApiCode.DUPLICATE_RESOURCE, message, data: null };
}

export function businessError(message: string): ApiResponse<null> {
  return { code: ApiCode.BUSINESS_RULE_VIOLATION, message, data: null };
}

/**
 * Cắt danh sách theo tham số phân trang (mục 1.6 API v0.2).
 * `page` bắt đầu từ 1; `size` mặc định 20, tối đa 100.
 */
export function paginate<T>(all: T[], page = 1, size = 20): PageData<T> {
  const safeSize = Math.min(Math.max(size, 1), 100);
  const safePage = Math.max(page, 1);
  const start = (safePage - 1) * safeSize;
  const items = all.slice(start, start + safeSize);

  return {
    items,
    pagination: {
      page: safePage,
      size: safeSize,
      total_items: all.length,
      total_pages: Math.max(Math.ceil(all.length / safeSize), 1),
    },
  };
}

/** Đọc tham số từ query string của URL. */
export function readParams(url: string): URLSearchParams {
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  return new URLSearchParams(q);
}
```

- [ ] **Step 5: Tạo dữ liệu giả**

Tạo `../../src/app/core/mock/data/airlines.mock.ts`:

```ts
import { Airline } from '../../models/airline.model';

/**
 * Dữ liệu giả cho hãng hàng không.
 *
 * Dùng tên hãng nội địa thật để màn hình trông giống thật khi demo —
 * dữ liệu "Hãng A, Hãng B" làm người xem không hình dung được bố cục thật.
 */
export const AIRLINES_MOCK: Airline[] = [
  {
    id: 1,
    airline_code: 'VN',
    airline_name: 'Vietnam Airlines',
    country: 'Việt Nam',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
  {
    id: 2,
    airline_code: 'VJ',
    airline_name: 'Vietjet Air',
    country: 'Việt Nam',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
  {
    id: 3,
    airline_code: 'QH',
    airline_name: 'Bamboo Airways',
    country: 'Việt Nam',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
  {
    id: 4,
    airline_code: 'VU',
    airline_name: 'Vietravel Airlines',
    country: 'Việt Nam',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
  {
    id: 5,
    airline_code: 'BL',
    airline_name: 'Pacific Airlines',
    country: 'Việt Nam',
    logo_url: null,
    is_active: false,
    is_deleted: false,
  },
  {
    id: 6,
    airline_code: 'VJ2',
    airline_name: 'Thai Vietjet Air',
    country: 'Thái Lan',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
];
```

- [ ] **Step 6: Tạo registry**

Tạo `../../src/app/core/mock/mock-registry.ts`:

```ts
import { Airline } from '../models/airline.model';
import { AIRLINES_MOCK } from './data/airlines.mock';
import { businessError, duplicate, notFound, ok, paginate, readParams } from './mock-response';

/**
 * Sổ tra cứu mock: ánh xạ (method + đường dẫn) sang dữ liệu giả.
 *
 * Vì sao dùng lớp có trạng thái thay vì hàm thuần: các thao tác ghi (tạo,
 * sửa, xóa mềm) phải thấy được ở lần đọc sau — nếu không thì không thử được
 * luồng CRUD thật. Dữ liệu chỉ nằm trong bộ nhớ, tải lại trang là về ban đầu.
 */
export class MockRegistry {
  private airlines: Airline[] = AIRLINES_MOCK.map((a) => ({ ...a }));
  private nextId = 100;

  /**
   * Trả dữ liệu giả, hoặc `undefined` nếu đường dẫn này không có mock
   * (để request đi tiếp ra mạng thật).
   */
  resolve(method: string, url: string, body?: unknown): unknown | undefined {
    const path = url.split('?')[0];
    const m = method.toUpperCase();

    if (path === '/api/v1/airlines' && m === 'GET') {
      return this.listAirlines(url);
    }
    if (path === '/api/v1/airlines' && m === 'POST') {
      return this.createAirline(body);
    }

    const idMatch = path.match(/^\/api\/v1\/airlines\/(\d+)$/);
    if (idMatch) {
      const id = Number(idMatch[1]);
      if (m === 'GET') return this.getAirline(id);
      if (m === 'PUT') return this.updateAirline(id, body);
      if (m === 'DELETE') return this.deleteAirline(id);
    }

    return undefined;
  }

  private alive(): Airline[] {
    // Xóa mềm: bản ghi vẫn nằm trong mảng nhưng không được lộ ra ngoài.
    return this.airlines.filter((a) => !a.is_deleted);
  }

  private listAirlines(url: string): unknown {
    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const isActive = params.get('is_active');

    let rows = this.alive();
    if (keyword) {
      rows = rows.filter(
        (a) =>
          a.airline_name.toLowerCase().includes(keyword) ||
          a.airline_code.toLowerCase().includes(keyword),
      );
    }
    if (isActive !== null) {
      rows = rows.filter((a) => a.is_active === (isActive === 'true'));
    }

    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getAirline(id: number): unknown {
    const found = this.alive().find((a) => a.id === id);
    return found ? ok(found) : notFound('Không tìm thấy hãng hàng không');
  }

  private createAirline(body: unknown): unknown {
    const payload = (body ?? {}) as Partial<Airline>;
    const code = (payload.airline_code ?? '').trim().toUpperCase();

    if (!code) {
      return businessError('Mã hãng hàng không không được để trống');
    }
    if (this.alive().some((a) => a.airline_code === code)) {
      return duplicate(`Mã hãng "${code}" đã tồn tại`);
    }

    const created: Airline = {
      id: this.nextId++,
      airline_code: code,
      airline_name: payload.airline_name ?? '',
      country: payload.country ?? null,
      logo_url: payload.logo_url ?? null,
      is_active: payload.is_active ?? true,
      is_deleted: false,
    };
    this.airlines.push(created);
    return ok(created, 'Tạo hãng hàng không thành công');
  }

  private updateAirline(id: number, body: unknown): unknown {
    const target = this.alive().find((a) => a.id === id);
    if (!target) {
      return notFound('Không tìm thấy hãng hàng không');
    }

    const payload = (body ?? {}) as Partial<Airline>;
    const code = (payload.airline_code ?? target.airline_code).trim().toUpperCase();

    if (this.alive().some((a) => a.airline_code === code && a.id !== id)) {
      return duplicate(`Mã hãng "${code}" đã tồn tại`);
    }

    Object.assign(target, {
      airline_code: code,
      airline_name: payload.airline_name ?? target.airline_name,
      country: payload.country ?? target.country,
      logo_url: payload.logo_url ?? target.logo_url,
      is_active: payload.is_active ?? target.is_active,
    });
    return ok(target, 'Cập nhật thành công');
  }

  private deleteAirline(id: number): unknown {
    const target = this.alive().find((a) => a.id === id);
    if (!target) {
      return notFound('Không tìm thấy hãng hàng không');
    }
    // Xóa mềm: DB v0.4 tách is_active (bật/tắt) khỏi is_deleted (xóa mềm).
    target.is_deleted = true;
    return ok(null, 'Đã xóa hãng hàng không');
  }
}
```

- [ ] **Step 7: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS — 8 test mới của MockRegistry.

- [ ] **Step 8: Tạo interceptor**

Tạo `../../src/app/core/mock/mock.interceptor.ts`:

```ts
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { delay, of } from 'rxjs';
import { ApiCode, ApiResponse } from '../models/api-response.model';
import { MockRegistry } from './mock-registry';

/**
 * Chặn request và trả dữ liệu giả khi bật cờ useMock.
 *
 * Vì sao dùng interceptor thay vì thay service: service và component giữ
 * nguyên y như code thật (vẫn gọi HttpClient), nên tắt mock chỉ cần đổi một
 * cờ — không phải sửa code, không có hai nhánh song song trong service.
 */
export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  const registry = inject(MockRegistry);
  const result = registry.resolve(req.method, req.url, req.body);

  // Không có mock cho đường dẫn này -> để request đi tiếp ra mạng thật.
  if (result === undefined) {
    return next(req);
  }

  const envelope = result as ApiResponse<unknown>;
  const httpStatus = statusFor(envelope.code);

  // Độ trễ giả lập để thấy được trạng thái đang tải trên UI.
  return of(new HttpResponse({ status: httpStatus, body: envelope })).pipe(delay(320));
};

/** Ánh xạ mã nghiệp vụ sang HTTP status, giống Backend thật (mục 1.4 API v0.2). */
function statusFor(code: number): number {
  switch (code) {
    case ApiCode.SUCCESS:
      return 200;
    case ApiCode.VALIDATION_ERROR:
    case ApiCode.INVALID_CREDENTIALS:
      return 400;
    case ApiCode.UNAUTHENTICATED:
      return 401;
    case ApiCode.ACCESS_DENIED:
    case ApiCode.ACCOUNT_INACTIVE:
      return 403;
    case ApiCode.RESOURCE_NOT_FOUND:
      return 404;
    case ApiCode.DUPLICATE_RESOURCE:
    case ApiCode.BUSINESS_RULE_VIOLATION:
      return 409;
    default:
      return 500;
  }
}

/** Dùng khi cần trả lỗi HTTP thật (ví dụ test nhánh lỗi). */
export function mockHttpError(code: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status: statusFor(code), error: { code, message, data: null } });
}
```

- [ ] **Step 9: Thêm cờ `useMock` vào environment**

Thay `../../src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  /** Base path của Backend API — khớp tài liệu API Design v0.2 */
  apiBaseUrl: 'http://localhost:8080/api/v1',
  /**
   * Bật mock layer khi Backend chưa có endpoint thật.
   * Tắt đi thì request đi thẳng ra apiBaseUrl, không phải sửa code.
   */
  useMock: true,
};
```

- [ ] **Step 10: Đăng ký interceptor trong `app.config.ts`**

Thay `../../src/app/app.config.ts`:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { MockRegistry } from './core/mock/mock-registry';
import { mockInterceptor } from './core/mock/mock.interceptor';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // MockRegistry là stateful (nhớ các thao tác ghi) nên phải là singleton.
    MockRegistry,
    provideHttpClient(
      withInterceptors(
        // Thứ tự quan trọng: authInterceptor chạy trước để gắn token, rồi mới
        // tới mockInterceptor. Mock đứng sau nên vẫn thấy được header thật.
        environment.useMock ? [authInterceptor, mockInterceptor] : [authInterceptor],
      ),
    ),
  ],
};
```

- [ ] **Step 11: Chạy toàn bộ test**

Run: `npx ng test --watch=false`
Expected: PASS toàn bộ.

- [ ] **Step 12: Commit**

```bash
git add src/app/core/models/airline.model.ts src/app/core/mock/ src/environments/environment.ts src/app/app.config.ts
git commit -m "feat(mock): mock layer cho Airline — interceptor + registry + dữ liệu giả"
```

---

### Task 11: `BaseCrudService`

**Files:**
- Create: `../../src/app/core/services/base-crud.service.ts`
- Test: `../../src/app/core/services/base-crud.service.spec.ts`

**Interfaces:**
- Consumes: `ApiResponse`, `PageData`, `ListQuery` từ `core/models/api-response.model.ts`
- Produces:
  - `class BaseCrudService<T, P = Partial<T>>` với constructor nhận `resourcePath: string`
  - `list(query?: ListQuery): Observable<ApiResponse<PageData<T>>>`
  - `getById(id: number): Observable<ApiResponse<T>>`
  - `create(payload: P): Observable<ApiResponse<T>>`
  - `update(id: number, payload: P): Observable<ApiResponse<T>>`
  - `remove(id: number): Observable<ApiResponse<null>>`

- [ ] **Step 1: Viết test thất bại**

Tạo `../../src/app/core/services/base-crud.service.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Airline } from '../models/airline.model';
import { BaseCrudService } from './base-crud.service';

class AirlineService extends BaseCrudService<Airline> {
  constructor() {
    super('airlines');
  }
}

describe('BaseCrudService', () => {
  let service: AirlineService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AirlineService],
    });
    service = TestBed.inject(AirlineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gọi đúng đường dẫn danh sách', () => {
    service.list().subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/v1/airlines');
    expect(req.request.method).toBe('GET');
    req.flush({ code: 1000, message: 'Success', data: { items: [], pagination: {} } });
  });

  it('truyền tham số lọc và phân trang lên query string', () => {
    service.list({ page: 2, size: 10, keyword: 'viet' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/v1/airlines');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('keyword')).toBe('viet');
    req.flush({ code: 1000, message: 'Success', data: { items: [], pagination: {} } });
  });

  it('gọi đúng đường dẫn chi tiết theo id', () => {
    service.getById(7).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/airlines/7');
    expect(req.request.method).toBe('GET');
    req.flush({ code: 1000, message: 'Success', data: null });
  });

  it('gửi POST khi tạo mới', () => {
    service.create({ airline_code: 'XX' } as Partial<Airline>).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/airlines');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ airline_code: 'XX' });
    req.flush({ code: 1000, message: 'Success', data: null });
  });

  it('gửi PUT khi cập nhật', () => {
    service.update(7, { airline_name: 'Mới' } as Partial<Airline>).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/airlines/7');
    expect(req.request.method).toBe('PUT');
    req.flush({ code: 1000, message: 'Success', data: null });
  });

  it('gửi DELETE khi xóa', () => {
    service.remove(7).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/airlines/7');
    expect(req.request.method).toBe('DELETE');
    req.flush({ code: 1000, message: 'Success', data: null });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './base-crud.service'`.

- [ ] **Step 3: Viết service**

Tạo `../../src/app/core/services/base-crud.service.ts`:

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListQuery, PageData } from '../models/api-response.model';

/**
 * Service CRUD tổng quát cho các module master data.
 *
 * Vì sao cần lớp này: 7 module master data (Airline, City, Airport, Aircraft,
 * Promotion, Voucher, News) có cùng một dạng thao tác. Viết một lần rồi cho
 * các module con kế thừa — chỉ khai đường dẫn — thay vì lặp lại 7 lần.
 *
 * Không chứa logic riêng của module nào; module nào cần thêm thì viết ở lớp con.
 */
export class BaseCrudService<T, P = Partial<T>> {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = `${environment.apiBaseUrl}/${this.resourcePath}`;

  constructor(private readonly resourcePath: string) {}

  /** Danh sách có phân trang, lọc, sắp xếp (mục 1.6 API v0.2). */
  list(query: ListQuery = {}): Observable<ApiResponse<PageData<T>>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ApiResponse<PageData<T>>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${id}`);
  }

  create(payload: P): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.baseUrl, payload);
  }

  update(id: number, payload: P): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}/${id}`, payload);
  }

  /** Xóa mềm — DB v0.4 giữ bản ghi lại để tra lịch sử. */
  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx ng test --watch=false`
Expected: PASS — 6 test mới.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/base-crud.service.ts src/app/core/services/base-crud.service.spec.ts
git commit -m "feat(core): BaseCrudService — CRUD tổng quát cho master data"
```

---

### Task 12: Service Airline cụ thể

**Files:**
- Create: `../../src/app/core/services/airline.service.ts`

**Interfaces:**
- Consumes: `BaseCrudService` (Task 11), `Airline` (Task 10)
- Produces: `AirlineService` — `@Injectable({ providedIn: 'root' })`, dùng được qua `inject(AirlineService)`

- [ ] **Step 1: Viết service**

Tạo `../../src/app/core/services/airline.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { Airline } from '../models/airline.model';
import { BaseCrudService } from './base-crud.service';

/**
 * Hãng hàng không — kế thừa toàn bộ CRUD từ BaseCrudService.
 *
 * Đây là "con thỏ thử" của kiến trúc: nếu lớp này chạy đúng thì 6 module
 * master data còn lại chỉ cần copy đúng mẫu này, đổi đường dẫn.
 */
@Injectable({ providedIn: 'root' })
export class AirlineService extends BaseCrudService<Airline> {
  constructor() {
    super('airlines');
  }
}
```

- [ ] **Step 2: Build kiểm tra**

Run: `npx ng build --configuration development`
Expected: build thành công.

- [ ] **Step 3: Chạy toàn bộ test**

Run: `npx ng test --watch=false`
Expected: PASS toàn bộ.

- [ ] **Step 4: Commit**

```bash
git add src/app/core/services/airline.service.ts
git commit -m "feat(core): AirlineService — module master data mẫu"
```

---

### Task 13: Trang Style Guide

**Files:**
- Create: `../../src/app/features/style-guide/style-guide.ts`
- Modify: `../../src/app/app.routes.ts`

**Interfaces:**
- Consumes: mọi component nền Task 4–9, token Task 1–3
- Produces: route `/style-guide` (guard `staffGuard` — chỉ STAFF/ADMIN xem)

- [ ] **Step 1: Tạo trang style guide**

Tạo `../../src/app/features/style-guide/style-guide.ts`:

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { AppAlert } from '../../shared/ui/app-alert/app-alert';
import { AppButton } from '../../shared/ui/app-button/app-button';
import { AppCard } from '../../shared/ui/app-card/app-card';
import { LoadingState } from '../../shared/ui/loading-state/loading-state';
import { SkeletonBlock } from '../../shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

interface TokenRow {
  name: string;
  value: string;
  usage: string;
}

/**
 * Trang tra cứu design system.
 *
 * Vì sao cần trang này: khi làm trang mới, người làm mở đây đối chiếu thay vì
 * đoán màu hay tự chế component. Cũng là nơi kiểm chứng Tailwind và Material
 * đã dùng chung một nguồn màu chưa.
 */
@Component({
  selector: 'app-style-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    AppButton,
    AppCard,
    AppAlert,
    StatusBadge,
    LoadingState,
    SkeletonBlock,
    EmptyState,
  ],
  template: `
    <app-page-header
      title="Design system"
      subtitle="Tra cứu token và component dùng chung. Đối chiếu trước khi làm trang mới."
    >
      <app-app-button variant="ghost" size="sm" (clicked)="toggleTheme()">
        {{ dark() ? 'Chế độ sáng' : 'Chế độ tối' }}
      </app-app-button>
    </app-page-header>

    <section class="block">
      <h2 class="block__title">Màu — kiểm chứng hai hệ đã khớp</h2>
      <p class="block__hint">
        Hai ô đầu phải <strong>cùng một màu</strong>. Nếu lệch, token chưa được nối đúng.
      </p>
      <div class="check-row">
        <div class="check">
          <span class="check__chip" style="background: var(--mat-sys-primary)"></span>
          <span class="check__label">Material<br /><code>--mat-sys-primary</code></span>
        </div>
        <div class="check">
          <span class="check__chip bg-primary"></span>
          <span class="check__label">Tailwind<br /><code>bg-primary</code></span>
        </div>
        <div class="check">
          <span class="check__chip" style="background: var(--color-primary)"></span>
          <span class="check__label">Token<br /><code>--color-primary</code></span>
        </div>
      </div>

      <div class="swatches">
        @for (t of colorTokens; track t.name) {
          <div class="swatch">
            <span class="swatch__chip" [style.background]="'var(' + t.name + ')'"></span>
            <span class="swatch__name">{{ t.name }}</span>
            <span class="swatch__value">{{ t.value }}</span>
            <span class="swatch__usage">{{ t.usage }}</span>
          </div>
        }
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Chữ</h2>
      <div class="type-scale">
        <div class="type-row">
          <span class="type-tag">display</span>
          <span class="type-display">Đặt vé máy bay nội địa</span>
        </div>
        <div class="type-row">
          <span class="type-tag">h1</span>
          <span class="type-h1">Chuyến bay Hà Nội → Đà Nẵng</span>
        </div>
        <div class="type-row">
          <span class="type-tag">h2</span>
          <span class="type-h2">Kết quả tìm kiếm</span>
        </div>
        <div class="type-row">
          <span class="type-tag">body</span>
          <span class="type-body">
            Giá hiển thị đã gồm thuế phí, áp dụng cho một người lớn. Trẻ em 75%, em bé 10%.
          </span>
        </div>
        <div class="type-row">
          <span class="type-tag">small</span>
          <span class="type-small">Phổ thông Lite · 23kg ký gửi · hoàn vé trước 24h</span>
        </div>
        <div class="type-row">
          <span class="type-tag">caption</span>
          <span class="type-caption">Còn 4 ghế</span>
        </div>
        <div class="type-row">
          <span class="type-tag">tabular</span>
          <span class="type-body tabular">1.450.000 ₫ · 1.190.000 ₫ · 986.000 ₫</span>
        </div>
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Nút</h2>
      <p class="block__hint">Chỉ một nút primary trong mỗi vùng nhìn.</p>
      <div class="row">
        <app-app-button variant="primary">Tìm chuyến bay</app-app-button>
        <app-app-button variant="secondary">Xem chi tiết</app-app-button>
        <app-app-button variant="ghost">Hủy</app-app-button>
        <app-app-button variant="danger">Xóa</app-app-button>
        <app-app-button variant="text">Bỏ qua</app-app-button>
        <app-app-button variant="primary" [disabled]="true">Đang xử lý…</app-app-button>
      </div>
      <div class="row" style="margin-top: 10px">
        <app-app-button size="sm">Lưu</app-app-button>
        <app-app-button size="sm" variant="ghost">Sửa</app-app-button>
        <app-app-button size="sm" variant="text">Xóa mềm</app-app-button>
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Nhãn trạng thái</h2>
      <p class="block__hint">Ánh xạ từ trạng thái dữ liệu. Cùng trạng thái phải cùng màu ở mọi màn.</p>
      <div class="row">
        <app-status-badge tone="success" label="Còn vé" />
        <app-status-badge tone="warning" label="Sắp hết" />
        <app-status-badge tone="danger" label="Hết chỗ" />
        <app-status-badge tone="info" label="Đang giữ" />
        <app-status-badge tone="neutral" label="Bị khóa" />
      </div>
      <div class="row" style="margin-top: 10px">
        <app-status-badge tone="success" label="Đã xác nhận" />
        <app-status-badge tone="warning" label="Chờ thanh toán" />
        <app-status-badge tone="danger" label="Đã hủy" />
        <app-status-badge tone="neutral" label="Hết hạn" />
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Thông báo</h2>
      <div class="alerts">
        <app-alert tone="success" title="Đặt vé thành công" message="Mã đặt chỗ của bạn là ABC123." />
        <app-alert tone="info" title="Lưu ý" message="Voucher không áp dụng cho hành khách em bé." />
        <app-alert tone="warning" title="Chỉ còn 3 ghế" message="Giá có thể thay đổi bất cứ lúc nào." />
        <app-alert tone="error" title="Không thể hủy vé" message="Đã quá sát giờ khởi hành." />
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Card</h2>
      <div class="cards">
        <app-app-card title="Vietnam Airlines" subtitle="VN · Việt Nam">
          <p class="muted-text">Card có vùng đầu, thân, và không có chân vì không cần hành động.</p>
        </app-app-card>

        <app-app-card title="Vietjet Air" subtitle="VJ · Việt Nam" [hasFooter]="true">
          <p class="muted-text">Card này có vùng chân vì có hành động.</p>
          <div cardActions><app-status-badge tone="success" label="Hoạt động" /></div>
          <div cardFooter>
            <app-app-button size="sm" variant="ghost">Sửa</app-app-button>
            <app-app-button size="sm">Lưu</app-app-button>
          </div>
        </app-app-card>
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Trạng thái rỗng và đang tải</h2>
      <p class="block__hint">Kết quả rỗng là trạng thái hợp lệ, không phải lỗi (BR-LIST-02).</p>
      <div class="cards">
        <app-app-card>
          <app-empty-state
            icon="flight_takeoff"
            message="Chưa có hãng hàng không"
            hint="Bấm nút bên dưới để bắt đầu"
            actionLabel="Thêm hãng hàng không"
          />
        </app-app-card>
        <app-app-card>
          <app-loading-state />
        </app-app-card>
        <app-app-card>
          <app-skeleton-block width="62%" height="13px" />
          <div style="height: 11px"></div>
          <app-skeleton-block width="88%" height="13px" />
          <div style="height: 11px"></div>
          <app-skeleton-block width="74%" height="13px" />
        </app-app-card>
      </div>
    </section>
  `,
  styles: `
    .block {
      margin-bottom: 34px;
    }

    .block__title {
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      font-weight: 700;
      margin: 0 0 4px;
    }

    .block__hint {
      margin: 0 0 14px;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      max-width: 72ch;
    }

    .row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .check-row {
      display: flex;
      gap: 22px;
      flex-wrap: wrap;
      margin-bottom: 18px;
      padding: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }

    .check {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .check__chip {
      width: 46px;
      height: 46px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      flex: 0 0 auto;
    }

    .check__label {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      line-height: 1.45;
    }

    .check__label code {
      font-size: var(--text-caption);
      color: var(--color-ink);
    }

    .swatches {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(178px, 1fr));
      gap: 10px;
    }

    .swatch {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 11px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .swatch__chip {
      height: 34px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      margin-bottom: 5px;
    }

    .swatch__name {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink);
    }

    .swatch__value {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-variant-numeric: tabular-nums;
    }

    .swatch__usage {
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
    }

    .type-scale {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 6px 18px;
    }

    .type-row {
      display: flex;
      align-items: baseline;
      gap: 18px;
      padding: 11px 0;
      border-bottom: 1px solid var(--color-border-soft);
    }

    .type-row:last-child {
      border-bottom: 0;
    }

    .type-tag {
      flex: 0 0 76px;
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
    }

    .type-display {
      font-family: var(--font-heading);
      font-size: var(--text-display);
      font-weight: 700;
      line-height: var(--leading-tight);
    }
    .type-h1 {
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      font-weight: 700;
    }
    .type-h2 {
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      font-weight: 700;
    }
    .type-body {
      font-size: var(--text-body);
    }
    .type-small {
      font-size: var(--text-small);
    }
    .type-caption {
      font-size: var(--text-caption);
    }

    .alerts {
      display: flex;
      flex-direction: column;
      gap: 9px;
      max-width: 620px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(268px, 1fr));
      gap: 14px;
    }

    .muted-text {
      margin: 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
  `,
})
export class StyleGuide {
  protected readonly dark = signal(false);

  protected readonly colorTokens: TokenRow[] = [
    { name: '--color-primary', value: '#0194F3', usage: 'Thương hiệu, nút chính' },
    { name: '--color-primary-hover', value: '#0770CD', usage: 'Hover, nhấn' },
    { name: '--color-primary-soft', value: '#EAF7FF', usage: 'Nền vùng chọn' },
    { name: '--color-accent', value: '#FF5E1F', usage: 'Giá khuyến mãi' },
    { name: '--color-success', value: '#00A651', usage: 'Tốt, tiết kiệm' },
    { name: '--color-warning', value: '#F2A81D', usage: 'Sắp hết' },
    { name: '--color-danger', value: '#E5484D', usage: 'Lỗi, hết chỗ' },
    { name: '--color-bg', value: '#F7F9FA', usage: 'Nền trang' },
    { name: '--color-surface', value: '#FFFFFF', usage: 'Card, panel' },
    { name: '--color-ink', value: '#03121A', usage: 'Chữ chính' },
    { name: '--color-ink-muted', value: '#687176', usage: 'Chữ phụ' },
    { name: '--color-ink-subtle', value: '#9AA6AD', usage: 'Placeholder' },
    { name: '--color-border', value: '#DDE3E8', usage: 'Viền, phân cách' },
    { name: '--color-border-soft', value: '#EDF1F4', usage: 'Phân cách trong bảng' },
  ];

  protected toggleTheme(): void {
    const next = !this.dark();
    this.dark.set(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }
}
```

- [ ] **Step 2: Thêm route**

Thêm vào mảng `children` của khối `admin` trong `../../src/app/app.routes.ts` (sau route `master-data`):

```ts
      {
        path: 'style-guide',
        loadComponent: () =>
          import('./features/style-guide/style-guide').then((m) => m.StyleGuide),
        data: { title: 'Design system' },
      },
```

Route nằm trong khối `admin` nên đã được `staffGuard` bảo vệ sẵn.

- [ ] **Step 3: Build kiểm tra**

Run: `npx ng build --configuration development`
Expected: build thành công.

- [ ] **Step 4: Chạy toàn bộ test**

Run: `npx ng test --watch=false`
Expected: PASS toàn bộ.

- [ ] **Step 5: Kiểm tra bằng mắt — Review Focus #2 và #3**

Run: `npx ng serve`, đăng nhập tài khoản STAFF/ADMIN, mở `http://localhost:4200/admin/style-guide`

Kiểm tra:
- Ba ô màu ở mục "Màu" **cùng một màu** (Review Focus #2)
- Bấm "Chế độ tối" → toàn trang đổi tối, chữ vẫn đọc được
- Kiểm tra tương phản chữ phụ trên nền (Review Focus #3) — nếu khó đọc thì báo lại để chỉnh token
- Bấm Tab qua các nút → thấy viền focus

- [ ] **Step 6: Xoá test tạm của Task 2**

Xoá `src/app/shared/ui/token-check.spec.ts` — đã hoàn thành vai trò bảo vệ trong lúc nối token; giữ lại sẽ ràng buộc cứng vào nội dung file config.

```bash
rm src/app/shared/ui/token-check.spec.ts
```

- [ ] **Step 7: Chạy test lần cuối**

Run: `npx ng test --watch=false`
Expected: PASS toàn bộ.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/style-guide/ src/app/app.routes.ts
git rm --cached src/app/shared/ui/token-check.spec.ts 2>/dev/null || true
git commit -m "feat(design-system): trang style guide + route /admin/style-guide"
```

---

### Task 14: Màn hình mẫu — Admin CRUD Airlines

**Files:**
- Create: `../../src/app/features/admin/pages/airlines/airlines.ts`
- Create: `../../src/app/features/admin/pages/airlines/airline-form-dialog.ts`
- Modify: `../../src/app/app.routes.ts`
- Modify: `../../src/app/features/admin/layout/admin-layout.ts`

**Interfaces:**
- Consumes: `AirlineService` (Task 12), `AppButton`/`AppCard`/`StatusBadge`/`EmptyState`/`LoadingState` (Task 4–9), `MATERIAL_IMPORTS` (Task 9)
- Produces: route `/admin/airlines`; mẫu để nhân bản cho 6 module master data còn lại

- [ ] **Step 1: Tạo dialog thêm/sửa**

Tạo `../../src/app/features/admin/pages/airlines/airline-form-dialog.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Airline, AirlinePayload } from '../../../../core/models/airline.model';

export interface AirlineFormData {
  /** Có giá trị = sửa; null = thêm mới. */
  airline: Airline | null;
}

/** Form thêm/sửa hãng hàng không. Đây là mẫu để nhân bản cho module master data khác. */
@Component({
  selector: 'app-airline-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit() ? 'Sửa hãng hàng không' : 'Thêm hãng hàng không' }}</h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline" class="field">
        <mat-label>Mã hãng</mat-label>
        <input matInput [(ngModel)]="model.airline_code" maxlength="10" required />
        <mat-hint>Tối đa 10 ký tự, ví dụ VN</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Tên hãng</mat-label>
        <input matInput [(ngModel)]="model.airline_name" maxlength="150" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Quốc gia</mat-label>
        <input matInput [(ngModel)]="model.country" maxlength="100" />
      </mat-form-field>

      <mat-slide-toggle [(ngModel)]="model.is_active">Đang hoạt động</mat-slide-toggle>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Hủy</button>
      <button mat-flat-button type="button" [disabled]="!isValid()" (click)="save()">Lưu</button>
    </mat-dialog-actions>
  `,
  styles: `
    .field {
      display: block;
      width: 100%;
      margin-bottom: 6px;
    }

    mat-dialog-content {
      min-width: 380px;
      padding-top: 8px;
    }
  `,
})
export class AirlineFormDialog {
  private readonly dialogRef = inject(MatDialogRef<AirlineFormDialog, AirlinePayload | undefined>);
  private readonly data = inject<AirlineFormData>(MAT_DIALOG_DATA);

  protected readonly isEdit = signal(this.data.airline !== null);

  /** Bản nháp của form; khởi tạo từ dữ liệu sửa nếu có. */
  protected model: AirlinePayload = this.data.airline
    ? {
        airline_code: this.data.airline.airline_code,
        airline_name: this.data.airline.airline_name,
        country: this.data.airline.country,
        logo_url: this.data.airline.logo_url,
        is_active: this.data.airline.is_active,
      }
    : {
        airline_code: '',
        airline_name: '',
        country: null,
        logo_url: null,
        is_active: true,
      };

  protected isValid(): boolean {
    return this.model.airline_code.trim().length > 0 && this.model.airline_name.trim().length > 0;
  }

  protected save(): void {
    if (!this.isValid()) {
      return;
    }
    this.dialogRef.close({
      ...this.model,
      airline_code: this.model.airline_code.trim().toUpperCase(),
      airline_name: this.model.airline_name.trim(),
    });
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }
}
```

- [ ] **Step 2: Tạo màn danh sách**

Tạo `../../src/app/features/admin/pages/airlines/airlines.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Airline, AirlinePayload } from '../../../../core/models/airline.model';
import { AirlineService } from '../../../../core/services/airline.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingState } from '../../../../shared/ui/loading-state/loading-state';
import { AppButton } from '../../../../shared/ui/app-button/app-button';
import { AppCard } from '../../../../shared/ui/app-card/app-card';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AirlineFormDialog } from './airline-form-dialog';

/**
 * Quản lý hãng hàng không — MÀN MẪU cho 6 module master data còn lại.
 *
 * Vì sao làm Airline trước: nó có đủ mọi thành phần của một màn CRUD
 * (danh sách + lọc + phân trang + thêm/sửa + bật-tắt + xóa mềm). Khi mẫu này
 * chạy đúng thì các module sau chỉ việc đổi tên trường và đường dẫn.
 */
@Component({
  selector: 'app-admin-airlines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    PageHeader,
    AppButton,
    AppCard,
    StatusBadge,
    EmptyState,
    LoadingState,
  ],
  template: `
    <app-page-header title="Hãng hàng không" subtitle="Quản lý danh mục hãng bay nội địa">
      <app-app-button (clicked)="openCreate()">Thêm hãng hàng không</app-app-button>
    </app-page-header>

    <app-app-card>
      <div class="toolbar">
        <mat-form-field appearance="outline" class="search">
          <mat-label>Tìm theo mã hoặc tên</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [ngModel]="keyword()" (ngModelChange)="onKeyword($event)" />
        </mat-form-field>
      </div>

      @if (loading()) {
        <app-loading-state />
      } @else if (rows().length === 0) {
        <app-empty-state
          icon="flight_takeoff"
          message="Chưa có hãng hàng không"
          hint="Thêm hãng đầu tiên để bắt đầu"
          actionLabel="Thêm hãng hàng không"
          (actionClicked)="openCreate()"
        />
      } @else {
        <table mat-table [dataSource]="rows()" class="table">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Mã</th>
            <td mat-cell *matCellDef="let row" class="mono">{{ row.airline_code }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Tên hãng</th>
            <td mat-cell *matCellDef="let row">{{ row.airline_name }}</td>
          </ng-container>

          <ng-container matColumnDef="country">
            <th mat-header-cell *matHeaderCellDef>Quốc gia</th>
            <td mat-cell *matCellDef="let row">{{ row.country || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
            <td mat-cell *matCellDef="let row">
              <app-status-badge
                [tone]="row.is_active ? 'success' : 'neutral'"
                [label]="row.is_active ? 'Hoạt động' : 'Tạm dừng'"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row" class="actions">
              <app-app-button size="sm" variant="ghost" (clicked)="openEdit(row)">Sửa</app-app-button>
              <app-app-button size="sm" variant="text" (clicked)="confirmDelete(row)">
                Xóa
              </app-app-button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>

        <mat-paginator
          [length]="totalItems()"
          [pageSize]="pageSize()"
          [pageIndex]="pageIndex()"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
          showFirstLastButtons
        />
      }
    </app-app-card>
  `,
  styles: `
    .toolbar {
      margin-bottom: 6px;
    }

    .search {
      width: 100%;
      max-width: 360px;
    }

    .table {
      width: 100%;
    }

    .mono {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .actions {
      text-align: right;
      white-space: nowrap;
    }
  `,
})
export class AdminAirlines {
  private readonly airlineService = inject(AirlineService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['code', 'name', 'country', 'status', 'actions'];

  protected readonly rows = signal<Airline[]>([]);
  protected readonly loading = signal(false);
  protected readonly keyword = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalItems = signal(0);

  constructor() {
    this.load();
  }

  protected onKeyword(value: string): void {
    this.keyword.set(value);
    // BR-LIST-02: đổi từ khoá thì quay về trang 1.
    this.pageIndex.set(0);
    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected openCreate(): void {
    this.openForm(null);
  }

  protected openEdit(row: Airline): void {
    this.openForm(row);
  }

  private openForm(airline: Airline | null): void {
    this.dialog
      .open(AirlineFormDialog, { data: { airline }, width: '460px', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((payload: AirlinePayload | undefined) => {
        if (!payload) {
          return;
        }
        const request$ = airline
          ? this.airlineService.update(airline.id, payload)
          : this.airlineService.create(payload);

        request$.subscribe({
          next: (res) => {
            this.notify(res.message);
            this.load();
          },
          error: (err: Error) => this.notify(err.message),
        });
      });
  }

  protected confirmDelete(row: Airline): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Xóa hãng hàng không',
          message: `Bạn có chắc muốn xóa "${row.airline_name}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
          confirmText: 'Xóa',
          tone: 'warn',
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) {
          return;
        }
        this.airlineService.remove(row.id).subscribe({
          next: (res) => {
            this.notify(res.message);
            this.load();
          },
          error: (err: Error) => this.notify(err.message),
        });
      });
  }

  private load(): void {
    this.loading.set(true);
    this.airlineService
      .list({
        page: this.pageIndex() + 1, // API dùng trang bắt đầu từ 1
        size: this.pageSize(),
        keyword: this.keyword(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data.items);
          this.totalItems.set(res.data.pagination.total_items);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.notify(err.message);
          this.loading.set(false);
        },
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
```

- [ ] **Step 3: Thêm route**

Thêm vào mảng `children` của khối `admin` trong `../../src/app/app.routes.ts`:

```ts
      {
        path: 'airlines',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/airlines/airlines').then((m) => m.AdminAirlines),
        data: { title: 'Hãng hàng không' },
      },
```

- [ ] **Step 4: Thêm mục vào sidebar**

Trong `../../src/app/features/admin/layout/admin-layout.ts`, thêm mục vào `mat-nav-list` bên trong khối `@if (authService.isAdmin())` — đặt trước mục "Dữ liệu nền":

```html
            <a mat-list-item routerLink="/admin/airlines" routerLinkActive="active">
              <mat-icon matListItemIcon>flight</mat-icon>
              <span matListItemTitle>Hãng hàng không</span>
            </a>
```

- [ ] **Step 5: Build kiểm tra**

Run: `npx ng build --configuration development`
Expected: build thành công.

- [ ] **Step 6: Chạy toàn bộ test**

Run: `npx ng test --watch=false`
Expected: PASS toàn bộ.

- [ ] **Step 7: Kiểm tra bằng mắt toàn luồng — Review Focus #4, #5, #6**

Run: `npx ng serve`, đăng nhập ADMIN, mở `http://localhost:4200/admin/airlines`

Kiểm tra lần lượt:
1. Danh sách hiện 6 hãng với badge trạng thái đúng (Pacific Airlines phải là "Tạm dừng")
2. Gõ "Vietjet" vào ô tìm → còn 2 dòng, về trang 1 (Review Focus #4: mock trả đúng shape)
3. Bấm "Thêm hãng hàng không" → nhập mã trùng `VN` → báo lỗi trùng mã
4. Sửa 1 hãng, đổi trạng thái → danh sách cập nhật
5. Xóa 1 hãng → có hộp thoại xác nhận → biến khỏi danh sách
6. Bấm Tab qua các nút → thấy viền focus (Review Focus #6)
7. **Tắt mock:** sửa `../../src/environments/environment.ts` → `useMock: false`, tải lại trang. Danh sách phải báo lỗi kết nối (vì BE chưa chạy) — chứng tỏ request đã đi ra mạng thật, không còn lọt vào mock (Review Focus #5). **Sau khi kiểm tra xong, đặt lại `useMock: true`.**

- [ ] **Step 8: Commit**

```bash
git add src/app/features/admin/pages/airlines/ src/app/app.routes.ts src/app/features/admin/layout/admin-layout.ts
git commit -m "feat(admin): màn CRUD Airlines — màn mẫu cho master data"
```

---

## Self-Review

**1. Spec coverage:**

| Mục spec | Task |
|---|---|
| 2.1 Bảng màu | Task 1 |
| 2.2 Chữ (Be Vietnam Pro + Inter, tabular) | Task 1, 3 |
| 2.3 Bo góc, đổ bóng, khoảng cách | Task 1 |
| 2.4 Quy ước dùng token | Task 2, 3, và Global Constraints |
| 3.1 Cấu trúc file | File Structure + Task 1–14 |
| 3.2 Thứ tự thực hiện | Thứ tự task |
| 3.3 Mock layer | Task 10, 11, 12 |
| 4 Component nền | Task 4–9 |
| 4 Icon (Material, không emoji) | Task 6 (có test chặn emoji) |
| Dark mode | Task 1 (token), Task 3 (Material), Task 13 (kiểm chứng) |
| Trang style guide | Task 13 |
| Màn hình mẫu | Task 14 |
| Kiểm chứng 7 hạng mục | Review Focus + Step kiểm tra ở Task 3, 13, 14 |

Không có mục nào của spec thiếu task.

**2. Placeholder scan:** đã quét — không có "TBD", "TODO", "implement later", hay bước mô tả suông. Mọi bước code đều có code thật.

**3. Type consistency:** đã kiểm tra các tên dùng xuyên task:
- `Airline` / `AirlinePayload` — định nghĩa Task 10, dùng Task 11, 12, 14 ✓
- `BaseCrudService<T, P>` với `list/getById/create/update/remove` — định nghĩa Task 11, dùng Task 12, 14 ✓
- `StatusBadge` với `label`/`tone`, tone gồm `'neutral'` — Task 4, dùng Task 13, 14 ✓
- `AppButton` với `variant`/`size`/`disabled`/`clicked` — Task 8, dùng Task 13, 14 ✓
- `AppAlert` với `title`/`message`/`tone` — Task 6, dùng Task 13 ✓
- `AppCard` với `title`/`subtitle`/`hasFooter` + slot `cardActions`/`cardFooter` — Task 5, dùng Task 13, 14 ✓
- `EmptyState` với `actionLabel`/`actionClicked` — Task 9, dùng Task 13, 14 ✓
- `SkeletonBlock` với `width`/`height` — Task 7, dùng Task 13 ✓
- `MockRegistry.resolve(method, url, body)` — Task 10, dùng trong interceptor cùng task ✓
- `AirlineFormData` với trường `airline` — Task 14 nội bộ ✓

**4. Review Focus:** 7 dòng đã viết ở đầu plan; mỗi dòng đã gắn vào bước kiểm tra của task tương ứng (Task 3 step 5, Task 13 step 5, Task 14 step 7).

---

## Execution Handoff

Plan đã lưu tại `em-va-mock-layer.md`.
