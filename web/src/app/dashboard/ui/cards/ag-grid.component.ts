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
import { cellHtml, cellTone, columnTitle, isNumericDisplay } from './cell-format';

/**
 * The same recordset rendered by AG Grid.
 *
 * The switch exists because "which grid" is a real question a dashboard tool
 * has to answer and different teams answer it differently — so the card asks
 * instead of deciding. What it must NOT do is change the data: both engines
 * call the same `cell-format.ts`, so a negative balance is the same red here as
 * in Tabulator and in the plain table.
 *
 * AG Grid 33+ uses the Theming API rather than a stylesheet, which is why this
 * component imports no CSS: the theme is built from the Dashboardius tokens at
 * runtime, so it follows a light/dark switch like everything else. Lazily
 * loaded, like Tabulator.
 */
@Component({
  selector: 'db-ag-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: '<div class="db-ag-grid" #host></div>',
  styles: `
    .db-ag-grid {
      height: 100%;
      width: 100%;
    }
  `,
})
export class AgGridComponent {
  readonly columns = input.required<readonly IRecordsetColumn[]>();
  readonly rows = input.required<readonly RecordsetRow[]>();
  readonly currency = input<string | undefined>(undefined);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly theme = inject(ThemeService);

  constructor() {
    effect((onCleanup) => {
      const columns = this.columns();
      const rows = this.rows();
      const tokens = this.theme.tokens();
      const element = this.host().nativeElement;

      let api: { destroy(): void } | undefined;
      let disposed = false;
      onCleanup(() => {
        disposed = true;
        api?.destroy();
      });

      void this.build(element, columns, rows, tokens.dark).then((created) => {
        if (disposed) created?.destroy();
        else api = created;
      });
    });
  }

  private async build(
    element: HTMLDivElement,
    columns: readonly IRecordsetColumn[],
    rows: readonly RecordsetRow[],
    dark: boolean,
  ) {
    const { AllCommunityModule, ModuleRegistry, createGrid, themeQuartz } = await import(
      'ag-grid-community'
    );
    ModuleRegistry.registerModules([AllCommunityModule]);
    const currency = this.currency();

    // The grid reads literal colours, so the tokens are resolved here rather
    // than left as var() references AG Grid would not evaluate.
    const style = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string): string =>
      style.getPropertyValue(name).trim() || fallback;

    const theme = themeQuartz.withParams({
      accentColor: token('--brand', '#0b7285'),
      backgroundColor: token('--card', '#ffffff'),
      foregroundColor: token('--ink-soft', '#3d434c'),
      headerTextColor: token('--ink-faint', '#8b93a0'),
      headerBackgroundColor: token('--card', '#ffffff'),
      borderColor: token('--hairline', '#e3e1dc'),
      rowHoverColor: token('--paper-sunken', '#efede8'),
      oddRowBackgroundColor: token('--card', '#ffffff'),
      fontFamily: 'inherit',
      fontSize: 12,
      headerFontSize: 10,
      headerFontWeight: 700,
      rowHeight: 30,
      headerHeight: 32,
      wrapperBorder: false,
      browserColorScheme: dark ? 'dark' : 'light',
    });

    return createGrid(element, {
      theme,
      rowData: rows.map((row) =>
        Object.fromEntries(columns.map((col, i) => [col.name, row[i] ?? null])),
      ),
      defaultColDef: { sortable: true, resizable: true, filter: false },
      suppressCellFocus: false,
      columnDefs: columns.map((col) => {
        const column = currency && !col.currency ? { ...col, currency } : col;
        return {
          headerName: columnTitle(column).toUpperCase(),
          field: column.name,
          minWidth: column.width,
          flex: column.display === 'text' ? 2 : 1,
          type: isNumericDisplay(column.display) ? 'rightAligned' : undefined,
          cellClass: (params: { value: unknown }) =>
            cellTone(params.value as never, column).cellClass ?? '',
          // Same renderer as every other engine.
          cellRenderer: (params: { value: unknown }) => {
            const span = document.createElement('span');
            span.innerHTML = cellHtml(params.value as never, column);
            return span;
          },
        };
      }),
    }) as unknown as { destroy(): void };
  }
}
