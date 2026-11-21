import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';

export type CountUpFormat = 'number' | 'vnd' | 'compact-vnd' | 'percent';

/**
 * Directive tăng số mượt mà (count-up) cho thẻ KPI trên Dashboard & Báo cáo.
 *
 * - Dùng `requestAnimationFrame` + `easeOutCubic` (60fps, không gây layout shift).
 * - Tôn trọng `prefers-reduced-motion: reduce`.
 * - Trong môi trường test (jsdom) hoặc SSR hiển thị ngay giá trị cuối để tránh test flaky.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly target = input.required<number>({ alias: 'appCountUp' });
  readonly format = input<CountUpFormat>('number', { alias: 'countUpFormat' });
  readonly duration = input<number>(750, { alias: 'countUpDuration' });
  readonly decimals = input<number>(1, { alias: 'countUpDecimals' });

  private rafId: number | null = null;

  constructor() {
    effect(() => {
      const end = Number(this.target() ?? 0);
      const fmt = this.format();
      const dur = this.duration();
      const dec = this.decimals();
      this.animate(end, fmt, dur, dec);
    });
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private cancel(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private shouldSkipAnimation(): boolean {
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
      return true;
    }
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      return true;
    }
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  private animate(end: number, fmt: CountUpFormat, duration: number, decimals: number): void {
    this.cancel();
    if (duration <= 0 || this.shouldSkipAnimation() || !Number.isFinite(end)) {
      this.el.nativeElement.textContent = this.formatValue(end, fmt, decimals);
      return;
    }

    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      // easeOutCubic: nhanh lúc đầu, chậm mượt lúc chốt số
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = end * eased;
      this.el.nativeElement.textContent = this.formatValue(
        progress >= 1 ? end : current,
        fmt,
        decimals,
      );
      if (progress < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(step);
  }

  private formatValue(val: number, fmt: CountUpFormat, decimals: number): string {
    const safe = Number.isFinite(val) ? val : 0;
    switch (fmt) {
      case 'vnd':
        return `${Math.round(safe).toLocaleString('vi-VN')}đ`;
      case 'compact-vnd':
        if (safe >= 1_000_000_000) return `${(safe / 1_000_000_000).toFixed(2)} tỷ`;
        if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)} tr`;
        return `${Math.round(safe).toLocaleString('vi-VN')}đ`;
      case 'percent':
        return `${safe.toFixed(decimals)}%`;
      default:
        return Math.round(safe).toLocaleString('vi-VN');
    }
  }
}
