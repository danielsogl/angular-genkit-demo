import type { Route, Routes } from '@angular/router';

import { NAV_ITEMS, type NavItem } from '../shared/nav-items';
import { DashboardShell } from './shell/dashboard-shell/dashboard-shell';

export function buildShellRoutes(items: readonly NavItem[]): Route[] {
  return items.map((item) => {
    const base = { path: item.route, data: { title: item.label } } as const;
    if (item.route === 'kundenakte') {
      return {
        ...base,
        loadComponent: () => import('./kundenakte/kundenakte-page').then((m) => m.KundenaktePage),
      };
    }
    return {
      ...base,
      loadComponent: () => import('./shell/placeholder/placeholder').then((m) => m.Placeholder),
    };
  });
}

export const routes: Routes = [
  {
    path: '',
    component: DashboardShell,
    children: buildShellRoutes(NAV_ITEMS),
  },
];
