import type { JourneyLeg } from '../data/journeyTypes';
import type { Locale } from '../data/types';
import { formatDistanceForKids } from '../domain/travelTime';

interface JourneyLegTrackProps {
  readonly legs: readonly JourneyLeg[];
  readonly locale: Locale;
}

interface ReferenceLike {
  readonly url?: string;
  readonly sourceUrl?: string;
  readonly label?: string;
  readonly attribution?: string;
  readonly retrievedAt?: string;
}

type SourcedQuantity = NonNullable<JourneyLeg['atDistance']> & {
  readonly approximate?: boolean;
  readonly source?: ReferenceLike;
  readonly sourceUrl?: string;
  readonly attribution?: string;
  readonly retrievedAt?: string;
};

type SourcedJourneyLeg = JourneyLeg & {
  readonly approximate?: boolean;
  readonly source?: ReferenceLike;
  readonly sourceUrl?: string;
  readonly attribution?: string;
  readonly retrievedAt?: string;
};

interface SourceDisplay {
  readonly url: string;
  readonly label: string;
  readonly retrievedAt?: string;
}

function resolveSource(leg: JourneyLeg, locale: Locale): SourceDisplay | null {
  const sourcedLeg = leg as SourcedJourneyLeg;
  const quantity = leg.atDistance as SourcedQuantity | undefined;
  const reference = quantity?.source ?? sourcedLeg.source;
  const url = reference?.url ?? reference?.sourceUrl ?? quantity?.sourceUrl ?? sourcedLeg.sourceUrl;

  if (!url) return null;

  return {
    url,
    label:
      reference?.label ??
      reference?.attribution ??
      quantity?.attribution ??
      sourcedLeg.attribution ??
      (locale === 'fr' ? 'Source' : 'Source'),
    retrievedAt: reference?.retrievedAt ?? quantity?.retrievedAt ?? sourcedLeg.retrievedAt,
  };
}

function distanceLabel(leg: JourneyLeg, locale: Locale): string | null {
  if (!leg.atDistance) return null;

  const quantity = leg.atDistance as SourcedQuantity;
  const approximate = quantity.approximate || (leg as SourcedJourneyLeg).approximate;
  const formatted = formatDistanceForKids(quantity.value, locale);
  return approximate ? `≈ ${formatted}` : formatted;
}

export function JourneyLegTrack({ legs, locale }: JourneyLegTrackProps) {
  if (legs.length === 0) return null;

  return (
    <ol className="journey-leg-track">
      {legs.map((leg, index) => {
        const distance = distanceLabel(leg, locale);
        const source = resolveSource(leg, locale);

        return (
          <li className="journey-leg-track__item" key={leg.id}>
            <span className="journey-leg-track__marker" aria-hidden="true">
              {index + 1}
            </span>
            <div className="journey-leg-track__content">
              <span className="journey-leg-track__label">{leg.label[locale]}</span>
              {distance ? (
                <span className="journey-leg-track__distance">{distance}</span>
              ) : null}
              <p className="journey-leg-track__encounter">{leg.encounter[locale]}</p>
              {source ? (
                <a
                  className="journey-leg-track__source"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                  title={
                    source.retrievedAt
                      ? `${locale === 'fr' ? 'Consulté le' : 'Retrieved'} ${source.retrievedAt}`
                      : undefined
                  }
                >
                  {locale === 'fr' ? 'Source : ' : 'Source: '}
                  {source.label}
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
