import type { ChartData, ChartOptions } from 'chart.js';

import { IChartWidgetData, ISeriesDef } from '../model/board.model';
import { ThemeTokens } from '../../theme/theme.service';

/**
 * Chart.js configuration for a Dashboardius chart card.
 *
 * Pure functions of (widget data, theme tokens) so the whole chart contract is
 * testable without a canvas — which matters, because most of what makes these
 * charts readable is configuration, not drawing code:
 *
 *   * ONE y axis, always. Two scales on one plot invent a correlation that is
 *     not in the data, so a series whose magnitude does not fit belongs on its
 *     own card instead.
 *   * Colour follows the SERIES SLOT, never the series' position in the visible
 *     list — so showing or hiding a metric never repaints the others.
 *   * Thin marks: 2px lines, no point markers until hover, hairline grid one
 *     shade off the surface, no dashes.
 *   * Bars get a 4px rounded top anchored to the baseline and a real gap
 *     between them, rather than a stroke drawn around each bar.
 *   * No value printed on every point — the axis and the tooltip carry them,
 *     and the card's table view carries them for anyone who cannot hover.
 */

export const visibleSeries = (data: IChartWidgetData): readonly ISeriesDef[] =>
  data.series.filter((s) => s.visible);

export const hiddenSeries = (data: IChartWidgetData): readonly ISeriesDef[] =>
  data.series.filter((s) => !s.visible);

/** Slot 1-8 → the validated categorical palette step for the current scheme. */
export const seriesColor = (slot: number, tokens: ThemeTokens): string =>
  tokens.series[(slot - 1) % tokens.series.length];

