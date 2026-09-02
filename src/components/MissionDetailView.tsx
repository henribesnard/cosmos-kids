import type { MissionDef } from '../data/missions';
import type { MissionState } from '../store/useCosmosStore';
import { isTargetVisited, missionProgress } from '../store/missionSelectors';
import type { Locale } from '../app/uiTypes';
import { Icon } from './Icon';

interface MissionDetailViewProps {
  locale: Locale;
  mission: MissionDef;
  missionState: MissionState;
  onBack: () => void;
  onTravel: (id: string) => void;
}

export function MissionDetailView({ locale, mission, missionState, onBack, onTravel }: MissionDetailViewProps) {
  const fr = locale === 'fr';
  const { done, total, percent } = missionProgress(mission, missionState);
  const complete = done === total;

  return (
    <div className="mission-detail-view">
      <button type="button" className="mission-back-btn" onClick={onBack}>
        <Icon name="arrow-left" size={14} />
        {fr ? 'Toutes les missions' : 'All missions'}
      </button>

      <div className="panel-heading" style={{ marginTop: 12 }}>
        <div>
          <p className="panel-kicker">
            <Icon name="mission" size={15} /> {`MISSION ${String(mission.number).padStart(2, '0')}`}
          </p>
          <h2>{mission.title[locale]}</h2>
        </div>
      </div>

      <ol className="mission-list">
        {mission.steps.map((step, index) => {
          const visited = isTargetVisited(step.target, missionState);
          return (
            <li className={visited ? 'is-done' : ''} key={step.target}>
              <button type="button" onClick={() => onTravel(step.target)}>
                <span className="mission-check">{visited ? <Icon name="check" size={14} /> : index + 1}</span>
                <span><b>{step.label[locale]}</b><small>{step.detail[locale]}</small></span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mission-progress" aria-label={`${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className={`mission-reward ${complete ? 'mission-reward--earned' : ''}`}>
        <span aria-hidden="true">{mission.icon}</span>
        <span>
          <small>{fr ? 'R\u00C9COMPENSE' : 'REWARD'}</small>
          <b>{mission.reward[locale]}</b>
        </span>
      </div>
    </div>
  );
}
