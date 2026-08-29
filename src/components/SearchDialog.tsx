import { useEffect, useMemo, useRef, useState } from 'react';
import type { Locale, ObjectDisplay } from '../app/uiTypes';
import { Icon } from './Icon';

interface SearchDialogProps {
  locale: Locale;
  objects: ObjectDisplay[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function SearchDialog({ locale, objects, onClose, onSelect }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fr = locale === 'fr';
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return objects.filter((object) => !normalized || `${object.name[locale]} ${object.kind[locale]}`.toLocaleLowerCase(locale).includes(normalized));
  }, [locale, objects, query]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="search-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <div className="search-dialog__bar">
          <Icon name="search" />
          <input
            aria-label={fr ? 'Rechercher un monde' : 'Search for a world'}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={fr ? 'Une planète, la Lune, le Soleil…' : 'A planet, the Moon, the Sun…'}
            ref={inputRef}
            value={query}
          />
          <button className="icon-button" type="button" onClick={onClose} aria-label={fr ? 'Fermer' : 'Close'}><Icon name="close" /></button>
        </div>
        <div className="search-dialog__heading">
          <h2 id="search-title">{query ? (fr ? 'Résultats' : 'Results') : (fr ? 'Destinations' : 'Destinations')}</h2>
          <span>{results.length}</span>
        </div>
        <ul className="search-results">
          {results.map((object) => (
            <li key={object.id}>
              <button type="button" onClick={() => onSelect(object.id)}>
                <span className="search-results__planet" style={{ '--planet-color': object.color } as React.CSSProperties}>{object.symbol}</span>
                <span><b>{object.name[locale]}</b><small>{object.kind[locale]} · {object.tagline[locale]}</small></span>
                <Icon name="arrow" />
              </button>
            </li>
          ))}
        </ul>
        {!results.length && <p className="empty-state">{fr ? 'Aucun monde trouvé. Essaie « Mars ».' : 'No world found. Try “Mars”.'}</p>}
        <footer><kbd>Esc</kbd> {fr ? 'fermer' : 'close'} <span>·</span> <kbd>↵</kbd> {fr ? 'visiter' : 'visit'}</footer>
      </section>
    </div>
  );
}

