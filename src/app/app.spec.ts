import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('renders the router outlet', () => {
    // Given the App component is created
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // When the template is inspected
    const compiled = fixture.nativeElement as HTMLElement;
    // Then a <router-outlet> is present
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
