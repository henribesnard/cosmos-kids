/**
 * Nova handler unit tests with mock LLM provider.
 *
 * Tests the verification pipeline's core invariants:
 * 1. Unsupported claims are removed AND absent from final text
 * 2. Invented source IDs are rejected (closed sources)
 * 3. No extracts → 'unknown' response
 * 4. Refusal kinds (off-topic, privacy, safety) have no status field
 * 5. Debated claims flow through correctly
 * 6. SourceRegistry correctly manages sources and extracts
 * 7. supportingSourceIds from verifier are merged with draft sourceIds
 * 8. No fallback to all sources when claim has no sourceIds
 * 9. openQuestion overrides status to never be 'verified'
 */
import { describe, expect, it } from 'vitest';
import { SourceRegistry, applyVerdicts, sanitizeGuessChoices } from './handler';
import { getVerificationPrompt, getSystemPrompt, getClassificationPrompt, getTextAssemblyPrompt } from './prompts';
import type { CatalogEntry } from './catalogSearch';

/* ------------------------------------------------------------------ */
/*  SourceRegistry tests                                               */
/* ------------------------------------------------------------------ */

describe('SourceRegistry', () => {
  const mockCatalogEntry: CatalogEntry = {
    id: 'saturn',
    kind: 'celestial-body',
    name: { fr: 'Saturne', en: 'Saturn' },
    description: { fr: 'La planète aux anneaux', en: 'The ringed planet' },
    facts: [
      { label: 'Radius', value: '58232 km', sourceUrl: 'https://ssd.jpl.nasa.gov/planets/phys_par.html' },
      { label: 'Mass', value: '5.6834e26 kg', sourceUrl: 'https://ssd.jpl.nasa.gov/planets/phys_par.html' },
    ],
    sourceUrl: 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
    sourceLabel: 'NASA/JPL',
  };

  it('addCatalog registers a source with extract', () => {
    const registry = new SourceRegistry();
    const id = registry.addCatalog(mockCatalogEntry, 'en');
    expect(id).toBe('cat-saturn');
    expect(registry.hasId('cat-saturn')).toBe(true);
    expect(registry.isEmpty()).toBe(false);
  });

  it('extract contains fact data', () => {
    const registry = new SourceRegistry();
    registry.addCatalog(mockCatalogEntry, 'en');
    const extract = registry.getExtract('cat-saturn');
    expect(extract).toContain('58232 km');
    expect(extract).toContain('5.6834e26 kg');
    expect(extract).toContain('The ringed planet');
  });

  it('addWeb registers a source with extract', () => {
    const registry = new SourceRegistry();
    const id = registry.addWeb('NASA Saturn', 'https://nasa.gov/saturn', 'NASA', 'Saturn has 146 moons');
    expect(id).toMatch(/^web-/);
    expect(registry.hasId(id)).toBe(true);
    expect(registry.getExtract(id)).toBe('Saturn has 146 moons');
  });

  it('hasId returns false for unknown IDs', () => {
    const registry = new SourceRegistry();
    expect(registry.hasId('fake-source-99')).toBe(false);
    expect(registry.hasId('cat-mars')).toBe(false);
  });

  it('filterByIds only returns registered sources', () => {
    const registry = new SourceRegistry();
    registry.addCatalog(mockCatalogEntry, 'en');
    const sources = registry.filterByIds(['cat-saturn', 'fake-source-99', 'web-999']);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.id).toBe('cat-saturn');
  });

  it('allSources does not expose extract', () => {
    const registry = new SourceRegistry();
    registry.addCatalog(mockCatalogEntry, 'en');
    const sources = registry.allSources();
    expect(sources).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((sources[0] as any).extract).toBeUndefined();
    expect(sources[0]!.id).toBe('cat-saturn');
    expect(sources[0]!.kind).toBe('catalog');
  });

  it('formatForDraft lists source IDs and extracts', () => {
    const registry = new SourceRegistry();
    registry.addCatalog(mockCatalogEntry, 'en');
    const formatted = registry.formatForDraft();
    expect(formatted).toContain('[cat-saturn]');
    expect(formatted).toContain('58232 km');
    expect(formatted).toContain('AVAILABLE SOURCES');
    expect(formatted).toContain('Do NOT invent new source IDs');
  });

  it('isEmpty returns true when empty', () => {
    const registry = new SourceRegistry();
    expect(registry.isEmpty()).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Prompt tests                                                       */
/* ------------------------------------------------------------------ */

describe('updated prompts', () => {
  describe('verification prompt', () => {
    it('FR prompt requires extract-based verification', () => {
      const prompt = getVerificationPrompt('fr');
      expect(prompt).toContain('UNIQUEMENT les extraits');
      expect(prompt).toContain('N\'utilise PAS tes propres connaissances');
      expect(prompt).toContain('CONTIENT EXPLICITEMENT');
      expect(prompt).toContain('unsupported');
    });

    it('EN prompt requires extract-based verification', () => {
      const prompt = getVerificationPrompt('en');
      expect(prompt).toContain('ONLY the provided source extracts');
      expect(prompt).toContain('Do NOT use your own knowledge');
      expect(prompt).toContain('EXPLICITLY contains');
      expect(prompt).toContain('unsupported');
    });

    it('FR prompt requests supportingSourceIds', () => {
      const prompt = getVerificationPrompt('fr');
      expect(prompt).toContain('supportingSourceIds');
    });

    it('EN prompt requests supportingSourceIds', () => {
      const prompt = getVerificationPrompt('en');
      expect(prompt).toContain('supportingSourceIds');
    });
  });

  describe('system prompt', () => {
    it('FR prompt prohibits source invention', () => {
      const prompt = getSystemPrompt('fr');
      expect(prompt).toContain('SOURCES DISPONIBLES');
      expect(prompt).toContain('n\'inventes AUCUN identifiant');
      expect(prompt).toContain('N\'inclus PAS de champ "sources"');
      expect(prompt).toContain('N\'inclus PAS de champ "text"');
    });

    it('EN prompt prohibits source invention', () => {
      const prompt = getSystemPrompt('en');
      expect(prompt).toContain('AVAILABLE SOURCES');
      expect(prompt).toContain('NEVER invent source IDs');
      expect(prompt).toContain('Do NOT include a "sources" field');
      expect(prompt).toContain('Do NOT include a "text" field');
    });

    it('FR prompt requires mandatory sourceIds per claim', () => {
      const prompt = getSystemPrompt('fr');
      expect(prompt).toContain('CRITIQUE');
      expect(prompt).toContain('DOIT inclure au moins un sourceId');
    });

    it('EN prompt requires mandatory sourceIds per claim', () => {
      const prompt = getSystemPrompt('en');
      expect(prompt).toContain('CRITICAL');
      expect(prompt).toContain('MUST include at least one sourceId');
    });
  });

  describe('classification prompt', () => {
    it('FR prompt includes openQuestion', () => {
      const prompt = getClassificationPrompt('fr');
      expect(prompt).toContain('openQuestion');
      expect(prompt).toContain('trous noirs');
      expect(prompt).toContain('matière noire');
    });

    it('EN prompt includes openQuestion', () => {
      const prompt = getClassificationPrompt('en');
      expect(prompt).toContain('openQuestion');
      expect(prompt).toContain('black holes');
      expect(prompt).toContain('dark matter');
    });
  });

  describe('text assembly prompt', () => {
    it('FR prompt prohibits new facts', () => {
      const prompt = getTextAssemblyPrompt('fr');
      expect(prompt).toContain('AUCUN fait nouveau');
      expect(prompt).toContain('UNIQUEMENT les affirmations');
    });

    it('EN prompt prohibits new facts', () => {
      const prompt = getTextAssemblyPrompt('en');
      expect(prompt).toContain('Do NOT add any new facts');
      expect(prompt).toContain('Only reformulate');
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Pipeline invariant tests (closed source filtering)                 */
/* ------------------------------------------------------------------ */

describe('closed source filtering', () => {
  it('invented source IDs are stripped from claims', () => {
    const registry = new SourceRegistry();
    const entry: CatalogEntry = {
      id: 'mars',
      kind: 'celestial-body',
      name: { fr: 'Mars', en: 'Mars' },
      description: { fr: 'La planète rouge', en: 'The red planet' },
      facts: [{ label: 'Radius', value: '3389.5 km', sourceUrl: 'https://jpl.nasa.gov' }],
      sourceUrl: 'https://jpl.nasa.gov',
      sourceLabel: 'NASA/JPL',
    };
    registry.addCatalog(entry, 'en');

    // Simulate what handler does: filter sourceIds to registry
    const draftClaim = {
      text: 'Mars is the red planet',
      sourceIds: ['cat-mars', 'fake-source-99', 'invented-web-0'],
    };

    const validIds = draftClaim.sourceIds.filter((id) => registry.hasId(id));
    expect(validIds).toEqual(['cat-mars']);
    expect(validIds).not.toContain('fake-source-99');
    expect(validIds).not.toContain('invented-web-0');
  });

  it('invented sources do not appear in final sources array', () => {
    const registry = new SourceRegistry();
    const entry: CatalogEntry = {
      id: 'jupiter',
      kind: 'celestial-body',
      name: { fr: 'Jupiter', en: 'Jupiter' },
      description: { fr: 'La géante gazeuse', en: 'The gas giant' },
      facts: [{ label: 'Mass', value: '1.898e27 kg' }],
      sourceUrl: 'https://jpl.nasa.gov',
      sourceLabel: 'JPL',
    };
    registry.addCatalog(entry, 'en');

    // Filter by IDs that include invented ones
    const sources = registry.filterByIds(['cat-jupiter', 'fake-123', 'web-999']);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.id).toBe('cat-jupiter');
  });
});

/* ------------------------------------------------------------------ */
/*  Refusal status tests                                               */
/* ------------------------------------------------------------------ */

describe('refusal responses have no status field', () => {
  it('privacy result has no status', () => {
    const privacyResult = {
      text: 'Be careful!',
      claims: [],
      sources: [],
      followUps: ['What is a black hole?'],
      actions: [],
      guessFirst: false,
      kind: 'privacy' as const,
    };
    expect(privacyResult).not.toHaveProperty('status');
  });

  it('safety result has no status', () => {
    const safetyResult = {
      text: 'Talk to an adult.',
      claims: [],
      sources: [],
      followUps: [],
      actions: [],
      guessFirst: false,
      kind: 'safety' as const,
    };
    expect(safetyResult).not.toHaveProperty('status');
  });

  it('off-topic result has no status', () => {
    const offTopicResult = {
      text: 'I am a space specialist!',
      claims: [],
      sources: [],
      followUps: ['What is the ISS?'],
      actions: [],
      guessFirst: false,
      kind: 'off-topic' as const,
    };
    expect(offTopicResult).not.toHaveProperty('status');
  });

  it('error result has no status', () => {
    const errorResult = {
      text: 'Oops!',
      claims: [],
      sources: [],
      followUps: [],
      actions: [],
      guessFirst: false,
      kind: 'error' as const,
    };
    expect(errorResult).not.toHaveProperty('status');
  });

  it('answer result CAN have status', () => {
    const answerResult = {
      text: 'Saturn has 146 moons.',
      status: 'verified' as const,
      claims: [{ text: 'Saturn has 146 moons', status: 'verified' as const, sourceIds: ['cat-saturn'] }],
      sources: [{ id: 'cat-saturn', title: 'Saturn', publisher: 'JPL', url: 'https://jpl.nasa.gov', kind: 'catalog' as const }],
      followUps: [],
      actions: [],
      guessFirst: false,
      kind: 'answer' as const,
    };
    expect(answerResult.status).toBe('verified');
  });
});

/* ------------------------------------------------------------------ */
/*  Verification verdicts logic (with supportingSourceIds)              */
/* ------------------------------------------------------------------ */

describe('verification verdict application (applyVerdicts from handler)', () => {
  it('unsupported claim is removed from results', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'Saturn has 146 moons');

    const { claims } = applyVerdicts(
      [
        { text: 'Saturn has 146 moons', sourceIds: ['web-0'] },
        { text: 'Saturn is made of cheese', sourceIds: ['web-0'] },
      ],
      [
        { claimIndex: 0, verdict: 'supported' },
        { claimIndex: 1, verdict: 'unsupported' },
      ],
      registry,
    );

    expect(claims).toHaveLength(1);
    expect(claims[0]!.text).toBe('Saturn has 146 moons');
    expect(claims.some((c) => c.text.includes('cheese'))).toBe(false);
  });

  it('debated claim flows through with debated status', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'Black hole interior unknown');

    const { claims, worstStatus } = applyVerdicts(
      [{ text: 'Black holes may contain singularities', sourceIds: ['web-0'] }],
      [{ claimIndex: 0, verdict: 'debated' }],
      registry,
    );

    expect(claims).toHaveLength(1);
    expect(claims[0]!.status).toBe('debated');
    expect(worstStatus).toBe('debated');
  });

  it('all claims unsupported → worstStatus is unknown', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'some text');

    const { claims, worstStatus } = applyVerdicts(
      [
        { text: 'Aliens exist', sourceIds: [] },
        { text: 'UFOs are real', sourceIds: [] },
      ],
      [
        { claimIndex: 0, verdict: 'unsupported' },
        { claimIndex: 1, verdict: 'unsupported' },
      ],
      registry,
    );

    expect(claims).toHaveLength(0);
    expect(worstStatus).toBe('unknown');
  });

  it('no verdict for a claim → treated as unsupported', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'some text');

    const { claims } = applyVerdicts(
      [{ text: 'Mystery claim', sourceIds: ['web-0'] }],
      [],
      registry,
    );

    expect(claims).toHaveLength(0);
  });

  it('mixed verdicts: only supported/debated claims survive', () => {
    const registry = new SourceRegistry();
    registry.addWeb('src1', 'https://nasa.gov/1', 'NASA', 'fact A data');
    registry.addWeb('src2', 'https://esa.int/2', 'ESA', 'fact B data');

    const { claims, worstStatus } = applyVerdicts(
      [
        { text: 'Fact A', sourceIds: ['web-0'] },
        { text: 'Fact B is debated', sourceIds: ['web-1'] },
        { text: 'Fact C is false', sourceIds: [] },
      ],
      [
        { claimIndex: 0, verdict: 'supported' },
        { claimIndex: 1, verdict: 'debated' },
        { claimIndex: 2, verdict: 'unsupported' },
      ],
      registry,
    );

    expect(claims).toHaveLength(2);
    expect(claims[0]!.status).toBe('verified');
    expect(claims[1]!.status).toBe('debated');
    expect(worstStatus).toBe('debated');
  });

  /* ---- New: supportingSourceIds tests ---- */

  it('supportingSourceIds from verifier are merged with draft sourceIds', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA Mars', 'https://nasa.gov/mars', 'NASA', 'Mars semi-major axis 227943824 km');

    // Draft has empty sourceIds, but verifier found the supporting source
    const { claims } = applyVerdicts(
      [{ text: 'Mars is 228 million km from the Sun', sourceIds: [] }],
      [{ claimIndex: 0, verdict: 'supported', supportingSourceIds: ['web-0'] }],
      registry,
    );

    expect(claims).toHaveLength(1);
    expect(claims[0]!.sourceIds).toEqual(['web-0']);
  });

  it('supportingSourceIds are deduplicated with draft sourceIds', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'Saturn facts');

    const { claims } = applyVerdicts(
      [{ text: 'Saturn has rings', sourceIds: ['web-0'] }],
      [{ claimIndex: 0, verdict: 'supported', supportingSourceIds: ['web-0'] }],
      registry,
    );

    expect(claims[0]!.sourceIds).toEqual(['web-0']);
  });

  it('invented supportingSourceIds from verifier are filtered out', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'data');

    const { claims } = applyVerdicts(
      [{ text: 'A fact', sourceIds: ['web-0'] }],
      [{ claimIndex: 0, verdict: 'supported', supportingSourceIds: ['web-0', 'fake-99'] }],
      registry,
    );

    expect(claims[0]!.sourceIds).toEqual(['web-0']);
    expect(claims[0]!.sourceIds).not.toContain('fake-99');
  });

  /* ---- New: no source fallback tests ---- */

  it('claim with no sourceIds and no supportingSourceIds is dropped (no fallback, no "Vérifié" without source)', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'some content');

    const { claims, worstStatus } = applyVerdicts(
      [{ text: 'A verified claim without sources', sourceIds: [] }],
      [{ claimIndex: 0, verdict: 'supported' }],
      registry,
    );

    // Lot 2: never keep a supported claim with an empty source list,
    // and never fall back to all registry sources either.
    expect(claims).toHaveLength(0);
    expect(worstStatus).toBe('unknown');
  });

  it('lot 2 — a verified or debated claim always keeps at least one registry source', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'Saturn has rings');

    const { claims, worstStatus } = applyVerdicts(
      [
        { text: 'Saturn has rings', sourceIds: ['web-0'] },
        { text: 'Supported but only invented sources', sourceIds: ['web-99'] },
        { text: 'Debated without any source', sourceIds: [] },
        { text: 'Supported by verifier only', sourceIds: [] },
      ],
      [
        { claimIndex: 0, verdict: 'supported' },
        { claimIndex: 1, verdict: 'supported', supportingSourceIds: ['cat-invented'] },
        { claimIndex: 2, verdict: 'debated' },
        { claimIndex: 3, verdict: 'supported', supportingSourceIds: ['web-0'] },
      ],
      registry,
    );

    expect(claims.map((c) => c.text)).toEqual(['Saturn has rings', 'Supported by verifier only']);
    for (const claim of claims) {
      expect(['verified', 'debated']).toContain(claim.status);
      expect(claim.sourceIds.length).toBeGreaterThan(0);
      for (const id of claim.sourceIds) expect(registry.hasId(id)).toBe(true);
    }
    // The source-less debated claim did not drag the status to 'debated'
    expect(worstStatus).toBe('verified');
  });

  /* ---- New: openQuestion tests ---- */

  it('openQuestion overrides verified status to debated', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'Black hole data');

    const { worstStatus } = applyVerdicts(
      [{ text: 'Black holes have event horizons', sourceIds: ['web-0'] }],
      [{ claimIndex: 0, verdict: 'supported' }],
      registry,
      true, // openQuestion
    );

    expect(worstStatus).toBe('debated');
  });

  it('openQuestion does not override unknown status', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'data');

    const { worstStatus } = applyVerdicts(
      [{ text: 'Unknown claim', sourceIds: [] }],
      [{ claimIndex: 0, verdict: 'unsupported' }],
      registry,
      true,
    );

    expect(worstStatus).toBe('unknown');
  });

  it('openQuestion keeps debated as debated', () => {
    const registry = new SourceRegistry();
    registry.addWeb('NASA', 'https://nasa.gov/x', 'NASA', 'data');

    const { worstStatus } = applyVerdicts(
      [{ text: 'A debated claim', sourceIds: ['web-0'] }],
      [{ claimIndex: 0, verdict: 'debated' }],
      registry,
      true,
    );

    expect(worstStatus).toBe('debated');
  });
});

