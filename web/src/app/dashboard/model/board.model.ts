/**
 * Dashboardius board model.
 *
 * REUSED, NOT REDESIGNED. `IBoardDef` / `IBoardRowDef` / `IBoardCardDef` /
 * `IWidgetDef` below are DataTug's dashboard schema, copied field-for-field
 * from `datatug-apps/libs/datatug/main/src/lib/models/definition/board/*.ts`,
 * which is itself the TypeScript mirror of the canonical Go definition in
 * `datatug-core/pkg/datatug/boards.go`. The JSON shape is therefore already
 * compatible with a DataTug project on disk or in Firestore.
 *
 * Dashboardius does not invent a persistence model, a project schema or a query
 * schema. What it adds is PRESENTATION: three new widget names ('chart',
 * 'stats', 'content') alongside DataTug's existing 'SQL' / 'tabs' / 'http'.
 * `IWidgetDef` was designed to be extended exactly this way — `{ name, data }`
 * — so adding a widget kind is not a schema change.
 *
 * Follow-up (deliberately NOT done here, because it is a change to DataTug and
 * this task is not allowed to refactor DataTug): these interfaces live inside
 * `datatug-apps` as an unpublished path alias, so there is no package to import
 * them from. The right end state is a published `@datatug/board-models`
 * consumed by both products. Until then this file is the copy, and it carries
 * the provenance note above so the duplication stays visible.
 */

/** A board = a dashboard. DataTug's `IBoardDef`. */
export interface IBoardDef {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly rows?: readonly IBoardRowDef[];
  readonly tags?: readonly string[];
}

/** DataTug's `IBoardRowDef`. */
export interface IBoardRowDef {
  readonly id: string;
  readonly minHeight?: string;
  readonly cards?: readonly IBoardCardDef[];
}

/** DataTug's `IBoardCardDef`. `cols` is a span of the 12-column row. */
export interface IBoardCardDef {
  readonly id: string;
  readonly title: string;
  readonly cols?: number;
  readonly widget?: WidgetDef;
}

/** DataTug's open widget envelope: a name plus opaque data. */
export interface IWidgetDef {
  readonly name: string;
  readonly data: unknown;
}

// --- DataTug widget names Dashboardius renders -----------------------------

/** DataTug's `sqlWidgetName`. */
export const sqlWidgetName = 'SQL';

export interface ISqlWidgetDef extends IWidgetDef {
  readonly name: typeof sqlWidgetName;
  readonly data: ISqlWidgetData;
}

export interface ISqlWidgetData {
  readonly sql: string;
  /** Optional currency for every `amount` column in this recordset. */
  readonly currency?: string;
  /**
   * Honest-labelling footnote. Rendered in the card footer so a visitor is
   * never left guessing whether a number is real.
   */
  readonly note?: string;
  /** DataTug environment the query was resolved against, e.g. `prod`. */
  readonly environment: string;
  readonly columns: readonly IRecordsetColumn[];
  readonly rows: readonly RecordsetRow[];
  /** Milliseconds, as DataTug's `IRecordsetResult.duration`. */
  readonly duration: number;
}

/**
 * DataTug's `IRecordsetColumn`, plus the presentation type Dashboardius reads
 * to decide how a cell is drawn.
 *
 * `dbType` stays what the database said; `display` is the card's decision about
 * it, which is Dashboardius' half of the division of labour. A column can be an
 * integer in the database and a progress bar on the board without the query
 * changing, and the same recordset renders identically whichever grid engine
 * the card is switched to.
 */
export interface IRecordsetColumn {
  readonly name: string;
  /** Header text. Falls back to `name` when absent. */
  readonly title?: string;
  readonly dbType: 'text' | 'int' | 'money' | 'percent' | 'date' | 'bool';
  readonly display: CellDisplay;
  /** ISO 4217 code for a `amount` column; overrides the recordset's default. */
  readonly currency?: string;
  /** Upper bound for a `progress` column. Defaults to 100. */
  readonly max?: number;
  /**
   * For an `amount` column: at or above zero but below this, the cell is
   * tinted as a warning. Negative is always tinted as critical. Both are
   * paired with a sign in the text, never carried by colour alone.
   */
  readonly warnBelow?: number;
  readonly width?: number;
}

/** How a cell is drawn. */
export type CellDisplay =
  | 'text'
  | 'number'
  | 'amount'
  | 'progress'
  | 'date'
  | 'boolean'
  | 'gender';

export type RecordsetValue = string | number | boolean | null;
export type RecordsetRow = readonly RecordsetValue[];

/** The grid engines a query card can render its recordset with. */
export const GRID_ENGINES = ['table', 'tabulator', 'ag-grid'] as const;
export type GridEngine = (typeof GRID_ENGINES)[number];

