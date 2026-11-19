import type { Locale } from '../../data/types';
import '../../styles/assistant.css';
import { NovaAvatar } from './NovaAvatar';

interface Section {
  readonly title: string;
  readonly body: readonly string[];
  readonly list?: readonly string[];
}

interface ParentsCopy {
  readonly kicker: string;
  readonly title: string;
  readonly lede: string;
  readonly close: string;
  readonly sections: readonly Section[];
  readonly footer: string;
}

/** Allowed web domains — mirrors the server whitelist (server/nova/allowedDomains.ts). */
const ALLOWED_SOURCES: readonly string[] = [
  'NASA (nasa.gov, science.nasa.gov, jpl.nasa.gov, ssd.jpl.nasa.gov)',
  'ESA (esa.int)',
  'ESO (eso.org)',
  'CNES (cnes.fr)',
  'IAU / UAI (iau.org)',
  'Observatoire de Paris (obspm.fr)',
  'STScI (stsci.edu, spacetelescope.org)',
  'NOIRLab (noirlab.edu)',
  'Center for Astrophysics | Harvard & Smithsonian (cfa.harvard.edu)',
];

const PARENTS_TEXT: Readonly<Record<Locale, ParentsCopy>> = {
  fr: {
    kicker: 'Pour les parents et les enseignant·es',
    title: 'Nova, la copilote de COSMOS KIDS',
    lede: 'Nova répond aux questions d’astronomie des 7–14 ans. Sa règle d’or : ne dire que ce qu’elle a vérifié, et montrer où.',
    close: 'Retour à l’exploration',
    sections: [
      {
        title: 'Qu’est-ce que Nova ?',
        body: [
          'Nova est un assistant fondé sur un modèle d’intelligence artificielle (fournisseur : Mistral AI). Elle ne parle que d’astronomie, d’astrophysique et d’exploration spatiale, avec trois niveaux de réponse : Simple, Curieux, Expert.',
          'Chaque réponse porte un sceau : Vérifié (sources concordantes), Débattu (les scientifiques ne sont pas d’accord) ou Mystère (personne ne sait encore). Un clic sur le sceau montre les sources.',
        ],
      },
      {
        title: 'D’où viennent ses réponses ?',
        body: [
          'D’abord du « Carnet de bord » : les données scientifiques déjà présentes dans COSMOS KIDS, chacune attribuée à sa source d’origine (NASA, ESA, JPL…).',
          'Si besoin, d’une recherche web limitée à une liste fermée d’organismes scientifiques. Toute source extérieure à cette liste est écartée :',
        ],
        list: ALLOWED_SOURCES,
      },
      {
        title: 'La double vérification',
        body: [
          'Une première passe rédige la réponse en affirmations précises, chacune reliée à ses sources. Une seconde passe, indépendante, vérifie chaque affirmation : celles qui ne sont pas soutenues par les sources sont retirées avant l’affichage.',
          'Si rien ne peut être vérifié, Nova le dit honnêtement plutôt que d’inventer.',
        ],
      },
      {
        title: 'Ce qui est envoyé au fournisseur d’IA',
        body: [
          'La question, la langue, le niveau de réponse choisi, la page consultée (par exemple « Saturne ») et les 6 derniers messages de la conversation, pour garder le fil.',
          'Jamais : le nom de l’enfant, son adresse IP, un identifiant de compte (il n’y en a pas). Les questions contenant des informations personnelles (nom, adresse, école, téléphone, e-mail) sont bloquées avant tout envoi.',
          'Mistral AI traite ces requêtes selon sa propre politique de confidentialité, que vous pouvez consulter sur son site.',
        ],
      },
      {
        title: 'Aucun stockage des conversations',
        body: [
          'La conversation vit uniquement dans l’onglet du navigateur : elle disparaît quand on recharge ou ferme la page. Elle n’est ni enregistrée ni utilisée pour entraîner un modèle par COSMOS KIDS.',
          'Pour aller plus vite, le serveur garde en mémoire vive, 10 minutes au plus, les réponses déjà vérifiées à une même question, sans aucun lien avec la personne qui l’a posée. Les « mystères » que votre enfant choisit de garder sont stockés uniquement dans ce navigateur.',
        ],
      },
      {
        title: 'Une limite de questions',
        body: [
          'Pour éviter les abus et maîtriser les coûts, chaque connexion peut poser un nombre limité de questions par heure (20 par défaut). Le compteur restant est affiché sous la zone de saisie. Ce comptage est fait en mémoire sur le serveur et s’efface au bout d’une heure.',
        ],
      },
      {
        title: 'Les limites de l’outil',
        body: [
          'Une IA peut se tromper, même après vérification : les sources sont là pour que vous puissiez contrôler. Une réponse peut prendre de quelques secondes à une minute.',
          'Nova n’est pas un adulte de confiance. Si un enfant exprime de la détresse, elle l’invite avec douceur à en parler à un adulte, et ne poursuit pas le sujet. Accompagner l’enfant dans sa découverte reste précieux.',
        ],
      },
    ],
    footer: 'Le plus beau voyage dans l’espace reste celui qu’on fait ensemble.',
  },
  en: {
    kicker: 'For parents and teachers',
    title: 'Nova, the COSMOS KIDS co-pilot',
    lede: 'Nova answers astronomy questions from 7–14 year olds. Her golden rule: only say what she has checked, and show where.',
    close: 'Back to exploring',
    sections: [
      {
        title: 'What is Nova?',
        body: [
          'Nova is an assistant built on an artificial intelligence model (provider: Mistral AI). She only talks about astronomy, astrophysics and space exploration, with three answer levels: Simple, Curious, Expert.',
          'Every answer carries a seal: Verified (sources agree), Debated (scientists disagree) or Mystery (nobody knows yet). Clicking the seal shows the sources.',
        ],
      },
      {
        title: 'Where do her answers come from?',
        body: [
          'First from the “logbook”: scientific data already in COSMOS KIDS, each piece attributed to its original source (NASA, ESA, JPL…).',
          'If needed, from a web search restricted to a closed list of scientific organisations. Any source outside this list is discarded:',
        ],
        list: ALLOWED_SOURCES,
      },
      {
        title: 'Double verification',
        body: [
          'A first pass drafts the answer as precise claims, each linked to its sources. A second, independent pass checks every claim: unsupported claims are removed before anything is shown.',
          'If nothing can be verified, Nova honestly says so instead of making something up.',
        ],
      },
      {
        title: 'What is sent to the AI provider',
        body: [
          'The question, the language, the chosen answer level, the page being viewed (for example “Saturn”) and the last 6 messages of the conversation, to keep the thread.',
          'Never: the child’s name, their IP address, an account identifier (there is none). Questions containing personal information (name, address, school, phone, email) are blocked before anything is sent.',
          'Mistral AI processes these requests under its own privacy policy, available on its website.',
        ],
      },
      {
        title: 'Conversations are not stored',
        body: [
          'The conversation only lives in the browser tab: it disappears when the page is reloaded or closed. COSMOS KIDS neither records it nor uses it to train a model.',
          'To be faster, the server keeps already-verified answers to an identical question in memory for 10 minutes at most, with no link to who asked. The “mysteries” your child chooses to keep are stored only in this browser.',
        ],
      },
      {
        title: 'A question limit',
        body: [
          'To prevent abuse and control costs, each connection can ask a limited number of questions per hour (20 by default). The remaining count is shown under the input. This count is kept in server memory and expires after an hour.',
        ],
      },
      {
        title: 'The tool’s limits',
        body: [
          'An AI can be wrong, even after verification: the sources are there so you can check. An answer can take from a few seconds to a minute.',
          'Nova is not a trusted adult. If a child expresses distress, she gently encourages them to talk to an adult and does not pursue the topic. Exploring together with your child remains precious.',
        ],
      },
    ],
    footer: 'The best journey through space is still the one you take together.',
  },
};

interface ParentsPageProps {
  readonly locale: Locale;
  readonly onClose: () => void;
}

/** /parents — plain-language explanation of Nova for adults. */
export default function ParentsPage({ locale, onClose }: ParentsPageProps) {
  const t = PARENTS_TEXT[locale];
  return (
    <section className="nova-parents glass-panel" data-scene-obstacle aria-labelledby="nova-parents-title">
      <header className="nova-parents__header">
        <NovaAvatar mood="happy" size={64} />
        <div>
          <p className="panel-kicker">{t.kicker}</p>
          <h1 id="nova-parents-title">{t.title}</h1>
          <p className="nova-parents__lede">{t.lede}</p>
        </div>
        <button type="button" className="icon-button nova-icon-btn" onClick={onClose} aria-label={t.close} title={t.close}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </header>
      <div className="nova-parents__grid">
        {t.sections.map((section) => (
          <article key={section.title} className="nova-parents__card">
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.list && (
              <ul>
                {section.list.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </article>
        ))}
      </div>
      <footer className="nova-parents__footer">
        <p>{t.footer}</p>
        <button type="button" className="button button--secondary" onClick={onClose}>{t.close}</button>
      </footer>
    </section>
  );
}
