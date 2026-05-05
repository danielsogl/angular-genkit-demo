export interface NavItem {
  readonly route: string;
  readonly label: string;
  readonly icon: string;
  readonly aliases: readonly string[];
}

export const NAV_ITEMS = [
  {
    route: '',
    label: 'Übersicht',
    icon: 'dashboard',
    aliases: ['Übersicht', 'Startseite', 'Home'],
  },
  {
    route: 'depot',
    label: 'Depot',
    icon: 'account_balance',
    aliases: ['Depot', 'Portfolio'],
  },
  {
    route: 'kundenakte',
    label: 'Kundenakte',
    icon: 'folder_shared',
    aliases: ['Kundenakte', 'Kundendossier'],
  },
  {
    route: 'unterlagen',
    label: 'Unterlagen',
    icon: 'folder',
    aliases: ['Unterlagen', 'Dokumente', 'Library'],
  },
  {
    route: 'einstellungen',
    label: 'Einstellungen',
    icon: 'settings',
    aliases: ['Einstellungen', 'Settings'],
  },
] as const satisfies readonly NavItem[];

export type NavItemRoute = (typeof NAV_ITEMS)[number]['route'];

export const navigationTargets = NAV_ITEMS.map((item) => item.route) as unknown as readonly [
  NavItemRoute,
  ...NavItemRoute[],
];

export function buildNavigateToolDescription(items: readonly NavItem[]): string {
  const targets = items
    .map((item) => {
      const aliases = item.aliases.join(', ');
      const segment = item.route === '' ? '/ (Startseite)' : `/${item.route}`;
      return `- ${item.label} (${segment}) — Synonyme: ${aliases}`;
    })
    .join('\n');

  return [
    'Rufe dieses Tool auf, wenn der Berater darum bittet, einen Bereich zu öffnen, anzuzeigen oder dorthin zu navigieren — etwa mit Verben wie "öffne", "zeige", "gehe zu" oder "navigiere".',
    'Wähle target ausschließlich aus der folgenden Liste. Verwende exakt das angegebene Routensegment, niemals einen Synonym-Text.',
    targets,
    'Rufe das Tool höchstens einmal pro Antwort auf und bestätige die Navigation in einem kurzen deutschen Satz.',
  ].join('\n\n');
}
