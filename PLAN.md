# Plan : Extension de l'univers Cosmos Kids

## Objectif
Ajouter la Voie lactee, les galaxies voisines, les trous noirs, les nebuleuses et les amas d'etoiles a l'application existante. L'utilisateur pourra naviguer du systeme solaire jusqu'a l'echelle galactique.

---

## Architecture : nouvelles echelles de navigation

```
Terre  ->  Systeme solaire  ->  Voie lactee  ->  Groupe local
(earth)      (solar)           (milkyway)       (localgroup)
                                   |
                           clic sur un objet
                                   |
                            Vue detail (deepsky)
                         nebuleuse / trou noir / galaxie
```

### Nouvelles vues

| Vue | Description 3D | Objets cliquables |
|-----|----------------|-------------------|
| `milkyway` | Disque spiral procedural (particules + shader), Soleil marque, bras colores, Sgr A* au centre | Sgr A*, Nebuleuses sur les bras, Soleil (retour solar) |
| `localgroup` | Milky Way + Andromede + Triangulum + LMC/SMC comme sprites/meshes dans l'espace | Chaque galaxie cliquable |
| `deepsky` | Vue detail d'un objet profond (trou noir avec disque d'accretion, nebuleuse en billboard HD, galaxie) | Retour a la vue parente |

---

## Phase 1 : Fondations (types, store, routes)

### 1.1 Etendre le systeme de types

**Fichier : `src/data/types.ts`**
- Ajouter `DeepSkyObjectId` : `'sgr-a' | 'orion-nebula' | 'eagle-nebula' | 'crab-nebula' | 'pillars' | 'carina-nebula' | 'andromeda' | 'triangulum' | 'lmc' | 'smc' | 'omega-centauri' | 'pleiades'`
- Ajouter `CosmicObjectId = CelestialObjectId | DeepSkyObjectId`
- Ajouter `DeepSkyKind = 'black-hole' | 'nebula' | 'galaxy' | 'globular-cluster' | 'open-cluster'`
- Ajouter interface `DeepSkyObject` avec : id, name (fr/en), kind, description, funFact, distance, diameter, color, symbol, constellation, facts[]

### 1.2 Catalogue d'objets profonds

**Nouveau fichier : `src/data/deepSkyObjects.ts`**
- Donnees educatives bilingues pour chaque objet
- Basees sur la recherche (NASA, ESA, publications)
- Memes patterns que `solarSystem.ts` (LocalizedText, facts, etc.)

### 1.3 Etendre le store

**Fichier : `src/store/useCosmosStore.ts`**
- `CosmosView` : ajouter `'milkyway' | 'localgroup' | 'deepsky'`
- `selectedObjectId` : changer type vers `CosmicObjectId | null`
- Adapter `finishTravel` pour gerer les nouvelles vues
- Adapter `PersistedCosmosState`

### 1.4 Etendre les routes

**Fichier : `src/app/App.tsx`**
- Nouvelles routes :
  - `/explore/milky-way` -> vue milkyway
  - `/explore/milky-way/:id` -> vue deepsky (nebuleuse, trou noir)
  - `/explore/local-group` -> vue localgroup
  - `/explore/local-group/:id` -> vue deepsky (galaxie)
- Etendre `routeState()` et `routeForDestination()`
- Etendre `navigateDirectly()` pour les nouvelles vues

---

## Phase 2 : Scene 3D - Vue Voie lactee

### 2.1 Catalogue de scene galactique

