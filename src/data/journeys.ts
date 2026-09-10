/**
 * Journey catalogue — seven real-world trips, each documented with
 * verified scientific data, sources, and pedagogy.
 *
 * Every numeric value has been checked against the cited source.
 * See SPEC-TRAJETS-MISSIONS.md §0.1 for the verification protocol.
 */

import type { JourneyDef, JourneyId, Quantity, SourceRef } from './journeyTypes';
import type { LocalizedText } from './types';

const T = (fr: string, en: string): LocalizedText => ({ fr, en });
const RETRIEVED_AT = '2026-09-05';

const source = (url: string, label: string, retrievedAt = RETRIEVED_AT): SourceRef => ({ url, label, retrievedAt });
const SOURCES = {
  iss: source('https://www.nasa.gov/international-space-station/space-station-facts-and-figures/', 'NASA — ISS Facts and Figures'),
  issVehicles: source('https://www.nasa.gov/international-space-station/space-station-visiting-vehicles/', 'NASA — ISS Visiting Vehicles'),
  crew3: source('https://www.nasa.gov/humans-in-space/what-you-need-to-know-about-nasas-spacex-crew-3-mission/', 'NASA — Crew-3'),
  issRadiation: source('https://www.nasa.gov/missions/artemis/orion/orion-passengers-on-artemis-i-to-test-radiation-vest-for-deep-space-missions/', 'NASA — Space Radiation'),
  debris: source('https://www.esa.int/Space_Safety/Space_Debris/ESA_Space_Environment_Report_2025', 'ESA — Space Environment Report 2025'),
  atmosphere: source('https://science.nasa.gov/earth/earth-atmosphere/', 'NASA — Earth Atmosphere'),
  karman: source('https://www.fai.org/page/icare-boundary-space', 'FAI — Boundary of Space'),
  moon: source('https://science.nasa.gov/moon/facts/', 'NASA — Moon Facts'),
  moonMissions: source('https://science.nasa.gov/moon/missions/', 'NASA — Moon Missions', '2026-09-06'),
  apollo11: source('https://www.nasa.gov/history/apollo-11-mission-overview/', 'NASA — Apollo 11'),
  apolloLanding: source('https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html', 'NASA — Apollo 11 Lunar Surface Journal'),
  lunarDust: source('https://www.nasa.gov/humans-in-space/dust-an-out-of-this-world-problem/', 'NASA — Lunar Dust'),
  artemis2: source('https://www.nasa.gov/mission/artemis-ii/', 'NASA — Artemis II'),
  mars: source('https://science.nasa.gov/mars/mars-relay-network/', 'NASA — Mars Relay Network'),
  marsOverview: source('https://science.nasa.gov/mars/', 'NASA — Mars Exploration'),
  mariner4: source('https://science.nasa.gov/mission/mariner-4/', 'NASA — Mariner 4'),
  ingenuityEnd: source('https://www.jpl.nasa.gov/news/after-three-years-on-mars-nasas-ingenuity-helicopter-mission-ends/', 'NASA/JPL — Ingenuity mission end'),
  marsRobots: source('https://www.nasa.gov/history/25-years-of-continuous-robotic-mars-exploration-from-pathfinder-to-perseverance/', 'NASA — Robotic Mars exploration'),
  marsRadiation: source('https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/', 'NASA — Mars radiation measurements'),
  marsAtmosphere: source('https://www.nasa.gov/news-release/mars-terraforming-not-possible-using-present-day-technology/', 'NASA — Present-day Mars atmosphere', '2026-09-06'),
  solarSystem: source('https://science.nasa.gov/solar-system/', 'NASA — Solar System Exploration'),
  juno: source('https://www.jpl.nasa.gov/missions/juno/', 'NASA/JPL — Juno'),
  junoVault: source('https://www.jpl.nasa.gov/images/pia13258-installing-junos-radiation-vault/', 'NASA/JPL — Juno radiation vault'),
  cassini: source('https://science.nasa.gov/mission/cassini/the-journey/timeline/', 'NASA — Cassini Timeline'),
  saturnFacts: source('https://science.nasa.gov/saturn/facts/', 'NASA — Saturn Facts'),
  newHorizons: source('https://science.nasa.gov/mission/new-horizons/', 'NASA — New Horizons'),
  voyager: source('https://science.nasa.gov/mission/voyager/interstellar-mission/', 'NASA — Voyager Interstellar Mission'),
  voyager2: source('https://science.nasa.gov/mission/voyager/voyager-2/', 'NASA — Voyager 2'),
  universeAge: source('https://science.nasa.gov/universe/overview/', 'NASA — Universe Overview'),
  andromeda: source('https://science.nasa.gov/missions/hubble/apocalypse-when-hubble-casts-doubt-on-certainty-of-galactic-collision/', 'NASA/Hubble — Milky Way and Andromeda'),
  blackHoles: source('https://science.nasa.gov/universe/black-holes/', 'NASA — Black Holes'),
  blackHoleApproach: source('https://science.nasa.gov/universe/what-happens-when-something-gets-too-close-to-a-black-hole/', 'NASA — Approaching a black hole', '2026-09-06'),
  gaiaBh: source('https://www.esa.int/Science_Exploration/Space_Science/Gaia/Gaia_discovers_a_new_family_of_black_holes', 'ESA — Gaia black holes'),
  eht: source('https://eventhorizontelescope.org/blog/astronomers-reveal-first-image-black-hole-heart-our-galaxy', 'Event Horizon Telescope — Sgr A*'),
  ehtM87: source('https://eventhorizontelescope.org/press-release-april-10-2019-astronomers-capture-first-image-black-hole', 'Event Horizon Telescope — M87*'),
  constellations: source('https://www.iau.org/IAU/Astronomy-FAQs/FAQs.aspx', 'IAU — Constellations'),
  orion: source('https://science.nasa.gov/universe/stories/quick-reads/discovering-the-universe-through-the-constellation-orion/', 'NASA — Orion in three dimensions'),
  skywatching: source('https://science.nasa.gov/solar-system/skywatching/night-sky-network/may2024-night-sky-notes/', 'NASA — Dark adaptation'),
  gaia: source('https://www.esa.int/Science_Exploration/Space_Science/Gaia', 'ESA — Gaia'),
  parker: source('https://science.nasa.gov/mission/parker-solar-probe/', 'NASA — Parker Solar Probe'),
} as const;

const Q = (value: number, ref: SourceRef, approximate = true): Quantity => ({
  value,
  unit: 'km',
  ...(approximate ? { approximate: true } : {}),
  sourceUrl: ref.url,
  attribution: ref.label,
  retrievedAt: ref.retrievedAt,
});

/* ================================================================== */
/*  J1 — Earth → ISS · done-by-humans · difficulty 1                  */
/* ================================================================== */

