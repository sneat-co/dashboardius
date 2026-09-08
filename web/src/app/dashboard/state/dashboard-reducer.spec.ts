import { applyAction, applyActions, findCard, findRowOfCard } from './dashboard-reducer';
import type { DashboardAction } from './dashboard-actions';
import { DEMO_BOARD } from '../model/demo-board';
import type { IBoardDef } from '../model/board.model';

/**
 * Deep-freezes a structural clone so any attempted mutation of the input board
 * throws instead of silently succeeding. `applyAction`/`applyActions` are
 * documented as pure — this is the enforcement mechanism for that claim.
 */
function frozenClone<T>(value: T): T {
  const clone = structuredClone(value);
  deepFreeze(clone);
  return clone;
}

function deepFreeze<T>(obj: T): T {
  if (obj !== null && typeof obj === 'object' && !Object.isFrozen(obj)) {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      deepFreeze((obj as Record<string, unknown>)[key]);
    }
    Object.freeze(obj);
  }
  return obj;
}

const demo = (): IBoardDef => frozenClone(DEMO_BOARD);

describe('applyAction', () => {
  describe('rename-board', () => {
    it('renames the board and leaves the input untouched', () => {
      const board = demo();
      const before = JSON.stringify(board);
      const result = applyAction(board, { type: 'rename-board', title: 'Q3 review' });
      expect(result.title).toBe('Q3 review');
      expect(board.title).toBe('Product pulse');
      expect(JSON.stringify(board)).toBe(before);
    });
  });

  describe('add-card', () => {
    it('adds an off-board card into an existing row at the requested index', () => {
      const board = demo();
      const result = applyAction(board, {
        type: 'add-card',
        cardId: 'revenue',
        rowId: 'row-1',
        index: 1,
      });
      const row1 = result.rows!.find((r) => r.id === 'row-1')!;
      expect(row1.cards!.map((c) => c.id)).toEqual(['signups', 'revenue', 'pulse']);
    });

    it('defaults to the first row when rowId is omitted', () => {
      const board = demo();
      const result = applyAction(board, { type: 'add-card', cardId: 'revenue' });
      const row1 = result.rows!.find((r) => r.id === 'row-1')!;
      expect(row1.cards!.some((c) => c.id === 'revenue')).toBe(true);
    });

    it('is a no-op when the card is already on the board', () => {
      const board = demo();
      const result = applyAction(board, { type: 'add-card', cardId: 'signups', rowId: 'row-1' });
      expect(result).toBe(board);
    });

    it('is a no-op when the card id is unknown (not in OFF_BOARD_CARDS)', () => {
      const board = demo();
      const result = applyAction(board, { type: 'add-card', cardId: 'no-such-card', rowId: 'row-1' });
      expect(result).toBe(board);
    });

    it('appends a NEW row when rowId does not match any existing row', () => {
      const board = demo();
      const beforeRowCount = board.rows!.length;
      const result = applyAction(board, {
        type: 'add-card',
        cardId: 'revenue',
        rowId: 'does-not-exist',
      });
      expect(result.rows!.length).toBe(beforeRowCount + 1);
      const newRow = result.rows![result.rows!.length - 1];
      expect(newRow.cards!.map((c) => c.id)).toEqual(['revenue']);
      // the original rows are untouched
      expect(result.rows!.slice(0, beforeRowCount)).toEqual(board.rows);
    });

    it('does not mutate the frozen input board', () => {
      const board = demo();
      expect(() =>
        applyAction(board, { type: 'add-card', cardId: 'revenue', rowId: 'row-1' }),
      ).not.toThrow();
    });
  });

  describe('remove-card', () => {
    it('removes a card from a row that keeps other cards', () => {
      const board = demo();
      const result = applyAction(board, { type: 'remove-card', cardId: 'signups' });
      const row1 = result.rows!.find((r) => r.id === 'row-1')!;
      expect(row1.cards!.map((c) => c.id)).toEqual(['pulse']);
    });

    it('prunes a row once its last card is removed', () => {
      const board = demo();
      // row-4 has exactly one card: 'ecosystem'.
      expect(board.rows!.find((r) => r.id === 'row-4')!.cards!.length).toBe(1);
      const result = applyAction(board, { type: 'remove-card', cardId: 'ecosystem' });
      expect(result.rows!.some((r) => r.id === 'row-4')).toBe(false);
      expect(result.rows!.length).toBe(board.rows!.length - 1);
    });

    it('leaves exactly one empty row when every card is removed — never zero rows', () => {
      const board = demo();
      const allCardIds: string[] = [];
      for (const row of board.rows ?? []) {
        for (const card of row.cards ?? []) allCardIds.push(card.id);
      }
      const actions: DashboardAction[] = allCardIds.map((cardId) => ({
        type: 'remove-card',
        cardId,
      }));
      const result = applyActions(board, actions);
      expect(result.rows!.length).toBe(1);
      expect(result.rows![0]).toEqual({ id: 'row-1', cards: [] });
    });
  });

  describe('move-card', () => {
    it('moves a card across rows and prunes the now-empty source row', () => {
      const board = demo();
      const result = applyAction(board, {
        type: 'move-card',
        cardId: 'ecosystem',
        toRowId: 'row-1',
        toIndex: 0,
      });
      const row1 = result.rows!.find((r) => r.id === 'row-1')!;
      expect(row1.cards!.map((c) => c.id)).toEqual(['ecosystem', 'signups', 'pulse']);
      // row-4 only had 'ecosystem', so it is pruned away entirely.
      expect(result.rows!.some((r) => r.id === 'row-4')).toBe(false);
    });

    it('moves a card within the same row', () => {
      const board = demo();
      const result = applyAction(board, {
        type: 'move-card',
        cardId: 'pulse',
        toRowId: 'row-1',
        toIndex: 0,
      });
      const row1 = result.rows!.find((r) => r.id === 'row-1')!;
      expect(row1.cards!.map((c) => c.id)).toEqual(['pulse', 'signups']);
    });

    it('clamps an out-of-range positive toIndex to the end of the row', () => {
      const board = demo();
      const result = applyAction(board, {
        type: 'move-card',
        cardId: 'ecosystem',
        toRowId: 'row-1',
        toIndex: 999,
      });
      const row1 = result.rows!.find((r) => r.id === 'row-1')!;
      expect(row1.cards!.map((c) => c.id)).toEqual(['signups', 'pulse', 'ecosystem']);
    });

    it('clamps a negative toIndex to the start of the row', () => {
      const board = demo();
      const result = applyAction(board, {
        type: 'move-card',
        cardId: 'ecosystem',
        toRowId: 'row-1',
        toIndex: -5,
      });
      const row1 = result.rows!.find((r) => r.id === 'row-1')!;
      expect(row1.cards!.map((c) => c.id)).toEqual(['ecosystem', 'signups', 'pulse']);
    });

    it('is a no-op when the card id does not exist', () => {
      const board = demo();
      const result = applyAction(board, {
        type: 'move-card',
        cardId: 'no-such-card',
        toRowId: 'row-1',
        toIndex: 0,
      });
      expect(result).toBe(board);
    });
  });

  describe('resize-card', () => {
    it('sets the requested column span', () => {
      const board = demo();
      const result = applyAction(board, { type: 'resize-card', cardId: 'signups', cols: 3 });
      expect(findCard(result, 'signups')!.cols).toBe(3);
    });

    it('is a no-op on a non-existent card', () => {
      const board = demo();
      const result = applyAction(board, { type: 'resize-card', cardId: 'no-such-card', cols: 3 });
      expect(result).toEqual(board);
      expect(result.rows).toEqual(board.rows);
    });
  });

  describe('set-chart-kind', () => {
    it('changes the chart kind of the targeted card', () => {
      const board = demo();
      const result = applyAction(board, { type: 'set-chart-kind', cardId: 'signups', cardKind: 'bar' });
      const card = findCard(result, 'signups')!;
      expect((card.widget as { data: { kind: string } }).data.kind).toBe('bar');
    });

    it('is a no-op on a non-existent card', () => {
      const board = demo();
      const result = applyAction(board, { type: 'set-chart-kind', cardId: 'no-such-card', cardKind: 'bar' });
      expect(result).toEqual(board);
    });
  });

  describe('set-series-visible', () => {
    it('only flips the named series, leaving the others untouched', () => {
      const board = demo();
      const before = findCard(board, 'signups')!.widget as {
        data: { series: { id: string; visible: boolean }[] };
      };
      expect(before.data.series.map((s) => s.visible)).toEqual([true, false, false]);

      const result = applyAction(board, {
        type: 'set-series-visible',
        cardId: 'signups',
        seriesId: 'signins',
        visible: true,
      });
      const after = findCard(result, 'signups')!.widget as {
        data: { series: { id: string; visible: boolean }[] };
      };
      expect(after.data.series.find((s) => s.id === 'signups')!.visible).toBe(true);
      expect(after.data.series.find((s) => s.id === 'signins')!.visible).toBe(true);
      expect(after.data.series.find((s) => s.id === 'returning')!.visible).toBe(false);
    });
  });
});

