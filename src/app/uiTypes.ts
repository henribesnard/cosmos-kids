import type { MissionStepTarget } from '../data/journeyTypes';
import type { LocalizedText } from '../data/types';

export type { Locale, LocalizedText } from '../data/types';

export interface ObjectDisplay {
  id: MissionStepTarget;
  name: LocalizedText;
  kind: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  curious: LocalizedText;
  expert: LocalizedText;
  color: string;
  symbol: string;
  facts: Array<{
    label: LocalizedText;
    value: LocalizedText;
  }>;
  sourceUrl?: string;
  sourceLabel?: string;
}

export type OverlayName = 'search' | 'compare' | 'credits' | null;
