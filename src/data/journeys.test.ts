import { describe, it, expect } from 'vitest';
import { JOURNEYS, JOURNEY_BY_ID } from './journeys';
import { JOURNEY_RULES, type MissionRuleStep } from './journeyRules';
import type { MissionStepDef } from './journeyTypes';
import { CELESTIAL_OBJECT_IDS, DEEP_SKY_OBJECT_IDS } from './types';
import { CONSTELLATION_ABBRS } from './constellationTypes';

const allTargetIds = [
  ...CELESTIAL_OBJECT_IDS,
  ...DEEP_SKY_OBJECT_IDS,
  ...CONSTELLATION_ABBRS,
  'iss',
  'night-sky',
] as string[];

const expectedJourneyIds = [
  'earth-to-iss',
  'earth-to-moon',
  'earth-to-mars',
  'earth-to-outer-planets',
  'milkyway-to-andromeda',
  'into-a-black-hole',
  'constellations-from-earth',
] as const;

describe('Journey catalogue', () => {
  it('has no duplicate journey numbers', () => {
    const numbers = JOURNEYS.map((j) => j.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('has no duplicate journey ids', () => {
    const ids = JOURNEYS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains exactly the seven specified journeys', () => {
    expect(JOURNEYS.map((journey) => journey.id).sort()).toEqual([...expectedJourneyIds].sort());
  });

  it('every journey is indexed in JOURNEY_BY_ID', () => {
    for (const j of JOURNEYS) {
      expect(JOURNEY_BY_ID[j.id]).toBe(j);
    }
  });

  it.each(JOURNEYS.map((j) => [j.id, j] as const))(
    '%s: every LocalizedText has non-empty fr and en',
    (_id, journey) => {
      checkLocalizedTexts(journey);
    },
  );

  it('rejects incomplete or invalid LocalizedText values', () => {
    expect(() => checkLocalizedTexts({ fr: 'Texte seulement' }, 'missingEnglish')).toThrow();
    expect(() => checkLocalizedTexts({ en: 'English only' }, 'missingFrench')).toThrow();
    expect(() => checkLocalizedTexts({ fr: 'Texte', en: 42 }, 'invalidEnglish')).toThrow();
  });

  it('covers every mission step kind in the catalogue', () => {
    const kinds = new Set(JOURNEYS.flatMap((journey) => journey.steps.map((step) => step.kind)));
    expect(kinds).toEqual(new Set(['visit', 'observe', 'compare', 'reach-scale', 'quiz', 'real-world']));
  });

  it.each(JOURNEYS.map((j) => [j.id, j] as const))(
    '%s: route-loaded steps stay synchronized with the compact engine rules',
    (id, journey) => {
      expect(JOURNEY_RULES[id]).toEqual(journey.steps.map(toMissionRule));
    },
  );

  it('contains the required educational content for all seven journeys', () => {
    const iss = JOURNEY_BY_ID['earth-to-iss'];
    expect(iss.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'visit', target: 'iss' }),
      expect.objectContaining({ kind: 'observe', target: 'iss' }),
    ]));

    const moon = JOURNEY_BY_ID['earth-to-moon'];
    expect(moon.hazards.some((hazard) => /poussière|dust/i.test(`${hazard.label.fr} ${hazard.label.en}`))).toBe(true);
    expect(moon.humanPrecedent.latestMission).toContain('Artemis II');
    expect(moon.robotPrecedent).toEqual(expect.objectContaining({
      latestMission: 'IM-2 (Athena)',
      latestDate: '2025-03-06',
    }));

    const mars = JOURNEY_BY_ID['earth-to-mars'];
    expect(mars.robotPrecedent.firstMission).toContain('Mariner 4');
    expect(mars.robotPrecedent).toEqual(expect.objectContaining({
      latestMission: 'Zhurong (Tianwen-1)',
      latestDate: '2021-05-14',
    }));
    expect(mars.hazards.map((hazard) => hazard.kind)).toEqual(expect.arrayContaining(['supplies', 'isolation', 'weather', 'comms', 'landing']));
    expect(mars.legs.map((leg) => leg.id)).toContain('trajectory-correction');

    const outer = JOURNEY_BY_ID['earth-to-outer-planets'];
    expect(outer.durations.map((duration) => duration.label?.en)).toEqual(expect.arrayContaining([
      'Juno to Jupiter', 'Cassini to Saturn', 'New Horizons to Pluto',
    ]));
    expect(outer.robotPrecedent.note.en).toContain('Voyager 2');
    expect(outer.durations.find((duration) => duration.vehicle === 'light')?.label?.en)
      .toContain('Saturn');

    const andromeda = JOURNEY_BY_ID['milkyway-to-andromeda'];
    expect(andromeda.highlights?.some((item) => item.text.en.includes('50'))).toBe(true);
    expect(andromeda.highlights?.some((item) => item.text.en.includes('13.8'))).toBe(true);
    expect(andromeda.steps).toContainEqual(expect.objectContaining({
      id: 'andromeda-compare',
      kind: 'compare',
      a: 'andromeda',
      b: 'triangulum',
    }));

    const blackHole = JOURNEY_BY_ID['into-a-black-hole'];
    expect(blackHole.humanPrecedent.note.fr).toBe('Personne n’y est jamais allé, et personne ne pourrait revenir pour raconter.');
    expect(blackHole.highlights?.some((item) => item.text.en.includes('Gaia BH1'))).toBe(true);
    expect(blackHole.highlights?.some((item) => item.text.en.includes('M87'))).toBe(true);
    expect(blackHole.hazards.some((hazard) => /dilatation|time dilation/i.test(`${hazard.simple.fr} ${hazard.simple.en}`))).toBe(true);

    const constellations = JOURNEY_BY_ID['constellations-from-earth'];
    expect(constellations.highlights?.some((item) => item.text.en.includes('88'))).toBe(true);
    const realWorld = constellations.steps.find((step) => step.kind === 'real-world');
    expect(realWorld?.kind === 'real-world' ? realWorld.checklist : []).toHaveLength(5);
  });

  it.each(JOURNEYS.map((j) => [j.id, j] as const))(
    '%s: precedents have a source with a URL',
    (_id, journey) => {
      expect(journey.humanPrecedent.source.url).toMatch(/^https?:\/\//);
      expect(journey.robotPrecedent.source.url).toMatch(/^https?:\/\//);
    },
  );

  it('never uses a tilde to mark an approximate value in displayed copy', () => {
    expect(JSON.stringify(JOURNEYS)).not.toContain('~');
  });

  it.each(JOURNEYS.map((j) => [j.id, j] as const))(
    '%s: every Quantity has a unit',
    (_id, journey) => {
      if (journey.distance.kind === 'fixed') {
        checkQuantity(journey.distance.value);
      } else {
        checkQuantity(journey.distance.min);
        checkQuantity(journey.distance.max);
        checkQuantity(journey.distance.typical);
      }
      for (const leg of journey.legs) {
        if (leg.atDistance) {
          checkQuantity(leg.atDistance);
        }
      }
    },
  );

  it.each(JOURNEYS.map((j) => [j.id, j] as const))(
    '%s: sourced scientific content is traceable',
    (_id, journey) => {
      for (const duration of journey.durations) {
        expect(duration.source?.url, `duration ${duration.vehicle}`).toMatch(/^https:\/\//);
      }
      if (journey.launchWindow) {
        expect(journey.launchWindowSource?.url, 'launch window').toMatch(/^https:\/\//);
      }
      for (const leg of journey.legs) expect(leg.source?.url, `leg ${leg.id}`).toMatch(/^https:\/\//);
      for (const hazard of journey.hazards) expect(hazard.source?.url, `hazard ${hazard.kind}`).toMatch(/^https:\/\//);
      for (const step of journey.steps) {
        if (step.kind === 'quiz') expect(step.question.source?.url, `quiz ${step.id}`).toMatch(/^https:\/\//);
      }
    },
  );

  it.each(JOURNEYS.map((j) => [j.id, j] as const))(
    '%s: parker-solar-probe durations have a note',
    (_id, journey) => {
      for (const d of journey.durations) {
        if (d.vehicle === 'parker-solar-probe') {
          expect(d.note).toBeTruthy();
        }
      }
    },
  );

  it.each(JOURNEYS.map((j) => [j.id, j] as const))(
    '%s: step targets reference existing catalogue objects',
    (_id, journey) => {
      for (const step of journey.steps) {
        const targets = getStepTargets(step);
        for (const t of targets) {
          expect(allTargetIds).toContain(t);
        }
      }
    },
  );
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStepTargets(step: MissionStepDef): string[] {
  switch (step.kind) {
    case 'visit':
    case 'observe':
      return [step.target];
    case 'compare':
      return [step.a, step.b];
    case 'reach-scale':
    case 'quiz':
    case 'real-world':
      return [];
  }
}

function toMissionRule(step: MissionStepDef): MissionRuleStep {
  const ordered = step.ordered ? { ordered: true as const } : {};
  switch (step.kind) {
    case 'visit':
      return { id: step.id, kind: step.kind, target: step.target, ...ordered };
    case 'observe':
      return {
        id: step.id,
        kind: step.kind,
        target: step.target,
        holdMs: step.holdMs,
        ...ordered,
      };
    case 'compare':
      return { id: step.id, kind: step.kind, a: step.a, b: step.b, ...ordered };
    case 'reach-scale':
      return { id: step.id, kind: step.kind, level: step.level, ...ordered };
    case 'quiz':
    case 'real-world':
      return { id: step.id, kind: step.kind, ...ordered };
  }
}

function checkLocalizedTexts(obj: unknown, path = ''): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== 'object') return;

  const record = obj as Record<string, unknown>;
  if ('fr' in record || 'en' in record) {
    expect(typeof record['fr'], `${path}.fr should be a string`).toBe('string');
    expect(typeof record['en'], `${path}.en should be a string`).toBe('string');

    const fr = record['fr'];
    const en = record['en'];
    if (typeof fr === 'string' && typeof en === 'string') {
      expect(fr, `${path}.fr should be non-empty`).not.toBe('');
      expect(en, `${path}.en should be non-empty`).not.toBe('');
      expect(en, `${path}.en must not copy the French text`).not.toBe(fr);
    }
    return;
  }

  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        checkLocalizedTexts(value[i], `${path}.${key}[${i}]`);
      }
    } else if (typeof value === 'object') {
      checkLocalizedTexts(value, `${path}.${key}`);
    }
  }
}

function checkQuantity(quantity: {
  unit: string;
  sourceUrl?: string;
  attribution?: string;
  retrievedAt?: string;
}): void {
  expect(quantity.unit).toBeTruthy();
  expect(quantity.sourceUrl).toMatch(/^https:\/\//);
  expect(quantity.attribution).toBeTruthy();
  expect(quantity.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
}
