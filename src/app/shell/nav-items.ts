export interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Overview', icon: 'dashboard', route: 'overview' },
  { label: 'Library', icon: 'folder', route: 'library' },
  { label: 'Settings', icon: 'settings', route: 'settings' },
];
