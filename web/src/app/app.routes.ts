import { Routes } from '@angular/router';

import { DashboardPageComponent } from './dashboard/ui/dashboard-page.component';

/**
 * One route. The homepage is the product, so there is nowhere else to be yet —
 * and an eagerly-loaded single route prerenders to real HTML rather than to a
 * loading shell.
 */
export const routes: Routes = [
  { path: '', component: DashboardPageComponent, title: 'Dashboardius — Any data. Your metrics. One view.' },
  { path: '**', redirectTo: '' },
];
