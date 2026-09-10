import type { LocalizedText } from './types';
import type { JourneyFeasibility } from './journeyTypes';

const localized = (fr: string, en: string): LocalizedText => ({ fr, en });

/** Route-level copy kept out of components, alongside the journey catalogue. */
export const JOURNEY_UI_TEXT = {
  listPrompt: localized(
    'Choisis un trajet et découvre l’Univers !',
    'Pick a journey and discover the Universe!',
  ),
  simulationDisclaimer: localized(
    'Simulation — visualisation éducative, pas un voyage réalisable.',
    'Simulation — an educational visualization, not a feasible journey.',
  ),
  sceneSimulationBadge: localized(
    'Simulation · visualisation éducative',
    'Simulation · educational visualization',
  ),
  logarithmicScaleDisclaimer: localized(
    '⚠️ L’échelle n’est pas linéaire (logarithmique) — les barres ne sont pas proportionnelles.',
    '⚠️ Scale is not linear (logarithmic) — bars are not proportional.',
  ),
  legacyVisitDate: localized(
    'Visite issue d’une ancienne sauvegarde',
    'Visit from an older save',
  ),
  emptyLog: localized(
    'Ton carnet est encore vide. Explore un monde pour y noter ta première découverte.',
    'Your logbook is empty. Explore a world to record your first discovery.',
  ),
} as const satisfies Record<string, LocalizedText>;

export const FEASIBILITY_LABELS: Readonly<Record<JourneyFeasibility, LocalizedText>> = {
  'done-by-humans': localized(
    'Des humains l’ont vraiment fait.',
    'Humans have really done it.',
  ),
  'done-by-robots-only': localized(
    'Seules des machines y sont allées.',
    'Only machines have been there.',
  ),
  'out-of-reach': localized(
    'C’est possible en théorie, mais beaucoup trop loin pour nos machines.',
    'It is theoretically possible, but far too distant for our machines.',
  ),
  'impossible-today': localized(
    'Personne ne peut le faire, et personne ne pourrait revenir.',
    'Nobody can do it, and nobody could come back.',
  ),
  'do-it-tonight': localized(
    'Tu peux le faire ce soir, sans rien acheter.',
    'You can do it tonight, without buying anything.',
  ),
};
