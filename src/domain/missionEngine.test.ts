import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MissionStepDef } from '../data/journeyTypes';
import { useCosmosStore } from '../store/useCosmosStore';
import { publish, subscribe } from './events';
import {
  eventSatisfiesStep,
  orderedPredecessorsAreComplete,
  startMissionEngine,
  stopMissionEngine,
} from './missionEngine';

const label = { fr: 'Étape', en: 'Step' } as const;
const detail = { fr: 'Détail', en: 'Detail' } as const;

const steps = {
  visit: { id: 'visit', kind: 'visit', target: 'moon', label, detail },
  observe: { id: 'observe', kind: 'observe', target: 'mars', holdMs: 2_000, label, detail },
  compare: { id: 'compare', kind: 'compare', a: 'earth', b: 'moon', label, detail },
  scale: { id: 'scale', kind: 'reach-scale', level: 'milkyway', label, detail },
  quiz: {
    id: 'quiz',
    kind: 'quiz',
    label,
    detail,
    question: {
      prompt: label,
      options: [label, detail],
      correctIndex: 0,
      explain: detail,
    },
  },
  realWorld: {
    id: 'real-world',
    kind: 'real-world',
    label,
    detail,
    checklist: [label],
  },
} satisfies Record<string, MissionStepDef>;

describe('eventSatisfiesStep', () => {
  it.each([
    ['visit', { type: 'OBJECT_VISITED', id: 'moon', at: 1 }, steps.visit],
    ['observe', { type: 'OBJECT_OBSERVED', id: 'mars', durationMs: 2_000 }, steps.observe],
    ['compare', { type: 'COMPARISON_COMPLETED', a: 'earth', b: 'moon' }, steps.compare],
    ['compare (reversed)', { type: 'COMPARISON_COMPLETED', a: 'moon', b: 'earth' }, steps.compare],
    ['reach-scale', { type: 'SCALE_CHANGED', level: 'milkyway' }, steps.scale],
    ['quiz', { type: 'QUIZ_ANSWERED', stepId: 'quiz', correct: true }, steps.quiz],
    ['real-world', { type: 'REAL_WORLD_CHECKED', stepId: 'real-world' }, steps.realWorld],
  ] as const)('validates a matching %s step', (_name, event, step) => {
    expect(eventSatisfiesStep(event, step)).toBe(true);
  });

  it.each([
    ['visit', { type: 'OBJECT_VISITED', id: 'earth', at: 1 }, steps.visit],
    ['observe target', { type: 'OBJECT_OBSERVED', id: 'moon', durationMs: 2_000 }, steps.observe],
    ['observe duration', { type: 'OBJECT_OBSERVED', id: 'mars', durationMs: 1_999 }, steps.observe],
    ['compare', { type: 'COMPARISON_COMPLETED', a: 'earth', b: 'mars' }, steps.compare],
    ['reach-scale', { type: 'SCALE_CHANGED', level: 'solar' }, steps.scale],
    ['quiz answer', { type: 'QUIZ_ANSWERED', stepId: 'quiz', correct: false }, steps.quiz],
    ['quiz id', { type: 'QUIZ_ANSWERED', stepId: 'another-quiz', correct: true }, steps.quiz],
    ['real-world', { type: 'REAL_WORLD_CHECKED', stepId: 'another-step' }, steps.realWorld],
  ] as const)('rejects a non-matching %s event', (_name, event, step) => {
    expect(eventSatisfiesStep(event, step)).toBe(false);
  });
});

describe('orderedPredecessorsAreComplete', () => {
  const orderedSteps = [
    { ...steps.visit, id: 'first', ordered: true },
    { ...steps.quiz, id: 'optional' },
    { ...steps.observe, id: 'second', ordered: true },
  ] satisfies readonly MissionStepDef[];

  it('blocks an ordered step while an earlier ordered step is incomplete', () => {
    expect(orderedPredecessorsAreComplete(orderedSteps, 'second', [])).toBe(false);
  });

  it('allows it once every earlier ordered step is complete', () => {
    expect(orderedPredecessorsAreComplete(orderedSteps, 'second', ['first', 'optional'])).toBe(true);
  });

  it('does not require an earlier unordered step', () => {
    expect(orderedPredecessorsAreComplete(orderedSteps, 'second', ['first'])).toBe(true);
  });
});

