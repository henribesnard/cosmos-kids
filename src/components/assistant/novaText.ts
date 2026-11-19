import type { ClaimStatus, ReadingLevel } from '../../assistant/types';
import type { Locale } from '../../data/types';

/** "42 s", "12 min 05 s", "1 h 02 min" — same shape in FR and EN. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s}\u00a0s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return `${m}\u00a0min\u00a0${String(s % 60).padStart(2, '0')}\u00a0s`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}\u00a0h\u00a0${String(m).padStart(2, '0')}\u00a0min`;
}


/** Phases that make up the visible "verification journey". */
export type JourneyPhase = 'checking' | 'searching-catalog' | 'searching-web' | 'verifying';
export const JOURNEY_PHASES: readonly JourneyPhase[] = ['checking', 'searching-catalog', 'searching-web', 'verifying'];

/** Special (non-answer) situations, each with its own Nova mood and tone. */
export type SpecialCase = 'off-topic' | 'privacy' | 'safety' | 'rate-limited' | 'error' | 'offline';

export interface NovaCopy {
  readonly title: string;
  readonly subtitle: string;
  readonly close: string;
  readonly newChat: string;
  readonly parentsLink: string;
  readonly readingLevel: string;
  readonly levels: Readonly<Record<ReadingLevel, string>>;
  readonly conversationLabel: string;
  readonly you: string;
  readonly nova: string;
  readonly inputLabel: string;
  readonly placeholders: readonly string[];
  readonly send: string;
  readonly sending: string;
  readonly remaining: (n: number) => string;
  readonly remainingNone: string;
  readonly suggestionsLabel: string;
  readonly followUpsLabel: string;
  readonly emptyIntro: string;
  readonly goldenRule: string;
  readonly journey: Readonly<Record<JourneyPhase, string>>;
  readonly journeyShort: Readonly<Record<JourneyPhase, string>>;
  readonly journeyLabel: string;
  readonly journeyStillWorking: string;
  readonly didYouKnow: string;
  readonly catchStars: string;
  readonly catchStar: string;
  readonly starsCaught: (n: number) => string;
  readonly seal: Readonly<Record<ClaimStatus, string>>;
  readonly sealExplain: Readonly<Record<ClaimStatus, string>>;
  readonly showSources: string;
  readonly hideSources: string;
  readonly sourcesTitle: string;
  readonly claimsTitle: string;
  readonly noSources: string;
  readonly catalogName: string;
  readonly catalogFrom: (publisher: string) => string;
  readonly openSource: string;
  readonly newTab: string;
  readonly takeMe: string;
  readonly listen: string;
  readonly stopListening: string;
  readonly keepMystery: string;
  readonly mysteryKept: string;
  readonly guessTitle: string;
  readonly guessIntro: string;
  readonly guessLabel: string;
  readonly guessPlaceholder: string;
  readonly guessSubmit: string;
  readonly guessSkip: string;
  readonly guessYours: (guess: string) => string;
  readonly guessCompare: string;
  readonly quote: (text: string) => string;
  readonly special: Readonly<Record<SpecialCase, { readonly tag: string; readonly fallback: string }>>;
  readonly offTopicBounce: string;
  readonly privacyTips: readonly string[];
  readonly safetyAdults: string;
  readonly retry: string;
  readonly offlineBanner: string;
  readonly rechargeCountdown: (s: number) => string;
  readonly rechargeDone: string;
  readonly expand: Readonly<{ compact: string; wide: string; full: string; sheetExpand: string; sheetCollapse: string }>;
  readonly guessChooseLabel: string;
  readonly guessOrChoose: string;
  readonly guessChoicesHint: string;
  readonly privacyNoteLabel: string;
  readonly newMessage: string;
  readonly askedAbout: string;
}

