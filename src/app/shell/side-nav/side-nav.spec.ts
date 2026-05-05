import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { NAV_ITEMS } from '../nav-items';
import { SideNav } from './side-nav';

@Component({
  selector: 'app-host',
  imports: [SideNav],
  template: `<app-side-nav [collapsed]="collapsed" />`,
})
class Host {
  collapsed = false;
}

const setup = async (collapsed = false, route: string | null = null) => {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', children: [] }])],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.collapsed = collapsed;
  fixture.detectChanges();
  if (route) {
    await TestBed.inject(Router).navigateByUrl(route);
    fixture.detectChanges();
  }
  return fixture;
};

describe('SideNav', () => {
  describe('Side navigation displays placeholder items', () => {
    it('Scenario: Items render with icon and label', async () => {
      // Given the side nav is in expanded mode
      const fixture = await setup(false);
      const root = fixture.nativeElement as HTMLElement;
      // Then each NAV_ITEMS entry renders an icon and a visible label in declared order
      const links = Array.from(root.querySelectorAll('nav a'));
      expect(links).toHaveLength(NAV_ITEMS.length);
      links.forEach((link, index) => {
        const item = NAV_ITEMS[index];
        expect(link.querySelector('mat-icon')?.textContent?.trim()).toBe(item.icon);
        expect(link.querySelector('.label')?.textContent?.trim()).toBe(item.label);
      });
    });

    it('Scenario: Items render only the icon in rail mode', async () => {
      // Given the side nav is in rail (collapsed) mode
      const fixture = await setup(true);
      const root = fixture.nativeElement as HTMLElement;
      // Then each link still has its icon and per-item aria-label equal to the label
      const links = Array.from(root.querySelectorAll('nav a'));
      expect(links).toHaveLength(NAV_ITEMS.length);
      const labels = root.querySelectorAll('.label');
      const labelStyles = Array.from(labels).map(
        (label) => getComputedStyle(label as HTMLElement).display,
      );
      // Every label is hidden in rail mode
      expect(labelStyles.every((display) => display === 'none')).toBe(true);
      links.forEach((link, index) => {
        expect(link.getAttribute('aria-label')).toBe(NAV_ITEMS[index].label);
      });
    });

    it('Scenario: Active item is announced', async () => {
      // Given the user has navigated to the first placeholder route
      const target = `/${NAV_ITEMS[0].route}`;
      const fixture = await setup(false, target);
      const root = fixture.nativeElement as HTMLElement;
      // Then exactly one link carries aria-current="page" matching that route
      const active = root.querySelectorAll('nav a[aria-current="page"]');
      expect(active.length).toBe(1);
      expect((active[0] as HTMLAnchorElement).getAttribute('href')).toBe(target);
    });
  });

  describe('Side navigation accessible name', () => {
    it('Scenario: Side navigation is wrapped in a labelled nav landmark', async () => {
      // Given the side nav is rendered
      const fixture = await setup();
      const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
      // Then the nav has accessible name "Primary"
      expect(nav.getAttribute('aria-label')).toBe('Primary');
    });
  });
});
