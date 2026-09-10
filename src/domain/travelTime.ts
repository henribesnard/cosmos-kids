/**
 * Pure calculation and formatting functions for journey travel times.
 * No React or three.js dependencies — tested without rendering.
 */

import type { Locale } from '../data/types';

/* ------------------------------------------------------------------ */
/*  Vehicle speeds                                                     */
/* ------------------------------------------------------------------ */

export type VehicleId =
  | 'light'
  | 'walking'
  | 'car'
  | 'airliner'
  | 'apollo'
  | 'voyager-1'
  | 'parker-solar-probe'
  | 'real-mission';

/**
 * Cruising speeds in km/s.
 * `null` = no fixed cruising speed (duration comes from actual mission data).
 *
 * Sources & notes:
 * - light: 299 792.458 km/s — exact by SI definition.
 * - walking: 5 km/h — conventional average.
 * - car: 100 km/h — conventional highway speed.
 * - airliner: 900 km/h — typical commercial jet cruise.
 * - apollo: null — real mission durations vary.
 * - voyager-1: ≈ 17.0 km/s heliocentric — NASA/JPL Horizons.
 * - parker-solar-probe: ≈ 192 km/s — peak at perihelion, Dec 2024 (NASA).
 *   This is a peak speed, NOT a cruising speed. Any DurationEntry using
 *   this vehicle MUST carry a note explaining that.
 * - real-mission: null — duration specified per mission.
 */
export const SPEED_KM_PER_S: Record<VehicleId, number | null> = {
  light: 299_792.458,
  walking: 5 / 3_600,              // 5 km/h
  car: 100 / 3_600,                // 100 km/h
  airliner: 900 / 3_600,           // 900 km/h
  apollo: null,
  'voyager-1': 17.0,
  'parker-solar-probe': 192,
  'real-mission': null,
};

/* ------------------------------------------------------------------ */
/*  Core travel-time functions                                        */
/* ------------------------------------------------------------------ */

/**
 * Time in seconds to travel `distanceKm` at `speedKmPerS`.
 * Returns `Infinity` when speed is 0.
 */
export function timeAtSpeed(distanceKm: number, speedKmPerS: number): number {
  if (speedKmPerS === 0) return Infinity;
  return distanceKm / speedKmPerS;
}

/**
 * Time in seconds for light to travel `distanceKm`.
 */
export function lightTravelSeconds(distanceKm: number): number {
  return distanceKm / SPEED_KM_PER_S.light!;
}

/* ------------------------------------------------------------------ */
/*  Internal formatting helpers                                       */
/* ------------------------------------------------------------------ */

/** One light-year in km (IAU definition). */
const LY_KM = 9.461e12;

/** Seconds per time unit (average Gregorian where applicable). */
const S_PER_MINUTE = 60;
const S_PER_HOUR = 3_600;
const S_PER_DAY = 86_400;
const S_PER_MONTH = 2_629_746; // 365.2425 / 12 days
const S_PER_YEAR = 31_556_952; // 365.2425 days

