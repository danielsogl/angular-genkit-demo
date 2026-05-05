import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { DashboardShell } from './dashboard-shell';

class FakeBreakpointObserver {
  readonly state$ = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {},
  });
  observe(): BehaviorSubject<BreakpointState> {
    return this.state$;
  }
  setHandset(matches: boolean): void {
    this.state$.next({ matches, breakpoints: {} });
  }
  isMatched(): boolean {
    return this.state$.value.matches;
  }
}

const setup = (initialHandset = false) => {
  const observer = new FakeBreakpointObserver();
  observer.setHandset(initialHandset);
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: BreakpointObserver, useValue: observer }],
  });
  const fixture = TestBed.createComponent(DashboardShell);
  fixture.detectChanges();
  return { fixture, observer };
};

const getToggle = (fixture: ReturnType<typeof setup>['fixture']) =>
  fixture.nativeElement.querySelector(
    'button[aria-label="Toggle navigation"]',
  ) as HTMLButtonElement;

describe('DashboardShell', () => {
  describe('Application shell wraps every routed view', () => {
    it('Scenario: Routed view is wrapped in the shell', () => {
      // Given the shell is rendered
      const { fixture } = setup();
      const root = fixture.nativeElement as HTMLElement;
      // Then header, primary nav, and main landmarks are present
      expect(root.querySelector('header')).not.toBeNull();
      const nav = root.querySelector('nav[aria-label="Primary"]');
      expect(nav).not.toBeNull();
      expect(root.querySelector('main')).not.toBeNull();
      expect(root.querySelector('router-outlet')).not.toBeNull();
    });
  });

  describe('Side navigation can collapse to a rail', () => {
    it('Scenario: Toggle from expanded to collapsed', () => {
      // Given the shell is on a desktop viewport
      const { fixture } = setup(false);
      const toggle = getToggle(fixture);
      const sidenav = fixture.nativeElement.querySelector('mat-sidenav') as HTMLElement;
      expect(sidenav.classList.contains('rail')).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      // When the user activates the toggle
      toggle.click();
      fixture.detectChanges();
      // Then the sidenav switches to rail mode and aria-expanded is false
      expect(sidenav.classList.contains('rail')).toBe(true);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('Scenario: Toggle from collapsed to expanded', () => {
      // Given the sidenav is collapsed
      const { fixture } = setup(false);
      const toggle = getToggle(fixture);
      toggle.click();
      fixture.detectChanges();
      const sidenav = fixture.nativeElement.querySelector('mat-sidenav') as HTMLElement;
      expect(sidenav.classList.contains('rail')).toBe(true);
      // When the user activates the toggle again
      toggle.click();
      fixture.detectChanges();
      // Then the sidenav is expanded and aria-expanded is true
      expect(sidenav.classList.contains('rail')).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Side navigation adapts to small viewports', () => {
    it('Scenario: Drawer is closed by default on handset', () => {
      // Given the shell renders on a handset viewport
      const { fixture } = setup(true);
      const toggle = getToggle(fixture);
      // Then the drawer is closed (aria-expanded=false on the toggle)
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      // When the user activates the toggle
      toggle.click();
      fixture.detectChanges();
      // Then the drawer is open
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Shell meets accessibility minimums', () => {
    it('Scenario: Landmarks are present', () => {
      // Given the shell is rendered
      const { fixture } = setup();
      const root = fixture.nativeElement as HTMLElement;
      // Then exactly one header, one nav with accessible name, and one main exist
      expect(root.querySelectorAll('header').length).toBe(1);
      const navs = root.querySelectorAll('nav[aria-label="Primary"]');
      expect(navs.length).toBe(1);
      expect(root.querySelectorAll('main').length).toBe(1);
    });
  });
});
