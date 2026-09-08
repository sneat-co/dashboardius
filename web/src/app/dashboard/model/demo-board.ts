import { IBoardCardDef, IBoardDef, sqlWidgetName } from './board.model';

/**
 * The canonical demo board — the exact state `Reset` restores.
 *
 * Every number here is invented. That is stated on the board, in each card's
 * footer, and in the reset notice, because a landing page that dresses made-up
 * figures as production analytics is lying, however prettily.
 *
 * Series values are deliberately kept within one order of magnitude of each
 * other inside a card, so adding a hidden metric produces a chart that is still
 * readable on ONE axis. (A second y-axis is never the answer; it invents a
 * correlation that is not in the data.)
 */

const WEEKS = ['W27', 'W28', 'W29', 'W30', 'W31', 'W32', 'W33', 'W34', 'W35', 'W36', 'W37', 'W38'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEMO_NOTE = 'Sample data — Dashboardius has not met your database yet.';

/** Cards that exist but are not on the board until a command adds them. */
export const OFF_BOARD_CARDS: Record<string, IBoardCardDef> = {
  revenue: {
    id: 'revenue',
    title: 'Revenue',
    cols: 4,
    widget: {
      name: 'chart',
      data: {
        kind: 'area',
        labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        unit: 'k',
        note: DEMO_NOTE,
        series: [
          { id: 'mrr', label: 'MRR', slot: 3, visible: true, values: [4.2, 5.1, 5.0, 6.3, 7.1, 8.4] },
          { id: 'expansion', label: 'Expansion', slot: 4, visible: false, values: [0.4, 0.7, 0.6, 1.1, 1.5, 2.2] },
        ],
      },
    },
  },

  coffee: {
    id: 'coffee',
    title: 'Coffee ↔ commits',
    cols: 6,
    widget: {
      name: 'chart',
      data: {
        kind: 'bar',
        labels: DAYS,
        note: 'Correlation is not causation. It is, however, extremely convenient.',
        series: [
          { id: 'coffee', label: 'Coffees', slot: 2, visible: true, values: [3, 5, 4, 6, 8, 2, 1] },
          { id: 'commits', label: 'Commits', slot: 1, visible: true, values: [4, 7, 6, 9, 12, 3, 1] },
        ],
      },
    },
  },

  orders: {
    id: 'orders',
    title: 'Slowest queries',
    cols: 4,
    widget: {
      name: sqlWidgetName,
      data: {
        environment: 'prod',
        duration: 61,
        note: `${DEMO_NOTE} The query is real SQL; the rows are not.`,
        sql: [
          'SELECT query_id, calls, ROUND(mean_ms, 1) AS mean_ms',
          '  FROM pg_stat_statements',
          ' ORDER BY mean_ms DESC',
          ' LIMIT 5;',
        ].join('\n'),
        columns: [
          { name: 'query_id', title: 'Query', dbType: 'text', display: 'text' },
          { name: 'calls', title: 'Calls', dbType: 'int', display: 'number' },
          { name: 'mean_ms', title: 'Mean ms', dbType: 'int', display: 'number' },
        ],
        rows: [
          ['board_summary_v2', 1284, 412],
          ['signups_by_source', 9611, 96],
          ['space_members', 41209, 44],
          ['card_view_events', 128441, 12],
          ['session_ping', 402118, 3],
        ],
      },
    },
  },

  exec: {
    id: 'exec',
    title: 'The one-paragraph version',
    cols: 12,
    widget: {
      name: 'content',
      data: {
        tone: 'brand',
        eyebrow: 'Executive summary',
        heading: 'Growth is compounding; the engineering cards went to the appendix.',
        body: [
          'Sign-ups are up twelve weeks running and returning users are growing faster than new ones — the ratio, not the raw count, is the thing to watch.',
          'Two cards were retired from this view because they answer engineering questions, not board-meeting ones. Nothing was deleted; Undo puts them back.',
        ],
      },
    },
  },
};

export const DEMO_BOARD: IBoardDef = {
  id: 'dashboardius-demo',
  title: 'Product pulse',
  description: 'Any data. Your metrics. One view.',
  tags: ['demo'],
  rows: [
    {
      id: 'row-1',
      cards: [
        {
          id: 'signups',
          title: 'Sign-ups',
          cols: 7,
          widget: {
            name: 'chart',
            data: {
              kind: 'area',
              labels: WEEKS,
              note: DEMO_NOTE,
              action: { kind: 'sign-up', label: 'Add me', signedInLabel: 'You are in the data' },
              series: [
                {
                  id: 'signups',
                  label: 'Sign-ups',
                  slot: 1,
                  visible: true,
                  values: [42, 51, 47, 63, 58, 71, 84, 79, 96, 108, 121, 134],
                },
                {
                  id: 'signins',
                  label: 'Sign-ins from new devices',
                  slot: 3,
                  visible: false,
                  values: [66, 74, 71, 92, 88, 103, 119, 115, 138, 152, 171, 188],
                },
                {
                  id: 'returning',
                  label: 'Returning users',
                  slot: 7,
                  visible: false,
                  values: [21, 27, 25, 34, 31, 40, 47, 44, 55, 62, 71, 80],
                },
              ],
            },
          },
        },
        {
          id: 'pulse',
          title: 'Dashboardius this week',
          cols: 5,
          widget: {
            name: 'stats',
            data: {
              note: DEMO_NOTE,
              tiles: [
                {
                  id: 'boards',
                  label: 'Dashboards created',
                  value: '1,284',
                  delta: '12.4%',
                  deltaDirection: 'up',
                  spark: [22, 26, 24, 31, 29, 37, 41, 48],
                },
                {
                  id: 'views',
                  label: 'Cards viewed',
                  value: '96,510',
                  delta: '8.1%',
                  deltaDirection: 'up',
                  spark: [61, 64, 62, 71, 69, 78, 83, 90],
                },
                {
                  id: 'edits',
                  label: 'Dashboard edits',
                  value: '3,092',
                  delta: '2.0%',
                  deltaDirection: 'down',
                  spark: [44, 47, 45, 43, 46, 41, 40, 38],
                },
                {
                  id: 'ai',
                  label: 'Commands run',
                  value: '742',
                  delta: '31%',
                  deltaDirection: 'up',
                  note: 'Mostly “surprise me”.',
                  spark: [8, 11, 14, 13, 19, 24, 31, 41],
                },
              ],
            },
          },
        },
      ],
    },

    {
      id: 'row-2',
      cards: [
        {
          id: 'members',
          title: 'Members',
          cols: 8,
          widget: {
            name: sqlWidgetName,
            data: {
              environment: 'prod',
              duration: 34,
              currency: 'EUR',
              note: `${DEMO_NOTE} The query is real SQL; the people are not.`,
              sql: [
                'SELECT m.name           AS member,',
                '       m.gender,',
                '       m.joined_at      AS joined,',
                '       COUNT(s.id)      AS sessions,',
                '       w.balance,',
                '       m.onboarding_pct AS onboarding,',
                '       m.is_active      AS active',
                '  FROM members m',
                '  LEFT JOIN sessions s ON s.member_id = m.id',
                '  LEFT JOIN wallets  w ON w.member_id = m.id',
                ' GROUP BY m.id',
                ' ORDER BY sessions DESC;',
              ].join('\n'),
              columns: [
                { name: 'member', title: 'Member', dbType: 'text', display: 'text', width: 150 },
                { name: 'gender', title: 'Gender', dbType: 'text', display: 'gender', width: 142 },
                { name: 'joined', title: 'Joined', dbType: 'date', display: 'date', width: 120 },
                { name: 'sessions', title: 'Sessions', dbType: 'int', display: 'number', width: 96 },
                {
                  name: 'balance',
                  title: 'Balance',
                  dbType: 'money',
                  display: 'amount',
                  currency: 'EUR',
                  // Below €25 and still positive is the "about to go under" band.
                  warnBelow: 25,
                  width: 118,
                },
                {
                  name: 'onboarding',
                  title: 'Onboarding',
                  dbType: 'percent',
                  display: 'progress',
                  max: 100,
                  width: 150,
                },
                { name: 'active', title: 'Active', dbType: 'bool', display: 'boolean', width: 96 },
              ],
              rows: [
                ['Amara Okafor', 'f', '2026-01-14', 214, 148.2, 100, true],
                ['Jonas Weber', 'm', '2026-02-02', 187, 12.4, 100, true],
                ['Priya Raman', 'f', '2026-02-19', 163, -32.75, 92, true],
                ['Tomás Ferreira', 'm', '2026-03-08', 141, 96, 88, true],
                ['Lin Zhao', 'x', '2026-03-27', 128, 0, 74, true],
                ['Sofia Marchetti', 'f', '2026-04-11', 119, 240.5, 100, false],
                ['Ewan MacLeod', 'm', '2026-05-02', 97, -8.1, 61, true],
                ['Nadia Haddad', 'f', '2026-05-23', 84, 54.3, 55, false],
                ['Peter Novák', 'm', '2026-06-09', 72, 19.95, 47, true],
                ['Yuki Tanaka', 'x', '2026-06-28', 61, 310, 100, true],
                ['Grace Adeyemi', 'f', '2026-07-15', 45, -120, 33, false],
                ['Mikkel Sørensen', 'm', '2026-08-04', 28, 7.6, 18, true],
              ],
            },
          },
        },
        {
          id: 'signins',
          title: 'Sign-ins',
          cols: 4,
          widget: {
            name: 'chart',
            data: {
              kind: 'bar',
              labels: DAYS,
              note: DEMO_NOTE,
              action: { kind: 'sign-in', label: 'Sign me in', signedInLabel: 'Signed in — nice' },
              series: [
                {
                  id: 'signins-daily',
                  label: 'Sign-ins',
                  slot: 1,
                  visible: true,
                  values: [118, 143, 137, 156, 149, 71, 64],
                },
                {
                  id: 'signins-mobile',
                  label: 'On mobile',
                  slot: 5,
                  visible: false,
                  values: [61, 70, 68, 80, 77, 44, 40],
                },
              ],
            },
          },
        },
      ],
    },

    {
      id: 'row-3',
      cards: [
        {
          id: 'sources',
          title: 'Where sign-ups come from',
          cols: 4,
          widget: {
            name: 'chart',
            data: {
              // Part-to-whole, five segments, no two of them close enough to be
              // a guess — the narrow case where a ring beats a bar.
              kind: 'donut',
              labels: ['Organic search', 'DataTug docs', 'Telegram bot', 'sneat.app', 'Everything else'],
              note: DEMO_NOTE,
              series: [
                {
                  id: 'sources',
                  label: 'Sign-ups',
                  slot: 1,
                  visible: true,
                  values: [412, 268, 197, 154, 151],
                },
              ],
            },
          },
        },
        {
          id: 'story',
          title: 'How a card gets its data',
          cols: 5,
          widget: {
            name: 'content',
            data: {
              eyebrow: 'Dashboardius × DataTug',
              heading: 'DataTug gets the data. Dashboardius shows it.',
              body: [
                'A card points at a DataTug query. Change the query and every card reading it follows — no export, no copy, no screenshot in a slide deck.',
              ],
              bullets: [
                { term: 'Query', detail: 'Lives in DataTug, with its environments and connections.' },
                { term: 'Card', detail: 'A layout, not a chart type. Grids and prose count.' },
                { term: 'Board', detail: 'Literally a DataTug board. Same JSON, no new schema.' },
              ],
              action: { kind: 'command', label: 'Add a DataTug card', commandId: 'add-datatug-card' },
            },
          },
        },
        {
          id: 'meetings',
          title: 'Meetings that could have been a dashboard',
          cols: 3,
          widget: {
            name: 'chart',
            data: {
              kind: 'bar',
              labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
              note: 'Self-reported. Suspiciously precise.',
              series: [
                { id: 'meetings', label: 'Meetings', slot: 2, visible: true, values: [12, 9, 14, 11, 17, 21] },
              ],
            },
          },
        },
      ],
    },

    {
      id: 'row-4',
      cards: [
        {
          id: 'ecosystem',
          title: 'Across the Sneat platform',
          cols: 12,
          widget: {
            name: 'stats',
            data: {
              note: DEMO_NOTE,
              tiles: [
                {
                  id: 'spaces',
                  label: 'Spaces',
                  value: '18,402',
                  delta: '4.6%',
                  deltaDirection: 'up',
                  spark: [70, 72, 74, 75, 79, 82, 86, 91],
                },
                {
                  id: 'products',
                  label: 'Products live',
                  value: '14',
                  deltaDirection: 'flat',
                  note: 'Dashboardius makes fifteen.',
                },
                {
                  id: 'shared',
                  label: 'Shared boards',
                  value: '2,166',
                  delta: '9.8%',
                  deltaDirection: 'up',
                  spark: [30, 33, 35, 38, 41, 45, 49, 54],
                },
                {
                  id: 'queries',
                  label: 'DataTug queries run',
                  value: '441,908',
                  delta: '6.2%',
                  deltaDirection: 'up',
                  spark: [55, 58, 57, 62, 66, 69, 73, 78],
                },
              ],
            },
          },
        },
      ],
    },
  ],
};