const fr: NovaCopy = {
  title: 'Nova',
  subtitle: 'Ta copilote de l’espace',
  close: 'Fermer Nova',
  newChat: 'Nouvelle conversation',
  parentsLink: 'Pour les parents',
  readingLevel: 'Niveau de réponse',
  levels: { simple: 'Simple', curious: 'Curieux', expert: 'Expert' },
  conversationLabel: 'Conversation avec Nova',
  you: 'Toi',
  nova: 'Nova',
  inputLabel: 'Ta question pour Nova',
  placeholders: [
    'Qu’est-ce qui t’intrigue là-haut\u00a0?',
    'Pose ta question sur l’Univers…',
    'Une planète\u00a0? Un trou noir\u00a0?',
  ],
  send: 'Envoyer',
  sending: 'Nova cherche…',
  remaining: (n) => (n === 1 ? 'Encore 1 question en réserve' : `Encore ${n} questions en réserve`),
  remainingNone: 'Réserve de questions vide pour l’instant',
  suggestionsLabel: 'Idées de questions',
  followUpsLabel: 'Pour aller plus loin',
  emptyIntro: 'Pose-moi une question sur l’espace, ou choisis une idée ci-dessous.',
  goldenRule: 'Je ne te dis que ce que j’ai vérifié, et je te montre où.',
  journey: {
    checking: 'Je lis bien ta question…',
    'searching-catalog': 'Je regarde dans mon carnet de bord…',
    'searching-web': 'Je consulte les agences spatiales…',
    verifying: 'Je vérifie deux fois…',
  },
  journeyShort: {
    checking: 'Question',
    'searching-catalog': 'Carnet',
    'searching-web': 'Agences',
    verifying: 'Vérif.',
  },
  journeyLabel: 'Le voyage de la vérification',
  journeyStillWorking: 'Je prends mon temps pour bien vérifier. Encore un instant\u00a0!',
  didYouKnow: 'Le savais-tu\u00a0?',
  catchStars: 'En attendant, attrape les étoiles filantes\u00a0!',
  catchStar: 'Attraper l’étoile filante',
  starsCaught: (n) => (n === 0 ? 'Aucune étoile' : n === 1 ? '1 étoile' : `${n} étoiles`),
  seal: { verified: 'Vérifié', debated: 'Débattu', unknown: 'Mystère' },
  sealExplain: {
    verified: 'J’ai trouvé cette réponse dans des sources sûres, et je l’ai vérifiée deux fois.',
    debated: 'Les scientifiques ne sont pas encore d’accord\u00a0: c’est normal, la science avance comme ça.',
    unknown: 'Personne ne connaît encore la réponse. Peut-être que c’est toi qui la trouveras\u00a0!',
  },
  showSources: 'Voir mes sources',
  hideSources: 'Cacher les sources',
  sourcesTitle: 'Où je l’ai vérifié',
  claimsTitle: 'Ce que j’ai vérifié',
  noSources: 'Aucune source ne connaît encore la réponse.',
  catalogName: 'Carnet de bord COSMOS KIDS',
  catalogFrom: (publisher) => `d’après ${publisher}`,
  openSource: 'Ouvrir la source',
  newTab: '(nouvel onglet)',
  takeMe: 'Emmène-moi voir',
  listen: 'Écouter',
  stopListening: 'Arrêter',
  keepMystery: 'Garder ce mystère',
  mysteryKept: 'Rangé dans ton Carnet',
  guessTitle: 'Devine d’abord\u00a0!',
  guessIntro: 'Avant que je te réponde, qu’est-ce que tu en penses\u00a0?',
  guessLabel: 'Ton hypothèse',
  guessPlaceholder: 'Je pense que…',
  guessSubmit: 'Voir la réponse',
  guessSkip: 'Je n’ai pas d’idée, montre-moi',
  guessYours: (guess) => `Ton hypothèse\u00a0: «\u00a0${guess}\u00a0»`,
  quote: (text) => `«\u00a0${text}\u00a0»`,
  guessCompare: 'Compare avec ce que disent les scientifiques\u00a0:',
  special: {
    'off-topic': { tag: 'Hors de ma galaxie', fallback: 'Ça, c’est hors de ma galaxie\u00a0! Moi, je connais l’espace.' },
    privacy: { tag: 'Ta vie privée compte', fallback: 'Garde tes informations personnelles pour toi.' },
    safety: { tag: 'Parle à un adulte de confiance', fallback: 'Ce que tu ressens est important. Parles-en à un adulte de confiance.' },
    'rate-limited': { tag: 'Nova recharge ses panneaux solaires', fallback: 'J’ai besoin de recharger mes panneaux solaires. Reviens dans un petit moment\u00a0!' },
    error: { tag: 'Petit souci de transmission', fallback: 'Oups, mon message s’est perdu dans l’espace. Réessaie\u00a0!' },
    offline: { tag: 'Pas de signal', fallback: 'Je ne capte plus la Terre\u00a0: ta connexion Internet semble coupée.' },
  },
  offTopicBounce: 'Une idée de question spatiale\u00a0:',
  privacyTips: ['ton nom', 'ton école', 'ton adresse'],
  safetyAdults: 'Un parent, un·e enseignant·e ou un adulte que tu connais bien peut t’écouter.',
  retry: 'Réessayer',
  offlineBanner: 'Pas de connexion\u00a0: je t’attends ici dès que le signal revient.',
  rechargeCountdown: (s) => `Nova recharge ses panneaux solaires… encore ${formatDuration(s)}`,
  rechargeDone: 'Panneaux solaires rechargés\u00a0: tu peux reposer une question\u00a0!',
  expand: {
    compact: 'Agrandir Nova',
    wide: 'Passer Nova en plein écran',
    full: 'Réduire Nova',
    sheetExpand: 'Agrandir Nova en plein écran',
    sheetCollapse: 'Réduire Nova',
  },
  guessChooseLabel: 'Choisis ton hypothèse',
  guessOrChoose: 'Ou choisis une idée\u00a0:',
  guessChoicesHint: 'Ce sont des idées, pas encore des réponses. La réponse vérifiée vient juste après.',
  privacyNoteLabel: 'Rappel de sécurité',
  newMessage: 'Nova a répondu',
  askedAbout: 'Ta question',
};

