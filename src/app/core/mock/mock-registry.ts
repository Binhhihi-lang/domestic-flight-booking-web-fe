import { Airline } from '../models/airline.model';
import { AIRLINES_MOCK } from './data/airlines.mock';
import { buildLoginResponse, findMockUser, MOCK_PASSWORD } from './data/auth.mock';
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
   * Rút đường dẫn so sánh được từ URL.
   *
   * HttpClient đưa URL TUYỆT ĐỐI vào interceptor (http://localhost:8080/api/v1/airlines),
   * không phải đường dẫn tương đối. Bỏ phần gốc đi để so khớp được với hằng số
   * đường dẫn trong registry — nếu không, mọi request đều trượt và rơi ra mạng thật.
   */
  private static pathOf(url: string): string {
    const withoutQuery = url.split('?')[0];
    const withoutOrigin = withoutQuery.replace(/^https?:\/\/[^/]+/, '');
    return withoutOrigin || '/';
  }

  /**
   * Trả dữ liệu giả, hoặc `undefined` nếu đường dẫn này không có mock
   * (để request đi tiếp ra mạng thật).
   */
  resolve(method: string, url: string, body?: unknown): unknown | undefined {
    const path = MockRegistry.pathOf(url);
    const m = method.toUpperCase();

    // Auth: cần thiết để vào được khu vực có guard khi Backend chưa có endpoint thật.
    if (path === '/api/v1/auth/login' && m === 'POST') {
      return this.login(body);
    }
    if (path === '/api/v1/auth/logout' && m === 'POST') {
      return ok(null, 'Đã đăng xuất');
    }

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

  private login(body: unknown): unknown {
    const payload = (body ?? {}) as { email?: string; password?: string };
    const found = findMockUser(payload.email ?? '');

    // Sai email hoặc mật khẩu -> cùng một mã lỗi, không tiết lộ cái nào sai.
    if (!found || payload.password !== MOCK_PASSWORD) {
      return { code: 1007, message: 'Email hoặc mật khẩu không đúng', data: null };
    }
    return ok(buildLoginResponse(found), 'Đăng nhập thành công');
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