const earthToIss: JourneyDef = {
  id: 'earth-to-iss',
  number: 1,
  icon: '🛰️',
  title: T('Terre → ISS', 'Earth → ISS'),
  pitch: T(
    'Rejoindre la Station spatiale en orbite à environ 420 km au-dessus de nos têtes.',
    'Reach the Space Station orbiting about 420 km above our heads.',
  ),
  difficulty: 1,
  from: { id: 'earth', label: T('Terre', 'Earth') },
  to: { id: 'iss', label: T('Station spatiale internationale', 'International Space Station') },
  feasibility: 'done-by-humans',
  distance: {
    kind: 'fixed',
    value: Q(420, SOURCES.iss),
  },
  durations: [
    {
      vehicle: 'light',
      seconds: 0.0014,
      approximate: true,
      source: SOURCES.iss,
    },
    {
      vehicle: 'airliner',
      seconds: 27 * 60,
      approximate: true,
      note: T(
        'Un avion ne peut pas monter tout droit jusqu\'à l\'orbite ; ce chiffre suppose une montée fictive à 900 km/h.',
        'An airliner cannot climb straight to orbit; this assumes a fictional 900 km/h ascent.',
      ),
      source: SOURCES.iss,
    },
    {
      vehicle: 'real-mission',
      label: T('Soyouz MS-17', 'Soyuz MS-17'),
      seconds: 3 * 3600 + 3 * 60,
      note: T(
        'Soyouz en rendez-vous ultrarapide (2 orbites). Record : 3 h 03 min (Soyouz MS-17, 2020).',
        'Soyuz ultrafast rendezvous (2 orbits). Record: 3 h 03 min (Soyuz MS-17, 2020).',
      ),
      source: SOURCES.issVehicles,
    },
    {
      vehicle: 'real-mission',
      label: T('Crew Dragon (Crew-3)', 'Crew Dragon (Crew-3 mission)'),
      seconds: 22 * 3600,
      note: T(
        'Crew-3 a rejoint l’ISS en environ 22 heures ; la durée varie selon le profil de mission.',
        'Crew-3 reached the ISS in about 22 hours; timing varies with the mission profile.',
      ),
      approximate: true,
      source: SOURCES.crew3,
    },
  ],
  launchWindow: T(
    'Imposée par l\'alignement du plan orbital de l\'ISS.',
    'Dictated by the alignment of the ISS orbital plane.',
  ),
  launchWindowSource: SOURCES.issVehicles,
  legs: [
    {
      id: 'troposphere',
      label: T('Troposphère', 'Troposphere'),
      atDistance: Q(12, SOURCES.atmosphere),
      encounter: T(
        'La couche d\'air que nous respirons, là où volent les avions.',
        'The layer of air we breathe, where planes fly.',
      ),
      source: SOURCES.atmosphere,
    },
    {
      id: 'karman-line',
      label: T('Ligne de Kármán', 'Kármán Line'),
      atDistance: Q(100, SOURCES.karman, false),
      encounter: T(
        'La frontière officielle de l\'espace. L\'air est trop mince pour porter un avion.',
        'The official boundary of space. The air is too thin to support a plane.',
      ),
      source: SOURCES.karman,
    },
    {
      id: 'orbital-insertion',
      label: T('Mise en orbite', 'Orbital Insertion'),
      encounter: T(
        'Le vaisseau accélère à environ 7,8 km/s pour rester en orbite sans retomber.',
        'The spacecraft accelerates to about 7.8 km/s to stay in orbit without falling back.',
      ),
      source: SOURCES.iss,
    },
    {
      id: 'rendezvous',
      label: T('Rendez-vous orbital', 'Orbital Rendezvous'),
      atDistance: Q(420, SOURCES.iss),
      encounter: T(
        'Le vaisseau s\'approche doucement et s\'amarre à la station.',
        'The spacecraft approaches slowly and docks with the station.',
      ),
      source: SOURCES.iss,
    },
  ],
  hazards: [
    {
      kind: 'debris',
      label: T('Débris spatiaux', 'Space Debris'),
      simple: T(
        'Des morceaux de vieux satellites tournent à toute vitesse autour de la Terre.',
        'Pieces of old satellites zoom around Earth at high speed.',
      ),
      curious: T(
        'L’ESA estime à plus de 50 000 le nombre d’objets de plus de 10 cm en orbite ; même de petits fragments peuvent endommager un véhicule.',
        'ESA estimates more than 50,000 objects larger than 10 cm in orbit; even small fragments can damage a spacecraft.',
      ),
      source: SOURCES.debris,
    },
    {
      kind: 'radiation',
      label: T('Rayonnement', 'Radiation'),
      simple: T(
        'Au-dessus de l\'atmosphère, le Soleil et l\'espace envoient des rayons invisibles.',
        'Above the atmosphere, the Sun and space send invisible rays.',
      ),
      curious: T(
        'La magnétosphère protège encore l’ISS, mais un astronaute y reçoit environ 50 fois l’exposition moyenne sur Terre.',
        'The magnetosphere still shields the ISS, but an astronaut receives about 50 times the average exposure on Earth.',
      ),
      source: SOURCES.issRadiation,
    },
    {
      kind: 'gravity',
      label: T('Microgravité', 'Microgravity'),
      simple: T(
        'Tout flotte ! C\'est amusant, mais les os et les muscles s\'affaiblissent.',
        'Everything floats! It\'s fun, but bones and muscles weaken.',
      ),
      curious: T(
        'Les astronautes font 2 heures d\'exercice par jour pour limiter la perte osseuse et musculaire.',
        'Astronauts exercise 2 hours daily to limit bone and muscle loss.',
      ),
      source: SOURCES.iss,
    },
    {
      kind: 'vacuum',
      label: T('Vide spatial', 'Vacuum of Space'),
      simple: T(
        'Dehors, il n\'y a pas d\'air. Sans combinaison, on ne survivrait pas.',
        'Outside, there\'s no air. Without a suit, you wouldn\'t survive.',
      ),
      curious: T(
        'La station est pressurisée à 1 atmosphère, comme au sol. Chaque fuite est une urgence.',
        'The station is pressurized at 1 atmosphere, like on the ground. Every leak is an emergency.',
      ),
      source: SOURCES.iss,
    },
  ],
  humanPrecedent: {
    achieved: true,
    firstMission: 'ISS Expedition 1',
    firstDate: '2000-11-02',
    latestMission: 'ISS Expeditions (occupation continue)',
    note: T(
      'La station est habitée en permanence depuis le 2 novembre 2000 — plus de 25 ans sans interruption. L\'équipage voit 16 levers de Soleil par jour.',
      'The station has been continuously inhabited since November 2, 2000 — over 25 years without interruption. The crew sees 16 sunrises per day.',
    ),
    source: SOURCES.iss,
  },
  robotPrecedent: {
    achieved: true,
    firstMission: 'Progress M1-3',
    firstDate: '2000-08-06',
    note: T(
      'Des vaisseaux-cargo automatiques (Progress, Cygnus, HTV, Dragon cargo) ravitaillent la station régulièrement.',
      'Automated cargo spacecraft (Progress, Cygnus, HTV, Dragon cargo) resupply the station regularly.',
    ),
    source: SOURCES.issVehicles,
  },
  steps: [
    {
      id: 'iss-visit-earth',
      kind: 'visit',
      target: 'earth',
      label: T('Observer la Terre', 'Observe Earth'),
      detail: T('Notre point de départ', 'Our starting point'),
      ordered: true,
    },
    {
      id: 'iss-visit-station',
      kind: 'visit',
      target: 'iss',
      label: T('Rejoindre l’ISS', 'Reach the ISS'),
      detail: T('Arrive sur la vue de la station en orbite', 'Open the orbital-station view'),
      ordered: true,
    },
    {
      id: 'iss-observe-station',
      kind: 'observe',
      target: 'iss',
      holdMs: 1_500,
      label: T('Observer l’orbite', 'Observe the orbit'),
      detail: T('Reste sur la vue pendant un court instant', 'Stay on the view for a short moment'),
      ordered: true,
    },
    {
      id: 'iss-quiz-orbit',
      kind: 'quiz',
      label: T('Quiz : vitesse orbitale', 'Quiz: orbital speed'),
      detail: T('Quelle vitesse faut-il pour rester en orbite ?', 'What speed do you need to stay in orbit?'),
      question: {
        prompt: T('À quelle vitesse l’ISS tourne-t-elle autour de la Terre ?', 'How fast does the ISS orbit Earth?'),
        options: [
          T('900 km/h, comme un avion', '900 km/h, like an airliner'),
          T('Environ 28 000 km/h (7,8 km/s)', 'About 28,000 km/h (7.8 km/s)'),
          T('Environ 300 000 km/s, comme la lumière', 'About 300,000 km/s, like light'),
        ],
        correctIndex: 1,
        explain: T('L’ISS file à environ 28 000 km/h, soit 7,8 km/s, et boucle une orbite en environ 90 minutes.', 'The ISS travels at about 28,000 km/h, or 7.8 km/s, completing an orbit in about 90 minutes.'),
        source: SOURCES.iss,
      },
    },
  ],
  reward: T('Astronaute en herbe', 'Budding Astronaut'),
};

/* ================================================================== */
/*  J2 — Earth → Moon · done-by-humans · difficulty 1                 */
/* ================================================================== */

