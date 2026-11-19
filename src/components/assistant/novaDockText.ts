import type { Locale } from '../../data/types';

/**
 * Strings needed before the Nova panel chunk is loaded (dock button and
 * first-meeting bubble). Kept tiny on purpose: it ships in the main bundle.
 */
export interface NovaDockCopy {
  readonly open: string;
  readonly close: string;
  readonly shortcutHint: string;
  readonly greetingTitle: string;
  readonly greeting: string;
  readonly goldenRule: string;
  readonly greetingCta: string;
  readonly greetingDismiss: string;
  readonly loading: string;
}

export const NOVA_DOCK_TEXT: Readonly<Record<Locale, NovaDockCopy>> = {
  fr: {
    open: 'Poser une question à Nova',
    close: 'Fermer Nova',
    shortcutHint: 'Raccourci : touche N',
    greetingTitle: 'Bonjour, je suis Nova !',
    greeting: 'Je suis ta copilote. Pose-moi tes questions sur l’espace.',
    goldenRule: 'Ma règle d’or : je ne te dis que ce que j’ai vérifié, et je te montre où.',
    greetingCta: 'Poser une question',
    greetingDismiss: 'Plus tard',
    loading: 'Nova se réveille…',
  },
  en: {
    open: 'Ask Nova a question',
    close: 'Close Nova',
    shortcutHint: 'Shortcut: N key',
    greetingTitle: 'Hi, I’m Nova!',
    greeting: 'I’m your co-pilot. Ask me anything about space.',
    goldenRule: 'My golden rule: I only tell you what I’ve checked, and I show you where.',
    greetingCta: 'Ask a question',
    greetingDismiss: 'Later',
    loading: 'Nova is waking up…',
  },
};
