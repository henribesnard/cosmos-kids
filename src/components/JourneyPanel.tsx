import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { Locale } from '../app/uiTypes';
import { JOURNEYS } from '../data/journeys';
import type { JourneyId, MissionStepTarget, ScaleLevelId } from '../data/journeyTypes';
import type { MissionState } from '../store/useCosmosStore';
import { Icon } from './Icon';
import { JourneyListView } from './JourneyListView';
import { JourneyDetailView } from './JourneyDetailView';
import '../styles/journeys.css';

interface JourneyPanelProps {
  locale: Locale;
  missionState: MissionState;
  activeJourneyId: JourneyId | null;
  open: boolean;
  onClose: () => void;
  onSelectJourney: (id: JourneyId | null) => void;
  onStartJourney: (id: JourneyId) => void;
  onTravel: (id: MissionStepTarget | ScaleLevelId) => void;
  onCompare: (a: MissionStepTarget, b: MissionStepTarget) => void;
}

export function JourneyPanel({
  locale,
  missionState,
  activeJourneyId,
  open,
  onClose,
  onSelectJourney,
  onStartJourney,
  onTravel,
  onCompare,
}: JourneyPanelProps) {
  const fr = locale === 'fr';
  const [mobileHeight, setMobileHeight] = useState(60);
  const dragStart = useRef<{ y: number; height: number } | null>(null);
  const activeJourney = activeJourneyId
    ? JOURNEYS.find((j) => j.id === activeJourneyId) ?? null
    : null;
  const clampHeight = (height: number) => Math.min(82, Math.max(42, height));
  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = { y: event.clientY, height: mobileHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const resize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || window.innerWidth >= 900) return;
    const deltaVh = ((dragStart.current.y - event.clientY) / window.innerHeight) * 100;
    setMobileHeight(clampHeight(dragStart.current.height + deltaVh));
  };

  return (
    <aside
      className={`mission-panel glass-panel ${open ? 'is-open' : ''}`}
      style={{ '--journey-panel-height': `${mobileHeight}dvh` } as CSSProperties}
      data-scene-obstacle
      hidden={!open}
      aria-label={fr ? 'Trajets' : 'Journeys'}
    >
      <div
        className="mission-panel__handle"
        role="separator"
        aria-label={fr ? 'Redimensionner le panneau' : 'Resize panel'}
        aria-orientation="horizontal"
        aria-valuemin={42}
        aria-valuemax={82}
        aria-valuenow={Math.round(mobileHeight)}
        tabIndex={0}
        onPointerDown={beginResize}
        onPointerMove={resize}
        onPointerUp={(event) => {
          dragStart.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          setMobileHeight((height) => clampHeight(height + (event.key === 'ArrowUp' ? 5 : -5)));
        }}
      />
      <div className="mission-panel__header">
        <h2 className="mission-panel__title">{fr ? 'Trajets' : 'Journeys'}</h2>
        <button
          className="icon-button mission-panel__close"
          type="button"
          onClick={onClose}
          aria-label={fr ? 'Fermer' : 'Close'}
        >
          <Icon name="close" />
        </button>
      </div>

      {activeJourney ? (
        <JourneyDetailView
          locale={locale}
          journey={activeJourney}
          missionState={missionState}
          onBack={() => onSelectJourney(null)}
          onTravel={onTravel}
          onCompare={onCompare}
          onStartJourney={onStartJourney}
        />
      ) : (
        <JourneyListView
          locale={locale}
          journeys={JOURNEYS}
          missionState={missionState}
          onSelect={(id) => onSelectJourney(id)}
        />
      )}
    </aside>
  );
}
