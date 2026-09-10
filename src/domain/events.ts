import type {
  JourneyId,
  MissionStepTarget,
  ScaleLevelId,
} from '../data/journeyTypes';

/** Events emitted by the application and consumed by the mission engine. */
export type CosmosEvent =
  | { readonly type: 'OBJECT_VISITED'; readonly id: MissionStepTarget; readonly at: number }
  | { readonly type: 'OBJECT_OBSERVED'; readonly id: MissionStepTarget; readonly durationMs: number }
  | { readonly type: 'SCALE_CHANGED'; readonly level: ScaleLevelId }
  | {
      readonly type: 'COMPARISON_COMPLETED';
      readonly a: MissionStepTarget;
      readonly b: MissionStepTarget;
    }
  | { readonly type: 'QUIZ_ANSWERED'; readonly stepId: string; readonly correct: boolean }
  | { readonly type: 'REAL_WORLD_CHECKED'; readonly stepId: string }
  | { readonly type: 'JOURNEY_STARTED'; readonly id: JourneyId }
  | { readonly type: 'JOURNEY_COMPLETED'; readonly id: JourneyId };

export type CosmosEventHandler = (event: CosmosEvent) => void;

export interface EventBus {
  /** Dispatch an event synchronously to the current subscribers. */
  publish(event: CosmosEvent): void;
  /** Subscribe to events. The returned function removes the subscription. */
  subscribe(handler: CosmosEventHandler): () => void;
}

/** Create an isolated synchronous event bus, primarily useful for tests. */
export function createEventBus(): EventBus {
  const handlers = new Set<CosmosEventHandler>();

  return {
    publish(event) {
      for (const handler of handlers) handler(event);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}

const cosmosEventBus = createEventBus();

/** Publish on the application-wide synchronous event bus. */
export const publish: EventBus['publish'] = cosmosEventBus.publish;

/** Subscribe to the application-wide synchronous event bus. */
export const subscribe: EventBus['subscribe'] = cosmosEventBus.subscribe;
