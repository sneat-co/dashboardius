import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { UIChart } from 'primeng/chart';

import { IChartWidgetData } from '../../model/board.model';
import { ThemeService } from '../../../theme/theme.service';
import {
  buildChartData,
  buildChartOptions,
  formatValue,
  donutSegments,
  heroFigure,
  seriesColor,
  trend,
  visibleSeries,
} from '../../charts/chart-options';

/**
 * A chart card body: hero figure, an interactive legend, the plot, and a table
 * twin.
 *
 * The legend is the important control here. Clicking a shown metric hides it;
 * clicking a listed-but-hidden metric adds it back. Hiding never deletes the
 * metric's definition, so the card always advertises everything it could show —
 * which is the interaction the card menu also offers, surfaced where a visitor
 * will actually find it.
 *
 * The table twin is not decoration either: three of the light-mode series
 * colours sit below 3:1 against the card surface, and the validated palette's
 * relief rule for that is a real table view, not a promise that the tooltip
 * will do. It is also what makes these numbers readable without a pointer, and
 * what a crawler sees in place of a canvas.
 */
@Component({
  selector: 'db-chart-widget',
  standalone: true,
  imports: [UIChart, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="top">
      @if (hero(); as h) {
        <p class="hero">
          <span class="db-figure">{{ h.value }}</span>
          @if (delta(); as d) {
            <span class="delta" [class]="'is-' + d.direction">
              <span aria-hidden="true">{{ d.direction === 'up' ? '▲' : d.direction === 'down' ? '▼' : '▪' }}</span>
              {{ d.text }}
            </span>
          }
        </p>
        <p class="hero-label">{{ h.label }}</p>
      }
    </div>

    @if (isDonut()) {
      <ul class="legend is-static" [attr.aria-label]="'Segments of ' + cardTitle()">
        @for (segment of segments(); track segment.label) {
          <li>
            <span class="chip is-static">
              <span class="swatch" [style.background]="color(segment.slot)"
                    [style.border-color]="color(segment.slot)"></span>
              <span>{{ segment.label }}</span>
              <b>{{ segment.share }}</b>
            </span>
          </li>
        }
      </ul>
    } @else {
      <ul class="legend" [attr.aria-label]="'Metrics on ' + cardTitle()">
        @for (s of data().series; track s.id) {
          <li>
            <button
              type="button"
              class="chip"
              [class.is-off]="!s.visible"
              [attr.aria-pressed]="s.visible"
              (click)="toggleSeries.emit(s.id)"
            >
              <span class="swatch" [style.background]="s.visible ? color(s.slot) : 'transparent'"
                    [style.border-color]="color(s.slot)"></span>
              <span>{{ s.label }}</span>
              <span class="db-visually-hidden">{{ s.visible ? '— shown, click to hide' : '— hidden, click to show' }}</span>
            </button>
          </li>
        }
      </ul>
    }

    @if (tableView()) {
      <div class="table-wrap">
        <ng-container *ngTemplateOutlet="dataTable" />
      </div>
    } @else {
      <div class="plot">
        @defer (on viewport; prefetch on idle) {
          <p-chart
            [type]="chartType()"
            [data]="chartData()"
            [options]="chartOptions()"
            [ariaLabel]="summary()"
            height="100%"
          />
        } @placeholder {
          <div class="skeleton" aria-hidden="true">
            @for (bar of skeletonBars; track bar) {
              <span [style.height.%]="bar"></span>
            }
          </div>
        }
      </div>
      <!-- The same numbers, reachable without a pointer and visible to a crawler. -->
      <div class="db-visually-hidden">
        <ng-container *ngTemplateOutlet="dataTable" />
      </div>
    }

    <ng-template #dataTable>
      <table class="db-tabular">
        <caption class="db-visually-hidden">{{ summary() }}</caption>
        <thead>
          <tr>
            <th scope="col">{{ isDonut() ? 'Segment' : 'Period' }}</th>
            @for (s of shown(); track s.id) {
              <th scope="col">{{ s.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (label of data().labels; track label; let i = $index) {
            <tr>
              <th scope="row">{{ label }}</th>
              @for (s of shown(); track s.id) {
                <td>{{ format(s.values[i]) }}{{ data().unit }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 12px 4px;
      flex: 1 1 auto;
      min-height: 0;
    }

    .top {
      display: grid;
      gap: 1px;
    }

    .hero {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin: 0;
      font-size: 27px;
      line-height: 1.05;
      color: var(--ink);
    }

    .delta {
      font-size: 11.5px;
      font-weight: 620;
      letter-spacing: 0;
      color: var(--ink-muted);
    }

    .delta span {
      font-size: 8px;
      vertical-align: 1px;
    }

    .delta.is-up {
      color: var(--good);
    }

    .delta.is-down {
      color: var(--critical);
    }

    .hero-label {
      margin: 0;
      font-size: 11px;
      color: var(--ink-faint);
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 24px;
      padding: 2px 8px 2px 6px;
      border: 1px solid var(--hairline);
      border-radius: 999px;
      background: var(--card);
      color: var(--ink-soft);
      font-size: 11.5px;
      font-weight: 540;
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease),
        background var(--dur-fast) var(--ease);
    }

    .chip:hover {
      border-color: var(--hairline-strong);
      background: var(--paper-sunken);
      color: var(--ink);
    }

    .chip.is-off {
      color: var(--ink-faint);
      border-style: dashed;
    }

    .chip.is-static {
      cursor: default;
      background: transparent;
      border-color: transparent;
      padding-left: 0;
    }

    .chip.is-static b {
      font-variant-numeric: tabular-nums;
      color: var(--ink);
      font-weight: 640;
    }

    .legend.is-static {
      gap: 2px 10px;
    }

    .swatch {
      width: 9px;
      height: 9px;
      flex: none;
      border-radius: 2px;
      border: 1.5px solid;
    }

    .plot {
      position: relative;
      flex: 1 1 auto;
      min-height: 152px;
      height: 152px;
    }

    .plot p-chart {
      display: block;
      height: 100%;
    }

    .skeleton {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 100%;
      padding: 12px 0 22px;
    }

    .skeleton span {
      flex: 1 1 0;
      border-radius: 3px 3px 0 0;
      background: var(--paper-sunken);
      animation: pulse 1.6s var(--ease) infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 0.55;
      }
      50% {
        opacity: 1;
      }
    }

    .table-wrap {
      flex: 1 1 auto;
      min-height: 152px;
      max-height: 208px;
      overflow: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }

    th,
    td {
      padding: 4px 8px;
      text-align: right;
      border-bottom: 1px solid var(--hairline);
      white-space: nowrap;
    }

    thead th {
      position: sticky;
      top: 0;
      background: var(--card);
      color: var(--ink-faint);
      font-weight: 660;
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    tbody th {
      text-align: left;
      font-weight: 540;
      color: var(--ink-muted);
    }
  `,
})
export class ChartWidgetComponent {
  readonly data = input.required<IChartWidgetData>();
  readonly cardTitle = input.required<string>();
  readonly tableView = input(false);
  readonly toggleSeries = output<string>();

  private readonly theme = inject(ThemeService);

  protected readonly skeletonBars = [38, 52, 44, 66, 58, 74, 88];

  protected readonly shown = computed(() => visibleSeries(this.data()));
  protected readonly hero = computed(() => heroFigure(this.data()));
  protected readonly isDonut = computed(() => this.data().kind === 'donut');
  protected readonly segments = computed(() => donutSegments(this.data()));
  protected readonly chartType = computed(() =>
    this.data().kind === 'bar' ? 'bar' : this.data().kind === 'donut' ? 'doughnut' : 'line',
  );
  protected readonly delta = computed(() => {
    // A part-to-whole has no "since last period", so it gets no trend badge.
    if (this.data().kind === 'donut') return undefined;
    const first = this.shown()[0];
    return first ? trend(first.values) : undefined;
  });

  protected readonly chartData = computed(() => buildChartData(this.data(), this.theme.tokens()));
  protected readonly chartOptions = computed(() =>
    buildChartOptions(this.data(), this.theme.tokens(), { reducedMotion: prefersReducedMotion() }),
  );

  protected readonly summary = computed(() => {
    const d = this.data();
    const names = this.shown().map((s) => s.label);
    if (!names.length) return `${this.cardTitle()}: no metric selected.`;
    return `${this.cardTitle()}: ${names.join(', ')} across ${d.labels.length} periods, ${d.labels[0]} to ${d.labels[d.labels.length - 1]}.`;
  });

  protected color(slot: number): string {
    return seriesColor(slot, this.theme.tokens());
  }

  protected format(value: number | undefined): string {
    return value === undefined ? '—' : formatValue(value);
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
