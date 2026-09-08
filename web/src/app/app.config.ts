import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { DashboardiusPreset } from './theme/brand-preset';
import { PRIMEUI_LICENSE } from '../environments/primeui-license';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    // Event replay matters here: the page prerenders as a full board, so a
    // visitor can reach a card menu before hydration finishes. Without replay
    // that first click would be swallowed.
    provideClientHydration(withEventReplay()),
    providePrimeNG({
      // PrimeNG 21+ is licensed software and shows a banner without a key.
      // Baked in at build time from the PRIMEUI_LICENSE environment variable;
      // see scripts/write-primeui-license.mjs.
      license: PRIMEUI_LICENSE,
      theme: {
        preset: DashboardiusPreset,
        options: {
          darkModeSelector: '.db-dark',
          // Keep PrimeNG's generated rules behind the application's own, so a
          // component style never has to out-specify the theme.
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
      ripple: false,
    }),
  ],
};
