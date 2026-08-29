export type Locale = 'fr' | 'en';

export interface LocalizedText {
  fr: string;
  en: string;
}

export interface ObjectDisplay {
  id: string;
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

