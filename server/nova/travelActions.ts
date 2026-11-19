/**
 * Deterministic travel-action computation for Nova answers.
 *
 * The LLM draft only *suggests* actions (and small models often omit them),
 * so the server computes the "Emmène-moi voir …" buttons itself:
 *
 * 1. From the catalog sources actually cited by the retained claims
 *    (a `cat-mars` source maps to the object `mars`).
 * 2. From object names present in the QUESTION, in FR and EN, with
 *    variants — all derived from the catalogs in src/data (full names,
 *    entry ids, distinctive proper-noun words), never from a hand-written
 *    duplicate list.
 *
 * Lot 2 rule (false positives such as ISS → lmc): an object is proposed only
 * if it is named in the question or if it is the catalog source of a retained
 * claim. Names appearing in the claim text alone are not enough, and
 * everyday words ("large", "grand", "cloud", "station"…) are never aliases.
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

/**
 * Everyday FR/EN words that appear in some object names but must never
 * identify an object on their own ("a large spacecraft", "une grande
 * étoile", "a cloud of gas"…). Normalized (lowercase, no diacritics).
 */
export const COMMON_WORDS: ReadonlySet<string> = new Set([
  // size / shape
  'grand', 'grande', 'grands', 'grandes', 'large', 'petit', 'petite', 'small', 'great', 'giant', 'geant',
  // generic astronomy words
  'nuage', 'nuages', 'cloud', 'clouds', 'nebuleuse', 'nebula', 'galaxie', 'galaxy', 'etoile', 'etoiles',
  'star', 'stars', 'amas', 'cluster', 'planete', 'planet', 'station', 'stations', 'spatiale', 'spatial',
  'space', 'internationale', 'international', 'magellanic',
  // everyday nouns found in nebula names
  'aigle', 'eagle', 'crabe', 'anneau', 'cheval', 'chevaux', 'horse', 'triangle', 'omega', 'carene',
  // articles that might slip through
  'les', 'the',
]);

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
        if (word.length >= 5 && !COMMON_WORDS.has(word)) {
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
    // Distinctive proper-noun words (unique to this destination, never an
    // everyday word — see COMMON_WORDS)
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
 * cited by the retained claims. Nothing else qualifies.
 */
/**
 * Destinations a travel action may point to for this answer: named in the
 * question, or catalog source of a retained claim. Used to filter actions
 * proposed by the model as well.
 */
export async function allowedTravelDestinations(
  question: string,
  retainedClaims: readonly RetainedClaim[],
  options: ComputeTravelActionsOptions = {},
): Promise<Set<string>> {
  const index = await getIndex();
  const allowed = new Set(matchDestinations(question, index).map((m) => m.destinationId));
  if (!options.onlyIfInQuestion) {
    for (const id of retainedClaims.flatMap((c) => c.sourceIds)) {
      if (id.startsWith('cat-')) allowed.add(id.slice('cat-'.length));
    }
  }
  return allowed;
}

export async function computeTravelActions(
  question: string,
  retainedClaims: readonly RetainedClaim[],
  locale: 'fr' | 'en',
  options: ComputeTravelActionsOptions = {},
): Promise<TravelAction[]> {
  const index = await getIndex();

  const questionMatches = matchDestinations(question, index);

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
