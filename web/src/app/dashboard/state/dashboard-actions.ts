import { CardSpan, ChartKind } from '../model/board.model';

/**
 * The structured vocabulary every dashboard mutation goes through.
 *
 * This is the middle term of the pipeline the product is built around:
 *
 *     command  →  DashboardAction[]  →  board mutation
 *
 * A suggested chip resolves to a KNOWN action list with no model in the loop.
 * A free-form prompt will one day resolve to the same action list via a model.
 * Both ends meet here, which is why the demo is a real rehearsal of the product
 * rather than a puppet show: the execution half is already the production half.
 */
export type DashboardAction =
  | { readonly type: 'add-card'; readonly cardId: string; readonly rowId?: string; readonly index?: number }
  | { readonly type: 'remove-card'; readonly cardId: string }
  | { readonly type: 'move-card'; readonly cardId: string; readonly toRowId: string; readonly toIndex: number }
  | { readonly type: 'resize-card'; readonly cardId: string; readonly cols: CardSpan }
  | { readonly type: 'set-series-visible'; readonly cardId: string; readonly seriesId: string; readonly visible: boolean }
  | { readonly type: 'set-chart-kind'; readonly cardId: string; readonly cardKind: ChartKind }
  | { readonly type: 'rename-board'; readonly title: string };

/** Short human sentence for an action — shown in the command execution trace. */
export function describeAction(action: DashboardAction): string {
  switch (action.type) {
    case 'add-card':
      return `add_card(${action.cardId})`;
    case 'remove-card':
      return `remove_card(${action.cardId})`;
    case 'move-card':
      return `move_card(${action.cardId} → ${action.toRowId}#${action.toIndex})`;
    case 'resize-card':
      return `resize_card(${action.cardId}, ${action.cols}/12)`;
    case 'set-series-visible':
      return `${action.visible ? 'show' : 'hide'}_series(${action.cardId}.${action.seriesId})`;
    case 'set-chart-kind':
      return `set_chart_kind(${action.cardId}, ${action.cardKind})`;
    case 'rename-board':
      return `rename_board("${action.title}")`;
  }
}
