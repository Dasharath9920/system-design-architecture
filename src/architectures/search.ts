import { families } from './registry';
export interface ArchitectureMatch {
  family: string;
  company: string;
  scenario?: string;
  label: string;
  detail: string;
  icon: string;
}
const scenarioIds: Record<string, string[]> = {
  social: ['home-feed', 'create-post', 'celebrity-post'],
  chat: ['send-message', 'group-message', 'reconnect'],
  video: ['playback', 'seek', 'upload'],
  ride: ['request-ride', 'location-update', 'complete-trip'],
  commerce: ['place-order', 'search-product', 'add-cart'],
  search: ['search-query', 'crawl-index', 'autocomplete'],
  files: ['upload-file', 'sync-device', 'resolve-conflict'],
  music: ['play-song', 'playlist', 'recommendations'],
  gaming: ['join-match', 'movement', 'match-result'],
  payments: ['make-payment', 'capture', 'refund', 'reconcile'],
};
export function searchArchitectures(query: string): ArchitectureMatch[] {
  const normalized = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const terms = normalized
    .split(/\s+/)
    .filter(
      (t) => t && !['how', 'does', 'a', 'the', 'work', 'works', 'scale', 'system'].includes(t),
    );
  if (!terms.length) return [];
  const matches: ArchitectureMatch[] = [];
  for (const f of families) {
    const matchedCompany = f.companies.find(
      (c) => terms.includes(c.id) || terms.includes(c.name.toLowerCase().split(/[\s/-]/)[0]),
    );
    const haystack = [
      f.name,
      f.id,
      f.description,
      ...f.companies.map((c) => c.name),
      ...f.scenarioNames,
      ...f.keyChallenges,
    ]
      .join(' ')
      .toLowerCase();
    if (!matchedCompany && !terms.every((t) => haystack.includes(t))) continue;
    const company = matchedCompany?.available ? matchedCompany.id : 'generic';
    const familyWords = new Set(`${f.name} ${f.id}`.toLowerCase().split(/[^a-z0-9]+/));
    const scenarioIndex = f.scenarioNames.findIndex((name) =>
      terms.some((t) => t.length > 3 && !familyWords.has(t) && name.toLowerCase().includes(t)),
    );
    matches.push({
      family: f.id,
      company,
      scenario: scenarioIds[f.id][Math.max(0, scenarioIndex)],
      label: matchedCompany?.available ? matchedCompany.name : f.name,
      detail:
        matchedCompany && !matchedCompany.available
          ? `${matchedCompany.name} research planned · explore the generic ${f.name} pattern`
          : f.scenarioNames[Math.max(0, scenarioIndex)] + ' · ' + f.description,
      icon: f.icon,
    });
  }
  return matches.slice(0, 5);
}
