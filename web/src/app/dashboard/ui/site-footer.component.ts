import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The footer carries the words.
 *
 * A dashboard-first homepage still has to be a page: something has to tell a
 * search engine, a link preview, and a first-time visitor who scrolled past the
 * board what this is. Putting that here rather than above the fold means the
 * crawlable copy and the product demonstration do not have to fight for the
 * same screen — the board makes the argument, the footer states it.
 */
@Component({
  selector: 'db-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <div class="inner">
        <section class="lede">
          <h2>Dashboardius</h2>
          <p class="claim">Any data. Your metrics. One view.</p>
          <p>
            Dashboardius builds, shows, edits and shares dashboards. Everything above this
            line is a working board: drag a card by its header, resize it from its menu, add
            a metric that was hidden rather than missing, ask for a change in one sentence,
            and reset when you have had enough. No sign-up, no sales call, no screenshot.
          </p>
        </section>

        <section>
          <h3>What a card can be</h3>
          <p>
            A card is a layout, not a chart type. Time series, bar charts, stat tiles, query
            results, tables and plain prose all live in the same twelve-column grid, with the
            same header, the same menu and the same drag handle — so a dashboard can carry an
            argument as well as a number.
          </p>
        </section>

        <section>
          <h3>Built on DataTug</h3>
          <p>
            <a href="https://datatug.app" rel="noopener">DataTug</a> connects to your data,
            queries it and shapes it. Dashboardius presents it. A card points at a DataTug
            query, and a Dashboardius board is literally a DataTug board — the same project,
            the same JSON, no second schema to keep in step. DataTug gets the data;
            Dashboardius shows it.
          </p>
        </section>

        <section>
          <h3>What is not here yet</h3>
          <p>
            Saving, sharing and committing a board to GitHub are on the board as buttons and
            not as behaviour: pressing one explains itself instead of pretending. The
            numbers on the demo board are invented, and every card that carries one says so.
            Free-form prompts need a model this public page does not call; the six
            suggestions run for real.
          </p>
        </section>

        <div class="colophon">
          <p>
            A <a href="https://sneat.co" rel="noopener">Sneat</a> product, alongside
            <a href="https://datatug.app" rel="noopener">DataTug</a>.
          </p>
          <p>
            <a href="https://github.com/sneat-co/dashboardius" rel="noopener">Source on GitHub</a>
          </p>
        </div>
      </div>
    </footer>
  `,
  styles: `
    footer {
      border-top: 1px solid var(--hairline);
      background: var(--paper-sunken);
    }

    .inner {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
      gap: 26px 34px;
      max-width: var(--shell-max);
      margin: 0 auto;
      padding: 40px 20px 34px;
    }

    .lede {
      grid-column: 1 / -1;
      max-width: 62ch;
    }

    h2 {
      margin: 0;
      font-size: 19px;
      font-weight: 680;
      letter-spacing: -0.022em;
      color: var(--ink);
    }

    .claim {
      margin: 2px 0 10px;
      font-size: 14px;
      font-weight: 560;
      color: var(--brand);
    }

    h3 {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 680;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    p {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.62;
      color: var(--ink-muted);
    }

    a {
      color: var(--ink);
      text-decoration: underline;
      text-decoration-color: var(--hairline-strong);
      text-underline-offset: 2px;
    }

    a:hover {
      color: var(--brand);
      text-decoration-color: currentColor;
    }

    .colophon {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 10px;
      padding-top: 18px;
      border-top: 1px solid var(--hairline);
      font-size: 12px;
    }

    @media (max-width: 700px) {
      .inner {
        padding: 30px 12px 26px;
        gap: 22px;
      }
    }
  `,
})
export class SiteFooterComponent {}
