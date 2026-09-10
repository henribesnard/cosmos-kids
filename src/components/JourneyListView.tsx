import type { Locale } from '../app/uiTypes';
import type { JourneyDef, JourneyId } from '../data/journeyTypes';
import { JOURNEY_UI_TEXT } from '../data/journeyUiText';
import type { MissionState } from '../store/useCosmosStore';
import { FeasibilityBadge } from './FeasibilityBadge';
import { formatDistanceForKids } from '../domain/travelTime';

interface JourneyListViewProps {
  locale: Locale;
  journeys: readonly JourneyDef[];
  missionState: MissionState;
  onSelect: (id: JourneyId) => void;
}

function distanceLabel(journey: JourneyDef, locale: Locale): string {
  if (journey.distance.kind === 'fixed') {
    return `${journey.distance.value.approximate ? '≈ ' : ''}${formatDistanceForKids(journey.distance.value.value, locale)}`;
  }
  return `${journey.distance.typical.approximate ? '≈ ' : ''}${formatDistanceForKids(journey.distance.typical.value, locale)}`;
}

function journeyProgress(journey: JourneyDef, state: MissionState): { done: number; total: number; percent: number } {
  const run = state.runs[journey.id];
  const done = run ? run.completedStepIds.length : 0;
  const total = journey.steps.length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

const difficultyStars = (d: 1 | 2 | 3): string => '★'.repeat(d) + '☆'.repeat(3 - d);

export function JourneyListView({ locale, journeys, missionState, onSelect }: JourneyListViewProps) {
  const fr = locale === 'fr';

  return (
    <div className="journey-list-view">
      <p className="journey-list-view__subtitle">
        {JOURNEY_UI_TEXT.listPrompt[locale]}
      </p>
      <ul className="journey-cards">
        {journeys.map((j) => {
          const { done, total, percent } = journeyProgress(j, missionState);
          const complete = done === total && total > 0;
          return (
            <li key={j.id}>
              <button
                type="button"
                className={`journey-card ${complete ? 'journey-card--complete' : ''}`}
                onClick={() => onSelect(j.id)}
              >
                <span className="journey-card__icon" aria-hidden="true">{j.icon}</span>
                <span className="journey-card__body">
                  <span className="journey-card__number">
                    {fr ? `TRAJET ${String(j.number).padStart(2, '0')}` : `JOURNEY ${String(j.number).padStart(2, '0')}`}
                    {complete && <span className="journey-card__badge" aria-label={fr ? 'Terminé' : 'Complete'}>{'\u2713'}</span>}
                  </span>
                  <b>{j.title[locale]}</b>
                  <span className="journey-card__meta">
                    <span className="journey-card__distance">{distanceLabel(j, locale)}</span>
                    <span className="journey-card__difficulty" aria-label={`${fr ? 'Difficulté' : 'Difficulty'} ${j.difficulty}/3`}>
                      {difficultyStars(j.difficulty)}
                    </span>
                  </span>
                  <FeasibilityBadge feasibility={j.feasibility} locale={locale} />
                  {total > 0 && (
                    <>
                      <span className="journey-card__bar">
                        <span style={{ width: `${percent}%` }} />
                      </span>
                      <small>{done}/{total}</small>
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