const earthToMoon: JourneyDef = {
  id: 'earth-to-moon',
  number: 2,
  icon: '🌙',
  title: T('Terre → Lune', 'Earth → Moon'),
  pitch: T(
    'Le seul autre monde où des humains ont marché.',
    'The only other world where humans have walked.',
  ),
  difficulty: 1,
  from: { id: 'earth', label: T('Terre', 'Earth') },
  to: { id: 'moon', label: T('Lune', 'Moon') },
  feasibility: 'done-by-humans',
  distance: {
    kind: 'fixed',
    value: Q(384_400, SOURCES.moon),
  },
  durations: [
    {
      vehicle: 'light',
      seconds: 1.28,
      approximate: true,
      source: SOURCES.moon,
    },
    {
      vehicle: 'car',
      seconds: 160 * 86_400,
      approximate: true,
      note: T(
        'En roulant jour et nuit à 100 km/h sans s\'arrêter — impossible, mais parlant !',
        'Driving day and night at 100 km/h without stopping — impossible, but illustrative!',
      ),
      source: SOURCES.moon,
    },
    {
      vehicle: 'real-mission',
      label: T('Apollo 11', 'Apollo 11 mission'),
      seconds: 76 * 3600,
      approximate: true,
      note: T(
        'Apollo 11 : 75 h 50 min jusqu\'à l\'insertion en orbite lunaire (juillet 1969).',
        'Apollo 11: 75 h 50 min to lunar orbit insertion (July 1969).',
      ),
      source: SOURCES.apollo11,
    },
  ],
  legs: [
    {
      id: 'van-allen',
      label: T('Ceintures de Van Allen', 'Van Allen Belts'),
      encounter: T(
        'Deux zones de radiation piégée par le champ magnétique terrestre. Le vaisseau les traverse rapidement.',
        'Two zones of radiation trapped by Earth\'s magnetic field. The spacecraft passes through quickly.',
      ),
      source: SOURCES.apollo11,
    },
    {
      id: 'tli',
      label: T('Injection translunaire', 'Translunar Injection'),
      encounter: T(
        'Un allumage de moteur pousse le vaisseau à environ 10,8 km/s pour quitter l\'orbite terrestre vers la Lune.',
        'An engine burn pushes the spacecraft to about 10.8 km/s to leave Earth orbit toward the Moon.',
      ),
      source: SOURCES.apollo11,
    },
    {
      id: 'equigravity',
      label: T('Point d\'équigravité', 'Equigravisphere'),
      encounter: T(
        'La contribution de la Lune à la trajectoire devient dominante ; le vaisseau ne bascule pas brusquement et doit encore freiner.',
        'The Moon’s contribution to the trajectory becomes dominant; the spacecraft does not switch suddenly and must still brake.',
      ),
      source: SOURCES.apollo11,
    },
    {
      id: 'loi',
      label: T('Insertion en orbite lunaire', 'Lunar Orbit Insertion'),
      atDistance: Q(384_400, SOURCES.moon),
      encounter: T(
        'Le moteur freine pour entrer en orbite autour de la Lune.',
        'The engine fires to brake into orbit around the Moon.',
      ),
      source: SOURCES.apollo11,
    },
  ],
  hazards: [
    {
      kind: 'radiation',
      label: T('Ceintures de Van Allen', 'Van Allen Belts'),
      simple: T(
        'Des zones invisibles de rayonnement entourent la Terre.',
        'Invisible radiation zones surround Earth.',
      ),
      curious: T(
        'Apollo suivait une trajectoire limitant l’exposition. Au-delà de la magnétosphère, le blindage du vaisseau reste essentiel.',
        'Apollo followed a trajectory that limited exposure. Beyond the magnetosphere, spacecraft shielding remains essential.',
      ),
      source: SOURCES.apollo11,
    },
    {
      kind: 'temperature',
      label: T('Écarts de température', 'Temperature Extremes'),
      simple: T(
        'Près de l’équateur lunaire, le sol peut atteindre environ +127 °C au Soleil et −173 °C la nuit.',
        'Near the lunar equator, the ground can reach about +127 °C in sunlight and −173 °C at night.',
      ),
      curious: T(
        'Un écart d’environ 300 °C entre jour et nuit ! La combinaison spatiale doit gérer les deux extrêmes.',
        'A roughly 300 °C swing between day and night! The spacesuit must handle both extremes.',
      ),
      source: SOURCES.moon,
    },
    {
      kind: 'gravity',
      label: T('Gravité lunaire', 'Lunar Gravity'),
      simple: T(
        'Sur la Lune, tu pèses 6 fois moins que sur Terre.',
        'On the Moon, you weigh 6 times less than on Earth.',
      ),
      curious: T(
        'La gravité lunaire est 1/6 de celle de la Terre (1,62 m/s²). Les astronautes faisaient de petits bonds.',
        'Lunar gravity is 1/6 of Earth\'s (1.62 m/s²). Astronauts made little hops.',
      ),
      source: SOURCES.moon,
    },
    {
      kind: 'landing',
      label: T('Atterrissage', 'Landing'),
      simple: T(
        'Se poser sur la Lune sans s\'écraser, c\'est très difficile.',
        'Landing on the Moon without crashing is very difficult.',
      ),
      curious: T(
        'L’analyse après le vol estime qu’Apollo 11 avait environ 45 secondes de propulsion restantes. Neil Armstrong a piloté pour éviter un terrain rocheux.',
        'Post-flight analysis estimates Apollo 11 had about 45 seconds of powered flight left. Neil Armstrong steered away from rocky terrain.',
      ),
      source: SOURCES.apolloLanding,
    },
    {
      kind: 'debris',
      label: T('Poussière lunaire abrasive', 'Abrasive lunar dust'),
      simple: T('La poussière très fine s’accroche aux combinaisons et aux machines.', 'Very fine dust clings to spacesuits and machines.'),
      curious: T('Le régolithe lunaire est anguleux et électriquement chargé : il peut user les joints et irriter les voies respiratoires.', 'Lunar regolith is angular and electrically charged: it can wear seals and irritate airways.'),
      source: SOURCES.lunarDust,
    },
  ],
  humanPrecedent: {
    achieved: true,
    firstMission: 'Apollo 11',
    firstDate: '1969-07-20',
    latestMission: 'Artemis II (survol)',
    latestDate: '2026-04-01',
    count: 12,
    note: T(
      '12 personnes ont marché sur la Lune entre 1969 et 1972 (Apollo 11 à 17, sauf 13). Dernier alunissage : Apollo 17, décembre 1972. Artemis II a décollé le 1er avril 2026 avec Reid Wiseman, Victor Glover, Christina Koch et Jeremy Hansen pour un survol lunaire de 9 jours — premier vol habité au-delà de la magnétosphère depuis Apollo 17.',
      '12 people walked on the Moon between 1969 and 1972 (Apollo 11 through 17, except 13). Last landing: Apollo 17, December 1972. Artemis II launched April 1, 2026 with Reid Wiseman, Victor Glover, Christina Koch, and Jeremy Hansen for a 9-day lunar flyby — the first crewed flight beyond the magnetosphere since Apollo 17.',
    ),
    source: SOURCES.artemis2,
  },
  robotPrecedent: {
    achieved: true,
    firstMission: 'Luna 2 (impact)',
    firstDate: '1959-09-13',
    latestMission: 'IM-2 (Athena)',
    latestDate: '2025-03-06',
    note: T(
      'Luna 2 : premier impact (1959). Luna 9 : premier atterrissage en douceur (1966). Après Chandrayaan-3 et Chang’e 6, Blue Ghost 1 puis IM-2 (Athena) ont atteint la surface en mars 2025 ; IM-2 s’est posé sur le côté, ce qui a limité ses opérations.',
      'Luna 2: first impact (1959). Luna 9: first soft landing (1966). After Chandrayaan-3 and Chang’e 6, Blue Ghost 1 and then IM-2 (Athena) reached the surface in March 2025; IM-2 landed on its side, limiting operations.',
    ),
    source: SOURCES.moonMissions,
  },
  steps: [
    {
      id: 'moon-visit-earth',
      kind: 'visit',
      target: 'earth',
      label: T('Observer la Terre', 'Observe Earth'),
      detail: T('Notre point de départ', 'Our starting point'),
      ordered: true,
    },
    {
      id: 'moon-visit-moon',
      kind: 'visit',
      target: 'moon',
      label: T('Atteindre la Lune', 'Reach the Moon'),
      detail: T('Le seul autre monde foulé par l\'homme', 'The only other world walked on by humans'),
      ordered: true,
    },
    {
      id: 'moon-quiz-distance',
      kind: 'quiz',
      label: T('Quiz : la distance Terre-Lune', 'Quiz: Earth-Moon distance'),
      detail: T('Sais-tu à quelle distance se trouve la Lune ?', 'Do you know how far the Moon is?'),
      question: {
        prompt: T(
          'Quelle est la distance moyenne entre la Terre et la Lune ?',
          'What is the average distance between Earth and the Moon?',
        ),
        options: [
          T('400 km (comme l\'ISS)', '400 km (like the ISS)'),
          T('384 400 km', '384,400 km'),
          T('Environ 150 millions de km (comme le Soleil)', 'About 150 million km (like the Sun)'),
        ],
        correctIndex: 1,
        explain: T(
          'La Lune est à 384 400 km de la Terre en moyenne. C\'est environ 30 fois le diamètre de la Terre !',
          'The Moon is 384,400 km from Earth on average. That\'s about 30 times Earth\'s diameter!',
        ),
        source: SOURCES.moon,
      },
    },
    {
      id: 'moon-compare',
      kind: 'compare',
      a: 'earth',
      b: 'moon',
      label: T('Comparer Terre et Lune', 'Compare Earth and Moon'),
      detail: T('Découvre les différences de taille et de gravité', 'Discover the differences in size and gravity'),
    },
  ],
  reward: T('Explorateur lunaire', 'Lunar Explorer'),
};

/* ================================================================== */
/*  J3 — Earth → Mars · done-by-robots-only · difficulty 2             */
/* ================================================================== */

