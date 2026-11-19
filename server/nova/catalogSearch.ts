/**
 * Catalog search: searches the app's internal data sources.
 *
 * Imports the data directly from src/data and creates a searchable
 * index of celestial bodies, deep-sky objects, and journey information.
 * Each result carries its sourceUrl and attribution for provenance.
 */

/* ------------------------------------------------------------------ */
/*  Catalog entry type                                                 */
/* ------------------------------------------------------------------ */

export interface CatalogEntry {
  readonly id: string;
  readonly kind: 'celestial-body' | 'deep-sky-object' | 'journey' | 'facility';
  readonly name: { fr: string; en: string };
  readonly description: { fr: string; en: string };
  readonly facts: readonly { label: string; value: string; sourceUrl?: string }[];
  readonly sourceUrl: string;
  readonly sourceLabel: string;
}

/* ------------------------------------------------------------------ */
/*  Build the catalog at module load (server-side only)               */
/* ------------------------------------------------------------------ */

// We import the raw data as JSON-compatible structures.
// In production this could be pre-generated at build time.
// For now we build it dynamically from the data files.

let catalogEntries: CatalogEntry[] | null = null;

async function loadCatalog(): Promise<readonly CatalogEntry[]> {
  if (catalogEntries) return catalogEntries;

  // Dynamic import to work in Node.js server context
  const { SOLAR_SYSTEM_BODIES, INTERNATIONAL_SPACE_STATION } = await import('../../src/data/solarSystem');
  const { DEEP_SKY_OBJECTS } = await import('../../src/data/deepSkyObjects');
  const { JOURNEYS } = await import('../../src/data/journeys');

  const entries: CatalogEntry[] = [];

  // Solar system bodies
  for (const body of SOLAR_SYSTEM_BODIES) {
    const facts: { label: string; value: string; sourceUrl?: string }[] = [
      { label: 'Radius', value: `${body.science.meanRadius.value} ${body.science.meanRadius.unit}`, sourceUrl: body.science.meanRadius.sourceUrl },
      { label: 'Mass', value: `${body.science.mass.value} ${body.science.mass.unit}`, sourceUrl: body.science.mass.sourceUrl },
      { label: 'Surface gravity', value: `${body.science.surfaceGravity.value} ${body.science.surfaceGravity.unit}`, sourceUrl: body.science.surfaceGravity.sourceUrl },
      { label: 'Rotation period', value: `${body.science.siderealRotation.value} ${body.science.siderealRotation.unit}`, sourceUrl: body.science.siderealRotation.sourceUrl },
      { label: 'Axial tilt', value: `${body.science.axialTilt.value}°`, sourceUrl: body.science.axialTilt.sourceUrl },
    ];
    if ('meanTemperature' in body.science && body.science.meanTemperature) {
      const t = body.science.meanTemperature;
      facts.push({ label: 'Temperature', value: `${t.value} ${t.unit}`, sourceUrl: t.sourceUrl });
    }
    if ('orbit' in body.science && body.science.orbit) {
      const o = body.science.orbit;
      facts.push({ label: 'Semi-major axis', value: `${o.semiMajorAxis.value} ${o.semiMajorAxis.unit}`, sourceUrl: o.semiMajorAxis.sourceUrl });
      facts.push({ label: 'Orbital period', value: `${o.siderealPeriod.value} ${o.siderealPeriod.unit}`, sourceUrl: o.siderealPeriod.sourceUrl });
    }

    entries.push({
      id: body.id,
      kind: 'celestial-body',
      name: { fr: body.name.fr, en: body.name.en },
      description: { fr: body.shortDescription.fr, en: body.shortDescription.en },
      facts,
      sourceUrl: body.science.meanRadius.sourceUrl,
      sourceLabel: body.science.meanRadius.attribution,
    });
  }

  // ISS
  entries.push({
    id: 'iss',
    kind: 'facility',
    name: { fr: INTERNATIONAL_SPACE_STATION.name.fr, en: INTERNATIONAL_SPACE_STATION.name.en },
    description: { fr: INTERNATIONAL_SPACE_STATION.shortDescription.fr, en: INTERNATIONAL_SPACE_STATION.shortDescription.en },
    facts: [
      { label: 'Altitude', value: `${INTERNATIONAL_SPACE_STATION.altitude.value} ${INTERNATIONAL_SPACE_STATION.altitude.unit}`, sourceUrl: INTERNATIONAL_SPACE_STATION.sourceUrl },
      { label: 'Orbital speed', value: `${INTERNATIONAL_SPACE_STATION.orbitalSpeed.value} ${INTERNATIONAL_SPACE_STATION.orbitalSpeed.unit}`, sourceUrl: INTERNATIONAL_SPACE_STATION.sourceUrl },
      { label: 'Orbital period', value: `${INTERNATIONAL_SPACE_STATION.orbitalPeriod.value} ${INTERNATIONAL_SPACE_STATION.orbitalPeriod.unit}`, sourceUrl: INTERNATIONAL_SPACE_STATION.sourceUrl },
    ],
    sourceUrl: INTERNATIONAL_SPACE_STATION.sourceUrl,
    sourceLabel: INTERNATIONAL_SPACE_STATION.attribution,
  });

  // Deep-sky objects
  for (const dso of DEEP_SKY_OBJECTS) {
    entries.push({
      id: dso.id,
      kind: 'deep-sky-object',
      name: { fr: dso.name.fr, en: dso.name.en },
      description: { fr: dso.shortDescription.fr, en: dso.shortDescription.en },
      facts: dso.facts.map((f) => ({
        label: f.label.en,
        value: f.value.en,
        sourceUrl: dso.sourceUrl,
      })),
      sourceUrl: dso.sourceUrl ?? '',
      sourceLabel: dso.sourceLabel ?? '',
    });
  }

  // Journeys (key facts)
  for (const journey of JOURNEYS) {
    const facts: { label: string; value: string; sourceUrl?: string }[] = [];

    if (journey.distance.kind === 'fixed') {
      facts.push({ label: 'Distance', value: `${journey.distance.value.value} km`, sourceUrl: journey.distance.value.sourceUrl });
    } else {
      facts.push({ label: 'Distance (typical)', value: `${journey.distance.typical.value} km`, sourceUrl: journey.distance.typical.sourceUrl });
    }

    for (const dur of journey.durations.slice(0, 3)) {
      facts.push({ label: `Duration (${dur.vehicle})`, value: dur.seconds != null ? `${dur.seconds} s` : 'computed', sourceUrl: dur.source?.url });
    }

    entries.push({
      id: journey.id,
      kind: 'journey',
      name: { fr: journey.title.fr, en: journey.title.en },
      description: { fr: journey.pitch.fr, en: journey.pitch.en },
      facts,
      sourceUrl: journey.legs[0]?.source?.url ?? '',
      sourceLabel: journey.legs[0]?.source?.label ?? '',
    });
  }

  catalogEntries = entries;
  return entries;
}