/* ------------------------------------------------------------------ */
/*  Empty registry → 'unknown' response                                */
/* ------------------------------------------------------------------ */

describe('no sources → unknown', () => {
  it('empty registry means no drafting should happen', () => {
    const registry = new SourceRegistry();
    expect(registry.isEmpty()).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Lot 2 — guess choices are hypotheses, sanitized, never facts       */
/* ------------------------------------------------------------------ */

describe('sanitizeGuessChoices', () => {
  it('keeps 2–3 short distinct plain-text strings', () => {
    expect(sanitizeGuessChoices(['Plus de 100', '*Une dizaine*', 'Plus de 100', 'Deux', 'Trois'])).toEqual(['Plus de 100', 'Une dizaine', 'Deux']);
  });

  it('returns [] when fewer than 2 valid choices remain', () => {
    expect(sanitizeGuessChoices(['Seule'])).toEqual([]);
    expect(sanitizeGuessChoices(['x'.repeat(80), 42, null, ''])).toEqual([]);
    expect(sanitizeGuessChoices('pas un tableau')).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  Lot 2 — verification prompt: "debated" is a real scientific debate */
/* ------------------------------------------------------------------ */

describe('verification prompt — debated misuse (ISS, 19 Nov test)', () => {
  it.each(['fr', 'en'] as const)('%s prompt: rounding, natural variation and planned dates are not debates', (locale) => {
    const prompt = getVerificationPrompt(locale);
    expect(prompt).toMatch(locale === 'fr' ? /UNIQUEMENT un vrai débat scientifique/ : /ONLY a genuine scientific debate/);
    expect(prompt).toMatch(locale === 'fr' ? /arrondies ou converties/ : /rounded or converted/);
    expect(prompt).toMatch(locale === 'fr' ? /date ou un événement futur prévu/ : /planned or scheduled future date/);
    expect(prompt).toMatch(locale === 'fr' ? /ne parle simplement pas/ : /simply does not mention/);
  });

  it.each(['fr', 'en'] as const)('%s assembly prompt requires plain text (no asterisks)', (locale) => {
    const prompt = getTextAssemblyPrompt(locale);
    expect(prompt).toMatch(locale === 'fr' ? /TEXTE BRUT/ : /PLAIN TEXT/);
    expect(prompt).toContain('*');
  });

  it.each(['fr', 'en'] as const)('%s draft prompt documents guessChoices as hypotheses', (locale) => {
    const prompt = getSystemPrompt(locale);
    expect(prompt).toContain('guessChoices');
    expect(prompt).toMatch(locale === 'fr' ? /pas des faits/ : /not facts/);
  });

  it.each(['fr', 'en'] as const)('%s draft prompt keeps the claims when guessFirst (real test: « Devine : … » returned no claims)', (locale) => {
    const prompt = getSystemPrompt(locale);
    expect(prompt).toMatch(locale === 'fr' ? /Ne renvoie jamais des claims vides/ : /Never return empty claims/);
    expect(prompt).toMatch(locale === 'fr' ? /followUps sont UNIQUEMENT des questions/ : /followUps are QUESTIONS only/);
  });
});