const earthToMars: JourneyDef = {
  id: 'earth-to-mars',
  number: 3,
  icon: '🔴',
  title: T('Terre → Mars', 'Earth → Mars'),
  pitch: T(
    'La planète rouge explorée par des robots depuis le survol de Mariner 4 en 1965.',
    'The red planet explored by robots since Mariner 4 flew past in 1965.',
  ),
  difficulty: 2,
  from: { id: 'earth', label: T('Terre', 'Earth') },
  to: { id: 'mars', label: T('Mars', 'Planet Mars') },
  feasibility: 'done-by-robots-only',
  distance: {
    kind: 'variable',
    min: Q(54_600_000, SOURCES.mars),
    max: Q(400_200_000, SOURCES.mars),
    typical: Q(225_000_000, SOURCES.marsOverview),
    why: T(
      'La distance change car la Terre et Mars tournent autour du Soleil à des vitesses différentes.',
      'The distance changes because Earth and Mars orbit the Sun at different speeds.',
    ),
  },
  durations: [
    { vehicle: 'light', seconds: null, approximate: true, note: T('Selon la position des deux planètes, la lumière met environ 3 à 22,4 minutes ; la barre utilise la distance typique.', 'Depending on the planets’ positions, light takes about 3 to 22.4 minutes; the bar uses the typical distance.'), source: SOURCES.mars },
    { vehicle: 'real-mission', label: T('Perseverance', 'Perseverance mission'), seconds: 203 * 86_400, approximate: true, note: T('Perseverance a effectué une croisière interplanétaire d’environ 203 jours.', 'Perseverance made an interplanetary cruise lasting about 203 days.'), source: SOURCES.marsOverview },
    { vehicle: 'voyager-1', seconds: null, approximate: true, source: SOURCES.voyager },
    { vehicle: 'car', seconds: null, approximate: true, note: T('Expérience de pensée à 100 km/h : une voiture ne peut évidemment pas voyager dans l’espace.', 'Thought experiment at 100 km/h: a car obviously cannot travel through space.'), source: SOURCES.mars },
    { vehicle: 'walking', seconds: null, approximate: true, note: T('Expérience de pensée à 5 km/h : marcher jusqu’à Mars est impossible.', 'Thought experiment at 5 km/h: walking to Mars is impossible.'), source: SOURCES.mars },
  ],
  launchWindow: T(
    'Une fenêtre de lancement s\'ouvre environ tous les 26 mois.',
    'A launch window opens roughly every 26 months.',
  ),
  launchWindowSource: SOURCES.marsOverview,
  legs: [
    { id: 'leo', label: T('Orbite basse terrestre', 'Low Earth orbit'), encounter: T('Assemblage et vérifications en orbite.', 'Assembly and checks in orbit.'), source: SOURCES.marsOverview },
    { id: 'tmi', label: T('Injection trans-Mars', 'Trans-Mars injection'), encounter: T('Les moteurs s’allument pour quitter l’orbite terrestre.', 'Engines fire to leave Earth orbit.'), source: SOURCES.marsOverview },
    { id: 'cruise', label: T('Croisière interplanétaire', 'Interplanetary cruise'), encounter: T('Environ 7 mois dans le vide, exposé aux radiations solaires.', 'About 7 months in the void, exposed to solar radiation.'), source: SOURCES.marsOverview },
    { id: 'trajectory-correction', label: T('Correction de trajectoire', 'Trajectory correction'), encounter: T('De brèves poussées affinent la route vers le point précis où Mars se trouvera à l’arrivée.', 'Brief thruster burns refine the route toward the precise point where Mars will be on arrival.'), source: SOURCES.marsOverview },
    { id: 'edl', label: T('Entrée, descente, atterrissage', 'Entry, descent, landing'), encounter: T('Les « sept minutes de terreur » se déroulent sans pilotage direct depuis la Terre.', 'The “seven minutes of terror” unfold without direct control from Earth.'), source: SOURCES.mars },
  ],
  hazards: [
    {
      kind: 'radiation',
      label: T('Radiations cosmiques', 'Cosmic radiation'),
      simple: T('Mars n\'a pas de bouclier magnétique comme la Terre.', 'Mars has no magnetic shield like Earth.'),
      curious: T('Curiosity a mesuré environ 0,67 mSv par jour à la surface : une exposition importante qui s’accumule pendant une mission.', 'Curiosity measured about 0.67 mSv per day on the surface: substantial exposure that accumulates during a mission.'),
      source: SOURCES.marsRadiation,
    },
    {
      kind: 'temperature',
      label: T('Froid extrême', 'Extreme cold'),
      simple: T('La température de Mars varie énormément entre le jour, la nuit et les pôles.', 'Mars temperatures vary enormously between day, night, and the poles.'),
      curious: T('La surface peut atteindre environ +20 °C ou descendre jusqu’à −153 °C. Les rovers doivent se réchauffer pour survivre la nuit.', 'The surface can reach about +20 °C or fall as low as −153 °C. Rovers must heat themselves to survive the night.'),
      source: SOURCES.marsOverview,
    },
    {
      kind: 'vacuum',
      label: T('Atmosphère ténue', 'Thin atmosphere'),
      simple: T('La pression de l’air martien représente seulement environ 0,6 % de celle de la Terre.', 'Martian air pressure is only about 0.6% of Earth’s.'),
      curious: T('À cette pression extrêmement basse, l’eau liquide s’évapore ou gèle rapidement. Il est impossible de respirer sans combinaison pressurisée.', 'At this extremely low pressure, liquid water quickly evaporates or freezes. Breathing without a pressurized suit is impossible.'),
      source: SOURCES.marsAtmosphere,
    },
    {
      kind: 'comms',
      label: T('Délai de communication', 'Communication delay'),
      simple: T('Un message met environ 3 à 22,4 minutes (aller simple) pour atteindre Mars.', 'A message takes about 3 to 22.4 minutes (one way) to reach Mars.'),
      curious: T('À la distance moyenne, un aller-retour prend environ 25 minutes. Aucun pilotage en temps réel n\'est possible.', 'At average distance, a round trip takes about 25 minutes. No real-time piloting is possible.'),
      source: SOURCES.mars,
    },
    {
      kind: 'landing',
      label: T('Atterrissage', 'Landing'),
      simple: T('L\'atmosphère est trop fine pour un parachute seul, trop épaisse pour ignorer.', 'The atmosphere is too thin for a parachute alone, too thick to ignore.'),
      curious: T('Perseverance a utilisé un parachute supersonique, des rétrofusées ET une grue volante (skycrane) pour se poser.', 'Perseverance used a supersonic parachute, retrorockets AND a skycrane to land.'),
      source: SOURCES.marsOverview,
    },
    {
      kind: 'supplies',
      label: T('Ravitaillement', 'Supplies for the crew'),
      simple: T('Il faut emporter eau, nourriture, oxygène et pièces de rechange pour l’aller et le retour.', 'Water, food, oxygen, and spare parts must last for the outbound and return journeys.'),
      curious: T('Aucun ravitaillement rapide n’est possible à des dizaines de millions de kilomètres de la Terre.', 'Quick resupply is impossible tens of millions of kilometres from Earth.'),
      source: SOURCES.marsOverview,
    },
    {
      kind: 'isolation',
      label: T('Isolement prolongé', 'Long isolation'),
      simple: T('Un équipage vivrait de longs mois loin de sa famille et de toute aide immédiate.', 'A crew would spend many months far from family and immediate help.'),
      curious: T('Le délai radio oblige l’équipage à résoudre seul les urgences.', 'Radio delay means the crew must solve emergencies on its own.'),
      source: SOURCES.mars,
    },
    {
      kind: 'weather',
      label: T('Tempêtes de poussière', 'Dust storms'),
      simple: T('La poussière peut cacher le Soleil et couvrir les machines.', 'Dust can hide the Sun and coat machinery.'),
      curious: T('Certaines tempêtes martiennes s’étendent sur une grande partie de la planète et réduisent l’énergie des panneaux solaires.', 'Some Martian storms spread across much of the planet and reduce solar-panel power.'),
      source: SOURCES.marsOverview,
    },
  ],
  humanPrecedent: {
    achieved: false,
    note: T(
      'Aucun humain n’a encore voyagé vers Mars. Les projets habités restent des objectifs futurs, sans date garantie ici.',
      'No human has travelled to Mars. Crewed missions remain future goals, with no guaranteed date stated here.',
    ),
    source: { url: 'https://www.nasa.gov/humans-in-space/moon-to-mars/', label: 'NASA Moon to Mars', retrievedAt: '2026-09-05' },
  },
  robotPrecedent: {
    achieved: true,
    firstMission: 'Mariner 4 (survol)',
    firstDate: '1965-07-14',
    latestMission: 'Zhurong (Tianwen-1)',
    latestDate: '2021-05-14',
    note: T(
      'Mariner 4 a réussi le premier survol en 1965, puis Viking 1 a atterri en 1976. Curiosity, Perseverance et Ingenuity ont poursuivi l’exploration ; le rover chinois Zhurong a atterri en 2021.',
      'Mariner 4 completed the first successful flyby in 1965, followed by Viking 1’s landing in 1976. Curiosity, Perseverance, and Ingenuity continued the exploration; China’s Zhurong rover landed in 2021.',
    ),
    source: SOURCES.marsRobots,
  },
  highlights: [
    {
      text: T('Ingenuity a réalisé 72 vols historiques avant la fin de sa mission en janvier 2024.', 'Ingenuity completed 72 historic flights before its mission ended in January 2024.'),
      source: SOURCES.ingenuityEnd,
    },
  ],
  steps: [
    {
      id: 'mars-visit-earth',
      kind: 'visit',
      target: 'earth',
      label: T('Observer la Terre', 'Observe Earth'),
      detail: T('Notre point de départ', 'Our starting point'),
      ordered: true,
    },
    {
      id: 'mars-visit-mars',
      kind: 'visit',
      target: 'mars',
      label: T('Atteindre Mars', 'Reach Mars'),
      detail: T('La planète rouge, 4ᵉ en partant du Soleil', 'The red planet, 4th from the Sun'),
      ordered: true,
    },
    {
      id: 'mars-quiz-distance',
      kind: 'quiz',
      label: T('Quiz : le délai de communication', 'Quiz: communication delay'),
      detail: T('Combien de temps met un message pour aller de la Terre à Mars ?', 'How long does a message take from Earth to Mars?'),
      question: {
        prompt: T(
          'À la distance moyenne, combien de temps met un signal radio pour aller de la Terre à Mars (aller simple) ?',
          'At average distance, how long does a radio signal take from Earth to Mars (one way)?',
        ),
        options: [
          T('1 seconde', '1 second'),
          T('≈ 12 minutes', 'About 12 minutes'),
          T('2 heures', '2 hours'),
        ],
        correctIndex: 1,
        explain: T(
          'À la distance moyenne d’environ 225 millions de km, la lumière met environ 12,5 minutes pour atteindre Mars. C\'est pourquoi les rovers doivent être autonomes !',
          'At an average distance of about 225 million km, light takes about 12.5 minutes to reach Mars. That\'s why rovers must be autonomous!',
        ),
        source: SOURCES.mars,
      },
    },
    {
      id: 'mars-compare',
      kind: 'compare',
      a: 'earth',
      b: 'mars',
      label: T('Comparer Terre et Mars', 'Compare Earth and Mars'),
      detail: T('Découvre les différences de gravité et d\'atmosphère', 'Discover the differences in gravity and atmosphere'),
    },
  ],
  reward: T('Explorateur martien', 'Mars Explorer'),
};