const en: NovaCopy = {
  title: 'Nova',
  subtitle: 'Your space co-pilot',
  close: 'Close Nova',
  newChat: 'New conversation',
  parentsLink: 'For parents',
  readingLevel: 'Answer level',
  levels: { simple: 'Simple', curious: 'Curious', expert: 'Expert' },
  conversationLabel: 'Conversation with Nova',
  you: 'You',
  nova: 'Nova',
  inputLabel: 'Your question for Nova',
  placeholders: [
    'What makes you curious up there?',
    'Ask your question about the Universe…',
    'A planet? A black hole?',
  ],
  send: 'Send',
  sending: 'Nova is searching…',
  remaining: (n) => (n === 1 ? '1 question left in the tank' : `${n} questions left in the tank`),
  remainingNone: 'Question tank empty for now',
  suggestionsLabel: 'Question ideas',
  followUpsLabel: 'Go further',
  emptyIntro: 'Ask me a question about space, or pick an idea below.',
  goldenRule: 'I only tell you what I’ve checked, and I show you where.',
  journey: {
    checking: 'Reading your question carefully…',
    'searching-catalog': 'Looking in my logbook…',
    'searching-web': 'Asking the space agencies…',
    verifying: 'Double-checking…',
  },
  journeyShort: {
    checking: 'Question',
    'searching-catalog': 'Logbook',
    'searching-web': 'Agencies',
    verifying: 'Check',
  },
  journeyLabel: 'The verification journey',
  journeyStillWorking: 'I’m taking my time to check properly. Almost there!',
  didYouKnow: 'Did you know?',
  catchStars: 'While you wait, catch the shooting stars!',
  catchStar: 'Catch the shooting star',
  starsCaught: (n) => (n === 0 ? 'No stars yet' : n === 1 ? '1 star' : `${n} stars`),
  seal: { verified: 'Verified', debated: 'Debated', unknown: 'Mystery' },
  sealExplain: {
    verified: 'I found this answer in trusted sources, and I checked it twice.',
    debated: 'Scientists don’t agree yet: that’s normal, it’s how science moves forward.',
    unknown: 'Nobody knows the answer yet. Maybe you’ll be the one to find it!',
  },
  showSources: 'See my sources',
  hideSources: 'Hide sources',
  sourcesTitle: 'Where I checked it',
  claimsTitle: 'What I checked',
  noSources: 'No source knows the answer yet.',
  catalogName: 'COSMOS KIDS logbook',
  catalogFrom: (publisher) => `based on ${publisher}`,
  openSource: 'Open source',
  newTab: '(new tab)',
  takeMe: 'Take me there',
  listen: 'Listen',
  stopListening: 'Stop',
  keepMystery: 'Keep this mystery',
  mysteryKept: 'Saved in your Logbook',
  guessTitle: 'Guess first!',
  guessIntro: 'Before I answer, what do you think?',
  guessLabel: 'Your guess',
  guessPlaceholder: 'I think that…',
  guessSubmit: 'See the answer',
  guessSkip: 'No idea, show me',
  guessYours: (guess) => `Your guess: “${guess}”`,
  quote: (text) => `“${text}”`,
  guessCompare: 'Compare with what scientists say:',
  special: {
    'off-topic': { tag: 'Outside my galaxy', fallback: 'That’s outside my galaxy! I know about space.' },
    privacy: { tag: 'Your privacy matters', fallback: 'Keep your personal information to yourself.' },
    safety: { tag: 'Talk to a trusted adult', fallback: 'What you feel matters. Talk to a trusted adult about it.' },
    'rate-limited': { tag: 'Nova is recharging her solar panels', fallback: 'I need to recharge my solar panels. Come back in a little while!' },
    error: { tag: 'Transmission hiccup', fallback: 'Oops, my message got lost in space. Try again!' },
    offline: { tag: 'No signal', fallback: 'I can’t reach Earth: your Internet connection seems to be off.' },
  },
  offTopicBounce: 'A space question idea:',
  privacyTips: ['your name', 'your school', 'your address'],
  safetyAdults: 'A parent, a teacher or a grown-up you know well can listen to you.',
  retry: 'Try again',
  offlineBanner: 'No connection: I’ll wait right here until the signal comes back.',
  rechargeCountdown: (s) => `Nova is recharging her solar panels… ${formatDuration(s)} left`,
  rechargeDone: 'Solar panels recharged: you can ask again!',
  expand: {
    compact: 'Enlarge Nova',
    wide: 'Make Nova full screen',
    full: 'Shrink Nova',
    sheetExpand: 'Expand Nova to full screen',
    sheetCollapse: 'Shrink Nova',
  },
  guessChooseLabel: 'Pick your guess',
  guessOrChoose: 'Or pick an idea:',
  guessChoicesHint: 'These are ideas, not answers yet. The checked answer comes right after.',
  privacyNoteLabel: 'Safety reminder',
  newMessage: 'Nova answered',
  askedAbout: 'Your question',
};

export const NOVA_TEXT: Readonly<Record<Locale, NovaCopy>> = { fr, en };
