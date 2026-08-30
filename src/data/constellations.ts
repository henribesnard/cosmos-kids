import type { ConstellationAbbr, ConstellationDef } from './constellationTypes';
import type { LocalizedText } from './types';

const T = (fr: string, en: string): LocalizedText => ({ fr, en });

/**
 * Complete bilingual catalogue of the 88 IAU constellations for the Cosmos Kids
 * educational app.
 *
 * Sources:
 *  - IAU Constellation boundary data (areas in sq. degrees)
 *  - Yale Bright Star Catalogue (brightest stars)
 *  - Deep-sky cross-references match the IDs in deepSkyObjects.ts
 */

export const CONSTELLATION_CATALOG: Record<ConstellationAbbr, ConstellationDef> = {
  /* ================================================================== */
  /*  A                                                                  */
  /* ================================================================== */

  And: {
    id: 'And',
    name: T('Andromède', 'Andromeda'),
    genitive: T('Andromedae', 'Andromedae'),
    symbol: '🌌',
    shortDescription: T(
      'Andromède est une grande constellation du ciel d\u2019automne. Elle abrite la célèbre galaxie d\u2019Andromède, la plus grande galaxie voisine de la nôtre.',
      'Andromeda is a large autumn constellation. It hosts the famous Andromeda Galaxy, the nearest large galaxy to our own.',
    ),
    mythology: T(
      'Dans la mythologie grecque, Andromède était une princesse enchaînée à un rocher pour être dévorée par un monstre marin. Le héros Persée l\u2019a sauvée en chevauchant Pégase. Depuis, ils brillent tous les trois dans le ciel nocturne.',
      'In Greek mythology, Andromeda was a princess chained to a rock to be devoured by a sea monster. The hero Perseus saved her while riding Pegasus. Since then, all three shine together in the night sky.',
    ),
    science: T(
      'La galaxie d\u2019Andromède (M31) est visible à l\u2019œil nu et se trouve à 2,5 millions d\u2019années-lumière. Elle se rapproche de nous et fusionnera avec la Voie lactée dans environ 4,5 milliards d\u2019années.',
      'The Andromeda Galaxy (M31) is visible to the naked eye and lies 2.5 million light-years away. It is approaching us and will merge with the Milky Way in about 4.5 billion years.',
    ),
    color: '#7B68EE',
    bestSeason: 'autumn',
    hemisphere: 'north',
    areaSqDeg: 722,
    brightestStar: T('Alphératz (α And)', 'Alpheratz (α And)'),
    deepSkyObjectIds: ['andromeda'],
    featured: true,
  },

  Ant: {
    id: 'Ant',
    name: T('La Machine pneumatique', 'Antlia'),
    genitive: T('Antliae', 'Antliae'),
    symbol: '⚙',
    shortDescription: T(
      'Petite constellation discrète de l\u2019hémisphère sud, inventée au XVIIIe siècle pour représenter une pompe à air.',
      'A small, faint southern constellation invented in the 18th century to represent an air pump.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#A0522D',
    bestSeason: 'spring',
    hemisphere: 'south',
    areaSqDeg: 239,
    brightestStar: T('α Antliae', 'α Antliae'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Aps: {
    id: 'Aps',
    name: T('L\u2019Oiseau de paradis', 'Apus'),
    genitive: T('Apodis', 'Apodis'),
    symbol: '🐦',
    shortDescription: T(
      'Constellation circumpolaire sud représentant un oiseau de paradis. Elle a été nommée par les navigateurs néerlandais au XVIe siècle.',
      'A southern circumpolar constellation representing a bird-of-paradise. It was named by Dutch navigators in the 16th century.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#20B2AA',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 206,
    brightestStar: T('α Apodis', 'α Apodis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Aql: {
    id: 'Aql',
    name: T('L\u2019Aigle', 'Aquila'),
    genitive: T('Aquilae', 'Aquilae'),
    symbol: '🦅',
    shortDescription: T(
      'Constellation estivale abritant Altaïr, l\u2019une des trois étoiles du Triangle d\u2019été. L\u2019Aigle survole la Voie lactée.',
      'A summer constellation home to Altair, one of the three stars of the Summer Triangle. The Eagle soars across the Milky Way.',
    ),
    mythology: T(
      'Dans la mythologie grecque, l\u2019Aigle portait les éclairs de Zeus, le roi des dieux. C\u2019est aussi l\u2019aigle qui a enlevé Ganymède pour servir d\u2019échanson aux dieux de l\u2019Olympe.',
      'In Greek mythology, the Eagle carried the thunderbolts of Zeus, king of the gods. It is also the eagle that snatched Ganymede to serve as cup-bearer to the Olympian gods.',
    ),
    science: T(
      'Altaïr est l\u2019une des étoiles les plus proches visibles à l\u2019œil nu, à seulement 16,7 années-lumière. Elle tourne si vite sur elle-même qu\u2019elle est aplatie aux pôles.',
      'Altair is one of the closest stars visible to the naked eye, at just 16.7 light-years. It spins so fast that it is flattened at the poles.',
    ),
    color: '#FFD700',
    bestSeason: 'summer',
    hemisphere: 'both',
    areaSqDeg: 652,
    brightestStar: T('Altaïr (α Aql)', 'Altair (α Aql)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  Aqr: {
    id: 'Aqr',
    name: T('Le Verseau', 'Aquarius'),
    genitive: T('Aquarii', 'Aquarii'),
    symbol: '♒',
    shortDescription: T(
      'Le Verseau est une grande constellation du zodiaque liée à l\u2019eau. C\u2019est un signe du zodiaque bien connu, visible en automne.',
      'Aquarius is a large zodiac constellation associated with water. It is a well-known zodiac sign, visible in autumn.',
    ),
    mythology: T(
      'Le Verseau représente Ganymède, un jeune prince troyen si beau que Zeus l\u2019a emporté dans le ciel pour servir à boire aux dieux. Il verse l\u2019eau céleste depuis les étoiles.',
      'Aquarius represents Ganymede, a young Trojan prince so beautiful that Zeus carried him to the sky to serve drinks to the gods. He pours celestial water from the stars.',
    ),
    science: T(
      'Le Verseau contient plusieurs nébuleuses planétaires, dont la nébuleuse de l\u2019Hélice (NGC 7293), l\u2019une des plus proches de la Terre à environ 650 années-lumière.',
      'Aquarius contains several planetary nebulae, including the Helix Nebula (NGC 7293), one of the closest to Earth at about 650 light-years.',
    ),
    color: '#4169E1',
    bestSeason: 'autumn',
    hemisphere: 'both',
    areaSqDeg: 980,
    brightestStar: T('Sadalsuud (β Aqr)', 'Sadalsuud (β Aqr)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  Ara: {
    id: 'Ara',
    name: T('L\u2019Autel', 'Ara'),
    genitive: T('Arae', 'Arae'),
    symbol: '🔥',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud représentant un autel sacrificiel. Elle est située dans une zone riche de la Voie lactée.',
      'A small southern constellation representing a sacrificial altar. It lies in a rich region of the Milky Way.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FF4500',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 237,
    brightestStar: T('β Arae', 'β Arae'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Ari: {
    id: 'Ari',
    name: T('Le Bélier', 'Aries'),
    genitive: T('Arietis', 'Arietis'),
    symbol: '♈',
    shortDescription: T(
      'Constellation du zodiaque représentant un bélier à la toison d\u2019or. Hamal, son étoile la plus brillante, est une géante orange.',
      'A zodiac constellation representing a ram with a golden fleece. Hamal, its brightest star, is an orange giant.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#DC143C',
    bestSeason: 'autumn',
    hemisphere: 'north',
    areaSqDeg: 441,
    brightestStar: T('Hamal (α Ari)', 'Hamal (α Ari)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Aur: {
    id: 'Aur',
    name: T('Le Cocher', 'Auriga'),
    genitive: T('Aurigae', 'Aurigae'),
    symbol: '🐐',
    shortDescription: T(
      'Grande constellation d\u2019hiver dominée par Capella, la sixième étoile la plus brillante du ciel. Le Cocher représente un conducteur de char portant une chèvre.',
      'A large winter constellation dominated by Capella, the sixth-brightest star in the sky. Auriga represents a charioteer carrying a goat.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FFD700',
    bestSeason: 'winter',
    hemisphere: 'north',
    areaSqDeg: 657,
    brightestStar: T('Capella (α Aur)', 'Capella (α Aur)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  B                                                                  */
  /* ================================================================== */

  Boo: {
    id: 'Boo',
    name: T('Le Bouvier', 'Bootes'),
    genitive: T('Bootis', 'Bootis'),
    symbol: '🌾',
    shortDescription: T(
      'Le Bouvier est une constellation du printemps dominée par Arcturus, la quatrième étoile la plus brillante du ciel. Elle représente un gardien de troupeaux.',
      'Bootes is a spring constellation dominated by Arcturus, the fourth-brightest star in the sky. It represents a herdsman.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FF8C00',
    bestSeason: 'spring',
    hemisphere: 'north',
    areaSqDeg: 907,
    brightestStar: T('Arcturus (α Boo)', 'Arcturus (α Boo)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  C                                                                  */
  /* ================================================================== */

  CMa: {
    id: 'CMa',
    name: T('Le Grand Chien', 'Canis Major'),
    genitive: T('Canis Majoris', 'Canis Majoris'),
    symbol: '🐕',
    shortDescription: T(
      'Le Grand Chien abrite Sirius, l\u2019étoile la plus brillante du ciel nocturne. Il suit fidèlement le chasseur Orion dans le ciel d\u2019hiver.',
      'Canis Major hosts Sirius, the brightest star in the night sky. It faithfully follows the hunter Orion across the winter sky.',
    ),
    mythology: T(
      'Le Grand Chien est le fidèle compagnon de chasse d\u2019Orion. Sirius, son étoile la plus brillante, était très importante pour les anciens Égyptiens car son lever annonçait la crue du Nil.',
      'Canis Major is Orion\u2019s faithful hunting companion. Sirius, its brightest star, was very important to the ancient Egyptians because its rising announced the flooding of the Nile.',
    ),
    science: T(
      'Sirius est un système double : Sirius A est une étoile blanche brillante, et Sirius B est une naine blanche minuscule mais très dense. L\u2019ensemble n\u2019est qu\u2019à 8,6 années-lumière de nous.',
      'Sirius is a binary system: Sirius A is a bright white star, and Sirius B is a tiny but extremely dense white dwarf. The system is only 8.6 light-years from us.',
    ),
    color: '#87CEEB',
    bestSeason: 'winter',
    hemisphere: 'both',
    areaSqDeg: 380,
    brightestStar: T('Sirius (α CMa)', 'Sirius (α CMa)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  CMi: {
    id: 'CMi',
    name: T('Le Petit Chien', 'Canis Minor'),
    genitive: T('Canis Minoris', 'Canis Minoris'),
    symbol: '🐶',
    shortDescription: T(
      'Petite constellation d\u2019hiver ne comprenant que deux étoiles principales, dont Procyon, la huitième étoile la plus brillante du ciel.',
      'A small winter constellation with only two main stars, including Procyon, the eighth-brightest star in the sky.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FFA07A',
    bestSeason: 'winter',
    hemisphere: 'both',
    areaSqDeg: 183,
    brightestStar: T('Procyon (α CMi)', 'Procyon (α CMi)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  CVn: {
    id: 'CVn',
    name: T('Les Chiens de chasse', 'Canes Venatici'),
    genitive: T('Canum Venaticorum', 'Canum Venaticorum'),
    symbol: '🐕',
    shortDescription: T(
      'Petite constellation du printemps représentant deux chiens de chasse tenus en laisse par le Bouvier. Elle contient la belle galaxie du Tourbillon.',
      'A small spring constellation representing two hunting dogs held on a leash by Bootes. It contains the beautiful Whirlpool Galaxy.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#BA55D3',
    bestSeason: 'spring',
    hemisphere: 'north',
    areaSqDeg: 465,
    brightestStar: T('Cor Caroli (α CVn)', 'Cor Caroli (α CVn)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cae: {
    id: 'Cae',
    name: T('Le Burin', 'Caelum'),
    genitive: T('Caeli', 'Caeli'),
    symbol: '🔨',
    shortDescription: T(
      'L\u2019une des plus petites et des plus discrètes constellations du ciel, inventée par Nicolas-Louis de Lacaille pour représenter un burin de graveur.',
      'One of the smallest and faintest constellations in the sky, created by Nicolas-Louis de Lacaille to represent an engraving chisel.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#808080',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 125,
    brightestStar: T('α Caeli', 'α Caeli'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cam: {
    id: 'Cam',
    name: T('La Girafe', 'Camelopardalis'),
    genitive: T('Camelopardalis', 'Camelopardalis'),
    symbol: '🦒',
    shortDescription: T(
      'Grande constellation circumpolaire boréale très discrète. Son nom signifie « girafe » en latin, mais les anciens la nommaient « chameau-léopard ».',
      'A large but very faint northern circumpolar constellation. Its name means "giraffe" in Latin, though the ancients called it the "camel-leopard".',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#DEB887',
    bestSeason: 'circumpolar',
    hemisphere: 'north',
    areaSqDeg: 757,
    brightestStar: T('β Camelopardalis', 'β Camelopardalis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cap: {
    id: 'Cap',
    name: T('Le Capricorne', 'Capricornus'),
    genitive: T('Capricorni', 'Capricorni'),
    symbol: '♑',
    shortDescription: T(
      'Constellation du zodiaque représentant une chèvre à queue de poisson. C\u2019est l\u2019une des plus anciennes constellations connues.',
      'A zodiac constellation representing a sea-goat. It is one of the oldest known constellations.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#556B2F',
    bestSeason: 'autumn',
    hemisphere: 'both',
    areaSqDeg: 414,
    brightestStar: T('Deneb Algedi (δ Cap)', 'Deneb Algedi (δ Cap)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Car: {
    id: 'Car',
    name: T('La Carène', 'Carina'),
    genitive: T('Carinae', 'Carinae'),
    symbol: '⛵',
    shortDescription: T(
      'La Carène abrite Canopus, la deuxième étoile la plus brillante du ciel, et la spectaculaire nébuleuse de la Carène, pouponnière d\u2019étoiles géantes.',
      'Carina hosts Canopus, the second-brightest star in the sky, and the spectacular Carina Nebula, a nursery of giant stars.',
    ),
    mythology: T(
      'La Carène fait partie de l\u2019ancien navire Argo, celui de Jason et des Argonautes partis chercher la Toison d\u2019or. Elle représente la coque du navire.',
      'Carina is part of the ancient ship Argo, the vessel of Jason and the Argonauts who sailed to find the Golden Fleece. It represents the ship\u2019s keel.',
    ),
    science: T(
      'La nébuleuse de la Carène (NGC 3372) est l\u2019une des plus grandes du ciel. Eta Carinae, une étoile hypergéante 100 fois plus massive que le Soleil, pourrait exploser en supernova à tout moment.',
      'The Carina Nebula (NGC 3372) is one of the largest in the sky. Eta Carinae, a hypergiant star 100 times more massive than the Sun, could explode as a supernova at any time.',
    ),
    color: '#00CED1',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 494,
    brightestStar: T('Canopus (α Car)', 'Canopus (α Car)'),
    deepSkyObjectIds: ['carina-nebula'],
    featured: true,
  },

  Cas: {
    id: 'Cas',
    name: T('Cassiopée', 'Cassiopeia'),
    genitive: T('Cassiopeiae', 'Cassiopeiae'),
    symbol: '👑',
    shortDescription: T(
      'Cassiopée dessine un grand W (ou M) facile à repérer dans le ciel du nord. C\u2019est une constellation circumpolaire visible toute l\u2019année en France.',
      'Cassiopeia forms an easy-to-spot W (or M) shape in the northern sky. It is a circumpolar constellation visible all year from mid-latitudes.',
    ),
    mythology: T(
      'Cassiopée était une reine vaniteuse qui se vantait d\u2019être plus belle que les nymphes de la mer. Pour la punir, Poséidon l\u2019a attachée à une chaise dans le ciel, où elle tourne parfois la tête en bas !',
      'Cassiopeia was a vain queen who boasted she was more beautiful than the sea nymphs. As punishment, Poseidon tied her to a chair in the sky, where she sometimes hangs upside down!',
    ),
    science: T(
      'Cassiopée est traversée par la Voie lactée et contient de nombreux amas d\u2019étoiles. En 1572, Tycho Brahe y a observé une supernova visible à l\u2019œil nu.',
      'Cassiopeia is crossed by the Milky Way and contains many star clusters. In 1572, Tycho Brahe observed a supernova there visible to the naked eye.',
    ),
    color: '#DA70D6',
    bestSeason: 'circumpolar',
    hemisphere: 'north',
    areaSqDeg: 598,
    brightestStar: T('Schedar (α Cas)', 'Schedar (α Cas)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  Cen: {
    id: 'Cen',
    name: T('Le Centaure', 'Centaurus'),
    genitive: T('Centauri', 'Centauri'),
    symbol: '🏹',
    shortDescription: T(
      'Grande constellation de l\u2019hémisphère sud abritant Alpha Centauri, le système stellaire le plus proche du Soleil, et le spectaculaire amas Omega du Centaure.',
      'A large southern constellation home to Alpha Centauri, the nearest star system to the Sun, and the spectacular Omega Centauri cluster.',
    ),
    mythology: T(
      'Le Centaure représente Chiron, le plus sage des centaures, mi-homme mi-cheval. Il était le professeur des grands héros grecs comme Achille et Hercule.',
      'Centaurus represents Chiron, the wisest of the centaurs, half-man and half-horse. He was the teacher of great Greek heroes like Achilles and Hercules.',
    ),
    science: T(
      'Proxima Centauri, la composante la plus proche d\u2019Alpha Centauri, est l\u2019étoile la plus proche du Soleil à 4,24 années-lumière. Elle possède au moins une exoplanète dans sa zone habitable.',
      'Proxima Centauri, the closest component of Alpha Centauri, is the nearest star to the Sun at 4.24 light-years. It has at least one exoplanet in its habitable zone.',
    ),
    color: '#9370DB',
    bestSeason: 'spring',
    hemisphere: 'south',
    areaSqDeg: 1060,
    brightestStar: T('Rigil Kentaurus (α Cen)', 'Rigil Kentaurus (α Cen)'),
    deepSkyObjectIds: ['omega-centauri'],
    featured: true,
  },

  Cep: {
    id: 'Cep',
    name: T('Céphée', 'Cepheus'),
    genitive: T('Cephei', 'Cephei'),
    symbol: '🏰',
    shortDescription: T(
      'Constellation circumpolaire en forme de maison, représentant le roi Céphée, époux de Cassiopée. Elle contient l\u2019étoile variable Delta Cephei.',
      'A circumpolar constellation shaped like a house, representing King Cepheus, husband of Cassiopeia. It contains the variable star Delta Cephei.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#B8860B',
    bestSeason: 'circumpolar',
    hemisphere: 'north',
    areaSqDeg: 588,
    brightestStar: T('Aldéramin (α Cep)', 'Alderamin (α Cep)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cet: {
    id: 'Cet',
    name: T('La Baleine', 'Cetus'),
    genitive: T('Ceti', 'Ceti'),
    symbol: '🐋',
    shortDescription: T(
      'Grande constellation d\u2019automne représentant le monstre marin envoyé pour dévorer Andromède. Elle contient Mira, une célèbre étoile variable.',
      'A large autumn constellation representing the sea monster sent to devour Andromeda. It contains Mira, a famous variable star.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#5F9EA0',
    bestSeason: 'autumn',
    hemisphere: 'both',
    areaSqDeg: 1231,
    brightestStar: T('Diphda (β Cet)', 'Diphda (β Cet)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cha: {
    id: 'Cha',
    name: T('Le Caméléon', 'Chamaeleon'),
    genitive: T('Chamaeleontis', 'Chamaeleontis'),
    symbol: '🦎',
    shortDescription: T(
      'Petite constellation du pôle sud céleste, nommée par les navigateurs néerlandais au XVIe siècle d\u2019après le lézard caméléon.',
      'A small constellation near the south celestial pole, named by Dutch navigators in the 16th century after the chameleon lizard.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#66CDAA',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 132,
    brightestStar: T('α Chamaeleontis', 'α Chamaeleontis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cir: {
    id: 'Cir',
    name: T('Le Compas', 'Circinus'),
    genitive: T('Circini', 'Circini'),
    symbol: '📐',
    shortDescription: T(
      'L\u2019une des plus petites constellations du ciel, représentant un compas de dessinateur. Elle se trouve près d\u2019Alpha Centauri.',
      'One of the smallest constellations in the sky, representing a drawing compass. It lies near Alpha Centauri.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#708090',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 93,
    brightestStar: T('α Circini', 'α Circini'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cnc: {
    id: 'Cnc',
    name: T('Le Cancer', 'Cancer'),
    genitive: T('Cancri', 'Cancri'),
    symbol: '♋',
    shortDescription: T(
      'Constellation du zodiaque plutôt discrète, célèbre pour l\u2019amas de la Crèche (M44), un bel amas d\u2019étoiles visible à l\u2019œil nu.',
      'A rather faint zodiac constellation, famous for the Beehive Cluster (M44), a beautiful star cluster visible to the naked eye.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FFB6C1',
    bestSeason: 'spring',
    hemisphere: 'north',
    areaSqDeg: 506,
    brightestStar: T('Tarf (β Cnc)', 'Tarf (β Cnc)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Col: {
    id: 'Col',
    name: T('La Colombe', 'Columba'),
    genitive: T('Columbae', 'Columbae'),
    symbol: '🕊',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud représentant la colombe que Noé envoya de son arche, ou la colombe des Argonautes.',
      'A southern constellation representing the dove that Noah sent from his ark, or the dove of the Argonauts.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#87CEFA',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 270,
    brightestStar: T('Phact (α Col)', 'Phact (α Col)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Com: {
    id: 'Com',
    name: T('La Chevelure de Bérénice', 'Coma Berenices'),
    genitive: T('Comae Berenices', 'Comae Berenices'),
    symbol: '💇',
    shortDescription: T(
      'Constellation du printemps représentant la chevelure de la reine Bérénice d\u2019Égypte. Elle contient de nombreuses galaxies lointaines.',
      'A spring constellation representing the hair of Queen Berenice of Egypt. It contains many distant galaxies.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FFDAB9',
    bestSeason: 'spring',
    hemisphere: 'north',
    areaSqDeg: 386,
    brightestStar: T('β Comae Berenices', 'β Comae Berenices'),
    deepSkyObjectIds: [],
    featured: false,
  },

  CrA: {
    id: 'CrA',
    name: T('La Couronne australe', 'Corona Australis'),
    genitive: T('Coronae Australis', 'Coronae Australis'),
    symbol: '👑',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud formant un arc d\u2019étoiles discrètes. C\u2019est le pendant sud de la Couronne boréale.',
      'A small southern constellation forming an arc of faint stars. It is the southern counterpart of Corona Borealis.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#CD853F',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 128,
    brightestStar: T('Meridiana (α CrA)', 'Meridiana (α CrA)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  CrB: {
    id: 'CrB',
    name: T('La Couronne boréale', 'Corona Borealis'),
    genitive: T('Coronae Borealis', 'Coronae Borealis'),
    symbol: '💎',
    shortDescription: T(
      'Petit diadème d\u2019étoiles en forme d\u2019arc, facile à repérer entre Hercule et le Bouvier. Son étoile la plus brillante, Gemma, brille comme un diamant.',
      'A small tiara of stars in an arc shape, easy to spot between Hercules and Bootes. Its brightest star, Gemma, shines like a diamond.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#E6E6FA',
    bestSeason: 'summer',
    hemisphere: 'north',
    areaSqDeg: 179,
    brightestStar: T('Alphecca (α CrB)', 'Alphecca (α CrB)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Crt: {
    id: 'Crt',
    name: T('La Coupe', 'Crater'),
    genitive: T('Crateris', 'Crateris'),
    symbol: '🏆',
    shortDescription: T(
      'Petite constellation du printemps représentant une coupe à boire. Elle est portée sur le dos de l\u2019Hydre dans le ciel.',
      'A small spring constellation representing a drinking cup. It is carried on the back of Hydra in the sky.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#DAA520',
    bestSeason: 'spring',
    hemisphere: 'both',
    areaSqDeg: 282,
    brightestStar: T('Labrum (δ Crt)', 'Labrum (δ Crt)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cru: {
    id: 'Cru',
    name: T('La Croix du Sud', 'Crux'),
    genitive: T('Crucis', 'Crucis'),
    symbol: '✝',
    shortDescription: T(
      'La plus petite des 88 constellations, mais l\u2019une des plus célèbres. La Croix du Sud aide à trouver le pôle sud céleste et figure sur plusieurs drapeaux.',
      'The smallest of the 88 constellations, but one of the most famous. The Southern Cross helps find the south celestial pole and appears on several flags.',
    ),
    mythology: T(
      'Pour les peuples de l\u2019hémisphère sud, la Croix du Sud est un repère essentiel depuis des millénaires. Les Aborigènes d\u2019Australie y voient la tête d\u2019un émeu dans les nuages sombres qui l\u2019entourent.',
      'For peoples in the Southern Hemisphere, the Southern Cross has been an essential landmark for millennia. Indigenous Australians see the head of an emu in the dark clouds surrounding it.',
    ),
    science: T(
      'Acrux (Alpha Crucis) est en réalité un système triple d\u2019étoiles très chaudes et lumineuses. La Croix du Sud est plongée dans une riche zone de la Voie lactée, avec le Sac de Charbon, une nébuleuse sombre célèbre.',
      'Acrux (Alpha Crucis) is actually a triple system of very hot, luminous stars. The Southern Cross lies in a rich area of the Milky Way, alongside the Coalsack, a famous dark nebula.',
    ),
    color: '#FFD700',
    bestSeason: 'spring',
    hemisphere: 'south',
    areaSqDeg: 68,
    brightestStar: T('Acrux (α Cru)', 'Acrux (α Cru)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  Crv: {
    id: 'Crv',
    name: T('Le Corbeau', 'Corvus'),
    genitive: T('Corvi', 'Corvi'),
    symbol: '🐦‍⬛',
    shortDescription: T(
      'Petite constellation du printemps en forme de trapèze, représentant le corbeau sacré d\u2019Apollon. Elle est posée sur le dos de l\u2019Hydre.',
      'A small spring constellation shaped like a trapezoid, representing Apollo\u2019s sacred crow. It perches on the back of Hydra.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#2F4F4F',
    bestSeason: 'spring',
    hemisphere: 'both',
    areaSqDeg: 184,
    brightestStar: T('Gienah (γ Crv)', 'Gienah (γ Crv)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Cyg: {
    id: 'Cyg',
    name: T('Le Cygne', 'Cygnus'),
    genitive: T('Cygni', 'Cygni'),
    symbol: '🦢',
    shortDescription: T(
      'Le Cygne, en forme de grande croix, vole le long de la Voie lactée. Deneb, sa queue, est l\u2019un des sommets du Triangle d\u2019été.',
      'Cygnus, shaped like a large cross, flies along the Milky Way. Deneb, its tail, is one of the vertices of the Summer Triangle.',
    ),
    mythology: T(
      'Selon la légende, Zeus s\u2019est transformé en cygne pour séduire Léda. Le Cygne peut aussi représenter Orphée, transformé en cygne et placé dans le ciel à côté de sa lyre.',
      'According to legend, Zeus transformed himself into a swan to court Leda. The Swan may also represent Orpheus, turned into a swan and placed in the sky next to his lyre.',
    ),
    science: T(
      'Deneb est une supergéante environ 200 000 fois plus lumineuse que le Soleil, à environ 2 600 années-lumière. La constellation contient aussi Cygnus X-1, l\u2019un des premiers trous noirs identifiés.',
      'Deneb is a supergiant about 200,000 times more luminous than the Sun, roughly 2,600 light-years away. The constellation also contains Cygnus X-1, one of the first identified black holes.',
    ),
    color: '#00BFFF',
    bestSeason: 'summer',
    hemisphere: 'north',
    areaSqDeg: 804,
    brightestStar: T('Deneb (α Cyg)', 'Deneb (α Cyg)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  /* ================================================================== */
  /*  D                                                                  */
  /* ================================================================== */

  Del: {
    id: 'Del',
    name: T('Le Dauphin', 'Delphinus'),
    genitive: T('Delphini', 'Delphini'),
    symbol: '🐬',
    shortDescription: T(
      'Petite constellation en forme de losange, facile à repérer en été à côté de l\u2019Aigle. Elle représente un dauphin bondissant.',
      'A small diamond-shaped constellation, easy to spot in summer next to Aquila. It represents a leaping dolphin.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#48D1CC',
    bestSeason: 'summer',
    hemisphere: 'north',
    areaSqDeg: 189,
    brightestStar: T('Rotanev (β Del)', 'Rotanev (β Del)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Dor: {
    id: 'Dor',
    name: T('La Dorade', 'Dorado'),
    genitive: T('Doradus', 'Doradus'),
    symbol: '🐟',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud contenant la majeure partie du Grand Nuage de Magellan, galaxie satellite de la Voie lactée.',
      'A southern constellation containing most of the Large Magellanic Cloud, a satellite galaxy of the Milky Way.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FFD700',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 179,
    brightestStar: T('α Doradus', 'α Doradus'),
    deepSkyObjectIds: ['lmc'],
    featured: false,
  },

  Dra: {
    id: 'Dra',
    name: T('Le Dragon', 'Draco'),
    genitive: T('Draconis', 'Draconis'),
    symbol: '🐉',
    shortDescription: T(
      'Le Dragon s\u2019enroule autour du pôle nord céleste entre les deux Ourses. C\u2019est une grande constellation circumpolaire visible toute l\u2019année.',
      'The Dragon coils around the north celestial pole between the two Bears. It is a large circumpolar constellation visible all year.',
    ),
    mythology: T(
      'Draco peut représenter Ladon, le dragon à cent têtes qui gardait les pommes d\u2019or du jardin des Hespérides. Hercule l\u2019a terrassé lors de son onzième travail.',
      'Draco may represent Ladon, the hundred-headed dragon that guarded the golden apples in the Garden of the Hesperides. Hercules slew it during his eleventh labour.',
    ),
    science: T(
      'Il y a environ 4 700 ans, Thuban (α Draconis) était l\u2019étoile polaire ! L\u2019axe de la Terre oscille lentement, et chaque étoile polaire change au fil des millénaires.',
      'About 4,700 years ago, Thuban (α Draconis) was the pole star! Earth\u2019s axis slowly wobbles, and the pole star changes over millennia.',
    ),
    color: '#228B22',
    bestSeason: 'circumpolar',
    hemisphere: 'north',
    areaSqDeg: 1083,
    brightestStar: T('Eltanin (γ Dra)', 'Eltanin (γ Dra)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  /* ================================================================== */
  /*  E                                                                  */
  /* ================================================================== */

  Equ: {
    id: 'Equ',
    name: T('Le Petit Cheval', 'Equuleus'),
    genitive: T('Equulei', 'Equulei'),
    symbol: '🐴',
    shortDescription: T(
      'La deuxième plus petite constellation du ciel, représentant la tête d\u2019un poulain. Elle est très discrète, juste à côté de Pégase.',
      'The second-smallest constellation in the sky, representing a foal\u2019s head. It is very faint, right next to Pegasus.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#D2691E',
    bestSeason: 'autumn',
    hemisphere: 'north',
    areaSqDeg: 72,
    brightestStar: T('Kitalpha (α Equ)', 'Kitalpha (α Equ)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Eri: {
    id: 'Eri',
    name: T('L\u2019Éridan', 'Eridanus'),
    genitive: T('Eridani', 'Eridani'),
    symbol: '🌊',
    shortDescription: T(
      'La sixième plus grande constellation, représentant un long fleuve sinueux qui s\u2019écoule d\u2019Orion jusqu\u2019au pôle sud céleste.',
      'The sixth-largest constellation, representing a long winding river flowing from Orion to the south celestial pole.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#1E90FF',
    bestSeason: 'winter',
    hemisphere: 'both',
    areaSqDeg: 1138,
    brightestStar: T('Achernar (α Eri)', 'Achernar (α Eri)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  F                                                                  */
  /* ================================================================== */

  For: {
    id: 'For',
    name: T('Le Fourneau', 'Fornax'),
    genitive: T('Fornacis', 'Fornacis'),
    symbol: '🔥',
    shortDescription: T(
      'Constellation discrète de l\u2019hémisphère sud inventée par Lacaille pour représenter un fourneau de chimiste. Elle contient un amas de galaxies lointaines.',
      'A faint southern constellation invented by Lacaille to represent a chemist\u2019s furnace. It contains a cluster of distant galaxies.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#B22222',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 398,
    brightestStar: T('Dalim (α For)', 'Dalim (α For)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  G                                                                  */
  /* ================================================================== */

  Gem: {
    id: 'Gem',
    name: T('Les Gémeaux', 'Gemini'),
    genitive: T('Geminorum', 'Geminorum'),
    symbol: '♊',
    shortDescription: T(
      'Constellation du zodiaque représentant les jumeaux Castor et Pollux. Leurs deux étoiles brillantes sont faciles à repérer en hiver.',
      'A zodiac constellation representing the twins Castor and Pollux. Their two bright stars are easy to spot in winter.',
    ),
    mythology: T(
      'Castor et Pollux étaient des jumeaux inséparables dans la mythologie grecque. Quand Castor mourut, Pollux supplia Zeus de les réunir, et ils furent placés ensemble pour toujours dans les étoiles.',
      'Castor and Pollux were inseparable twins in Greek mythology. When Castor died, Pollux begged Zeus to reunite them, and they were placed together forever in the stars.',
    ),
    science: T(
      'Castor est en réalité un système de six étoiles orbitant les unes autour des autres ! Pollux, quant à lui, est une géante orange qui possède une exoplanète confirmée.',
      'Castor is actually a system of six stars orbiting one another! Pollux is an orange giant that has a confirmed exoplanet.',
    ),
    color: '#FFA500',
    bestSeason: 'winter',
    hemisphere: 'north',
    areaSqDeg: 514,
    brightestStar: T('Pollux (β Gem)', 'Pollux (β Gem)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  Gru: {
    id: 'Gru',
    name: T('La Grue', 'Grus'),
    genitive: T('Gruis', 'Gruis'),
    symbol: '🦩',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud représentant une grue, un grand oiseau élégant. Alnair, son étoile la plus brillante, signifie « la brillante ».',
      'A southern constellation representing a crane, an elegant wading bird. Alnair, its brightest star, means "the bright one".',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#4682B4',
    bestSeason: 'autumn',
    hemisphere: 'south',
    areaSqDeg: 366,
    brightestStar: T('Alnair (α Gru)', 'Alnair (α Gru)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  H                                                                  */
  /* ================================================================== */

  Her: {
    id: 'Her',
    name: T('Hercule', 'Hercules'),
    genitive: T('Herculis', 'Herculis'),
    symbol: '💪',
    shortDescription: T(
      'Grande constellation d\u2019été représentant le héros Hercule. Elle contient M13, l\u2019un des plus beaux amas globulaires du ciel boréal.',
      'A large summer constellation representing the hero Hercules. It contains M13, one of the finest globular clusters in the northern sky.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#CD5C5C',
    bestSeason: 'summer',
    hemisphere: 'north',
    areaSqDeg: 1225,
    brightestStar: T('Kornéphoros (β Her)', 'Kornephoros (β Her)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Hor: {
    id: 'Hor',
    name: T('L\u2019Horloge', 'Horologium'),
    genitive: T('Horologii', 'Horologii'),
    symbol: '🕰',
    shortDescription: T(
      'Constellation discrète de l\u2019hémisphère sud représentant une horloge à pendule. Elle a été créée par Lacaille au XVIIIe siècle.',
      'A faint southern constellation representing a pendulum clock. It was created by Lacaille in the 18th century.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#BDB76B',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 249,
    brightestStar: T('α Horologii', 'α Horologii'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Hya: {
    id: 'Hya',
    name: T('L\u2019Hydre', 'Hydra'),
    genitive: T('Hydrae', 'Hydrae'),
    symbol: '🐍',
    shortDescription: T(
      'La plus grande constellation du ciel ! L\u2019Hydre s\u2019étire sur plus d\u2019un quart de l\u2019horizon, mais ses étoiles sont discrètes sauf Alphard, son cœur solitaire.',
      'The largest constellation in the sky! Hydra stretches over more than a quarter of the horizon, but its stars are faint except Alphard, its solitary heart.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#2E8B57',
    bestSeason: 'spring',
    hemisphere: 'both',
    areaSqDeg: 1303,
    brightestStar: T('Alphard (α Hya)', 'Alphard (α Hya)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Hyi: {
    id: 'Hyi',
    name: T('L\u2019Hydre mâle', 'Hydrus'),
    genitive: T('Hydri', 'Hydri'),
    symbol: '🐍',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud représentant un petit serpent d\u2019eau, à ne pas confondre avec la grande Hydre (Hydra).',
      'A southern constellation representing a small water snake, not to be confused with the larger Hydra.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#3CB371',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 243,
    brightestStar: T('β Hydri', 'β Hydri'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  I                                                                  */
  /* ================================================================== */

  Ind: {
    id: 'Ind',
    name: T('L\u2019Indien', 'Indus'),
    genitive: T('Indi', 'Indi'),
    symbol: '🏹',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud représentant un personnage autochtone. Elle contient Epsilon Indi, une étoile proche avec une naine brune compagnon.',
      'A southern constellation representing an indigenous figure. It contains Epsilon Indi, a nearby star with a companion brown dwarf.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#8B4513',
    bestSeason: 'autumn',
    hemisphere: 'south',
    areaSqDeg: 294,
    brightestStar: T('α Indi', 'α Indi'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  L                                                                  */
  /* ================================================================== */

  LMi: {
    id: 'LMi',
    name: T('Le Petit Lion', 'Leo Minor'),
    genitive: T('Leonis Minoris', 'Leonis Minoris'),
    symbol: '🦁',
    shortDescription: T(
      'Petite constellation discrète au-dessus du Lion. Elle est si faible qu\u2019elle n\u2019a pas d\u2019étoile Alpha officielle.',
      'A small, faint constellation above Leo. It is so faint that it has no official Alpha star.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#F4A460',
    bestSeason: 'spring',
    hemisphere: 'north',
    areaSqDeg: 232,
    brightestStar: T('Praecipua (46 LMi)', 'Praecipua (46 LMi)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Lac: {
    id: 'Lac',
    name: T('Le Lézard', 'Lacerta'),
    genitive: T('Lacertae', 'Lacertae'),
    symbol: '🦎',
    shortDescription: T(
      'Petite constellation en zigzag coincée entre Cassiopée et le Cygne. Elle a été dessinée par l\u2019astronome Hevelius en 1687.',
      'A small zigzag constellation squeezed between Cassiopeia and Cygnus. It was drawn by the astronomer Hevelius in 1687.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#90EE90',
    bestSeason: 'autumn',
    hemisphere: 'north',
    areaSqDeg: 201,
    brightestStar: T('α Lacertae', 'α Lacertae'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Leo: {
    id: 'Leo',
    name: T('Le Lion', 'Leo'),
    genitive: T('Leonis', 'Leonis'),
    symbol: '♌',
    shortDescription: T(
      'Constellation du zodiaque facilement reconnaissable grâce à son astérisme en forme de faucille. Régulus, son étoile la plus brillante, marque le cœur du Lion.',
      'An easily recognisable zodiac constellation thanks to its sickle-shaped asterism. Regulus, its brightest star, marks the Lion\u2019s heart.',
    ),
    mythology: T(
      'Le Lion représente le lion de Némée, un monstre à la peau impénétrable. C\u2019était le premier des douze travaux d\u2019Hercule : il a dû l\u2019étouffer car aucune arme ne pouvait le blesser.',
      'Leo represents the Nemean Lion, a monster with impenetrable skin. It was the first of Hercules\u2019 twelve labours: he had to strangle it because no weapon could wound it.',
    ),
    science: T(
      'Régulus est un système quadruple d\u2019étoiles à 79 années-lumière. L\u2019étoile principale tourne si vite qu\u2019elle est aplatie comme un ballon de rugby.',
      'Regulus is a quadruple star system 79 light-years away. The main star spins so fast it is flattened like a rugby ball.',
    ),
    color: '#FFD700',
    bestSeason: 'spring',
    hemisphere: 'north',
    areaSqDeg: 947,
    brightestStar: T('Régulus (α Leo)', 'Regulus (α Leo)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  Lep: {
    id: 'Lep',
    name: T('Le Lièvre', 'Lepus'),
    genitive: T('Leporis', 'Leporis'),
    symbol: '🐇',
    shortDescription: T(
      'Constellation d\u2019hiver sous les pieds d\u2019Orion. Le Lièvre fuit devant le Grand Chien qui le poursuit.',
      'A winter constellation beneath Orion\u2019s feet. The Hare flees before the Great Dog chasing it.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#D2B48C',
    bestSeason: 'winter',
    hemisphere: 'both',
    areaSqDeg: 290,
    brightestStar: T('Arneb (α Lep)', 'Arneb (α Lep)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Lib: {
    id: 'Lib',
    name: T('La Balance', 'Libra'),
    genitive: T('Librae', 'Librae'),
    symbol: '♎',
    shortDescription: T(
      'Constellation du zodiaque représentant une balance. C\u2019est la seule constellation du zodiaque qui ne représente pas un être vivant.',
      'A zodiac constellation representing a set of scales. It is the only zodiac constellation that does not represent a living being.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#9ACD32',
    bestSeason: 'summer',
    hemisphere: 'both',
    areaSqDeg: 538,
    brightestStar: T('Zubeneschamali (β Lib)', 'Zubeneschamali (β Lib)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Lup: {
    id: 'Lup',
    name: T('Le Loup', 'Lupus'),
    genitive: T('Lupi', 'Lupi'),
    symbol: '🐺',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud représentant un loup, située dans une zone riche de la Voie lactée, entre le Scorpion et le Centaure.',
      'A southern constellation representing a wolf, located in a rich area of the Milky Way between Scorpius and Centaurus.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#696969',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 334,
    brightestStar: T('α Lupi', 'α Lupi'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Lyn: {
    id: 'Lyn',
    name: T('Le Lynx', 'Lynx'),
    genitive: T('Lyncis', 'Lyncis'),
    symbol: '🐱',
    shortDescription: T(
      'Constellation très discrète entre la Grande Ourse et le Cocher. On dit qu\u2019il faut les yeux d\u2019un lynx pour la voir !',
      'A very faint constellation between Ursa Major and Auriga. It is said you need the eyes of a lynx to see it!',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#BC8F8F',
    bestSeason: 'spring',
    hemisphere: 'north',
    areaSqDeg: 545,
    brightestStar: T('α Lyncis', 'α Lyncis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Lyr: {
    id: 'Lyr',
    name: T('La Lyre', 'Lyra'),
    genitive: T('Lyrae', 'Lyrae'),
    symbol: '🎵',
    shortDescription: T(
      'Petite mais brillante constellation d\u2019été dominée par Véga, l\u2019une des étoiles les plus lumineuses du ciel et sommet du Triangle d\u2019été.',
      'A small but bright summer constellation dominated by Vega, one of the brightest stars in the sky and a vertex of the Summer Triangle.',
    ),
    mythology: T(
      'La Lyre est l\u2019instrument magique d\u2019Orphée, dont la musique enchantait même les pierres et les animaux. Après sa mort, Zeus plaça sa lyre parmi les étoiles.',
      'The Lyre is the magical instrument of Orpheus, whose music enchanted even stones and animals. After his death, Zeus placed his lyre among the stars.',
    ),
    science: T(
      'Véga est à seulement 25 années-lumière et sera la prochaine étoile polaire dans environ 12 000 ans. La Lyre contient aussi la nébuleuse de l\u2019Anneau (M57), un magnifique anneau de gaz.',
      'Vega is only 25 light-years away and will be the next pole star in about 12,000 years. Lyra also contains the Ring Nebula (M57), a beautiful ring of gas.',
    ),
    color: '#6A5ACD',
    bestSeason: 'summer',
    hemisphere: 'north',
    areaSqDeg: 286,
    brightestStar: T('Véga (α Lyr)', 'Vega (α Lyr)'),
    deepSkyObjectIds: ['ring-nebula'],
    featured: true,
  },

  /* ================================================================== */
  /*  M                                                                  */
  /* ================================================================== */

  Men: {
    id: 'Men',
    name: T('La Table', 'Mensa'),
    genitive: T('Mensae', 'Mensae'),
    symbol: '🏔',
    shortDescription: T(
      'La constellation la plus discrète du ciel, ne contenant aucune étoile plus brillante que la magnitude 5. Elle est nommée d\u2019après la Montagne de la Table au Cap.',
      'The faintest constellation in the sky, containing no star brighter than magnitude 5. It is named after Table Mountain in Cape Town.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#696969',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 153,
    brightestStar: T('α Mensae', 'α Mensae'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Mic: {
    id: 'Mic',
    name: T('Le Microscope', 'Microscopium'),
    genitive: T('Microscopii', 'Microscopii'),
    symbol: '🔬',
    shortDescription: T(
      'Petite constellation discrète de l\u2019hémisphère sud, inventée par Lacaille pour représenter un microscope. Ses étoiles sont toutes faibles.',
      'A small, faint southern constellation invented by Lacaille to represent a microscope. All its stars are dim.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#778899',
    bestSeason: 'autumn',
    hemisphere: 'south',
    areaSqDeg: 210,
    brightestStar: T('γ Microscopii', 'γ Microscopii'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Mon: {
    id: 'Mon',
    name: T('La Licorne', 'Monoceros'),
    genitive: T('Monocerotis', 'Monocerotis'),
    symbol: '🦄',
    shortDescription: T(
      'Constellation d\u2019hiver située dans la Voie lactée entre Orion et le Grand Chien. Bien que discrète, elle cache de nombreuses nébuleuses.',
      'A winter constellation in the Milky Way between Orion and Canis Major. Although faint, it hides many nebulae.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#EE82EE',
    bestSeason: 'winter',
    hemisphere: 'both',
    areaSqDeg: 482,
    brightestStar: T('β Monocerotis', 'β Monocerotis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Mus: {
    id: 'Mus',
    name: T('La Mouche', 'Musca'),
    genitive: T('Muscae', 'Muscae'),
    symbol: '🪰',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud juste au sud de la Croix du Sud. C\u2019est la seule constellation nommée d\u2019après un insecte.',
      'A small southern constellation just south of the Southern Cross. It is the only constellation named after an insect.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#556B2F',
    bestSeason: 'spring',
    hemisphere: 'south',
    areaSqDeg: 138,
    brightestStar: T('α Muscae', 'α Muscae'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  N                                                                  */
  /* ================================================================== */

  Nor: {
    id: 'Nor',
    name: T('La Règle', 'Norma'),
    genitive: T('Normae', 'Normae'),
    symbol: '📏',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud inventée par Lacaille pour représenter une règle et une équerre de charpentier.',
      'A small southern constellation invented by Lacaille to represent a carpenter\u2019s level and square.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#A9A9A9',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 165,
    brightestStar: T('γ² Normae', 'γ² Normae'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  O                                                                  */
  /* ================================================================== */

  Oct: {
    id: 'Oct',
    name: T('L\u2019Octant', 'Octans'),
    genitive: T('Octantis', 'Octantis'),
    symbol: '🧭',
    shortDescription: T(
      'Constellation qui contient le pôle sud céleste. Contrairement à Polaris au nord, elle n\u2019a aucune étoile brillante pour marquer le pôle.',
      'The constellation containing the south celestial pole. Unlike Polaris in the north, it has no bright star to mark the pole.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#708090',
    bestSeason: 'circumpolar',
    hemisphere: 'south',
    areaSqDeg: 291,
    brightestStar: T('ν Octantis', 'ν Octantis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Oph: {
    id: 'Oph',
    name: T('Ophiuchus', 'Ophiuchus'),
    genitive: T('Ophiuchi', 'Ophiuchi'),
    symbol: '⚕',
    shortDescription: T(
      'Grande constellation d\u2019été représentant un homme tenant un serpent. Bien qu\u2019elle traverse l\u2019écliptique, elle n\u2019est pas un signe officiel du zodiaque.',
      'A large summer constellation representing a man holding a serpent. Although it crosses the ecliptic, it is not an official zodiac sign.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#8FBC8F',
    bestSeason: 'summer',
    hemisphere: 'both',
    areaSqDeg: 948,
    brightestStar: T('Rasalhague (α Oph)', 'Rasalhague (α Oph)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Ori: {
    id: 'Ori',
    name: T('Orion', 'Orion'),
    genitive: T('Orionis', 'Orionis'),
    symbol: '⚔',
    shortDescription: T(
      'Le chasseur Orion est la constellation la plus spectaculaire du ciel d\u2019hiver, avec sa ceinture de trois étoiles alignées et ses brillantes Bételgeuse et Rigel.',
      'The hunter Orion is the most spectacular constellation in the winter sky, with his belt of three aligned stars and his bright Betelgeuse and Rigel.',
    ),
    mythology: T(
      'Orion était un chasseur géant, le plus beau et le plus fort de tous. Il fut piqué par un scorpion envoyé par la déesse Artémis (ou Gaïa), et les dieux le placèrent dans le ciel — toujours à l\u2019opposé du Scorpion.',
      'Orion was a giant hunter, the most handsome and strongest of all. He was stung by a scorpion sent by the goddess Artemis (or Gaia), and the gods placed him in the sky — always opposite the Scorpion.',
    ),
    science: T(
      'La nébuleuse d\u2019Orion (M42) est la pouponnière d\u2019étoiles la plus proche, à 1 344 al. Bételgeuse est une supergéante rouge 700 fois plus grande que le Soleil, qui explosera un jour en supernova.',
      'The Orion Nebula (M42) is the nearest stellar nursery at 1,344 ly. Betelgeuse is a red supergiant 700 times larger than the Sun that will one day explode as a supernova.',
    ),
    color: '#FF6347',
    bestSeason: 'winter',
    hemisphere: 'both',
    areaSqDeg: 594,
    brightestStar: T('Rigel (β Ori)', 'Rigel (β Ori)'),
    deepSkyObjectIds: ['orion-nebula', 'horsehead-nebula'],
    featured: true,
  },

  /* ================================================================== */
  /*  P                                                                  */
  /* ================================================================== */

  Pav: {
    id: 'Pav',
    name: T('Le Paon', 'Pavo'),
    genitive: T('Pavonis', 'Pavonis'),
    symbol: '🦚',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud représentant un paon. Son étoile la plus brillante, Peacock, est nommée d\u2019après l\u2019oiseau en anglais.',
      'A southern constellation representing a peacock. Its brightest star, Peacock, is named after the bird in English.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#4169E1',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 378,
    brightestStar: T('Peacock (α Pav)', 'Peacock (α Pav)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Peg: {
    id: 'Peg',
    name: T('Pégase', 'Pegasus'),
    genitive: T('Pegasi', 'Pegasi'),
    symbol: '🐴',
    shortDescription: T(
      'Pégase est reconnaissable grâce à son grand carré d\u2019étoiles, l\u2019un des astérismes les plus connus du ciel d\u2019automne.',
      'Pegasus is recognisable thanks to its Great Square of stars, one of the most well-known asterisms of the autumn sky.',
    ),
    mythology: T(
      'Pégase est le cheval ailé né du sang de Méduse quand Persée lui trancha la tête. Il a aidé le héros Bellérophon à vaincre la Chimère avant de s\u2019envoler vers les étoiles.',
      'Pegasus is the winged horse born from the blood of Medusa when Perseus cut off her head. He helped the hero Bellerophon defeat the Chimera before flying up to the stars.',
    ),
    science: T(
      'En 1995, la première exoplanète autour d\u2019une étoile semblable au Soleil, 51 Pegasi b, a été découverte dans cette constellation — une découverte révolutionnaire récompensée par le prix Nobel.',
      'In 1995, the first exoplanet around a Sun-like star, 51 Pegasi b, was discovered in this constellation — a ground-breaking discovery awarded the Nobel Prize.',
    ),
    color: '#4682B4',
    bestSeason: 'autumn',
    hemisphere: 'north',
    areaSqDeg: 1121,
    brightestStar: T('Enif (ε Peg)', 'Enif (ε Peg)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  Per: {
    id: 'Per',
    name: T('Persée', 'Perseus'),
    genitive: T('Persei', 'Persei'),
    symbol: '⚔',
    shortDescription: T(
      'Constellation d\u2019automne/hiver représentant le héros Persée tenant la tête de Méduse. Elle contient Algol, la fameuse « étoile du Diable ».',
      'An autumn/winter constellation representing the hero Perseus holding the head of Medusa. It contains Algol, the famous "Demon Star".',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#DAA520',
    bestSeason: 'winter',
    hemisphere: 'north',
    areaSqDeg: 615,
    brightestStar: T('Mirfak (α Per)', 'Mirfak (α Per)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Phe: {
    id: 'Phe',
    name: T('Le Phénix', 'Phoenix'),
    genitive: T('Phoenicis', 'Phoenicis'),
    symbol: '🔥',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud représentant l\u2019oiseau mythique qui renaît de ses cendres. Elle est visible en automne depuis les tropiques.',
      'A southern constellation representing the mythical bird that rises from its ashes. It is visible in autumn from tropical latitudes.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FF4500',
    bestSeason: 'autumn',
    hemisphere: 'south',
    areaSqDeg: 469,
    brightestStar: T('Ankaa (α Phe)', 'Ankaa (α Phe)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Pic: {
    id: 'Pic',
    name: T('Le Peintre', 'Pictor'),
    genitive: T('Pictoris', 'Pictoris'),
    symbol: '🖌',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud représentant un chevalet de peintre. Elle contient Beta Pictoris, une étoile entourée d\u2019un disque de débris et d\u2019exoplanètes.',
      'A small southern constellation representing a painter\u2019s easel. It contains Beta Pictoris, a star surrounded by a debris disk and exoplanets.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FF69B4',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 247,
    brightestStar: T('α Pictoris', 'α Pictoris'),
    deepSkyObjectIds: [],
    featured: false,
  },

  PsA: {
    id: 'PsA',
    name: T('Le Poisson austral', 'Piscis Austrinus'),
    genitive: T('Piscis Austrini', 'Piscis Austrini'),
    symbol: '🐟',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud connue surtout pour Fomalhaut, une étoile blanche brillante surnommée « l\u2019étoile solitaire d\u2019automne ».',
      'A southern constellation known mainly for Fomalhaut, a bright white star nicknamed "the loneliest star of autumn".',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#87CEEB',
    bestSeason: 'autumn',
    hemisphere: 'south',
    areaSqDeg: 245,
    brightestStar: T('Fomalhaut (α PsA)', 'Fomalhaut (α PsA)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Psc: {
    id: 'Psc',
    name: T('Les Poissons', 'Pisces'),
    genitive: T('Piscium', 'Piscium'),
    symbol: '♓',
    shortDescription: T(
      'Grande constellation du zodiaque plutôt discrète, représentant deux poissons reliés par un ruban. Le point vernal s\u2019y trouve actuellement.',
      'A large but rather faint zodiac constellation representing two fish tied together by a ribbon. The vernal equinox currently lies within it.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#00CED1',
    bestSeason: 'autumn',
    hemisphere: 'north',
    areaSqDeg: 889,
    brightestStar: T('Alpherg (η Psc)', 'Alpherg (η Psc)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Pup: {
    id: 'Pup',
    name: T('La Poupe', 'Puppis'),
    genitive: T('Puppis', 'Puppis'),
    symbol: '⛵',
    shortDescription: T(
      'La Poupe fait partie de l\u2019ancien navire Argo et se situe dans la Voie lactée. Elle contient de nombreux amas d\u2019étoiles.',
      'Puppis is part of the ancient ship Argo and lies in the Milky Way. It contains many star clusters.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#6495ED',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 673,
    brightestStar: T('Naos (ζ Pup)', 'Naos (ζ Pup)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Pyx: {
    id: 'Pyx',
    name: T('La Boussole', 'Pyxis'),
    genitive: T('Pyxidis', 'Pyxidis'),
    symbol: '🧭',
    shortDescription: T(
      'Petite constellation discrète représentant une boussole de navire. Elle est associée à l\u2019ancien navire Argo.',
      'A small, faint constellation representing a ship\u2019s compass. It is associated with the ancient ship Argo.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#B0C4DE',
    bestSeason: 'spring',
    hemisphere: 'south',
    areaSqDeg: 221,
    brightestStar: T('α Pyxidis', 'α Pyxidis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  R                                                                  */
  /* ================================================================== */

  Ret: {
    id: 'Ret',
    name: T('Le Réticule', 'Reticulum'),
    genitive: T('Reticuli', 'Reticuli'),
    symbol: '🔭',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud représentant un réticule de télescope. Elle est célèbre en culture populaire pour Zeta Reticuli.',
      'A small southern constellation representing a telescope reticle. It is famous in popular culture for Zeta Reticuli.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#C0C0C0',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 114,
    brightestStar: T('α Reticuli', 'α Reticuli'),
    deepSkyObjectIds: [],
    featured: false,
  },

  /* ================================================================== */
  /*  S                                                                  */
  /* ================================================================== */

  Scl: {
    id: 'Scl',
    name: T('Le Sculpteur', 'Sculptor'),
    genitive: T('Sculptoris', 'Sculptoris'),
    symbol: '🗿',
    shortDescription: T(
      'Constellation discrète du ciel d\u2019automne. Le pôle galactique sud s\u2019y trouve, offrant une vue dégagée sur les galaxies lointaines.',
      'A faint autumn constellation. The south galactic pole lies within it, offering a clear view of distant galaxies.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#A0522D',
    bestSeason: 'autumn',
    hemisphere: 'south',
    areaSqDeg: 475,
    brightestStar: T('α Sculptoris', 'α Sculptoris'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Sco: {
    id: 'Sco',
    name: T('Le Scorpion', 'Scorpius'),
    genitive: T('Scorpii', 'Scorpii'),
    symbol: '♏',
    shortDescription: T(
      'Le Scorpion est une constellation spectaculaire d\u2019été avec Antarès, une supergéante rouge au cœur du scorpion, et une queue recourbée dans la Voie lactée.',
      'Scorpius is a spectacular summer constellation with Antares, a red supergiant at the scorpion\u2019s heart, and a curving tail in the Milky Way.',
    ),
    mythology: T(
      'Le Scorpion est la créature qui a piqué et tué le chasseur Orion. Les dieux les ont placés aux extrémités opposées du ciel : quand l\u2019un se lève, l\u2019autre se couche, ils ne se rencontrent jamais.',
      'The Scorpion is the creature that stung and killed the hunter Orion. The gods placed them on opposite sides of the sky: when one rises, the other sets, so they never meet.',
    ),
    science: T(
      'Antarès est une supergéante rouge environ 700 fois plus grande que le Soleil. Si on la plaçait au centre du système solaire, elle engloberait l\u2019orbite de Mars.',
      'Antares is a red supergiant about 700 times the size of the Sun. If placed at the centre of the solar system, it would engulf the orbit of Mars.',
    ),
    color: '#DC143C',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 497,
    brightestStar: T('Antarès (α Sco)', 'Antares (α Sco)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  Sct: {
    id: 'Sct',
    name: T('L\u2019Écu de Sobieski', 'Scutum'),
    genitive: T('Scuti', 'Scuti'),
    symbol: '🛡',
    shortDescription: T(
      'L\u2019une des plus petites constellations, mais située dans une zone très riche de la Voie lactée. Elle porte le nom du roi polonais Jean III Sobieski.',
      'One of the smallest constellations, but located in a very rich area of the Milky Way. It is named after the Polish king John III Sobieski.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#B8860B',
    bestSeason: 'summer',
    hemisphere: 'both',
    areaSqDeg: 109,
    brightestStar: T('α Scuti', 'α Scuti'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Ser: {
    id: 'Ser',
    name: T('Le Serpent', 'Serpens'),
    genitive: T('Serpentis', 'Serpentis'),
    symbol: '🐍',
    shortDescription: T(
      'La seule constellation divisée en deux parties : la Tête (Caput) et la Queue (Cauda) du Serpent, séparées par Ophiuchus. La Queue contient la nébuleuse de l\u2019Aigle.',
      'The only constellation split into two parts: the Head (Caput) and Tail (Cauda) of the Serpent, separated by Ophiuchus. The Tail contains the Eagle Nebula.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#6B8E23',
    bestSeason: 'summer',
    hemisphere: 'both',
    areaSqDeg: 637,
    brightestStar: T('Unukalhai (α Ser)', 'Unukalhai (α Ser)'),
    deepSkyObjectIds: ['eagle-nebula'],
    featured: false,
  },

  Sex: {
    id: 'Sex',
    name: T('Le Sextant', 'Sextans'),
    genitive: T('Sextantis', 'Sextantis'),
    symbol: '📐',
    shortDescription: T(
      'Constellation très discrète sur l\u2019équateur céleste, représentant un sextant astronomique. Toutes ses étoiles sont faibles.',
      'A very faint constellation on the celestial equator, representing an astronomical sextant. All its stars are dim.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#D2B48C',
    bestSeason: 'spring',
    hemisphere: 'both',
    areaSqDeg: 314,
    brightestStar: T('α Sextantis', 'α Sextantis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Sge: {
    id: 'Sge',
    name: T('La Flèche', 'Sagitta'),
    genitive: T('Sagittae', 'Sagittae'),
    symbol: '➶',
    shortDescription: T(
      'La troisième plus petite constellation du ciel, en forme de flèche. Elle est facile à trouver dans la Voie lactée entre le Cygne et l\u2019Aigle.',
      'The third-smallest constellation in the sky, shaped like an arrow. It is easy to find in the Milky Way between Cygnus and Aquila.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FF6347',
    bestSeason: 'summer',
    hemisphere: 'north',
    areaSqDeg: 80,
    brightestStar: T('γ Sagittae', 'γ Sagittae'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Sgr: {
    id: 'Sgr',
    name: T('Le Sagittaire', 'Sagittarius'),
    genitive: T('Sagittarii', 'Sagittarii'),
    symbol: '♐',
    shortDescription: T(
      'Le Sagittaire pointe sa flèche vers le centre de la Voie lactée. C\u2019est dans cette direction que se trouve le trou noir supermassif Sagittarius A*.',
      'Sagittarius points his arrow toward the centre of the Milky Way. In this direction lies the supermassive black hole Sagittarius A*.',
    ),
    mythology: T(
      'Le Sagittaire est un archer centaure, mi-homme mi-cheval. Il est souvent identifié à Chiron, le sage professeur des héros, bien que Chiron soit aussi associé au Centaure.',
      'Sagittarius is a centaur archer, half-man and half-horse. He is often identified as Chiron, the wise teacher of heroes, though Chiron is also associated with the constellation Centaurus.',
    ),
    science: T(
      'En regardant vers le Sagittaire, on regarde vers le centre de notre galaxie, à 26 000 années-lumière. Le trou noir Sagittarius A* y pèse 4 millions de masses solaires.',
      'Looking toward Sagittarius means looking toward the centre of our galaxy, 26,000 light-years away. The black hole Sagittarius A* there weighs 4 million solar masses.',
    ),
    color: '#FF8C00',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 867,
    brightestStar: T('Kaus Australis (ε Sgr)', 'Kaus Australis (ε Sgr)'),
    deepSkyObjectIds: ['sgr-a'],
    featured: true,
  },

  /* ================================================================== */
  /*  T                                                                  */
  /* ================================================================== */

  Tau: {
    id: 'Tau',
    name: T('Le Taureau', 'Taurus'),
    genitive: T('Tauri', 'Tauri'),
    symbol: '♉',
    shortDescription: T(
      'Le Taureau est une constellation du zodiaque d\u2019hiver, avec l\u2019œil rouge Aldébaran et les célèbres Pléiades, un joli amas d\u2019étoiles visible à l\u2019œil nu.',
      'Taurus is a winter zodiac constellation with the red eye Aldebaran and the famous Pleiades, a pretty star cluster visible to the naked eye.',
    ),
    mythology: T(
      'Zeus se transforma en un magnifique taureau blanc pour séduire la princesse Europe. Il l\u2019emporta sur son dos à travers la mer jusqu\u2019en Crète, donnant son nom au continent européen.',
      'Zeus transformed himself into a magnificent white bull to court Princess Europa. He carried her on his back across the sea to Crete, giving the European continent its name.',
    ),
    science: T(
      'La nébuleuse du Crabe (M1) dans le Taureau est le reste d\u2019une supernova observée en 1054. Les Pléiades (M45) sont un amas ouvert de jeunes étoiles bleues à 444 années-lumière.',
      'The Crab Nebula (M1) in Taurus is the remnant of a supernova observed in 1054. The Pleiades (M45) are an open cluster of young blue stars 444 light-years away.',
    ),
    color: '#FF4500',
    bestSeason: 'winter',
    hemisphere: 'north',
    areaSqDeg: 797,
    brightestStar: T('Aldébaran (α Tau)', 'Aldebaran (α Tau)'),
    deepSkyObjectIds: ['crab-nebula', 'pleiades'],
    featured: true,
  },

  Tel: {
    id: 'Tel',
    name: T('Le Télescope', 'Telescopium'),
    genitive: T('Telescopii', 'Telescopii'),
    symbol: '🔭',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud inventée par Lacaille pour honorer l\u2019invention du télescope. Ses étoiles sont toutes faibles.',
      'A small southern constellation invented by Lacaille to honour the invention of the telescope. All its stars are faint.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#B0B0B0',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 252,
    brightestStar: T('α Telescopii', 'α Telescopii'),
    deepSkyObjectIds: [],
    featured: false,
  },

  TrA: {
    id: 'TrA',
    name: T('Le Triangle austral', 'Triangulum Australe'),
    genitive: T('Trianguli Australis', 'Trianguli Australis'),
    symbol: '▽',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud formant un triangle bien net. C\u2019est le pendant austral du Triangle boréal.',
      'A small southern constellation forming a neat triangle. It is the southern counterpart of the northern Triangle.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FF7F50',
    bestSeason: 'summer',
    hemisphere: 'south',
    areaSqDeg: 110,
    brightestStar: T('Atria (α TrA)', 'Atria (α TrA)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Tri: {
    id: 'Tri',
    name: T('Le Triangle', 'Triangulum'),
    genitive: T('Trianguli', 'Trianguli'),
    symbol: '△',
    shortDescription: T(
      'Petite constellation du ciel d\u2019automne en forme de triangle allongé. Elle abrite la galaxie du Triangle (M33), troisième plus grande galaxie du Groupe local.',
      'A small autumn constellation shaped like an elongated triangle. It hosts the Triangulum Galaxy (M33), the third-largest galaxy in the Local Group.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#20B2AA',
    bestSeason: 'autumn',
    hemisphere: 'north',
    areaSqDeg: 132,
    brightestStar: T('β Trianguli', 'β Trianguli'),
    deepSkyObjectIds: ['triangulum'],
    featured: false,
  },

  Tuc: {
    id: 'Tuc',
    name: T('Le Toucan', 'Tucana'),
    genitive: T('Tucanae', 'Tucanae'),
    symbol: '🐦',
    shortDescription: T(
      'Constellation de l\u2019hémisphère sud représentant un toucan. Elle contient le Petit Nuage de Magellan et le magnifique amas globulaire 47 Tucanae.',
      'A southern constellation representing a toucan. It contains the Small Magellanic Cloud and the magnificent globular cluster 47 Tucanae.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FF6347',
    bestSeason: 'autumn',
    hemisphere: 'south',
    areaSqDeg: 295,
    brightestStar: T('α Tucanae', 'α Tucanae'),
    deepSkyObjectIds: ['smc'],
    featured: false,
  },

  /* ================================================================== */
  /*  U                                                                  */
  /* ================================================================== */

  UMa: {
    id: 'UMa',
    name: T('La Grande Ourse', 'Ursa Major'),
    genitive: T('Ursae Majoris', 'Ursae Majoris'),
    symbol: '🐻',
    shortDescription: T(
      'La Grande Ourse est la troisième plus grande constellation du ciel. Son astérisme de la « Grande Casserole » (ou « Grand Chariot ») est l\u2019un des plus faciles à reconnaître.',
      'Ursa Major is the third-largest constellation in the sky. Its "Big Dipper" (or "Plough") asterism is one of the easiest to recognise.',
    ),
    mythology: T(
      'Selon la mythologie grecque, Zeus a transformé la nymphe Callisto en ourse pour la protéger de la jalousie d\u2019Héra. Son fils Arcas devint la Petite Ourse. Ensemble, ils tournent pour toujours autour du pôle.',
      'In Greek mythology, Zeus transformed the nymph Callisto into a bear to protect her from Hera\u2019s jealousy. Her son Arcas became the Little Bear. Together, they circle the pole forever.',
    ),
    science: T(
      'Cinq des sept étoiles de la Grande Casserole se déplacent ensemble dans l\u2019espace : elles forment un vrai groupe d\u2019étoiles appelé l\u2019amas de la Grande Ourse, à environ 80 années-lumière.',
      'Five of the seven Big Dipper stars move together through space: they form a real star group called the Ursa Major Moving Group, about 80 light-years away.',
    ),
    color: '#1E90FF',
    bestSeason: 'circumpolar',
    hemisphere: 'north',
    areaSqDeg: 1280,
    brightestStar: T('Alioth (ε UMa)', 'Alioth (ε UMa)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  UMi: {
    id: 'UMi',
    name: T('La Petite Ourse', 'Ursa Minor'),
    genitive: T('Ursae Minoris', 'Ursae Minoris'),
    symbol: '⭐',
    shortDescription: T(
      'La Petite Ourse contient Polaris, l\u2019étoile polaire, qui indique presque exactement le nord. C\u2019est le repère le plus précieux des navigateurs depuis des siècles.',
      'Ursa Minor contains Polaris, the North Star, which points almost exactly to the north. It has been the most valuable landmark for navigators for centuries.',
    ),
    mythology: T(
      'La Petite Ourse représente Arcas, le fils de Callisto. Quand il faillit tuer sa mère transformée en ourse, Zeus les plaça tous deux dans le ciel pour les protéger.',
      'Ursa Minor represents Arcas, the son of Callisto. When he nearly killed his mother who had been turned into a bear, Zeus placed them both in the sky to protect them.',
    ),
    science: T(
      'Polaris est en réalité un système triple d\u2019étoiles et une céphéide, une étoile qui pulse régulièrement. Elle est à environ 430 années-lumière et ne restera pas l\u2019étoile polaire éternellement.',
      'Polaris is actually a triple star system and a Cepheid variable, a star that pulses regularly. It is about 430 light-years away and will not remain the pole star forever.',
    ),
    color: '#FFD700',
    bestSeason: 'circumpolar',
    hemisphere: 'north',
    areaSqDeg: 256,
    brightestStar: T('Polaris (α UMi)', 'Polaris (α UMi)'),
    deepSkyObjectIds: [],
    featured: true,
  },

  /* ================================================================== */
  /*  V                                                                  */
  /* ================================================================== */

  Vel: {
    id: 'Vel',
    name: T('Les Voiles', 'Vela'),
    genitive: T('Velorum', 'Velorum'),
    symbol: '⛵',
    shortDescription: T(
      'Les Voiles font partie de l\u2019ancien navire Argo et se situent dans la Voie lactée australe. Elles contiennent le reste de supernova des Voiles.',
      'Vela is part of the ancient ship Argo and lies in the southern Milky Way. It contains the Vela Supernova Remnant.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#6495ED',
    bestSeason: 'spring',
    hemisphere: 'south',
    areaSqDeg: 500,
    brightestStar: T('Regor (γ Vel)', 'Regor (γ Vel)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Vir: {
    id: 'Vir',
    name: T('La Vierge', 'Virgo'),
    genitive: T('Virginis', 'Virginis'),
    symbol: '♍',
    shortDescription: T(
      'La deuxième plus grande constellation du ciel et un signe du zodiaque. Elle contient l\u2019amas de galaxies de la Vierge, le plus grand amas voisin.',
      'The second-largest constellation in the sky and a zodiac sign. It contains the Virgo Cluster, the nearest large galaxy cluster.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#DDA0DD',
    bestSeason: 'spring',
    hemisphere: 'both',
    areaSqDeg: 1294,
    brightestStar: T('Spica (α Vir)', 'Spica (α Vir)'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Vol: {
    id: 'Vol',
    name: T('Le Poisson volant', 'Volans'),
    genitive: T('Volantis', 'Volantis'),
    symbol: '🐟',
    shortDescription: T(
      'Petite constellation de l\u2019hémisphère sud représentant un poisson volant. Elle est située entre la Carène et le Peintre.',
      'A small southern constellation representing a flying fish. It lies between Carina and Pictor.',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#48D1CC',
    bestSeason: 'winter',
    hemisphere: 'south',
    areaSqDeg: 141,
    brightestStar: T('β Volantis', 'β Volantis'),
    deepSkyObjectIds: [],
    featured: false,
  },

  Vul: {
    id: 'Vul',
    name: T('Le Petit Renard', 'Vulpecula'),
    genitive: T('Vulpeculae', 'Vulpeculae'),
    symbol: '🦊',
    shortDescription: T(
      'Petite constellation d\u2019été dans la Voie lactée, entre le Cygne et la Flèche. Elle contient la nébuleuse planétaire Dumbbell (M27).',
      'A small summer constellation in the Milky Way, between Cygnus and Sagitta. It contains the Dumbbell planetary nebula (M27).',
    ),
    mythology: T('', ''),
    science: T('', ''),
    color: '#FF7F50',
    bestSeason: 'summer',
    hemisphere: 'north',
    areaSqDeg: 268,
    brightestStar: T('Anser (α Vul)', 'Anser (α Vul)'),
    deepSkyObjectIds: [],
    featured: false,
  },
};

export const CONSTELLATIONS: readonly ConstellationDef[] = Object.values(CONSTELLATION_CATALOG);
export const FEATURED_CONSTELLATIONS: readonly ConstellationDef[] = CONSTELLATIONS.filter((c) => c.featured);
export const CONSTELLATION_BY_ID: Readonly<Record<ConstellationAbbr, ConstellationDef>> = CONSTELLATION_CATALOG;

export function getConstellation(id: ConstellationAbbr): ConstellationDef {
  return CONSTELLATION_CATALOG[id];
}
