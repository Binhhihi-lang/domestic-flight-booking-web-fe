import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

interface FlightRow {
  /** Khoá duy nhất cho @for — mã hãng KHÔNG duy nhất (nhiều chuyến cùng hãng). */
  id: string;
  code: string;
  airline: string;
  aircraft: string;
  airlineColor: string;
  departTime: string;
  departAirport: string;
  arriveTime: string;
  arriveAirport: string;
  duration: string;
  price: string;
  oldPrice: string | null;
  priceTone: 'primary' | 'accent' | 'subtle';
  badge: { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string } | null;
  soldOut: boolean;
  perks: { text: string; available: boolean }[];
}

interface FilterOption {
  label: string;
  count: string;
  checked: boolean;
}

/**
 * Kết quả tìm chuyến — bám mockup P2, màn dày dữ liệu nhất của Public Website.
 *
 * Vì sao bố cục hai cột bộ lọc + danh sách: người đặt vé luôn muốn thu hẹp
 * theo hãng và giờ bay trước khi so giá. Bộ lọc nằm cạnh danh sách (không phải
 * trong ngăn kéo) để đổi lựa chọn là thấy kết quả ngay.
 *
 * Phạm vi hiện tại chỉ bán vé BAY THẲNG (chủ dự án chốt) — nên không có bộ lọc
 * điểm dừng, và mọi hàng chuyến đều hiển thị "Bay thẳng".
 *
 * Dữ liệu tĩnh: Flight Search thuộc Phase 2. Khi có API, chỉ thay nguồn dữ
 * liệu — phần bố cục và các trạng thái đã dựng đủ ở đây.
 */