/* ================================================================== */
/*  J4 — Earth → Outer Planets · done-by-robots-only · difficulty 2    */
/* ================================================================== */

const earthToOuterPlanets: JourneyDef = {
  id: 'earth-to-outer-planets',
  number: 4,
  icon: '🪐',
  title: T('Terre → Planètes géantes', 'Earth → Giant Planets'),
  pitch: T(
    'Jupiter, Saturne, Uranus, Neptune : les géantes gazeuses et glacées.',
    'Jupiter, Saturn, Uranus, Neptune: the gas and ice giants.',
  ),
  difficulty: 2,
  from: { id: 'earth', label: T('Terre', 'Earth') },
  to: { id: 'outer-planets', label: T('Planètes externes', 'Outer planets') },
  feasibility: 'done-by-robots-only',
  distance: {
    kind: 'variable',
    min: Q(588_000_000, SOURCES.solarSystem),
    max: Q(4_700_000_000, SOURCES.solarSystem),
    typical: Q(1_400_000_000, SOURCES.saturnFacts),
    why: T(
      'Cette plage relie des repères vers Jupiter et Neptune ; le comparateur utilise Saturne (environ 1,4 milliard de km du Soleil) comme distance typique. Chaque distance varie avec les orbites.',
      'This range spans reference distances to Jupiter and Neptune; the comparator uses Saturn (about 1.4 billion km from the Sun) as its typical distance. Each distance varies with the orbits.',
    ),
  },
  durations: [
    { vehicle: 'light', label: T('Lumière vers Saturne (repère)', 'Light to Saturn (reference)'), seconds: null, approximate: true, source: SOURCES.solarSystem },
    { vehicle: 'real-mission', label: T('Juno vers Jupiter', 'Juno to Jupiter'), seconds: 5 * 365.25 * 86_400, approximate: true, note: T('Juno a mis environ cinq ans pour atteindre Jupiter.', 'Juno took about five years to reach Jupiter.'), source: SOURCES.juno },
    { vehicle: 'real-mission', label: T('Cassini vers Saturne', 'Cassini to Saturn'), seconds: 6.71 * 365.25 * 86_400, approximate: true, note: T('Cassini a mis près de 6,7 ans pour atteindre Saturne.', 'Cassini took nearly 6.7 years to reach Saturn.'), source: SOURCES.cassini },
    { vehicle: 'real-mission', label: T('New Horizons vers Pluton', 'New Horizons to Pluto'), seconds: 9.5 * 365.25 * 86_400, approximate: true, note: T('New Horizons a voyagé plus de neuf ans avant son survol de Pluton.', 'New Horizons travelled for more than nine years before its Pluto flyby.'), source: SOURCES.newHorizons },
  ],
  legs: [
    { id: 'belt', label: T('Ceinture d\'astéroïdes', 'Asteroid belt'), encounter: T('Traversée de la ceinture entre Mars et Jupiter.', 'Crossing the belt between Mars and Jupiter.'), source: SOURCES.solarSystem },
    { id: 'gravity-assist', label: T('Assistance gravitationnelle', 'Gravity assist'), encounter: T('Une planète échange un peu de son énergie orbitale avec la sonde et modifie sa vitesse sans carburant supplémentaire.', 'A planet exchanges a little orbital energy with the probe, changing its speed without extra fuel.'), source: SOURCES.cassini },
    { id: 'jupiter-radiation', label: T('Ceintures de Jupiter', 'Jupiter radiation belts'), encounter: T('L’électronique doit traverser un environnement de rayonnement très intense.', 'Electronics must cross an extremely intense radiation environment.'), source: SOURCES.juno },
    { id: 'arrival', label: T('Arrivée dans le système lointain', 'Arrival in the distant system'), encounter: T('La sonde freine pour se placer en orbite ou traverse rapidement le système lors d’un survol.', 'The probe brakes into orbit or quickly crosses the system during a flyby.'), source: SOURCES.solarSystem },
  ],
  hazards: [
    {
      kind: 'radiation',
      label: T('Ceintures de radiation de Jupiter', 'Jupiter radiation belts'),
      simple: T('Les ceintures de radiation de Jupiter sont beaucoup plus dangereuses que celles de la Terre.', 'Jupiter’s radiation belts are far more hazardous than Earth’s.'),
      curious: T('Juno suit une orbite polaire qui limite son exposition. Ses composants sensibles sont protégés dans une enceinte en titane d’environ 200 kg.', 'Juno follows a polar orbit that limits its exposure. Its sensitive electronics are protected inside a roughly 200 kg titanium vault.'),
      source: SOURCES.junoVault,
    },
    {
      kind: 'comms',
      label: T('Délai de communication', 'Communication delay'),
      simple: T('La lumière met environ 80 minutes pour aller du Soleil à Saturne : les communications avec la Terre ont donc un très long délai.', 'Light takes about 80 minutes to travel from the Sun to Saturn, so communications with Earth have a very long delay.'),
      curious: T('Saturne se trouve en moyenne à environ 1,4 milliard de kilomètres du Soleil. Une sonde lointaine doit donc pouvoir agir sans commande immédiate.', 'Saturn is on average about 1.4 billion kilometres from the Sun. A distant probe must therefore be able to act without immediate commands.'),
      source: SOURCES.saturnFacts,
    },
    {
      kind: 'temperature',
      label: T('Froid extrême', 'Extreme cold'),
      simple: T('Loin du Soleil, les mondes externes reçoivent très peu de chaleur.', 'Far from the Sun, outer worlds receive very little heat.'),
      curious: T('Les systèmes de bord doivent garder instruments et carburants dans leur plage de température.', 'Spacecraft systems must keep instruments and propellants within operating temperatures.'),
      source: SOURCES.solarSystem,
    },
    {
      kind: 'landing',
      label: T('Pas de surface solide', 'No solid surface'),
      simple: T('On ne peut pas se poser sur Jupiter ou Saturne comme sur Mars.', 'You cannot land on Jupiter or Saturn as you can on Mars.'),
      curious: T('La pression augmente dans leurs atmosphères profondes, sans frontière nette où poser un engin.', 'Pressure rises through their deep atmospheres, with no clear boundary on which to land.'),
      source: SOURCES.solarSystem,
    },
    {
      kind: 'supplies',
      label: T('Très peu d’énergie solaire', 'Very little solar energy'),
      simple: T('La lumière solaire faiblit fortement en s’éloignant du Soleil.', 'Sunlight weakens greatly farther from the Sun.'),
      curious: T('Des missions lointaines comme Voyager et New Horizons utilisent des générateurs à radioisotopes.', 'Distant missions such as Voyager and New Horizons use radioisotope generators.'),
      source: SOURCES.newHorizons,
    },
  ],
  humanPrecedent: {
    achieved: false,
    note: T(
      'Aucun humain n\'a voyagé au-delà de la Lune. Les planètes géantes restent le domaine exclusif des robots.',
      'No human has traveled beyond the Moon. The giant planets remain the exclusive domain of robots.',
    ),
    source: { url: 'https://science.nasa.gov/solar-system/', label: 'NASA Solar System', retrievedAt: '2026-09-05' },
  },
  robotPrecedent: {
    achieved: true,
    firstMission: 'Pioneer 10 (Jupiter)',
    firstDate: '1973-12-03',
    latestMission: 'Juno (Jupiter)',
    latestDate: '2016-07-04',
    note: T(
      'Pioneer 10 a survolé Jupiter en 1973. Voyager 2 reste le seul engin à avoir visité Jupiter, Saturne, Uranus et Neptune.',
      'Pioneer 10 flew past Jupiter in 1973. Voyager 2 remains the only spacecraft to have visited Jupiter, Saturn, Uranus, and Neptune.',
    ),
    source: SOURCES.voyager2,
  },
  steps: [
    {
      id: 'outer-reach-solar-scale',
      kind: 'reach-scale',
      level: 'solar',
      label: T('Voir le Système solaire', 'Open the Solar System'),
      detail: T('Prends du recul pour voir les orbites des planètes', 'Zoom out to see the planetary orbits'),
      ordered: true,
    },
    {
      id: 'outer-visit-jupiter',
      kind: 'visit',
      target: 'jupiter',
      label: T('Explorer Jupiter', 'Explore Jupiter'),
      detail: T('La plus grande planète du système solaire', 'The largest planet in the solar system'),
      ordered: true,
    },
    {
      id: 'outer-visit-saturn',
      kind: 'visit',
      target: 'saturn',
      label: T('Explorer Saturne', 'Explore Saturn'),
      detail: T('Ses anneaux sont visibles depuis un petit télescope', 'Its rings are visible through a small telescope'),
    },
    {
      id: 'outer-visit-uranus',
      kind: 'visit',
      target: 'uranus',
      label: T('Explorer Uranus', 'Explore Uranus'),
      detail: T('La planète qui tourne « sur le côté »', 'The planet that rotates "on its side"'),
    },
    {
      id: 'outer-visit-neptune',
      kind: 'visit',
      target: 'neptune',
      label: T('Explorer Neptune', 'Explore Neptune'),
      detail: T('Les vents les plus rapides du système solaire', 'The fastest winds in the solar system'),
    },
    {
      id: 'outer-quiz-rings',
      kind: 'quiz',
      label: T('Quiz : les anneaux de Saturne', 'Quiz: Saturn\'s rings'),
      detail: T('De quoi sont faits les anneaux de Saturne ?', 'What are Saturn\'s rings made of?'),
      question: {
        prompt: T(
          'De quoi sont principalement constitués les anneaux de Saturne ?',
          'What are Saturn\'s rings mainly made of?',
        ),
        options: [
          T('Roche et poussière', 'Rock and dust'),
          T('Glace d\'eau et débris rocheux', 'Water ice and rocky debris'),
          T('Gaz comprimé', 'Compressed gas'),
        ],
        correctIndex: 1,
        explain: T(
          'Les anneaux de Saturne sont surtout formés de morceaux de glace et de roche couverts de poussière, du grain minuscule jusqu’au bloc gros comme une maison.',
          'Saturn’s rings are mostly chunks of ice and rock coated with dust, ranging from tiny grains to house-sized blocks.',
        ),
        source: SOURCES.saturnFacts,
      },
    },
  ],
  reward: T('Voyageur interplanétaire', 'Interplanetary Voyager'),
};

