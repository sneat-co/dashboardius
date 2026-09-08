import { CellDisplay, IRecordsetColumn, RecordsetValue } from '../../model/board.model';

/**
 * One renderer for a recordset cell, shared by all three grid engines.
 *
 * The point of a switchable engine is that the CHOICE of engine is a
 * preference, not a change of meaning: a negative balance has to be the same
 * red in Tabulator, in AG Grid and in the plain table, or the switch stops
 * being a rendering choice and starts being a data change. So every engine
 * calls this, and none of them formats anything itself.
 *
 * Returns HTML because two of the three engines take HTML and nothing else.
 * Every interpolated value goes through `escapeHtml` first — the demo data is
 * ours today, but a grid that will one day render a real query result is the
 * wrong place to learn that lesson.
 */

export interface CellTone {
  /** Extra class applied to the cell element by every engine. */
  readonly cellClass?: string;
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const NUMBER_FMT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

const amountFormatter = (currency: string): Intl.NumberFormat =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

const GENDERS: Record<string, { emoji: string; label: string }> = {
  f: { emoji: '♀', label: 'Female' },
  female: { emoji: '♀', label: 'Female' },
  m: { emoji: '♂', label: 'Male' },
  male: { emoji: '♂', label: 'Male' },
  x: { emoji: '⚧', label: 'Another gender' },
  other: { emoji: '⚧', label: 'Another gender' },
  '': { emoji: '·', label: 'Not stated' },
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The tone of a cell — the only place a value turns into a colour.
 *
 * Only `amount` carries a tone, and only for the two states a balance actually
 * has opinions about: below zero, and uncomfortably close to it. Colour never
 * carries this alone; the number keeps its minus sign and its currency, and the
 * tone classes also set a text colour that passes contrast on their own tint.
 */
export function cellTone(value: RecordsetValue, column: IRecordsetColumn): CellTone {
  if (column.display !== 'amount' || typeof value !== 'number') return {};
  if (value < 0) return { cellClass: 'db-cell-critical' };
  if (column.warnBelow !== undefined && value < column.warnBelow) {
    return { cellClass: 'db-cell-warning' };
  }
  return {};
}

/** Plain-text form of a cell — for the accessible table, exports and titles. */
export function cellText(value: RecordsetValue, column: IRecordsetColumn): string {
  if (value === null || value === undefined) return '—';
  switch (column.display) {
    case 'amount':
      return amountFormatter(column.currency ?? 'EUR').format(Number(value));
    case 'number':
      return NUMBER_FMT.format(Number(value));
    case 'progress':
      return `${NUMBER_FMT.format(Number(value))} of ${column.max ?? 100}`;
    case 'date':
      return formatDate(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'gender':
      return genderOf(value).label;
    default:
      return String(value);
  }
}

export function cellHtml(value: RecordsetValue, column: IRecordsetColumn): string {
  if (value === null || value === undefined) {
    return '<span class="db-cell-empty">—</span>';
  }

  switch (column.display) {
    case 'amount': {
      const n = Number(value);
      const formatted = escapeHtml(amountFormatter(column.currency ?? 'EUR').format(n));
      const sign = n < 0 ? '<span class="db-cell-sign" aria-hidden="true">▼</span>' : '';
      return `<span class="db-cell-amount">${sign}${formatted}</span>`;
    }

    case 'number':
      return `<span class="db-cell-number">${escapeHtml(NUMBER_FMT.format(Number(value)))}</span>`;

    case 'progress': {
      const max = column.max ?? 100;
      const n = Math.max(0, Math.min(max, Number(value)));
      const pct = max ? (n / max) * 100 : 0;
      // A bar plus its number: the bar is for scanning the column, the number
      // is for reading one row, and neither is the only way to get the value.
      return [
        '<span class="db-cell-progress">',
        `<span class="db-cell-progress-track"><span class="db-cell-progress-fill" style="width:${pct.toFixed(1)}%"></span></span>`,
        `<span class="db-cell-progress-value">${escapeHtml(Math.round(pct))}%</span>`,
        '</span>',
      ].join('');
    }

    case 'date':
      return `<span class="db-cell-date">${escapeHtml(formatDate(value))}</span>`;

    case 'boolean': {
      const on = Boolean(value);
      return [
        `<span class="db-cell-bool ${on ? 'is-on' : 'is-off'}">`,
        `<span aria-hidden="true">${on ? '●' : '○'}</span>`,
        `<span>${on ? 'Yes' : 'No'}</span>`,
        '</span>',
      ].join('');
    }

    case 'gender': {
      const g = genderOf(value);
      // The glyph is decorative; the word next to it is what a screen reader
      // reads, so identity is never left to a symbol.
      return [
        '<span class="db-cell-gender">',
        `<span class="db-cell-gender-glyph" aria-hidden="true">${escapeHtml(g.emoji)}</span>`,
        `<span class="db-cell-gender-label">${escapeHtml(g.label)}</span>`,
        '</span>',
      ].join('');
    }

    default:
      return escapeHtml(value);
  }
}

/** Right-align anything a reader compares by magnitude. */
export function isNumericDisplay(display: CellDisplay): boolean {
  return display === 'number' || display === 'amount';
}

export function columnTitle(column: IRecordsetColumn): string {
  return column.title ?? column.name;
}

function genderOf(value: RecordsetValue): { emoji: string; label: string } {
  const key = String(value ?? '').toLowerCase();
  return GENDERS[key] ?? GENDERS[''];
}

function formatDate(value: RecordsetValue): string {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : DATE_FMT.format(date);
}
