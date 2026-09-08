import {
  buildChartData,
  buildChartOptions,
  donutSegments,
  formatCompact,
  formatValue,
  heroFigure,
  hiddenSeries,
  seriesColor,
  trend,
  visibleSeries,
} from './chart-options';
import type { IChartWidgetData, ISeriesDef } from '../model/board.model';
import type { ThemeTokens } from '../../theme/theme.service';

const tokens: ThemeTokens = {
  ink: '#111111',
  inkMuted: '#222222',
  inkFaint: '#333333',
  hairline: '#dddddd',
  card: '#ffffff',
  series: [
    '#slot1',
    '#slot2',
    '#slot3',
    '#slot4',
    '#slot5',
    '#slot6',
    '#slot7',
    '#slot8',
  ],
  dark: false,
};

function series(overrides: Partial<ISeriesDef>): ISeriesDef {
  return {
    id: 'series',
    label: 'Series',
    slot: 1,
    visible: true,
    values: [1, 2, 3],
    ...overrides,
  };
}

function chart(overrides: Partial<IChartWidgetData>): IChartWidgetData {
  return {
    kind: 'area',
    labels: ['a', 'b', 'c'],
    series: [series({})],
    ...overrides,
  };
}

describe('visibleSeries / hiddenSeries', () => {
  it('partitions series by their visible flag', () => {
    const data = chart({
      series: [
        series({ id: 's1', visible: true }),
        series({ id: 's2', visible: false }),
        series({ id: 's3', visible: true }),
      ],
    });
    expect(visibleSeries(data).map((s) => s.id)).toEqual(['s1', 's3']);
    expect(hiddenSeries(data).map((s) => s.id)).toEqual(['s2']);
  });
});

describe('seriesColor', () => {
  it('maps a 1-based slot to its palette token', () => {
    expect(seriesColor(1, tokens)).toBe('#slot1');
    expect(seriesColor(3, tokens)).toBe('#slot3');
    expect(seriesColor(8, tokens)).toBe('#slot8');
  });

  it('wraps around the palette length for a slot beyond it', () => {
    expect(seriesColor(9, tokens)).toBe('#slot1');
  });
});

describe('buildChartData', () => {
  it('colours a dataset by its SERIES SLOT, not its position among visible series', () => {
    // The first VISIBLE series has slot 3 — a hidden slot-1 series sits ahead
    // of it in the series array. If colour ever followed the visible-list
    // INDEX instead of the slot, this dataset would wrongly get the slot-1
    // token when a metric is toggled off, repainting the survivor.
    const data = chart({
      kind: 'area',
      series: [
        series({ id: 'hidden', slot: 1, visible: false }),
        series({ id: 'first-visible', slot: 3, visible: true, values: [1, 2, 3] }),
        series({ id: 'second-visible', slot: 5, visible: true, values: [4, 5, 6] }),
      ],
    });
    const result = buildChartData(data, tokens);
    expect(result.datasets).toHaveLength(2);
    expect((result.datasets[0] as unknown as { borderColor: string }).borderColor).toBe('#slot3');
    expect((result.datasets[0] as unknown as { borderColor: string }).borderColor).not.toBe('#slot1');
    expect((result.datasets[1] as unknown as { borderColor: string }).borderColor).toBe('#slot5');
  });

  it('colours a bar dataset by slot too', () => {
    const data = chart({
      kind: 'bar',
      series: [series({ id: 'only', slot: 4, visible: true, values: [1, 2] })],
    });
    const result = buildChartData(data, tokens);
    expect((result.datasets[0] as unknown as { backgroundColor: string }).backgroundColor).toBe('#slot4');
  });

  it('produces exactly one dataset for a donut, with a per-segment colour array', () => {
    const data = chart({
      kind: 'donut',
      labels: ['North', 'South', 'East'],
      series: [series({ id: 'only', slot: 1, visible: true, values: [10, 20, 30] })],
    });
    const result = buildChartData(data, tokens);
    expect(result.datasets).toHaveLength(1);
    const backgroundColor = (result.datasets[0] as unknown as { backgroundColor: string[] }).backgroundColor;
    expect(Array.isArray(backgroundColor)).toBe(true);
    expect(backgroundColor).toHaveLength(3);
    expect(backgroundColor).toEqual(['#slot1', '#slot2', '#slot3']);
  });

  it('excludes hidden series from a non-donut chart entirely', () => {
    const data = chart({
      series: [series({ id: 'shown', visible: true }), series({ id: 'hidden', visible: false })],
    });
    const result = buildChartData(data, tokens);
    expect(result.datasets).toHaveLength(1);
  });
});

