# COSMOS KIDS — exploration 3D de l’Univers

COSMOS KIDS est une exploration 3D éducative de l’Univers destinée aux 7–14 ans. L’application transforme le handoff « Techno 3D et écrans prioritaires » en parcours React réellement navigables, du Système solaire à la Voie lactée et au Groupe local, avec médias locaux, données sourcées et interfaces accessibles.

## Ce que contient l’application

- landing page et départ depuis la Terre ;
- vue Terre + Lune, vue complète du Système solaire et fiche détaillée pour chaque monde ;
- Soleil, Lune et huit planètes texturés ; Terre multicouche et anneaux de Saturne séparés ;
- vue de la Voie lactée avec bras spiraux, objets du ciel profond et passage vers le Groupe local ;
- sept trajets pédagogiques non rétroactifs, de l’ISS aux constellations observables ce soir ;
- comparateur de durées, dangers à plusieurs niveaux, quiz et checklist dans le monde réel ;
- carnet de découverte local avec date de première visite, sans compte ni suivi distant ;
- recherche clavier (`Ctrl/Cmd + K`), voyage animé, comparaison et crédits ;
- routes partageables, par exemple `/explore/solar-system/saturn`, `/trajets/earth-to-moon` et `/carnet` ;
- français et anglais, navigation DOM accessible, préférence de mouvement réduit et fallback WebGL ;
- snapshot orbital JPL Horizons au build, sans requête d’API dans le navigateur ;
- assets locaux accompagnés d’un manifeste, d’une licence et de sommes SHA‑256.

L’exploration au-delà du Système solaire est en cours d’enrichissement. La vue face à la Voie lactée est une reconstruction pédagogique : l’image ESA/Gaia utilisée comme référence est une vue d’artiste fondée sur des données Gaia, et non une photographie prise depuis l’extérieur de notre Galaxie.

## Démarrage

Prérequis : Node.js 22.13 ou plus récent et npm 11.

```bash
npm install
npm run dev
```

Puis ouvrir <http://127.0.0.1:4173/>.

Le port est volontairement verrouillé sur `4173`. Si le terminal indique qu’il est déjà utilisé, une autre instance de COSMOS KIDS fonctionne probablement déjà : utilise l’URL ci-dessus ou arrête cette ancienne instance avec `Ctrl+C` avant de relancer la commande. Vite ne basculera pas silencieusement sur `4174`.

## Vérification

```bash
npm run verify
```

Cette commande vérifie les assets, exécute ESLint, toute la suite Vitest et le build de production. Les commandes unitaires restent disponibles :

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

## Données et assets

Les textures planétaires 2K proviennent de Solar System Scope / INOVE sous licence CC BY 4.0. La référence face à la Voie lactée provient d’ESA/Gaia/DPAC, Stefan Payne-Wardenaar, sous licence CC BY-SA 3.0 IGO. Ces images sont téléchargées une fois, vérifiées puis servies localement : aucune image n’est hotlinkée en production.

La référence ESA/Gaia est une vue d’artiste basée sur les données Gaia. La géométrie interactive des bras est une reconstruction séparée, informée par Reid et al. (2019), [DOI 10.3847/1538-4357/ab4a11](https://doi.org/10.3847/1538-4357/ab4a11) ; elle ne reproduit pas directement les pixels de l’illustration.

```bash
npm run assets:download
npm run assets:validate
npm run assets:attributions
```

Les positions orbitales sont un cache reproductible de NASA/JPL Horizons. L’accès au service doit rester séquentiel :

```bash
npm run data:sync:solar-system -- --epoch=2026-08-28T00:00:00Z
```

En cas d’indisponibilité de JPL, le script conserve le dernier snapshot complet au lieu de casser le build.

## Repères du projet

- [`src/app/App.tsx`](./src/app/App.tsx) : routes et orchestration des parcours ;
- [`src/scene/UniverseViewport.tsx`](./src/scene/UniverseViewport.tsx) : scène React Three Fiber ;
- [`src/data/solarSystem.ts`](./src/data/solarSystem.ts) : catalogue scientifique et provenance par valeur ;
- [`src/data/journeys.ts`](./src/data/journeys.ts) : les sept trajets et leurs sources figées au build ;
- [`src/domain/missionEngine.ts`](./src/domain/missionEngine.ts) : progression événementielle non rétroactive ;
- [`src/generated/ephemeris.json`](./src/generated/ephemeris.json) : cache JPL utilisé au runtime ;
- [`data/manifests/assets.manifest.json`](./data/manifests/assets.manifest.json) : catalogue runtime des images ;
- [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md) et [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md) : sources, transformations et licences.

Pour un hébergement statique, configurer une réécriture de toutes les routes applicatives vers `index.html`. Les fichiers présents sous `/assets/` doivent rester servis tels quels.
