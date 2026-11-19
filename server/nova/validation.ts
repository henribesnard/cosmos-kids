/**
 * Input validation and privacy detection for Nova requests.
 */

/* ------------------------------------------------------------------ */
/*  Known IDs from the app (whitelist for context validation)          */
/* ------------------------------------------------------------------ */

const KNOWN_VIEWS = new Set([
  'landing', 'earth', 'constellations', 'solar', 'planet',
  'milkyway', 'localgroup', 'deepsky',
]);

const KNOWN_OBJECT_IDS = new Set([
  'sun', 'moon', 'mercury', 'venus', 'earth', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune',
  'sgr-a', 'orion-nebula', 'eagle-nebula', 'crab-nebula',
  'carina-nebula', 'ring-nebula', 'horsehead-nebula',
  'andromeda', 'triangulum', 'lmc', 'smc',
  'omega-centauri', 'pleiades',
]);

const KNOWN_JOURNEY_IDS = new Set([
  'earth-to-iss', 'earth-to-moon', 'earth-to-mars',
  'earth-to-outer-planets', 'milkyway-to-andromeda',
  'into-a-black-hole', 'constellations-from-earth',
]);

const KNOWN_READING_LEVELS = new Set(['simple', 'curious', 'expert']);

/* ------------------------------------------------------------------ */
/*  Request schema                                                     */
/* ------------------------------------------------------------------ */

export interface NovaRequest {
  question: string;
  context: {
    locale: 'fr' | 'en';
    view: string;
    selectedObjectId: string | null;
    activeJourneyId: string | null;
    readingLevel: 'simple' | 'curious' | 'expert';
  };
  history: Array<{ role: string; text: string }>;
}

