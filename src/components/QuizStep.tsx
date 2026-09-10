import { useId, useState } from 'react';
import type { QuizDef } from '../data/journeyTypes';
import type { Locale } from '../data/types';
import { publish } from '../domain/events';

interface QuizStepProps {
  readonly stepId: string;
  readonly quiz: QuizDef;
  readonly locale: Locale;
  readonly isDone?: boolean;
}

export function QuizStep({ stepId, quiz, locale, isDone = false }: QuizStepProps) {
  const feedbackId = useId();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedIsCorrect = selectedIndex === quiz.correctIndex;
  const showExplanation = selectedIndex !== null || isDone;
  const locked = isDone || selectedIsCorrect;
  const feedbackClass =
    selectedIsCorrect || (isDone && selectedIndex === null)
      ? 'quiz-step__feedback--correct'
      : 'quiz-step__feedback--wrong';

  const answer = (index: number) => {
    if (locked) return;

    const correct = index === quiz.correctIndex;
    setSelectedIndex(index);
    publish({ type: 'QUIZ_ANSWERED', stepId, correct });
  };

  return (
    <div className={`quiz-step${isDone ? ' quiz-step--done' : ''}`}>
      <p className="quiz-step__prompt">{quiz.prompt[locale]}</p>
      <ul className="quiz-step__options">
        {quiz.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const revealCorrect = showExplanation && index === quiz.correctIndex;
          const classNames = [
            'quiz-step__option',
            revealCorrect ? 'quiz-step__option--correct' : '',
            isSelected && !selectedIsCorrect ? 'quiz-step__option--wrong' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <li key={index}>
              <button
                aria-describedby={showExplanation ? feedbackId : undefined}
                aria-pressed={isSelected}
                className={classNames}
                disabled={locked}
                onClick={() => answer(index)}
                type="button"
              >
                {option[locale]}
              </button>
            </li>
          );
        })}
      </ul>
      {showExplanation ? (
        <div
          className={`quiz-step__feedback ${feedbackClass}`}
          id={feedbackId}
          role="status"
          aria-live="polite"
        >
          {selectedIndex !== null ? (
            <strong>
              {selectedIsCorrect
                ? locale === 'fr'
                  ? 'Bonne réponse !'
                  : 'Correct!'
                : locale === 'fr'
                  ? 'Essaie encore.'
                  : 'Try again.'}
            </strong>
          ) : null}
          <p className="quiz-step__explain">{quiz.explain[locale]}</p>
        </div>
      ) : null}
      {quiz.source ? (
        <a className="quiz-step__source" href={quiz.source.url} target="_blank" rel="noreferrer">
          {locale === 'fr' ? 'Source : ' : 'Source: '}{quiz.source.label}
        </a>
      ) : null}
    </div>
  );
}