export const GRID_ENGINE_LABELS: Record<GridEngine, string> = {
  table: 'Plain table',
  tabulator: 'Tabulator',
  'ag-grid': 'AG Grid',
};

// --- Widget names Dashboardius adds ----------------------------------------

export type DashboardiusWidgetName = 'chart' | 'stats' | 'content';

/** A chart over one or more named series. */
export interface IChartWidgetDef extends IWidgetDef {
  readonly name: 'chart';
  readonly data: IChartWidgetData;
}

/**
 * `donut` is deliberately part-to-whole ONLY, and the card menu offers it just
 * when a single series is visible: two datasets in a doughnut become nested
 * rings that compare nothing, and comparing close values in a circle is the
 * classic way to make a chart unreadable.
 */
export type ChartKind = 'area' | 'bar' | 'donut';

export interface IChartWidgetData {
  readonly kind: ChartKind;
  /** Category labels along x, e.g. ISO week days or month names. */
  readonly labels: readonly string[];
  /**
   * EVERY series the card knows about — visible and hidden alike. Hiding a
   * metric never deletes its definition; that is the whole point of the
   * hidden-metric picker, and it is why `visible` lives on the series rather
   * than the series living in one of two lists.
   */
  readonly series: readonly ISeriesDef[];
  /** Optional unit suffix for the hero figure, e.g. '%' or 'ms'. */
  readonly unit?: string;
  /** Optional call to action rendered in the card footer. */
  readonly action?: ICardAction;
  /** Honest-labelling footnote, rendered in the card footer. */
  readonly note?: string;
}

export interface ISeriesDef {
  readonly id: string;
  readonly label: string;
  /**
   * Fixed 1-8 slot in the validated categorical palette. Colour follows the
   * SERIES, never its position in the visible list — so toggling one metric
   * never repaints the others.
   */
  readonly slot: SeriesSlot;
  readonly visible: boolean;
  readonly values: readonly number[];
}

export type SeriesSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** A strip of stat tiles. The number is the chart. */
export interface IStatsWidgetDef extends IWidgetDef {
  readonly name: 'stats';
  readonly data: IStatsWidgetData;
}

export interface IStatsWidgetData {
  readonly tiles: readonly IStatTile[];
  /** Honest-labelling footnote, rendered in the card footer. */
  readonly note?: string;
}

export interface IStatTile {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly delta?: string;
  readonly deltaDirection?: 'up' | 'down' | 'flat';
  /** A short, honest footnote. Used to keep demo numbers labelled as demo. */
  readonly note?: string;
  /** Optional micro-series drawn behind the tile as a sparkline. */
  readonly spark?: readonly number[];
}

/** Prose, links and a CTA — proof that a card is not obliged to be a chart. */
export interface IContentWidgetDef extends IWidgetDef {
  readonly name: 'content';
  readonly data: IContentWidgetData;
}

export interface IContentWidgetData {
  readonly eyebrow?: string;
  readonly heading: string;
  readonly body: readonly string[];
  readonly bullets?: readonly IContentBullet[];
  readonly action?: ICardAction;
  readonly tone?: 'default' | 'brand';
}

export interface IContentBullet {
  readonly term: string;
  readonly detail: string;
}

export type CardActionKind = 'sign-up' | 'sign-in' | 'link' | 'command';

export interface ICardAction {
  readonly kind: CardActionKind;
  readonly label: string;
  /** Label shown instead of `label` once the visitor is signed in. */
  readonly signedInLabel?: string;
  readonly href?: string;
  /** For kind === 'command': the command id to run through the AI pipeline. */
  readonly commandId?: string;
}

export type AnyWidgetDef =
  | ISqlWidgetDef
  | IChartWidgetDef
  | IStatsWidgetDef
  | IContentWidgetDef;

export type WidgetDef = AnyWidgetDef | IWidgetDef;

// --- Narrowing helpers ------------------------------------------------------

export const isChartWidget = (w?: WidgetDef): w is IChartWidgetDef =>
  !!w && w.name === 'chart';

export const isStatsWidget = (w?: WidgetDef): w is IStatsWidgetDef =>
  !!w && w.name === 'stats';

export const isContentWidget = (w?: WidgetDef): w is IContentWidgetDef =>
  !!w && w.name === 'content';

export const isSqlWidget = (w?: WidgetDef): w is ISqlWidgetDef =>
  !!w && w.name === sqlWidgetName;

/**
 * A card's width, in columns of the twelve-column row — DataTug's `cols`, which
 * is a plain number, so any width from 1 to 12 is a legal board.
 */
export type CardSpan = number;

/** The widths the card menu offers. A shortlist, not the model's limit. */
export const CARD_SPANS = [3, 4, 6, 8, 12] as const;

export const clampSpan = (cols: number | undefined): CardSpan =>
  Math.max(1, Math.min(12, Math.round(cols ?? 6)));
