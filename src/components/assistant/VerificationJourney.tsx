import { useEffect, useState } from 'react';
import { SOLAR_SYSTEM_BODIES } from '../../data/solarSystem';
import type { Locale } from '../../data/types';
import { NovaAvatar } from './NovaAvatar';
import { JOURNEY_PHASES, NOVA_TEXT, type JourneyPhase } from './novaText';
import { moodForPhase, STILL_WORKING_AFTER_S } from './novaUtils';

interface VerificationJourneyProps {
  readonly phase: JourneyPhase;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
}

/** Pre-computed spots where the shooting star appears (deterministic, no Math.random in render). */
const STAR_SPOTS: readonly { x: number; y: number }[] = [
  { x: 14, y: 30 }, { x: 72, y: 18 }, { x: 40, y: 62 }, { x: 84, y: 55 },
  { x: 24, y: 70 }, { x: 58, y: 28 }, { x: 8, y: 52 }, { x: 66, y: 72 },
];

const FACTS = SOLAR_SYSTEM_BODIES.map((body) => body.funFact);
const FACT_EVERY_S = 6;
const STAR_EVERY_S = 2;

/**
 * Turns the wait (5–7 s in practice, sometimes more) into a small game: a probe travels along four
 * stations (question → logbook → agencies → double check), a "did you know"
 * card rotates verified facts from the app catalogue, and the child can catch
 * shooting stars. Only the station label is announced (aria-live).
 */
export function VerificationJourney({ phase, locale, reducedMotion }: VerificationJourneyProps) {
  const t = NOVA_TEXT[locale];
  const [visited, setVisited] = useState<readonly JourneyPhase[]>([phase]);
  const [elapsed, setElapsed] = useState(0);
  const [caught, setCaught] = useState(0);
  const [caughtSpot, setCaughtSpot] = useState(-1);

  if (!visited.includes(phase)) setVisited([...visited, phase]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const currentIndex = JOURNEY_PHASES.indexOf(phase);
  const progress = (currentIndex + 0.5) / JOURNEY_PHASES.length;
  const fact = FACTS[(Math.floor(elapsed / FACT_EVERY_S) + FACTS.length) % FACTS.length];
  const spotIndex = Math.floor(elapsed / STAR_EVERY_S) % STAR_SPOTS.length;
  const spot = STAR_SPOTS[spotIndex]!;
  const starVisible = caughtSpot !== Math.floor(elapsed / STAR_EVERY_S);

  return (
    <div className={`nova-journey${reducedMotion ? ' nova-journey--still' : ''}`}>
      <div className="nova-journey__head">
        <NovaAvatar mood={moodForPhase(phase) ?? 'thinking'} size={44} />
        <p className="nova-journey__label" role="status" aria-live="polite">
          <span className="sr-only">{t.journeyLabel} : </span>
          {t.journey[phase]}
        </p>
      </div>

      <ol className="nova-journey__track" style={{ '--nova-progress': progress } as React.CSSProperties} aria-label={t.journeyLabel}>
        {JOURNEY_PHASES.map((step, index) => {
          const state = index === currentIndex
            ? 'current'
            : index < currentIndex
              ? (visited.includes(step) ? 'done' : 'skipped')
              : 'todo';
          return (
            <li key={step} className={`nova-journey__step nova-journey__step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="nova-journey__dot" aria-hidden="true">
                {state === 'done' ? '✓' : state === 'skipped' ? '–' : index + 1}
              </span>
              <span className="nova-journey__short">{t.journeyShort[step]}</span>
            </li>
          );
        })}
      </ol>

      {elapsed >= STILL_WORKING_AFTER_S && <p className="nova-journey__patience">{t.journeyStillWorking}</p>}

      <div className="nova-journey__play">
        {fact && (
          <div className="nova-journey__fact">
            <b>{t.didYouKnow}</b>
            <p key={fact.fr}>{fact[locale]}</p>
            <small>{t.catalogName}</small>
          </div>
        )}
        <div className="nova-journey__sky">
          <div className="nova-journey__sky-head">
            <p className="nova-journey__game-hint">{t.catchStars}</p>
            <span className="nova-journey__score">★ {t.starsCaught(caught)}</span>
          </div>
          {/* One stable button that hops between spots, so keyboard focus is never lost. */}
          <button
              type="button"
              className={`nova-journey__star${starVisible ? '' : ' is-caught'}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              aria-label={t.catchStar}
              aria-disabled={!starVisible}
              onClick={() => {
                if (!starVisible) return;
                setCaught((value) => value + 1);
                setCaughtSpot(Math.floor(elapsed / STAR_EVERY_S));
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 2.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 16l-5.4 3.1 1.2-6.1-4.5-4.2 6.1-.7z" fill="#fff6c9" stroke="#ffd98a" strokeWidth="1" />
              </svg>
            </button>
        </div>
      </div>
    </div>
  );
}
