import {
  cellHtml,
  cellText,
  cellTone,
  columnTitle,
  escapeHtml,
  isNumericDisplay,
} from './cell-format';
import type { CellDisplay, IRecordsetColumn, RecordsetValue } from '../../model/board.model';

/** `RecordsetValue` has no `undefined` member; the functions handle it at
 * runtime anyway (a recordset row can genuinely be missing a value), so tests
 * for that path cast through `unknown` rather than widening the real type. */
const UNDEFINED = undefined as unknown as RecordsetValue;

function column(display: CellDisplay, overrides: Partial<IRecordsetColumn> = {}): IRecordsetColumn {
  return {
    name: 'field',
    dbType: 'text',
    display,
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('escapes every HTML-significant character', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('renders null/undefined as an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('cellTone', () => {
  it('returns the critical class for a negative amount', () => {
    expect(cellTone(-5, column('amount'))).toEqual({ cellClass: 'db-cell-critical' });
  });

  it('returns the warning class for a value at or above zero but below warnBelow', () => {
    expect(cellTone(10, column('amount', { warnBelow: 25 }))).toEqual({
      cellClass: 'db-cell-warning',
    });
    expect(cellTone(0, column('amount', { warnBelow: 25 }))).toEqual({
      cellClass: 'db-cell-warning',
    });
  });

  it('returns nothing once the value reaches warnBelow', () => {
    expect(cellTone(25, column('amount', { warnBelow: 25 }))).toEqual({});
    expect(cellTone(30, column('amount', { warnBelow: 25 }))).toEqual({});
  });

  it('never warns when warnBelow is undefined', () => {
    expect(cellTone(0, column('amount'))).toEqual({});
    expect(cellTone(10, column('amount'))).toEqual({});
  });

  it('never tones a non-amount column, even when negative', () => {
    expect(cellTone(-5, column('number'))).toEqual({});
    expect(cellTone(-5, column('text'))).toEqual({});
  });

  it('never tones a non-numeric value', () => {
    expect(cellTone('n/a' as unknown as number, column('amount'))).toEqual({});
  });
});

describe('cellText', () => {
  it('renders null/undefined as an em dash', () => {
    expect(cellText(null, column('text'))).toBe('—');
    expect(cellText(UNDEFINED, column('number'))).toBe('—');
  });

  it('formats text as-is', () => {
    expect(cellText('hello', column('text'))).toBe('hello');
  });

  it('formats number with en-GB grouping', () => {
    expect(cellText(1234.567, column('number'))).toBe('1,234.6');
  });

  it('formats amount as en-GB currency, defaulting to EUR', () => {
    expect(cellText(-32.75, column('amount', { currency: 'EUR' }))).toBe('-€32.75');
    expect(cellText(148.2, column('amount', { currency: 'EUR' }))).toBe('€148.20');
    expect(cellText(148.2, column('amount'))).toBe('€148.20');
  });

  it('formats progress as "value of max"', () => {
    expect(cellText(74, column('progress', { max: 100 }))).toBe('74 of 100');
    expect(cellText(74, column('progress'))).toBe('74 of 100');
  });

  it('formats date in en-GB day month year', () => {
    expect(cellText('2026-01-14', column('date'))).toBe('14 Jan 2026');
  });

  it('falls back to the raw string for an unparsable date', () => {
    expect(cellText('not-a-date', column('date'))).toBe('not-a-date');
  });

  it('formats boolean as Yes/No', () => {
    expect(cellText(true, column('boolean'))).toBe('Yes');
    expect(cellText(false, column('boolean'))).toBe('No');
  });

  it('formats gender by known code, falling back to "Not stated"', () => {
    expect(cellText('f', column('gender'))).toBe('Female');
    expect(cellText('m', column('gender'))).toBe('Male');
    expect(cellText('x', column('gender'))).toBe('Another gender');
    expect(cellText('unknown-code', column('gender'))).toBe('Not stated');
  });
});

describe('cellHtml', () => {
  it('renders null/undefined as an empty-state span', () => {
    expect(cellHtml(null, column('text'))).toBe('<span class="db-cell-empty">—</span>');
  });

  it('escapes injected markup instead of passing it through raw', () => {
    const html = cellHtml('<img src=x onerror=alert(1)>', column('text'));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('marks a negative amount with the sign glyph and includes the formatted value', () => {
    const html = cellHtml(-32.75, column('amount', { currency: 'EUR' }));
    expect(html).toContain('db-cell-sign');
    expect(html).toContain('-€32.75');
  });

  it('omits the sign glyph for a non-negative amount', () => {
    const html = cellHtml(148.2, column('amount', { currency: 'EUR' }));
    expect(html).not.toContain('db-cell-sign');
  });

  it('clamps a progress value above max down to 100%', () => {
    const html = cellHtml(150, column('progress', { max: 100 }));
    expect(html).toContain('width:100.0%');
    expect(html).toContain('>100%<');
  });

  it('clamps a progress value below zero up to 0%', () => {
    const html = cellHtml(-20, column('progress'));
    expect(html).toContain('width:0.0%');
    expect(html).toContain('>0%<');
  });

  it('renders boolean state with an on/off class', () => {
    expect(cellHtml(true, column('boolean'))).toContain('is-on');
    expect(cellHtml(false, column('boolean'))).toContain('is-off');
  });

  it('renders gender with an escaped emoji and label', () => {
    const html = cellHtml('f', column('gender'));
    expect(html).toContain('Female');
  });
});

describe('isNumericDisplay', () => {
  it('is true only for number and amount', () => {
    expect(isNumericDisplay('number')).toBe(true);
    expect(isNumericDisplay('amount')).toBe(true);
  });

  it('is false for every other display kind', () => {
    expect(isNumericDisplay('text')).toBe(false);
    expect(isNumericDisplay('progress')).toBe(false);
    expect(isNumericDisplay('date')).toBe(false);
    expect(isNumericDisplay('boolean')).toBe(false);
    expect(isNumericDisplay('gender')).toBe(false);
  });
});

describe('columnTitle', () => {
  it('prefers the explicit title', () => {
    expect(columnTitle(column('text', { name: 'field', title: 'Field label' }))).toBe(
      'Field label',
    );
  });

  it('falls back to the column name', () => {
    expect(columnTitle(column('text', { name: 'field' }))).toBe('field');
  });
});
