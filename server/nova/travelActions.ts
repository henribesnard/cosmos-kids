/**
 * Deterministic travel-action computation for Nova answers.
 *
 * The LLM draft only *suggests* actions (and small models often omit them),
 * so the server computes the "Emmène-moi voir …" buttons itself:
 *
 * 1. From the catalog sources actually cited by the retained claims
 *    (a `cat-mars` source maps to the object `mars`).
 * 2. From object names present in the question or the retained claims,
 *    in FR and EN, with variants — all derived from the catalogs in
 *    src/data (names, distinctive name words, entry ids), never from a
 *    hand-written duplicate list.
 *
 * Every candidate id goes through isValidTravelDestination. Max 2 actions,
 * ordered by relevance (main object of the question first), no duplicates.
 */

import { getCatalogEntries } from './catalogSearch';
import { isValidTravelDestination } from './validation';

export interface TravelAction {
  readonly kind: 'travel';
  readonly destinationId: string;
  readonly label: string;
}

export interface RetainedClaim {
  readonly text: string;
  readonly sourceIds: readonly string[];
}

interface DestinationInfo {
  readonly name: { readonly fr: string; readonly en: string };
  readonly aliases: readonly string[];
}

interface DestinationIndex {
  readonly byId: ReadonlyMap<string, DestinationInfo>;
}

/** Lowercase, strip diacritics (combining marks), collapse non-alphanumerics. */
export function normalizeText(text: string): string {
  let stripped = '';
  for (const ch of text.toLowerCase().normalize('NFD')) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x0300 && cp <= 0x036f) continue; // combining diacritical marks
    stripped += ch;
  }
  return stripped.replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Word-boundary lookup of a normalized alias inside space-padded text. */
function indexOfAlias(paddedNorm: string, alias: string): number {
  return paddedNorm.indexOf(' ' + alias + ' ');
}

let indexPromise: Promise<DestinationIndex> | null = null;

async function buildIndex(): Promise<DestinationIndex> {
  const entries = await getCatalogEntries();

  // Word frequency across destinations, so that only distinctive words
  // become aliases ("galaxie" is shared by several entries and is dropped,
  // "andromede" belongs to a single entry and is kept).
  const wordCount = new Map<string, number>();
  const perEntry: Array<{ id: string; name: { fr: string; en: string }; words: Set<string>; idNorm: string }> = [];

  for (const entry of entries) {
    if (entry.kind === 'journey') continue; // journeys are not destinations
    const words = new Set<string>();
    for (const name of [entry.name.fr, entry.name.en]) {
      for (const word of normalizeText(name).split(' ')) {
        if (word.length >= 5) {
          words.add(word);
          wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
        }
      }
    }
    perEntry.push({ id: entry.id, name: entry.name, words, idNorm: normalizeText(entry.id) });
  }

  const byId = new Map<string, DestinationInfo>();
  for (const { id, name, words, idNorm } of perEntry) {
    const aliases = new Set<string>();
    // Full localized names always match
    for (const n of [normalizeText(name.fr), normalizeText(name.en)]) {
      if (n) aliases.add(n);
    }
    // The entry id (normalized) covers short forms: "iss" matches "l'ISS",
    // "sgr a" matches "Sgr A*", "orion nebula" matches the id form.
    if (idNorm.length >= 3) aliases.add(idNorm);
    // Distinctive name words (unique to this destination)
    for (const word of words) {
      if ((wordCount.get(word) ?? 0) === 1) aliases.add(word);
    }
    byId.set(id, { name, aliases: [...aliases] });
  }

  return { byId };
}

async function getIndex(): Promise<DestinationIndex> {
  if (!indexPromise) indexPromise = buildIndex();
  return indexPromise;
}

/** Destinations mentioned in `text`, ordered by first-mention position. */
function matchDestinations(
  text: string,
  index: DestinationIndex,
): Array<{ destinationId: string; position: number }> {
  const padded = ' ' + normalizeText(text) + ' ';
  const found = new Map<string, number>();
  for (const [id, dest] of index.byId) {
    for (const alias of dest.aliases) {
      const idx = indexOfAlias(padded, alias);
      if (idx >= 0 && (found.get(id) === undefined || idx < found.get(id)!)) {
        found.set(id, idx);
      }
    }
  }
  return [...found.entries()]
    .map(([destinationId, position]) => ({ destinationId, position }))
    .sort((a, b) => a.position - b.position);
}

export interface ComputeTravelActionsOptions {
  /**
   * For 'unknown' answers: only propose an action when the object is clearly
   * the subject of the question (claims/cited sources are not trusted).
   */
  readonly onlyIfInQuestion?: boolean;
}

/**
 * Compute up to 2 travel actions for a Nova answer.
 *
 * Order: objects named in the question (by position), then catalog sources
 * cited by the retained claims, then objects named in the retained claims.
 */
export async function computeTravelActions(
  question: string,
  retainedClaims: readonly RetainedClaim[],
  locale: 'fr' | 'en',
  options: ComputeTravelActionsOptions = {},
): Promise<TravelAction[]> {
  const index = await getIndex();

  const questionMatches = matchDestinations(question, index);
  const claimsText = retainedClaims.map((c) => c.text).join(' ');
  const claimMatches = options.onlyIfInQuestion ? [] : matchDestinations(claimsText, index);

  const citedIds = options.onlyIfInQuestion
    ? []
    : retainedClaims
        .flatMap((c) => c.sourceIds)
        .filter((id) => id.startsWith('cat-'))
        .map((id) => id.slice('cat-'.length));

  const ordered: string[] = [];
  const push = (id: string): void => {
    if (ordered.includes(id)) return;
    if (!index.byId.has(id)) return;
    if (!isValidTravelDestination(id)) return;
    ordered.push(id);
  };

  for (const m of questionMatches) push(m.destinationId);
  for (const id of citedIds) push(id);
  for (const m of claimMatches) push(m.destinationId);

  return ordered.slice(0, 2).map((id) => {
    const dest = index.byId.get(id)!;
    return {
      kind: 'travel' as const,
      destinationId: id,
      label: locale === 'fr'
        ? `Emmène-moi voir ${dest.name.fr}`
        : `Take me to ${dest.name.en}`,
    };
  });
}
