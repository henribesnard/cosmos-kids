import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAssistant } from '../../assistant/useAssistant';
import type { AssistantMessage, AssistantPhase, ReadingLevel } from '../../assistant/types';
import type { Locale } from '../../data/types';
import { publish } from '../../domain/events';
import { useCosmosStore } from '../../store/useCosmosStore';
import '../../styles/assistant.css';
import { NovaAvatar, type NovaMood } from './NovaAvatar';
import { ChildMessage, NovaMessage, type GuessState } from './NovaMessage';
import { NOVA_SHEET_QUERY, useFocusTrap, useMediaQuery, useOnline, useSpeech } from './novaHooks';
import { NOVA_TEXT } from './novaText';
import { isJourneyPhase, moodForMessage, moodForPhase, questionFor, RECHARGE_MS, specialCaseOf } from './novaUtils';
import { VerificationJourney } from './VerificationJourney';

export interface NovaPanelProps {
  readonly locale: Locale;
  readonly open: boolean;
  readonly reducedMotion: boolean;
  readonly onClose: () => void;
  readonly canTravel: (destinationId: string) => boolean;
  readonly onTravel: (destinationId: string) => void;
  readonly onOpenParents: () => void;
}

const LEVELS: readonly ReadingLevel[] = ['simple', 'curious', 'expert'];
const NOT_REVEALED: GuessState = { revealed: false };

function lastNovaMessage(messages: readonly AssistantMessage[]): AssistantMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'nova') return messages[i];
  }
  return undefined;
}

/**
 * Nova's conversation panel. Loaded lazily on the first opening and then kept
 * mounted (hidden) so the conversation survives closing and re-opening.
 * Desktop: non-modal side panel (complementary). Tablet/mobile: modal bottom
 * sheet (dialog) with a focus trap.
 */