/** Round `value` to at most `maxSig` significant figures. */
function sigFigs(value: number, maxSig: number): number {
  if (value === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (maxSig - 1 - mag);
  return Math.round(value * factor) / factor;
}

/** Format a number respecting locale (3 sig figs max by default). */
function fmtNum(value: number, locale: Locale, maxSig = 3): string {
  const rounded = sigFigs(value, maxSig);
  const mag = rounded === 0 ? 0 : Math.floor(Math.log10(Math.abs(rounded)));
  const fractionDigits = Math.max(0, Math.min(20, maxSig - 1 - mag));
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(rounded);
}

/** French plural: singular when |n| < 2. */
function plFr(n: number, s: string, p: string): string {
  return Math.abs(n) < 2 ? s : p;
}

/** English plural: singular only when |n| === 1. */
function plEn(n: number, s: string, p: string): string {
  return Math.abs(n) === 1 ? s : p;
}

/* ------------------------------------------------------------------ */
/*  formatDistanceForKids                                             */
/* ------------------------------------------------------------------ */

/**
 * Format a distance in km into a human-readable string for children.
 *
 * Rules:
 * - Uses the largest natural unit (km → millions → milliards → light-years).
 * - Never produces raw large digit strings like "1 430 000 000 km".
 * - At most 3 significant figures (well within the 4-sigfig cap).
 */
export function formatDistanceForKids(km: number, locale: Locale): string {
  const fr = locale === 'fr';

  // ── light-year scales ──────────────────────────────────────────────
  if (km >= LY_KM * 1e9) {
    const v = sigFigs(km / (LY_KM * 1e9), 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'milliard', 'milliards')} d'années-lumière`
      : `${fmtNum(v, 'en')} billion light-years`;
  }
  if (km >= LY_KM * 1e6) {
    const v = sigFigs(km / (LY_KM * 1e6), 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'million', 'millions')} d'années-lumière`
      : `${fmtNum(v, 'en')} million light-years`;
  }
  if (km >= LY_KM * 1e3) {
    const v = sigFigs(km / (LY_KM * 1e3), 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'millier', 'milliers')} d'années-lumière`
      : `${fmtNum(v, 'en')} thousand light-years`;
  }
  if (km >= LY_KM) {
    const v = sigFigs(km / LY_KM, 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'année-lumière', 'années-lumière')}`
      : `${fmtNum(v, 'en')} ${plEn(v, 'light-year', 'light-years')}`;
  }

  // ── kilometre scales ───────────────────────────────────────────────
  if (km >= 1e9) {
    const v = sigFigs(km / 1e9, 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'milliard', 'milliards')} de km`
      : `${fmtNum(v, 'en')} billion km`;
  }
  if (km >= 1e6) {
    const v = sigFigs(km / 1e6, 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'million', 'millions')} de km`
      : `${fmtNum(v, 'en')} million km`;
  }

  // ── plain km ───────────────────────────────────────────────────────
  return `${fmtNum(km, locale)} km`;
}

/* ------------------------------------------------------------------ */
/*  formatDurationForKids                                             */
/* ------------------------------------------------------------------ */

/**
 * Format a duration in seconds into the most meaningful unit for children.
 *
 * Tier thresholds:
 *   seconds · minutes · hours · days · months · years ·
 *   thousands · millions · billions of years.
 *
 * The day→month boundary is at 6 months (S_PER_YEAR / 2) so that
 * "160 jours" stays in days (like a car to the Moon) while
 * Hohmann transfers (6–9 months) display in months.
 */
export function formatDurationForKids(seconds: number, locale: Locale): string {
  const fr = locale === 'fr';

  if (!Number.isFinite(seconds) || seconds < 0) return '∞';

  // ── billions of years ──────────────────────────────────────────────
  if (seconds >= S_PER_YEAR * 1e9) {
    const v = sigFigs(seconds / (S_PER_YEAR * 1e9), 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'milliard', 'milliards')} d'années`
      : `${fmtNum(v, 'en')} billion years`;
  }
  // ── millions of years ──────────────────────────────────────────────
  if (seconds >= S_PER_YEAR * 1e6) {
    const v = sigFigs(seconds / (S_PER_YEAR * 1e6), 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'million', 'millions')} d'années`
      : `${fmtNum(v, 'en')} million years`;
  }
  // ── thousands of years ─────────────────────────────────────────────
  if (seconds >= S_PER_YEAR * 1e3) {
    const v = sigFigs(seconds / (S_PER_YEAR * 1e3), 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'millier', 'milliers')} d'années`
      : `${fmtNum(v, 'en')} thousand years`;
  }
  // ── years (≥ 1 year) ───────────────────────────────────────────────
  if (seconds >= S_PER_YEAR) {
    const v = sigFigs(seconds / S_PER_YEAR, 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'an', 'ans')}`
      : `${fmtNum(v, 'en')} ${plEn(v, 'year', 'years')}`;
  }
  // ── months (≥ 6 months) ────────────────────────────────────────────
  if (seconds >= S_PER_YEAR / 2) {
    const v = sigFigs(seconds / S_PER_MONTH, 3);
    return fr
      ? `${fmtNum(v, 'fr')} mois`
      : `${fmtNum(v, 'en')} months`;
  }
  // ── days ───────────────────────────────────────────────────────────
  if (seconds >= S_PER_DAY) {
    const v = sigFigs(seconds / S_PER_DAY, 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'jour', 'jours')}`
      : `${fmtNum(v, 'en')} ${plEn(v, 'day', 'days')}`;
  }
  // ── hours ──────────────────────────────────────────────────────────
  if (seconds >= S_PER_HOUR) {
    const v = sigFigs(seconds / S_PER_HOUR, 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'heure', 'heures')}`
      : `${fmtNum(v, 'en')} ${plEn(v, 'hour', 'hours')}`;
  }
  // ── minutes ────────────────────────────────────────────────────────
  if (seconds >= S_PER_MINUTE) {
    const v = sigFigs(seconds / S_PER_MINUTE, 3);
    return fr
      ? `${fmtNum(v, 'fr')} ${plFr(v, 'minute', 'minutes')}`
      : `${fmtNum(v, 'en')} ${plEn(v, 'minute', 'minutes')}`;
  }
  // ── seconds ────────────────────────────────────────────────────────
  const v = sigFigs(seconds, 3);
  return fr
    ? `${fmtNum(v, 'fr')} ${plFr(v, 'seconde', 'secondes')}`
    : `${fmtNum(v, 'en')} ${plEn(v, 'second', 'seconds')}`;
}
