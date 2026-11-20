import { describe, expect, it } from 'vitest';
import { validateRequest, containsPersonalInfo, maskPersonalInfo, isValidTravelDestination, analyzePersonalInfo, FIRST_NAME_PLACEHOLDER } from './validation';

/* ------------------------------------------------------------------ */
/*  Privacy detection                                                  */
/* ------------------------------------------------------------------ */

describe('containsPersonalInfo', () => {
  it('detects French full name', () => {
    expect(containsPersonalInfo('je m\'appelle Jean Dupont')).toBe(true);
    expect(containsPersonalInfo('mon nom est Marie Leclerc')).toBe(true);
  });

  it('detects English full name', () => {
    expect(containsPersonalInfo('my name is John Smith')).toBe(true);
    expect(containsPersonalInfo('I\'m called Sarah Brown')).toBe(true);
  });

  it('detects addresses', () => {
    expect(containsPersonalInfo('j\'habite 12 rue de la Paix')).toBe(true);
    expect(containsPersonalInfo('I live at 42 Main Street')).toBe(true);
    expect(containsPersonalInfo('75001 Paris')).toBe(true);
  });

  it('detects school mentions', () => {
    expect(containsPersonalInfo('mon école est Saint-Exupéry')).toBe(true);
    expect(containsPersonalInfo('my school is Greenfield')).toBe(true);
    expect(containsPersonalInfo('mon collège')).toBe(true);
  });

  it('detects phone numbers', () => {
    expect(containsPersonalInfo('06 12 34 56 78')).toBe(true);
    expect(containsPersonalInfo('+33 6 12 34 56 78')).toBe(true);
  });

  it('detects email addresses', () => {
    expect(containsPersonalInfo('mon email est kid@example.com')).toBe(true);
  });

  it('does not flag normal space questions', () => {
    expect(containsPersonalInfo('Combien de lunes a Saturne ?')).toBe(false);
    expect(containsPersonalInfo('What is a black hole?')).toBe(false);
    expect(containsPersonalInfo('Comment les étoiles se forment ?')).toBe(false);
  });
});

describe('maskPersonalInfo', () => {
  it('masks detected patterns', () => {
    const masked = maskPersonalInfo('je m\'appelle Jean Dupont et mon email est test@example.com');
    expect(masked).not.toContain('Jean Dupont');
    expect(masked).not.toContain('test@example.com');
    expect(masked).toContain('[MASQUÉ]');
  });
});

/* ------------------------------------------------------------------ */
/*  Request validation                                                 */
/* ------------------------------------------------------------------ */

