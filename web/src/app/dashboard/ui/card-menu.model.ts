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
  /**
   * True when exactly one entry in the group can be chosen — grid engine,
   * chart shape, card width.
   *
   * It changes the ARIA role from `menuitemcheckbox` to `menuitemradio`, which
   * is the difference between "these toggle independently" and "picking one
   * drops the last". A checkbox role on a radio group does not merely
   * under-describe the control, it actively misdescribes what pressing it does.
   */
  readonly singleSelect?: boolean;
  readonly entries: readonly CardMenuEntry[];
}
