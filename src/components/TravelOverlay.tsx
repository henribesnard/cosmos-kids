import type { Locale } from '../app/uiTypes';
import { Icon } from './Icon';

interface TravelOverlayProps {
  destinationId: string;
  locale: Locale;
  destinationName: string;
  progress: number;
  phase: string;
  reducedMotion: boolean;
  onSkip: () => void;
}

export function TravelOverlay({ destinationId, locale, destinationName, progress, phase, reducedMotion, onSkip }: TravelOverlayProps) {
  const fr = locale === 'fr';
  const phaseLabels: Record<string, [string, string]> = {
    preparing: ['Calcul de la trajectoire', 'Calculating trajectory'],
    departing: ['Quitter notre orbite', 'Leaving our orbit'],
    cruising: ['Traversée de l’espace', 'Crossing space'],
    approaching: [`Approche de ${destinationName}`, `Approaching ${destinationName}`],
    arrived: ['Arrivée', 'Arrived'],
  };
  const label = phaseLabels[phase]?.[fr ? 0 : 1] ?? (fr ? 'Voyage' : 'Travel');
  return (
    <div className={`travel-overlay ${reducedMotion ? 'travel-overlay--reduced' : ''}`} data-destination={destinationId} role="status" aria-live="polite">
      <div className="travel-tunnel" aria-hidden="true"><span /><span /><span /></div>
      <div className="travel-card glass-panel">
        <p className="panel-kicker"><Icon name="sparkle" size={15} /> {fr ? 'VOYAGE EN COURS' : 'TRAVELLING'}</p>
        <h2>{destinationName}</h2>
        <p>{label}</p>
        <div className="travel-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <small>{Math.round(progress * 100)}%</small>
        <button type="button" onClick={onSkip}>{fr ? 'Passer le voyage' : 'Skip travel'} <Icon name="arrow" size={16} /></button>
      </div>
    </div>
  );
}
