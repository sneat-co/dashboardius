import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

import {
  CARD_SPANS,
  GRID_ENGINES,
  GRID_ENGINE_LABELS,
  GridEngine,
  IBoardCardDef,
  IBoardDef,
  IChartWidgetData,
  IContentWidgetData,
  ISqlWidgetData,
  IStatsWidgetData,
  ICardAction,
  ChartKind,
  clampSpan,
  isChartWidget,
  isContentWidget,
  isSqlWidget,
  isStatsWidget,
} from '../model/board.model';
import { DashboardAction } from '../state/dashboard-actions';
import { CardMenuGroup } from './card-menu.model';
import { CardShellComponent } from './card-shell.component';
import { ChartWidgetComponent } from './cards/chart-widget.component';
import { ContentWidgetComponent } from './cards/content-widget.component';
import { QueryWidgetComponent } from './cards/query-widget.component';
import { StatsWidgetComponent } from './cards/stats-widget.component';
import { CardActionButtonComponent } from './card-action-button.component';
import { DashboardStore } from '../state/dashboard-store';

/**
 * The board itself: rows of cards on a twelve-column grid.
 *
 * Rows come straight from DataTug's board schema, so this grid is rendering a
 * DataTug board rather than a Dashboardius-only structure. Within a row the
 * cards are a horizontal CDK drop list, and every row belongs to one drop-list
 * group, so a card can be dragged along its row or into another one.
 *
 * Pointer drag is never the only way to move a card. The same three moves —
 * reorder, resize, remove — are all in the card menu, which is reachable by
 * keyboard, so nothing here depends on being able to hold a mouse button down.
 */
