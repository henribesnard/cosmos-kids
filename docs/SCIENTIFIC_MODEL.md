# Modèle scientifique et conventions visuelles

## Trois espaces séparés

### Valeurs scientifiques

Rayon, masse, gravité, durée de rotation, inclinaison, température et orbite sont stockés avec unité, URL source, attribution et date de consultation. Ils alimentent les fiches et comparaisons.

### Éphémérides

Les vecteurs héliocentriques des huit planètes viennent de NASA/JPL Horizons pour l’époque `2026-08-28T00:00:00Z`. Le script de synchronisation interroge les corps un par un, conformément aux contraintes du service, puis met en cache un snapshot complet.

### Rendu

Rayons et demi-grands axes visuels sont compressés. Sans cette compression, le Soleil, les planètes telluriques et Neptune ne pourraient pas être lisibles dans la même scène. L’interface indique donc explicitement « Tailles et distances visuelles simplifiées ».

L’angle initial de chaque orbite est dérivé du vecteur JPL. La trajectoire affichée est ensuite une ellipse pédagogique animée, pas un intégrateur n-corps ni une propagation de précision.

## Surfaces et atmosphères

- la Terre utilise une surface jour, une carte normale, un masque spéculaire, une couche nuageuse indépendante et des lumières nocturnes masquées du côté éclairé ;
- Vénus distingue sa surface radar/fausses couleurs de son enveloppe nuageuse ;
- le Soleil utilise un matériau auto-éclairé : la texture n’est pas une surface solide ni une observation en direct ;
- Jupiter, Saturne, Uranus et Neptune représentent des enveloppes nuageuses, pas des sols ;
- les anneaux de Saturne utilisent une bande radiale RGBA sur une géométrie séparée.

Les textures Solar System Scope sont très utiles visuellement mais ne possèdent pas une provenance instrumentale détaillée fichier par fichier. Certaines lacunes sont reconstruites et les couleurs sont renforcées ; ces limites sont conservées dans le catalogue et affichées au niveau « Curieux ».

## Règle de contenu

Aucune valeur scientifique nouvelle ne doit être ajoutée directement dans un composant d’interface. Elle doit d’abord entrer dans `src/data` avec source et unité. Une approximation doit porter `approximate: true`.