/** Area fills stay well below the mark so overlapping series remain readable. */
const AREA_ALPHA = 0.14;

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildChartData(data: IChartWidgetData, tokens: ThemeTokens): ChartData {
  const shown = visibleSeries(data);

  if (data.kind === 'donut') {
    // Part-to-whole: the SEGMENTS are the categories, so they take the
    // categorical palette in order and the gap between them is card surface
    // showing through, not a stroke drawn around each arc.
    const series = shown[0] ?? data.series[0];
    return {
      labels: [...data.labels],
      datasets: [
        {
          label: series?.label ?? '',
          data: [...(series?.values ?? [])],
          backgroundColor: data.labels.map((_, i) => seriesColor(i + 1, tokens)),
          borderColor: tokens.card,
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }

  return {
    labels: [...data.labels],
    datasets: shown.map((s) => {
      const color = seriesColor(s.slot, tokens);
      return data.kind === 'bar'
        ? {
            label: s.label,
            data: [...s.values],
            backgroundColor: color,
            hoverBackgroundColor: color,
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false as const,
            // The gap between bars is surface showing through, not a border
            // drawn around each bar.
            categoryPercentage: 0.72,
            barPercentage: shown.length > 1 ? 0.86 : 0.72,
            maxBarThickness: 46,
          }
        : {
            label: s.label,
            data: [...s.values],
            borderColor: color,
            backgroundColor: withAlpha(color, AREA_ALPHA),
            fill: shown.length === 1 ? 'origin' : false,
            borderWidth: 2,
            // No smoothing: a spline draws values that were never measured.
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: tokens.card,
            pointBackgroundColor: color,
            pointHitRadius: 24,
          };
    }),
  };
}

export function buildChartOptions(
  data: IChartWidgetData,
  tokens: ThemeTokens,
  options: { readonly reducedMotion: boolean } = { reducedMotion: false },
): ChartOptions {
  const tickFont = { size: 11, family: 'inherit' as const };

  if (data.kind === 'donut') {
    const total = (visibleSeries(data)[0]?.values ?? []).reduce((a, b) => a + b, 0);
    const donutOptions: ChartOptions<'doughnut'> = {
      maintainAspectRatio: false,
      responsive: true,
      animation: options.reducedMotion ? false : { duration: 380, easing: 'easeOutCubic' },
      // A ring is generous with its hit area already; no need for an index mode.
      // `cutout` is doughnut-specific, so it is set on the doughnut-typed view
      // of the options rather than the union all chart kinds share.
      cutout: '62%',
      layout: { padding: 6 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tokens.dark ? '#0d0f12' : '#15181d',
          titleColor: '#ffffff',
          bodyColor: '#e7e9ec',
          padding: 10,
          cornerRadius: 8,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4,
          usePointStyle: true,
          titleFont: { size: 11, weight: 600 },
          bodyFont: { size: 12 },
          callbacks: {
            label: (ctx) => {
              const value = Number(ctx.parsed);
              const share = total ? ((value / total) * 100).toFixed(1) : '0';
              return ` ${formatValue(value)} · ${share}%`;
            },
          },
        },
      },
    };
    return donutOptions as ChartOptions;
  }

  return {
    maintainAspectRatio: false,
    responsive: true,
    animation: options.reducedMotion ? false : { duration: 380, easing: 'easeOutCubic' },
    // Nearest point in the x direction, with the whole column live: a reader
    // should not have to land on an 8px dot dead-centre.
    interaction: { mode: 'index', intersect: false, axis: 'x' },
    layout: { padding: { top: 4, right: 6, bottom: 0, left: 0 } },
    scales: {
      x: {
        grid: { display: false },
        border: { color: tokens.hairline },
        ticks: {
          color: tokens.inkFaint,
          font: tickFont,
          maxRotation: 0,
          autoSkipPadding: 12,
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: {
          color: tokens.hairline,
          // Solid hairlines. A dashed grid reads as a threshold or a
          // projection when it is neither.
          lineWidth: 1,
          drawTicks: false,
        },
        ticks: {
          color: tokens.inkFaint,
          font: tickFont,
          maxTicksLimit: 5,
          padding: 8,
          callback: (value) => formatCompact(Number(value)) + (data.unit ?? ''),
        },
      },
    },
    plugins: {
      // The card draws its own legend, so identity is never carried by colour
      // alone and the legend can double as the metric picker.
      legend: { display: false },
      tooltip: {
        backgroundColor: tokens.dark ? '#0d0f12' : '#15181d',
        titleColor: '#ffffff',
        bodyColor: '#e7e9ec',
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
        usePointStyle: true,
        titleFont: { size: 11, weight: 600 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx) =>
            ` ${ctx.dataset.label}: ${formatValue(Number(ctx.parsed.y))}${data.unit ?? ''}`,
        },
      },
    },
  };
}

/** Sparklines are a mark inside a stat tile, not a chart: no axes, no hover. */
export function buildSparkData(values: readonly number[], color: string): ChartData {
  return {
    labels: values.map((_, i) => String(i)),
    datasets: [
      {
        data: [...values],
        borderColor: color,
        backgroundColor: withAlpha(color, 0.16),
        borderWidth: 1.5,
        fill: 'origin',
        tension: 0,
        pointRadius: 0,
      },
    ],
  };
}

export const SPARK_OPTIONS: ChartOptions = {
  maintainAspectRatio: false,
  responsive: true,
  animation: false,
  events: [],
  layout: { padding: 0 },
  scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
};

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const PLAIN = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

export const formatCompact = (v: number): string => (Math.abs(v) >= 1000 ? COMPACT.format(v) : PLAIN.format(v));
export const formatValue = (v: number): string => PLAIN.format(v);

/**
 * Headline figure for a chart card.
 *
 * A time series leads with its LATEST value — that is the number a reader came
 * for. A part-to-whole leads with the TOTAL, because "the most recent slice" is
 * not a thing a donut has.
 */
export function heroFigure(data: IChartWidgetData): { value: string; label: string } | undefined {
  const first = visibleSeries(data)[0];
  if (!first || !first.values.length) return undefined;

  if (data.kind === 'donut') {
    const total = first.values.reduce((a, b) => a + b, 0);
    return {
      value: formatValue(total) + (data.unit ?? ''),
      label: `${first.label} · ${data.labels.length} sources`,
    };
  }

  const last = first.values[first.values.length - 1];
  return {
    value: formatValue(last) + (data.unit ?? ''),
    label: `${first.label} · ${data.labels[data.labels.length - 1] ?? ''}`,
  };
}

/** Segments of a part-to-whole chart, with their share, for a direct-labelled legend. */
export function donutSegments(
  data: IChartWidgetData,
): readonly { label: string; value: number; share: string; slot: number }[] {
  const series = visibleSeries(data)[0] ?? data.series[0];
  const values = series?.values ?? [];
  const total = values.reduce((a, b) => a + b, 0);
  return data.labels.map((label, i) => ({
    label,
    value: values[i] ?? 0,
    share: total ? `${(((values[i] ?? 0) / total) * 100).toFixed(0)}%` : '0%',
    slot: i + 1,
  }));
}

/** Percentage change between the last two points of a series, if meaningful. */
export function trend(values: readonly number[]): { text: string; direction: 'up' | 'down' | 'flat' } | undefined {
  if (values.length < 2) return undefined;
  const prev = values[values.length - 2];
  const last = values[values.length - 1];
  if (!prev) return undefined;
  const pct = ((last - prev) / Math.abs(prev)) * 100;
  const direction = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat';
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, direction };
}
