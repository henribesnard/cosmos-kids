import { useState } from 'react';
import type { Locale, ObjectDisplay } from '../app/uiTypes';
import { Icon } from './Icon';

interface CompareDialogProps {
  locale: Locale;
  primary: ObjectDisplay;
  objects: ObjectDisplay[];
  initialSecondaryId?: string;
  onClose: () => void;
  onTravel: (id: string) => void;
}

export function CompareDialog({ locale, primary, objects, initialSecondaryId = 'jupiter', onClose, onTravel }: CompareDialogProps) {
  const candidates = objects.filter((object) => object.id !== primary.id && object.id !== 'sun');
  const [secondaryId, setSecondaryId] = useState(candidates.some((item) => item.id === initialSecondaryId) ? initialSecondaryId : candidates[0]?.id ?? primary.id);
  const secondary = objects.find((object) => object.id === secondaryId) ?? primary;
  const fr = locale === 'fr';

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="compare-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <header>
          <div><p className="panel-kicker"><Icon name="compare" size={15} /> {fr ? 'LABORATOIRE' : 'LAB'}</p><h2 id="compare-title">{fr ? 'Comparer deux mondes' : 'Compare two worlds'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={fr ? 'Fermer' : 'Close'}><Icon name="close" /></button>
        </header>
        <div className="compare-worlds">
          <WorldPortrait object={primary} locale={locale} />
          <div className="compare-worlds__versus">VS</div>
          <div className="compare-worlds__chooser">
            <WorldPortrait object={secondary} locale={locale} />
            <label>
              <span className="sr-only">{fr ? 'Second monde' : 'Second world'}</span>
              <select value={secondary.id} onChange={(event) => setSecondaryId(event.target.value)}>
                {candidates.map((object) => <option key={object.id} value={object.id}>{object.name[locale]}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="compare-table" role="table" aria-label={fr ? 'Comparaison des caractéristiques' : 'Fact comparison'}>
          {Array.from({ length: Math.max(primary.facts.length, secondary.facts.length) }).slice(0, 4).map((_, index) => {
            const left = primary.facts[index];
            const right = secondary.facts[index];
            if (!left && !right) return null;
            return (
              <div className="compare-row" role="row" key={index}>
                <span>{left?.value[locale] ?? '—'}</span>
                <b>{left?.label[locale] ?? right?.label[locale]}</b>
                <span>{right?.value[locale] ?? '—'}</span>
              </div>
            );
          })}
        </div>
        <footer>
          <p><Icon name="info" size={15} /> {fr ? 'Les valeurs affichées sont arrondies pour faciliter la lecture.' : 'Displayed values are rounded for easier reading.'}</p>
          <button className="button button--primary" type="button" onClick={() => onTravel(secondary.id)}>{fr ? `Visiter ${secondary.name.fr}` : `Visit ${secondary.name.en}`} <Icon name="arrow" /></button>
        </footer>
      </section>
    </div>
  );
}

function WorldPortrait({ object, locale }: { object: ObjectDisplay; locale: Locale }) {
  return (
    <div className="world-portrait">
      <span style={{ '--planet-color': object.color } as React.CSSProperties}>{object.symbol}</span>
      <div><b>{object.name[locale]}</b><small>{object.kind[locale]}</small></div>
    </div>
  );
}