@Component({
  selector: 'db-board-grid',
  standalone: true,
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    CardShellComponent,
    ChartWidgetComponent,
    StatsWidgetComponent,
    QueryWidgetComponent,
    ContentWidgetComponent,
    CardActionButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div cdkDropListGroup class="board">
      @for (row of board().rows; track row.id) {
        <div
          class="row"
          cdkDropList
          cdkDropListOrientation="mixed"
          [cdkDropListData]="row.id"
          (cdkDropListDropped)="dropped($event)"
        >
          @for (card of row.cards; track card.id) {
            <div
              class="cell"
              [attr.data-card-id]="card.id"
              [style.--span]="span(card)"
              cdkDrag
              [cdkDragData]="card.id"
            >
              <div class="drop-ghost" *cdkDragPlaceholder></div>
              <db-card-shell
                [title]="card.title"
                [menu]="menuFor(card)"
                [note]="noteFor(card)"
                [badge]="badgeFor(card)"
                [hasAction]="!!actionFor(card)"
                [arriving]="arrived().includes(card.id)"
                (menuSelect)="onMenu(card, $event)"
              >
                @if (isChart(card)) {
                  <db-chart-widget
                    [data]="chartData(card)"
                    [cardTitle]="card.title"
                    [tableView]="tableViews().has(card.id)"
                    (toggleSeries)="onToggleSeries(card.id, $event)"
                  />
                } @else if (isStats(card)) {
                  <db-stats-widget [data]="statsData(card)" />
                } @else if (isQuery(card)) {
                  <db-query-widget [data]="queryData(card)" [engine]="engineFor(card.id)" />
                } @else if (isContent(card)) {
                  <db-content-widget [data]="contentData(card)" />
                }

                @if (actionFor(card); as action) {
                  <div cardAction class="card-action">
                    <db-card-action-button [action]="action" (run)="runAction.emit($event)" />
                  </div>
                }
              </db-card-shell>
            </div>
          }
        </div>
      } @empty {
        <p class="empty">
          Every card has been removed. Dashboardius finds this suspicious —
          <button type="button" (click)="resetRequested.emit()">put them back</button>.
        </p>
      }
    </div>
  `,
  styles: `
    .board {
      display: grid;
      gap: var(--gutter);
    }

    .row {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: var(--gutter);
      align-items: stretch;
      min-height: 40px;
      border-radius: var(--radius-card);
      transition: background var(--dur) var(--ease);
    }

    .row.cdk-drop-list-dragging {
      background: color-mix(in srgb, var(--brand) 5%, transparent);
    }

    .cell {
      grid-column: span var(--span);
      display: flex;
      min-width: 0;
      min-height: 176px;
    }

    .cell > db-card-shell {
      flex: 1 1 auto;
      min-width: 0;
    }

    /* CDK moves the dragged node into an overlay; keep its shadow ours. */
    .cell.cdk-drag-preview db-card-shell {
      box-shadow: var(--shadow-drag);
      border-color: var(--brand);
    }

    .cell.cdk-drag-placeholder {
      opacity: 0;
    }

    .drop-ghost {
      flex: 1 1 auto;
      border: 1.5px dashed var(--brand);
      border-radius: var(--radius-card);
      background: color-mix(in srgb, var(--brand) 7%, transparent);
    }

    .cdk-drag-animating,
    .row.cdk-drop-list-dragging .cell:not(.cdk-drag-placeholder) {
      transition: transform 220ms cubic-bezier(0.2, 0, 0.13, 1);
    }

    .card-action {
      display: flex;
      justify-content: flex-end;
      flex: none;
    }

    .empty {
      padding: 46px 20px;
      text-align: center;
      font-size: 13.5px;
      color: var(--ink-muted);
      border: 1px dashed var(--hairline-strong);
      border-radius: var(--radius-card);
    }

    .empty button {
      padding: 0;
      border: 0;
      background: none;
      color: var(--brand);
      font: inherit;
      font-weight: 620;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }

    @media (max-width: 900px) {
      /* Below tablet a twelve-column row cannot hold its own: cards stack to a
         single readable column rather than shrinking into illegibility. */
      .row {
        grid-template-columns: minmax(0, 1fr);
      }

      .cell {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class BoardGridComponent {
  readonly board = input.required<IBoardDef>();
  readonly tableViews = input.required<ReadonlySet<string>>();
  /** Grid engine per query card. A view preference, not board data. */
  readonly gridEngines = input.required<ReadonlyMap<string, GridEngine>>();
  readonly act = output<readonly DashboardAction[]>();
  readonly runAction = output<string>();
  readonly toggleTableView = output<string>();
  readonly setGridEngine = output<{ cardId: string; engine: GridEngine }>();
  readonly resetRequested = output<void>();

  private readonly store = inject(DashboardStore);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  protected readonly arrived = this.store.arrivedCards;

  constructor() {
    // A command can add a card below the fold, and a visitor who does not see
    // it concludes nothing happened. Bring it into view — gently, and never
    // against a reduced-motion preference.
    effect(() => {
      const arrived = this.arrived();
      if (!arrived.length || typeof window === 'undefined') return;
      afterNextRender(
        () => {
          const element = (this.host.nativeElement as HTMLElement).querySelector(
            `[data-card-id="${CSS.escape(arrived[0])}"]`,
          );
          element?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
            block: 'nearest',
          });
          // The arrival highlight is a one-off announcement, not a state the
          // card stays in. Cleared once the animation has had time to run.
          setTimeout(() => this.store.clearArrived(), 600);
        },
        { injector: this.injector },
      );
    });
  }

  protected span(card: IBoardCardDef): number {
    return clampSpan(card.cols);
  }

  protected engineFor(cardId: string): GridEngine {
    return this.gridEngines().get(cardId) ?? 'table';
  }

  protected isChart = (c: IBoardCardDef) => isChartWidget(c.widget);
  protected isStats = (c: IBoardCardDef) => isStatsWidget(c.widget);
  protected isQuery = (c: IBoardCardDef) => isSqlWidget(c.widget);
  protected isContent = (c: IBoardCardDef) => isContentWidget(c.widget);

  /**
   * Widget payload accessors. Each returns the exact data type its widget
   * component demands; the `@if (isChart(card))` guard in the template is what
   * makes the narrowing sound, and these throw rather than render nonsense if
   * that guard is ever removed.
   */
  protected chartData(c: IBoardCardDef): IChartWidgetData {
    if (!isChartWidget(c.widget)) throw new Error(`Card ${c.id} is not a chart`);
    return c.widget.data;
  }

  protected statsData(c: IBoardCardDef): IStatsWidgetData {
    if (!isStatsWidget(c.widget)) throw new Error(`Card ${c.id} is not a stats card`);
    return c.widget.data;
  }

  protected queryData(c: IBoardCardDef): ISqlWidgetData {
    if (!isSqlWidget(c.widget)) throw new Error(`Card ${c.id} is not a query card`);
    return c.widget.data;
  }

  protected contentData(c: IBoardCardDef): IContentWidgetData {
    if (!isContentWidget(c.widget)) throw new Error(`Card ${c.id} is not a content card`);
    return c.widget.data;
  }

  protected noteFor(card: IBoardCardDef): string | undefined {
    const widget = card.widget;
    if (isChartWidget(widget)) return widget.data.note;
    if (isStatsWidget(widget)) return widget.data.note;
    if (isSqlWidget(widget)) return widget.data.note;
    return undefined;
  }

  protected badgeFor(card: IBoardCardDef): string | undefined {
    return isSqlWidget(card.widget) ? 'DataTug' : undefined;
  }

  protected actionFor(card: IBoardCardDef): ICardAction | undefined {
    const widget = card.widget;
    if (isChartWidget(widget)) return widget.data.action;
    if (isContentWidget(widget)) return widget.data.action;
    return undefined;
  }

  protected onToggleSeries(cardId: string, seriesId: string): void {
    const card = this.findCard(cardId);
    if (!card || !isChartWidget(card.widget)) return;
    const series = card.widget.data.series.find((s) => s.id === seriesId);
    if (!series) return;
    this.act.emit([
      { type: 'set-series-visible', cardId, seriesId, visible: !series.visible },
    ]);
  }

  protected dropped(event: CdkDragDrop<string>): void {
    const cardId = event.item.data as string;
    this.act.emit([
      { type: 'move-card', cardId, toRowId: event.container.data, toIndex: event.currentIndex },
    ]);
  }

  // --- the card menu -------------------------------------------------------

  protected menuFor(card: IBoardCardDef): readonly CardMenuGroup[] {
    const groups: CardMenuGroup[] = [];
    const widget = card.widget;

    if (isSqlWidget(widget)) {
      groups.push({
        id: 'engine',
        label: 'Grid',
        singleSelect: true,
        entries: GRID_ENGINES.map((engine) => ({
          id: `engine:${engine}`,
          label: GRID_ENGINE_LABELS[engine],
          checked: this.engineFor(card.id) === engine,
          hint: engine === 'table' ? 'no download' : 'lazy-loaded',
        })),
      });
    }

    if (isChartWidget(widget)) {
      groups.push({
        id: 'metrics',
        label: 'Metrics',
        entries: widget.data.series.map((s) => ({
          id: `series:${s.id}`,
          label: s.label,
          checked: s.visible,
        })),
      });
      groups.push({
        id: 'kind',
        // Shape is one-of; the table view inside it is an independent toggle,
        // so it lives in its own group rather than being announced as a radio.
        singleSelect: true,
        label: 'Shape',
        entries: [
          { id: 'kind:area', label: 'Area', checked: widget.data.kind === 'area' },
          { id: 'kind:bar', label: 'Bars', checked: widget.data.kind === 'bar' },
          {
            id: 'kind:donut',
            label: 'Donut',
            checked: widget.data.kind === 'donut',
            // Part-to-whole only. Two datasets in a ring compare nothing, so
            // the option is withheld rather than offered and then regretted.
            disabled: widget.data.series.filter((s) => s.visible).length !== 1,
            hint: widget.data.series.filter((s) => s.visible).length !== 1 ? 'one metric only' : undefined,
          },
        ],
      });
      groups.push({
        id: 'view',
        entries: [{ id: 'table', label: 'Table view', checked: this.tableViews().has(card.id) }],
      });
    }

    groups.push({
      id: 'size',
      label: 'Width',
      singleSelect: true,
      entries: CARD_SPANS.map((s) => ({
        id: `size:${s}`,
        label: s === 12 ? 'Full width' : `${s} of 12`,
        checked: this.span(card) === s,
        hint: `${Math.round((s / 12) * 100)}%`,
      })),
    });

    const position = this.positionOf(card.id);
    groups.push({
      id: 'move',
      label: 'Move',
      entries: [
        { id: 'move:left', label: 'Left', disabled: !position || position.index === 0 },
        {
          id: 'move:right',
          label: 'Right',
          disabled: !position || position.index >= position.rowLength - 1,
        },
        { id: 'move:up', label: 'Up a row', disabled: !position || position.rowIndex === 0 },
        {
          id: 'move:down',
          label: 'Down a row',
          disabled: !position || position.rowIndex >= this.rowCount() - 1,
        },
      ],
    });

    groups.push({
      id: 'danger',
      entries: [{ id: 'remove', label: 'Remove card', danger: true }],
    });

    return groups;
  }

  protected onMenu(card: IBoardCardDef, entryId: string): void {
    const [kind, value] = entryId.split(':');

    if (kind === 'series') {
      this.onToggleSeries(card.id, value);
      return;
    }
    if (kind === 'engine') {
      this.setGridEngine.emit({ cardId: card.id, engine: value as GridEngine });
      return;
    }
    if (kind === 'kind') {
      this.act.emit([
        { type: 'set-chart-kind', cardId: card.id, cardKind: value as ChartKind },
      ]);
      return;
    }
    if (entryId === 'table') {
      this.toggleTableView.emit(card.id);
      return;
    }
    if (kind === 'size') {
      this.act.emit([
        { type: 'resize-card', cardId: card.id, cols: clampSpan(Number(value)) },
      ]);
      return;
    }
    if (entryId === 'remove') {
      this.act.emit([{ type: 'remove-card', cardId: card.id }]);
      return;
    }
    if (kind === 'move') {
      this.moveByKeyboard(card.id, value as 'left' | 'right' | 'up' | 'down');
    }
  }

  /** The non-pointer equivalent of a drag. */
  private moveByKeyboard(cardId: string, direction: 'left' | 'right' | 'up' | 'down'): void {
    const position = this.positionOf(cardId);
    if (!position) return;
    const rows = this.board().rows ?? [];

    if (direction === 'left' || direction === 'right') {
      const toIndex = position.index + (direction === 'left' ? -1 : 1);
      if (toIndex < 0 || toIndex >= position.rowLength) return;
      this.act.emit([{ type: 'move-card', cardId, toRowId: position.rowId, toIndex }]);
      return;
    }

    const rowIndex = position.rowIndex + (direction === 'up' ? -1 : 1);
    const target = rows[rowIndex];
    if (!target) return;
    this.act.emit([
      { type: 'move-card', cardId, toRowId: target.id, toIndex: (target.cards ?? []).length },
    ]);
  }

  private positionOf(cardId: string) {
    const rows = this.board().rows ?? [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const cards = rows[rowIndex].cards ?? [];
      const index = cards.findIndex((c) => c.id === cardId);
      if (index >= 0) {
        return { rowId: rows[rowIndex].id, rowIndex, index, rowLength: cards.length };
      }
    }
    return undefined;
  }

  private findCard(cardId: string): IBoardCardDef | undefined {
    return (this.board().rows ?? [])
      .flatMap((r) => r.cards ?? [])
      .find((c) => c.id === cardId);
  }

  private readonly rowCountSignal = computed(() => (this.board().rows ?? []).length);
  private rowCount(): number {
    return this.rowCountSignal();
  }
}
