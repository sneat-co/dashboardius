import { TestBed } from '@angular/core/testing';

import { DashboardStore } from './dashboard-store';
import { DEMO_BOARD } from '../model/demo-board';
import { commandById } from './command-catalog';

describe('DashboardStore', () => {
  let store: DashboardStore;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    store = TestBed.inject(DashboardStore);
  });

  it('starts pristine, pointed at the demo board, with no undo/redo history', () => {
    expect(store.board()).toBe(DEMO_BOARD);
    expect(store.isPristine()).toBe(true);
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
  });

  describe('dispatch', () => {
    it('pushes history and flips canUndo on a real change', () => {
      store.dispatch([{ type: 'rename-board', title: 'Renamed' }]);
      expect(store.board().title).toBe('Renamed');
      expect(store.canUndo()).toBe(true);
      expect(store.isPristine()).toBe(false);
    });

    it('does not create a history entry when every action is a no-op', () => {
      // 'signups' is already on the board, so add-card is a no-op.
      store.dispatch([{ type: 'add-card', cardId: 'signups' }]);
      expect(store.canUndo()).toBe(false);
      expect(store.board()).toBe(DEMO_BOARD);
      expect(store.isPristine()).toBe(true);
    });

    it('ignores an empty action list', () => {
      store.dispatch([]);
      expect(store.canUndo()).toBe(false);
    });
  });

  describe('undo / redo', () => {
    it('undo restores the exact previous board; redo restores the exact later one', () => {
      const original = store.board();
      store.dispatch([{ type: 'rename-board', title: 'Renamed' }]);
      const renamed = store.board();

      store.undo();
      expect(store.board()).toBe(original);
      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(true);

      store.redo();
      expect(store.board()).toBe(renamed);
      expect(store.canRedo()).toBe(false);
      expect(store.canUndo()).toBe(true);
    });

    it('undo/redo on an empty stack is a no-op', () => {
      store.undo();
      expect(store.board()).toBe(DEMO_BOARD);
      store.redo();
      expect(store.board()).toBe(DEMO_BOARD);
    });

    it('dispatching after an undo clears the redo stack', () => {
      store.dispatch([{ type: 'rename-board', title: 'A' }]);
      store.dispatch([{ type: 'rename-board', title: 'B' }]);
      store.undo();
      expect(store.canRedo()).toBe(true);

      store.dispatch([{ type: 'rename-board', title: 'C' }]);
      expect(store.canRedo()).toBe(false);
      expect(store.board().title).toBe('C');
    });
  });

  describe('reset', () => {
    it('restores DEMO_BOARD exactly and clears both stacks', () => {
      store.dispatch([{ type: 'rename-board', title: 'A' }]);
      store.dispatch([{ type: 'rename-board', title: 'B' }]);
      store.undo();

      store.reset();
      expect(store.board()).toBe(DEMO_BOARD);
      expect(store.isPristine()).toBe(true);
      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);
    });
  });

  describe('history cap', () => {
    it('stops growing undo depth beyond the 50-entry limit', () => {
      for (let i = 0; i < 60; i++) {
        store.dispatch([{ type: 'rename-board', title: `Title ${i}` }]);
      }
      let depth = 0;
      while (store.canUndo()) {
        store.undo();
        depth++;
      }
      expect(depth).toBe(50);
    });
  });

  describe('run', () => {
    it('runs a scripted command to completion and dispatches its plan', async () => {
      const known = commandById('show-signins')!;
      await store.run('show sign-ins on the sign-ups chart', {
        command: known,
        typeText: false,
      });

      expect(store.command().phase).toBe('done');
      expect(store.command().scripted).toBe(true);
      expect(store.command().reply).toBe(known.reply);
      expect(store.isPristine()).toBe(false);

      const signups = store
        .board()
        .rows!.flatMap((r) => r.cards ?? [])
        .find((c) => c.id === 'signups')!;
      const series = (signups.widget as { data: { series: { id: string; visible: boolean }[] } })
        .data.series;
      expect(series.find((s) => s.id === 'signins')!.visible).toBe(true);
    });

    it('ends at "unmatched" and makes no board change for an unrecognised free-form prompt', async () => {
      await store.run('banana kayak zeppelin submarine', { typeText: false });

      expect(store.command().phase).toBe('unmatched');
      expect(store.command().scripted).toBe(false);
      expect(store.board()).toBe(DEMO_BOARD);
      expect(store.isPristine()).toBe(true);
    });
  });
});
