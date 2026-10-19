import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PromotionPayload, PromotionScope, TripType } from '@core/models/promotion.model';
import { PromotionService } from '@core/services/catalog.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

interface ScopeRow {
  /** Khoá tạm cho @for — dòng mới chưa có id từ DB. */
  key: number;
  target_type: PromotionScope['target_type'];
  /** Giá trị đang chọn; ý nghĩa phụ thuộc `target_type`. */
  value: number | null;
  /** Với ROUTE: sân bay đến (điểm đi là `value`). */
  value2: number | null;
}

/** Một lựa chọn trong dropdown phạm vi. */
interface Option {
  value: number;
  label: string;
}

/**
 * Form khuyến mãi — trang riêng, có PHẠM VI ÁP DỤNG và LOẠI TRỪ CHUYẾN BAY.
 *
 * Vì sao không dùng `CrudPage` chung: khuyến mãi có hai bảng con
 * (`promotion_scopes`, `promotion_excluded_flights`) mà DB v0.4 quy định rõ —
 * không có dòng phạm vi nào nghĩa là áp cho TẤT CẢ chuyến bay, nhiều dòng là
 * điều kiện HOẶC, và loại trừ LUÔN thắng phạm vi. Đây là nghiệp vụ riêng, không
 * biểu diễn được bằng danh sách trường phẳng của form chung.
 */
