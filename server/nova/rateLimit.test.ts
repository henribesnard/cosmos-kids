import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, resetAllRateLimits } from './rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetAllRateLimits();
  });

  it('allows requests under the limit', () => {
    const result = checkRateLimit('test-ip-1', 20);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it('tracks remaining questions', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('test-ip-2', 20);
    }
    const result = checkRateLimit('test-ip-2', 20);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(14);
  });

  it('blocks requests at the limit', () => {
    for (let i = 0; i < 20; i++) {
      checkRateLimit('test-ip-3', 20);
    }
    const result = checkRateLimit('test-ip-3', 20);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks different IPs independently', () => {
    for (let i = 0; i < 20; i++) {
      checkRateLimit('ip-a', 20);
    }
    const resultA = checkRateLimit('ip-a', 20);
    const resultB = checkRateLimit('ip-b', 20);

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it('respects custom max per hour', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('test-ip-4', 5);
    }
    const result = checkRateLimit('test-ip-4', 5);
    expect(result.allowed).toBe(false);
  });
});
