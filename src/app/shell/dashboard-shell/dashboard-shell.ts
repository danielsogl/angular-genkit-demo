import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';

import { SideNav } from '../side-nav/side-nav';
import { TopBar } from '../top-bar/top-bar';

@Component({
  selector: 'app-dashboard-shell',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterOutlet,
    SideNav,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.scss',
})
export class DashboardShell {
  readonly #breakpoints = inject(BreakpointObserver);

  protected readonly isHandset = toSignal(
    this.#breakpoints.observe(Breakpoints.Handset).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly collapsed = signal(false);
  protected readonly drawerOpen = signal(false);

  protected readonly mode = computed<'over' | 'side'>(() => (this.isHandset() ? 'over' : 'side'));
  protected readonly opened = computed(() => (this.isHandset() ? this.drawerOpen() : true));
  protected readonly rail = computed(() => this.collapsed() && !this.isHandset());
  protected readonly toggleExpanded = computed(() =>
    this.isHandset() ? this.drawerOpen() : !this.collapsed(),
  );

  protected toggle(): void {
    if (this.isHandset()) {
      this.drawerOpen.update((open) => !open);
    } else {
      this.collapsed.update((collapsed) => !collapsed);
    }
  }

  protected onDrawerOpenedChange(open: boolean): void {
    if (this.isHandset()) {
      this.drawerOpen.set(open);
    }
  }
}
