import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { GRID_ENGINE_LABELS, GridEngine, ISqlWidgetData } from '../../model/board.model';
import { DataGridComponent } from './data-grid.component';

/**
 * A DataTug query card: the query, its result in a grid, and where it ran.
 *
 * This is the card that states the division of labour without a paragraph of
 * marketing about it — the SQL is DataTug's, the recordset is DataTug's shape
 * (`columns` + `rows` + `duration`, as `IRecordsetResult` defines them), and
 * Dashboardius' contribution is that you are looking at it on a board, in a
 * grid you can re-engine from the card menu, next to a chart.
 */
@Component({
  selector: 'db-query-widget',
  standalone: true,
  imports: [DataGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sql-wrap">
      <pre class="sql"><code>{{ data().sql }}</code></pre>
    </div>

    <div class="grid-wrap">
      <db-data-grid
        [columns]="data().columns"
        [rows]="data().rows"
        [currency]="data().currency"
        [engine]="engine()"
        [caption]="'Result of the query above, ' + data().rows.length + ' rows.'"
      />
    </div>

    <p class="meta">
      <span class="source">
        <span class="dot" aria-hidden="true"></span>
        DataTug
      </span>
      <span class="sep" aria-hidden="true">/</span>
      <span>{{ data().environment }}</span>
      <span class="sep" aria-hidden="true">/</span>
      <span>{{ data().rows.length }} rows in {{ data().duration }} ms</span>
      <span class="sep" aria-hidden="true">/</span>
      <span class="engine">{{ engineLabel() }}</span>
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }

    .sql-wrap {
      position: relative;
      max-height: 118px;
      overflow: auto;
      background: var(--paper-sunken);
      border-bottom: 1px solid var(--hairline);
      /* Fades the last line so a scrollable query reads as scrollable rather
         than as a query that stops mid-statement. */
      mask-image: linear-gradient(to bottom, #000 calc(100% - 18px), transparent);
    }

    .sql {
      margin: 0;
      padding: 10px 12px;
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 1.55;
      color: var(--ink-muted);
      white-space: pre;
    }

    /* A fixed height across all three engines: Tabulator and AG Grid size to
       their container while a plain table sizes to its rows, so without this
       the board would jump every time the engine changed. */
    .grid-wrap {
      flex: 1 1 auto;
      height: 322px;
      min-height: 322px;
      overflow: hidden;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin: 0;
      padding: 7px 12px;
      border-top: 1px solid var(--hairline);
      font-size: 10.5px;
      color: var(--ink-faint);
      font-variant-numeric: tabular-nums;
    }

    .source {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 640;
      color: var(--ink-muted);
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--brand);
    }

    .sep {
      color: var(--hairline-strong);
    }

    .engine {
      font-weight: 620;
      color: var(--ink-muted);
    }
  `,
})
export class QueryWidgetComponent {
  readonly data = input.required<ISqlWidgetData>();
  readonly engine = input<GridEngine>('table');

  protected engineLabel(): string {
    return GRID_ENGINE_LABELS[this.engine()];
  }
}
