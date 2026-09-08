import { Injectable, computed, signal } from '@angular/core';

import { IBoardDef, isChartWidget } from '../model/board.model';
import { DEMO_BOARD } from '../model/demo-board';
import { DashboardAction, describeAction } from './dashboard-actions';
import { KnownCommand, matchCommand } from './command-catalog';
import { applyActions } from './dashboard-reducer';

/** Where a command currently is in the `command → actions → mutation` pipeline. */
export type CommandPhase = 'idle' | 'typing' | 'planning' | 'applying' | 'done' | 'unmatched';

export interface CommandRun {
  readonly phase: CommandPhase;
  readonly prompt: string;
  /** Present from 'planning' onwards: the structured plan about to be applied. */
  readonly steps: readonly string[];
  readonly reply?: string;
  /** True when the plan came from the scripted catalogue rather than a model. */
  readonly scripted: boolean;
}

const IDLE: CommandRun = { phase: 'idle', prompt: '', steps: [], scripted: false };

/** How many boards back Undo can reach. Deep enough to explore, not a memory leak. */
const HISTORY_LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly past = signal<readonly IBoardDef[]>([]);
  private readonly future = signal<readonly IBoardDef[]>([]);
  private readonly present = signal<IBoardDef>(DEMO_BOARD);

  /** Card ids added by the most recent mutation, for the arrival highlight. */
  private readonly arrived = signal<readonly string[]>([]);

  readonly board = this.present.asReadonly();
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);
  readonly isPristine = computed(() => this.present() === DEMO_BOARD);
  readonly arrivedCards = this.arrived.asReadonly();

  readonly command = signal<CommandRun>(IDLE);

  /**
   * What a screen reader is told about the board.
   *
   * A live region has to be in the DOM BEFORE its text changes, or the change
   * is not announced — so this is a plain string that a permanently-rendered
   * region reads, rather than a message attached to a panel that appears at the
   * same moment it would need to be read.
   */
  readonly announcement = signal('');

  /** Every card id currently on the board — used to answer "is it already here?". */
  readonly cardIds = computed(
    () => new Set((this.present().rows ?? []).flatMap((r) => (r.cards ?? []).map((c) => c.id))),
  );

  /**
   * Apply a plan and push the previous board onto the undo stack.
   *
   * A plan that changes nothing (every action a no-op — adding a card that is
   * already there, hiding a series that is already hidden) does NOT create a
   * history entry, so Undo never leaves the visitor pressing it twice for one
   * visible change.
   */
  dispatch(actions: readonly DashboardAction[]): void {
    if (!actions.length) return;
    const before = this.present();
    const after = applyActions(before, actions);
    if (after === before || boardsEqual(before, after)) return;

    this.past.update((p) => [...p, before].slice(-HISTORY_LIMIT));
    this.future.set([]);
    this.present.set(after);
    this.arrived.set(
      actions.filter((a) => a.type === 'add-card').map((a) => a.cardId),
    );
    this.announce(summarise(actions));
  }

  undo(): void {
    const past = this.past();
    if (!past.length) return;
    const previous = past[past.length - 1];
    this.past.set(past.slice(0, -1));
    this.future.update((f) => [this.present(), ...f]);
    this.present.set(previous);
    this.arrived.set([]);
    this.announce('Undone.');
  }

  redo(): void {
    const future = this.future();
    if (!future.length) return;
    this.past.update((p) => [...p, this.present()].slice(-HISTORY_LIMIT));
    this.present.set(future[0]);
    this.future.set(future.slice(1));
    this.announce('Redone.');
  }

  /** Back to the canonical demo board, history cleared. The safety net. */
  reset(): void {
    this.past.set([]);
    this.future.set([]);
    this.present.set(DEMO_BOARD);
    this.arrived.set([]);
    this.command.set(IDLE);
    this.announce('Board reset to the original demo.');
  }

  clearArrived(): void {
    if (this.arrived().length) this.arrived.set([]);
  }

  // --- the command pipeline ------------------------------------------------

  /**
   * Run a prompt through `command → structured actions → board mutation`.
   *
   * `typeText` animates the prompt into the input first when the caller is a
   * suggestion chip, so a click looks like someone asked for it.
   */
  async run(
    prompt: string,
    options: { readonly command?: KnownCommand; readonly typeText?: boolean } = {},
  ): Promise<void> {
    const known = options.command ?? matchCommand(prompt);

    if (options.typeText) {
      await this.typeOut(prompt);
    } else {
      this.command.set({ ...IDLE, phase: 'typing', prompt, scripted: !!known });
    }

    if (!known) {
      this.command.set({
        phase: 'unmatched',
        prompt,
        steps: [],
        scripted: false,
      });
      this.announce(
        'Dashboardius understood the words, not the request. Free-form prompts are not wired up on this demo.',
      );
      return;
    }

    const actions = known.plan(this.present());
    this.command.set({
      phase: 'planning',
      prompt,
      steps: actions.map(describeAction),
      scripted: true,
    });
    await pause(520);

    this.command.update((c) => ({ ...c, phase: 'applying' }));
    await pause(260);
    this.dispatch(actions);

    this.command.set({
      phase: 'done',
      prompt,
      steps: actions.map(describeAction),
      reply: known.reply,
      scripted: true,
    });
    this.announce(`${known.reply} Scripted demo; no model was called.`);
  }

  dismissCommand(): void {
    this.command.set(IDLE);
  }

  /**
   * Re-announce even when the text is unchanged: running the same command twice
   * should be audible twice, and an identical string would not re-trigger the
   * live region on its own.
   */
  private announce(message: string): void {
    if (this.announcement() === message) this.announcement.set('');
    queueMicrotask(() => this.announcement.set(message));
  }

  private async typeOut(text: string): Promise<void> {
    this.command.set({ phase: 'typing', prompt: '', steps: [], scripted: true });
    // One frame budget per character, floored so a long suggestion never drags.
    const step = Math.max(12, Math.min(34, 620 / text.length));
    for (let i = 1; i <= text.length; i++) {
      this.command.update((c) => ({ ...c, prompt: text.slice(0, i) }));
      await pause(step);
    }
    await pause(140);
  }
}

/** A one-line description of what a plan did, for the live region. */
function summarise(actions: readonly DashboardAction[]): string {
  if (actions.length === 1) return `${describeAction(actions[0])} applied.`;
  return `${actions.length} changes applied to the board.`;
}

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Structural comparison limited to what an action can change. Cheaper and more
 * honest than JSON.stringify: it says "nothing a visitor could see changed",
 * which is exactly the question the undo stack is asking.
 */
function boardsEqual(a: IBoardDef, b: IBoardDef): boolean {
  if (a.title !== b.title) return false;
  const rowsA = a.rows ?? [];
  const rowsB = b.rows ?? [];
  if (rowsA.length !== rowsB.length) return false;
  for (let i = 0; i < rowsA.length; i++) {
    const ca = rowsA[i].cards ?? [];
    const cb = rowsB[i].cards ?? [];
    if (ca.length !== cb.length) return false;
    for (let j = 0; j < ca.length; j++) {
      if (ca[j].id !== cb[j].id || ca[j].cols !== cb[j].cols) return false;
      const wa = ca[j].widget;
      const wb = cb[j].widget;
      if (isChartWidget(wa) && isChartWidget(wb)) {
        if (wa.data.kind !== wb.data.kind) return false;
        for (let k = 0; k < wa.data.series.length; k++) {
          if (wa.data.series[k].visible !== wb.data.series[k].visible) return false;
        }
      }
    }
  }
  return true;
}