describe('applyActions', () => {
  it('folds a sequence of actions left to right', () => {
    const board = demo();
    const result = applyActions(board, [
      { type: 'rename-board', title: 'Renamed once' },
      { type: 'rename-board', title: 'Renamed twice' },
      { type: 'resize-card', cardId: 'signups', cols: 3 },
    ]);
    expect(result.title).toBe('Renamed twice');
    expect(findCard(result, 'signups')!.cols).toBe(3);
  });

  it('never mutates the original board reference chain', () => {
    const board = demo();
    const snapshot = JSON.stringify(board);
    applyActions(board, [
      { type: 'add-card', cardId: 'revenue', rowId: 'row-1' },
      { type: 'remove-card', cardId: 'pulse' },
      { type: 'move-card', cardId: 'signups', toRowId: 'row-2', toIndex: 0 },
    ]);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe('findCard', () => {
  it('finds a card that exists', () => {
    expect(findCard(DEMO_BOARD, 'signups')?.title).toBe('Sign-ups');
  });

  it('returns undefined for a card that does not exist', () => {
    expect(findCard(DEMO_BOARD, 'no-such-card')).toBeUndefined();
  });
});

describe('findRowOfCard', () => {
  it('finds the row containing a given card', () => {
    expect(findRowOfCard(DEMO_BOARD, 'ecosystem')?.id).toBe('row-4');
  });

  it('returns undefined for a card that does not exist', () => {
    expect(findRowOfCard(DEMO_BOARD, 'no-such-card')).toBeUndefined();
  });
});
