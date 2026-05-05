import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type Data } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1>{{ title() }}</h1>`,
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
export class Placeholder {
  readonly #data = toSignal<Data, Data>(inject(ActivatedRoute).data, {
    initialValue: {},
  });

  protected readonly title = computed<string>(() => {
    const value = this.#data()['title'];
    return typeof value === 'string' ? value : 'Plansecur';
  });
}
