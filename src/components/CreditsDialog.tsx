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
            <span className="credits-dialog__icon">✦</span>
            <div>
              <h3>{fr ? 'Carte de la Voie lactée' : 'Milky Way map'}</h3>
              <p>{fr
                ? 'Vue d’artiste 2025 fondée sur les données Gaia, crédit ESA/Gaia/DPAC, Stefan Payne-Wardenaar, sous CC BY-SA 3.0 IGO. Ce n’est pas une photographie prise depuis l’extérieur. Les guides interactifs des bras s’appuient séparément sur le modèle de masers de Reid et al. (2019).'
                : '2025 artist’s impression based on Gaia data, credit ESA/Gaia/DPAC, Stefan Payne-Wardenaar, under CC BY-SA 3.0 IGO. It is not a photograph taken from outside. Interactive arm guides separately use the Reid et al. (2019) maser model.'}</p>
              <a href="https://www.esa.int/ESA_Multimedia/Images/2025/01/The_best_Milky_Way_map_by_Gaia" target="_blank" rel="noreferrer">ESA/Gaia 2025 ↗</a>{' · '}
              <a href="https://doi.org/10.3847/1538-4357/ab4a11" target="_blank" rel="noreferrer">Reid et al. 2019 ↗</a>
            </div>
          </article>
          <article>
            <span className="credits-dialog__icon">{'\u2726'}</span>
            <div>
              <h3>{fr ? 'Constellations et \u00E9toiles' : 'Constellations and stars'}</h3>
              <p>{fr
                ? 'Positions des \u00E9toiles issues du catalogue Hipparcos (ESA). Figures de constellations par Olaf Frohn / d3-celestial (BSD-3-Clause). Limites IAU d\u2019apr\u00E8s Davenhall & Leggett 1989.'
                : 'Star positions from the Hipparcos catalogue (ESA). Constellation stick figures by Olaf Frohn / d3-celestial (BSD-3-Clause). IAU boundaries from Davenhall & Leggett 1989.'}</p>
              <a href="https://github.com/ofrohn/d3-celestial" target="_blank" rel="noreferrer">d3-celestial {'\u2197'}</a>{' \u00B7 '}
              <a href="https://www.cosmos.esa.int/web/hipparcos" target="_blank" rel="noreferrer">Hipparcos (ESA) {'\u2197'}</a>
            </div>
          </article>
          <article>
            <span className="credits-dialog__icon">{'\u224B'}</span>
            <div><h3>{fr ? 'Donn\u00E9es scientifiques' : 'Scientific data'}</h3><p>{fr ? 'Rayons, gravit\u00E9, rotations et orbites proviennent des fiches NASA et du JPL. Chaque valeur conserve sa source dans le catalogue de donn\u00E9es.' : 'Radii, gravity, rotations and orbits come from NASA and JPL fact sheets. Every value retains its source in the data catalogue.'}</p><a href="https://science.nasa.gov/solar-system/" target="_blank" rel="noreferrer">NASA Solar System Exploration {'\u2197'}</a></div>
          </article>
          <aside>
            <b>{fr ? 'À savoir' : 'Good to know'}</b>
            <p>{fr ? 'Certaines textures complètent des zones non cartographiées et renforcent les couleurs. Les vues détaillées actuelles des nébuleuses et galaxies sont des illustrations procédurales : leurs liens NASA/ESA documentent les faits, mais ne sont pas encore les images reproduites à l’écran.' : 'Some textures fill unmapped areas and enhance colours. Current nebula and galaxy detail views are procedural illustrations: their NASA/ESA links document the facts, but those source images are not yet reproduced on screen.'}</p>
          </aside>
        </div>
        <footer><a href="/assets/textures/solar-system/sss-2k/ATTRIBUTION.md" target="_blank">{fr ? 'Voir les attributions détaillées' : 'View detailed attributions'}</a><button className="button button--secondary" type="button" onClick={onClose}>{fr ? 'Retour à l’exploration' : 'Back to exploration'}</button></footer>
      </section>
    </div>
  );
}