describe('validateRequest', () => {
  const validBody = {
    question: 'Combien de lunes a Saturne ?',
    context: {
      locale: 'fr',
      view: 'planet',
      selectedObjectId: 'saturn',
      activeJourneyId: null,
      readingLevel: 'curious',
    },
    history: [],
  };

  it('accepts a valid request', () => {
    const result = validateRequest(validBody);
    expect(result.ok).toBe(true);
  });

  it('rejects empty question', () => {
    const result = validateRequest({ ...validBody, question: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects question over 500 chars', () => {
    const result = validateRequest({ ...validBody, question: 'x'.repeat(501) });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown locale', () => {
    const result = validateRequest({
      ...validBody,
      context: { ...validBody.context, locale: 'de' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown selectedObjectId', () => {
    const result = validateRequest({
      ...validBody,
      context: { ...validBody.context, selectedObjectId: 'pluto' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown activeJourneyId', () => {
    const result = validateRequest({
      ...validBody,
      context: { ...validBody.context, activeJourneyId: 'fake-journey' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown readingLevel', () => {
    const result = validateRequest({
      ...validBody,
      context: { ...validBody.context, readingLevel: 'genius' },
    });
    expect(result.ok).toBe(false);
  });

  it('accepts URL paths as view', () => {
    const result = validateRequest({
      ...validBody,
      context: { ...validBody.context, view: '/explore/solar-system/saturn' },
    });
    expect(result.ok).toBe(true);
  });

  it('limits history to 6 messages', () => {
    const longHistory = Array.from({ length: 10 }, (_, i) => ({
      role: 'child',
      text: `question ${i}`,
    }));
    const result = validateRequest({ ...validBody, history: longHistory });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.history.length).toBe(6);
    }
  });

  it('accepts null selectedObjectId', () => {
    const result = validateRequest({
      ...validBody,
      context: { ...validBody.context, selectedObjectId: null },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects non-object body', () => {
    expect(validateRequest(null).ok).toBe(false);
    expect(validateRequest('string').ok).toBe(false);
    expect(validateRequest(42).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Travel destination whitelist                                       */
/* ------------------------------------------------------------------ */

describe('isValidTravelDestination', () => {
  it('accepts known celestial objects', () => {
    expect(isValidTravelDestination('earth')).toBe(true);
    expect(isValidTravelDestination('saturn')).toBe(true);
    expect(isValidTravelDestination('mars')).toBe(true);
  });

  it('accepts deep-sky objects', () => {
    expect(isValidTravelDestination('sgr-a')).toBe(true);
    expect(isValidTravelDestination('andromeda')).toBe(true);
  });

  it('accepts special destinations', () => {
    expect(isValidTravelDestination('iss')).toBe(true);
    expect(isValidTravelDestination('solar')).toBe(true);
    expect(isValidTravelDestination('milkyway')).toBe(true);
  });

  it('accepts constellation abbreviations', () => {
    expect(isValidTravelDestination('Ori')).toBe(true);
    expect(isValidTravelDestination('UMa')).toBe(true);
  });

  it('rejects unknown destinations', () => {
    expect(isValidTravelDestination('pluto')).toBe(false);
    expect(isValidTravelDestination('xyz123')).toBe(false);
    expect(isValidTravelDestination('')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Lot 2 — natural phrasings (20 cases fr/en, with false positives)   */
/* ------------------------------------------------------------------ */

describe('analyzePersonalInfo — natural phrasings (lot 2)', () => {
  const cases: ReadonlyArray<readonly [string, 'none' | 'first-name' | 'personal']> = [
    // First name alone → masked, question answered
    ['Je m’appelle Léo, pourquoi Mars est rouge ?', 'first-name'],
    ['je m\'appelle Inès et je veux savoir combien de lunes a Jupiter', 'first-name'],
    ['Mon prénom est Zoé, c’est quoi un trou noir ?', 'first-name'],
    ['My name is Sam, why is the sky dark at night?', 'first-name'],
    ['I’m called Ava and I love Saturn', 'first-name'],
    // Full name, residence, school → refused
    ['Je m’appelle Jean Dupont', 'personal'],
    ['Mon nom est Marie Leclerc et j’aime les étoiles', 'personal'],
    ['J’habite à Lyon, on voit les étoiles ?', 'personal'],
    ['j’habite au 12 rue des Lilas', 'personal'],
    ['Mon école s’appelle Jules Ferry', 'personal'],
    ['Je suis en CE2 à l’école Victor Hugo', 'personal'],
    ['My name is John Smith', 'personal'],
    ['I live in Manchester, can I see Mars?', 'personal'],
    ['My school is Greenfield Primary', 'personal'],
    ['I’m in 4th grade at Lincoln Elementary', 'personal'],
    // False positives to avoid
    ['La Lune s’appelle aussi Séléné ?', 'none'],
    ['J’habite sur Terre, et toi ?', 'none'],
    ['I live on Earth, where do you live?', 'none'],
    ['Comment s’appelle la plus grosse lune de Jupiter ?', 'none'],
    ['Je suis en CE2 et je me demande pourquoi le Soleil brille', 'none'],
  ];

  it('has 20 cases', () => expect(cases).toHaveLength(20));

  it.each(cases)('%s → %s', (text, level) => {
    expect(analyzePersonalInfo(text).level).toBe(level);
  });

  it('masks the first name only, keeping the question intact', () => {
    const { masked } = analyzePersonalInfo('Je m’appelle Léo, pourquoi Mars est rouge ?');
    expect(masked).toBe(`Je m’appelle ${FIRST_NAME_PLACEHOLDER}, pourquoi Mars est rouge ?`);
    expect(masked).not.toContain('Léo');
  });

  it('masks an English first name too', () => {
    const { masked } = analyzePersonalInfo('My name is Sam, why is the sky dark at night?');
    expect(masked).not.toContain('Sam');
    expect(masked).toContain('why is the sky dark at night?');
  });

  it('no longer flags "I am" + two words (old false positive)', () => {
    expect(containsPersonalInfo('I am going to Mars one day')).toBe(false);
    expect(containsPersonalInfo('I am Very Curious about stars')).toBe(false);
  });
});
