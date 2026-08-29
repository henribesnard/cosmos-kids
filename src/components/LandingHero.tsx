import type { Locale } from '../app/uiTypes';
import { Icon } from './Icon';

interface LandingHeroProps {
  locale: Locale;
  onStart: () => void;
  onSolar: () => void;
}

export function LandingHero({ locale, onStart, onSolar }: LandingHeroProps) {
  const fr = locale === 'fr';
  return (
    <main className="landing-hero">
      <div className="landing-hero__content">
        <p className="eyebrow"><Icon name="sparkle" size={15} /> {fr ? '7–14 ANS · VOYAGE EN 3D' : 'AGES 7–14 · A 3D JOURNEY'}</p>
        <h1>
          {fr ? "L’Univers est immense." : 'The Universe is vast.'}<br />
          <span>{fr ? "À toi de l’explorer." : 'It is yours to explore.'}</span>
        </h1>
        <p className="landing-hero__lede">
          {fr
            ? 'Commence par notre planète, puis découvre les mondes qui tournent autour du Soleil. Observe, compare et relève ta première mission.'
            : 'Start with our planet, then discover the worlds orbiting the Sun. Observe, compare and complete your first mission.'}
        </p>
        <div className="landing-hero__actions">
          <button className="button button--primary button--large" type="button" onClick={onStart}>
            <Icon name="earth" /> {fr ? 'Commencer depuis la Terre' : 'Start from Earth'} <Icon name="arrow" />
          </button>
          <button className="button button--glass button--large" type="button" onClick={onSolar}>
            <Icon name="orbit" /> {fr ? 'Voir le Système solaire' : 'View the Solar System'}
          </button>
        </div>
        <div className="landing-hero__proof" aria-label={fr ? 'Contenu de la première version' : 'First version content'}>
          <span><b>10</b>{fr ? 'mondes texturés' : 'textured worlds'}</span>
          <span><b>3D</b>{fr ? 'interactive' : 'interactive'}</span>
          <span><b>100%</b>{fr ? 'sources citées' : 'sources credited'}</span>
        </div>
      </div>
      <aside className="landing-hero__hint">
        <span className="mouse-hint" aria-hidden="true"><i /></span>
        <span>{fr ? 'Fais glisser pour tourner' : 'Drag to rotate'}</span>
      </aside>
    </main>
  );
}

