import type { Locale } from '../app/uiTypes';
import { Icon } from './Icon';

interface CreditsDialogProps {
  locale: Locale;
  onClose: () => void;
}

export function CreditsDialog({ locale, onClose }: CreditsDialogProps) {
  const fr = locale === 'fr';
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="credits-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="credits-title">
        <header>
          <div><p className="panel-kicker"><Icon name="info" size={15} /> {fr ? 'TRANSPARENCE' : 'TRANSPARENCY'}</p><h2 id="credits-title">{fr ? 'Sources & crédits' : 'Sources & credits'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={fr ? 'Fermer' : 'Close'}><Icon name="close" /></button>
        </header>
        <div className="credits-dialog__body">
          <article>
            <span className="credits-dialog__icon">◉</span>
            <div><h3>{fr ? 'Textures des mondes' : 'World textures'}</h3><p>{fr ? 'Solar System Scope / INOVE, pack 2K sous licence Creative Commons Attribution 4.0. Fichiers renommés, cartes TIFF converties en PNG et servis localement.' : 'Solar System Scope / INOVE, 2K pack under Creative Commons Attribution 4.0. Files renamed, TIFF maps converted to PNG and served locally.'}</p><a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">Solar System Scope ↗</a></div>
          </article>
          <article>
            <span className="credits-dialog__icon">⌁</span>
            <div><h3>{fr ? 'Positions orbitales' : 'Orbital positions'}</h3><p>{fr ? 'Instantané calculé à la construction avec l’API JPL Horizons. Les distances de la scène sont compressées pour rendre tous les mondes visibles.' : 'Build-time snapshot computed using the JPL Horizons API. Scene distances are compressed so every world remains visible.'}</p><a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">NASA/JPL Horizons ↗</a></div>
          </article>
          <article>
            <span className="credits-dialog__icon">≋</span>
            <div><h3>{fr ? 'Données scientifiques' : 'Scientific data'}</h3><p>{fr ? 'Rayons, gravité, rotations et orbites proviennent des fiches NASA et du JPL. Chaque valeur conserve sa source dans le catalogue de données.' : 'Radii, gravity, rotations and orbits come from NASA and JPL fact sheets. Every value retains its source in the data catalogue.'}</p><a href="https://science.nasa.gov/solar-system/" target="_blank" rel="noreferrer">NASA Solar System Exploration ↗</a></div>
          </article>
          <aside>
            <b>{fr ? 'À savoir' : 'Good to know'}</b>
            <p>{fr ? 'Certaines textures complètent des zones non cartographiées et renforcent les couleurs. Elles sont idéales pour l’exploration visuelle, mais ne remplacent pas des cartes scientifiques datées et instrumentées.' : 'Some textures fill unmapped areas and enhance colours. They are ideal for visual exploration, but do not replace dated, instrument-traceable scientific maps.'}</p>
          </aside>
        </div>
        <footer><a href="/assets/textures/solar-system/sss-2k/ATTRIBUTION.md" target="_blank">{fr ? 'Voir les attributions détaillées' : 'View detailed attributions'}</a><button className="button button--secondary" type="button" onClick={onClose}>{fr ? 'Retour à l’exploration' : 'Back to exploration'}</button></footer>
      </section>
    </div>
  );
}
