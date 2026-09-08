import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IContentWidgetData } from '../../model/board.model';

/**
 * A card that is prose.
 *
 * Its job on this board is to be self-demonstrating: the argument "a card is a
 * layout, not a chart type" is unconvincing printed inside a chart, and obvious
 * when the card making it is a piece of writing sitting in the same grid, with
 * the same header, menu and drag handle as everything else.
 */
@Component({
  selector: 'db-content-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-brand]': "data().tone === 'brand'" },
  template: `
    @if (data().eyebrow; as eyebrow) {
      <p class="eyebrow">{{ eyebrow }}</p>
    }
    <h4 class="heading">{{ data().heading }}</h4>
    @for (para of data().body; track para) {
      <p class="body">{{ para }}</p>
    }
    @if (data().bullets; as bullets) {
      <dl class="bullets">
        @for (bullet of bullets; track bullet.term) {
          <div>
            <dt>{{ bullet.term }}</dt>
            <dd>{{ bullet.detail }}</dd>
          </div>
        }
      </dl>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px 14px 12px;
      flex: 1 1 auto;
      min-height: 0;
    }

    :host(.is-brand) {
      background:
        linear-gradient(0deg, var(--brand-wash), var(--brand-wash)) padding-box;
      border-left: 3px solid var(--brand);
    }

    .eyebrow {
      margin: 0;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--brand);
    }

    .heading {
      margin: 0;
      font-size: 16px;
      font-weight: 650;
      letter-spacing: -0.014em;
      line-height: 1.25;
      color: var(--ink);
      text-wrap: balance;
    }

    .body {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--ink-muted);
      max-width: 58ch;
    }

    .bullets {
      display: grid;
      gap: 0;
      margin: 6px 0 0;
    }

    .bullets > div {
      display: grid;
      grid-template-columns: 68px minmax(0, 1fr);
      gap: 10px;
      padding: 6px 0;
      border-top: 1px solid var(--hairline);
    }

    dt {
      font-size: 11px;
      font-weight: 660;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ink-faint);
      padding-top: 1px;
    }

    dd {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.45;
      color: var(--ink-soft);
    }
  `,
})
export class ContentWidgetComponent {
  readonly data = input.required<IContentWidgetData>();
}