export function validateRequest(body: unknown): { ok: true; data: NovaRequest } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const obj = body as Record<string, unknown>;

  // Question
  if (typeof obj.question !== 'string' || obj.question.trim().length === 0) {
    return { ok: false, error: 'question must be a non-empty string.' };
  }
  if (obj.question.length > 500) {
    return { ok: false, error: 'question must be at most 500 characters.' };
  }

  // Context
  if (typeof obj.context !== 'object' || obj.context === null) {
    return { ok: false, error: 'context must be an object.' };
  }
  const ctx = obj.context as Record<string, unknown>;

  if (ctx.locale !== 'fr' && ctx.locale !== 'en') {
    return { ok: false, error: 'context.locale must be "fr" or "en".' };
  }
  if (typeof ctx.view !== 'string') {
    return { ok: false, error: 'context.view must be a string.' };
  }
  // View can be a URL path or a view name — validate the view name part
  const viewName = ctx.view.startsWith('/') ? '' : ctx.view;
  if (viewName && !KNOWN_VIEWS.has(viewName)) {
    return { ok: false, error: `Unknown view: ${viewName}` };
  }

  if (ctx.selectedObjectId !== null && typeof ctx.selectedObjectId !== 'string') {
    return { ok: false, error: 'context.selectedObjectId must be a string or null.' };
  }
  if (typeof ctx.selectedObjectId === 'string' && !KNOWN_OBJECT_IDS.has(ctx.selectedObjectId)) {
    return { ok: false, error: `Unknown selectedObjectId: ${ctx.selectedObjectId}` };
  }

  if (ctx.activeJourneyId !== null && typeof ctx.activeJourneyId !== 'string') {
    return { ok: false, error: 'context.activeJourneyId must be a string or null.' };
  }
  if (typeof ctx.activeJourneyId === 'string' && !KNOWN_JOURNEY_IDS.has(ctx.activeJourneyId)) {
    return { ok: false, error: `Unknown activeJourneyId: ${ctx.activeJourneyId}` };
  }

  if (!KNOWN_READING_LEVELS.has(ctx.readingLevel as string)) {
    return { ok: false, error: 'context.readingLevel must be "simple", "curious", or "expert".' };
  }

  // History
  if (!Array.isArray(obj.history)) {
    return { ok: false, error: 'history must be an array.' };
  }
  for (const entry of obj.history) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: 'Each history entry must be an object.' };
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.role !== 'string' || typeof e.text !== 'string') {
      return { ok: false, error: 'Each history entry must have role and text strings.' };
    }
  }

  return {
    ok: true,
    data: {
      question: obj.question as string,
      context: {
        locale: ctx.locale as 'fr' | 'en',
        view: ctx.view as string,
        selectedObjectId: (ctx.selectedObjectId as string | null) ?? null,
        activeJourneyId: (ctx.activeJourneyId as string | null) ?? null,
        readingLevel: ctx.readingLevel as 'simple' | 'curious' | 'expert',
      },
      history: (obj.history as Array<{ role: string; text: string }>).slice(-6),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Privacy detection & masking                                       */
/* ------------------------------------------------------------------ */

/*
 * Two levels:
 * - 'personal': full name, address or place of residence, school, phone,
 *   e-mail → Nova answers with the privacy reminder only (nothing is sent to
 *   the model provider).
 * - 'first-name': a first name alone ("je m'appelle Léo, pourquoi…") → the
 *   name is masked before anything is sent to the provider, Nova answers the
 *   question normally and adds a short reminder.
 *
 * Apostrophes: both ' and ’ are accepted everywhere.
 */

const APOS = "['’]";
const NAME_WORD = "[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ-]*";

/** Name introductions, FR and EN. The name follows the match. */
const NAME_INTRO_RE = new RegExp(
  '(?:' + [
    `\\bje\\s+m${APOS}\\s*appelle`,
    `\\bj${APOS}\\s*m${APOS}\\s*appelle`,
    `\\bmon\\s+(?:nom|pr[ée]nom)\\s+(?:c${APOS}\\s*est|est)`,
    `\\bmoi\\s*,?\\s+c${APOS}\\s*est`,
    `\\bmy\\s+(?:first\\s+|full\\s+|last\\s+)?name\\s*(?:is|'s|’s)`,
    `\\bi${APOS}m\\s+called`,
    `\\bi\\s+am\\s+called`,
    `\\bcall\\s+me`,
    `\\bmes\\s+amis\\s+m${APOS}\\s*appellent`,
  ].join('|') + `)\\s*:?\\s+(${NAME_WORD})(?:\\s+(${NAME_WORD}))?`,
  'iu',
);

/**
 * Words that can follow a first name without being a surname
 * ("je m'appelle Léo et…", "my name is Sam and…").
 */
const NOT_A_SURNAME = new Set([
  'et', 'je', 'j', 'jai', 'mais', 'donc', 'alors', 'pourquoi', 'comment', 'quand', 'quoi', 'combien',
  'est', 'ce', 'c', 'qu', 'que', 'qui', 'où', 'ou', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'à', 'a', 'au', 'aux', 'en', 'dans', 'sur', 'avec',
  'pour', 'par', 'sans', 'moi', 'toi', 'ai', 'suis', 'veux', 'voudrais', 'aime', 'adore', 'dis', 'dis-moi',
  'peux', 'peux-tu', 'sais', 'sais-tu', 'bonjour', 'salut', 'coucou', 'merci', 'svp', 'stp', 'oui', 'non',
  'and', 'but', 'so', 'why', 'how', 'what', 'when', 'where', 'who', 'which', 'is', 'are', 'was', 'i', 'im',
  'you', 'he', 'she', 'we', 'they', 'the', 'an', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'from',
  'am', 'want', 'like', 'love', 'have', 'can', 'could', 'do', 'does', 'tell', 'please', 'hi', 'hello',
  'thanks', 'yes', 'no', 'ans', 'years', 'year', 'old', 'aussi', 'too', 'also',
]);

/** Address / place of residence (but never "j'habite sur Terre"). */
const RESIDENCE_PATTERNS: readonly RegExp[] = [
  // FR: j'habite à / au / aux / en / dans + a place, près de, rue…, a number
  new RegExp(`\\bj${APOS}\\s*habite\\s+(?:à|a|au|aux|en|près\\s+de|pres\\s+de|vers|rue|avenue|boulevard|chemin|impasse|place|\\d)`, 'iu'),
  new RegExp(`\\bj${APOS}\\s*habite\\s+dans\\s+(?!l${APOS}\\s*espace|la\\s+galaxie|la\\s+voie\\s+lact|le\\s+syst[èe]me\\s+solaire|l${APOS}\\s*univers|une\\s+galaxie)`, 'iu'),
  /\bje\s+vis\s+(?:à|a|au|aux|en)\s/iu,
  /\b(?:mon|notre)\s+adresse\b/iu,
  // EN: I live in / at / near (but not "on Earth", "on a planet")
  /\bi\s+live\s+(?:in|at|near|next\s+to|close\s+to)\s+(?!space\b|the\s+milky\s+way|the\s+solar\s+system|a\s+galaxy|the\s+universe)/iu,
  /\bi\s+live\s+on\s+(?!earth\b|planet\s+earth|the\s+earth|a\s+planet|this\s+planet|the\s+third\s+planet)\S/iu,
  /\bmy\s+(?:home\s+)?address\b/iu,
  // Street address (number + street type)
  /\b\d{1,5}\s*(?:bis|ter)?,?\s+(?:rue|avenue|av\.|boulevard|bd|impasse|chemin|place|allée|allee|route|street|st\.|road|rd\.|drive|lane|avenue)\b/iu,
  // Postal code + city (case-sensitive city initial)
  /\b\d{5}\s+[A-ZÀ-Ü][a-zà-ü]+/u,
];

/** School and class, FR and EN. */
const SCHOOL_PATTERNS: readonly RegExp[] = [
  /\b(?:mon|ma)\s+(?:école|ecole|collège|college|lycée|lycee|maternelle|classe\s+(?:de|du|à|a|au))\b/iu,
  /\bje\s+suis\s+(?:en|au)\s+(?:cp|ce1|ce2|cm1|cm2|6e|6ème|6eme|5e|5ème|5eme|4e|4ème|4eme|3e|3ème|3eme|sixième|cinquième|quatrième|troisième|seconde)\s+(?:à|a|au|aux|chez|dans)\s+\S/iu,
  new RegExp(`\\bje\\s+vais\\s+à\\s+l${APOS}\\s*[ée]cole\\s+(?!demain|aujourd|ce\\s+matin|le\\s+matin)\\S`, 'iu'),
  /\bj['’]\s*(?:étudie|etudie)\s+(?:à|a|au)\b/iu,
  /\bmy\s+(?:school|class|teacher)\s+(?:is|'s|’s|called|named)\b/iu,
  /\bmy\s+school\b/iu,
  /\bi\s+(?:go\s+to|study\s+at|attend)\s+(?!school\b|bed\b|space\b|the\s+moon|mars)[A-Z]?\S*\s*(?:school|academy|elementary|primary|middle|high)\b/iu,
  /\bi(?:'m|’m|\s+am)\s+in\s+(?:\d{1,2}(?:st|nd|rd|th)?\s+grade|grade\s+\d{1,2}|year\s+\d{1,2})\s+at\s+\S/iu,
];

/** Contact details. */
const CONTACT_PATTERNS: readonly RegExp[] = [
  /\b0[1-9](?:[\s.-]?\d{2}){4}\b/,
  /\+\d{1,3}[\s.-]?\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];

export type PersonalInfoLevel = 'none' | 'first-name' | 'personal';

export interface PersonalInfoAnalysis {
  readonly level: PersonalInfoLevel;
  /** Text safe to send to the provider (first name replaced by a placeholder). */
  readonly masked: string;
}

export const FIRST_NAME_PLACEHOLDER = '[prénom]';

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/['’]/g, '');
}

export function analyzePersonalInfo(text: string): PersonalInfoAnalysis {
  const all = [...RESIDENCE_PATTERNS, ...SCHOOL_PATTERNS, ...CONTACT_PATTERNS];
  if (all.some((pattern) => pattern.test(text))) {
    return { level: 'personal', masked: maskPersonalInfo(text) };
  }

  const nameMatch = NAME_INTRO_RE.exec(text);
  if (nameMatch) {
    const first = nameMatch[1] ?? '';
    const second = nameMatch[2];
    const firstIsWord = !NOT_A_SURNAME.has(normalizeWord(first));
    if (!firstIsWord) return { level: 'none', masked: text };
    if (second && !NOT_A_SURNAME.has(normalizeWord(second))) {
      return { level: 'personal', masked: maskPersonalInfo(text) };
    }
    return { level: 'first-name', masked: maskFirstName(text) };
  }

  return { level: 'none', masked: text };
}

export function containsPersonalInfo(text: string): boolean {
  return analyzePersonalInfo(text).level !== 'none';
}

/** Replace every introduced first name by a neutral placeholder. */
export function maskFirstName(text: string): string {
  const global = new RegExp(NAME_INTRO_RE.source, 'giu');
  return text.replace(global, (match: string, first: string) => {
    if (NOT_A_SURNAME.has(normalizeWord(first))) return match;
    const idx = match.lastIndexOf(first);
    return match.slice(0, idx) + FIRST_NAME_PLACEHOLDER + match.slice(idx + first.length);
  });
}

export function maskPersonalInfo(text: string): string {
  let masked = maskFirstName(text);
  for (const pattern of [...RESIDENCE_PATTERNS, ...SCHOOL_PATTERNS, ...CONTACT_PATTERNS]) {
    masked = masked.replace(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'), '[MASQUÉ]');
  }
  // A surname right after the placeholder is masked as well.
  return masked.replace(new RegExp(`\\[prénom\\]\\s+(${NAME_WORD})`, 'gu'), (m, word: string) =>
    NOT_A_SURNAME.has(normalizeWord(word)) ? m : '[MASQUÉ]');
}

/* ------------------------------------------------------------------ */
/*  Valid travel destinations (from routeForDestination)              */
/* ------------------------------------------------------------------ */

const VALID_TRAVEL_DESTINATIONS = new Set([
  ...KNOWN_OBJECT_IDS,
  'iss', 'night-sky', 'solar', 'milkyway', 'localgroup',
  // Constellation abbreviations — large set, we validate by pattern
]);

// Constellation abbreviations: 3-4 letter codes like Ori, UMa, Gem, CMa, etc.
const CONSTELLATION_ABBR_RE = /^[A-Z][A-Za-z]{2,3}$/;

export function isValidTravelDestination(id: string): boolean {
  return VALID_TRAVEL_DESTINATIONS.has(id) || CONSTELLATION_ABBR_RE.test(id);
}