describe('mission engine integration', () => {
  beforeEach(() => {
    stopMissionEngine();
    window.localStorage.clear();
    useCosmosStore.getState().reset();
    useCosmosStore.persist.clearStorage();
    startMissionEngine();
  });

  afterEach(() => {
    stopMissionEngine();
    vi.restoreAllMocks();
  });

  it('records a discovery but does not validate a step before its journey starts', () => {
    useCosmosStore.getState().setActiveJourney('earth-to-iss');

    publish({ type: 'OBJECT_VISITED', id: 'earth', at: 123 });

    const mission = useCosmosStore.getState().mission;
    expect(mission.visitedObjectIds).toContain('earth');
    expect(Object.keys(mission.runs)).toHaveLength(0);
  });

  it('does not validate an ordered step out of sequence', () => {
    useCosmosStore.getState().startJourney('earth-to-moon');

    publish({ type: 'OBJECT_VISITED', id: 'moon', at: 1 });
    expect(
      useCosmosStore.getState().mission.runs['earth-to-moon']?.completedStepIds,
    ).not.toContain('moon-visit-moon');

    publish({ type: 'OBJECT_VISITED', id: 'earth', at: 2 });
    publish({ type: 'OBJECT_VISITED', id: 'moon', at: 3 });
    expect(
      useCosmosStore.getState().mission.runs['earth-to-moon']?.completedStepIds,
    ).toEqual(expect.arrayContaining(['moon-visit-earth', 'moon-visit-moon']));
  });

  it('does not duplicate an already completed step', () => {
    useCosmosStore.getState().startJourney('earth-to-iss');

    publish({ type: 'OBJECT_VISITED', id: 'earth', at: 1 });
    publish({ type: 'OBJECT_VISITED', id: 'earth', at: 2 });

    const completed = useCosmosStore.getState()
      .mission.runs['earth-to-iss']?.completedStepIds
      .filter((id) => id === 'iss-visit-earth');
    expect(completed).toHaveLength(1);
  });

  it('validates comparisons only from an explicit matching comparison event', () => {
    useCosmosStore.getState().startJourney('earth-to-moon');

    publish({ type: 'OBJECT_VISITED', id: 'earth', at: 1 });
    publish({ type: 'OBJECT_VISITED', id: 'moon', at: 2 });
    expect(
      useCosmosStore.getState().mission.runs['earth-to-moon']?.completedStepIds,
    ).not.toContain('moon-compare');

    publish({ type: 'COMPARISON_COMPLETED', a: 'moon', b: 'earth' });
    expect(
      useCosmosStore.getState().mission.runs['earth-to-moon']?.completedStepIds,
    ).toContain('moon-compare');
  });

  it('publishes JOURNEY_COMPLETED exactly once at the completion transition', () => {
    const completionHandler = vi.fn();
    const unsubscribe = subscribe((event) => {
      if (event.type === 'JOURNEY_COMPLETED') completionHandler(event);
    });
    useCosmosStore.getState().startJourney('earth-to-iss');

    publish({ type: 'OBJECT_VISITED', id: 'earth', at: 1 });
    publish({ type: 'OBJECT_VISITED', id: 'iss', at: 2 });
    publish({ type: 'OBJECT_OBSERVED', id: 'iss', durationMs: 1_500 });
    publish({ type: 'QUIZ_ANSWERED', stepId: 'iss-quiz-orbit', correct: true });
    publish({ type: 'OBJECT_VISITED', id: 'iss', at: 3 });

    expect(completionHandler).toHaveBeenCalledOnce();
    expect(completionHandler).toHaveBeenCalledWith({
      type: 'JOURNEY_COMPLETED',
      id: 'earth-to-iss',
    });
    expect(
      useCosmosStore.getState().mission.runs['earth-to-iss']?.completedAt,
    ).not.toBeNull();
    unsubscribe();
  });

  it('stops processing after stopMissionEngine', () => {
    useCosmosStore.getState().startJourney('earth-to-iss');
    stopMissionEngine();

    publish({ type: 'OBJECT_VISITED', id: 'earth', at: 1 });

    expect(useCosmosStore.getState().mission.visitedObjectIds).not.toContain('earth');
    expect(
      useCosmosStore.getState().mission.runs['earth-to-iss']?.completedStepIds,
    ).toEqual([]);
  });
});
