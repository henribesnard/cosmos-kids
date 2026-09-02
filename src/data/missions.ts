import type { CelestialObjectId, DeepSkyObjectId, LocalizedText } from './types';
import type { ConstellationAbbr } from './constellationTypes';

/** A step target can be any navigable destination in the app. */
export type MissionStepTarget = CelestialObjectId | DeepSkyObjectId | ConstellationAbbr;

export interface MissionStepDef {
  readonly target: MissionStepTarget;
  readonly label: LocalizedText;
  readonly detail: LocalizedText;
}

export type MissionId =
  | 'solar-neighbourhood'
  | 'grand-tour'
  | 'constellation-quest'
  | 'nebula-hunt'
  | 'galaxy-voyage';

export interface MissionDef {
  readonly id: MissionId;
  /** Display number (1-5). */
  readonly number: number;
  readonly title: LocalizedText;
  /** Emoji used for the reward badge. */
  readonly icon: string;
  readonly reward: LocalizedText;
  readonly steps: readonly MissionStepDef[];
}

const T = (fr: string, en: string): LocalizedText => ({ fr, en });

export const MISSIONS: readonly MissionDef[] = [
  {
    id: 'solar-neighbourhood',
    number: 1,
    title: T('Notre voisinage spatial', 'Our Space Neighbourhood'),
    icon: '🏅',
    reward: T('Explorateur du Système solaire', 'Solar System Explorer'),
    steps: [
      { target: 'earth', label: T('Retrouver la Terre', 'Find Earth'), detail: T('Notre point de départ', 'Our starting point') },
      { target: 'moon', label: T('Visiter la Lune', 'Visit the Moon'), detail: T('Le satellite de la Terre', "Earth's satellite") },
      { target: 'mars', label: T('Observer Mars', 'Observe Mars'), detail: T('La planète rouge', 'The red planet') },
      { target: 'saturn', label: T('Trouver les anneaux', 'Find the rings'), detail: T('Le secret de Saturne', "Saturn's secret") },
    ],
  },
  {
    id: 'grand-tour',
    number: 2,
    title: T('Le tour du Soleil', 'Around the Sun'),
    icon: '🚀',
    reward: T('Grand Navigateur', 'Grand Navigator'),
    steps: [
      { target: 'mercury', label: T('Frôler le Soleil', 'Skim past the Sun'), detail: T('La planète la plus rapide', 'The fastest planet') },
      { target: 'venus', label: T('Percer les nuages', 'Pierce the clouds'), detail: T('Un monde brûlant et caché', 'A scorching, hidden world') },
      { target: 'jupiter', label: T('Affronter la tempête', 'Face the storm'), detail: T('La géante gazeuse', 'The gas giant') },
      { target: 'uranus', label: T('La géante couchée', 'The tilted giant'), detail: T('Une planète qui roule sur son orbite', 'A planet that rolls along its orbit') },
      { target: 'neptune', label: T('Atteindre les confins', 'Reach the edge'), detail: T('Le monde des vents extrêmes', 'The world of extreme winds') },
    ],
  },
  {
    id: 'constellation-quest',
    number: 3,
    title: T('Dessins dans le ciel', 'Patterns in the Sky'),
    icon: '⭐',
    reward: T('Cartographe des étoiles', 'Star Cartographer'),
    steps: [
      { target: 'Ori' as ConstellationAbbr, label: T('Trouver le chasseur', 'Find the hunter'), detail: T('La constellation d\u2019Orion', 'The constellation of Orion') },
      { target: 'UMa' as ConstellationAbbr, label: T('Suivre la Grande Ourse', 'Follow the Great Bear'), detail: T('La casserole du ciel', 'The sky\u2019s saucepan') },
      { target: 'Cyg' as ConstellationAbbr, label: T('Survoler le Cygne', 'Fly over the Swan'), detail: T('Le Triangle d\u2019été', 'The Summer Triangle') },
      { target: 'Sco' as ConstellationAbbr, label: T('Repérer le Scorpion', 'Spot the Scorpion'), detail: T('Le cœur rouge d\u2019Antarès', 'The red heart of Antares') },
    ],
  },
  {
    id: 'nebula-hunt',
    number: 4,
    title: T('Nébuleuses et merveilles', 'Nebulae & Wonders'),
    icon: '🔭',
    reward: T('Chasseur de nébuleuses', 'Nebula Hunter'),
    steps: [
      { target: 'orion-nebula', label: T('La pouponnière cosmique', 'The cosmic nursery'), detail: T('Là où naissent les étoiles', 'Where stars are born') },
      { target: 'eagle-nebula', label: T('Les Piliers de la Création', 'The Pillars of Creation'), detail: T('L\u2019image la plus célèbre de Hubble', 'Hubble\u2019s most iconic image') },
      { target: 'crab-nebula', label: T('L\u2019explosion de 1054', 'The explosion of 1054'), detail: T('Le reste d\u2019une supernova', 'A supernova remnant') },
      { target: 'ring-nebula', label: T('L\u2019anneau d\u2019une étoile mourante', 'A dying star\u2019s ring'), detail: T('Le futur lointain du Soleil', 'The Sun\u2019s distant future') },
    ],
  },
  {
    id: 'galaxy-voyage',
    number: 5,
    title: T('Îles de l\u2019Univers', 'Islands of the Universe'),
    icon: '🌌',
    reward: T('Voyageur intergalactique', 'Intergalactic Voyager'),
    steps: [
      { target: 'sgr-a', label: T('Le cœur de notre galaxie', 'The heart of our galaxy'), detail: T('Le trou noir supermassif', 'The supermassive black hole') },
      { target: 'omega-centauri', label: T('Un amas de 10 millions d\u2019étoiles', 'A cluster of 10 million stars'), detail: T('Le plus grand amas globulaire', 'The largest globular cluster') },
      { target: 'lmc', label: T('La galaxie satellite', 'The satellite galaxy'), detail: T('Le Grand Nuage de Magellan', 'The Large Magellanic Cloud') },
      { target: 'andromeda', label: T('Notre voisine géante', 'Our giant neighbour'), detail: T('La galaxie d\u2019Andromède', 'The Andromeda Galaxy') },
    ],
  },
];

export const MISSION_BY_ID: Readonly<Record<MissionId, MissionDef>> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
) as Record<MissionId, MissionDef>;

export const ALL_MISSION_IDS: readonly MissionId[] = MISSIONS.map((m) => m.id);