/**
 * All catalog entries (server-side). Used to derive travel destinations
 * and their localized display names without duplicating the data.
 */
export async function getCatalogEntries(): Promise<readonly CatalogEntry[]> {
  return loadCatalog();
}

/* ------------------------------------------------------------------ */
/*  Search function                                                    */
/* ------------------------------------------------------------------ */

// Stop words that inflate scores without adding search relevance
const STOP_WORDS = new Set([
  // French
  'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'en', 'au', 'aux',
  'ce', 'se', 'ne', 'pas', 'que', 'qui', 'sur', 'par', 'pour', 'dans', 'avec',
  'est', 'sont', 'sa', 'son', 'ses', 'il', 'elle', 'on', 'nous', 'vous',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'notre', 'votre', 'leur', 'leurs',
  'combien', 'comment', 'quel', 'quelle', 'quoi', 'quand', 'peut',
  // English
  'the', 'is', 'of', 'in', 'to', 'and', 'or', 'an', 'it', 'at', 'by',
  'be', 'as', 'on', 'do', 'if', 'no', 'so', 'up', 'we', 'he', 'she',
  'how', 'what', 'when', 'where', 'why', 'which', 'who', 'has', 'have',
  'are', 'was', 'were', 'been', 'from', 'that', 'this', 'with', 'for',
  'many', 'much', 'does', 'there', 'far',
]);

export async function searchCatalog(
  query: string,
  locale: 'fr' | 'en',
  maxResults: number = 5,
): Promise<readonly CatalogEntry[]> {
  const entries = await loadCatalog();
  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery
    .replace(/[?!.,;:'"()]/g, '')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  if (terms.length === 0) return [];

  // Score each entry by keyword match
  const scored = entries.map((entry) => {
    let score = 0;
    const name = entry.name[locale].toLowerCase();
    const desc = entry.description[locale].toLowerCase();
    const factsText = entry.facts.map((f) => `${f.label} ${f.value}`).join(' ').toLowerCase();

    for (const term of terms) {
      if (name.includes(term)) score += 10;
      if (desc.includes(term)) score += 5;
      if (factsText.includes(term)) score += 3;
      if (entry.id.includes(term)) score += 8;
    }

    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.entry);
}

/**
 * Format catalog results as context for the LLM.
 */
export function formatCatalogResults(
  entries: readonly CatalogEntry[],
  locale: 'fr' | 'en',
): string {
  if (entries.length === 0) return 'No catalog results found.';

  return entries.map((entry) => {
    const facts = entry.facts
      .map((f) => `  - ${f.label}: ${f.value}${f.sourceUrl ? ` (source: ${f.sourceUrl})` : ''}`)
      .join('\n');

    return `[${entry.kind}] ${entry.name[locale]} (id: ${entry.id})
${entry.description[locale]}
Facts:
${facts}
Source: ${entry.sourceUrl}`;
  }).join('\n\n---\n\n');
}
