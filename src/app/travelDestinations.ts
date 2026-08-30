import {
  DEEP_SKY_BY_ID,
  isCelestialObjectId,
  isDeepSkyObjectId,
  SOLAR_SYSTEM_BODY_BY_ID,
  type Locale,
} from '../data';
import type { TravelDestinationId } from '../store';

const TRAVEL_VIEW_NAMES = {
  solar: { fr: 'Syst\u00E8me solaire', en: 'Solar System' },
  milkyway: { fr: 'Voie lact\u00E9e', en: 'Milky Way' },
  localgroup: { fr: 'Groupe local de galaxies', en: 'Local Group of galaxies' },
} as const;

export function travelDestinationName(destinationId: TravelDestinationId, locale: Locale): string | null {
  if (destinationId === 'solar' || destinationId === 'milkyway' || destinationId === 'localgroup') {
    return TRAVEL_VIEW_NAMES[destinationId][locale];
  }
  if (isCelestialObjectId(destinationId)) {
    return SOLAR_SYSTEM_BODY_BY_ID[destinationId].name[locale];
  }
  if (isDeepSkyObjectId(destinationId)) {
    return DEEP_SKY_BY_ID[destinationId].name[locale];
  }
  return null;
}
