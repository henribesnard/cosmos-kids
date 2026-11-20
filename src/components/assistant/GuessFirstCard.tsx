import { useId, useState } from 'react';
import type { ReadingLevel } from '../../assistant/types';
import type { Locale } from '../../data/types';
import { NOVA_TEXT } from './novaText';

interface GuessFirstCardProps {
  readonly question: string | null;
  readonly locale: Locale;
  /** Lot 2 — 2–3 hypotheses from the server (never verified, never facts). */
  readonly choices?: readonly string[];
  readonly readingLevel: ReadingLevel;
  /** Called with the child's guess (or null when they skip). */
  readonly onReveal: (guess: string | null) => void;
}

/**
 * "Guess first!" — in the spirit of QuizStep: the child commits to a
 * hypothesis before Nova's answer is revealed. The answer is not in the DOM
 * until then, so screen readers cannot spoil it either.
 *
 * Lot 2: with server choices, 7–9 year olds (simple level) pick one of the
 * big buttons; at the other levels the free field stays and the choices are
 * offered as small chips. Choices are framed as ideas, never as answers, and
 * none is ever marked right or wrong here: only the verified answer says so.
 */
export function GuessFirstCard({ question, locale, choices = [], readingLevel, onReveal }: GuessFirstCardProps) {
  const t = NOVA_TEXT[locale];
  const inputId = useId();
  const hintId = useId();
  const [guess, setGuess] = useState('');
  const usable = choices.filter((choice) => choice.trim()).slice(0, 3);
  const bigChoices = readingLevel === 'simple' && usable.length >= 2;

  const header = (
    <>
      <p className="nova-guess__title">
        <span aria-hidden="true">💡</span> {t.guessTitle}
      </p>
      <p className="nova-guess__intro">{t.guessIntro}</p>
      {question && <p className="nova-guess__question">{t.quote(question)}</p>}
    </>
  );

  if (bigChoices) {
    return (
      <div className="nova-guess nova-guess--choices">
        {header}
        <div className="nova-guess__choices" role="group" aria-label={t.guessChooseLabel} aria-describedby={hintId}>
          {usable.map((choice) => (
            <button key={choice} type="button" className="nova-guess__choice" onClick={() => onReveal(choice)}>
              {choice}
            </button>
          ))}
        </div>
        <p id={hintId} className="nova-guess__hint">{t.guessChoicesHint}</p>
        <div className="nova-guess__actions">
          <button type="button" className="nova-btn nova-btn--ghost" onClick={() => onReveal(null)}>{t.guessSkip}</button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="nova-guess"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = guess.trim();
        onReveal(trimmed ? trimmed.slice(0, 200) : null);
      }}
    >
      {header}
      <label className="nova-guess__label" htmlFor={inputId}>{t.guessLabel}</label>
      <input
        id={inputId}
        className="nova-guess__input"
        value={guess}
        maxLength={200}
        autoComplete="off"
        placeholder={t.guessPlaceholder}
        onChange={(event) => setGuess(event.target.value)}
      />
      {usable.length >= 2 && (
        <div className="nova-guess__mini" role="group" aria-label={t.guessOrChoose}>
          <span className="nova-guess__mini-label" aria-hidden="true">{t.guessOrChoose}</span>
          {usable.map((choice) => (
            <button key={choice} type="button" className="nova-chip nova-guess__mini-choice" onClick={() => onReveal(choice)}>
              {choice}
            </button>
          ))}
        </div>
      )}
      <div className="nova-guess__actions">
        <button type="submit" className="nova-btn nova-btn--primary">{t.guessSubmit}</button>
        <button type="button" className="nova-btn nova-btn--ghost" onClick={() => onReveal(null)}>{t.guessSkip}</button>
      </div>
    </form>
  );
}
