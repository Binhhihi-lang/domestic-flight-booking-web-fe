import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, forkJoin, of } from 'rxjs';
import { Airline } from '@core/models/airline.model';
import { FareClass } from '@core/models/fare-baggage.model';
import { FlightDetailRecord } from '@core/models/flight.model';
import { Airport } from '@core/models/location.model';
import { PromotionPayload, PromotionScope, TripType } from '@core/models/promotion.model';
import { AirlineService } from '@core/services/airline.service';
import {
  AirportService,
  FareClassService,
  PromotionService,
} from '@core/services/catalog.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { UploadService } from '@core/services/upload.service';
import { FlightSearchPicker } from '@shared/components/flight-search-picker/flight-search-picker';
import {
  SearchableOption,
  SearchableSelect,
} from '@shared/components/searchable-select/searchable-select';
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

/**
 * Form khuyến mãi — trang riêng, có PHẠM VI ÁP DỤNG và LOẠI TRỪ CHUYẾN BAY.
 *
 * Nạp danh mục thật từ API (`AirlineService`, `AirportService`, `FareClassService`),
 * tìm chuyến bay phía server qua `FlightSearchPicker` và tải ảnh banner lên Cloudinary
 * qua `UploadService.uploadAdminImage`.
 */
@Component({
  selector: 'app-promotion-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppButton,
    AppCard,
    LoadingState,
    SearchableSelect,
    FlightSearchPicker,
  ],
  templateUrl: './promotion-form.html',
  styleUrl: './promotion-form.css',
})
export class PromotionForm {
  private readonly service = inject(PromotionService);
  private readonly airlineService = inject(AirlineService);
  private readonly airportService = inject(AirportService);
  private readonly fareClassService = inject(FareClassService);
  private readonly flightService = inject(FlightAdminService);
  private readonly uploadService = inject(UploadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploadingImage = signal(false);
  protected readonly isEdit = signal(false);
  protected readonly promoId = signal<number | null>(null);

  /** Dữ liệu danh mục thật nạp từ API. */
  protected readonly airlines = signal<Airline[]>([]);
  protected readonly airports = signal<Airport[]>([]);
  protected readonly fareClasses = signal<FareClass[]>([]);
  /** Bộ đệm nhãn chuyến bay để hydrate ngay khi sửa khuyến mãi đã chọn sẵn chuyến. */
  protected readonly flightLabels = signal<Record<number, string>>({});

  protected readonly airlineOptions = computed<SearchableOption[]>(() =>
    this.airlines().map((a) => ({
      value: a.id,
      label: `${a.airline_code} — ${a.airline_name}`,
      sub: a.country ?? undefined,
    })),
  );

  protected readonly airportOptions = computed<SearchableOption[]>(() =>
    this.airports().map((a) => ({
      value: a.id,
      label: `${a.airport_code} — ${a.airport_name}`,
      sub: a.city?.city_name ?? undefined,
    })),
  );

  protected readonly fareClassOptions = computed<SearchableOption[]>(() =>
    this.fareClasses().map((fc) => ({
      value: fc.id,
      label: `${fc.fare_class_code} — ${fc.fare_class_name} (${fc.airline_code})`,
      sub: fc.airline_name,
      group: fc.airline_code,
    })),
  );

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
    this.loadCatalogs();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.promoId.set(Number(id));
      this.loadOne(Number(id));
    }
  }

  private loadCatalogs(): void {
    forkJoin({
      airlines: this.airlineService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
      airports: this.airportService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
      fareClasses: this.fareClassService
        .list({ page: 1, size: 100 })
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ airlines, airports, fareClasses }) => {
        this.airlines.set(airlines?.data?.items ?? []);
        this.airports.set(airports?.data?.items ?? []);
        this.fareClasses.set(fareClasses?.data?.items ?? []);
      });
  }

  private loadOne(id: number): void {
    this.loading.set(true);
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
          const rows = (p.scopes ?? []).map((s) => this.toScopeRow(s));
          const excluded = p.excluded_flight_ids ?? [];
          this.scopes.set(rows);
          this.excludedIds.set(excluded);
          this.hydrateFlightLabels([
            ...rows
              .filter((r) => r.target_type === 'FLIGHT' && r.value !== null)
              .map((r) => r.value as number),
            ...excluded,
          ]);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.notify(err.message);
          this.loading.set(false);
          this.router.navigate(['/admin/promotions']);
        },
      });
  }

  private hydrateFlightLabels(flightIds: number[]): void {
    const uniqueIds = Array.from(new Set(flightIds)).filter((fid) => fid > 0);
    if (uniqueIds.length === 0) {
      return;
    }
    forkJoin(
      uniqueIds.map((fid) => this.flightService.getById(fid).pipe(catchError(() => of(null)))),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((responses) => {
        const next: Record<number, string> = { ...this.flightLabels() };
        for (const res of responses) {
          if (res?.data) {
            next[res.data.id] = PromotionForm.formatFlightLabel(res.data);
          }
        }
        this.flightLabels.set(next);
      });
  }

  private static formatFlightLabel(f: FlightDetailRecord): string {
    const dep = f.departure_airport?.airport_code ?? '';
    const arr = f.arrival_airport?.airport_code ?? '';
    const d = f.scheduled_departure ? new Date(f.scheduled_departure) : null;
    const time =
      d && !Number.isNaN(d.getTime())
        ? d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
    return `${f.flight_number} · ${dep} → ${arr}${time ? ` · ${time}` : ''}`;
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

  /** Đổi loại phạm vi thì xoá giá trị cũ — giá trị của loại này không dùng được cho loại khác. */
  protected setScopeType(key: number, targetType: PromotionScope['target_type']): void {
    this.scopes.set(
      this.scopes().map((s) =>
        s.key === key ? { ...s, target_type: targetType, value: null, value2: null } : s,
      ),
    );
  }

  protected setScopeValue(
    key: number,
    field: 'value' | 'value2',
    raw: number | string | null,
  ): void {
    const num = raw === null || raw === '' ? null : Number(raw);
    this.scopes.set(this.scopes().map((s) => (s.key === key ? { ...s, [field]: num } : s)));
  }

  // ---------- Loại trừ chuyến bay ----------

  protected setExcludedIds(ids: number[]): void {
    this.excludedIds.set(ids);
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

  /** Tải ảnh banner khuyến mãi lên Cloudinary thông qua `UploadService.uploadAdminImage`. */
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
    if (file.size > 5 * 1024 * 1024) {
      this.notify('Ảnh vượt quá 5 MB. Vui lòng chọn ảnh nhỏ hơn.');
      input.value = '';
      return;
    }

    this.uploadingImage.set(true);
    this.uploadService
      .uploadAdminImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.uploadingImage.set(false);
          const url = res.data?.url ?? '';
          if (url) {
            this.setDraft('image_url', url);
            this.imageBroken.set(false);
            this.notify('Đã tải ảnh lên thành công');
          } else {
            this.notify('Không nhận được đường dẫn ảnh từ máy chủ');
          }
          input.value = '';
        },
        error: (err: Error) => {
          this.uploadingImage.set(false);
          this.notify(err.message || 'Tải ảnh thất bại');
          input.value = '';
        },
      });
  }

  // ---------- Lưu ----------

  protected setDraft<K extends keyof ReturnType<typeof this.draft>>(
    key: K,
    value: ReturnType<typeof this.draft>[K],
  ): void {
    this.draft.set({ ...this.draft(), [key]: value });
    if (key === 'image_url') {
      this.imageBroken.set(false);
    }
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
    const discountValue = d.discount_value ?? 0;

    const payload: PromotionPayload = {
      promotion_code: d.promotion_code.trim().toUpperCase(),
      promotion_name: d.promotion_name.trim(),
      image_url: d.image_url.trim() || null,
      description: d.description.trim() || null,
      badge_label: d.badge_label.trim() || null,
      discount_type: d.discount_type,
      discount_value: discountValue,
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
    const request$ = id ? this.service.update(id, payload) : this.service.create(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const id = this.promoId();
    this.router.navigate(id ? ['/admin/promotions', id] : ['/admin/promotions']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
