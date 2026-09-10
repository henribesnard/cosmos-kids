import type { Locale } from '../app/uiTypes';
import type { Precedent } from '../data/journeyTypes';

interface PrecedentCardProps {
  kind: 'human' | 'robot';
  precedent: Precedent;
  locale: Locale;
}

function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: undefined,
  });
}

export function PrecedentCard({ kind, precedent, locale }: PrecedentCardProps) {
  const fr = locale === 'fr';
  const title = kind === 'human'
    ? (fr ? 'Un humain l\u2019a-t-il fait\u00A0?' : 'Has a human done it?')
    : (fr ? 'Un robot l\u2019a-t-il fait\u00A0?' : 'Has a robot done it?');
  const icon = kind === 'human' ? '👩‍🚀' : '🤖';
  const answer = precedent.achieved
    ? (fr ? 'Oui' : 'Yes')
    : (fr ? 'Non' : 'No');

  return (
    <div className={`precedent-card ${precedent.achieved ? 'precedent-card--yes' : 'precedent-card--no'}`}>
      <div className="precedent-card__header">
        <span className="precedent-card__icon" aria-hidden="true">{icon}</span>
        <span className="precedent-card__title">{title}</span>
        <span className={`precedent-card__answer ${precedent.achieved ? 'precedent-card__answer--yes' : 'precedent-card__answer--no'}`}>
          {answer}
        </span>
      </div>
      {precedent.firstMission && (
        <p className="precedent-card__mission">
          {precedent.firstMission}
          {precedent.firstDate && ` — ${formatDate(precedent.firstDate, locale)}`}
        </p>
      )}
      {precedent.count != null && (
        <p className="precedent-card__count">
          {kind === 'human'
            ? (fr ? `${precedent.count} personnes` : `${precedent.count} people`)
            : (fr ? `${precedent.count} engins ou missions` : `${precedent.count} spacecraft or missions`)}
        </p>
      )}
      {precedent.latestMission && (
        <p className="precedent-card__latest">
          {fr ? 'Plus récent : ' : 'Latest: '}{precedent.latestMission}
          {precedent.latestDate && ` — ${formatDate(precedent.latestDate, locale)}`}
        </p>
      )}
      <p className="precedent-card__note">{precedent.note[locale]}</p>
      <a className="precedent-card__source" href={precedent.source.url} target="_blank" rel="noreferrer">
        {precedent.source.label}
      </a>
    </div>
  );
}
