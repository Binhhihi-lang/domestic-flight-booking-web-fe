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
    this.seatTypes().filter((t) => t.status === 'ACTIVE'),
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
    this.seats.set(
      [...map.values()].sort(
        (a, b) => a.seat_row - b.seat_row || a.seat_column.localeCompare(b.seat_column),
      ),
    );
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
        s.seat_row === cell.row && s.seat_column === cell.column
          ? { ...s, seat_type_id: seatTypeId }
          : s,
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