/* ================================================================== */
/*  J5 — Milky Way → Andromeda · out-of-reach · difficulty 3           */
/* ================================================================== */

const milkywayToAndromeda: JourneyDef = {
  id: 'milkyway-to-andromeda',
  number: 5,
  icon: '🌌',
  title: T('Voie lactée → Andromède', 'Milky Way → Andromeda'),
  pitch: T(
    'La grande galaxie la plus proche de la nôtre, à environ 2,5 millions d’années-lumière.',
    'The nearest large galaxy, about 2.5 million light-years away.',
  ),
  difficulty: 3,
  from: { id: 'milky-way', label: T('Voie lactée', 'Milky Way galaxy') },
  to: { id: 'andromeda', label: T('Andromède (M31)', 'Andromeda (M31)') },
  feasibility: 'out-of-reach',
  distance: {
    kind: 'fixed',
    value: Q(2.365e19, SOURCES.andromeda),
  },
  durations: [
    { vehicle: 'light', seconds: 2_500_000 * 365.25 * 86_400, approximate: true, source: SOURCES.andromeda },
    { vehicle: 'voyager-1', seconds: null, approximate: true, source: SOURCES.voyager },
    { vehicle: 'parker-solar-probe', seconds: null, approximate: true, note: T('Le calcul utilise environ 192 km/s, une vitesse de pointe atteinte brièvement près du Soleil, pas une vitesse de croisière.', 'The calculation uses about 192 km/s, a peak briefly reached near the Sun, not a cruising speed.'), source: SOURCES.parker },
  ],
  legs: [
    { id: 'heliopause', label: T('Franchir l’héliopause', 'Cross the heliopause'), encounter: T('Sortir de la bulle de vent solaire, comme Voyager 1 en 2012.', 'Leave the solar-wind bubble, as Voyager 1 did in 2012.'), source: SOURCES.voyager },
    { id: 'oort-cloud', label: T('Traverser le nuage de Oort', 'Cross the Oort Cloud'), encounter: T('Une région théorique de petits corps glacés qui s’étend très loin autour du Soleil.', 'A theoretical region of icy bodies extending far around the Sun.'), source: SOURCES.solarSystem },
    { id: 'intergalactic-space', label: T('Espace intergalactique', 'Intergalactic space'), encounter: T('L’immense vide entre la Voie lactée et Andromède.', 'The immense void between the Milky Way and Andromeda.'), source: SOURCES.andromeda },
  ],
  hazards: [
    {
      kind: 'isolation',
      label: T('Isolement absolu', 'Absolute isolation'),
      simple: T('L’espace entre les galaxies est extraordinairement vide et les secours seraient impossibles.', 'Space between galaxies is extraordinarily empty, and rescue would be impossible.'),
      curious: T('Même après avoir quitté l’influence immédiate du Soleil, le trajet vers une autre galaxie ne ferait que commencer.', 'Even after leaving the Sun’s immediate influence, the trip to another galaxy would only be beginning.'),
      source: SOURCES.andromeda,
    },
    {
      kind: 'comms',
      label: T('Communication sans retour rapide', 'No quick communication'),
      simple: T('Un message mettrait environ 2,5 millions d\'années à parvenir.', 'A message would take about 2.5 million years to arrive.'),
      curious: T('Quand le message arriverait, l\'humanité aurait changé au-delà de toute reconnaissance — si elle existe encore.', 'By the time the message arrives, humanity would have changed beyond recognition — if it still exists.'),
      source: SOURCES.andromeda,
    },
    {
      kind: 'supplies',
      label: T('Ressources hors d’échelle', 'Resources beyond our scale'),
      simple: T('Aucun système actuel ne peut fonctionner et se ravitailler pendant des milliards d’années.', 'No present system can operate and resupply itself for billions of years.'),
      curious: T('Les calculs de durée dépassent l’histoire des étoiles, des planètes et de toute civilisation connue.', 'The travel-time calculations exceed the history of stars, planets, and every known civilization.'),
      source: SOURCES.universeAge,
    },
  ],
  humanPrecedent: {
    achieved: false,
    note: T(
      'Ce voyage est physiquement hors de portée avec toute technologie connue ou envisageable.',
      'This journey is physically out of reach with any known or foreseeable technology.',
    ),
    source: { url: 'https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-galaxies/', label: 'NASA Hubble Galaxies', retrievedAt: '2026-09-05' },
  },
  robotPrecedent: {
    achieved: false,
    note: T(
      'Voyager 1 a franchi l’héliopause en 2012, mais aucun engin n’a encore traversé le nuage de Oort.',
      'Voyager 1 crossed the heliopause in 2012, but no spacecraft has yet crossed the Oort Cloud.',
    ),
    source: SOURCES.voyager,
  },
  highlights: [
    {
      text: T('À la vitesse de Voyager 1, le trajet durerait des dizaines de milliards d’années : plus que les quelque 13,8 milliards d’années d’âge de l’Univers.', 'At Voyager 1 speed, the trip would take tens of billions of years: longer than the Universe’s roughly 13.8-billion-year age.'),
      source: SOURCES.universeAge,
    },
    {
      text: T('Les nouvelles mesures ne garantissent pas une fusion : elles donnent environ une chance sur deux de collision entre la Voie lactée et Andromède dans les dix prochains milliards d’années.', 'New measurements no longer guarantee a merger: they give roughly a 50% chance of a Milky Way–Andromeda collision within the next ten billion years.'),
      source: SOURCES.andromeda,
    },
  ],
  steps: [
    {
      id: 'andromeda-reach-localgroup',
      kind: 'reach-scale',
      level: 'localgroup',
      label: T('Atteindre l’échelle du Groupe local', 'Reach the Local Group scale'),
      detail: T('Observe les galaxies voisines sous forme de simulation', 'View neighbouring galaxies as a simulation'),
      ordered: true,
    },
    {
      id: 'andromeda-visit-sgra',
      kind: 'visit',
      target: 'sgr-a',
      label: T('Voir le centre de la Voie lactée', 'See the center of the Milky Way'),
      detail: T('Sagittarius A*, le trou noir supermassif', 'Sagittarius A*, the supermassive black hole'),
    },
    {
      id: 'andromeda-visit-andromeda',
      kind: 'visit',
      target: 'andromeda',
      label: T('Observer Andromède', 'Observe Andromeda'),
      detail: T('La grande galaxie spirale M31', 'The great spiral galaxy M31'),
      ordered: true,
    },
    {
      id: 'andromeda-quiz-collision',
      kind: 'quiz',
      label: T('Quiz : la collision future', 'Quiz: the future collision'),
      detail: T('Que va-t-il arriver à la Voie lactée et Andromède ?', 'What will happen to the Milky Way and Andromeda?'),
      question: {
        prompt: T(
          'Les observations actuelles garantissent-elles une collision entre la Voie lactée et Andromède ?',
          'Do current observations guarantee a Milky Way–Andromeda collision?',
        ),
        options: [
          T('Oui, dans exactement 4,5 milliards d’années', 'Yes, in exactly 4.5 billion years'),
          T('Non : environ 50 % de chance dans les 10 prochains milliards d’années', 'No: roughly a 50% chance within the next 10 billion years'),
          T('Non, car les deux galaxies ne bougent pas', 'No, because neither galaxy moves'),
        ],
        correctIndex: 1,
        explain: T(
          'Les données de Hubble et Gaia publiées en 2025 donnent environ 50 % de chance de collision dans les dix prochains milliards d’années, pas une certitude.',
          'Hubble and Gaia results published in 2025 give about a 50% collision chance within the next ten billion years, not a certainty.',
        ),
        source: SOURCES.andromeda,
      },
    },
    {
      id: 'andromeda-compare',
      kind: 'compare',
      a: 'andromeda',
      b: 'triangulum',
      label: T('Comparer Andromède et la galaxie du Triangle', 'Compare Andromeda and the Triangulum Galaxy'),
      detail: T('Laquelle de ces deux galaxies voisines est la plus grande ?', 'Which of these two neighbouring galaxies is larger?'),
    },
  ],
  reward: T('Explorateur intergalactique', 'Intergalactic Explorer'),
};

