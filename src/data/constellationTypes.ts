import type { DeepSkyObjectId, LocalizedText } from './types';

/* ------------------------------------------------------------------ */
/*  IAU 88 constellation abbreviations                                */
/* ------------------------------------------------------------------ */

export const CONSTELLATION_ABBRS = [
  'And', 'Ant', 'Aps', 'Aql', 'Aqr', 'Ara', 'Ari', 'Aur',
  'Boo', 'CMa', 'CMi', 'CVn', 'Cae', 'Cam', 'Cap', 'Car',
  'Cas', 'Cen', 'Cep', 'Cet', 'Cha', 'Cir', 'Cnc', 'Col',
  'Com', 'CrA', 'CrB', 'Crt', 'Cru', 'Crv', 'Cyg', 'Del',
  'Dor', 'Dra', 'Equ', 'Eri', 'For', 'Gem', 'Gru', 'Her',
  'Hor', 'Hya', 'Hyi', 'Ind', 'LMi', 'Lac', 'Leo', 'Lep',
  'Lib', 'Lup', 'Lyn', 'Lyr', 'Men', 'Mic', 'Mon', 'Mus',
  'Nor', 'Oct', 'Oph', 'Ori', 'Pav', 'Peg', 'Per', 'Phe',
  'Pic', 'PsA', 'Psc', 'Pup', 'Pyx', 'Ret', 'Scl', 'Sco',
  'Sct', 'Ser', 'Sex', 'Sge', 'Sgr', 'Tau', 'Tel', 'TrA',
  'Tri', 'Tuc', 'UMa', 'UMi', 'Vel', 'Vir', 'Vol', 'Vul',
] as const;

export type ConstellationAbbr = (typeof CONSTELLATION_ABBRS)[number];

export function isConstellationAbbr(id: string): id is ConstellationAbbr {
  return (CONSTELLATION_ABBRS as readonly string[]).includes(id);
}

/* ------------------------------------------------------------------ */
/*  Constellation season and hemisphere                               */
/* ------------------------------------------------------------------ */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Hemisphere = 'north' | 'south' | 'both';

/* ------------------------------------------------------------------ */
/*  Constellation definition                                          */
/* ------------------------------------------------------------------ */

export interface ConstellationDef {
  readonly id: ConstellationAbbr;
  readonly name: LocalizedText;
  readonly genitive: LocalizedText;
  readonly symbol: string;
  readonly shortDescription: LocalizedText;
  readonly mythology: LocalizedText;
  readonly science: LocalizedText;
  readonly color: string;
  readonly bestSeason: Season | 'circumpolar';
  readonly hemisphere: Hemisphere;
  readonly areaSqDeg: number;
  readonly brightestStar: LocalizedText;
  readonly deepSkyObjectIds: readonly DeepSkyObjectId[];
  readonly featured: boolean;
}

/* ------------------------------------------------------------------ */
/*  Generated star/line data shape                                    */
/* ------------------------------------------------------------------ */

export interface GeneratedStar {
  readonly id: number;
  readonly ra: number;
  readonly dec: number;
  readonly mag: number;
  readonly bv: number | null;
  readonly name: string | null;
  readonly con: ConstellationAbbr | null;
}

export interface GeneratedConstellationData {
  readonly _meta: {
    readonly starCount: number;
    readonly constellationCount: number;
    readonly lineSegmentCount: number;
  };
  readonly stars: readonly GeneratedStar[];
  readonly constellationLines: Readonly<Record<string, readonly (readonly [number, number])[][]>>;
  readonly abbreviations: readonly string[];
}
