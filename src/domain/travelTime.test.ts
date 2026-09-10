import { describe, it, expect } from 'vitest';
import {
  timeAtSpeed,
  lightTravelSeconds,
  formatDistanceForKids,
  formatDurationForKids,
  SPEED_KM_PER_S,
} from './travelTime';

/* ================================================================== */
/*  timeAtSpeed                                                        */
/* ================================================================== */

describe('timeAtSpeed', () => {
  it('computes time for a nominal case', () => {
    expect(timeAtSpeed(1000, 10)).toBe(100);
  });

  it('returns 0 for zero distance', () => {
    expect(timeAtSpeed(0, 10)).toBe(0);
  });

  it('returns Infinity for zero speed', () => {
    expect(timeAtSpeed(1000, 0)).toBe(Infinity);
  });

  it('works with speed-of-light constant', () => {
    const seconds = timeAtSpeed(299_792.458, SPEED_KM_PER_S.light!);
    expect(seconds).toBeCloseTo(1, 5);
  });
});

/* ================================================================== */
/*  lightTravelSeconds                                                 */
/* ================================================================== */

describe('lightTravelSeconds', () => {
  it('Earth–Moon ≈ 1.28 s', () => {
    const seconds = lightTravelSeconds(384_400);
    expect(seconds).toBeCloseTo(1.28, 1);
  });

  it('Earth–Sun ≈ 499 s (≈ 8.3 min)', () => {
    const seconds = lightTravelSeconds(149_597_870.7);
    expect(seconds).toBeCloseTo(499, 0);
    expect(seconds / 60).toBeCloseTo(8.3, 1);
  });

  it('returns 0 for zero distance', () => {
    expect(lightTravelSeconds(0)).toBe(0);
  });
});

/* ================================================================== */
/*  formatDistanceForKids                                              */
/* ================================================================== */

describe('formatDistanceForKids', () => {
  it('1.43 billion km → "1,43 milliard de km" (fr)', () => {
    expect(formatDistanceForKids(1.43e9, 'fr')).toBe('1,43 milliard de km');
  });

  it('1.43 billion km → "1.43 billion km" (en)', () => {
    expect(formatDistanceForKids(1.43e9, 'en')).toBe('1.43 billion km');
  });

  it('formats plural billions', () => {
    expect(formatDistanceForKids(4e9, 'fr')).toBe('4 milliards de km');
  });

  it('formats millions of km', () => {
    expect(formatDistanceForKids(56e6, 'fr')).toBe('56 millions de km');
    expect(formatDistanceForKids(56e6, 'en')).toBe('56 million km');
  });

  it('formats singular million', () => {
    expect(formatDistanceForKids(1.5e6, 'fr')).toBe('1,5 million de km');
  });

  it('formats plain km (small values)', () => {
    expect(formatDistanceForKids(400, 'fr')).toBe('400 km');
    expect(formatDistanceForKids(400, 'en')).toBe('400 km');
  });

  it('formats millions of light-years', () => {
    const lyKm = 9.461e12;
    expect(formatDistanceForKids(2.5e6 * lyKm, 'fr')).toBe(
      "2,5 millions d'années-lumière",
    );
    expect(formatDistanceForKids(2.5e6 * lyKm, 'en')).toBe(
      '2.5 million light-years',
    );
  });

  it('formats thousands of light-years', () => {
    const lyKm = 9.461e12;
    expect(formatDistanceForKids(26_000 * lyKm, 'fr')).toContain(
      "milliers d'années-lumière",
    );
  });

  it('formats single light-years', () => {
    const lyKm = 9.461e12;
    const result = formatDistanceForKids(1 * lyKm, 'fr');
    expect(result).toBe('1 année-lumière');
  });

  it.each(['fr', 'en'] as const)('never outputs more than 4 significant figures (%s)', (locale) => {
    const lyKm = 9.461e12;
    const cases = [
      400,
      12_345,
      56_789_000,
      1_430_000_000,
      1.2345 * lyKm,
      26_123 * lyKm,
      2.5678e6 * lyKm,
      13.812e9 * lyKm,
    ];

    for (const km of cases) {
      const result = formatDistanceForKids(km, locale);
      expect(displayedSignificantDigits(result, locale), result).toBeLessThanOrEqual(4);
    }
  });
});

function displayedSignificantDigits(value: string, locale: 'fr' | 'en'): number {
  const numericPart = value.match(/^[\d\s\u00a0\u202f,.]+/)?.[0].trim() ?? '';
  const normalized = locale === 'fr'
    ? numericPart.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.')
    : numericPart.replace(/[\s\u00a0\u202f,]/g, '');
  const [integer = '', fraction] = normalized.split('.');
  let significant = `${integer}${fraction ?? ''}`.replace(/^0+/, '');

  // Trailing zeroes in an integer such as 12,300 are place holders, not
  // additional significant figures. Decimal zeroes would remain significant.
  if (fraction === undefined) significant = significant.replace(/0+$/, '');
  return significant.length || 1;
}

/* ================================================================== */
/*  formatDurationForKids                                              */
/* ================================================================== */

