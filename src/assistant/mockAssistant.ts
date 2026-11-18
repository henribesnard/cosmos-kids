/**
 * Mock assistant for development and testing.
 *
 * Activated when URL contains ?nova=mock or VITE_NOVA_MOCK=1.
 * Simulates realistic phase transitions and returns canned responses
 * covering every contract case: verified, debated, unknown, off-topic,
 * privacy, safety, rate-limited, error, action travel, guessFirst.
 */
import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCosmosStore } from '../store/useCosmosStore';
import type {
  AssistantAction,
  AssistantClaim,
  AssistantContext,
  AssistantMessage,
  AssistantPhase,
  AssistantSource,
  ReadingLevel,
  UseAssistant,
} from './types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/*  Context builder (duplicated to avoid circular dep in mock)        */
/* ------------------------------------------------------------------ */

function useMockContext(): AssistantContext {
  const locale = useCosmosStore((s) => s.locale);
  const view = useCosmosStore((s) => s.view);
  const selectedObjectId = useCosmosStore((s) => s.selectedObjectId);
  const activeJourneyId = useCosmosStore((s) => s.mission.activeJourneyId);
  const { pathname } = useLocation();

  return {
    locale,
    view: pathname || view,
    selectedObjectId: selectedObjectId ?? null,
    activeJourneyId: activeJourneyId ?? null,
    readingLevel: 'curious',
  };
}

/* ------------------------------------------------------------------ */
/*  Canned responses                                                   */
/* ------------------------------------------------------------------ */

const CATALOG_SOURCE_NASA: AssistantSource = {
  id: 'src-nasa-saturn',
  title: 'Saturn Fact Sheet',
  publisher: 'NASA NSSDC',
  url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html',
  kind: 'catalog',
};

const WEB_SOURCE_JPL: AssistantSource = {
  id: 'src-jpl-moons',
  title: 'Planetary Satellite Discovery Circumstances',
  publisher: 'NASA JPL',
  url: 'https://ssd.jpl.nasa.gov/sats/discovery.html',
  kind: 'web',
};

const CATALOG_SOURCE_ESA: AssistantSource = {
  id: 'src-esa-bh',
  title: 'Black Holes',
  publisher: 'ESA',
  url: 'https://www.esa.int/Science_Exploration/Space_Science/Black_holes',
  kind: 'catalog',
};

type MockScenario = {
  detect: (text: string, locale: string) => boolean;
  build: (locale: string, readingLevel: ReadingLevel) => Omit<AssistantMessage, 'id' | 'createdAt' | 'role'>;
  phases: readonly AssistantPhase[];
};

