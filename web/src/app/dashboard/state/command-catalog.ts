import { IBoardDef } from '../model/board.model';
import { DashboardAction } from './dashboard-actions';

/**
 * The known commands behind the suggestion chips.
 *
 * These are SCRIPTED, and the UI says so out loud. Clicking a chip does not
 * call a model — it looks the command up here and runs the action list through
 * exactly the same execution path a model-generated plan will use. That is the
 * honest version of an AI demo: the interaction is real, the plan is
 * pre-written, and nothing on screen claims a model produced it.
 *
 * A plan is a function of the CURRENT board rather than a constant, because a
 * good plan re-balances what is already there — "add a revenue chart" narrows
 * its neighbours instead of leaving a ragged half-empty row.
 */
export interface KnownCommand {
  readonly id: string;
  /** The text typed into the prompt when the chip is clicked. */
  readonly text: string;
  /** Keywords used to recognise a free-form prompt as this command. */
  readonly keywords: readonly string[];
  /** One line shown once the plan has run. */
  readonly reply: string;
  plan(board: IBoardDef): readonly DashboardAction[];
}

export const KNOWN_COMMANDS: readonly KnownCommand[] = [
  {
    id: 'show-signins',
    text: 'Show sign-ins on the sign-ups chart',
    keywords: ['show', 'sign-ins', 'signins', 'sign', 'ins', 'chart'],
    reply: 'Sign-ins added as a second series. Same axis — they are the same kind of number.',
    plan: () => [
      { type: 'set-series-visible', cardId: 'signups', seriesId: 'signins', visible: true },
    ],
  },
  {
    id: 'add-revenue',
    text: 'Add a revenue chart',
    keywords: ['add', 'revenue', 'money', 'mrr', 'chart', 'sales'],
    reply: 'Revenue is in. The neighbours made room.',
    plan: () => [
      { type: 'resize-card', cardId: 'signups', cols: 5 },
      { type: 'resize-card', cardId: 'pulse', cols: 3 },
      { type: 'add-card', cardId: 'revenue', rowId: 'row-1', index: 1 },
    ],
  },
  {
    id: 'compare-returning',
    text: 'Compare sign-ups with returning users',
    keywords: ['compare', 'returning', 'retention', 'users', 'metric', 'another'],
    reply: 'Returning users layered on. Note the gap closing — that is the interesting part.',
    plan: () => [
      { type: 'set-series-visible', cardId: 'signups', seriesId: 'returning', visible: true },
    ],
  },
  {
    id: 'add-datatug-card',
    text: 'Add a DataTug card',
    keywords: ['add', 'datatug', 'query', 'sql', 'card', 'source'],
    reply: 'A second DataTug query, this one pointed at the slow ones. It landed at the foot of the board.',
    // Placed on the bottom row rather than beside the members grid: squeezing a
    // seven-column grid into a third of the width to make room would demo the
    // command by ruining the card it was demonstrating.
    plan: () => [
      { type: 'resize-card', cardId: 'ecosystem', cols: 8 },
      { type: 'add-card', cardId: 'orders', rowId: 'row-4', index: 1 },
    ],
  },
  {
    id: 'exec-friendly',
    text: 'Make this executive-friendly',
    keywords: ['executive', 'exec', 'board', 'simple', 'friendly', 'summary', 'ceo'],
    reply: 'Two engineering cards stood down and a summary took the top. Undo brings them back.',
    plan: () => [
      { type: 'add-card', cardId: 'exec', rowId: 'row-1', index: 0 },
      { type: 'remove-card', cardId: 'members' },
      { type: 'remove-card', cardId: 'meetings' },
      { type: 'resize-card', cardId: 'signins', cols: 12 },
      { type: 'resize-card', cardId: 'story', cols: 6 },
      { type: 'resize-card', cardId: 'ecosystem', cols: 6 },
      { type: 'rename-board', title: 'Q3 review' },
    ],
  },
  {
    id: 'surprise',
    text: 'Surprise me',
    keywords: ['surprise', 'anything', 'random', 'fun', 'whatever'],
    reply: 'A correlation nobody asked for. You can remove it; the coffee stays.',
    plan: () => [
      { type: 'resize-card', cardId: 'ecosystem', cols: 6 },
      { type: 'add-card', cardId: 'coffee', rowId: 'row-4', index: 1 },
      { type: 'rename-board', title: 'Product pulse (and caffeine)' },
    ],
  },
];

export const commandById = (id: string): KnownCommand | undefined =>
  KNOWN_COMMANDS.find((c) => c.id === id);

/**
 * Recognise a typed prompt as one of the known commands.
 *
 * Deliberately conservative: a prompt only matches when it shares at least two
 * keywords with a command, or is a near-exact restatement of it. Guessing
 * loosely would mean answering a question the visitor did not ask, which is
 * worse than saying plainly that free-form prompts are not wired up yet.
 */
export function matchCommand(prompt: string): KnownCommand | undefined {
  const normalised = prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const words = new Set(normalised.split(/\s+/).filter((w) => w.length > 2));
  if (!words.size) return undefined;

  let best: { command: KnownCommand; score: number } | undefined;
  for (const command of KNOWN_COMMANDS) {
    if (normalised.trim() === command.text.toLowerCase()) return command;
    const score = command.keywords.reduce((n, k) => n + (words.has(k) ? 1 : 0), 0);
    if (score >= 2 && (!best || score > best.score)) best = { command, score };
  }
  return best?.command;
}
