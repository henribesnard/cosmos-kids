import { useId, useRef, useState } from 'react';
import type { MissionStepDef } from '../data/journeyTypes';
import type { Locale } from '../data/types';
import { publish } from '../domain/events';

type RealWorldDefinition = Extract<MissionStepDef, { kind: 'real-world' }>;

interface RealWorldStepProps {
  readonly stepId: string;
  readonly checklist: RealWorldDefinition['checklist'];
  readonly locale: Locale;
  readonly isDone?: boolean;
}

export function RealWorldStep({
  stepId,
  checklist,
  locale,
  isDone = false,
}: RealWorldStepProps) {
  return (
    <RealWorldChecklist
      key={stepId}
      stepId={stepId}
      checklist={checklist}
      locale={locale}
      isDone={isDone}
    />
  );
}

function RealWorldChecklist({ stepId, checklist, locale, isDone = false }: RealWorldStepProps) {
  const groupId = useId();
  const [checked, setChecked] = useState<boolean[]>(() => checklist.map(() => isDone));
  const checkedRef = useRef(checked);
  const publishedRef = useRef(isDone);

  const updateItem = (index: number, value: boolean) => {
    if (isDone) return;

    const next = [...checkedRef.current];
    next[index] = value;
    checkedRef.current = next;
    setChecked(next);

    if (next.length > 0 && next.every(Boolean) && !publishedRef.current) {
      publishedRef.current = true;
      publish({ type: 'REAL_WORLD_CHECKED', stepId });
    }
  };

  const displayedChecks = isDone ? checklist.map(() => true) : checked;
  const allChecked = displayedChecks.length > 0 && displayedChecks.every(Boolean);

  return (
    <fieldset className="real-world-step" disabled={isDone}>
      <legend className="real-world-step__legend">
        {locale === 'fr' ? 'Checklist dans le monde réel' : 'Real-world checklist'}
      </legend>
      <ul className="real-world-step__list">
        {checklist.map((item, index) => {
          const inputId = `${groupId}-${index}`;
          return (
            <li className="real-world-step__list-item" key={index}>
              <input
                checked={displayedChecks[index] ?? false}
                id={inputId}
                onChange={(event) => updateItem(index, event.currentTarget.checked)}
                type="checkbox"
              />
              <label className="real-world-step__item" htmlFor={inputId}>
                {item[locale]}
              </label>
            </li>
          );
        })}
      </ul>
      {allChecked ? (
        <p className="real-world-step__complete" role="status" aria-live="polite">
          {locale === 'fr' ? 'Checklist terminée !' : 'Checklist complete!'}
        </p>
      ) : null}
    </fieldset>
  );
}
