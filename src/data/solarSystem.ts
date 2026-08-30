import {
  type CelestialBody,
  type CelestialObjectId,
  type Locale,
  type LocalizedText,
  type PlanetId,
  type ScientificQuantity,
  type ScientificUnit,
  type TextureAsset,
  type TextureRepresentationType,
} from './types';

const RETRIEVED_AT = '2026-08-28';
const TEXTURE_ROOT = '/assets/textures/solar-system/sss-2k';
const TEXTURE_SOURCE_URL = 'https://www.solarsystemscope.com/textures/';
const TEXTURE_ATTRIBUTION = 'Solar System Scope';
const TEXTURE_LICENSE = 'CC BY 4.0';
const FACT_SHEET_ATTRIBUTION = 'NASA / NSSDC';

const T = (fr: string, en: string): LocalizedText => ({ fr, en });

function quantityFactory(sourceUrl: string) {
  return <Unit extends ScientificUnit>(
    value: number,
    unit: Unit,
    approximate = false,
  ): ScientificQuantity<Unit> => ({
    value,
    unit,
    ...(approximate ? { approximate: true } : {}),
    sourceUrl,
    attribution: FACT_SHEET_ATTRIBUTION,
    retrievedAt: RETRIEVED_AT,
  });
}

function texture(
  assetId: string,
  albedoFile: string,
  representationType: TextureRepresentationType,
  caveat: LocalizedText,
  auxiliaryFiles?: Readonly<Partial<Record<'atmosphere' | 'clouds' | 'emissive' | 'normal' | 'rings' | 'specular', string>>>,
): TextureAsset {
  const auxiliaryUrls = auxiliaryFiles
    ? Object.fromEntries(
        Object.entries(auxiliaryFiles).map(([kind, file]) => [kind, `${TEXTURE_ROOT}/${file}`]),
      )
    : undefined;

  return {
    assetId,
    albedoUrl: `${TEXTURE_ROOT}/${albedoFile}`,
    ...(auxiliaryUrls ? { auxiliaryUrls } : {}),
    sourceUrl: TEXTURE_SOURCE_URL,
    attribution: TEXTURE_ATTRIBUTION,
    license: TEXTURE_LICENSE,
    retrievedAt: RETRIEVED_AT,
    representationType,
    caveat,
    status: 'source',
  };
}

const compositeCaveat = T(
  'Carte composite destinée à la visualisation : couleurs renforcées et zones manquantes parfois reconstruites. Ce n’est pas une image prise en direct.',
  'Composite map made for visualisation: colours are enhanced and missing areas may be reconstructed. This is not a live image.',
);

const gasGiantCaveat = T(
  'Carte composite des nuages à une époque donnée. Les bandes et tempêtes évoluent : cette apparence n’est pas en temps réel.',
  'Composite cloud map from a particular epoch. Bands and storms evolve, so this appearance is not real-time.',
);

const sunSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html';
const moonSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html';
const mercurySource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html';
const venusSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html';
const earthSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html';
const marsSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html';
const jupiterSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html';
const saturnSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html';
const uranusSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html';
const neptuneSource = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html';

const qSun = quantityFactory(sunSource);
const qMoon = quantityFactory(moonSource);
const qMercury = quantityFactory(mercurySource);
const qVenus = quantityFactory(venusSource);
const qEarth = quantityFactory(earthSource);
const qMars = quantityFactory(marsSource);
const qJupiter = quantityFactory(jupiterSource);
const qSaturn = quantityFactory(saturnSource);
const qUranus = quantityFactory(uranusSource);
const qNeptune = quantityFactory(neptuneSource);

export const PLANET_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const satisfies readonly PlanetId[];

export const EXPLORABLE_BODY_IDS = [
  'sun',
  'moon',
  ...PLANET_IDS,
] as const satisfies readonly CelestialObjectId[];

