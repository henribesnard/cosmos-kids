import { useState } from 'react';
import type { Locale, ObjectDisplay } from '../app/uiTypes';
import { Icon } from './Icon';

type ReadingLevel = 'simple' | 'curious' | 'expert';

interface InfoPanelProps {
  locale: Locale;
  object: ObjectDisplay;
  onCompare: () => void;
  onClose: () => void;
}

export function InfoPanel({ locale, object, onCompare, onClose }: InfoPanelProps) {
  const [level, setLevel] = useState<ReadingLevel>('simple');
  const fr = locale === 'fr';
  const body = level === 'simple' ? object.description[locale] : level === 'curious' ? object.curious[locale] : object.expert[locale];
  const levels: Array<[ReadingLevel, string]> = [
    ['simple', fr ? 'Simple' : 'Simple'],
    ['curious', fr ? 'Curieux' : 'Curious'],
    ['expert', fr ? 'Expert' : 'Expert'],
  ];

  return (
    <aside className="info-panel glass-panel" data-scene-obstacle aria-label={`${object.name[locale]} — ${fr ? 'informations' : 'information'}`}>
      <div className="info-panel__accent" style={{ '--object-color': object.color } as React.CSSProperties} />
      <button className="icon-button info-panel__close" type="button" onClick={onClose} aria-label={fr ? 'Fermer la fiche' : 'Close information'}>
        <Icon name="close" />
      </button>
      <p className="panel-kicker">{object.kind[locale]}</p>
      <div className="info-panel__title">
        <span className="info-panel__symbol" style={{ color: object.color }}>{object.symbol}</span>
        <div><h2>{object.name[locale]}</h2><p>{object.tagline[locale]}</p></div>
      </div>
      <div className="level-tabs" role="tablist" aria-label={fr ? 'Niveau de lecture' : 'Reading level'}>
        {levels.map(([key, label]) => (
          <button
            aria-selected={level === key}
            className={level === key ? 'is-active' : ''}
            key={key}
            onClick={() => setLevel(key)}
            role="tab"
            type="button"
          >{label}</button>
        ))}
      </div>
      <p className="info-panel__body">{body}</p>
      <dl className="fact-grid">
        {object.facts.slice(0, 4).map((fact) => (
          <div key={`${fact.label.fr}-${fact.value.fr}`}><dt>{fact.label[locale]}</dt><dd>{fact.value[locale]}</dd></div>
        ))}
      </dl>
      <div className="info-panel__actions">
        <button className="button button--secondary" type="button" onClick={onCompare}><Icon name="compare" /> {fr ? 'Comparer' : 'Compare'}</button>
        {object.sourceUrl && (
          <a className="source-link" href={object.sourceUrl} target="_blank" rel="noreferrer">
            <Icon name="info" size={15} /> {fr ? 'Source scientifique' : 'Scientific source'}
          </a>
        )}
      </div>
    </aside>
  );
}
