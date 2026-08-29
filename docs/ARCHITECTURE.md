# Architecture V1

## Découpage

L’application distingue quatre responsabilités :

1. `src/data` conserve les faits scientifiques, leurs unités, leurs sources et les descripteurs de rendu.
2. `src/generated` contient les données calculées hors navigateur, notamment le snapshot JPL Horizons.
3. `src/scene` transforme uniquement les descripteurs visuels en objets Three.js.
4. `src/app`, `src/components` et `src/store` gèrent routes, interface, mission et préférences.

Cette séparation empêche une distance compressée pour l’écran d’être présentée comme une distance scientifique réelle.

## Navigation

| URL | État 3D | Interface |
| --- | --- | --- |
| `/` | Terre + Lune | Landing |
| `/explore/earth` | Terre + Lune | Mission + fiche Terre |
| `/explore/solar-system` | Soleil + huit planètes | Vue orbitale |
| `/explore/solar-system/:id` | Objet ciblé | Fiche détaillée |
| `/credits` | Vue orbitale | Sources et licences |

L’URL est l’autorité pour la scène courante. Zustand conserve uniquement les préférences et la progression utiles entre deux visites ; hover, modales et voyage restent éphémères.

## Pipeline média

`scripts/download-assets.mjs` lit le manifeste du pack, télécharge chaque source de manière séquentielle, vérifie dimensions et SHA‑256, convertit les deux TIFF terrestres en PNG puis écrit les fichiers locaux. `scripts/validate-assets.mjs` vérifie ensuite le pack, le catalogue runtime et les documents d’attribution.

La scène 3D est chargée en chunk séparé afin que l’interface initiale reste légère. Les textures ne sont demandées qu’au montage de la vue R3F.

## Dégradation et accessibilité

- le Canvas est décoratif pour les technologies d’assistance ; une liste DOM fournit les mêmes destinations ;
- toutes les actions importantes existent en HTML, pas uniquement sur les meshes 3D ;
- `prefers-reduced-motion` coupe les rotations et voyages non indispensables ;
- l’Error Boundary et le fallback WebGL laissent les informations et la navigation disponibles ;
- sur mobile, les panneaux latéraux deviennent des bottom sheets.

