import { useId, useState } from 'react';
import type { Locale } from '../../data/types';
import { NOVA_TEXT } from './novaText';

interface GuessFirstCardProps {
  readonly question: string | null;
  readonly locale: Locale;
  /** Called with the child's guess (or null when they skip). */
  readonly onReveal: (guess: string | null) => void;
}

/**
 * "Guess first!" — in the spirit of QuizStep: the child commits to a
 * hypothesis before Nova's answer is revealed. The answer is not in the DOM
 * until then, so screen readers cannot spoil it either.
 */
export function GuessFirstCard({ question, locale, onReveal }: GuessFirstCardProps) {
  const t = NOVA_TEXT[locale];
  const inputId = useId();
  const [guess, setGuess] = useState('');

  return (
    <form
      className="nova-guess"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = guess.trim();
        onReveal(trimmed ? trimmed.slice(0, 200) : null);
      }}
    >
      <p className="nova-guess__title">
        <span aria-hidden="true">💡</span> {t.guessTitle}
      </p>
      <p className="nova-guess__intro">{t.guessIntro}</p>
      {question && <p className="nova-guess__question">{t.quote(question)}</p>}
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
      <div className="nova-guess__actions">
        <button type="submit" className="nova-btn nova-btn--primary">{t.guessSubmit}</button>
        <button type="button" className="nova-btn nova-btn--ghost" onClick={() => onReveal(null)}>{t.guessSkip}</button>
      </div>
    </form>
  );
}
