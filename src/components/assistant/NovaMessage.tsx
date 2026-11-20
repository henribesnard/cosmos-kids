import type { AssistantMessage, AssistantPhase, ReadingLevel } from '../../assistant/types';
import type { Locale } from '../../data/types';
import { useCosmosStore } from '../../store/useCosmosStore';
import { GuessFirstCard } from './GuessFirstCard';
import { NovaAvatar } from './NovaAvatar';
import { NOVA_TEXT, type SpecialCase } from './novaText';
import type { SpeechControls } from './novaHooks';
import { moodForMessage, rechargeLeftSeconds, rechargeSecondsOf } from './novaUtils';
import { TruthSeal } from './TruthSeal';

export type GuessState = { readonly revealed: false } | { readonly revealed: true; readonly guess: string | null };

interface NovaMessageProps {
  readonly message: AssistantMessage;
  readonly question: string | null;
  readonly locale: Locale;
  readonly readingLevel?: ReadingLevel;
  readonly special: SpecialCase | null;
  readonly arrivalPhase: AssistantPhase | undefined;
  readonly guess: GuessState;
  readonly isLast: boolean;
  readonly now: number;
  readonly speech: SpeechControls;
  readonly canTravel: (destinationId: string) => boolean;
  readonly onTravel: (destinationId: string) => void;
  readonly onReveal: (guess: string | null) => void;
  readonly onRetry: (() => void) | null;
}

export function ChildMessage({ message, locale }: { message: AssistantMessage; locale: Locale }) {
  return (
    <li className="nova-msg nova-msg--child">
      <span className="sr-only">{NOVA_TEXT[locale].you} : </span>
      <p className="nova-bubble nova-bubble--child">{message.text}</p>
    </li>
  );
}

export function NovaMessage({
  message,
  question,
  locale,
  readingLevel = 'curious',
  special,
  guess,
  isLast,
  now,
  speech,
  canTravel,
  onTravel,
  onReveal,
  onRetry,
}: NovaMessageProps) {
  const t = NOVA_TEXT[locale];
  const mysteries = useCosmosStore((state) => state.mysteries);
  const addMystery = useCosmosStore((state) => state.addMystery);
  const mood = moodForMessage(message, special);
  const gated = message.guessFirst === true && !special && !guess.revealed;
  const text = message.text.trim() || (special ? t.special[special].fallback : '');
  const travelActions = (message.actions ?? []).filter((action) => action.kind === 'travel' && canTravel(action.destinationId));
  const mysteryQuestion = question ?? text;
  const mysteryKept = mysteries.some((mystery) => mystery.question === mysteryQuestion);
  const rechargeTotal = rechargeSecondsOf(message);
  const rechargeLeft = special === 'rate-limited' && isLast ? rechargeLeftSeconds(message, now) : 0;

  return (
    <li className={`nova-msg nova-msg--nova${special ? ` nova-msg--${special}` : ''}`} data-message-id={message.id}>
      <NovaAvatar mood={mood} size={38} className="nova-msg__avatar" />
      <div className="nova-bubble nova-bubble--nova">
        <p className="nova-bubble__kicker">
          <span>{t.nova}</span>
          {special && <span className={`nova-tag nova-tag--${special}`}>{t.special[special].tag}</span>}
        </p>

        {gated ? (
          <GuessFirstCard
            question={question}
            locale={locale}
            choices={message.guessChoices}
            readingLevel={readingLevel}
            onReveal={onReveal}
          />
        ) : (
          <>
            {guess.revealed && guess.guess && (
              <div className="nova-guess-recap">
                <p>{t.guessYours(guess.guess)}</p>
                <p>{t.guessCompare}</p>
              </div>
            )}
            {message.privacyNote && !special && (
              <p className="nova-privacy-note">
                <span aria-hidden="true">🔒</span> <span className="sr-only">{t.privacyNoteLabel} : </span>{message.privacyNote}
              </p>
            )}
            <p className="nova-bubble__text">{text}</p>

            {special === 'privacy' && (
              <ul className="nova-privacy" aria-label={t.special.privacy.tag}>
                {t.privacyTips.map((tip) => (
                  <li key={tip}><span aria-hidden="true">🔒</span> {tip}</li>
                ))}
              </ul>
            )}
            {special === 'safety' && <p className="nova-safety">{t.safetyAdults}</p>}
            {special === 'rate-limited' && isLast && (
              rechargeLeft > 0 ? (
                <div className="nova-recharge" role="timer" aria-live="off">
                  <span className="nova-recharge__bar" style={{ '--nova-charge': 1 - rechargeLeft / rechargeTotal } as React.CSSProperties} />
                  <small>{t.rechargeCountdown(rechargeLeft)}</small>
                </div>
              ) : (
                <p className="nova-recharge nova-recharge--done" role="status">{t.rechargeDone}</p>
              )
            )}

            {message.status && !special && (
              <TruthSeal status={message.status} claims={message.claims ?? []} sources={message.sources ?? []} locale={locale} />
            )}

            <div className="nova-actions">
              {travelActions.map((action) => (
                <button key={action.destinationId} type="button" className="nova-btn nova-btn--primary" onClick={() => onTravel(action.destinationId)}>
                  <span aria-hidden="true">🚀</span> {t.takeMe}
                  <span className="nova-btn__detail">{action.label}</span>
                </button>
              ))}
              {(message.status === 'unknown' || message.status === 'debated') && !special && (
                <button
                  type="button"
                  className="nova-btn nova-btn--mystery"
                  disabled={mysteryKept}
                  onClick={() => addMystery(mysteryQuestion, locale)}
                >
                  <span aria-hidden="true">{mysteryKept ? '✓' : '✦'}</span> {mysteryKept ? t.mysteryKept : t.keepMystery}
                </button>
              )}
              {onRetry && (
                <button type="button" className="nova-btn nova-btn--secondary" onClick={onRetry}>
                  <span aria-hidden="true">↻</span> {t.retry}
                </button>
              )}
              {speech.supported && text && (
                <button
                  type="button"
                  className="nova-btn nova-btn--ghost"
                  aria-pressed={speech.speakingId === message.id}
                  onClick={() => speech.toggle(message.id, text)}
                >
                  <span aria-hidden="true">{speech.speakingId === message.id ? '■' : '🔊'}</span>
                  {speech.speakingId === message.id ? t.stopListening : t.listen}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
