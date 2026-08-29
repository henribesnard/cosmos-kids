export type Locale = 'fr' | 'en';

export interface LocalizedText {
  readonly fr: string;
  readonly en: string;
}

export const CELESTIAL_OBJECT_IDS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;

export type CelestialObjectId = (typeof CELESTIAL_OBJECT_IDS)[number];
export type PlanetId = Exclude<CelestialObjectId, 'sun' | 'moon'>;
export type CelestialKind = 'star' | 'planet' | 'moon';

export type ScientificUnit =
  | 'km'
  | 'kg'
  | 'm/s²'
  | 'h'
  | 'd'
  | 'deg'
  | '°C';

export interface ScientificQuantity<Unit extends ScientificUnit = ScientificUnit> {
  readonly value: number;
  readonly unit: Unit;
  readonly approximate?: boolean;
  readonly sourceUrl: string;
  readonly attribution: string;
  readonly retrievedAt: string;
}

export interface ScientificOrbit {
  readonly primaryId: CelestialObjectId;
  readonly semiMajorAxis: ScientificQuantity<'km'>;
  readonly siderealPeriod: ScientificQuantity<'d'>;
}

export interface CelestialScience {
  readonly meanRadius: ScientificQuantity<'km'>;
  readonly mass: ScientificQuantity<'kg'>;
  readonly surfaceGravity: ScientificQuantity<'m/s²'>;
  readonly siderealRotation: ScientificQuantity<'h'>;
  readonly axialTilt: ScientificQuantity<'deg'>;
  readonly meanTemperature?: ScientificQuantity<'°C'>;
  readonly rotationDirection: 'prograde' | 'retrograde';
  readonly orbit?: ScientificOrbit;
}

export type TextureRepresentationType =
  | 'observational-composite'
  | 'enhanced-composite'
  | 'radar-composite'
  | 'illustrative-reconstruction';

export type TextureMapKind =
  | 'atmosphere'
  | 'clouds'
  | 'emissive'
  | 'normal'
  | 'rings'
  | 'specular';

export interface TextureAsset {
  readonly assetId: string;
  readonly albedoUrl: string;
  readonly auxiliaryUrls?: Readonly<Partial<Record<TextureMapKind, string>>>;
  readonly sourceUrl: string;
  readonly attribution: string;
  readonly license: string;
  readonly retrievedAt: string;
  readonly representationType: TextureRepresentationType;
  readonly caveat: LocalizedText;
  readonly status: 'source' | 'placeholder';
}

export interface AtmosphereRenderDescriptor {
  readonly color: string;
  readonly intensity: number;
}

export interface RingRenderDescriptor {
  readonly innerRadiusSceneUnits: number;
  readonly outerRadiusSceneUnits: number;
  readonly textureUrl: string;
}

/**
 * Values in this descriptor are deliberately visual scene values. They are
 * never suitable for a scientific calculation or for display as physical data.
 */
export interface CelestialRenderDescriptor {
  readonly radiusSceneUnits: number;
  readonly orbitRadiusSceneUnits?: number;
  readonly baseColor: string;
  readonly emissive?: boolean;
  readonly atmosphere?: AtmosphereRenderDescriptor;
  readonly rings?: RingRenderDescriptor;
  readonly texture: TextureAsset;
}

export interface CelestialBody {
  readonly id: CelestialObjectId;
  readonly jplId: number;
  readonly kind: CelestialKind;
  readonly parentId: CelestialObjectId | null;
  readonly name: LocalizedText;
  readonly shortDescription: LocalizedText;
  readonly funFact: LocalizedText;
  readonly science: CelestialScience;
  readonly render: CelestialRenderDescriptor;
}
