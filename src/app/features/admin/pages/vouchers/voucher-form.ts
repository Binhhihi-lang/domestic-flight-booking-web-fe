import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  PromotionScope,
  TripType,
  VoucherPayload,
} from '@core/models/promotion.model';
import { VoucherService } from '@core/services/catalog.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

interface ScopeRow {
  key: number;
  target_type: PromotionScope['target_type'];
  value: number | null;
  value2: number | null;
}

interface Option {
  value: number;
  label: string;
}

/**
 * Form voucher — trang riêng, có PHẠM VI ÁP DỤNG và LOẠI TRỪ CHUYẾN BAY.
 *
 * Khác biệt so với khuyến mãi (DB v0.4 ghi rõ, dễ nhầm):
 * - Voucher có `distribution_type`: GLOBAL (khách tự nhận ở Kho voucher) hoặc
 *   ASSIGNED (ADMIN tặng riêng).
 * - `claim_limit` đếm lượt **NHẬN**, chỉ áp cho GLOBAL.
 * - Trần giảm và giá tối thiểu tính trên **CẢ BOOKING** (khuyến mãi tính theo
 *   từng dòng vé) — nên nhãn ghi rõ "cả đơn" để ADMIN không hiểu nhầm.
 * - Khách **không nhập mã**: `voucher_code` chỉ để ADMIN tra cứu.
 */
@Component({
  selector: 'app-voucher-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppButton, AppCard, LoadingState],
  templateUrl: './voucher-form.html',
  styleUrl: './voucher-form.css',
})
export class VoucherForm {
  private readonly service = inject(VoucherService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly isEdit = signal(false);
  protected readonly voucherId = signal<number | null>(null);

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

  protected readonly draft = signal({
    voucher_code: '',
    voucher_name: '',
    description: '',
    distribution_type: 'GLOBAL' as 'GLOBAL' | 'ASSIGNED',
    discount_type: 'AMOUNT' as 'PERCENT' | 'AMOUNT',
    discount_value: null as number | null,
    max_discount_amount: null as number | null,
    min_order_amount: null as number | null,
    applicable_trip_type: 'ANY' as TripType,
    start_date: '',
    end_date: '',
    claim_limit: null as number | null,
    is_active: true,
  });

  protected readonly scopes = signal<ScopeRow[]>([]);
  protected readonly excludedIds = signal<number[]>([]);
  protected readonly errors = signal<Record<string, string>>({});

  private scopeKeySeq = 1;

  protected readonly isPercent = computed(() => this.draft().discount_type === 'PERCENT');
  /** Giới hạn lượt nhận chỉ có ý nghĩa với voucher phát ở Kho chung. */
  protected readonly isGlobal = computed(() => this.draft().distribution_type === 'GLOBAL');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.voucherId.set(Number(id));
      this.loadOne(Number(id));
    }
  }

  private loadOne(id: number): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (res) => {
        const v = res.data;
        this.draft.set({
          voucher_code: v.voucher_code,
          voucher_name: v.voucher_name,
          description: v.description ?? '',
          distribution_type: v.distribution_type,
          discount_type: v.discount_type,
          discount_value: v.discount_value,
          max_discount_amount: v.max_discount_amount,
          min_order_amount: v.min_order_amount,
          applicable_trip_type: v.applicable_trip_type,
          start_date: v.start_date,
          end_date: v.end_date,
          claim_limit: v.claim_limit,
          is_active: v.status === 'ACTIVE',
        });
        this.scopes.set((v.scopes ?? []).map((s) => this.toScopeRow(s)));
        this.excludedIds.set(v.excluded_flight_ids ?? []);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
        this.router.navigate(['/admin/vouchers']);
      },
    });
  }

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

  protected addScope(): void {
    this.scopes.set([
      ...this.scopes(),
      { key: this.scopeKeySeq++, target_type: 'AIRLINE', value: null, value2: null },
    ]);
  }

  protected removeScope(key: number): void {
    this.scopes.set(this.scopes().filter((s) => s.key !== key));
  }

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

  protected toggleExcluded(id: number): void {
    const current = this.excludedIds();
    this.excludedIds.set(
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  protected isExcluded(id: number): boolean {
    return this.excludedIds().includes(id);
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

    if (!d.voucher_code.trim()) {
      errors['voucher_code'] = 'Mã nội bộ không được để trống';
    }
    if (!d.voucher_name.trim()) {
      errors['voucher_name'] = 'Tên voucher không được để trống';
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
    // claim_limit chỉ áp cho GLOBAL; nếu có giá trị thì phải > 0 (DB v0.4 CHECK).
    if (this.isGlobal() && d.claim_limit !== null && d.claim_limit <= 0) {
      errors['claim_limit'] = 'Giới hạn lượt nhận phải lớn hơn 0';
    }
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
    const payload: VoucherPayload = {
      voucher_code: d.voucher_code.trim().toUpperCase(),
      voucher_name: d.voucher_name.trim(),
      description: d.description.trim() || null,
      distribution_type: d.distribution_type,
      discount_type: d.discount_type,
      discount_value: d.discount_value ?? 0,
      max_discount_amount: d.discount_type === 'PERCENT' ? d.max_discount_amount : null,
      min_order_amount: d.min_order_amount,
      applicable_trip_type: d.applicable_trip_type,
      start_date: d.start_date,
      end_date: d.end_date,
      // ASSIGNED không đếm lượt nhận → gửi null (DB quy định chỉ áp cho GLOBAL).
      claim_limit: this.isGlobal() ? d.claim_limit : null,
      is_active: d.is_active,
      scopes: this.scopes().map((s) => this.toScopePayload(s)),
      excluded_flight_ids: this.excludedIds(),
    };

    this.saving.set(true);
    const id = this.voucherId();
    const request$ = id ? this.service.update(id, payload) : this.service.create(payload);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notify(res.message);
        this.router.navigate(['/admin/vouchers']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.notify(err.message);
      },
    });
  }

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
    this.router.navigate(['/admin/vouchers']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
