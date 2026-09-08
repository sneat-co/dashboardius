import { KNOWN_COMMANDS, commandById, matchCommand } from './command-catalog';
import { applyActions } from './dashboard-reducer';
import { DEMO_BOARD, OFF_BOARD_CARDS } from '../model/demo-board';

describe('matchCommand', () => {
  it('matches an exact restatement of a command text', () => {
    for (const command of KNOWN_COMMANDS) {
      expect(matchCommand(command.text)?.id).toBe(command.id);
    }
  });

  it('is case- and punctuation-insensitive for an exact restatement', () => {
    const command = KNOWN_COMMANDS.find((c) => c.id === 'add-revenue')!;
    expect(matchCommand(command.text.toUpperCase() + '!!!')?.id).toBe('add-revenue');
    expect(matchCommand(`  ${command.text.toLowerCase()}  `)?.id).toBe('add-revenue');
  });

  it('matches a free-form prompt sharing at least two keywords', () => {
    expect(matchCommand('please add a revenue chart for me')?.id).toBe('add-revenue');
    expect(matchCommand('can we add a datatug sql card')?.id).toBe('add-datatug-card');
  });

  it('returns undefined when fewer than two keywords are shared', () => {
    // "show" alone only scores one point against 'show-signins' and nothing
    // else — not enough to guess what the visitor meant.
    expect(matchCommand('show')).toBeUndefined();
    expect(matchCommand('please show me something nice today')).toBeUndefined();
  });

  it('returns undefined for an empty prompt', () => {
    expect(matchCommand('')).toBeUndefined();
  });

  it('returns undefined for a punctuation-only prompt', () => {
    expect(matchCommand('!!! ??? ...')).toBeUndefined();
  });

  it('returns undefined for a prompt matching no command at all', () => {
    expect(matchCommand('banana kayak zeppelin submarine')).toBeUndefined();
  });
});

describe('commandById', () => {
  it('finds a known command by id', () => {
    expect(commandById('surprise')?.text).toBe('Surprise me');
  });

  it('returns undefined for an unknown id', () => {
    expect(commandById('no-such-command')).toBeUndefined();
  });
});

describe('KNOWN_COMMANDS plans', () => {
  it('every command produces a non-empty plan against the demo board', () => {
    for (const command of KNOWN_COMMANDS) {
      const plan = command.plan(DEMO_BOARD);
      expect(plan.length).toBeGreaterThan(0);
    }
  });

  it('every command plan actually changes the board — a chip is never a no-op', () => {
    for (const command of KNOWN_COMMANDS) {
      const plan = command.plan(DEMO_BOARD);
      const result = applyActions(DEMO_BOARD, plan);
      expect(JSON.stringify(result)).not.toBe(JSON.stringify(DEMO_BOARD));
    }
  });

  /**
   * The guard that caught the original bug, generalised.
   *
   * Three plans once targeted a card id that did not exist ('datatug' rather
   * than 'members'), and the reducer no-ops silently on an unknown id — so the
   * commands ran, reported success and did roughly nothing. Asserting the exact
   * resulting widths would re-break every time the layout is tuned; asserting
   * that every action addresses something REAL is the property that actually
   * matters, and it cannot rot.
   */
  it('every action in every plan targets a card and a row that exist', () => {
    const onBoard = new Set(
      (DEMO_BOARD.rows ?? []).flatMap((row) => (row.cards ?? []).map((c) => c.id)),
    );
    const knownRows = new Set((DEMO_BOARD.rows ?? []).map((row) => row.id));

    for (const command of KNOWN_COMMANDS) {
      for (const action of command.plan(DEMO_BOARD)) {
        if (action.type === 'rename-board') continue;

        const reachable =
          action.type === 'add-card'
            ? action.cardId in OFF_BOARD_CARDS
            : onBoard.has(action.cardId);
        expect(reachable, `${command.id} → ${action.type} ${action.cardId}`).toBe(true);

        if (action.type === 'add-card' && action.rowId) {
          expect(knownRows.has(action.rowId), `${command.id} → row ${action.rowId}`).toBe(true);
        }
      }
    }
  });

  it('"add-datatug-card" puts a second query card on the board, tidily', () => {
    const plan = commandById('add-datatug-card')!.plan(DEMO_BOARD);
    const result = applyActions(DEMO_BOARD, plan);

    expect(result.rows!.some((row) => row.cards!.some((c) => c.id === 'orders'))).toBe(true);
    // ...without leaving a row that overflows its twelve columns.
    for (const row of result.rows!) {
      const width = row.cards!.reduce((sum, c) => sum + (c.cols ?? 6), 0);
      expect(width, `row ${row.id}`).toBeLessThanOrEqual(12);
    }
  });

  it('"exec-friendly" actually retires the members card, not just meetings', () => {
    const plan = commandById('exec-friendly')!.plan(DEMO_BOARD);
    const result = applyActions(DEMO_BOARD, plan);
    expect(result.rows!.some((row) => row.cards!.some((c) => c.id === 'members'))).toBe(false);
    expect(result.rows!.some((row) => row.cards!.some((c) => c.id === 'meetings'))).toBe(false);
  });

  it('"surprise" adds the coffee card and renames the board', () => {
    const plan = commandById('surprise')!.plan(DEMO_BOARD);
    const result = applyActions(DEMO_BOARD, plan);

    expect(result.rows!.some((row) => row.cards!.some((c) => c.id === 'coffee'))).toBe(true);
    expect(result.title).not.toBe(DEMO_BOARD.title);
    for (const row of result.rows!) {
      const width = row.cards!.reduce((sum, c) => sum + (c.cols ?? 6), 0);
      expect(width, `row ${row.id}`).toBeLessThanOrEqual(12);
    }
  });
});
