import type { Hazard } from '../data/journeyTypes';
import type { Locale } from '../data/types';

interface HazardListProps {
  readonly hazards: readonly Hazard[];
  readonly locale: Locale;
}

const levelLabels = {
  simple: { fr: 'À retenir', en: 'Key idea' },
  curious: { fr: 'Pour les curieux', en: 'Curious minds' },
  expert: { fr: 'Niveau expert', en: 'Expert level' },
} as const;

export function HazardList({ hazards, locale }: HazardListProps) {
  if (hazards.length === 0) return null;

  return (
    <ul className="hazard-list">
      {hazards.map((hazard) => (
        <li className="hazard-list__item" key={hazard.kind}>
          <details className="hazard-card">
            <summary className="hazard-card__summary">
              <span className="hazard-card__symbol" aria-hidden="true">
                ⚠
              </span>
              <span>{hazard.label[locale]}</span>
            </summary>
            <dl className="hazard-card__levels">
              <div className="hazard-card__level hazard-card__level--simple">
                <dt>{levelLabels.simple[locale]}</dt>
                <dd>{hazard.simple[locale]}</dd>
              </div>
              <div className="hazard-card__level hazard-card__level--curious">
                <dt>{levelLabels.curious[locale]}</dt>
                <dd>{hazard.curious[locale]}</dd>
              </div>
              {hazard.expert ? (
                <div className="hazard-card__level hazard-card__level--expert">
                  <dt>{levelLabels.expert[locale]}</dt>
                  <dd>{hazard.expert[locale]}</dd>
                </div>
              ) : null}
            </dl>
            {hazard.source ? (
              <a
                className="hazard-card__source"
                href={hazard.source.url}
                rel="noreferrer"
                target="_blank"
              >
                {locale === 'fr' ? 'Source : ' : 'Source: '}{hazard.source.label}
              </a>
            ) : null}
          </details>
        </li>
      ))}
    </ul>
  );
}
