import { describe, expect, it } from 'vitest';
import { validateRequest, containsPersonalInfo, maskPersonalInfo, isValidTravelDestination } from './validation';

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
