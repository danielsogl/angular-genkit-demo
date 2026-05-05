import { Routes } from '@angular/router';

import { DashboardShell } from './shell/dashboard-shell/dashboard-shell';

export const routes: Routes = [
  {
    path: '',
    component: DashboardShell,
    children: [
      {
        path: '',
        loadComponent: () => import('./shell/placeholder/placeholder').then((m) => m.Placeholder),
      },
      {
        path: 'overview',
        loadComponent: () => import('./shell/placeholder/placeholder').then((m) => m.Placeholder),
      },
      {
        path: 'library',
        loadComponent: () => import('./shell/placeholder/placeholder').then((m) => m.Placeholder),
      },
      {
        path: 'settings',
        loadComponent: () => import('./shell/placeholder/placeholder').then((m) => m.Placeholder),
      },
    ],
  },
];
