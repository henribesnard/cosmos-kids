import { useEffect, useRef, useState } from 'react';
import { Brand } from './Brand';
import { Icon } from './Icon';
import type { Locale, ObjectDisplay } from '../app/uiTypes';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? '');

interface HeaderProps {
  locale: Locale;
  missionProgress: number;
  isLanding: boolean;
  destinations: ObjectDisplay[];
  onHome: () => void;
  onExplore: () => void;
  onSearch: () => void;
  onMission: () => void;
  onLog: () => void;
  onLocale: (locale: Locale) => void;
  onTravel: (id: ObjectDisplay['id']) => void;
}

export function Header({
  locale,
  missionProgress,
  isLanding,
  destinations,
  onHome,
  onExplore,
  onSearch,
  onMission,
  onLog,
  onLocale,
  onTravel,
}: HeaderProps) {
  const [destOpen, setDestOpen] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);
  const copy = locale === 'fr'
    ? { explore: 'Explorer', mission: 'Trajets', log: 'Carnet', search: 'Rechercher', progress: 'Progression', destinations: 'Destinations' }
    : { explore: 'Explore', mission: 'Journeys', log: 'Logbook', search: 'Search', progress: 'Progress', destinations: 'Destinations' };

  useEffect(() => {
    if (!destOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(event.target as Node)) setDestOpen(false);
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [destOpen]);

  return (
    <header className={`topbar ${isLanding ? 'topbar--landing' : ''}`} data-scene-obstacle>
      <button className="brand-button" type="button" onClick={onHome} aria-label="Accueil COSMOS KIDS">
        <Brand />
      </button>
      {!isLanding && (
        <nav className="main-nav" aria-label={copy.explore}>
          <button className="main-nav__item main-nav__item--active" type="button" onClick={onExplore}>
            {copy.explore}
          </button>
          <div className="main-nav__dropdown" ref={destRef}>
            <button className={`main-nav__item ${destOpen ? 'main-nav__item--active' : ''}`} type="button" onClick={() => setDestOpen(!destOpen)} aria-expanded={destOpen}>
              {copy.destinations}
            </button>
            {destOpen && (
              <div className="dest-dropdown glass-panel">
                {destinations.map((object) => (
                  <button key={object.id} type="button" className="dest-dropdown__item" onClick={() => { setDestOpen(false); onTravel(object.id); }}>
                    <span className="dest-dropdown__symbol" style={{ color: object.color }}>{object.symbol}</span>
                    <span className="dest-dropdown__name">{object.name[locale]}</span>
                    <span className="dest-dropdown__kind">{object.kind[locale]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="main-nav__item" type="button" onClick={onMission}>
            {copy.mission}
          </button>
          <button className="main-nav__item" type="button" onClick={onLog}>
            {copy.log}
          </button>
        </nav>
      )}
      <div className="topbar__tools">
        {!isLanding && (
          <div className="mobile-route-nav">
            <button type="button" onClick={onMission} aria-label={copy.mission}><Icon name="mission" size={17} /></button>
            <button type="button" onClick={onLog} aria-label={copy.log}><Icon name="calendar" size={17} /></button>
          </div>
        )}
        {!isLanding && (
          <button className="search-trigger" type="button" onClick={onSearch}>
            <Icon name="search" size={17} />
            <span>{copy.search}</span>
            <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
        )}
        <div className="locale-toggle" aria-label="Langue">
          {(['fr', 'en'] as const).map((option) => (
            <button
              aria-pressed={locale === option}
              className={locale === option ? 'is-active' : ''}
              key={option}
              onClick={() => onLocale(option)}
              type="button"
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
        {!isLanding && (
          <button className="progress-chip" type="button" onClick={onMission} aria-label={`${copy.progress} ${missionProgress}%`}>
            <span className="progress-chip__orbit" aria-hidden="true"><span /></span>
            <span><small>{copy.progress}</small>{missionProgress}%</span>
          </button>
        )}
      </div>
    </header>
  );
}
