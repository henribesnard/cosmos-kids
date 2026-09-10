import { describe, expect, it, vi } from 'vitest';
import { createEventBus, publish, subscribe, type CosmosEvent } from './events';

describe('createEventBus', () => {
  it('publishes synchronously to every subscriber', () => {
    const bus = createEventBus();
    const calls: string[] = [];
    bus.subscribe((event) => calls.push(`first:${event.type}`));
    bus.subscribe((event) => calls.push(`second:${event.type}`));

    bus.publish({ type: 'OBJECT_VISITED', id: 'mars', at: 123 });

    expect(calls).toEqual([
      'first:OBJECT_VISITED',
      'second:OBJECT_VISITED',
    ]);
  });

  it('stops publishing to a handler after unsubscribe', () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe(handler);

    bus.publish({ type: 'SCALE_CHANGED', level: 'solar' });
    unsubscribe();
    bus.publish({ type: 'SCALE_CHANGED', level: 'milkyway' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ type: 'SCALE_CHANGED', level: 'solar' });
  });

  it('does not throw when no handler is subscribed', () => {
    const bus = createEventBus();

    expect(() => {
      bus.publish({ type: 'REAL_WORLD_CHECKED', stepId: 'outside' });
    }).not.toThrow();
  });
});

describe('application event bus', () => {
  it('exposes publish and subscribe functions', () => {
    const handler = vi.fn();
    const unsubscribe = subscribe(handler);
    const event: CosmosEvent = { type: 'JOURNEY_STARTED', id: 'earth-to-moon' };

    publish(event);
    unsubscribe();

    expect(handler).toHaveBeenCalledWith(event);
  });
});
