import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Locale } from '../../data/types';
import '../../styles/assistant-dock.css';
import { NovaAvatar } from './NovaAvatar';
import { NOVA_DOCK_TEXT } from './novaDockText';
import { readNovaMet, writeNovaMet } from './novaHooks';

const NovaPanel = lazy(() => import('./NovaPanel'));

export interface NovaDockProps {
  readonly locale: Locale;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly reducedMotion: boolean;
  /** Whether Nova may introduce herself now (not over the landing hero). */
  readonly canGreet: boolean;
  readonly canTravel: (destinationId: string) => boolean;
  readonly onTravel: (destinationId: string) => void;
  readonly onOpenParents: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Always-present entry point to Nova. Ships in the main bundle, so it stays
 * tiny: the conversation panel and its styles are fetched on the first open.
 * Keyboard shortcut: N (no modifier, ignored while typing or in a dialog).
 */
export function NovaDock({ locale, open, onOpenChange, reducedMotion, canGreet, canTravel, onTravel, onOpenParents }: NovaDockProps) {
  const t = NOVA_DOCK_TEXT[locale];
  const [loaded, setLoaded] = useState(open);
  const [met, setMet] = useState(readNovaMet);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);

  if (open && !loaded) setLoaded(true);

  const markMet = () => {
    if (!met) {
      writeNovaMet();
      setMet(true);
    }
  };

  const openNova = () => {
    markMet();
    onOpenChange(true);
  };

  // N toggles Nova; never steals keys while the child types or a modal is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'n' && event.key !== 'N') return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (isEditableTarget(event.target)) return;
      if (!open && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      if (!open) {
        writeNovaMet();
        setMet(true);
      }
      onOpenChange(!open);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  // Give focus back to the dock button when Nova closes.
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const showGreeting = canGreet && !met && !open;

  return (
    <>
      {showGreeting && (
        <div className="nova-greeting" data-scene-obstacle role="region" aria-label={t.greetingTitle} aria-live="polite">
          <p className="nova-greeting__kicker">{t.greetingTitle}</p>
          <p className="nova-greeting__text">{t.greeting}</p>
          <p className="nova-greeting__rule">{t.goldenRule}</p>
          <div className="nova-greeting__actions">
            <button type="button" className="nova-greeting__cta" onClick={openNova}>{t.greetingCta}</button>
            <button type="button" className="nova-greeting__later" onClick={markMet}>{t.greetingDismiss}</button>
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        className={`nova-dock${showGreeting ? ' nova-dock--greeting' : ''}`}
        data-scene-obstacle
        hidden={open}
        aria-label={`${t.open}. ${t.shortcutHint}`}
        aria-keyshortcuts="N"
        aria-expanded={open}
        onClick={openNova}
      >
        <NovaAvatar mood={showGreeting ? 'happy' : 'idle'} size={50} />
        <span className="nova-dock__name" aria-hidden="true">Nova</span>
        <kbd className="nova-dock__kbd" aria-hidden="true">N</kbd>
      </button>

      {loaded && (
        <Suspense fallback={open ? <p className="nova-dock__loading" role="status">{t.loading}</p> : null}>
          <NovaPanel
            locale={locale}
            open={open}
            reducedMotion={reducedMotion}
            onClose={() => onOpenChange(false)}
            canTravel={canTravel}
            onTravel={onTravel}
            onOpenParents={onOpenParents}
          />
        </Suspense>
      )}
    </>
  );
}
