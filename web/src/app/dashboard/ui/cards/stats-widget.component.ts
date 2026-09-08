import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { UIChart } from 'primeng/chart';

import { IStatsWidgetData } from '../../model/board.model';
import { ThemeService } from '../../../theme/theme.service';
import { SPARK_OPTIONS, buildSparkData, seriesColor } from '../../charts/chart-options';

/**
 * A strip of stat tiles.
 *
 * When the story is one number, eight categorical hues is the wrong chart and a
 * tile is the right one — the number IS the chart. The sparkline behind it is a
 * mark, not a plot: no axis, no hover, no legend, because anything more would
 * make a reader stop and study a decoration.
 */
@Component({
  selector: 'db-stats-widget',
  standalone: true,
  imports: [UIChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="tiles" [class.is-dense]="data().tiles.length > 3">
      @for (tile of data().tiles; track tile.id) {
        <li class="tile">
          <p class="label">{{ tile.label }}</p>
          <p class="value db-figure">{{ tile.value }}</p>
          <p class="meta">
            @if (tile.delta) {
              <span class="delta" [class]="'is-' + (tile.deltaDirection ?? 'flat')">
                <span aria-hidden="true">{{ tile.deltaDirection === 'up' ? '▲' : tile.deltaDirection === 'down' ? '▼' : '▪' }}</span>
                {{ tile.delta }}
              </span>
            }
            @if (tile.note) {
              <span class="tile-note">{{ tile.note }}</span>
            }
          </p>
          @if (tile.spark; as spark) {
            <div class="spark" aria-hidden="true">
              @defer (on viewport; prefetch on idle) {
                <p-chart type="line" [data]="sparkData(spark)" [options]="sparkOptions" height="100%" />
              } @placeholder {
                <span class="spark-rule"></span>
              }
            </div>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
      flex: 1 1 auto;
      min-height: 0;
    }

    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1px;
      margin: 0;
      padding: 0;
      list-style: none;
      background: var(--hairline);
      height: 100%;
    }

    .tile {
      position: relative;
      display: grid;
      align-content: start;
      gap: 1px;
      padding: 12px 12px 26px;
      background: var(--card);
      overflow: hidden;
      transition: background var(--dur-fast) var(--ease);
    }

    .tile:hover {
      background: var(--card-raised);
    }

    .label {
      /* Two lines reserved: without it a wrapping label drops its own tile's
         figure below its neighbours', and a row of numbers that do not share a
         baseline reads as an accident. */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.6em;
      margin: 0;
      font-size: 10.5px;
      font-weight: 640;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .value {
      margin: 2px 0 0;
      font-size: 25px;
      line-height: 1.06;
      color: var(--ink);
    }

    .is-dense .value {
      font-size: 21px;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px;
      margin: 2px 0 0;
      font-size: 11px;
    }

    .delta {
      font-weight: 620;
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

    .tile-note {
      color: var(--ink-faint);
    }

    .spark {
      position: absolute;
      inset: auto 0 0 0;
      height: 28px;
      opacity: 0.45;
      pointer-events: none;
      /* Fades out at the top so the mark never competes with the figure. */
      mask-image: linear-gradient(to top, #000 55%, transparent);
    }

    .spark p-chart {
      display: block;
      height: 100%;
    }

    .spark-rule {
      display: block;
      height: 1px;
      margin-top: 22px;
      background: var(--hairline);
    }
  `,
})
export class StatsWidgetComponent {
  readonly data = input.required<IStatsWidgetData>();

  private readonly theme = inject(ThemeService);
  protected readonly sparkOptions = SPARK_OPTIONS;

  /**
   * Every spark is drawn in one tint. Giving each tile its own hue would spend
   * the categorical channel on tile position — information the label already
   * carries — and turn a row of numbers into a colour chart of nothing.
   */
  protected sparkData(values: readonly number[]) {
    return buildSparkData(values, seriesColor(1, this.theme.tokens()));
  }
}
