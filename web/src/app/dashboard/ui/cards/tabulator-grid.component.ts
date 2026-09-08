import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { IRecordsetColumn, RecordsetRow } from '../../model/board.model';
import { ThemeService } from '../../../theme/theme.service';
import { cellHtml, cellText, cellTone, columnTitle, isNumericDisplay } from './cell-format';

/**
 * The recordset rendered by Tabulator.
 *
 * Tabulator is DataTug's grid — `@sneat/datagrid` wraps it — so it is the
 * default engine here rather than a novelty: a Dashboardius grid card and a
 * DataTug table view should feel like the same table.
 *
 * The whole component is lazily loaded (see DataGridComponent's `@defer`),
 * which is the only reason a ~400 kB grid library is acceptable on a landing
 * page: a visitor who never opens the grid's engine menu never downloads it.
 *
 * `ViewEncapsulation.None` because Tabulator builds its own DOM at runtime;
 * emulated encapsulation stamps attributes at compile time and would never
 * reach it. Every selector below is therefore prefixed, and the theme is
 * re-pointed at the Dashboardius tokens so this reads as our table and not as
 * a third-party widget dropped into the page.
 */
@Component({
  selector: 'db-tabulator-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: '<div class="db-tabulator" #host></div>',
  styles: `
    @use 'tabulator-tables/src/scss/themes/tabulator_simple.scss' as *;

    .db-tabulator.tabulator {
      border: 0;
      background: var(--card);
      font-family: var(--font-sans);
      font-size: 12px;
    }

    .db-tabulator.tabulator .tabulator-header {
      border-bottom: 1px solid var(--hairline);
      background: var(--card);
      color: var(--ink-faint);
      font-weight: 660;
    }

    .db-tabulator.tabulator .tabulator-col {
      background: var(--card);
      border-right: 0;
    }

    /* Specific enough to beat the vendored theme's own header rule, which is
       four levels deep. */
    .db-tabulator.tabulator .tabulator-header .tabulator-col .tabulator-col-content .tabulator-col-title {
      font-size: 10px;
      font-weight: 660;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .db-tabulator.tabulator .tabulator-header .tabulator-col {
      border-right: 0;
    }

    .db-tabulator.tabulator .tabulator-col .tabulator-arrow {
      border-bottom-color: var(--hairline-strong);
      border-top-color: var(--hairline-strong);
    }

    .db-tabulator.tabulator .tabulator-row {
      background: var(--card);
      border-bottom: 1px solid var(--hairline);
      color: var(--ink-soft);
    }

    .db-tabulator.tabulator .tabulator-row.tabulator-row-even {
      background: var(--card);
    }

    .db-tabulator.tabulator .tabulator-row:hover {
      background: var(--paper-sunken);
    }

    .db-tabulator.tabulator .tabulator-cell {
      border-right: 0;
      padding: 5px 10px;
    }

    .db-tabulator.tabulator .tabulator-col.tabulator-sortable:hover {
      background: var(--paper-sunken);
    }
  `,
})
export class TabulatorGridComponent {
  readonly columns = input.required<readonly IRecordsetColumn[]>();
  readonly rows = input.required<readonly RecordsetRow[]>();
  readonly currency = input<string | undefined>(undefined);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly theme = inject(ThemeService);
  private table?: { destroy(): void };

  constructor() {
    effect((onCleanup) => {
      const columns = this.columns();
      const rows = this.rows();
      // Read the tokens so a theme switch rebuilds the table: Tabulator writes
      // literal styles into its own DOM and will not follow the cascade alone.
      this.theme.tokens();
      const element = this.host().nativeElement;

      let disposed = false;
      onCleanup(() => {
        disposed = true;
        this.table?.destroy();
        this.table = undefined;
      });

      void this.build(element, columns, rows).then((table) => {
        if (disposed) table?.destroy();
        else this.table = table;
      });
    });
  }

  private async build(
    element: HTMLDivElement,
    columns: readonly IRecordsetColumn[],
    rows: readonly RecordsetRow[],
  ) {
    const { TabulatorFull } = await import('tabulator-tables');
    const currency = this.currency();

    return new TabulatorFull(element, {
      data: rows.map((row) =>
        Object.fromEntries(columns.map((col, i) => [col.name, row[i] ?? null])),
      ),
      layout: 'fitColumns',
      height: '100%',
      placeholder: 'No rows.',
      columns: columns.map((col) => {
        const column = currency && !col.currency ? { ...col, currency } : col;
        return {
          title: columnTitle(column),
          field: column.name,
          minWidth: column.width,
          widthGrow: column.display === 'text' ? 2 : 1,
          hozAlign: isNumericDisplay(column.display) ? ('right' as const) : ('left' as const),
          headerHozAlign: isNumericDisplay(column.display) ? ('right' as const) : ('left' as const),
          // One formatter for every engine — see cell-format.ts. Switching
          // engine must not change what a value means or how it is tinted.
          formatter: (cell: { getValue(): unknown }) =>
            cellHtml(cell.getValue() as never, column),
          cssClass: cellClassesFor(column.name),
          tooltip: (_e: unknown, cell: { getValue(): unknown }) =>
            cellText(cell.getValue() as never, column),
        };
      }),
      rowFormatter: (row: {
        getElement(): HTMLElement;
        getCells(): { getValue(): unknown; getElement(): HTMLElement; getField(): string }[];
      }) => {
        for (const cell of row.getCells()) {
          const column = columns.find((c) => c.name === cell.getField());
          if (!column) continue;
          const tone = cellTone(cell.getValue() as never, column);
          if (tone.cellClass) cell.getElement().classList.add(tone.cellClass);
        }
      },
    }) as unknown as { destroy(): void };
  }
}

const cellClassesFor = (name: string): string => `db-col-${name}`;
