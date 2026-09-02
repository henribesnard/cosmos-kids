import type { DeepSkyObject, DeepSkyObjectId, LocalizedText } from './types';

const T = (fr: string, en: string): LocalizedText => ({ fr, en });

/**
 * Bilingual catalogue of deep-sky objects for the Cosmos Kids educational app.
 *
 * Sources:
 *  - NASA Fact Sheets & press releases
 *  - ESA/Hubble object pages (esahubble.org)
 *  - GRAVITY Collaboration 2022 (Sgr A* mass)
 *  - EHT Collaboration 2022 (Sgr A* image)
 *  - Harris 2010 rev. (globular cluster catalogue)
 *  - McConnachie 2012 (Local Group distances)
 */

const DEEP_SKY_CATALOG: Record<DeepSkyObjectId, DeepSkyObject> = {
  /* ---------------------------------------------------------------- */
  /*  Black holes                                                     */
  /* ---------------------------------------------------------------- */
  'sgr-a': {
    id: 'sgr-a',
    kind: 'black-hole',
    name: T('Sagittarius A*', 'Sagittarius A*'),
    shortDescription: T(
      'Le trou noir supermassif au centre de notre galaxie, la Voie lactée. Il est 4 millions de fois plus lourd que le Soleil, mais reste invisible car même la lumière ne peut s\u2019en échapper.',
      'The supermassive black hole at the centre of our galaxy, the Milky Way. It is 4 million times heavier than the Sun, yet remains invisible because not even light can escape it.',
    ),
    funFact: T(
      'En 2022, le télescope Event Horizon a pris la toute première photo de Sgr A* — un anneau de lumière autour d\u2019une ombre noire !',
      'In 2022, the Event Horizon Telescope took the very first photo of Sgr A* — a ring of light around a dark shadow!',
    ),
    color: '#ff6030',
    symbol: '⬤',
    constellation: T('Sagittaire', 'Sagittarius'),
    distanceLy: 26_580,
    diameterLy: 0,
    facts: [
      { label: T('Masse', 'Mass'), value: T('~4,3 millions M☉', '~4.3 million M☉') },
      { label: T('Distance', 'Distance'), value: T('~26 580 al', '~26,580 ly') },
      { label: T('Rayon de Schwarzschild', 'Schwarzschild radius'), value: T('~12,7 millions km', '~12.7 million km') },
      { label: T('Première image', 'First image'), value: T('12 mai 2022 (EHT)', 'May 12, 2022 (EHT)') },
    ],
    sourceUrl: 'https://eventhorizontelescope.org/blog/astronomers-reveal-first-image-black-hole-heart-our-galaxy',
    sourceLabel: 'EHT Collaboration 2022',
  },

  /* ---------------------------------------------------------------- */
  /*  Nebulae                                                         */
  /* ---------------------------------------------------------------- */
  'orion-nebula': {
    id: 'orion-nebula',
    kind: 'nebula',
    name: T('Nébuleuse d\u2019Orion', 'Orion Nebula'),
    shortDescription: T(
      'Un immense nuage de gaz et de poussière où naissent de nouvelles étoiles. C\u2019est la nébuleuse la plus brillante visible à l\u2019œil nu, dans l\u2019épée d\u2019Orion.',
      'A vast cloud of gas and dust where new stars are being born. It is the brightest nebula visible to the naked eye, located in Orion\u2019s sword.',
    ),
    funFact: T(
      'Au cœur de la nébuleuse, quatre jeunes étoiles géantes appelées le Trapèze illuminent le gaz comme un projecteur cosmique.',
      'At the heart of the nebula, four young giant stars called the Trapezium light up the gas like a cosmic spotlight.',
    ),
    color: '#e45080',
    symbol: '☁',
    constellation: T('Orion', 'Orion'),
    distanceLy: 1_344,
    diameterLy: 24,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('M42 / NGC 1976', 'M42 / NGC 1976') },
      { label: T('Distance', 'Distance'), value: T('1 344 al', '1,344 ly') },
      { label: T('Diamètre', 'Diameter'), value: T('~24 al', '~24 ly') },
      { label: T('Type', 'Type'), value: T('Nébuleuse en émission', 'Emission nebula') },
    ],
    sourceUrl: 'https://esahubble.org/images/heic0601a/',
    sourceLabel: 'ESA/Hubble',
  },

  'eagle-nebula': {
    id: 'eagle-nebula',
    kind: 'nebula',
    name: T('Nébuleuse de l\u2019Aigle', 'Eagle Nebula'),
    shortDescription: T(
      'Célèbre pour ses « Piliers de la Création », d\u2019immenses colonnes de gaz et de poussière où naissent des étoiles. Une des images les plus connues de Hubble.',
      'Famous for its "Pillars of Creation", towering columns of gas and dust where stars are forming. One of Hubble\u2019s most iconic images.',
    ),
    funFact: T(
      'Les Piliers de la Création mesurent environ 5 années-lumière de haut — c\u2019est plus que la distance entre le Soleil et l\u2019étoile la plus proche !',
      'The Pillars of Creation are about 5 light-years tall — that\u2019s more than the distance from the Sun to the nearest star!',
    ),
    color: '#c87030',
    symbol: '🦅',
    constellation: T('Serpent', 'Serpens'),
    distanceLy: 5_700,
    diameterLy: 70,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('M16 / NGC 6611', 'M16 / NGC 6611') },
      { label: T('Distance', 'Distance'), value: T('5 700 al', '5,700 ly') },
      { label: T('Diamètre', 'Diameter'), value: T('~70 al', '~70 ly') },
      { label: T('Type', 'Type'), value: T('Nébuleuse en émission', 'Emission nebula') },
    ],
    sourceUrl: 'https://esahubble.org/images/heic1501a/',
    sourceLabel: 'ESA/Hubble — Pillars of Creation',
  },

  'crab-nebula': {
    id: 'crab-nebula',
    kind: 'nebula',
    name: T('Nébuleuse du Crabe', 'Crab Nebula'),
    shortDescription: T(
      'Les restes d\u2019une étoile qui a explosé en supernova en 1054, observée par des astronomes chinois. Au centre tourne un pulsar à 30 tours par seconde.',
      'The remnant of a star that exploded as a supernova in 1054, observed by Chinese astronomers. At its centre spins a pulsar rotating 30 times per second.',
    ),
    funFact: T(
      'Le Crabe grandit encore ! Le nuage s\u2019étend à 1 500 km/s — environ 200 fois moins vite que la lumière !',
      'The Crab is still growing! The cloud expands at 1,500 km/s — about 200 times slower than light!',
    ),
    color: '#60b8e0',
    symbol: '🦀',
    constellation: T('Taureau', 'Taurus'),
    distanceLy: 6_500,
    diameterLy: 11,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('M1 / NGC 1952', 'M1 / NGC 1952') },
      { label: T('Distance', 'Distance'), value: T('6 500 al', '6,500 ly') },
      { label: T('Diamètre', 'Diameter'), value: T('~11 al', '~11 ly') },
      { label: T('Type', 'Type'), value: T('Reste de supernova', 'Supernova remnant') },
    ],
    sourceUrl: 'https://esahubble.org/images/heic0515a/',
    sourceLabel: 'ESA/Hubble',
  },

  'carina-nebula': {
    id: 'carina-nebula',
    kind: 'nebula',
    name: T('Nébuleuse de la Carène', 'Carina Nebula'),
    shortDescription: T(
      'L\u2019une des plus grandes nébuleuses du ciel, abritant Eta Carinae, une étoile 100 fois plus massive que le Soleil et sur le point d\u2019exploser.',
      'One of the largest nebulae in the sky, home to Eta Carinae, a star 100 times more massive than the Sun and on the verge of exploding.',
    ),
    funFact: T(
      'La toute première image du télescope James Webb montrait les « falaises cosmiques » de cette nébuleuse en détail époustouflant.',
      'The very first image from the James Webb Space Telescope showed the "Cosmic Cliffs" of this nebula in breathtaking detail.',
    ),
    color: '#e09050',
    symbol: '⛰',
    constellation: T('Carène', 'Carina'),
    distanceLy: 7_500,
    diameterLy: 300,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('NGC 3372', 'NGC 3372') },
      { label: T('Distance', 'Distance'), value: T('7 500 al', '7,500 ly') },
      { label: T('Diamètre', 'Diameter'), value: T('~300 al', '~300 ly') },
      { label: T('Type', 'Type'), value: T('Nébuleuse en émission', 'Emission nebula') },
    ],
    sourceUrl: 'https://webbtelescope.org/contents/media/images/2022/031/01G77PKB8NKR7S8Z6HBXMYATGJ',
    sourceLabel: 'NASA / JWST',
  },

  'ring-nebula': {
    id: 'ring-nebula',
    kind: 'nebula',
    name: T('Nébuleuse de l\u2019Anneau', 'Ring Nebula'),
    shortDescription: T(
      'Un anneau de gaz coloré éjecté par une étoile mourante. C\u2019est un aperçu de ce qui arrivera à notre Soleil dans 5 milliards d\u2019années.',
      'A colourful ring of gas expelled by a dying star. It is a preview of what will happen to our Sun in 5 billion years.',
    ),
    funFact: T(
      'L\u2019anneau n\u2019est pas vraiment plat : c\u2019est en fait un tube en forme de beigne vu de face !',
      'The ring isn\u2019t really flat: it\u2019s actually a doughnut-shaped tube seen face-on!',
    ),
    color: '#50c090',
    symbol: '◎',
    constellation: T('Lyre', 'Lyra'),
    distanceLy: 2_300,
    diameterLy: 1,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('M57 / NGC 6720', 'M57 / NGC 6720') },
      { label: T('Distance', 'Distance'), value: T('2 300 al', '2,300 ly') },
      { label: T('Diamètre', 'Diameter'), value: T('~1 al', '~1 ly') },
      { label: T('Type', 'Type'), value: T('Nébuleuse planétaire', 'Planetary nebula') },
    ],
    sourceUrl: 'https://esahubble.org/images/opo9838a/',
    sourceLabel: 'ESA/Hubble',
  },

  'horsehead-nebula': {
    id: 'horsehead-nebula',
    kind: 'nebula',
    name: T('Nébuleuse de la Tête de Cheval', 'Horsehead Nebula'),
    shortDescription: T(
      'Un nuage sombre en forme de tête de cheval qui se découpe devant une nébuleuse rouge brillante. C\u2019est l\u2019une des images les plus reconnaissables du ciel.',
      'A dark cloud shaped like a horse\u2019s head silhouetted against a bright red nebula. It is one of the most recognisable images in the sky.',
    ),
    funFact: T(
      'La tête de cheval disparaîtra dans environ 5 millions d\u2019années car le rayonnement des étoiles proches érode lentement la poussière.',
      'The horsehead will vanish in about 5 million years as radiation from nearby stars slowly erodes the dust.',
    ),
    color: '#802020',
    symbol: '♞',
    constellation: T('Orion', 'Orion'),
    distanceLy: 1_350,
    diameterLy: 3.5,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('Barnard 33', 'Barnard 33') },
      { label: T('Distance', 'Distance'), value: T('1 350 al', '1,350 ly') },
      { label: T('Taille', 'Size'), value: T('~3,5 al', '~3.5 ly') },
      { label: T('Type', 'Type'), value: T('Nébuleuse sombre', 'Dark nebula') },
    ],
    sourceUrl: 'https://esahubble.org/images/heic1307a/',
    sourceLabel: 'ESA/Hubble',
  },

  /* ---------------------------------------------------------------- */
  /*  Galaxies                                                        */
  /* ---------------------------------------------------------------- */
  andromeda: {
    id: 'andromeda',
    kind: 'galaxy',
    name: T('Galaxie d\u2019Andromède', 'Andromeda Galaxy'),
    shortDescription: T(
      'La plus grande galaxie voisine de la Voie lactée et le plus lointain objet visible à l\u2019œil nu. Elle contient environ 1 000 milliards d\u2019étoiles.',
      'The Milky Way\u2019s nearest large neighbour and the most distant object visible to the naked eye. It contains about 1 trillion stars.',
    ),
    funFact: T(
      'Andromède fonce vers nous à 110 km/s ! Dans 4,5 milliards d\u2019années, elle fusionnera avec la Voie lactée pour former « Milkomeda ».',
      'Andromeda is rushing toward us at 110 km/s! In 4.5 billion years, it will merge with the Milky Way to form "Milkomeda".',
    ),
    color: '#a0a0d0',
    symbol: '🌀',
    constellation: T('Andromède', 'Andromeda'),
    distanceLy: 2_537_000,
    diameterLy: 220_000,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('M31 / NGC 224', 'M31 / NGC 224') },
      { label: T('Distance', 'Distance'), value: T('2,54 millions al', '2.54 million ly') },
      { label: T('Diamètre', 'Diameter'), value: T('220 000 al', '220,000 ly') },
      { label: T('Étoiles', 'Stars'), value: T('~1 000 milliards', '~1 trillion') },
    ],
    sourceUrl: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/',
    sourceLabel: 'NASA / Hubble',
  },

  triangulum: {
    id: 'triangulum',
    kind: 'galaxy',
    name: T('Galaxie du Triangle', 'Triangulum Galaxy'),
    shortDescription: T(
      'La troisième plus grande galaxie du Groupe local, après Andromède et la Voie lactée. Ses bras spiraux sont riches en régions où naissent des étoiles.',
      'The third-largest galaxy in the Local Group, after Andromeda and the Milky Way. Its spiral arms are rich in star-forming regions.',
    ),
    funFact: T(
      'Le Triangle contient NGC 604, l\u2019une des plus grandes « pouponnières d\u2019étoiles » connues — 40 fois la taille de la nébuleuse d\u2019Orion !',
      'Triangulum contains NGC 604, one of the largest known "star nurseries" — 40 times the size of the Orion Nebula!',
    ),
    color: '#8090c0',
    symbol: '△',
    constellation: T('Triangle', 'Triangulum'),
    distanceLy: 2_730_000,
    diameterLy: 60_000,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('M33 / NGC 598', 'M33 / NGC 598') },
      { label: T('Distance', 'Distance'), value: T('2,73 millions al', '2.73 million ly') },
      { label: T('Diamètre', 'Diameter'), value: T('60 000 al', '60,000 ly') },
      { label: T('Étoiles', 'Stars'), value: T('~40 milliards', '~40 billion') },
    ],
    sourceUrl: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-33/',
    sourceLabel: 'NASA / Hubble',
  },

  lmc: {
    id: 'lmc',
    kind: 'galaxy',
    name: T('Grand Nuage de Magellan', 'Large Magellanic Cloud'),
    shortDescription: T(
      'Une petite galaxie satellite de la Voie lactée, visible depuis l\u2019hémisphère sud. Elle abrite la Nébuleuse de la Tarentule, la plus active « usine à étoiles » de notre voisinage.',
      'A small satellite galaxy of the Milky Way, visible from the Southern Hemisphere. It hosts the Tarantula Nebula, the most active "star factory" in our neighbourhood.',
    ),
    funFact: T(
      'En 1987, une étoile du Grand Nuage a explosé en supernova (SN 1987A) — la supernova la plus proche observée depuis 400 ans !',
      'In 1987, a star in the LMC exploded as a supernova (SN 1987A) — the closest supernova observed in 400 years!',
    ),
    color: '#c0b890',
    symbol: '☁',
    constellation: T('Dorade / Table', 'Dorado / Mensa'),
    distanceLy: 163_000,
    diameterLy: 14_000,
    facts: [
      { label: T('Distance', 'Distance'), value: T('163 000 al', '163,000 ly') },
      { label: T('Diamètre', 'Diameter'), value: T('14 000 al', '14,000 ly') },
      { label: T('Étoiles', 'Stars'), value: T('~20-30 milliards', '~20-30 billion') },
      { label: T('Type', 'Type'), value: T('Galaxie irrégulière', 'Irregular galaxy') },
    ],
    sourceUrl: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/',
    sourceLabel: 'NASA',
  },

  smc: {
    id: 'smc',
    kind: 'galaxy',
    name: T('Petit Nuage de Magellan', 'Small Magellanic Cloud'),
    shortDescription: T(
      'La petite sœur du Grand Nuage de Magellan, également satellite de la Voie lactée. Les deux nuages sont reliés par un pont de gaz hydrogène.',
      'The little sister of the Large Magellanic Cloud, also a satellite of the Milky Way. The two clouds are connected by a bridge of hydrogen gas.',
    ),
    funFact: T(
      'Le Petit Nuage a été nommé d\u2019après Fernand de Magellan qui l\u2019a documenté lors de son tour du monde en 1519.',
      'The Small Cloud was named after Ferdinand Magellan who documented it during his voyage around the world in 1519.',
    ),
    color: '#b0a880',
    symbol: '☁',
    constellation: T('Toucan', 'Tucana'),
    distanceLy: 200_000,
    diameterLy: 7_000,
    facts: [
      { label: T('Distance', 'Distance'), value: T('200 000 al', '200,000 ly') },
      { label: T('Diamètre', 'Diameter'), value: T('7 000 al', '7,000 ly') },
      { label: T('Étoiles', 'Stars'), value: T('~3 milliards', '~3 billion') },
      { label: T('Type', 'Type'), value: T('Galaxie naine irrégulière', 'Dwarf irregular galaxy') },
    ],
    sourceUrl: 'https://science.nasa.gov/mission/hubble/',
    sourceLabel: 'NASA',
  },

  /* ---------------------------------------------------------------- */
  /*  Star clusters                                                   */
  /* ---------------------------------------------------------------- */
  'omega-centauri': {
    id: 'omega-centauri',
    kind: 'globular-cluster',
    name: T('Omega du Centaure', 'Omega Centauri'),
    shortDescription: T(
      'Le plus grand et le plus brillant amas globulaire de la Voie lactée, contenant environ 10 millions d\u2019étoiles. Il pourrait être le noyau d\u2019une ancienne galaxie naine avalée.',
      'The largest and brightest globular cluster in the Milky Way, containing about 10 million stars. It may be the core of an ancient dwarf galaxy that was swallowed.',
    ),
    funFact: T(
      'Omega Centauri est si gros qu\u2019il était considéré comme une simple étoile avant qu\u2019on y regarde de plus près au télescope !',
      'Omega Centauri is so large it was considered a single star before telescopes revealed its true nature!',
    ),
    color: '#e0d8c0',
    symbol: 'Ω',
    constellation: T('Centaure', 'Centaurus'),
    distanceLy: 17_000,
    diameterLy: 150,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('NGC 5139', 'NGC 5139') },
      { label: T('Distance', 'Distance'), value: T('17 000 al', '17,000 ly') },
      { label: T('Diamètre', 'Diameter'), value: T('~150 al', '~150 ly') },
      { label: T('Étoiles', 'Stars'), value: T('~10 millions', '~10 million') },
    ],
    sourceUrl: 'https://esahubble.org/images/opo0133a/',
    sourceLabel: 'ESA/Hubble',
  },

  pleiades: {
    id: 'pleiades',
    kind: 'open-cluster',
    name: T('Les Pléiades', 'The Pleiades'),
    shortDescription: T(
      'Un amas d\u2019étoiles jeunes et brillantes que l\u2019on peut voir à l\u2019œil nu. Les sept étoiles les plus lumineuses sont souvent appelées les « Sept Sœurs ».',
      'A cluster of young, bright stars visible to the naked eye. The seven brightest stars are often called the "Seven Sisters".',
    ),
    funFact: T(
      'Les Pléiades ne sont âgées que de 100 millions d\u2019années — de vrais bébés cosmiques par rapport au Soleil (4,6 milliards d\u2019années) !',
      'The Pleiades are only 100 million years old — true cosmic babies compared to the Sun (4.6 billion years)!',
    ),
    color: '#a0c0ff',
    symbol: '✦',
    constellation: T('Taureau', 'Taurus'),
    distanceLy: 444,
    diameterLy: 17,
    facts: [
      { label: T('Catalogue', 'Catalog'), value: T('M45', 'M45') },
      { label: T('Distance', 'Distance'), value: T('444 al', '444 ly') },
      { label: T('Étoiles', 'Stars'), value: T('~1 000', '~1,000') },
      { label: T('Âge', 'Age'), value: T('~100 millions d\u2019années', '~100 million years') },
    ],
    sourceUrl: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-45/',
    sourceLabel: 'NASA / Hubble',
  },
};

export const DEEP_SKY_OBJECTS: readonly DeepSkyObject[] = Object.values(DEEP_SKY_CATALOG);

export const DEEP_SKY_BY_ID: Readonly<Record<DeepSkyObjectId, DeepSkyObject>> = DEEP_SKY_CATALOG;

export function getDeepSkyObject(id: DeepSkyObjectId): DeepSkyObject {
  return DEEP_SKY_CATALOG[id];
}
