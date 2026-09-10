import type { Locale } from '../app/uiTypes';
import type {
  JourneyDef,
  JourneyId,
  MissionStepDef,
  MissionStepTarget,
  ScaleLevelId,
} from '../data/journeyTypes';
import { JOURNEY_UI_TEXT } from '../data/journeyUiText';
import type { MissionState } from '../store/useCosmosStore';
import { formatDistanceForKids } from '../domain/travelTime';
import { FeasibilityBadge } from './FeasibilityBadge';
import { HazardList } from './HazardList';
import { Icon } from './Icon';
import { JourneyLegTrack } from './JourneyLegTrack';
import { PrecedentCard } from './PrecedentCard';
import { QuizStep } from './QuizStep';
import { RealWorldStep } from './RealWorldStep';
import { TravelTimeComparator } from './TravelTimeComparator';

interface JourneyDetailViewProps {
  readonly locale: Locale;
  readonly journey: JourneyDef;
  readonly missionState: MissionState;
  readonly onBack: () => void;
  readonly onTravel: (id: MissionStepTarget | ScaleLevelId) => void;
  readonly onCompare: (a: MissionStepTarget, b: MissionStepTarget) => void;
  readonly onStartJourney: (id: JourneyId) => void;
}

function distanceLabel(journey: JourneyDef, locale: Locale): string {
  const approximate = journey.distance.kind === 'fixed'
    ? journey.distance.value.approximate
    : journey.distance.typical.approximate;
  const prefix = approximate ? '≈ ' : '';
  if (journey.distance.kind === 'fixed') {
    return `${prefix}${formatDistanceForKids(journey.distance.value.value, locale)}`;
  }
  const min = formatDistanceForKids(journey.distance.min.value, locale);
  const max = formatDistanceForKids(journey.distance.max.value, locale);
  return `${prefix}${locale === 'fr' ? `${min} à ${max}` : `${min} to ${max}`}`;
}

function actionForStep(
  step: MissionStepDef,
  restricted: boolean,
  locale: Locale,
  onTravel: JourneyDetailViewProps['onTravel'],
  onCompare: JourneyDetailViewProps['onCompare'],
): { label: string; run: () => void } | null {
  const fr = locale === 'fr';
  if (step.kind === 'visit' || step.kind === 'observe') {
    return {
      label: restricted
        ? (fr ? 'Voir la simulation' : 'View simulation')
        : (fr ? 'Y aller' : 'Go'),
      run: () => onTravel(step.target),
    };
  }
  if (step.kind === 'compare') {
    return {
      label: fr ? 'Comparer' : 'Compare',
      run: () => onCompare(step.a, step.b),
    };
  }
  if (step.kind === 'reach-scale') {
    return {
      label: restricted
        ? (fr ? 'Voir la simulation' : 'View simulation')
        : (fr ? 'Explorer' : 'Explore'),
      run: () => onTravel(step.level),
    };
  }
  return null;
}