@Component({
  selector: 'app-promotion-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppButton, AppCard, LoadingState],
  templateUrl: './promotion-form.html',
  styleUrl: './promotion-form.css',
})
export class PromotionForm {
  private readonly service = inject(PromotionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly isEdit = signal(false);
  protected readonly promoId = signal<number | null>(null);

  /** Các lựa chọn cho phạm vi — hiện là dữ liệu mẫu vì các module danh mục
   *  chưa nối API thật ở tầng form này. */
  protected readonly airlines: Option[] = [
    { value: 1, label: 'Vietnam Airlines (VN)' },
    { value: 2, label: 'Vietjet Air (VJ)' },
    { value: 3, label: 'Bamboo Airways (QH)' },
    { value: 4, label: 'Vietravel Airlines (VU)' },
  ];

  protected readonly fareClasses: Option[] = [
    { value: 1, label: 'Phổ thông tiết kiệm' },
    { value: 2, label: 'Phổ thông linh hoạt' },
    { value: 3, label: 'Thương gia' },
  ];

  protected readonly airports: Option[] = [
    { value: 1, label: 'Nội Bài (HAN)' },
    { value: 2, label: 'Tân Sơn Nhất (SGN)' },
    { value: 3, label: 'Đà Nẵng (DAD)' },
    { value: 4, label: 'Cam Ranh (CXR)' },
    { value: 5, label: 'Phú Quốc (PQC)' },
  ];

  protected readonly flights: Option[] = [
    { value: 101, label: 'VN 165 · HAN → DAD' },
    { value: 102, label: 'VJ 507 · HAN → DAD' },
    { value: 103, label: 'QH 205 · HAN → DAD' },
    { value: 104, label: 'VN 173 · HAN → DAD' },
  ];

  /** Bản nháp của form. */
  protected readonly draft = signal({
    promotion_code: '',
    promotion_name: '',
    image_url: '',
    description: '',
    badge_label: '',
    discount_type: 'PERCENT' as 'PERCENT' | 'AMOUNT',
    discount_value: null as number | null,
    max_discount_amount: null as number | null,
    min_fare_amount: null as number | null,
    applicable_trip_type: 'ANY' as TripType,
    start_date: '',
    end_date: '',
    is_active: true,
  });

  protected readonly scopes = signal<ScopeRow[]>([]);
  protected readonly excludedIds = signal<number[]>([]);
  protected readonly errors = signal<Record<string, string>>({});

  /** Ảnh thẻ khuyến mãi tải lỗi → hiện khung nền thay vì icon ảnh vỡ. */
  protected readonly imageBroken = signal(false);

  private scopeKeySeq = 1;

  /** Trần giảm chỉ có ý nghĩa với PERCENT (DB v0.4 ghi rõ). */
  protected readonly isPercent = computed(() => this.draft().discount_type === 'PERCENT');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.promoId.set(Number(id));
      this.loadOne(Number(id));
    }
  }

  private loadOne(id: number): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (res) => {
        const p = res.data;
        this.draft.set({
          promotion_code: p.promotion_code,
          promotion_name: p.promotion_name,
          image_url: p.image_url ?? '',
          description: p.description ?? '',
          badge_label: p.badge_label ?? '',
          discount_type: p.discount_type,
          discount_value: p.discount_value,
          max_discount_amount: p.max_discount_amount,
          min_fare_amount: p.min_fare_amount,
          applicable_trip_type: p.applicable_trip_type,
          start_date: p.start_date,
          end_date: p.end_date,
          is_active: p.status === 'ACTIVE',
        });
        this.scopes.set((p.scopes ?? []).map((s) => this.toScopeRow(s)));
        this.excludedIds.set(p.excluded_flight_ids ?? []);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
        this.router.navigate(['/admin/promotions']);
      },
    });
  }

  /** Chuyển một scope từ API thành dòng có khoá tạm cho giao diện. */
  private toScopeRow(s: PromotionScope): ScopeRow {
    const key = this.scopeKeySeq++;
    switch (s.target_type) {
      case 'AIRLINE':
        return { key, target_type: 'AIRLINE', value: s.airline_id ?? null, value2: null };
      case 'FARE_CLASS':
        return { key, target_type: 'FARE_CLASS', value: s.fare_class_id ?? null, value2: null };
      case 'FLIGHT':
        return { key, target_type: 'FLIGHT', value: s.flight_id ?? null, value2: null };
      default:
        return {
          key,
          target_type: 'ROUTE',
          value: s.departure_airport_id ?? null,
          value2: s.arrival_airport_id ?? null,
        };
    }
  }

  // ---------- Thao tác trên danh sách phạm vi ----------

  protected addScope(): void {
    this.scopes.set([
      ...this.scopes(),
      { key: this.scopeKeySeq++, target_type: 'AIRLINE', value: null, value2: null },
    ]);
  }

  protected removeScope(key: number): void {
    this.scopes.set(this.scopes().filter((s) => s.key !== key));
  }

  /** Đổi loại phạm vi thì xoá giá trị cũ — giá trị của loại này không dùng
   *  được cho loại khác (id hãng ≠ id sân bay). */
  protected setScopeType(key: number, targetType: PromotionScope['target_type']): void {
    this.scopes.set(
      this.scopes().map((s) =>
        s.key === key ? { ...s, target_type: targetType, value: null, value2: null } : s,
      ),
    );
  }

  protected setScopeValue(key: number, field: 'value' | 'value2', value: string): void {
    const num = value === '' ? null : Number(value);
    this.scopes.set(this.scopes().map((s) => (s.key === key ? { ...s, [field]: num } : s)));
  }

  protected optionsFor(type: PromotionScope['target_type']): Option[] {
    switch (type) {
      case 'AIRLINE':
        return this.airlines;
      case 'FARE_CLASS':
        return this.fareClasses;
      case 'FLIGHT':
        return this.flights;
      default:
        return this.airports;
    }
  }

  /** Nhãn của dropdown phụ (chỉ ROUTE mới có). */
  protected secondLabel(type: PromotionScope['target_type']): string {
    return type === 'ROUTE' ? 'Sân bay đến' : '';
  }

  // ---------- Loại trừ chuyến bay ----------

  protected toggleExcluded(id: number): void {
    const current = this.excludedIds();
    this.excludedIds.set(
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  protected isExcluded(id: number): boolean {
    return this.excludedIds().includes(id);
  }

  // ---------- Ảnh thẻ khuyến mãi ----------

  /** Ảnh tải lỗi → hiện khung nền, không hiện icon ảnh vỡ của trình duyệt. */
  protected markImageBroken(): void {
    this.imageBroken.set(true);
  }

  protected clearImage(): void {
    this.setDraft('image_url', '');
    this.imageBroken.set(false);
  }

  /**
   * Đọc ảnh chọn từ máy thành data URL và lưu vào `image_url`.
   *
   * Cùng cách làm với ô ảnh của form CRUD chung: BE chưa có endpoint upload ảnh
   * cho master data, nên dùng data URL để xem trước ngay mà vẫn gửi được trong
   * payload JSON. Khi BE có endpoint, chỉ đổi chỗ này thành gọi upload.
   */
  protected onPickImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notify('Vui lòng chọn một tệp ảnh');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notify('Ảnh vượt quá 2 MB. Chọn ảnh nhỏ hơn hoặc dán đường dẫn.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.setDraft('image_url', reader.result as string);
      this.imageBroken.set(false);
      // Xoá giá trị input file để chọn lại cùng tệp vẫn kích hoạt (change).
      input.value = '';
    };
    reader.onerror = () => {
      this.notify('Không đọc được tệp ảnh');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  // ---------- Lưu ----------

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

    if (!d.promotion_code.trim()) {
      errors['promotion_code'] = 'Mã khuyến mãi không được để trống';
    }
    if (!d.promotion_name.trim()) {
      errors['promotion_name'] = 'Tên chương trình không được để trống';
    }
    if (d.discount_value === null || d.discount_value <= 0) {
      errors['discount_value'] = 'Giá trị giảm phải lớn hơn 0';
    } else if (d.discount_type === 'PERCENT' && d.discount_value > 100) {
      errors['discount_value'] = 'Giảm theo phần trăm không được vượt quá 100';
    }
    if (!d.start_date) {
      errors['start_date'] = 'Chọn ngày bắt đầu';
    }
    if (!d.end_date) {
      errors['end_date'] = 'Chọn ngày kết thúc';
    }
    if (d.start_date && d.end_date && d.end_date < d.start_date) {
      errors['end_date'] = 'Ngày kết thúc phải sau ngày bắt đầu';
    }
    // Mỗi dòng phạm vi phải chọn đủ giá trị, nếu không DB sẽ từ chối (1001/1006).
    for (const s of this.scopes()) {
      if (s.value === null) {
        errors['scopes'] = 'Mỗi dòng phạm vi phải chọn giá trị';
        break;
      }
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
    // `validate()` đã chặn discount_value null/≤ 0, nhưng TypeScript không suy ra
    // được điều đó qua hàm khác — nên gán tường minh ở đây.
    const discountValue = d.discount_value ?? 0;

    const payload: PromotionPayload = {
      promotion_code: d.promotion_code.trim().toUpperCase(),
      promotion_name: d.promotion_name.trim(),
      // Chuỗi rỗng → null: DB để NULL cho "chưa có", không phải chuỗi rỗng.
      image_url: d.image_url.trim() || null,
      description: d.description.trim() || null,
      badge_label: d.badge_label.trim() || null,
      discount_type: d.discount_type,
      discount_value: discountValue,
      // Trần giảm chỉ có ý nghĩa với PERCENT — DB v0.4 quy định AMOUNT thì NULL.
      max_discount_amount: d.discount_type === 'PERCENT' ? d.max_discount_amount : null,
      min_fare_amount: d.min_fare_amount,
      applicable_trip_type: d.applicable_trip_type,
      start_date: d.start_date,
      end_date: d.end_date,
      is_active: d.is_active,
      scopes: this.scopes().map((s) => this.toScopePayload(s)),
      excluded_flight_ids: this.excludedIds(),
    };

    this.saving.set(true);
    const id = this.promoId();
    const request$ = id
      ? this.service.update(id, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notify(res.message);
        this.router.navigate(['/admin/promotions']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.notify(err.message);
      },
    });
  }

  /** Dựng payload scope đúng hình dạng API v0.2 mục 2.7 — chỉ điền cột ứng
   *  với `target_type`, các cột khác để null (DB có CHECK theo target_type). */
  private toScopePayload(s: ScopeRow): PromotionScope {
    switch (s.target_type) {
      case 'AIRLINE':
        return { target_type: 'AIRLINE', airline_id: s.value };
      case 'FARE_CLASS':
        return { target_type: 'FARE_CLASS', fare_class_id: s.value };
      case 'FLIGHT':
        return { target_type: 'FLIGHT', flight_id: s.value };
      default:
        return {
          target_type: 'ROUTE',
          departure_airport_id: s.value,
          arrival_airport_id: s.value2,
        };
    }
  }

  protected cancel(): void {
    this.router.navigate(['/admin/promotions']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
