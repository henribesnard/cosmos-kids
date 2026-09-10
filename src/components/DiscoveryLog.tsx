import type { Locale } from '../app/uiTypes';
import { CONSTELLATION_BY_ID } from '../data/constellations';
import { isConstellationAbbr } from '../data/constellationTypes';
import { DEEP_SKY_BY_ID } from '../data/deepSkyObjects';
import { JOURNEYS } from '../data/journeys';
import { JOURNEY_UI_TEXT } from '../data/journeyUiText';
import type { JourneyDef, JourneyId, MissionStepDef, MissionStepTarget } from '../data/journeyTypes';
import '../styles/journeys.css';
import { INTERNATIONAL_SPACE_STATION, SOLAR_SYSTEM_BODY_BY_ID } from '../data/solarSystem';
import { isCelestialObjectId, isDeepSkyObjectId } from '../data/types';
import type { MissionState } from '../store/useCosmosStore';
import { Icon } from './Icon';

interface DiscoveryLogProps {
  readonly locale: Locale;
  readonly missionState: MissionState;
  readonly onClose: () => void;
  readonly onSelectJourney: (id: JourneyId) => void;
}

interface Discovery {
  readonly id: MissionStepTarget;
  readonly label: string;
  readonly category: string;
  readonly firstVisitedAt: number | null;
  readonly journey: JourneyDef | null;
}

function targetsForStep(step: MissionStepDef): readonly MissionStepTarget[] {
  switch (step.kind) {
    case 'visit':
    case 'observe':
      return [step.target];
    case 'compare':
      return [step.a, step.b];
    case 'reach-scale':
    case 'quiz':
    case 'real-world':
      return [];
  }
}

function labelAndCategory(id: MissionStepTarget, locale: Locale): { label: string; category: string } {
  const fr = locale === 'fr';
  if (isCelestialObjectId(id)) {
    const body = SOLAR_SYSTEM_BODY_BY_ID[id];
    const kind = body.kind === 'star'
      ? (fr ? 'Étoile' : 'Star')
      : body.kind === 'moon'
        ? (fr ? 'Satellite naturel' : 'Natural satellite')
        : (fr ? 'Planète' : 'Planet');
    return { label: body.name[locale], category: kind };
  }
  if (isDeepSkyObjectId(id)) {
    const object = DEEP_SKY_BY_ID[id];
    return {
      label: object.name[locale],
      category: fr ? 'Objet du ciel profond' : 'Deep-sky object',
    };
  }
  if (isConstellationAbbr(id)) {
    return {
      label: CONSTELLATION_BY_ID[id].name[locale],
      category: fr ? 'Constellation' : 'Constellation',
    };
  }
  if (id === 'iss') {
    return {
      label: INTERNATIONAL_SPACE_STATION.name[locale],
      category: fr ? 'Station orbitale' : 'Orbital station',
    };
  }
  return {
    label: fr ? 'Ciel nocturne' : 'Night sky',
    category: fr ? 'Observation réelle' : 'Real-world observation',
  };
}

function formatVisitDate(value: number | null, locale: Locale): string {
  if (value == null) {
    return JOURNEY_UI_TEXT.legacyVisitDate[locale];
  }
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function DiscoveryLog({
  locale,
  missionState,
  onClose,
  onSelectJourney,
}: DiscoveryLogProps) {
  const fr = locale === 'fr';
  const ids: MissionStepTarget[] = [
    ...missionState.visitedObjectIds,
    ...missionState.visitedDeepSkyIds,
    ...missionState.visitedConstellationIds,
    ...missionState.visitedSpecialIds,
  ];
  const discoveries: Discovery[] = ids.map((id) => {
    const display = labelAndCategory(id, locale);
    const journey = JOURNEYS.find((candidate) =>
      candidate.from.id === id
      || candidate.to.id === id
      || candidate.steps.some((step) => targetsForStep(step).includes(id))) ?? null;
    return {
      id,
      ...display,
      firstVisitedAt: missionState.firstVisitedAt[id] ?? null,
      journey,
    };
  }).sort((a, b) => (b.firstVisitedAt ?? -1) - (a.firstVisitedAt ?? -1));

  return (
    <section className="discovery-log glass-panel" data-scene-obstacle aria-labelledby="discovery-log-title">
      <header className="discovery-log__header">
        <div>
          <p className="panel-kicker">{fr ? 'TES EXPLORATIONS' : 'YOUR EXPLORATIONS'}</p>
          <h1 id="discovery-log-title">{fr ? 'Carnet de découverte' : 'Discovery log'}</h1>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label={fr ? 'Fermer le carnet' : 'Close logbook'}>
          <Icon name="close" />
        </button>
      </header>
      {discoveries.length === 0 ? (
        <div className="discovery-log__empty">
          <span aria-hidden="true">🔭</span>
          <p>{JOURNEY_UI_TEXT.emptyLog[locale]}</p>
        </div>
      ) : (
        <ol className="discovery-log__list">
          {discoveries.map((discovery) => (
            <li className="discovery-log__item" key={discovery.id}>
              <div>
                <b>{discovery.label}</b>
                <span>{discovery.category}</span>
                <time dateTime={discovery.firstVisitedAt == null ? undefined : new Date(discovery.firstVisitedAt).toISOString()}>
                  {formatVisitDate(discovery.firstVisitedAt, locale)}
                </time>
              </div>
              {discovery.journey ? (
                <button type="button" onClick={() => onSelectJourney(discovery.journey!.id)}>
                  {fr ? `Trajet ${discovery.journey.number}` : `Journey ${discovery.journey.number}`}
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