const MOCK_SCENARIOS: readonly MockScenario[] = [
  /* 1. Privacy detection */
  {
    detect: (text) =>
      /\b(j'habite|mon (nom|adresse|école|téléphone|email|mail)|my (name|address|school|phone|email))\b/i.test(text),
    build: (locale) => ({
      text: locale === 'fr'
        ? 'Je ne peux pas utiliser d\'informations personnelles. Ne partage jamais ton nom complet, ton adresse ou ton école en ligne. Pose-moi plutôt une question sur l\'espace !'
        : 'I can\'t use personal information. Never share your full name, address, or school online. Ask me a space question instead!',
      kind: 'privacy' as const,
    }),
    phases: ['checking'],
  },
  /* 2. Safety / distress detection */
  {
    detect: (text) =>
      /\b(je me sens mal|j'ai peur|je suis triste|au secours|help me|i'm scared|i feel bad|hurt)\b/i.test(text),
    build: (locale) => ({
      text: locale === 'fr'
        ? 'Je suis une IA qui connaît l\'espace, mais ce que tu ressens est important. Parle à un adulte de confiance — un parent, un·e enseignant·e ou un autre adulte que tu connais bien. Tu n\'es pas seul·e.'
        : 'I\'m an AI that knows about space, but what you\'re feeling matters. Talk to a trusted adult — a parent, a teacher, or another grown-up you know well. You\'re not alone.',
      kind: 'safety' as const,
    }),
    phases: ['checking'],
  },
  /* 3. Off-topic */
  {
    detect: (text) =>
      /\b(recette|football|jeu vidéo|fortnite|minecraft|recipe|soccer|video game|cook|cuisine)\b/i.test(text),
    build: (locale) => ({
      text: locale === 'fr'
        ? 'Bonne question, mais je suis spécialiste de l\'espace ! Savais-tu que les astronautes de l\'ISS mangent des tortillas plutôt que du pain, pour éviter les miettes en apesanteur ? Pose-moi une question sur l\'Univers !'
        : 'Good question, but I\'m a space specialist! Did you know ISS astronauts eat tortillas instead of bread, to avoid crumbs in microgravity? Ask me something about the Universe!',
      kind: 'off-topic' as const,
      followUps: locale === 'fr'
        ? ['Que mangent les astronautes ?', 'Comment dort-on dans l\'espace ?']
        : ['What do astronauts eat?', 'How do you sleep in space?'],
    }),
    phases: ['checking'],
  },
  /* 4. Rate-limited simulation */
  {
    detect: (text) => /\b(rate.?limit|trop de questions)\b/i.test(text),
    build: (locale) => ({
      text: locale === 'fr'
        ? 'Tu as posé beaucoup de questions ! Attends quelques minutes avant de continuer.'
        : 'You\'ve asked a lot of questions! Wait a few minutes before continuing.',
      kind: 'error' as const,
    }),
    phases: ['checking'],
  },
  /* 5. Error simulation */
  {
    detect: (text) => /\b(erreur|error|crash|bug)\b/i.test(text),
    build: (locale) => ({
      text: locale === 'fr'
        ? 'Oups, quelque chose n\'a pas fonctionné. Réessaie dans un instant !'
        : 'Oops, something went wrong. Try again in a moment!',
      kind: 'error' as const,
    }),
    phases: ['checking'],
  },
  /* 6. Saturn moons → verified with 2 sources + action travel */
  {
    detect: (text) => /\b(lunes?.*saturne|saturn.*moon|combien.*lune.*saturne|how many.*moon.*saturn)\b/i.test(text),
    build: (locale, readingLevel) => {
      const claims: AssistantClaim[] = [
        {
          text: locale === 'fr'
            ? 'Saturne possède au moins 146 lunes connues.'
            : 'Saturn has at least 146 known moons.',
          status: 'verified',
          sourceIds: ['src-nasa-saturn', 'src-jpl-moons'],
        },
        {
          text: locale === 'fr'
            ? 'Titan, la plus grande, est la seule lune du système solaire avec une atmosphère dense.'
            : 'Titan, the largest, is the only moon in the solar system with a thick atmosphere.',
          status: 'verified',
          sourceIds: ['src-nasa-saturn'],
        },
      ];
      const actions: AssistantAction[] = [
        { kind: 'travel', destinationId: 'saturn', label: locale === 'fr' ? 'Voyager vers Saturne' : 'Travel to Saturn' },
      ];
      const textByLevel = {
        simple: locale === 'fr'
          ? 'Saturne a au moins 146 lunes ! La plus grosse s\'appelle Titan, et elle a même une atmosphère épaisse.'
          : 'Saturn has at least 146 moons! The biggest is called Titan, and it even has a thick atmosphere.',
        curious: locale === 'fr'
          ? 'Saturne possède au moins 146 lunes connues, ce qui en fait la planète avec le plus de satellites naturels dans le système solaire. Titan, la plus grande, est la seule lune avec une atmosphère dense. De nouvelles lunes sont régulièrement découvertes grâce aux télescopes terrestres.'
          : 'Saturn has at least 146 known moons, making it the planet with the most natural satellites in the solar system. Titan, the largest, is the only moon with a thick atmosphere. New moons are regularly discovered using ground-based telescopes.',
        expert: locale === 'fr'
          ? 'Saturne possède au moins 146 lunes confirmées par l\'Union Astronomique Internationale. Ce nombre augmente régulièrement : en 2023, 62 nouvelles lunes irrégulières ont été annoncées. Titan (5 150 km de diamètre) est la seule lune du système solaire dotée d\'une atmosphère dense (1,5 bar en surface, principalement N₂). Encelade, autre satellite majeur, projette des geysers d\'eau depuis son pôle sud, suggérant un océan sous-glaciaire.'
          : 'Saturn has at least 146 confirmed moons recognized by the International Astronomical Union. This number keeps growing: in 2023, 62 new irregular moons were announced. Titan (5,150 km diameter) is the only solar system moon with a dense atmosphere (1.5 bar at surface, mostly N₂). Enceladus, another major satellite, shoots water geysers from its south pole, suggesting a subsurface ocean.',
      };
      return {
        text: textByLevel[readingLevel],
        status: 'verified',
        claims,
        sources: [CATALOG_SOURCE_NASA, WEB_SOURCE_JPL],
        followUps: locale === 'fr'
          ? ['Pourquoi Titan a-t-elle une atmosphère ?', 'Y a-t-il de l\'eau sur Encelade ?', 'Comment découvre-t-on de nouvelles lunes ?']
          : ['Why does Titan have an atmosphere?', 'Is there water on Enceladus?', 'How do we discover new moons?'],
        actions,
        kind: 'answer' as const,
      };
    },
    phases: ['checking', 'searching-catalog', 'searching-web', 'verifying'],
  },
  /* 7. Black hole → debated + guessFirst */
  {
    detect: (text) => /\b(trou noir|black hole|qu.?y.?a.?t.?il dans|what.*inside)\b/i.test(text),
    build: (locale, readingLevel) => {
      const claims: AssistantClaim[] = [
        {
          text: locale === 'fr'
            ? 'Au centre d\'un trou noir se trouve une singularité, un point de densité infinie selon la relativité générale.'
            : 'At the center of a black hole lies a singularity, a point of infinite density according to general relativity.',
          status: 'debated',
          sourceIds: ['src-esa-bh'],
        },
        {
          text: locale === 'fr'
            ? 'Personne ne sait vraiment ce qui se passe au-delà de l\'horizon des événements.'
            : 'Nobody really knows what happens beyond the event horizon.',
          status: 'unknown',
          sourceIds: [],
        },
      ];
      const textByLevel = {
        simple: locale === 'fr'
          ? 'Personne ne sait exactement ce qu\'il y a dans un trou noir ! Les scientifiques pensent qu\'il y a un point super dense au milieu, mais on ne peut pas aller voir.'
          : 'Nobody knows exactly what\'s inside a black hole! Scientists think there\'s a super dense point in the middle, but we can\'t go check.',
        curious: locale === 'fr'
          ? 'C\'est un des plus grands mystères de l\'astrophysique ! Selon la relativité générale d\'Einstein, au centre d\'un trou noir se trouve une « singularité » — un point de densité infinie. Mais les physiciens pensent que cette théorie est incomplète à cette échelle. Au-delà de l\'horizon des événements, même la lumière ne peut pas s\'échapper, donc on ne peut pas observer directement ce qui s\'y passe.'
          : 'This is one of the biggest mysteries in astrophysics! According to Einstein\'s general relativity, at the center of a black hole lies a "singularity" — a point of infinite density. But physicists think this theory is incomplete at that scale. Beyond the event horizon, not even light can escape, so we can\'t directly observe what happens there.',
        expert: locale === 'fr'
          ? 'La relativité générale prédit une singularité gravitationnelle au centre d\'un trou noir : un point de courbure infinie de l\'espace-temps. Cependant, la plupart des physiciens considèrent cette singularité comme un signe que la relativité générale est incomplète à l\'échelle de Planck (10⁻³⁵ m). Une théorie de gravité quantique (comme la gravité quantique à boucles ou la théorie des cordes) serait nécessaire pour décrire le cœur d\'un trou noir. L\'horizon des événements (rayon de Schwarzschild = 2GM/c²) définit la frontière au-delà de laquelle aucune information ne peut s\'échapper.'
          : 'General relativity predicts a gravitational singularity at the center of a black hole: a point of infinite spacetime curvature. However, most physicists consider this singularity a sign that general relativity is incomplete at the Planck scale (10⁻³⁵ m). A quantum gravity theory (like loop quantum gravity or string theory) would be needed to describe the core of a black hole. The event horizon (Schwarzschild radius = 2GM/c²) defines the boundary beyond which no information can escape.',
      };
      return {
        text: textByLevel[readingLevel],
        status: 'debated',
        claims,
        sources: [CATALOG_SOURCE_ESA],
        followUps: locale === 'fr'
          ? ['C\'est quoi un horizon des événements ?', 'Peut-on photographier un trou noir ?']
          : ['What is an event horizon?', 'Can we photograph a black hole?'],
        guessFirst: true,
        kind: 'answer' as const,
      };
    },
    phases: ['checking', 'searching-catalog', 'searching-web', 'verifying'],
  },
  /* 8. Unknown fact */
  {
    detect: (text) => /\b(vie.*extraterrestre|alien|extraterrestrial life|are we alone)\b/i.test(text),
    build: (locale) => {
      const claims: AssistantClaim[] = [
        {
          text: locale === 'fr'
            ? 'À ce jour, aucune preuve de vie extraterrestre n\'a été confirmée.'
            : 'To this day, no evidence of extraterrestrial life has been confirmed.',
          status: 'verified',
          sourceIds: ['src-nasa-saturn'],
        },
      ];
      return {
        text: locale === 'fr'
          ? 'Personne ne le sait encore ! Malgré des décennies de recherche, aucune preuve de vie extraterrestre n\'a été trouvée. Mais l\'Univers est si vaste que beaucoup de scientifiques pensent que c\'est possible. C\'est un des plus beaux mystères à résoudre.'
          : 'Nobody knows yet! Despite decades of searching, no evidence of alien life has been found. But the Universe is so vast that many scientists think it\'s possible. It\'s one of the greatest mysteries to solve.',
        status: 'unknown',
        claims,
        sources: [CATALOG_SOURCE_NASA],
        followUps: locale === 'fr'
          ? ['C\'est quoi le programme SETI ?', 'Y a-t-il de l\'eau ailleurs que sur Terre ?']
          : ['What is the SETI program?', 'Is there water elsewhere than on Earth?'],
        guessFirst: true,
        kind: 'answer' as const,
      };
    },
    phases: ['checking', 'searching-catalog', 'searching-web', 'verifying'],
  },
];

/* ------------------------------------------------------------------ */
/*  Default response (verified, standard answer)                      */
/* ------------------------------------------------------------------ */

function buildDefaultResponse(locale: string, readingLevel: ReadingLevel): Omit<AssistantMessage, 'id' | 'createdAt' | 'role'> {
  const source: AssistantSource = {
    id: 'src-generic',
    title: locale === 'fr' ? 'Données du catalogue COSMOS KIDS' : 'COSMOS KIDS catalog data',
    publisher: 'COSMOS KIDS',
    url: 'https://nasa.gov',
    kind: 'catalog',
  };
  const claims: AssistantClaim[] = [
    {
      text: locale === 'fr'
        ? 'L\'Univers observable contient environ 200 milliards de galaxies.'
        : 'The observable Universe contains about 200 billion galaxies.',
      status: 'verified',
      sourceIds: ['src-generic'],
    },
  ];
  const textByLevel = {
    simple: locale === 'fr'
      ? 'L\'Univers est immense ! Il y a environ 200 milliards de galaxies qu\'on peut observer.'
      : 'The Universe is huge! There are about 200 billion galaxies we can observe.',
    curious: locale === 'fr'
      ? 'L\'Univers observable contient environ 200 milliards de galaxies, chacune avec des milliards d\'étoiles. Et l\'Univers continue de grandir — il s\'étend de plus en plus vite depuis le Big Bang, il y a 13,8 milliards d\'années.'
      : 'The observable Universe contains about 200 billion galaxies, each with billions of stars. And the Universe keeps growing — it has been expanding faster and faster since the Big Bang, 13.8 billion years ago.',
    expert: locale === 'fr'
      ? 'L\'Univers observable, défini par l\'horizon cosmologique à environ 46,5 milliards d\'années-lumière, contient environ 2 × 10¹¹ galaxies selon les estimations du Hubble Deep Field corrigées par Conselice et al. (2016). L\'expansion accélérée, attribuée à l\'énergie sombre (~68 % du contenu énergétique total), a été mise en évidence par les observations de supernovæ de type Ia (Perlmutter et al., 1999 ; Riess et al., 1998).'
      : 'The observable Universe, defined by the cosmological horizon at about 46.5 billion light-years, contains approximately 2 × 10¹¹ galaxies according to Hubble Deep Field estimates corrected by Conselice et al. (2016). The accelerating expansion, attributed to dark energy (~68% of total energy content), was evidenced by Type Ia supernovae observations (Perlmutter et al., 1999; Riess et al., 1998).',
  };
  return {
    text: textByLevel[readingLevel],
    status: 'verified',
    claims,
    sources: [source],
    followUps: locale === 'fr'
      ? ['C\'est quoi le Big Bang ?', 'Qu\'est-ce que l\'énergie sombre ?', 'Quelle est la taille de l\'Univers ?']
      : ['What is the Big Bang?', 'What is dark energy?', 'How big is the Universe?'],
    kind: 'answer' as const,
  };
}

/* ------------------------------------------------------------------ */
/*  Suggestions per object                                            */
/* ------------------------------------------------------------------ */

const MOCK_SUGGESTIONS: Record<string, { fr: readonly string[]; en: readonly string[] }> = {
  earth: {
    fr: ['Pourquoi la Terre tourne-t-elle ?', 'Comment s\'est formée la Lune ?', 'C\'est quoi l\'atmosphère ?'],
    en: ['Why does Earth rotate?', 'How was the Moon formed?', 'What is the atmosphere?'],
  },
  mars: {
    fr: ['Y a-t-il de l\'eau sur Mars ?', 'Pourquoi Mars est-elle rouge ?', 'Peut-on vivre sur Mars ?'],
    en: ['Is there water on Mars?', 'Why is Mars red?', 'Can we live on Mars?'],
  },
  jupiter: {
    fr: ['Qu\'est-ce que la Grande Tache Rouge ?', 'Combien de lunes a Jupiter ?', 'Jupiter est-elle une étoile ratée ?'],
    en: ['What is the Great Red Spot?', 'How many moons does Jupiter have?', 'Is Jupiter a failed star?'],
  },
  saturn: {
    fr: ['De quoi sont faits les anneaux de Saturne ?', 'Combien de lunes a Saturne ?', 'Saturne peut-elle flotter sur l\'eau ?'],
    en: ['What are Saturn\'s rings made of?', 'How many moons does Saturn have?', 'Could Saturn float on water?'],
  },
  sun: {
    fr: ['Comment le Soleil brille-t-il ?', 'Quelle est la température du Soleil ?', 'Le Soleil va-t-il s\'éteindre ?'],
    en: ['How does the Sun shine?', 'What is the Sun\'s temperature?', 'Will the Sun ever die?'],
  },
  'sgr-a': {
    fr: ['C\'est quoi Sagittarius A* ?', 'Peut-on photographier un trou noir ?', 'Qu\'y a-t-il dans un trou noir ?'],
    en: ['What is Sagittarius A*?', 'Can we photograph a black hole?', 'What\'s inside a black hole?'],
  },
  default: {
    fr: ['Qu\'est-ce qu\'un trou noir ?', 'Combien y a-t-il d\'étoiles ?', 'C\'est quoi une année-lumière ?'],
    en: ['What is a black hole?', 'How many stars are there?', 'What is a light-year?'],
  },
};

function getMockSuggestions(context: AssistantContext): readonly string[] {
  const pool = (context.selectedObjectId ? MOCK_SUGGESTIONS[context.selectedObjectId] : undefined) ?? MOCK_SUGGESTIONS['default'];
  return pool?.[context.locale] ?? pool?.fr ?? [];
}

/* ------------------------------------------------------------------ */
/*  Phase delays (realistic timing simulation)                        */
/* ------------------------------------------------------------------ */

const PHASE_DELAYS: Record<AssistantPhase, number> = {
  idle: 0,
  checking: 400,
  'searching-catalog': 600,
  'searching-web': 1200,
  verifying: 800,
  done: 0,
  error: 0,
  'rate-limited': 0,
  offline: 0,
};

/* ------------------------------------------------------------------ */
/*  Mock hook                                                          */
/* ------------------------------------------------------------------ */

export function useMockAssistant(): UseAssistant {
  const context = useMockContext();
  const [messages, setMessages] = useState<readonly AssistantMessage[]>([]);
  const [phase, setPhase] = useState<AssistantPhase>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [readingLevel, setReadingLevelState] = useState<ReadingLevel>('curious');
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(20);
  const questionCountRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  const ask = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Add child message
    const childMsg: AssistantMessage = {
      id: generateId(),
      role: 'child',
      text: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, childMsg]);

    // Find matching scenario
    const scenario = MOCK_SCENARIOS.find((s) => s.detect(trimmed, context.locale));
    const responseData = scenario
      ? scenario.build(context.locale, readingLevel)
      : buildDefaultResponse(context.locale, readingLevel);
    const phases = scenario?.phases ?? ['checking', 'searching-catalog', 'verifying'];

    // Simulate phase transitions
    for (const p of phases) {
      if (controller.signal.aborted) return;
      setPhase(p);
      await delay(PHASE_DELAYS[p]);
    }

    if (controller.signal.aborted) return;

    // Handle rate-limit scenario
    if (/\b(rate.?limit|trop de questions)\b/i.test(trimmed)) {
      setPhase('rate-limited');
    } else if (/\b(erreur|error|crash|bug)\b/i.test(trimmed)) {
      setPhase('error');
    } else {
      setPhase('done');
    }

    // Build nova message
    const novaMsg: AssistantMessage = {
      id: generateId(),
      role: 'nova',
      createdAt: Date.now(),
      ...responseData,
    };
    setMessages((prev) => [...prev, novaMsg]);

    questionCountRef.current += 1;
    setRemainingQuestions(Math.max(0, 20 - questionCountRef.current));
    busyRef.current = false;
  }, [context.locale, readingLevel]);

  const suggestions = getMockSuggestions(context);

  return {
    messages,
    phase,
    isOpen,
    suggestions,
    remainingQuestions,
    ask,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    reset: useCallback(() => {
      abortRef.current?.abort();
      busyRef.current = false;
      setMessages([]);
      setPhase('idle');
      questionCountRef.current = 0;
      setRemainingQuestions(20);
    }, []),
    setReadingLevel: useCallback((level: ReadingLevel) => setReadingLevelState(level), []),
    readingLevel: readingLevel,
  };
}