/* ================================================================== */
/*  J6 — Into a black hole · impossible-today · difficulty 3           */
/* ================================================================== */

const intoABlackHole: JourneyDef = {
  id: 'into-a-black-hole',
  number: 6,
  icon: '🕳️',
  title: T('Plonger dans un trou noir', 'Into a Black Hole'),
  pitch: T(
    'Que se passerait-il si on plongeait dans Sagittarius A* ?',
    'What would happen if you dived into Sagittarius A*?',
  ),
  difficulty: 3,
  from: { id: 'sun', label: T('Système solaire', 'Solar System') },
  to: { id: 'sgr-a', label: T('Sagittarius A*', 'Sagittarius A* black hole') },
  feasibility: 'impossible-today',
  distance: {
    kind: 'fixed',
    value: Q(2.46e17, SOURCES.blackHoles),
  },
  durations: [
    { vehicle: 'light', seconds: 26_000 * 365.25 * 86_400, approximate: true, source: SOURCES.blackHoles },
    { vehicle: 'voyager-1', seconds: null, approximate: true, source: SOURCES.voyager },
  ],
  legs: [
    { id: 'spiral-arm', label: T('Traverser le bras d\'Orion', 'Cross the Orion Arm'), encounter: T('Notre bras spiral, rempli de nébuleuses et d\'étoiles jeunes.', 'Our spiral arm, filled with nebulae and young stars.'), source: SOURCES.blackHoles },
    { id: 'galactic-bar', label: T('La barre centrale', 'The central bar'), encounter: T('Une zone dense d’étoiles au cœur de la Voie lactée.', 'A dense region of stars at the heart of the Milky Way.'), source: SOURCES.blackHoles },
    { id: 'event-horizon', label: T('Horizon des événements', 'Event horizon'), encounter: T('Le point de non-retour : même la lumière ne peut s’échapper.', 'The point of no return: even light cannot escape.'), source: SOURCES.blackHoles },
  ],
  hazards: [
    {
      kind: 'tidal-forces',
      label: T('Forces de marée', 'Tidal forces'),
      simple: T('La gravité est si forte qu\'elle étire tout en « spaghetti ».', 'Gravity is so strong it stretches everything into "spaghetti."'),
      curious: T('Pour un trou noir de la masse de Sgr A* (environ 4 millions de Soleils), la spaghettification se produirait après l\'horizon des événements. Pour un plus petit trou noir stellaire, elle arriverait avant.', 'For a black hole of Sgr A*\'s mass (about 4 million Suns), spaghettification would happen after the event horizon. For a smaller stellar black hole, it would happen before.'),
      source: SOURCES.blackHoles,
    },
    {
      kind: 'radiation',
      label: T('Rayonnement X et gamma', 'X-ray and gamma radiation'),
      simple: T('La matière qui tombe émet des radiations mortelles.', 'Infalling matter emits lethal radiation.'),
      curious: T('Le disque d\'accrétion autour de Sgr A* chauffe le gaz à des millions de degrés, émettant des rayons X observés par le télescope Chandra.', 'The accretion disk around Sgr A* heats gas to millions of degrees, emitting X-rays observed by the Chandra telescope.'),
      source: SOURCES.blackHoles,
    },
    {
      kind: 'gravity',
      label: T('Gravité et temps extrêmes', 'Extreme gravity and time'),
      simple: T('Près d’un trou noir, le temps passe plus lentement que loin de lui : c’est la dilatation du temps.', 'Near a black hole, time passes more slowly than farther away: this is time dilation.'),
      curious: T('Pour un observateur lointain, une horloge qui approche de l’horizon semble ralentir presque jusqu’à s’arrêter ; pour la personne qui tombe, sa propre horloge paraît normale.', 'To a distant observer, a clock approaching the horizon seems to slow almost to a stop; to the falling traveller, their own clock feels normal.'),
      source: SOURCES.blackHoleApproach,
    },
  ],
  humanPrecedent: {
    achieved: false,
    note: T(
      'Personne n’y est jamais allé, et personne ne pourrait revenir pour raconter.',
      'Nobody has ever gone there, and nobody could return to tell the story.',
    ),
    source: { url: 'https://science.nasa.gov/universe/black-holes/', label: 'NASA Black Holes', retrievedAt: '2026-09-05' },
  },
  robotPrecedent: {
    achieved: false,
    note: T(
      'Aucune sonde n’a approché un trou noir. L’Event Horizon Telescope a publié la première image de l’environnement de Sgr A* en 2022.',
      'No probe has approached a black hole. The Event Horizon Telescope published the first image of Sgr A*’s surroundings in 2022.',
    ),
    source: SOURCES.eht,
  },
  highlights: [
    {
      text: T('Gaia BH1, à environ 1 560 années-lumière, compte parmi les trous noirs connus les plus proches de la Terre.', 'Gaia BH1, about 1,560 light-years away, is among the closest known black holes to Earth.'),
      source: SOURCES.gaiaBh,
    },
    {
      text: T('Sagittarius A* contient environ quatre millions de masses solaires ; son horizon mesure environ 12,7 millions de kilomètres de rayon.', 'Sagittarius A* contains about four million solar masses; its event horizon has a radius of roughly 12.7 million kilometres.'),
      source: SOURCES.blackHoles,
    },
    {
      text: T('Les images montrent une émission lumineuse autour d’une ombre, pas le trou noir lui-même : M87* a été révélé en 2019, puis Sgr A* en 2022.', 'The images show glowing material around a shadow, not the black hole itself: M87* was revealed in 2019, followed by Sgr A* in 2022.'),
      source: SOURCES.ehtM87,
    },
  ],
  steps: [
    {
      id: 'bh-reach-milkyway',
      kind: 'reach-scale',
      level: 'milkyway',
      label: T('Voir la Voie lactée', 'Open the Milky Way view'),
      detail: T('Repère son centre dans cette simulation', 'Locate its centre in this simulation'),
      ordered: true,
    },
    {
      id: 'bh-visit-sgra',
      kind: 'visit',
      target: 'sgr-a',
      label: T('Observer Sagittarius A*', 'Observe Sagittarius A*'),
      detail: T('Le trou noir supermassif de la Voie lactée', 'The Milky Way\'s supermassive black hole'),
      ordered: true,
    },
    {
      id: 'bh-quiz-mass',
      kind: 'quiz',
      label: T('Quiz : la masse de Sgr A*', 'Quiz: the mass of Sgr A*'),
      detail: T('Quelle est la masse de notre trou noir central ?', 'What is the mass of our central black hole?'),
      question: {
        prompt: T(
          'Quelle est la masse de Sagittarius A* ?',
          'What is the mass of Sagittarius A*?',
        ),
        options: [
          T('10 fois celle du Soleil', '10 times the Sun'),
          T('Environ 4 millions de fois celle du Soleil', 'About 4 million times the Sun'),
          T('1 milliard de fois celle du Soleil', '1 billion times the Sun'),
        ],
        correctIndex: 1,
        explain: T(
          'Sgr A* a une masse d\'environ 4 millions de Soleils, mesurée grâce aux orbites d\'étoiles proches (travaux récompensés par le prix Nobel 2020).',
          'Sgr A* has a mass of about 4 million Suns, measured from the orbits of nearby stars (work awarded the 2020 Nobel Prize).',
        ),
        source: SOURCES.blackHoles,
      },
    },
  ],
  reward: T('Intrépide cosmique', 'Cosmic Daredevil'),
};

