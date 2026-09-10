# Architecture

## Découpage

L’application distingue cinq responsabilités :

1. `src/data` conserve les faits scientifiques, leurs unités, leurs sources et les descripteurs de rendu.
2. `src/generated` contient les données calculées hors navigateur, notamment le snapshot JPL Horizons.
3. `src/scene` transforme uniquement les descripteurs visuels en objets Three.js.
4. `src/domain` contient les calculs purs, le bus synchrone et le moteur de trajets, sans React ni Three.js.
5. `src/app`, `src/components` et `src/store` gèrent routes, interface, progression et préférences.

Cette séparation empêche une distance compressée pour l’écran d’être présentée comme une distance scientifique réelle.

## Navigation

| URL | État 3D | Interface |
| --- | --- | --- |
| `/` | Terre + Lune | Landing |
| `/explore/earth` | Terre + Lune | Navigation + fiche Terre |
| `/explore/earth/iss` | Terre + Lune | Fiche sourcée de l’ISS |
| `/explore/solar-system` | Soleil + huit planètes | Vue orbitale |
| `/explore/solar-system/:id` | Objet ciblé | Fiche détaillée |
| `/credits` | Vue orbitale | Sources et licences |
| `/trajets` | Scène courante conservée | Liste des sept trajets |
| `/trajets/:journeyId` | Scène courante conservée | Détail et progression d’un trajet |
| `/carnet` | Scène courante conservée | Carnet local des premières visites |
| `/compare/:primaryId/:secondaryId` | Vue adaptée au premier objet | Comparaison partageable des deux objets |

L’URL est l’autorité pour la scène courante. Zustand conserve uniquement les préférences et la progression utiles entre deux visites ; hover, modales et voyage restent éphémères.

## Trajets et événements

Les définitions bilingues et sourcées vivent dans `src/data/journeys.ts`. Les composants ne valident jamais une étape directement : ils publient un événement typé (`OBJECT_VISITED`, `OBJECT_OBSERVED`, `SCALE_CHANGED`, `COMPARISON_COMPLETED`, `QUIZ_ANSWERED` ou `REAL_WORLD_CHECKED`). Le moteur indépendant de React associe cet événement au seul trajet actif.

Le catalogue narratif complet et sa feuille de style sont chargés à la demande sur `/trajets` ou `/carnet`. Le moteur toujours actif ne charge que les correspondances événementielles compactes de `src/data/journeyRules.ts`. Un test de données projette les étapes du catalogue dans ce format et exige une égalité stricte pour empêcher toute divergence entre les deux représentations.

Un `MissionRun` mémorise `startedAt`, les identifiants d’étapes terminées et `completedAt`. Une visite antérieure au démarrage ne peut donc pas compter rétroactivement. Les étapes ordonnées attendent toutes les étapes ordonnées précédentes et l’événement `JOURNEY_COMPLETED` n’est publié qu’à la transition finale.

Le store persistant est en version 3. Les sauvegardes v1/v2 conservent leurs découvertes et remappent l’ancienne mission active, mais ne reconstruisent aucun progrès. Les trois catalogues de découvertes, les destinations spéciales et leur date de première visite alimentent `/carnet`.

## Pipeline média

`scripts/download-assets.mjs` lit le manifeste du pack, télécharge chaque source de manière séquentielle, vérifie dimensions et SHA‑256, convertit les deux TIFF terrestres en PNG puis écrit les fichiers locaux. `scripts/validate-assets.mjs` vérifie ensuite le pack, le catalogue runtime et les documents d’attribution.

La scène 3D et l’interface détaillée des trajets sont chargées en chunks séparés afin que l’interface initiale reste légère. Les textures ne sont demandées qu’au montage de la vue R3F.

## Dégradation et accessibilité

- le Canvas est décoratif pour les technologies d’assistance ; une liste DOM fournit les mêmes destinations ;
- toutes les actions importantes existent en HTML, pas uniquement sur les meshes 3D ;
- `prefers-reduced-motion` coupe les rotations et voyages non indispensables ;
- l’Error Boundary et le fallback WebGL laissent les informations et la navigation disponibles ;
- sur mobile, les panneaux latéraux deviennent des bottom sheets.