@Component({
  selector: 'app-flight-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, StatusBadge],
  template: `
    <div class="wrap head">
      <div class="page-h">
        <div>
          <h1>Hà Nội → Đà Nẵng</h1>
          <p>
            Thứ Bảy, 15/11/2026 · 1 người lớn · Phổ thông ·
            <b class="page-h__count">24 chuyến bay</b>
          </p>
        </div>
        <button class="btn btn--ghost" type="button">
          <mat-icon>tune</mat-icon>
          Sửa tìm kiếm
        </button>
      </div>
    </div>

    <div class="result-wrap">
      <!-- ===== Bộ lọc ===== -->
      <aside class="filters">
        <div class="filters__hd">
          Bộ lọc
          <button class="link-btn" type="button" (click)="clearFilters()">Xóa hết</button>
        </div>

        <div class="filters__g">
          <div class="filters__t">Hãng hàng không</div>
          @for (opt of airlineFilters; track opt.label; let i = $index) {
            <label class="opt">
              <input
                type="checkbox"
                [(ngModel)]="opt.checked"
                [name]="'al-' + i"
                [attr.aria-label]="opt.label"
              />
              {{ opt.label }}
              <span class="opt__n">{{ opt.count }}</span>
            </label>
          }
        </div>

        <div class="filters__g">
          <div class="filters__t">Giờ khởi hành</div>
          @for (opt of timeFilters; track opt.label; let i = $index) {
            <label class="opt">
              <input
                type="checkbox"
                [(ngModel)]="opt.checked"
                [name]="'tm-' + i"
                [attr.aria-label]="opt.label"
              />
              {{ opt.label }}
              <span class="opt__n">{{ opt.count }}</span>
            </label>
          }
        </div>

        <div class="filters__g">
          <div class="filters__t">Tiện ích</div>
          <label class="opt">
            <input type="checkbox" name="perk-baggage" aria-label="Có hành lý ký gửi" />
            Có hành lý ký gửi
          </label>
          <label class="opt">
            <input type="checkbox" name="perk-refund" aria-label="Được hoàn vé" />
            Được hoàn vé
          </label>
          <label class="opt">
            <input type="checkbox" name="perk-change" aria-label="Được đổi ngày" />
            Được đổi ngày
          </label>
        </div>

        <div class="filters__g">
          <div class="filters__t">Khoảng giá</div>
          <input class="range" type="range" min="760000" max="2400000" aria-label="Khoảng giá" />
          <div class="range__lbl tabular">
            <span>760.000₫</span><span>2.400.000₫</span>
          </div>
        </div>
      </aside>

      <!-- ===== Danh sách ===== -->
      <div class="list">
        <div class="sortbar">
          <span class="sortbar__t">Sắp xếp:</span>
          @for (sort of sorts; track sort) {
            <button
              class="sortbtn"
              type="button"
              [class.on]="activeSort() === sort"
              (click)="activeSort.set(sort)"
            >
              {{ sort }}
            </button>
          }
          <div class="sortbar__sp"></div>
          <span class="sortbar__n tabular">24 kết quả</span>
        </div>

        @for (f of flights; track f.id) {
          <article class="fr" [class.fr--out]="f.soldOut">
            <div class="fr__top">
              <div class="fr__al">
                <div class="fr__logo" [style.background]="f.airlineColor">{{ f.code }}</div>
                <div class="fr__aln">
                  {{ f.airline }}
                  <small>{{ f.aircraft }}</small>
                </div>
              </div>

              <div class="fr__times">
                <div>
                  <div class="fr__t tabular">{{ f.departTime }}</div>
                  <div class="fr__ap">{{ f.departAirport }}</div>
                </div>
                <div class="fr__mid">
                  <div class="fr__dur tabular">{{ f.duration }}</div>
                  <div class="fr__line"></div>
                  <div class="fr__stop">Bay thẳng</div>
                </div>
                <div class="fr__arr">
                  <div class="fr__t tabular">{{ f.arriveTime }}</div>
                  <div class="fr__ap">{{ f.arriveAirport }}</div>
                </div>
              </div>

              <div class="fr__right">
                @if (f.badge) {
                  <app-status-badge [tone]="f.badge.tone" [label]="f.badge.label" />
                }
                @if (f.oldPrice) {
                  <div class="fr__old tabular">{{ f.oldPrice }}₫</div>
                }
                <div class="fr__price tabular" [class]="'fr__price--' + f.priceTone">
                  {{ f.price }}<small>₫</small>
                </div>
                <div class="fr__per">mỗi khách</div>
                <button
                  class="btn"
                  type="button"
                  [class.btn--primary]="!f.soldOut"
                  [disabled]="f.soldOut"
                >
                  {{ f.soldOut ? 'Hết chỗ' : 'Chọn' }}
                </button>
              </div>
            </div>

            <div class="fr__feats">
              @for (p of f.perks; track p.text) {
                <span class="fr__f" [class.fr__f--no]="!p.available">
                  <mat-icon>{{ p.available ? 'check_circle' : 'cancel' }}</mat-icon>
                  {{ p.text }}
                </span>
              }
            </div>
          </article>
        }

        <div class="more">
          <button class="btn btn--ghost" type="button">
            <mat-icon>expand_more</mat-icon>
            Xem thêm 19 chuyến
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .head {
      padding-bottom: 0;
    }

    .page-h {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .page-h h1 {
      font-size: 24px;
      font-weight: 600;
    }

    .page-h p {
      margin: 4px 0 0;
      font-size: 13.5px;
      color: var(--color-ink-muted);
    }

    .page-h__count {
      color: var(--color-ink);
    }

    /* ---------- Bố cục hai cột ---------- */
    .result-wrap {
      max-width: 1240px;
      margin: 0 auto;
      padding: 18px 26px 60px;
      display: grid;
      grid-template-columns: 262px 1fr;
      gap: 20px;
      align-items: start;
    }

    /* min-width:0 bắt buộc cho con của grid: mặc định grid item có
       min-width:auto nên nội dung rộng (hàng chuyến bay) đẩy cột ra ngoài
       khung -> tràn ngang. */
    .result-wrap > * {
      min-width: 0;
    }

    .filters {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      position: sticky;
      top: 78px;
      overflow: hidden;
    }

    .filters__hd {
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 14.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .filters__g {
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border-soft);
    }

    .filters__g:last-child {
      border-bottom: 0;
    }

    .filters__t {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 9px;
      color: var(--color-ink);
    }

    .opt {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 5px 0;
      font-size: 13px;
      cursor: pointer;
      color: var(--color-ink);
    }

    .opt input {
      width: 15px;
      height: 15px;
      accent-color: var(--color-primary);
      cursor: pointer;
      flex: 0 0 auto;
    }

    .opt__n {
      margin-left: auto;
      font-size: 11.5px;
      color: var(--color-ink-subtle);
      font-variant-numeric: tabular-nums;
    }

    .range {
      width: 100%;
      accent-color: var(--color-primary);
    }

    .range__lbl {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: var(--color-ink-muted);
      margin-top: 5px;
    }

    .link-btn {
      border: 0;
      background: transparent;
      color: var(--color-primary-bright);
      font-family: var(--font-body);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    .link-btn:hover {
      text-decoration: underline;
    }

    /* ---------- Sắp xếp ---------- */
    .sortbar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 11px 16px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .sortbar__t {
      font-size: 13px;
      color: var(--color-ink-muted);
      white-space: nowrap;
    }

    .sortbar__sp {
      flex: 1 1 auto;
    }

    .sortbar__n {
      font-size: 12.5px;
      color: var(--color-ink-muted);
    }

    .sortbtn {
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      font-family: var(--font-body);
      font-size: 12.5px;
      font-weight: 600;
      color: var(--color-ink-muted);
      padding: 6px 13px;
      border-radius: 999px;
      cursor: pointer;
      white-space: nowrap;
    }

    .sortbtn.on {
      border-color: var(--color-primary-bright);
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }

    /* ---------- Hàng chuyến bay ---------- */
    .fr {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
      margin-bottom: 11px;
      transition:
        border-color var(--dur) var(--ease),
        box-shadow var(--dur) var(--ease);
    }

    .fr:hover {
      border-color: #c5e0f5;
      box-shadow: var(--shadow);
    }

    /* Chuyến hết chỗ vẫn hiện nhưng mờ đi — người dùng cần biết nó tồn tại. */
    .fr--out {
      opacity: 0.62;
    }

    .fr__top {
      display: grid;
      grid-template-columns: 198px 1fr auto;
      gap: 20px;
      align-items: center;
    }

    .fr__al {
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
    }

    .fr__logo {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 13.5px;
      color: #fff;
      flex: 0 0 auto;
      letter-spacing: 0.3px;
    }

    .fr__aln {
      font-size: 13.5px;
      font-weight: 600;
      line-height: 1.3;
      min-width: 0;
    }

    .fr__aln small {
      display: block;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--color-ink-subtle);
      font-variant-numeric: tabular-nums;
      margin-top: 2px;
      white-space: nowrap;
    }

    .fr__times {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 16px;
      align-items: center;
      min-width: 0;
    }

    .fr__t {
      font-family: var(--font-heading);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.3px;
      line-height: 1.1;
    }

    .fr__ap {
      font-size: 11.5px;
      color: var(--color-ink-muted);
      margin-top: 3px;
    }

    .fr__arr {
      text-align: right;
    }

    .fr__mid {
      text-align: center;
      min-width: 104px;
    }

    .fr__dur {
      font-size: 11.5px;
      color: var(--color-ink-muted);
      margin-bottom: 5px;
    }

    .fr__line {
      height: 2px;
      background: var(--color-border);
      border-radius: 2px;
      position: relative;
    }

    .fr__line::before,
    .fr__line::after {
      content: '';
      position: absolute;
      top: -3px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary-bright);
    }

    .fr__line::before {
      left: 0;
    }

    .fr__line::after {
      right: 0;
      background: #fff;
      border: 2px solid var(--color-primary-bright);
      top: -4px;
    }

    /* Chuyến có điểm dừng không còn trong phạm vi bán vé (chỉ bay thẳng),
       nên đoạn gradient ngắt quãng đã bỏ. */

    .fr__stop {
      font-size: 11px;
      color: var(--color-ink-subtle);
      margin-top: 5px;
    }

    .fr__right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 7px;
      min-width: 132px;
    }

    .fr__price {
      font-family: var(--font-heading);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.4px;
      font-variant-numeric: tabular-nums;
      color: var(--color-primary);
    }

    .fr__price--accent {
      color: var(--color-accent);
    }

    .fr__price--subtle {
      color: var(--color-ink-subtle);
    }

    .fr__price small {
      font-size: 12.5px;
      font-weight: 600;
    }

    .fr__per {
      font-size: 11px;
      color: var(--color-ink-muted);
      margin-top: -4px;
    }

    .fr__old {
      font-size: 12px;
      color: var(--color-ink-subtle);
      text-decoration: line-through;
      font-variant-numeric: tabular-nums;
    }

    .fr__right .btn {
      width: 100%;
    }

    .fr__feats {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: 11px;
      padding-top: 11px;
      border-top: 1px dashed var(--color-border);
    }

    .fr__f {
      font-size: 11.5px;
      color: var(--color-ink-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .fr__f mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: var(--color-success);
    }

    .fr__f--no mat-icon {
      color: var(--color-danger);
    }

    /* ---------- Nút chung ---------- */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: 1.5px solid transparent;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      padding: 10px 18px;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color var(--dur-fast) var(--ease);
    }

    .btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .btn--ghost {
      background: transparent;
      color: var(--color-ink);
      border-color: var(--color-border);
    }

    .btn--ghost:hover:not(:disabled) {
      background: var(--color-surface-alt);
    }

    .btn:disabled {
      background: var(--color-border-soft);
      color: var(--color-ink-subtle);
      border-color: var(--color-border);
      cursor: not-allowed;
    }

    .more {
      display: flex;
      justify-content: center;
      margin-top: 18px;
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc.
       ===================================================================== */

    /* Ngưỡng 1080px (không phải 940px): ở 1024px, cột danh sách chỉ còn ~700px
       sau khi trừ bộ lọc 262px -> hàng chuyến bị chật. Chuyển sang 1 cột sớm
       hơn để bộ lọc nằm trên, danh sách đủ rộng. */
    @media (max-width: 1080px) {
      .result-wrap {
        grid-template-columns: 1fr;
        padding: 14px 14px 44px;
        gap: 14px;
      }

      /* Mobile: bỏ sticky để bộ lọc không chiếm màn hình khi cuộn. */
      .filters {
        position: static;
      }
    }

    @media (max-width: 900px) {
      .head {
        padding: 18px 14px 0;
      }
    }

    @media (max-width: 820px) {
      .fr__top {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .fr__right {
        align-items: stretch;
        text-align: left;
        min-width: 0;
      }

      .fr__price,
      .fr__per,
      .fr__old {
        text-align: left;
      }
    }

    @media (max-width: 640px) {
      .page-h h1 {
        font-size: 20px;
      }

      .fr {
        padding: 13px;
      }

      .sortbar {
        padding: 10px 12px;
        gap: 7px;
        overflow-x: auto;
        flex-wrap: nowrap;
        scrollbar-width: none;
      }

      .sortbar::-webkit-scrollbar {
        display: none;
      }

      .sortbar__sp {
        display: none;
      }
    }
  `,
})
export class FlightResults {
  protected readonly activeSort = signal('Rẻ nhất');
  protected readonly sorts = ['Rẻ nhất', 'Nhanh nhất', 'Sớm nhất', 'Muộn nhất'];

