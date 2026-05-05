import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <h1>Welcome to Plansecur</h1> `,
  styles: `
    :host {
      display: block;
      padding: 1.5rem;
    }

    h1 {
      font: var(--mat-sys-headline-medium);
      margin: 0;
    }
  `,
})
export class Placeholder {}
