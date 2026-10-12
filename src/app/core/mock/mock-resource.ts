import { businessError, duplicate, notFound, ok, paginate, readParams } from '@core/mock/mock-response';

/**
 * Bản ghi giả tối thiểu — mọi model master data đều có `id` và cờ xóa mềm.
 */
export interface MockRecord {
  id: number;
  is_active: boolean;
  is_deleted: boolean;
}

export interface MockResourceOptions<T extends MockRecord> {
  /** Đoạn đường dẫn, ví dụ 'cities' → khớp /api/v1/cities và /api/v1/cities/{id}. */
  path: string;
  seed: T[];
  /** Trường dùng cho `keyword` (tìm kiếm). */
  searchFields: (keyof T)[];
  /** Trường UNIQUE — trùng thì trả mã 1005. */
  uniqueField?: keyof T;
  /** Nhãn hiển thị trong thông báo lỗi, ví dụ "thành phố". */
  noun: string;
  /** Kiểm tra ràng buộc nghiệp vụ trước khi ghi; trả chuỗi lỗi nếu vi phạm. */
  validate?: (payload: Partial<T>, existing: T[]) => string | null;
}

/**
 * Một tài nguyên CRUD giả — dùng chung cho mọi module master data.
 *
 * Vì sao tổng quát hoá: trước đây mỗi module phải viết tay 4 handler
 * (list/get/create/update/delete) trong MockRegistry, lặp y hệt nhau. Với 8
 * module nữa thì đó là ~400 dòng trùng lặp. Lớp này làm một lần, mỗi module chỉ
 * khai dữ liệu giả và vài quy tắc riêng.
 *
 * Trạng thái nằm trong bộ nhớ: thao tác ghi thấy được ở lần đọc sau (để thử
 * luồng CRUD thật), nhưng tải lại trang là về ban đầu.
 */
export class MockResource<T extends MockRecord> {
  private readonly rows: T[];
  private nextId: number;

  constructor(private readonly options: MockResourceOptions<T>) {
    this.rows = options.seed.map((r) => ({ ...r }));
    this.nextId = Math.max(100, ...this.rows.map((r) => r.id)) + 1;
  }

  /** Bản ghi chưa xóa mềm — mọi truy vấn phải lọc qua đây (BR-LIST-04). */
  private alive(): T[] {
    return this.rows.filter((r) => !r.is_deleted);
  }

  /** Khớp /path và /path/{id}; trả `undefined` nếu không phải đường dẫn của mình. */
  matches(path: string): { id: number | null } | null {
    const base = `/api/v1/${this.options.path}`;
    if (path === base) {
      return { id: null };
    }
    const m = path.match(new RegExp(`^${base}/(\\d+)$`));
    return m ? { id: Number(m[1]) } : null;
  }

  handle(method: string, url: string, body?: unknown): unknown {
    const path = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '');
    const hit = this.matches(path);
    if (!hit) {
      return undefined;
    }
    const m = method.toUpperCase();

    if (hit.id === null) {
      if (m === 'GET') return this.list(url);
      if (m === 'POST') return this.create(body);
      return undefined;
    }
    if (m === 'GET') return this.getById(hit.id);
    if (m === 'PUT') return this.update(hit.id, body);
    if (m === 'DELETE') return this.remove(hit.id);
    return undefined;
  }

  private list(url: string): unknown {
    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const isActive = params.get('is_active');

    let rows = this.alive();
    if (keyword) {
      rows = rows.filter((r) =>
        this.options.searchFields.some((f) => {
          const v = r[f];
          return typeof v === 'string' && v.toLowerCase().includes(keyword);
        }),
      );
    }
    if (isActive !== null) {
      rows = rows.filter((r) => r.is_active === (isActive === 'true'));
    }

    // Các filter khác (status, country, city_id…) so khớp theo giá trị chuỗi.
    const reserved = new Set(['page', 'size', 'keyword', 'sort', 'is_active']);
    for (const [key, value] of params.entries()) {
      if (reserved.has(key)) continue;
      rows = rows.filter((r) => {
        const v = (r as Record<string, unknown>)[key];
        return v === undefined || String(v) === value;
      });
    }

    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getById(id: number): unknown {
    const found = this.alive().find((r) => r.id === id);
    return found ? ok(found) : notFound(`Không tìm thấy ${this.options.noun}`);
  }

  private create(body: unknown): unknown {
    const payload = (body ?? {}) as Partial<T>;
    const invalid = this.options.validate?.(payload, this.alive());
    if (invalid) {
      return businessError(invalid);
    }

    const dup = this.checkUnique(payload, null);
    if (dup) {
      return dup;
    }

    const created = {
      ...payload,
      id: this.nextId++,
      is_active: payload.is_active ?? true,
      is_deleted: false,
    } as T;
    this.rows.push(created);
    return ok(created, `Tạo ${this.options.noun} thành công`);
  }

  private update(id: number, body: unknown): unknown {
    const target = this.alive().find((r) => r.id === id);
    if (!target) {
      return notFound(`Không tìm thấy ${this.options.noun}`);
    }

    const payload = (body ?? {}) as Partial<T>;
    const merged = { ...target, ...payload } as T;
    const invalid = this.options.validate?.(merged, this.alive());
    if (invalid) {
      return businessError(invalid);
    }

    const dup = this.checkUnique(merged, id);
    if (dup) {
      return dup;
    }

    Object.assign(target, merged, { id });
    return ok(target, 'Cập nhật thành công');
  }

  private remove(id: number): unknown {
    const target = this.alive().find((r) => r.id === id);
    if (!target) {
      return notFound(`Không tìm thấy ${this.options.noun}`);
    }
    // DB v0.4: xóa mềm giữ bản ghi để tra lịch sử.
    target.is_deleted = true;
    return ok(null, `Đã xóa ${this.options.noun}`);
  }

  private checkUnique(payload: Partial<T>, selfId: number | null): unknown | null {
    const field = this.options.uniqueField;
    if (!field) {
      return null;
    }
    const value = payload[field];
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const clash = this.alive().some((r) => r[field] === value && r.id !== selfId);
    return clash ? duplicate(`${String(value)} đã tồn tại`) : null;
  }
}
