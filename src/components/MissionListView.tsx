import type { MissionDef } from '../data/missions';
import type { MissionState } from '../store/useCosmosStore';
import { missionProgress } from '../store/missionSelectors';
import type { Locale } from '../app/uiTypes';

interface MissionListViewProps {
  locale: Locale;
  missions: readonly MissionDef[];
  missionState: MissionState;
  onSelect: (id: string) => void;
}

export function MissionListView({ locale, missions, missionState, onSelect }: MissionListViewProps) {
  const fr = locale === 'fr';

  return (
    <div className="mission-list-view">
      <p className="mission-list-view__subtitle">
        {fr ? 'Choisis une mission et explore l\u2019Univers\u00A0!' : 'Pick a mission and explore the Universe!'}
      </p>
      <ul className="mission-cards">
        {missions.map((m) => {
          const { done, total, percent } = missionProgress(m, missionState);
          const complete = done === total;
          return (
            <li key={m.id}>
              <button type="button" className={`mission-card ${complete ? 'mission-card--complete' : ''}`} onClick={() => onSelect(m.id)}>
                <span className="mission-card__icon" aria-hidden="true">{m.icon}</span>
                <span className="mission-card__body">
                  <span className="mission-card__number">
                    {fr ? `MISSION ${String(m.number).padStart(2, '0')}` : `MISSION ${String(m.number).padStart(2, '0')}`}
                    {complete && <span className="mission-card__badge" aria-label={fr ? 'Termin\u00E9e' : 'Complete'}>{'\u2713'}</span>}
                  </span>
                  <b>{m.title[locale]}</b>
                  <span className="mission-card__bar">
                    <span style={{ width: `${percent}%` }} />
                  </span>
                  <small>{done}/{total}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
