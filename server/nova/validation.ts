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

const PRIVACY_PATTERNS: readonly RegExp[] = [
  // Full name patterns (first + last)
  /\b(?:je m'appelle|mon nom est|my name is|i'm called|i am)\s+[A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][a-zà-ü]+/i,
  // Address patterns (number + optional words + street type)
  /\b\d{1,5}\s+\w*\s*(rue|avenue|boulevard|street|road|drive|impasse|chemin|place)\b/i,
  /\b(j'habite|i live at|my address|mon adresse)\b/i,
  /\b\d{5}\s+[A-ZÀ-Ü][a-zà-ü]+/,  // Postal code + city
  // School name
  /\b(mon école|my school|j'étudie à|i study at|mon collège|mon lycée)\b/i,
  // Phone number (French and international formats)
  /\b0[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/,
  /\+\d{1,3}[\s.-]?\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,
  // Email
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];

export function containsPersonalInfo(text: string): boolean {
  return PRIVACY_PATTERNS.some((pattern) => pattern.test(text));
}

export function maskPersonalInfo(text: string): string {
  let masked = text;
  for (const pattern of PRIVACY_PATTERNS) {
    masked = masked.replace(pattern, '[MASQUÉ]');
  }
  return masked;
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
