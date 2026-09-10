import { useMemo } from 'react';
import type { Locale } from '../app/uiTypes';
import type { DurationEntry, DistanceSpec } from '../data/journeyTypes';
import { JOURNEY_UI_TEXT } from '../data/journeyUiText';
import { SPEED_KM_PER_S, formatDurationForKids } from '../domain/travelTime';

interface TravelTimeComparatorProps {
  durations: readonly DurationEntry[];
  distance: DistanceSpec;
  locale: Locale;
  reducedMotion?: boolean;
}

const vehicleLabels: Record<string, { fr: string; en: string }> = {
  light: { fr: 'Lumière', en: 'Light' },
  walking: { fr: 'À pied', en: 'Walking' },
  car: { fr: 'Voiture', en: 'Car' },
  airliner: { fr: 'Avion', en: 'Airliner' },
  apollo: { fr: 'Apollo', en: 'Apollo' },
  'voyager-1': { fr: 'Voyager 1', en: 'Voyager 1' },
  'parker-solar-probe': { fr: 'Parker Solar Probe', en: 'Parker Solar Probe' },
  'real-mission': { fr: 'Mission réelle', en: 'Real mission' },
};

const vehicleEmoji: Record<string, string> = {
  light: '💡',
  walking: '🚶',
  car: '🚗',
  airliner: '✈️',
  apollo: '🚀',
  'voyager-1': '🛸',
  'parker-solar-probe': '☀️',
  'real-mission': '🚀',
};

function resolveSeconds(entry: DurationEntry, distance: DistanceSpec): number | null {
  if (entry.seconds != null) return entry.seconds;
  const speed = SPEED_KM_PER_S[entry.vehicle];
  if (speed == null) return null;
  const km = distance.kind === 'fixed'
    ? distance.value.value
    : distance.typical.value;
  return km / speed;
}

export function TravelTimeComparator({ durations, distance, locale, reducedMotion }: TravelTimeComparatorProps) {
  const fr = locale === 'fr';

  const entries = useMemo(() => {
    const resolved = durations.map((d) => ({
      ...d,
      resolvedSeconds: resolveSeconds(d, distance),
    }));
    return resolved.filter((e) => e.resolvedSeconds != null && Number.isFinite(e.resolvedSeconds));
  }, [durations, distance]);

  const maxSeconds = Math.max(0, ...entries.map((e) => e.resolvedSeconds!));
  const positiveSeconds = entries.map((e) => e.resolvedSeconds!).filter((s) => s > 0);
  const minSeconds = positiveSeconds.length > 0 ? Math.min(...positiveSeconds) : 0;

  // Use logarithmic scale when ratio > 1000
  const ratio = maxSeconds / (minSeconds || 1);
  const useLog = ratio > 1000;

  const barWidth = (seconds: number): number => {
    if (seconds <= 0) return 0;
    if (useLog) {
      const logMin = Math.log10(minSeconds);
      const logMax = Math.log10(maxSeconds);
      const logRange = logMax - logMin || 1;
      return ((Math.log10(seconds) - logMin) / logRange) * 100;
    }
    return (seconds / maxSeconds) * 100;
  };

  return (
    <div className="travel-comparator" role="table" aria-label={fr ? 'Comparaison des durées de trajet' : 'Travel time comparison'}>
      {useLog && (
        <p className="travel-comparator__note">
          {JOURNEY_UI_TEXT.logarithmicScaleDisclaimer[locale]}
        </p>
      )}
      {entries.map((entry, i) => {
        const label = entry.label?.[locale] ?? vehicleLabels[entry.vehicle]?.[locale] ?? entry.vehicle;
        const emoji = vehicleEmoji[entry.vehicle] ?? '🚀';
        const seconds = entry.resolvedSeconds!;
        const formatted = `${entry.approximate ? '≈ ' : ''}${formatDurationForKids(seconds, locale)}`;
        const width = barWidth(seconds);

        return (
          <div className="travel-comparator__row" key={`${entry.vehicle}-${i}`} role="row">
            <div className="travel-comparator__label" role="rowheader">
              <span aria-hidden="true">{emoji}</span> {label}
            </div>
            <div className="travel-comparator__bar-track">
              <div
                className="travel-comparator__bar-fill"
                style={{
                  width: `${width}%`,
                  transition: reducedMotion ? 'none' : undefined,
                }}
                role="cell"
                aria-label={formatted}
              />
            </div>
            <div className="travel-comparator__value" role="cell">{formatted}</div>
            {entry.note && (
              <p className="travel-comparator__caveat">{entry.note[locale]}</p>
            )}
            {entry.source && (
              <a className="travel-comparator__source" href={entry.source.url} target="_blank" rel="noreferrer">
                {locale === 'fr' ? 'Source : ' : 'Source: '}{entry.source.label}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