/* ================================================================== */
/*  J7 — Constellations · do-it-tonight · difficulty 1                 */
/* ================================================================== */

const constellationsFromEarth: JourneyDef = {
  id: 'constellations-from-earth',
  number: 7,
  icon: '⭐',
  title: T('Les constellations ce soir', 'Tonight\'s Constellations'),
  pitch: T(
    'Lève les yeux : par ciel dégagé, une constellation est à ta portée sans rien acheter.',
    'Look up: under a clear sky, you can find a constellation without buying anything.',
  ),
  difficulty: 1,
  from: { id: 'earth', label: T('Terre', 'Earth') },
  to: { id: 'night-sky', label: T('Ciel nocturne', 'Night sky') },
  feasibility: 'do-it-tonight',
  distance: {
    kind: 'fixed',
    value: Q(0, SOURCES.orion, false),
  },
  durations: [
    { vehicle: 'walking', seconds: 0, note: T('Sors dans un lieu sûr et lève les yeux.', 'Step outside somewhere safe and look up.'), source: SOURCES.constellations },
  ],
  legs: [
    { id: 'find-spot', label: T('Trouver un bon endroit', 'Find a good spot'), encounter: T('Éloigne-toi des lampes, dans un endroit sûr avec un horizon dégagé.', 'Move away from lamps, in a safe place with an open horizon.'), source: SOURCES.skywatching },
    { id: 'adapt-eyes', label: T('Adapter tes yeux', 'Let your eyes adapt'), encounter: T('Attends 20 à 30 minutes sans lumière vive et sans regarder ton téléphone.', 'Wait 20 to 30 minutes without bright light or looking at your phone.'), source: SOURCES.skywatching },
    { id: 'find-north', label: T('Trouver le Nord', 'Find north'), encounter: T('Polaris, dans la Petite Ourse, indique approximativement le nord.', 'Polaris, in Ursa Minor, points approximately north.'), source: SOURCES.constellations },
  ],
  hazards: [
    {
      kind: 'light-pollution',
      label: T('Pollution lumineuse', 'Light pollution'),
      simple: T('Les lampadaires et écrans empêchent de voir les étoiles.', 'Streetlights and screens prevent seeing stars.'),
      curious: T('La lumière artificielle diffusée dans le ciel masque les étoiles les moins brillantes. S’éloigner des lampes améliore l’observation.', 'Artificial light scattered through the sky hides fainter stars. Moving away from lamps improves the view.'),
      source: SOURCES.skywatching,
    },
    {
      kind: 'weather',
      label: T('Météo', 'Weather'),
      simple: T('Les nuages masquent le ciel nocturne.', 'Clouds hide the night sky.'),
      curious: T('Météo, phase de la Lune, saison et latitude changent les constellations visibles et la noirceur du ciel.', 'Weather, Moon phase, season, and latitude change which constellations are visible and how dark the sky becomes.'),
      source: SOURCES.constellations,
    },
  ],
  humanPrecedent: {
    achieved: true,
    firstMission: 'Observations humaines anciennes',
    note: T(
      'Les constellations sont connues depuis la nuit des temps. Les Babyloniens, les Égyptiens et les Grecs les ont cataloguées.',
      'Constellations have been known since the dawn of time. Babylonians, Egyptians, and Greeks catalogued them.',
    ),
    source: SOURCES.constellations,
  },
  robotPrecedent: {
    achieved: true,
    firstMission: 'Catalogues stellaires spatiaux',
    latestMission: 'Gaia',
    latestDate: '2025-01-15',
    note: T(
      'Gaia a terminé ses observations scientifiques en janvier 2025 après avoir cartographié près de deux milliards d’étoiles et d’autres objets.',
      'Gaia ended science observations in January 2025 after mapping nearly two billion stars and other objects.',
    ),
    source: SOURCES.gaia,
  },
  highlights: [
    {
      text: T('L’Union astronomique internationale reconnaît 88 constellations qui couvrent tout le ciel.', 'The International Astronomical Union recognises 88 constellations covering the entire sky.'),
      source: SOURCES.constellations,
    },
    {
      text: T('Révélation : les étoiles d’une constellation ne sont pas forcément voisines. Dans Orion, Bételgeuse est à environ 550 al, Alnitak à 800 al et Rigel à 860 al.', 'Revelation: constellation stars are not necessarily neighbours. In Orion, Betelgeuse is about 550 ly away, Alnitak 800 ly, and Rigel 860 ly.'),
      source: SOURCES.orion,
    },
  ],
  steps: [
    {
      id: 'const-visit-night-sky',
      kind: 'visit',
      target: 'night-sky',
      label: T('Ouvrir le ciel nocturne', 'Open the night-sky view'),
      detail: T('Utilise la carte existante des constellations', 'Use the existing constellation map'),
    },
    {
      id: 'const-visit-ori',
      kind: 'visit',
      target: 'Ori',
      label: T('Trouver Orion', 'Find Orion'),
      detail: T('Le chasseur et sa ceinture de trois étoiles', 'The hunter and his three-star belt'),
    },
    {
      id: 'const-visit-uma',
      kind: 'visit',
      target: 'UMa',
      label: T('Trouver la Grande Ourse', 'Find Ursa Major'),
      detail: T('La « casserole » qui pointe vers l\'étoile polaire', 'The "Big Dipper" that points to Polaris'),
    },
    {
      id: 'const-visit-cyg',
      kind: 'visit',
      target: 'Cyg',
      label: T('Trouver le Cygne', 'Find Cygnus'),
      detail: T('La Croix du Nord dans la Voie lactée', 'The Northern Cross in the Milky Way'),
    },
    {
      id: 'const-quiz-polaris',
      kind: 'quiz',
      label: T('Quiz : l\'étoile polaire', 'Quiz: Polaris'),
      detail: T('Sais-tu dans quelle constellation se trouve l\'étoile polaire ?', 'Do you know which constellation contains Polaris?'),
      question: {
        prompt: T(
          'Dans quelle constellation se trouve l\'étoile polaire (Polaris) ?',
          'Which constellation contains Polaris?',
        ),
        options: [
          T('La Grande Ourse (Ursa Major)', 'Ursa Major (the Big Dipper)'),
          T('La Petite Ourse (Ursa Minor)', 'Ursa Minor (the Little Dipper)'),
          T('Cassiopée (Cassiopeia)', 'Cassiopeia'),
        ],
        correctIndex: 1,
        explain: T(
          'Polaris est l\'étoile la plus brillante de la Petite Ourse (Ursa Minor). On la trouve en prolongeant les deux étoiles du bord de la Grande Ourse.',
          'Polaris is the brightest star in Ursa Minor. You find it by extending the line of the two stars at the edge of the Big Dipper.',
        ),
        source: SOURCES.constellations,
      },
    },
    {
      id: 'const-real-world',
      kind: 'real-world',
      label: T('Observer le ciel ce soir', 'Observe the sky tonight'),
      detail: T('Sors vraiment observer les étoiles !', 'Actually go out and observe the stars!'),
      checklist: [
        T('Je suis sorti(e) dans un endroit sûr quand il faisait nuit', 'I went outside to a safe place after dark'),
        T('Je me suis éloigné(e) des lampes', 'I moved away from bright lamps'),
        T('J’ai attendu au moins 20 minutes sans regarder mon téléphone', 'I waited at least 20 minutes without looking at my phone'),
        T('J’ai trouvé au moins une constellation', 'I found at least one constellation'),
        T('Je suis revenu(e) dans l’application pour le vérifier', 'I came back to the app to check it off'),
      ],
    },
  ],
  reward: T('Observateur du ciel', 'Sky Watcher'),
};

/* ================================================================== */
/*  Catalogue                                                          */
/* ================================================================== */

export const JOURNEYS: readonly JourneyDef[] = [
  earthToIss,
  earthToMoon,
  earthToMars,
  earthToOuterPlanets,
  milkywayToAndromeda,
  intoABlackHole,
  constellationsFromEarth,
];

export const JOURNEY_BY_ID: Readonly<Record<JourneyId, JourneyDef>> =
  Object.fromEntries(JOURNEYS.map((j) => [j.id, j])) as Record<JourneyId, JourneyDef>;

export const AVAILABLE_JOURNEY_IDS: readonly JourneyId[] = JOURNEYS.map((j) => j.id);