describe('buildChartOptions', () => {
  it('never configures more than one y scale for a series chart', () => {
    const options = buildChartOptions(chart({ kind: 'area' }), tokens);
    const scaleKeys = Object.keys(options.scales ?? {});
    const yKeys = scaleKeys.filter((k) => k === 'y' || k.startsWith('y'));
    expect(yKeys.length).toBeLessThanOrEqual(1);
    expect(scaleKeys).toEqual(['x', 'y']);
  });

  it('sets no cartesian scales at all for a donut (which has none to overload)', () => {
    const options = buildChartOptions(chart({ kind: 'donut' }), tokens);
    expect(options.scales).toBeUndefined();
  });

  it('disables animation when reducedMotion is requested', () => {
    const options = buildChartOptions(chart({ kind: 'area' }), tokens, { reducedMotion: true });
    expect(options.animation).toBe(false);
  });
});

describe('trend', () => {
  it('is undefined with fewer than two points', () => {
    expect(trend([])).toBeUndefined();
    expect(trend([5])).toBeUndefined();
  });

  it('is undefined when the previous point is zero', () => {
    expect(trend([0, 5])).toBeUndefined();
  });

  it('reports an upward trend', () => {
    const result = trend([100, 110]);
    expect(result?.direction).toBe('up');
    expect(result?.text).toBe('+10.0%');
  });

  it('reports a downward trend', () => {
    const result = trend([100, 90]);
    expect(result?.direction).toBe('down');
    expect(result?.text).toBe('-10.0%');
  });

  it('reports flat for a change under half a percent', () => {
    const result = trend([100, 100.2]);
    expect(result?.direction).toBe('flat');
  });
});

describe('heroFigure', () => {
  it('returns the TOTAL for a donut', () => {
    const data = chart({
      kind: 'donut',
      labels: ['a', 'b', 'c'],
      series: [series({ label: 'Sources', visible: true, values: [10, 20, 30] })],
    });
    const result = heroFigure(data);
    expect(result?.value).toBe('60');
    expect(result?.label).toBe('Sources · 3 sources');
  });

  it('returns the LAST value for a non-donut chart', () => {
    const data = chart({
      kind: 'area',
      labels: ['Jan', 'Feb', 'Mar'],
      series: [series({ label: 'Growth', visible: true, values: [10, 20, 33] })],
    });
    const result = heroFigure(data);
    expect(result?.value).toBe('33');
    expect(result?.label).toBe('Growth · Mar');
  });

  it('is undefined when there is no visible series', () => {
    const data = chart({ series: [series({ visible: false })] });
    expect(heroFigure(data)).toBeUndefined();
  });

  it('is undefined when the first visible series has no values', () => {
    const data = chart({ series: [series({ visible: true, values: [] })] });
    expect(heroFigure(data)).toBeUndefined();
  });
});

describe('donutSegments', () => {
  it('shares the total to ~100% across segments', () => {
    const data = chart({
      kind: 'donut',
      labels: ['North', 'South', 'East', 'West'],
      series: [series({ visible: true, values: [10, 20, 30, 40] })],
    });
    const segments = donutSegments(data);
    expect(segments).toHaveLength(4);
    expect(segments.map((s) => s.share)).toEqual(['10%', '20%', '30%', '40%']);
    const total = segments.reduce((sum, s) => sum + Number.parseFloat(s.share), 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('handles a zero total without dividing by zero', () => {
    const data = chart({
      kind: 'donut',
      labels: ['a', 'b'],
      series: [series({ visible: true, values: [0, 0] })],
    });
    const segments = donutSegments(data);
    expect(segments.every((s) => s.share === '0%')).toBe(true);
  });
});

describe('formatCompact / formatValue', () => {
  it('formats sub-1000 numbers plainly', () => {
    expect(formatCompact(999)).toBe('999');
    expect(formatValue(999)).toBe('999');
  });

  it('formats 1000-and-above numbers compactly', () => {
    expect(formatCompact(1000)).toBe('1K');
    expect(formatCompact(12345)).toBe('12.3K');
  });

  it('formatValue never compacts, even for large numbers', () => {
    expect(formatValue(12345)).toBe('12,345');
  });
});
