import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';

import { KNOWN_COMMANDS, KnownCommand } from '../state/command-catalog';
import { DashboardStore } from '../state/dashboard-store';

/**
 * The prompt.
 *
 * Not a chatbot in a corner: it is the board's primary editing control, sitting
 * where a toolbar would, and it runs the same pipeline every other control
 * runs — `command → structured actions → board mutation`.
 *
 * The suggestion chips are SCRIPTED and the UI says so, in words, every time
 * one runs. Clicking a chip types the sentence out, shows the structured plan
 * it resolved to, then applies it. No model is called and none is claimed;
 * spending tokens to re-derive six known answers on a public demo would be
 * theatre, and pretending a model produced them would be a lie. The half that
 * would be real — the action vocabulary, the execution, the undo — is real.
 *
 * A prompt that is not one of the six gets an honest answer rather than a
 * plausible-looking one.
 */
@Component({
  selector: 'db-command-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- A native submit listener, not an ngSubmit binding: that output belongs
         to NgForm, and without FormsModule imported Angular quietly binds it as
         a DOM event named "ngSubmit" that nothing ever dispatches. The prompt
         then looks live and does nothing. -->
    <form class="bar" (submit)="submit($event)" [class.is-busy]="busy()">
      <span class="glyph" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M8 1.6 9.5 6 14 7.5 9.5 9 8 13.4 6.5 9 2 7.5 6.5 6z" />
        </svg>
      </span>
      <label class="db-visually-hidden" for="db-prompt">Ask Dashboardius to change this dashboard</label>
      <input
        #promptInput
        id="db-prompt"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="What do you want to know, change, or add?"
        [value]="draft()"
        (input)="draft.set($any($event.target).value)"
        [disabled]="busy()"
        name="prompt"
      />
      <button type="submit" class="go" [disabled]="busy() || !draft().trim()">
        {{ busy() ? 'Working…' : 'Run' }}
      </button>
    </form>

    <div class="suggestions">
      <span class="suggest-label">Try</span>
      <ul>
        @for (command of commands; track command.id) {
          <li>
            <button type="button" class="chip" [disabled]="busy()" (click)="runSuggestion(command)">
              {{ command.text }}
            </button>
          </li>
        }
      </ul>
    </div>

    @if (run().phase !== 'idle' && run().phase !== 'typing') {
      <div class="trace" role="status" [class.is-unmatched]="run().phase === 'unmatched'">
        @if (run().phase === 'unmatched') {
          <p class="trace-head">
            <span class="dot is-idle" aria-hidden="true"></span>
            Dashboardius understood the words, not the request.
          </p>
          <p class="trace-body">
            Free-form prompts need a model, and this public board does not call one.
            The six suggestions above run for real — or move, resize and remove
            cards directly; everything the prompt would do, the board already does.
          </p>
        } @else {
          <p class="trace-head">
            <span class="dot" [class.is-running]="busy()" aria-hidden="true"></span>
            @switch (run().phase) {
              @case ('planning') { Resolving to dashboard actions… }
              @case ('applying') { Applying {{ run().steps.length }} {{ run().steps.length === 1 ? 'change' : 'changes' }}… }
              @default { {{ run().reply }} }
            }
          </p>
          <ol class="steps">
            @for (step of run().steps; track step; let i = $index) {
              <li [style.animation-delay.ms]="i * 60"><code>{{ step }}</code></li>
            }
          </ol>
          @if (run().phase === 'done') {
            <p class="trace-foot">
              <span class="scripted">Scripted demo — no model was called</span>
              <button type="button" (click)="undo()">Undo this</button>
              <button type="button" (click)="store.dismissCommand()">Dismiss</button>
            </p>
          }
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 5px 5px 11px;
      background: var(--card);
      border: 1px solid var(--hairline-strong);
      border-radius: 11px;
      box-shadow: var(--shadow-card);
      transition:
        border-color var(--dur) var(--ease),
        box-shadow var(--dur) var(--ease);
    }

    .bar:focus-within {
      border-color: var(--brand);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 16%, transparent);
    }

    .glyph {
      display: grid;
      place-items: center;
      width: 18px;
      height: 18px;
      flex: none;
      color: var(--brand);
    }

    .glyph svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    .is-busy .glyph {
      animation: spin 1.4s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    input {
      flex: 1 1 auto;
      min-width: 0;
      border: 0;
      background: none;
      color: var(--ink);
      font: inherit;
      font-size: 14.5px;
      padding: 8px 0;
    }

    input::placeholder {
      color: var(--ink-faint);
    }

    input:focus {
      outline: none;
    }

    .go {
      flex: none;
      min-height: 32px;
      padding: 0 15px;
      border: 0;
      border-radius: 8px;
      background: var(--brand);
      color: var(--brand-ink);
      font-size: 13px;
      font-weight: 620;
      cursor: pointer;
      transition: background var(--dur-fast) var(--ease);
    }

    .go:hover:not(:disabled) {
      background: var(--brand-hover);
    }

    .go:disabled {
      background: var(--paper-sunken);
      color: var(--ink-faint);
      cursor: default;
    }

    .suggestions {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-top: 9px;
      flex-wrap: wrap;
    }

    .suggest-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .suggestions ul {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .chip {
      min-height: 26px;
      padding: 3px 10px;
      border: 1px solid var(--hairline);
      border-radius: 999px;
      background: var(--card);
      color: var(--ink-muted);
      font-size: 12px;
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease),
        background var(--dur-fast) var(--ease);
    }

    .chip:hover:not(:disabled) {
      border-color: var(--brand);
      color: var(--brand);
      background: var(--brand-wash);
    }

    .chip:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .trace {
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px solid var(--hairline);
      border-left: 3px solid var(--brand);
      border-radius: 8px;
      background: var(--card);
      animation: slide-in var(--dur) var(--ease);
    }

    .trace.is-unmatched {
      border-left-color: var(--ink-faint);
    }

    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }

    .trace-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 13px;
      font-weight: 570;
      color: var(--ink);
    }

    .dot {
      width: 7px;
      height: 7px;
      flex: none;
      border-radius: 50%;
      background: var(--good);
    }

    .dot.is-running {
      background: var(--brand);
      animation: throb 1s var(--ease) infinite;
    }

    .dot.is-idle {
      background: var(--ink-faint);
    }

    @keyframes throb {
      50% {
        opacity: 0.25;
      }
    }

    .trace-body {
      margin: 5px 0 0 15px;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--ink-muted);
      max-width: 74ch;
    }

    .steps {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin: 8px 0 0 15px;
      padding: 0;
      list-style: none;
      counter-reset: step;
    }

    .steps li {
      animation: pop var(--dur) var(--ease) backwards;
    }

    @keyframes pop {
      from {
        opacity: 0;
        transform: translateY(3px);
      }
    }

    .steps code {
      display: inline-block;
      padding: 2px 7px;
      border: 1px solid var(--hairline);
      border-radius: 5px;
      background: var(--paper-sunken);
      color: var(--ink-muted);
      font-family: var(--font-mono);
      font-size: 10.5px;
    }

    .trace-foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin: 9px 0 0 15px;
      font-size: 11px;
    }

    .scripted {
      padding: 2px 7px;
      border: 1px dashed var(--hairline-strong);
      border-radius: 999px;
      color: var(--ink-faint);
      letter-spacing: 0.02em;
    }

    .trace-foot button {
      padding: 0;
      border: 0;
      background: none;
      color: var(--brand);
      font: inherit;
      font-weight: 620;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }

    @media (max-width: 640px) {
      input {
        font-size: 16px; /* iOS zooms anything smaller on focus */
      }

      .suggestions ul {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 3px;
        scrollbar-width: none;
      }

      .chip {
        white-space: nowrap;
      }
    }
  `,
})
export class CommandBarComponent {
  protected readonly store = inject(DashboardStore);
  protected readonly commands = KNOWN_COMMANDS;
  protected readonly draft = signal('');

  protected readonly run = this.store.command;
  protected readonly busy = computed(() => {
    const phase = this.run().phase;
    return phase === 'typing' || phase === 'planning' || phase === 'applying';
  });

  private readonly promptInput = viewChild<ElementRef<HTMLInputElement>>('promptInput');

  constructor() {
    // While a suggestion types itself out, the input mirrors the animation, so
    // the sentence appears to be written INTO the control the visitor would
    // have used — not into a transcript beside it.
    effect(() => {
      const run = this.run();
      if (run.phase === 'typing') this.draft.set(run.prompt);
    });
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    const prompt = this.draft().trim();
    if (!prompt || this.busy()) return;
    void this.store.run(prompt);
  }

  protected runSuggestion(command: KnownCommand): void {
    if (this.busy()) return;
    void this.store.run(command.text, { command, typeText: true });
  }

  protected undo(): void {
    this.store.undo();
    this.store.dismissCommand();
    this.promptInput()?.nativeElement.focus();
  }
}
