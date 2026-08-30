import type { Locale } from '../app/uiTypes';
import { Icon } from './Icon';

const destinations = [
  { id: 'earth', fr: 'Terre', en: 'Earth' },
  { id: 'solar', fr: 'Système solaire', en: 'Solar System' },
  { id: 'milkyway', fr: 'Voie lactée', en: 'Milky Way' },
  { id: 'localgroup', fr: 'Groupe local', en: 'Local Group' },
] as const;

interface ScaleNavigatorProps {
  locale: Locale;
  activeId: string;
  onTravel: (id: string) => void;
}

export function ScaleNavigator({ locale, activeId, onTravel }: ScaleNavigatorProps) {
  return (
    <nav className="scale-nav glass-panel" aria-label={locale === 'fr' ? 'Se déplacer dans l\u2019Univers' : 'Travel through the Universe'}>
      <span className="scale-nav__direction"><Icon name="orbit" size={16} />{locale === 'fr' ? 'Du proche au lointain' : 'Near to far'}</span>
      <div className="scale-nav__track" aria-hidden="true"><span /></div>
      {destinations.map((destination) => {
        const isActive = destination.id === activeId || (destination.id === 'solar' && activeId === 'sun');
        return (
          <button
            aria-current={isActive ? 'location' : undefined}
            className={isActive ? 'is-active' : ''}
            key={destination.id}
            onClick={() => onTravel(destination.id)}
            type="button"
          >
            <i aria-hidden="true" />
            <span>{destination[locale]}</span>
          </button>
        );
      })}
    </nav>
  );
}