  protected readonly airlineFilters: FilterOption[] = [
    { label: 'Vietnam Airlines', count: '8', checked: true },
    { label: 'Vietjet Air', count: '7', checked: true },
    { label: 'Bamboo Airways', count: '5', checked: false },
    { label: 'Vietravel Airlines', count: '4', checked: false },
  ];

  protected readonly timeFilters: FilterOption[] = [
    { label: 'Sáng sớm (00:00–05:59)', count: '3', checked: false },
    { label: 'Sáng (06:00–11:59)', count: '9', checked: true },
    { label: 'Chiều (12:00–17:59)', count: '8', checked: true },
    { label: 'Tối (18:00–23:59)', count: '4', checked: false },
  ];

  protected readonly flights: FlightRow[] = [
    {
      code: 'VN',
      id: 'VN165',
      airline: 'Vietnam Airlines',
      aircraft: 'VN 165 · Airbus A321',
      airlineColor: '#0b4fa8',
      departTime: '06:15',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '07:40',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '1h 25m',
      price: '890.000',
      oldPrice: null,
      priceTone: 'primary',
      badge: { tone: 'warning', label: 'Còn 4 ghế' },
      soldOut: false,
      perks: [
        { text: '23kg ký gửi', available: true },
        { text: '7kg xách tay', available: true },
        { text: 'Hoàn vé trước 24h', available: true },
        { text: 'Đổi ngày', available: true },
      ],
    },
    {
      code: 'VJ',
      id: 'VJ507',
      airline: 'Vietjet Air',
      aircraft: 'VJ 507 · Airbus A320',
      airlineColor: '#ed1b24',
      departTime: '07:20',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '08:50',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '1h 30m',
      price: '760.000',
      oldPrice: '890.000',
      priceTone: 'accent',
      badge: null,
      soldOut: false,
      perks: [
        { text: '20kg ký gửi', available: true },
        { text: '7kg xách tay', available: true },
        { text: 'Không hoàn vé', available: false },
      ],
    },
    {
      code: 'QH',
      id: 'QH205',
      airline: 'Bamboo Airways',
      aircraft: 'QH 205 · Airbus A321',
      airlineColor: '#0f8a4d',
      departTime: '13:05',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '17:40',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '4h 35m',
      price: '1.050.000',
      oldPrice: null,
      priceTone: 'primary',
      badge: null,
      soldOut: false,
      perks: [
        { text: '20kg ký gửi', available: true },
        { text: 'Suất ăn nóng', available: true },
        { text: 'Hoàn vé trước 48h', available: true },
      ],
    },
    {
      code: 'VN',
      id: 'VN173',
      airline: 'Vietnam Airlines',
      aircraft: 'VN 173 · Boeing 787-9',
      airlineColor: '#0b4fa8',
      departTime: '18:30',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '19:55',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '1h 25m',
      price: '1.240.000',
      oldPrice: null,
      priceTone: 'primary',
      badge: { tone: 'success', label: 'Còn nhiều ghế' },
      soldOut: false,
      perks: [
        { text: '23kg ký gửi', available: true },
        { text: 'Suất ăn nóng', available: true },
        { text: 'Hoàn vé trước 24h', available: true },
        { text: 'Đổi ngày', available: true },
      ],
    },
    {
      code: 'VU',
      id: 'VU305',
      airline: 'Vietravel Airlines',
      aircraft: 'VU 305 · Airbus A321',
      airlineColor: '#6b7f96',
      departTime: '21:10',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '22:40',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '1h 30m',
      price: '1.180.000',
      oldPrice: null,
      priceTone: 'subtle',
      badge: { tone: 'danger', label: 'Hết chỗ' },
      soldOut: true,
      perks: [],
    },
  ];

  protected clearFilters(): void {
    this.airlineFilters.forEach((f) => (f.checked = false));
    this.timeFilters.forEach((f) => (f.checked = false));
  }
}
