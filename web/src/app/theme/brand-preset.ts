import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

import { DARK_PRIMARY_RAMP, LIGHT_PRIMARY_RAMP } from './generated-palette';

/**
 * PrimeNG runs in STYLED mode with this Dashboardius preset — the fleet
 * convention set by sneat-co/gametable (founder ruling 2026-08-19, the
 * ionic-primeng-spike follow-up): literal eleven-shade hex ramps generated at
 * BUILD TIME by `scripts/generate-primeng-palette.mjs` from one brand token,
 * with an independently generated ramp per colour scheme rather than one ramp
 * read twice.
 *
 * Everything below the primary ramp — surfaces, radii, focus ring, typography —
 * is re-pointed at the Dashboardius CSS custom properties declared in
 * `src/styles.scss`, so PrimeNG's chrome and the hand-built dashboard chrome
 * are the same design system rather than two that happen to sit side by side.
 * That is what keeps this from looking like an Aura demo.
 *
 * Dark mode is selected by `providePrimeNG`'s `darkModeSelector`, wired to the
 * `.db-dark` class the theme service puts on <html>.
 */
export const DashboardiusPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '3px',
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
    },
  },
  semantic: {
    // A dashboard is a dense surface: PrimeNG's default 1rem gutters make every
    // menu and dialog feel like a marketing page. These are tightened once here
    // rather than fought component by component.
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
      shadow: 'none',
    },
    formField: {
      paddingX: '0.7rem',
      paddingY: '0.45rem',
      borderRadius: '6px',
    },
    content: { borderRadius: '8px' },
    overlay: {
      select: { borderRadius: '10px' },
      popover: { borderRadius: '10px', padding: '0.5rem' },
      modal: { borderRadius: '14px', padding: '1.25rem' },
    },
    colorScheme: {
      light: {
        primary: {
          ...LIGHT_PRIMARY_RAMP,
          color: LIGHT_PRIMARY_RAMP[500],
          contrastColor: '#ffffff',
          hoverColor: LIGHT_PRIMARY_RAMP[600],
          activeColor: LIGHT_PRIMARY_RAMP[700],
        },
        surface: {
          0: '#ffffff',
          50: '#f7f6f3',
          100: '#efede8',
          200: '#e3e1dc',
          300: '#cfccc4',
          400: '#a8a49a',
          500: '#7e7a70',
          600: '#5c6470',
          700: '#3d434c',
          800: '#282c33',
          900: '#191c21',
          950: '#101216',
        },
        content: { background: '#ffffff', borderColor: '#e3e1dc' },
        text: { color: '#15181d', mutedColor: '#5c6470' },
      },
      dark: {
        primary: {
          ...DARK_PRIMARY_RAMP,
          color: DARK_PRIMARY_RAMP[400],
          contrastColor: DARK_PRIMARY_RAMP[950],
          hoverColor: DARK_PRIMARY_RAMP[300],
          activeColor: DARK_PRIMARY_RAMP[200],
        },
        surface: {
          0: '#1b1e23',
          50: '#20242a',
          100: '#262b32',
          200: '#2a2f37',
          300: '#39404a',
          400: '#4d5560',
          500: '#6b7480',
          600: '#98a1ae',
          700: '#b9c0ca',
          800: '#d5dae1',
          900: '#eceef1',
          950: '#f7f8fa',
        },
        content: { background: '#1b1e23', borderColor: '#2a2f37' },
        text: { color: '#eceef1', mutedColor: '#98a1ae' },
      },
    },
  },
});