export const SOLAR_SYSTEM_BODIES = [
  {
    id: 'sun',
    jplId: 10,
    kind: 'star',
    parentId: null,
    name: T('Soleil', 'Sun'),
    shortDescription: T(
      'Notre étoile, au centre du Système solaire.',
      'Our star, at the centre of the Solar System.',
    ),
    funFact: T(
      'La lumière du Soleil met environ huit minutes à atteindre la Terre.',
      'Sunlight takes about eight minutes to reach Earth.',
    ),
    science: {
      meanRadius: qSun(695_700, 'km', true),
      mass: qSun(1.9885e30, 'kg', true),
      surfaceGravity: qSun(274, 'm/s²', true),
      siderealRotation: qSun(609.12, 'h', true),
      axialTilt: qSun(7.25, 'deg', true),
      meanTemperature: qSun(5_500, '°C', true),
      rotationDirection: 'prograde',
    },
    render: {
      radiusSceneUnits: 16,
      baseColor: '#ffcf6b',
      emissive: true,
      texture: texture(
        'sss-2k-sun-color',
        'sun-color.jpg',
        'illustrative-reconstruction',
        T(
          'Texture illustrative renforcée : elle ne montre pas l’activité solaire actuelle.',
          'Enhanced illustrative texture: it does not show current solar activity.',
        ),
      ),
    },
  },
  {
    id: 'moon',
    jplId: 301,
    kind: 'moon',
    parentId: 'earth',
    name: T('Lune', 'Moon'),
    shortDescription: T(
      'Le satellite naturel de la Terre.',
      "Earth's natural satellite.",
    ),
    funFact: T(
      'Sa rotation dure autant que son orbite : elle nous montre presque toujours la même face.',
      'Its rotation lasts as long as its orbit, so it shows us nearly the same face.',
    ),
    science: {
      meanRadius: qMoon(1_737.4, 'km', true),
      mass: qMoon(7.342e22, 'kg', true),
      surfaceGravity: qMoon(1.62, 'm/s²', true),
      siderealRotation: qMoon(655.728, 'h', true),
      axialTilt: qMoon(6.68, 'deg', true),
      rotationDirection: 'prograde',
      orbit: {
        primaryId: 'earth',
        semiMajorAxis: qMoon(384_400, 'km', true),
        siderealPeriod: qMoon(27.3217, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 1.7,
      orbitRadiusSceneUnits: 26,
      baseColor: '#b9b6ae',
      texture: texture('sss-2k-moon-color', 'moon-color.jpg', 'enhanced-composite', compositeCaveat),
    },
  },
  {
    id: 'mercury',
    jplId: 199,
    kind: 'planet',
    parentId: 'sun',
    name: T('Mercure', 'Mercury'),
    shortDescription: T(
      'La plus petite planète et la plus proche du Soleil.',
      'The smallest planet and the closest to the Sun.',
    ),
    funFact: T(
      'Une année sur Mercure dure moins longtemps que deux de ses journées solaires.',
      'A year on Mercury is shorter than two of its solar days.',
    ),
    science: {
      meanRadius: qMercury(2_439.7, 'km', true),
      mass: qMercury(3.3011e23, 'kg', true),
      surfaceGravity: qMercury(3.7, 'm/s²', true),
      siderealRotation: qMercury(1_407.6, 'h', true),
      axialTilt: qMercury(0.034, 'deg', true),
      meanTemperature: qMercury(167, '°C', true),
      rotationDirection: 'prograde',
      orbit: {
        primaryId: 'sun',
        semiMajorAxis: qMercury(57_909_227, 'km', true),
        siderealPeriod: qMercury(87.969, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 2.2,
      orbitRadiusSceneUnits: 58,
      baseColor: '#9a8f86',
      texture: texture('sss-2k-mercury-color', 'mercury-color.jpg', 'enhanced-composite', compositeCaveat),
    },
  },
  {
    id: 'venus',
    jplId: 299,
    kind: 'planet',
    parentId: 'sun',
    name: T('Vénus', 'Venus'),
    shortDescription: T(
      'Un monde rocheux caché sous une atmosphère très épaisse.',
      'A rocky world hidden beneath a very thick atmosphere.',
    ),
    funFact: T(
      'Vénus tourne sur elle-même dans le sens opposé à la plupart des planètes.',
      'Venus spins in the opposite direction to most planets.',
    ),
    science: {
      meanRadius: qVenus(6_051.8, 'km', true),
      mass: qVenus(4.8675e24, 'kg', true),
      surfaceGravity: qVenus(8.87, 'm/s²', true),
      siderealRotation: qVenus(5_832.5, 'h', true),
      axialTilt: qVenus(177.36, 'deg', true),
      meanTemperature: qVenus(464, '°C', true),
      rotationDirection: 'retrograde',
      orbit: {
        primaryId: 'sun',
        semiMajorAxis: qVenus(108_209_475, 'km', true),
        siderealPeriod: qVenus(224.701, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 5.9,
      orbitRadiusSceneUnits: 108,
      baseColor: '#e8c98d',
      atmosphere: { color: '#f2c879', intensity: 0.72 },
      texture: texture(
        'sss-2k-venus-color',
        'venus-surface-color.jpg',
        'radar-composite',
        T(
          'La surface est une carte radar recolorée ; la couche atmosphérique est une visualisation séparée.',
          'The surface is a colourised radar map; the atmosphere is a separate visualisation layer.',
        ),
        { atmosphere: 'venus-atmosphere-color.jpg' },
      ),
    },
  },
  {
    id: 'earth',
    jplId: 399,
    kind: 'planet',
    parentId: 'sun',
    name: T('Terre', 'Earth'),
    shortDescription: T(
      'Notre planète, couverte d’océans et protégée par une atmosphère.',
      'Our planet, covered by oceans and protected by an atmosphere.',
    ),
    funFact: T(
      'Environ 71 % de la surface terrestre est recouverte par les océans.',
      "About 71% of Earth's surface is covered by oceans.",
    ),
    science: {
      meanRadius: qEarth(6_371, 'km', true),
      mass: qEarth(5.97237e24, 'kg', true),
      surfaceGravity: qEarth(9.80665, 'm/s²', true),
      siderealRotation: qEarth(23.9345, 'h', true),
      axialTilt: qEarth(23.439, 'deg', true),
      meanTemperature: qEarth(15, '°C', true),
      rotationDirection: 'prograde',
      orbit: {
        primaryId: 'sun',
        semiMajorAxis: qEarth(149_598_262, 'km', true),
        siderealPeriod: qEarth(365.256, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 6.2,
      orbitRadiusSceneUnits: 150,
      baseColor: '#3f8fd6',
      atmosphere: { color: '#5fa8ff', intensity: 0.8 },
      texture: texture(
        'sss-2k-earth-color',
        'earth-day-color.jpg',
        'observational-composite',
        T(
          'Mosaïque globale composite : nuages et lumières nocturnes sont des couches séparées et non simultanées.',
          'Global composite mosaic: clouds and night lights are separate layers and are not simultaneous observations.',
        ),
        {
          clouds: 'earth-clouds-luminance.jpg',
          emissive: 'earth-night-emissive.jpg',
          normal: 'earth-normal.png',
          specular: 'earth-specular.png',
        },
      ),
    },
  },
  {
    id: 'mars',
    jplId: 499,
    kind: 'planet',
    parentId: 'sun',
    name: T('Mars', 'Mars'),
    shortDescription: T(
      'Une planète rocheuse froide, colorée par les oxydes de fer.',
      'A cold rocky planet coloured by iron oxides.',
    ),
    funFact: T(
      'Olympus Mons, sur Mars, est le plus grand volcan connu du Système solaire.',
      'Olympus Mons on Mars is the largest known volcano in the Solar System.',
    ),
    science: {
      meanRadius: qMars(3_389.5, 'km', true),
      mass: qMars(6.4171e23, 'kg', true),
      surfaceGravity: qMars(3.71, 'm/s²', true),
      siderealRotation: qMars(24.6229, 'h', true),
      axialTilt: qMars(25.19, 'deg', true),
      meanTemperature: qMars(-65, '°C', true),
      rotationDirection: 'prograde',
      orbit: {
        primaryId: 'sun',
        semiMajorAxis: qMars(227_943_824, 'km', true),
        siderealPeriod: qMars(686.98, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 3.3,
      orbitRadiusSceneUnits: 228,
      baseColor: '#c1543a',
      atmosphere: { color: '#d98b68', intensity: 0.18 },
      texture: texture('sss-2k-mars-color', 'mars-color.jpg', 'enhanced-composite', compositeCaveat),
    },
  },
  {
    id: 'jupiter',
    jplId: 599,
    kind: 'planet',
    parentId: 'sun',
    name: T('Jupiter', 'Jupiter'),
    shortDescription: T(
      'La plus grande planète, une géante faite surtout d’hydrogène et d’hélium.',
      'The largest planet, a giant made mostly of hydrogen and helium.',
    ),
    funFact: T(
      'La Grande Tache rouge est une tempête plus large que la Terre.',
      'The Great Red Spot is a storm wider than Earth.',
    ),
    science: {
      meanRadius: qJupiter(69_911, 'km', true),
      mass: qJupiter(1.8982e27, 'kg', true),
      surfaceGravity: qJupiter(24.79, 'm/s²', true),
      siderealRotation: qJupiter(9.925, 'h', true),
      axialTilt: qJupiter(3.13, 'deg', true),
      meanTemperature: qJupiter(-110, '°C', true),
      rotationDirection: 'prograde',
      orbit: {
        primaryId: 'sun',
        semiMajorAxis: qJupiter(778_340_821, 'km', true),
        siderealPeriod: qJupiter(4_332.59, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 11.5,
      orbitRadiusSceneUnits: 300,
      baseColor: '#d9a06a',
      atmosphere: { color: '#d9b58c', intensity: 0.22 },
      texture: texture('sss-2k-jupiter-color', 'jupiter-color.jpg', 'enhanced-composite', gasGiantCaveat),
    },
  },
  {
    id: 'saturn',
    jplId: 699,
    kind: 'planet',
    parentId: 'sun',
    name: T('Saturne', 'Saturn'),
    shortDescription: T(
      'Une géante gazeuse entourée d’un vaste système d’anneaux.',
      'A gas giant surrounded by a vast ring system.',
    ),
    funFact: T(
      'Ses anneaux sont surtout composés de glace, avec des fragments allant de grains à de gros blocs.',
      'Its rings are mostly ice, with fragments ranging from grains to large chunks.',
    ),
    science: {
      meanRadius: qSaturn(58_232, 'km', true),
      mass: qSaturn(5.6834e26, 'kg', true),
      surfaceGravity: qSaturn(10.44, 'm/s²', true),
      siderealRotation: qSaturn(10.7, 'h', true),
      axialTilt: qSaturn(26.73, 'deg', true),
      meanTemperature: qSaturn(-140, '°C', true),
      rotationDirection: 'prograde',
      orbit: {
        primaryId: 'sun',
        semiMajorAxis: qSaturn(1_426_666_422, 'km', true),
        siderealPeriod: qSaturn(10_759.22, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 9.8,
      orbitRadiusSceneUnits: 380,
      baseColor: '#e3c88f',
      atmosphere: { color: '#e3d2ac', intensity: 0.18 },
      rings: {
        innerRadiusSceneUnits: 13,
        outerRadiusSceneUnits: 21,
        textureUrl: `${TEXTURE_ROOT}/saturn-rings-rgba.png`,
      },
      texture: texture(
        'sss-2k-saturn-color',
        'saturn-color.jpg',
        'enhanced-composite',
        gasGiantCaveat,
        { rings: 'saturn-rings-rgba.png' },
      ),
    },
  },
  {
    id: 'uranus',
    jplId: 799,
    kind: 'planet',
    parentId: 'sun',
    name: T('Uranus', 'Uranus'),
    shortDescription: T(
      'Une géante de glace qui tourne presque couchée sur son orbite.',
      'An ice giant that spins almost on its side.',
    ),
    funFact: T(
      'Son axe est incliné d’environ 98°, probablement à la suite d’une ancienne collision.',
      'Its axis is tilted by about 98°, possibly after an ancient collision.',
    ),
    science: {
      meanRadius: qUranus(25_362, 'km', true),
      mass: qUranus(8.681e25, 'kg', true),
      surfaceGravity: qUranus(8.69, 'm/s²', true),
      siderealRotation: qUranus(17.24, 'h', true),
      axialTilt: qUranus(97.77, 'deg', true),
      meanTemperature: qUranus(-195, '°C', true),
      rotationDirection: 'retrograde',
      orbit: {
        primaryId: 'sun',
        semiMajorAxis: qUranus(2_870_658_186, 'km', true),
        siderealPeriod: qUranus(30_688.5, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 7.2,
      orbitRadiusSceneUnits: 450,
      baseColor: '#9fd8e0',
      atmosphere: { color: '#9fd8e0', intensity: 0.2 },
      texture: texture('sss-2k-uranus-color', 'uranus-color.jpg', 'enhanced-composite', gasGiantCaveat),
    },
  },
  {
    id: 'neptune',
    jplId: 899,
    kind: 'planet',
    parentId: 'sun',
    name: T('Neptune', 'Neptune'),
    shortDescription: T(
      'La planète la plus lointaine, une géante de glace bleue et venteuse.',
      'The farthest planet, a blue and windy ice giant.',
    ),
    funFact: T(
      'Les vents de Neptune peuvent dépasser 2 000 km/h.',
      "Neptune's winds can exceed 2,000 km/h.",
    ),
    science: {
      meanRadius: qNeptune(24_622, 'km', true),
      mass: qNeptune(1.02413e26, 'kg', true),
      surfaceGravity: qNeptune(11.15, 'm/s²', true),
      siderealRotation: qNeptune(16.11, 'h', true),
      axialTilt: qNeptune(28.32, 'deg', true),
      meanTemperature: qNeptune(-200, '°C', true),
      rotationDirection: 'prograde',
      orbit: {
        primaryId: 'sun',
        semiMajorAxis: qNeptune(4_498_396_441, 'km', true),
        siderealPeriod: qNeptune(60_182, 'd', true),
      },
    },
    render: {
      radiusSceneUnits: 7,
      orbitRadiusSceneUnits: 520,
      baseColor: '#4a72c8',
      atmosphere: { color: '#5278d4', intensity: 0.24 },
      texture: texture('sss-2k-neptune-color', 'neptune-color.jpg', 'enhanced-composite', gasGiantCaveat),
    },
  },
] as const satisfies readonly CelestialBody[];

export const SOLAR_SYSTEM_BODY_BY_ID = Object.freeze(
  Object.fromEntries(SOLAR_SYSTEM_BODIES.map((body) => [body.id, body])),
) as Readonly<Record<CelestialObjectId, CelestialBody>>;

// Re-export from types for backwards compatibility.
export { isCelestialObjectId } from './types';

export function getBodyById(id: CelestialObjectId): CelestialBody {
  return SOLAR_SYSTEM_BODY_BY_ID[id];
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale];
}