**Nouveau fichier : `src/scene/galaxyCatalog.ts`**
- Parametres des 4 bras spiraux (pitch angle, azimut de depart, couleur)
- Position du Soleil (R = 0.534 du rayon, Eperon d'Orion)
- Position de Sgr A* (centre)
- Positions des nebuleuses/amas sur les bras
- Camera presets pour la vue milkyway
- Formule de spirale logarithmique : `r = r0 * exp(theta * tan(pitch))`

### 2.2 Composant MilkyWayScene

**Nouveau fichier : `src/scene/MilkyWayScene.tsx`**
- **GalaxyDisk** : Disque de particules (~50K-100K points) avec couleurs selon la position
  - Bras spiraux : bleu-blanc (etoiles jeunes) + rose (regions HII)
  - Inter-bras : jaune pale
  - Centre/bulbe : jaune-orange intense
  - Utilisation de `<Points>` de drei avec un shader custom pour la couleur
- **GalacticCore** : Sphere emissive jaune-orange au centre (bulbe)
- **SunMarker** : Indicateur anime "Vous etes ici" avec label
- **DeepSkyMarkers** : Points cliquables pour les nebuleuses / amas sur les bras
  - Chaque marqueur = sprite billboard avec icone + label
  - onClick -> navigation vers vue deepsky
- **SgrAMarker** : Marqueur special pour Sagittarius A* au centre
- Camera preset : vue de dessus legerement inclinee (~30deg), centree sur le centre galactique

### 2.3 Integration dans UniverseViewport

**Fichier : `src/scene/UniverseViewport.tsx`**
- Ajouter `UniverseView = 'earth' | 'solar' | 'planet' | 'milkyway' | 'localgroup' | 'deepsky'`
- Ajouter le rendu conditionnel pour les nouvelles vues
- Ajouter les camera presets
- Augmenter `far` de la camera de 500 a 2000+ pour les vues galactiques
- Ajouter la starfield background adaptee a chaque echelle

---

## Phase 3 : Scene 3D - Vues detail (deepsky)

### 3.1 Vue trou noir (BlackHoleDetail)

**Dans : `src/scene/MilkyWayScene.tsx` ou fichier dedie**
- Disque d'accretion : tore aplati avec shader gradient (bleu-blanc interieur -> orange-rouge exterieur)
- Ombre du trou noir : sphere noire au centre
- Anneau de photons : anneau brillant proche du centre
- Jet relativiste optionnel : deux cones de lumiere perpendiculaires au disque
- Rotation lente du disque d'accretion
- Camera orbitale autour de l'objet

### 3.2 Vue nebuleuse (NebulaDetail)

- Billboard plein ecran avec texture NASA/Hubble (telechargee ou incluse en 2K)
- Leger effet de parallaxe/profondeur avec plusieurs couches
- Particules d'etoiles devant/derriere
- InfoPanel avec donnees educatives

### 3.3 Vue galaxie (GalaxyDetail)

- Mesh 3D similaire a MilkyWayScene mais pour Andromede, etc.
- Ou sprite haute resolution (image Hubble) sur un plan incline
- Rotation lente

---

## Phase 4 : Vue Groupe Local

### 4.1 Composant LocalGroupScene

**Nouveau fichier : `src/scene/LocalGroupScene.tsx`**
- 5-6 galaxies comme sprites/meshes dans l'espace 3D
- Voie lactee au centre (sprite vu de dessus)
- Andromede (le plus grand sprite, a distance proportionnelle)
- LMC/SMC proches de la Voie lactee
- Labels et distances
- Chaque galaxie cliquable -> deepsky detail

---

## Phase 5 : UI et navigation

### 5.1 ScaleNavigator etendu

**Fichier : `src/components/ScaleNavigator.tsx`**
- Ajouter les niveaux : `... | Voie lactee | Groupe local`
- Progression lineaire : Terre -> Systeme solaire -> Voie lactee -> Groupe local

### 5.2 Header / Destinations

**Fichier : `src/components/Header.tsx`**
- Ajouter une section "Objets profonds" dans le dropdown
- Grouper par categorie : Planetes | Nebuleuses | Trous noirs | Galaxies

### 5.3 Breadcrumbs

**Fichier : `src/app/App.tsx`**
- Etendre le fil d'Ariane : Terre > Systeme solaire > Voie lactee > [Objet]

### 5.4 InfoPanel pour objets profonds

- Reutiliser le composant existant `InfoPanel` avec les `ObjectDisplay` generes depuis les `DeepSkyObject`
- Memes 3 niveaux de lecture (Simple, Curieux, Expert)

### 5.5 SearchDialog / CompareDialog

- Etendre la recherche pour inclure les objets profonds
- Comparer : autoriser la comparaison planete vs planete ET galaxie vs galaxie

---

## Phase 6 : Assets et textures

### 6.1 Textures a sourcer/telecharger

| Asset | Source | Licence | Taille |
|-------|--------|---------|--------|
| Milky Way skybox (fond etoile Gaia) | NASA SVS Deep Star Maps | Public domain | 4K equirect |
| Orion Nebula | ESA/Hubble | CC BY 4.0 | 2K crop |
| Eagle Nebula (Pillars) | NASA/JWST | Public domain | 2K crop |
| Crab Nebula | NASA/Hubble | Public domain | 2K crop |
| Carina Nebula | NASA/JWST | Public domain | 2K crop |
| Andromeda (M31) | NASA/JPL | Public domain | 2K crop |

### 6.2 Script de telechargement

- Etendre `scripts/download-assets.mjs` pour les nouvelles textures
- Ajouter les attributions dans `ATTRIBUTIONS.md`

---

## Ordre d'implementation recommande

1. **Phase 1** : Types + store + routes + catalogue deepsky (fondations, pas de visuel)
2. **Phase 2** : Vue Voie lactee (impact visuel maximal, coeur du projet)
3. **Phase 5.1** : ScaleNavigator etendu (navigation fonctionnelle)
4. **Phase 3.1** : Vue trou noir Sgr A* (wow factor pour les enfants)
5. **Phase 3.2** : Vues nebuleuses (contenu educatif riche)
6. **Phase 4** : Vue Groupe local
7. **Phase 5** : Reste de l'UI (header, search, compare)
8. **Phase 6** : Optimisation des assets

---

## Fichiers modifies

| Fichier | Type de modification |
|---------|---------------------|
| `src/data/types.ts` | Ajout DeepSkyObjectId, CosmicObjectId, DeepSkyObject |
| `src/data/deepSkyObjects.ts` | **NOUVEAU** - catalogue objets profonds |
| `src/data/index.ts` | Export du nouveau module |
| `src/store/useCosmosStore.ts` | Nouvelles vues, type elargi |
| `src/scene/sceneCatalog.ts` | Export UniverseView etendu, nouveaux presets camera |
| `src/scene/galaxyCatalog.ts` | **NOUVEAU** - donnees spirale, bras, positions |
| `src/scene/MilkyWayScene.tsx` | **NOUVEAU** - rendu 3D galaxie |
| `src/scene/LocalGroupScene.tsx` | **NOUVEAU** - rendu 3D groupe local |
| `src/scene/DeepSkyDetail.tsx` | **NOUVEAU** - vues detail (trou noir, nebuleuse, galaxie) |
| `src/scene/UniverseViewport.tsx` | Integration nouvelles vues |
| `src/app/App.tsx` | Routes, navigation, breadcrumbs |
| `src/app/uiTypes.ts` | Eventuellement ObjectDisplay elargi |
| `src/components/ScaleNavigator.tsx` | Niveaux supplementaires |
| `src/components/Header.tsx` | Destinations etendues |
| `src/components/Icon.tsx` | Nouvelles icones (galaxy, blackhole, nebula) |
| `src/styles/global.css` | Styles pour les nouvelles vues |

## Contraintes techniques

- **Performance** : Les particules galaxy doivent rester sous 100K points. Utiliser `InstancedBufferGeometry` ou `<Points>` avec shader material.
- **Camera far plane** : Passer de 500 a 2000+ pour les vues galactiques, mais garder 500 pour earth/solar/planet.
- **Taille du bundle** : Les textures nebuleuses en 2K ajouteront ~2-4 MB. Lazy-load via `useTexture` (deja le pattern existant).
- **Pas de backend** : Tout reste statique, coherent avec l'architecture V1.
