import type { Locale } from '../app/uiTypes';
import type { JourneyFeasibility } from '../data/journeyTypes';
import { FEASIBILITY_LABELS } from '../data/journeyUiText';

interface FeasibilityBadgeProps {
  feasibility: JourneyFeasibility;
  locale: Locale;
}

const classNames: Record<JourneyFeasibility, string> = {
  'done-by-humans': 'feasibility-badge--humans',
  'done-by-robots-only': 'feasibility-badge--robots',
  'out-of-reach': 'feasibility-badge--out-of-reach',
  'impossible-today': 'feasibility-badge--impossible',
  'do-it-tonight': 'feasibility-badge--tonight',
};

const icons: Record<JourneyFeasibility, string> = {
  'done-by-humans': '👩‍🚀',
  'done-by-robots-only': '🤖',
  'out-of-reach': '🔭',
  'impossible-today': '⚠️',
  'do-it-tonight': '🌟',
};

export function FeasibilityBadge({ feasibility, locale }: FeasibilityBadgeProps) {
  return (
    <span className={`feasibility-badge ${classNames[feasibility]}`}>
      <span className="feasibility-badge__icon" aria-hidden="true">{icons[feasibility]}</span>
      <span className="feasibility-badge__label">{FEASIBILITY_LABELS[feasibility][locale]}</span>
    </span>
  );
}
