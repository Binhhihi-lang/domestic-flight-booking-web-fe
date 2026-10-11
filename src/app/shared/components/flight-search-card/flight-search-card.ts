import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export type TripType = 'round' | 'oneway';

export interface FlightSearchValue {
  tripType: TripType;
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
}

/**
 * Widget tìm chuyến bay — bám mockup P1 (.searchbar / .trip / .searchform).
 *
 * Vì sao tách riêng khỏi trang chủ: đây là "visual focus" của Public Website
 * (tài liệu UI mục 10) và còn xuất hiện lại ở trang kết quả khi bấm "Sửa tìm
 * kiếm". Tách ra thì chỉ có một chỗ để sửa hành vi.
 *
 * Chưa gọi API: Flight Search thuộc Phase 2. Component phát sự kiện `searched`
 * để trang cha quyết định điều hướng, nhờ vậy khi có API thật chỉ đổi ở cha.
 */
@Component({
  selector: 'app-flight-search-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="searchbar__card">
      <div class="trip">
        <button
          class="chip"
          type="button"
          [class.on]="tripType() === 'round'"
          (click)="tripType.set('round')"
        >
          Khứ hồi
        </button>
        <button
          class="chip"
          type="button"
          [class.on]="tripType() === 'oneway'"
          (click)="tripType.set('oneway')"
        >
          Một chiều
        </button>
      </div>

      <div class="searchform">
        <div class="field">
          <label for="fs-from">Điểm đi</label>
          <input id="fs-from" name="from" [(ngModel)]="from" placeholder="Chọn điểm khởi hành" />
        </div>

        <div class="field swap">
          <label for="fs-to">Điểm đến</label>
          <input id="fs-to" name="to" [(ngModel)]="to" placeholder="Chọn điểm đến" />
          <button class="swap__btn" type="button" title="Đổi chiều" (click)="swap()">
            <mat-icon>swap_horiz</mat-icon>
          </button>
        </div>

        <div class="field">
          <label for="fs-depart">Ngày đi</label>
          <input id="fs-depart" name="departDate" type="date" [(ngModel)]="departDate" />
        </div>

        <div class="field" [class.field--hidden]="tripType() === 'oneway'">
          <label for="fs-return">Ngày về</label>
          <input id="fs-return" name="returnDate" type="date" [(ngModel)]="returnDate" />
        </div>

        <button class="submit" type="button" (click)="submit()">
          <mat-icon>search</mat-icon>
          Tìm chuyến bay
        </button>
      </div>
    </div>
  `,
  styles: `
    .searchbar__card {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: 0 14px 40px rgba(3, 18, 26, 0.18);
      overflow: hidden;
    }

    .trip {
      display: flex;
      gap: 8px;
      padding: 18px 20px 0;
    }

    .chip {
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink-muted);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 600;
      padding: 9px 18px;
      border-radius: 999px;
      cursor: pointer;
      transition: all var(--dur-fast) var(--ease);
      white-space: nowrap;
      min-height: 40px;
    }

    .chip:hover {
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }

    .chip.on {
      border-color: var(--color-primary-bright);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-weight: 700;
    }

    .searchform {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr auto;
      gap: 10px;
      padding: 14px 20px 20px;
      align-items: end;
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

    .field input {
      font-family: var(--font-body);
      font-size: 14.5px;
      padding: 11px 13px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      outline: none;
      width: 100%;
      min-width: 0;
      color: var(--color-ink);
    }

    .field input::placeholder {
      color: var(--color-ink-subtle);
    }

    .field input:focus {
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px rgba(1, 148, 243, 0.14);
    }

    /* Nút đổi chiều nằm trong ô "Điểm đến", nên ô đó phải chừa chỗ bên phải
       để chữ không bị nút che. */
    .swap {
      position: relative;
    }

    .swap input {
      padding-right: 40px;
      text-overflow: ellipsis;
    }

    .swap__btn {
      position: absolute;
      right: 8px;
      bottom: 6px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1.5px solid var(--color-border);
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;
      box-shadow: var(--shadow-sm);
    }

    .swap__btn:hover {
      background: var(--color-primary-soft);
      border-color: var(--color-primary-bright);
    }

    .swap__btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--color-primary-bright);
    }

    .submit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 46px;
      padding: 0 28px;
      border: 0;
      border-radius: var(--radius);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color var(--dur-fast) var(--ease);
    }

    .submit:hover {
      background: var(--color-primary-hover);
    }

    .submit mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Ẩn ô ngày về khi chọn một chiều — nhưng vẫn giữ chỗ trong grid ở màn lớn
       để nút tìm kiếm không nhảy sang trái. */
    .field--hidden {
      visibility: hidden;
    }

    @media (max-width: 1100px) {
      .searchform {
        grid-template-columns: 1fr 1fr;
      }

      .field--hidden {
        display: none;
      }
    }

    @media (max-width: 900px) {
      .trip {
        padding: 14px 14px 0;
      }

      .searchform {
        padding: 12px 14px 16px;
      }
    }

    @media (max-width: 620px) {
      .searchform {
        grid-template-columns: 1fr;
        gap: 11px;
      }
    }
  `,
})
export class FlightSearchCard {
  readonly searched = output<FlightSearchValue>();

  protected readonly tripType = signal<TripType>('round');
  protected from = '';
  protected to = '';
  protected departDate = '';
  protected returnDate = '';

  protected swap(): void {
    const previousFrom = this.from;
    this.from = this.to;
    this.to = previousFrom;
  }

  protected submit(): void {
    this.searched.emit({
      tripType: this.tripType(),
      from: this.from,
      to: this.to,
      departDate: this.departDate,
      returnDate: this.tripType() === 'round' ? this.returnDate : '',
    });
  }
}