describe('formatDurationForKids', () => {
  // ── seconds tier ─────────────────────────────────────────────────
  it('formats sub-second durations', () => {
    expect(formatDurationForKids(1.28, 'fr')).toBe('1,28 seconde');
    expect(formatDurationForKids(1.28, 'en')).toBe('1.28 seconds');
  });

  it('formats plural seconds', () => {
    expect(formatDurationForKids(45, 'fr')).toBe('45 secondes');
    expect(formatDurationForKids(45, 'en')).toBe('45 seconds');
  });

  it('formats exactly 1 second', () => {
    expect(formatDurationForKids(1, 'en')).toBe('1 second');
  });

  // ── minutes tier ─────────────────────────────────────────────────
  it('formats minutes', () => {
    const result = formatDurationForKids(499, 'fr');
    expect(result).toBe('8,32 minutes');
    const resultEn = formatDurationForKids(499, 'en');
    expect(resultEn).toBe('8.32 minutes');
  });

  // ── hours tier ───────────────────────────────────────────────────
  it('formats hours', () => {
    expect(formatDurationForKids(3 * 3600, 'fr')).toBe('3 heures');
    expect(formatDurationForKids(3 * 3600, 'en')).toBe('3 hours');
  });

  it('formats singular hour', () => {
    expect(formatDurationForKids(3600, 'en')).toBe('1 hour');
  });

  // ── days tier ────────────────────────────────────────────────────
  it('formats days (160 days stays in days, not months)', () => {
    expect(formatDurationForKids(160 * 86_400, 'fr')).toBe('160 jours');
    expect(formatDurationForKids(160 * 86_400, 'en')).toBe('160 days');
  });

  it('formats few days', () => {
    const result = formatDurationForKids(76 * 3600, 'fr');
    expect(result).toContain('jours');
  });

  // ── months tier ──────────────────────────────────────────────────
  it('formats months (≥ 6 months)', () => {
    // 8 months ≈ 8 × 2 629 746 s
    const eightMonths = 8 * 2_629_746;
    const result = formatDurationForKids(eightMonths, 'fr');
    expect(result).toContain('mois');
  });

  // ── years tier ───────────────────────────────────────────────────
  it('formats years', () => {
    const fiveYears = 5 * 31_556_952;
    expect(formatDurationForKids(fiveYears, 'fr')).toBe('5 ans');
    expect(formatDurationForKids(fiveYears, 'en')).toBe('5 years');
  });

  it('formats singular year', () => {
    const oneYear = 31_556_952;
    expect(formatDurationForKids(oneYear, 'fr')).toBe('1 an');
    expect(formatDurationForKids(oneYear, 'en')).toBe('1 year');
  });

  // ── thousands of years ───────────────────────────────────────────
  it('formats thousands of years', () => {
    const val = 26_000 * 31_556_952;
    const result = formatDurationForKids(val, 'fr');
    expect(result).toContain('milliers');
    expect(result).toContain("d'années");
    const resultEn = formatDurationForKids(val, 'en');
    expect(resultEn).toContain('thousand');
    expect(resultEn).toContain('years');
  });

  // ── millions of years ────────────────────────────────────────────
  it('formats millions of years', () => {
    const val = 4.5e6 * 31_556_952;
    const result = formatDurationForKids(val, 'fr');
    expect(result).toContain('millions');
    expect(result).toContain("d'années");
    const resultEn = formatDurationForKids(val, 'en');
    expect(resultEn).toContain('million');
    expect(resultEn).toContain('years');
  });

  // ── billions of years ────────────────────────────────────────────
  it('formats billions of years', () => {
    const val = 13.8e9 * 31_556_952;
    const result = formatDurationForKids(val, 'fr');
    expect(result).toContain('milliards');
    expect(result).toContain("d'années");
    const resultEn = formatDurationForKids(val, 'en');
    expect(resultEn).toContain('billion');
    expect(resultEn).toContain('years');
  });

  // ── edge cases ───────────────────────────────────────────────────
  it('returns ∞ for Infinity', () => {
    expect(formatDurationForKids(Infinity, 'fr')).toBe('∞');
    expect(formatDurationForKids(Infinity, 'en')).toBe('∞');
  });

  it('returns ∞ for negative duration', () => {
    expect(formatDurationForKids(-10, 'fr')).toBe('∞');
  });

  it('formats zero as seconds', () => {
    const result = formatDurationForKids(0, 'fr');
    expect(result).toContain('seconde');
  });

  // ── sig-fig cap ──────────────────────────────────────────────────
  it('never produces more than 4 significant figures', () => {
    // A variety of scales — each output should stay ≤ 3 sig figs
    const cases = [
      0.0014,          // light to ISS
      1.28,            // light to Moon
      499,             // light to Sun
      76 * 3600,       // Apollo 11
      160 * 86_400,    // car to Moon
      5 * 31_556_952,  // Juno to Jupiter
      13.8e9 * 31_556_952, // age of Universe
    ];
    for (const s of cases) {
      const result = formatDurationForKids(s, 'fr');
      // Extract digits from the numeric part (before the unit word)
      const numericPart = result.match(/^[\d\s,.]+/)?.[0] ?? '';
      const digits = numericPart.replace(/[\s,.]/g, '').replace(/^0+/, '');
      expect(digits.length).toBeLessThanOrEqual(4);
    }
  });
});

/* ================================================================== */
/*  SPEED_KM_PER_S                                                     */
/* ================================================================== */

describe('SPEED_KM_PER_S', () => {
  it('has light speed at the SI value', () => {
    expect(SPEED_KM_PER_S.light).toBe(299_792.458);
  });

  it('apollo and real-mission have null speed (real durations)', () => {
    expect(SPEED_KM_PER_S.apollo).toBeNull();
    expect(SPEED_KM_PER_S['real-mission']).toBeNull();
  });

  it('voyager-1 ≈ 17 km/s', () => {
    expect(SPEED_KM_PER_S['voyager-1']).toBeCloseTo(17, 0);
  });

  it('parker-solar-probe ≈ 192 km/s', () => {
    expect(SPEED_KM_PER_S['parker-solar-probe']).toBeCloseTo(192, 0);
  });
});
