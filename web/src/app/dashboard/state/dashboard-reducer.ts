import {
  IBoardCardDef,
  IBoardDef,
  IBoardRowDef,
  IChartWidgetData,
  isChartWidget,
} from '../model/board.model';
import { OFF_BOARD_CARDS } from '../model/demo-board';
import { DashboardAction } from './dashboard-actions';

/**
 * The one place a board changes shape. Pure: same board + same action → same
 * new board, no mutation of the input, no reference into the outside world.
 *
 * Purity is what makes undo cheap enough to be worth having — the history is
 * just the sequence of boards this function returned, so nothing has to know
 * how to invert an action.
 */
export function applyAction(board: IBoardDef, action: DashboardAction): IBoardDef {
  switch (action.type) {
    case 'rename-board':
      return { ...board, title: action.title };

    case 'add-card':
      return addCard(board, action.cardId, action.rowId, action.index);

    case 'remove-card':
      return pruneEmptyRows(mapRows(board, (row) => ({
        ...row,
        cards: (row.cards ?? []).filter((c) => c.id !== action.cardId),
      })));

    case 'move-card':
      return moveCard(board, action.cardId, action.toRowId, action.toIndex);

    case 'resize-card':
      return mapCard(board, action.cardId, (card) => ({ ...card, cols: action.cols }));

    case 'set-chart-kind':
      return mapChartData(board, action.cardId, (data) => ({ ...data, kind: action.cardKind }));

    case 'set-series-visible':
      return mapChartData(board, action.cardId, (data) => ({
        ...data,
        series: data.series.map((s) =>
          s.id === action.seriesId ? { ...s, visible: action.visible } : s,
        ),
      }));
  }
}

export function applyActions(board: IBoardDef, actions: readonly DashboardAction[]): IBoardDef {
  return actions.reduce(applyAction, board);
}

// --- helpers ---------------------------------------------------------------

const rowsOf = (board: IBoardDef): readonly IBoardRowDef[] => board.rows ?? [];

function mapRows(
  board: IBoardDef,
  fn: (row: IBoardRowDef) => IBoardRowDef,
): IBoardDef {
  return { ...board, rows: rowsOf(board).map(fn) };
}

function mapCard(
  board: IBoardDef,
  cardId: string,
  fn: (card: IBoardCardDef) => IBoardCardDef,
): IBoardDef {
  return mapRows(board, (row) => ({
    ...row,
    cards: (row.cards ?? []).map((card) => (card.id === cardId ? fn(card) : card)),
  }));
}

function mapChartData(
  board: IBoardDef,
  cardId: string,
  fn: (data: IChartWidgetData) => IChartWidgetData,
): IBoardDef {
  return mapCard(board, cardId, (card) =>
    isChartWidget(card.widget)
      ? { ...card, widget: { ...card.widget, data: fn(card.widget.data) } }
      : card,
  );
}

export function findCard(board: IBoardDef, cardId: string): IBoardCardDef | undefined {
  for (const row of rowsOf(board)) {
    const found = (row.cards ?? []).find((c) => c.id === cardId);
    if (found) return found;
  }
  return undefined;
}

export function findRowOfCard(board: IBoardDef, cardId: string): IBoardRowDef | undefined {
  return rowsOf(board).find((row) => (row.cards ?? []).some((c) => c.id === cardId));
}

/**
 * Add a card that is currently off the board. A card the board already shows is
 * never added twice — the action is a no-op, so a visitor clicking the same
 * suggestion twice gets the same board, not two identical charts.
 */
function addCard(
  board: IBoardDef,
  cardId: string,
  rowId: string | undefined,
  index: number | undefined,
): IBoardDef {
  if (findCard(board, cardId)) return board;
  const card = OFF_BOARD_CARDS[cardId];
  if (!card) return board;

  const rows = rowsOf(board);
  const targetRowId = rowId ?? rows[0]?.id;
  if (!targetRowId || !rows.some((r) => r.id === targetRowId)) {
    return { ...board, rows: [...rows, { id: `row-${rows.length + 1}`, cards: [card] }] };
  }

  return mapRows(board, (row) => {
    if (row.id !== targetRowId) return row;
    const cards = [...(row.cards ?? [])];
    cards.splice(index ?? cards.length, 0, card);
    return { ...row, cards };
  });
}

function moveCard(
  board: IBoardDef,
  cardId: string,
  toRowId: string,
  toIndex: number,
): IBoardDef {
  const card = findCard(board, cardId);
  if (!card) return board;
  const fromRow = findRowOfCard(board, cardId);
  if (!fromRow) return board;
  // An unknown destination is a no-op, NOT a deletion. Without this the card is
  // stripped from its source row and never re-inserted anywhere — a stale row
  // id from a drag or a future plan would silently lose the visitor's card,
  // which is the one failure mode a board editor must never have.
  if (!rowsOf(board).some((row) => row.id === toRowId)) return board;

  const withoutCard = rowsOf(board).map((row) => ({
    ...row,
    cards: (row.cards ?? []).filter((c) => c.id !== cardId),
  }));

  const rows = withoutCard.map((row) => {
    if (row.id !== toRowId) return row;
    const cards = [...row.cards];
    cards.splice(Math.max(0, Math.min(toIndex, cards.length)), 0, card);
    return { ...row, cards };
  });

  return pruneEmptyRows({ ...board, rows });
}

/**
 * A row with no cards is a hole in the layout, not a placeholder — except when
 * it is the only row left, because a board with no rows has nowhere to drop
 * anything and would trap the visitor in an empty state they cannot leave.
 */
function pruneEmptyRows(board: IBoardDef): IBoardDef {
  const rows = rowsOf(board).filter((row) => (row.cards ?? []).length > 0);
  return { ...board, rows: rows.length ? rows : [{ id: 'row-1', cards: [] }] };
}