export default function NovaPanel({ locale, open, reducedMotion, onClose, canTravel, onTravel, onOpenParents }: NovaPanelProps) {
  const assistant = useAssistant();
  const { messages, phase, suggestions, remainingQuestions, readingLevel } = assistant;
  const t = NOVA_TEXT[locale];
  const isSheet = useMediaQuery(NOVA_SHEET_QUERY);
  const online = useOnline();
  const speech = useSpeech(locale);
  const selectedObjectId = useCosmosStore((state) => state.selectedObjectId);

  const titleId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const reducedMotionRef = useRef(reducedMotion);
  const lastMessageId = messages[messages.length - 1]?.id;

  const [draft, setDraft] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [arrivals, setArrivals] = useState<Readonly<Record<string, AssistantPhase>>>({});
  const [guesses, setGuesses] = useState<Readonly<Record<string, GuessState>>>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  // Remember the phase in which each Nova message arrived (rate-limited vs error).
  const lastNova = lastNovaMessage(messages);
  if (lastNova && !(lastNova.id in arrivals)) {
    setArrivals({ ...arrivals, [lastNova.id]: phase });
  }

  const busy = isJourneyPhase(phase);
  const lastSpecial = lastNova ? specialCaseOf(lastNova, arrivals[lastNova.id] ?? phase, online) : null;
  const recharging = lastSpecial === 'rate-limited' && lastNova !== undefined && now < lastNova.createdAt + RECHARGE_MS;
  const lastGated = lastNova?.guessFirst === true && !lastSpecial && !(guesses[lastNova.id]?.revealed ?? false);
  const canSend = !busy && !recharging && online && remainingQuestions !== 0;

  useFocusTrap(rootRef, open && isSheet);

  // Tick the clock while the solar panels recharge.
  useEffect(() => {
    if (!recharging) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [recharging]);

  // Move focus into Nova when it opens (heading on sheets to avoid popping the keyboard).
  useEffect(() => {
    if (!open) return;
    const target = isSheet ? titleRef.current : inputRef.current;
    target?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [open]);

  // Stop reading aloud when the panel closes.
  const stopSpeech = speech.stop;
  useEffect(() => {
    if (!open) stopSpeech();
  }, [open, stopSpeech]);

  // Keep each arriving message at the top of the conversation list.
  useEffect(() => {
    const log = logRef.current;
    const last = log?.lastElementChild as HTMLElement | null | undefined;
    if (!log || !last) return;

    const logTop = log.getBoundingClientRect().top;
    const lastTop = last.getBoundingClientRect().top;
    log.scrollTo({
      top: Math.max(0, log.scrollTop + lastTop - logTop),
      behavior: reducedMotionRef.current ? 'auto' : 'smooth',
    });
  }, [lastMessageId]);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || !canSend) return;
    publish({ type: 'ASSISTANT_QUESTION_ASKED', topicId: selectedObjectId });
    setDraft('');
    void assistant.ask(question);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  };

  const onRootKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  const travel = (destinationId: string) => {
    if (isSheet) onClose();
    onTravel(destinationId);
  };

  const resetConversation = () => {
    speech.stop();
    assistant.reset();
    setGuesses({});
    setArrivals({});
    setDraft('');
    inputRef.current?.focus();
  };

  const headerMood: NovaMood = (busy ? moodForPhase(phase) : null)
    ?? (!online ? 'offline' : null)
    ?? (inputFocused && draft ? 'listening' : null)
    ?? (lastNova ? moodForMessage(lastNova, lastSpecial) : 'idle');

  const chips = busy || lastGated || lastSpecial === 'safety'
    ? []
    : (messages.length === 0
      ? suggestions
      : (lastNova?.followUps?.length ? lastNova.followUps : suggestions)
    ).slice(0, 3);
  const chipsLabel = messages.length === 0
    ? t.suggestionsLabel
    : lastSpecial === 'off-topic' ? t.offTopicBounce : t.followUpsLabel;
  const lastChild = [...messages].reverse().find((message) => message.role === 'child');
  const placeholder = t.placeholders[messages.length % t.placeholders.length];

  return (
    <>
      {isSheet && open && <div className="nova-scrim" aria-hidden="true" onClick={onClose} />}
      <section
        ref={rootRef}
        className={`nova-panel glass-panel ${isSheet ? 'nova-panel--sheet' : 'nova-panel--side'}`}
        hidden={!open}
        role={isSheet ? 'dialog' : 'complementary'}
        aria-modal={isSheet ? true : undefined}
        aria-labelledby={titleId}
        data-scene-obstacle
        onKeyDown={onRootKeyDown}
      >
        {isSheet && <span className="nova-panel__handle" aria-hidden="true" />}
        <header className="nova-panel__header">
          <NovaAvatar mood={headerMood} size={52} className="nova-panel__avatar" />
          <div className="nova-panel__heading">
            <h2 id={titleId} ref={titleRef} tabIndex={-1}>{t.title}</h2>
            <p>{t.subtitle}</p>
          </div>
          {messages.length > 0 && (
            <button type="button" className="icon-button nova-icon-btn" onClick={resetConversation} aria-label={t.newChat} title={t.newChat}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
          <button type="button" className="icon-button nova-icon-btn" onClick={onClose} aria-label={t.close} title={t.close}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>

        <div className="level-tabs nova-levels" role="radiogroup" aria-label={t.readingLevel}>
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={readingLevel === level}
              className={readingLevel === level ? 'is-active' : ''}
              onClick={() => assistant.setReadingLevel(level)}
            >
              {t.levels[level]}
            </button>
          ))}
        </div>

        <div className="nova-panel__scroll">
          {messages.length === 0 && !busy && (
            <div className="nova-empty">
              <p>{t.emptyIntro}</p>
              <p className="nova-golden-rule"><span aria-hidden="true">✦</span> {t.goldenRule}</p>
            </div>
          )}

          <ol ref={logRef} className="nova-log" role="log" aria-label={t.conversationLabel}>
            {messages.map((message, index) => {
              if (message.role === 'child') return <ChildMessage key={message.id} message={message} locale={locale} />;
              const arrival = arrivals[message.id] ?? (message === lastNova ? phase : undefined);
              const special = specialCaseOf(message, arrival, online);
              const question = questionFor(messages, index);
              const isLast = message === lastNova;
              return (
                <NovaMessage
                  key={message.id}
                  message={message}
                  question={question}
                  locale={locale}
                  special={special}
                  arrivalPhase={arrival}
                  guess={guesses[message.id] ?? NOT_REVEALED}
                  isLast={isLast}
                  now={now}
                  speech={speech}
                  canTravel={canTravel}
                  onTravel={travel}
                  onReveal={(guess) => setGuesses((current) => ({ ...current, [message.id]: { revealed: true, guess } }))}
                  onRetry={isLast && (special === 'error' || special === 'offline') && question ? () => send(question) : null}
                />
              );
            })}
          </ol>

          {busy && isJourneyPhase(phase) && (
            <VerificationJourney key={lastChild?.id ?? 'journey'} phase={phase} locale={locale} reducedMotion={reducedMotion} />
          )}

          {chips.length > 0 && (
            <div className="nova-chips" role="group" aria-label={chipsLabel}>
              <span className="nova-chips__label" aria-hidden="true">{chipsLabel}</span>
              {chips.map((chip) => (
                <button key={chip} type="button" className="nova-chip" disabled={!canSend} onClick={() => send(chip)}>
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className="nova-panel__footer">
          {!online && (
            <p className="nova-offline" role="status">
              <NovaAvatar mood="offline" size={28} />
              {t.offlineBanner}
            </p>
          )}
          <form className="nova-form" onSubmit={onSubmit}>
            <label htmlFor={inputId} className="sr-only">{t.inputLabel}</label>
            <textarea
              id={inputId}
              ref={inputRef}
              className="nova-form__input"
              rows={1}
              maxLength={500}
              value={draft}
              placeholder={placeholder}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onInputKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              aria-describedby={remainingQuestions !== null ? `${inputId}-remaining` : undefined}
            />
            <button type="submit" className="nova-form__send" disabled={!canSend || !draft.trim()} aria-label={busy ? t.sending : t.send}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12 20 4l-5 16-3.5-6.5z" fill="currentColor" /></svg>
            </button>
          </form>
          <div className="nova-panel__meta">
            {remainingQuestions !== null && (
              <span
                id={`${inputId}-remaining`}
                className={`nova-remaining${remainingQuestions <= 3 || recharging ? ' nova-remaining--low' : ''}`}
              >
                <span aria-hidden="true">{recharging ? '☀' : '⚡'}</span>{' '}
                {recharging && lastNova
                  ? t.rechargeCountdown(Math.min(RECHARGE_MS / 1000, Math.max(1, Math.ceil((lastNova.createdAt + RECHARGE_MS - now) / 1000))))
                  : remainingQuestions > 0 ? t.remaining(remainingQuestions) : t.remainingNone}
              </span>
            )}
            <button
              type="button"
              className="nova-parents-link"
              onClick={() => {
                if (isSheet) onClose();
                onOpenParents();
              }}
            >
              {t.parentsLink}
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
