import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { GridEngine, IRecordsetColumn, RecordsetRow } from '../../model/board.model';
import { AgGridComponent } from './ag-grid.component';
import { TabulatorGridComponent } from './tabulator-grid.component';
import { cellHtml, cellText, cellTone, columnTitle, isNumericDisplay } from './cell-format';

/**
 * A recordset, rendered by whichever grid engine the card is set to.
 *
 * The plain table is the default and the floor: it is real `<table>` markup, so
 * it works before hydration, without JavaScript, in a screen reader and in a
 * crawler. Tabulator and AG Grid are alternatives a visitor can switch to from
 * the card menu, and both arrive as a lazy chunk at the moment they are chosen
 * — neither is in the bundle otherwise.
 *
 * All three share `cell-format.ts`, so the engine is a rendering preference and
 * never a change in what the data says.
 */
@Component({
  selector: 'db-data-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (engine()) {
      @case ('tabulator') {
        @defer (on immediate) {
          <db-tabulator-grid [columns]="columns()" [rows]="rows()" [currency]="currency()" />
        } @placeholder {
          <p class="loading">Loading Tabulator…</p>
        }
      }
      @case ('ag-grid') {
        @defer (on immediate) {
          <db-ag-grid [columns]="columns()" [rows]="rows()" [currency]="currency()" />
        } @placeholder {
          <p class="loading">Loading AG Grid…</p>
        }
      }
      @default {
        <table class="db-tabular">
          @if (caption()) {
            <caption class="db-visually-hidden">{{ caption() }}</caption>
          }
          <thead>
            <tr>
              @for (col of columns(); track col.name) {
                <th scope="col" [class.is-num]="numeric(col)">{{ title(col) }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track $index) {
              <tr>
                @for (col of columns(); track col.name; let c = $index) {
                  <td
                    [class.is-num]="numeric(col)"
                    [class]="toneClass(row[c], col)"
                    [title]="text(row[c], col)"
                    [innerHTML]="html(row[c], col)"
                  ></td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
      overflow: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    th,
    td {
      padding: 5px 10px;
      text-align: left;
      border-bottom: 1px solid var(--hairline);
      white-space: nowrap;
    }

    .is-num {
      text-align: right;
    }

    thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--card);
      color: var(--ink-faint);
      font-size: 10px;
      font-weight: 660;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    tbody tr:hover td {
      background: var(--paper-sunken);
    }

    tbody td:first-child {
      color: var(--ink);
      font-weight: 520;
    }

    .loading {
      margin: 0;
      padding: 22px 12px;
      font-size: 12px;
      color: var(--ink-faint);
    }
  `,
  imports: [TabulatorGridComponent, AgGridComponent],
})
export class DataGridComponent {
  readonly columns = input.required<readonly IRecordsetColumn[]>();
  readonly rows = input.required<readonly RecordsetRow[]>();
  readonly engine = input.required<GridEngine>();
  readonly currency = input<string | undefined>(undefined);
  readonly caption = input('');

  private readonly sanitizer = inject(DomSanitizer);
  private readonly htmlCache = new Map<string, SafeHtml>();

  protected title = columnTitle;
  protected numeric = (col: IRecordsetColumn) => isNumericDisplay(col.display);

  /**
   * Marked trusted deliberately, and safely.
   *
   * A progress bar needs an inline width, and Angular's HTML sanitizer strips
   * `style` attributes — so bound through `innerHTML` alone every bar renders
   * full, which is worse than not drawing one. `cellHtml` builds the markup
   * itself and puts every interpolated value through `escapeHtml` first, so
   * nothing from the recordset can reach the DOM as markup. That escaping is
   * the contract this bypass depends on: change one without the other and this
   * becomes an injection point.
   *
   * The other two engines set innerHTML directly and are not sanitized at all,
   * so the same contract already had to hold for them.
   */
  protected html(value: unknown, col: IRecordsetColumn): SafeHtml {
    const column = this.withCurrency(col);
    const key = `${column.name}:${String(value)}`;
    let safe = this.htmlCache.get(key);
    if (!safe) {
      safe = this.sanitizer.bypassSecurityTrustHtml(cellHtml(value as never, column));
      this.htmlCache.set(key, safe);
    }
    return safe;
  }

  protected text(value: unknown, col: IRecordsetColumn): string {
    return cellText(value as never, this.withCurrency(col));
  }

  protected toneClass(value: unknown, col: IRecordsetColumn): string {
    return cellTone(value as never, this.withCurrency(col)).cellClass ?? '';
  }

  private withCurrency(col: IRecordsetColumn): IRecordsetColumn {
    const currency = this.currency();
    return currency && !col.currency ? { ...col, currency } : col;
  }
}