export function JourneyDetailView({
  locale,
  journey,
  missionState,
  onBack,
  onTravel,
  onCompare,
  onStartJourney,
}: JourneyDetailViewProps) {
  const fr = locale === 'fr';
  const run = missionState.runs[journey.id];
  const started = run?.startedAt != null;
  const completedSteps = run?.completedStepIds ?? [];
  const done = completedSteps.length;
  const total = journey.steps.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = run?.completedAt != null;
  const restricted = journey.feasibility === 'out-of-reach' || journey.feasibility === 'impossible-today';
  const distanceSource = journey.distance.kind === 'fixed'
    ? journey.distance.value
    : journey.distance.typical;

  return (
    <div className="journey-detail-view">
      <button type="button" className="journey-back-btn" onClick={onBack}>
        <Icon name="arrow-left" size={14} />
        {fr ? 'Tous les trajets' : 'All journeys'}
      </button>

      <div className="journey-detail-view__header">
        <p className="panel-kicker">
          <Icon name="mission" size={15} />{' '}
          {fr ? `TRAJET ${String(journey.number).padStart(2, '0')}` : `JOURNEY ${String(journey.number).padStart(2, '0')}`}
        </p>
        <h2>{journey.title[locale]}</h2>
        <p className="journey-detail-view__pitch">{journey.pitch[locale]}</p>
        <FeasibilityBadge feasibility={journey.feasibility} locale={locale} />
        {restricted ? (
          <p className="simulated-visualization" role="note">
            {JOURNEY_UI_TEXT.simulationDisclaimer[locale]}
          </p>
        ) : null}
      </div>

      <section className="journey-section">
        <h3>{fr ? 'Distance' : 'Distance'}</h3>
        <p className="journey-distance">{distanceLabel(journey, locale)}</p>
        {journey.distance.kind === 'variable' ? (
          <p className="journey-distance__why">{journey.distance.why[locale]}</p>
        ) : null}
        <a href={distanceSource.sourceUrl} target="_blank" rel="noreferrer">
          {fr ? 'Source : ' : 'Source: '}{distanceSource.attribution}
        </a>
      </section>

      <section className="journey-section">
        <h3>{fr ? 'Combien de temps ?' : 'How long?'}</h3>
        <TravelTimeComparator durations={journey.durations} distance={journey.distance} locale={locale} />
      </section>

      {journey.launchWindow ? (
        <section className="journey-section">
          <h3>{fr ? 'Fenêtre de tir' : 'Launch window'}</h3>
          <p>{journey.launchWindow[locale]}</p>
          {journey.launchWindowSource ? (
            <a href={journey.launchWindowSource.url} target="_blank" rel="noreferrer">
              {fr ? 'Source : ' : 'Source: '}{journey.launchWindowSource.label}
            </a>
          ) : null}
        </section>
      ) : null}

      {journey.legs.length > 0 ? (
        <section className="journey-section">
          <h3>{fr ? 'Qu’est-ce qu’on croise ?' : 'What do we pass?'}</h3>
          <JourneyLegTrack legs={journey.legs} locale={locale} />
        </section>
      ) : null}

      {journey.hazards.length > 0 ? (
        <section className="journey-section">
          <h3>{fr ? 'Qu’est-ce qui est dangereux ?' : 'What is dangerous?'}</h3>
          <HazardList hazards={journey.hazards} locale={locale} />
        </section>
      ) : null}

      <section className="journey-section">
        <h3>{fr ? 'Qui l’a fait ?' : 'Who has done it?'}</h3>
        <PrecedentCard kind="human" precedent={journey.humanPrecedent} locale={locale} />
        <PrecedentCard kind="robot" precedent={journey.robotPrecedent} locale={locale} />
      </section>

      {journey.highlights?.length ? (
        <section className="journey-section journey-highlight">
          <h3>{fr ? 'À retenir' : 'Key idea'}</h3>
          {journey.highlights.map((highlight) => (
            <div key={highlight.text.en}>
              <p>{highlight.text[locale]}</p>
              <a href={highlight.source.url} target="_blank" rel="noreferrer">{highlight.source.label}</a>
            </div>
          ))}
        </section>
      ) : null}

      <section className="journey-section">
        <h3>{fr ? 'Étapes du trajet' : 'Journey steps'}</h3>
        {!started ? (
          <button
            type="button"
            className="button button--primary journey-start-btn"
            onClick={() => onStartJourney(journey.id)}
          >
            {restricted
              ? (fr ? 'Démarrer l’exploration simulée' : 'Start simulated exploration')
              : (fr ? 'Démarrer ce trajet' : 'Start this journey')}
          </button>
        ) : null}
        <ol className="journey-steps">
          {journey.steps.map((step, index) => {
            const isDone = completedSteps.includes(step.id);
            const orderedLocked = Boolean(step.ordered && journey.steps
              .slice(0, index)
              .filter((previous) => previous.ordered)
              .some((previous) => !completedSteps.includes(previous.id)));
            const action = actionForStep(step, restricted, locale, onTravel, onCompare);
            return (
              <li className={`journey-step ${isDone ? 'is-done' : ''}`} key={step.id}>
                <div className="journey-step__header">
                  <span className="journey-step-check" aria-hidden="true">{isDone ? <Icon name="check" size={14} /> : '·'}</span>
                  <span>
                    <b>{step.label[locale]}</b>
                    <small>{step.detail[locale]}</small>
                  </span>
                  {action && started && !isDone ? (
                    <button
                      type="button"
                      className="journey-step__go"
                      disabled={orderedLocked}
                      onClick={action.run}
                    >
                      {action.label}
                    </button>
                  ) : null}
                </div>
                {step.kind === 'quiz' && started ? (
                  <QuizStep stepId={step.id} quiz={step.question} locale={locale} isDone={isDone} />
                ) : null}
                {step.kind === 'real-world' && started ? (
                  <RealWorldStep stepId={step.id} checklist={step.checklist} locale={locale} isDone={isDone} />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="journey-progress" aria-label={`${percent}%`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className={`journey-reward ${complete ? 'journey-reward--earned' : ''}`}>
          <span aria-hidden="true">{journey.icon}</span>
          <span>
            <small>{fr ? 'RÉCOMPENSE' : 'REWARD'}</small>
            <b>{journey.reward[locale]}</b>
          </span>
        </div>
      </section>
    </div>
  );
}
