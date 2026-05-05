import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { NAV_ITEMS } from '../shared/nav-items';
import { buildShellRoutes } from './app.routes';

describe('Application generates dashboard routes from NAV_ITEMS', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('Scenario: Each NAV_ITEMS entry resolves to a route with its German heading', async () => {
    // Given the dashboard children generated from NAV_ITEMS
    TestBed.configureTestingModule({ providers: [provideRouter(buildShellRoutes(NAV_ITEMS))] });
    const harness = await RouterTestingHarness.create();

    for (const item of NAV_ITEMS) {
      // When the advisor navigates to the item's route
      await harness.navigateByUrl(`/${item.route}`);
      // Then the routed view shows an <h1> whose text equals item.label
      const heading = harness.routeNativeElement?.querySelector('h1');
      expect(heading?.textContent?.trim()).toBe(item.label);
    }
  });

  it('Scenario: Initial NAV_ITEMS resolves to the five expected destinations', async () => {
    // Given the initial NAV_ITEMS (Übersicht, Depot, Kundenakte, Unterlagen, Einstellungen)
    TestBed.configureTestingModule({ providers: [provideRouter(buildShellRoutes(NAV_ITEMS))] });
    const harness = await RouterTestingHarness.create();
    const expected: readonly (readonly [string, string])[] = [
      ['/', 'Übersicht'],
      ['/depot', 'Depot'],
      ['/kundenakte', 'Kundenakte'],
      ['/unterlagen', 'Unterlagen'],
      ['/einstellungen', 'Einstellungen'],
    ];

    for (const [url, expectedHeading] of expected) {
      // When navigating to each German route in turn
      await harness.navigateByUrl(url);
      // Then the routed view renders the expected German heading
      const heading = harness.routeNativeElement?.querySelector('h1');
      expect(heading?.textContent?.trim()).toBe(expectedHeading);
    }
  });

  it('Scenario: Default route matches the first NAV_ITEMS entry', async () => {
    // Given the default route is opened
    TestBed.configureTestingModule({ providers: [provideRouter(buildShellRoutes(NAV_ITEMS))] });
    const harness = await RouterTestingHarness.create();
    // When navigating to the application root
    await harness.navigateByUrl('/');
    // Then the heading equals NAV_ITEMS[0].label (initially "Übersicht")
    const heading = harness.routeNativeElement?.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe(NAV_ITEMS[0].label);
  });

  it('Scenario: buildShellRoutes maps every NAV_ITEMS entry one-to-one', () => {
    // Given the factory under test
    // When invoked with NAV_ITEMS
    const generated = buildShellRoutes(NAV_ITEMS);
    // Then each item produces exactly one route with the matching path and title
    expect(generated).toHaveLength(NAV_ITEMS.length);
    for (let i = 0; i < NAV_ITEMS.length; i++) {
      expect(generated[i].path).toBe(NAV_ITEMS[i].route);
      expect(generated[i].data?.['title']).toBe(NAV_ITEMS[i].label);
      expect(typeof generated[i].loadComponent).toBe('function');
    }
  });
});
