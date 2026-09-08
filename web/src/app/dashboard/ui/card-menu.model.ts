/** One row in a card's menu. Rendered by CardShellComponent. */
export interface CardMenuEntry {
  readonly id: string;
  readonly label: string;
  /** Rendered as a checkable row when set. */
  readonly checked?: boolean;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  /** Small right-aligned hint, e.g. a keyboard shortcut or a size. */
  readonly hint?: string;
}

export interface CardMenuGroup {
  readonly id: string;
  readonly label?: string;
  readonly entries: readonly CardMenuEntry[];
}
