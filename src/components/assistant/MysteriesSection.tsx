import type { Locale } from '../../data/types';
import { useCosmosStore } from '../../store/useCosmosStore';
import '../../styles/assistant.css';
import { NovaAvatar } from './NovaAvatar';

const MYSTERIES_TEXT = {
  fr: {
    tab: 'Mystères de l’Univers',
    intro: 'Les questions auxquelles personne ne sait encore répondre. Garde-les précieusement : un jour, peut-être que c’est toi qui trouveras !',
    empty: 'Aucun mystère pour l’instant. Quand Nova te répond « Mystère », tu peux le garder ici.',
    remove: (question: string) => `Retirer le mystère « ${question} »`,
    removeShort: 'Retirer',
    savedOn: 'Gardé le',
  },
  en: {
    tab: 'Mysteries of the Universe',
    intro: 'Questions nobody can answer yet. Keep them safe: one day, maybe you’ll be the one to find out!',
    empty: 'No mysteries yet. When Nova answers “Mystery”, you can keep it here.',
    remove: (question: string) => `Remove the mystery “${question}”`,
    removeShort: 'Remove',
    savedOn: 'Kept on',
  },
} as const;

function formatDate(value: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium' }).format(new Date(value));
}

/** The "Mysteries of the Universe" list shown in the Carnet (/carnet). */
export function MysteriesSection({ locale }: { locale: Locale }) {
  const t = MYSTERIES_TEXT[locale];
  const mysteries = useCosmosStore((state) => state.mysteries);
  const removeMystery = useCosmosStore((state) => state.removeMystery);
  const sorted = [...mysteries].sort((a, b) => b.savedAt - a.savedAt);

  return (
    <div className="nova-mysteries">
      <p className="nova-mysteries__intro">{t.intro}</p>
      {sorted.length === 0 ? (
        <div className="discovery-log__empty nova-mysteries__empty">
          <NovaAvatar mood="mystery" size={56} />
          <p>{t.empty}</p>
        </div>
      ) : (
        <ul className="nova-mysteries__list">
          {sorted.map((mystery) => (
            <li key={mystery.id} className="nova-mysteries__item">
              <span className="nova-mysteries__glyph" aria-hidden="true">?</span>
              <div>
                <b lang={mystery.locale}>{mystery.question}</b>
                <time dateTime={new Date(mystery.savedAt).toISOString()}>
                  {t.savedOn} {formatDate(mystery.savedAt, locale)}
                </time>
              </div>
              <button type="button" className="nova-mysteries__remove" onClick={() => removeMystery(mystery.id)} aria-label={t.remove(mystery.question)}>
                {t.removeShort}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
