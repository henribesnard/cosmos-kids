# SPEC — Système de Trajets et refonte du moteur de missions

**Cible :** COSMOS KIDS (React 19 + @react-three/fiber 9 + zustand 5 + TypeScript 6 + Vite 8)
**Destinataire :** Claude Code
**Statut :** spécification d'implémentation, à exécuter par lots (§12)

---

## 0. Règles d'exécution — à lire avant d'écrire une ligne de code

### 0.1 Vérification des données

Cette spec contient des valeurs numériques et des faits historiques. **Ils sont indicatifs.** Chaque valeur porte la mention `[À VÉRIFIER]`.

Avant d'écrire une valeur dans `src/data/`, tu dois :

1. ouvrir la source citée ;
2. relever la valeur exacte et son unité ;
3. la stocker avec `source`, `sourceUrl`, `retrievedAt`, et `approximate: true` si c'est un ordre de grandeur ;
4. si la source ne donne pas la valeur, **ne pas l'inventer** : mettre le champ à `null` et le champ ne s'affiche pas.

Si une valeur relevée contredit cette spec, **la source gagne**. Signale l'écart dans le message de commit.

### 0.2 Règles héritées du dépôt

- `docs/SCIENTIFIC_MODEL.md` : aucune valeur scientifique nouvelle dans un composant d'interface. Elle entre d'abord dans `src/data` avec source et unité.
- Aucune chaîne longue en dur dans un composant : tout passe par `LocalizedText` (`{ fr, en }`), fr et en obligatoires.
- Pas de requête réseau au runtime navigateur. Les données sont figées au build.
- Pas de compte utilisateur, pas de tracking, progression en `localStorage` uniquement.

### 0.3 Définition de « terminé »

Un lot est terminé quand `npm run verify` passe (assets + lint + tests + build) **et** que le parcours décrit dans les critères d'acceptation du lot a été exercé manuellement dans le navigateur sur `http://127.0.0.1:4173/`.

Un lot = un commit. Ne pas laisser `main` cassé entre deux lots.

### 0.4 Autonomie

Choisis toi-même les détails d'implémentation non spécifiés ici. Documente les décisions structurantes dans `docs/ARCHITECTURE.md`. Ne pose de question que si une décision est réellement bloquante.

---

## 1. Problème à résoudre

Le système de missions actuel (`src/data/missions.ts`, `src/store/useCosmosStore.ts`, `src/components/Mission*.tsx`) n'est pas un moteur de missions : c'est un filtre sur trois listes globales.

Défauts à corriger, tous constatés dans le code existant :

| # | Défaut | Localisation |
|---|---|---|
| D1 | La progression est rétroactive et non attribuée : `isTargetVisited` lit une liste globale, donc une mission peut être à 75 % avant d'être ouverte | `src/store/missionSelectors.ts`, `useCosmosStore.mission` |
| D2 | Aucun état par mission : ni `startedAt`, ni `completedAt`, ni ordre des étapes | `MissionState` |
| D3 | Un seul type d'étape : `MissionStepDef` n'a que `target`, `label`, `detail` | `src/data/missions.ts` |
| D4 | Pas d'event bus : la détection passe par l'UI qui appelle `markVisited`. `finishTravel()` ne marque rien | `src/app/App.tsx`, `useCosmosStore.ts` |
| D5 | `MissionDef` n'a ni `description`, ni `difficulty`, ni narration ; la récompense est un emoji + une chaîne | `src/data/missions.ts` |
| D6 | Typage relâché à la frontière UI : `onTravel: (id: string) => void`, `onSelect(id as MissionId)` | `MissionPanel.tsx`, `MissionDetailView.tsx` |
| D7 | `.mission-panel` en `position: absolute; width: 296px` : inutilisable en mobile | `src/styles/global.css` |

---

## 2. Concept cible — le Trajet

Une mission cesse d'être une liste de lieux à cliquer. Elle devient **un trajet d'un point A vers un point B**, documenté par cinq axes :

1. **Combien de temps ?** — comparé entre plusieurs véhicules (lumière, avion, sonde réelle, mission réelle).
2. **Qu'est-ce qu'on croise ?** — les étapes physiques du parcours.
3. **Qu'est-ce qui est dangereux ?** — les contraintes réelles.
4. **Un humain l'a-t-il fait ?** — oui/non, avec la mission, la date, le nombre de personnes.
5. **Un robot l'a-t-il fait ?** — idem.

### 2.1 Le statut de faisabilité est le cœur pédagogique

C'est le champ le plus important de tout le système. Il doit être affiché de façon visible et lisible sur chaque trajet.

| Valeur | Sens affiché à l'enfant | Exemple |
|---|---|---|
| `done-by-humans` | « Des humains l'ont vraiment fait. » | Terre → ISS, Terre → Lune |
| `done-by-robots-only` | « Seules des machines y sont allées. » | Terre → Mars, planètes externes |
| `out-of-reach` | « C'est possible en théorie, mais beaucoup trop loin pour nos machines. » | Voie lactée → Andromède |
| `impossible-today` | « Personne ne peut le faire, et personne ne pourrait revenir. » | Entrer dans un trou noir |
| `do-it-tonight` | « Tu peux le faire ce soir, sans rien acheter. » | Observer les constellations |

Interdiction absolue de présenter un trajet `out-of-reach` ou `impossible-today` comme un voyage réalisable. La vue 3D correspondante doit porter le badge `simulated-visualization` prévu au §109 du prompt maître.

---

## 3. Modèle de données

### 3.1 Nouveau fichier `src/data/journeyTypes.ts`

Aligne les types réutilisés (`LocalizedText`, `Quantity`, `SourceRef`, `EducationalContent`) sur ce qui existe réellement dans `src/data/types.ts`. Si `SourceRef` ou `EducationalContent` n'existent pas sous ce nom, réutilise l'équivalent du dépôt plutôt que d'en créer un doublon.

```ts
import type { LocalizedText, Quantity, SourceRef } from './types';
import type { CelestialObjectId, DeepSkyObjectId } from './types';
import type { ConstellationAbbr } from './constellationTypes';

export type JourneyId =
  | 'earth-to-iss'
  | 'earth-to-moon'
  | 'earth-to-mars'
  | 'earth-to-outer-planets'
  | 'milkyway-to-andromeda'
  | 'into-a-black-hole'
  | 'constellations-from-earth';

export type JourneyFeasibility =
  | 'done-by-humans'
  | 'done-by-robots-only'
  | 'out-of-reach'
  | 'impossible-today'
  | 'do-it-tonight';

export type JourneyEndpointId =
  | CelestialObjectId
  | DeepSkyObjectId
  | 'iss'
  | 'night-sky';

export interface JourneyEndpoint {
  readonly id: JourneyEndpointId;
  readonly label: LocalizedText;
}

/** Distance fixe, ou variable dans le temps (Terre-Mars). */
export type DistanceSpec =
  | { readonly kind: 'fixed'; readonly value: Quantity }
  | {
      readonly kind: 'variable';
      readonly min: Quantity;
      readonly max: Quantity;
      readonly typical: Quantity;
      readonly why: LocalizedText;   // pourquoi ça change
    };

export type VehicleId =
  | 'light'
  | 'walking'
  | 'car'
  | 'airliner'
  | 'apollo'
  | 'voyager-1'
  | 'parker-solar-probe'
  | 'real-mission';

export interface DurationEntry {
  readonly vehicle: VehicleId;
  /** Durée en secondes. null = calculée à l'exécution depuis la distance. */
  readonly seconds: number | null;
  /** Obligatoire quand la vitesse du véhicule mérite une nuance. */
  readonly note?: LocalizedText;
  readonly source?: SourceRef;
}

/** Une étape physique du parcours, pas une étape de jeu. */
export interface JourneyLeg {
  readonly id: string;
  readonly label: LocalizedText;
  readonly atDistance?: Quantity;       // ou altitude
  readonly encounter: LocalizedText;    // ce qu'on croise / ce qui se passe
}

export type HazardKind =
  | 'radiation' | 'vacuum' | 'temperature' | 'gravity'
  | 'debris' | 'isolation' | 'supplies' | 'comms'
  | 'landing' | 'tidal-forces' | 'light-pollution' | 'weather';

export interface Hazard {
  readonly kind: HazardKind;
  readonly label: LocalizedText;
  readonly simple: LocalizedText;
  readonly curious: LocalizedText;
  readonly expert?: LocalizedText;
}

export interface Precedent {
  readonly achieved: boolean;
  readonly firstMission?: string;
  readonly firstDate?: string;          // ISO 8601
  readonly latestMission?: string;
  readonly latestDate?: string;
  readonly count?: number;              // humains ou engins concernés
  readonly note: LocalizedText;
  readonly source: SourceRef;
}

export interface JourneyDef {
  readonly id: JourneyId;
  readonly number: number;              // 1..7, ordre d'affichage
  readonly icon: string;
  readonly title: LocalizedText;
  readonly pitch: LocalizedText;        // une phrase, max 120 caractères
  readonly difficulty: 1 | 2 | 3;
  readonly from: JourneyEndpoint;
  readonly to: JourneyEndpoint;
  readonly feasibility: JourneyFeasibility;
  readonly distance: DistanceSpec;
  readonly durations: readonly DurationEntry[];
  readonly launchWindow?: LocalizedText;
  readonly legs: readonly JourneyLeg[];
  readonly hazards: readonly Hazard[];
  readonly humanPrecedent: Precedent;
  readonly robotPrecedent: Precedent;
  readonly steps: readonly MissionStepDef[];   // §4
  readonly reward: LocalizedText;
}
```

### 3.2 Étapes de jeu — union discriminée

Remplace l'actuel `MissionStepDef` de `src/data/missions.ts`.

```ts
interface StepBase {
  readonly id: string;
  readonly label: LocalizedText;
  readonly detail: LocalizedText;
  /** Si true, l'étape ne peut se valider qu'après la précédente. */
  readonly ordered?: boolean;
}

export type MissionStepDef =
  | (StepBase & { readonly kind: 'visit'; readonly target: MissionStepTarget })
  | (StepBase & { readonly kind: 'observe'; readonly target: MissionStepTarget; readonly holdMs: number })
  | (StepBase & { readonly kind: 'compare'; readonly a: MissionStepTarget; readonly b: MissionStepTarget })
  | (StepBase & { readonly kind: 'reach-scale'; readonly level: ScaleLevelId })
  | (StepBase & { readonly kind: 'quiz'; readonly question: QuizDef })
  | (StepBase & { readonly kind: 'real-world'; readonly checklist: readonly LocalizedText[] });

export interface QuizDef {
  readonly prompt: LocalizedText;
  readonly options: readonly LocalizedText[];
  readonly correctIndex: number;
  readonly explain: LocalizedText;      // affiché après réponse, juste ou fausse
}
```

`real-world` est une étape que l'enfant coche lui-même après l'avoir faite hors écran. Aucune vérification technique, aucune culpabilisation, pas de minuteur.

### 3.3 Calculs — nouveau fichier `src/domain/travelTime.ts`

Fonctions **pures**, sans dépendance React ou three. Testées unitairement (§10).

```ts
export const SPEED_KM_PER_S: Record<VehicleId, number | null> = {
  light: 299_792.458,
  walking: 0.00139,            // 5 km/h        [À VÉRIFIER : convention]
  car: 0.0278,                 // 100 km/h
  airliner: 0.25,              // 900 km/h
  apollo: null,                // durée réelle, pas une vitesse de croisière
  'voyager-1': 17,             // [À VÉRIFIER] vitesse héliocentrique actuelle
  'parker-solar-probe': 192,   // [À VÉRIFIER] pic au périhélie, PAS une croisière
  'real-mission': null,
};

export function timeAtSpeed(distanceKm: number, speedKmPerS: number): number;
export function lightTravelSeconds(distanceKm: number): number;
export function formatDurationForKids(seconds: number, locale: Locale): string;
export function formatDistanceForKids(km: number, locale: Locale): string;
```

Contraintes de formatage :

- `formatDistanceForKids` produit `« 1,43 milliard de km »`, jamais `« 1 430 000 000 km »`. Notation scientifique réservée au niveau Expert.
- `formatDurationForKids` choisit l'unité la plus parlante : secondes, minutes, heures, jours, mois, années, milliers/millions/milliards d'années. Jamais `« 1 387 584 000 s »`.
- Pour `parker-solar-probe`, le champ `note` de la `DurationEntry` **doit** exister et expliquer que c'est une vitesse de pointe atteinte près du Soleil, pas une vitesse de croisière. Sans cette note, la comparaison est trompeuse.

---

## 4. Le moteur de missions

### 4.1 Event bus — nouveau fichier `src/domain/events.ts`

```ts
export type CosmosEvent =
  | { type: 'OBJECT_VISITED'; id: MissionStepTarget; at: number }
  | { type: 'OBJECT_OBSERVED'; id: MissionStepTarget; durationMs: number }
  | { type: 'SCALE_CHANGED'; level: ScaleLevelId }
  | { type: 'COMPARISON_COMPLETED'; a: MissionStepTarget; b: MissionStepTarget }
  | { type: 'QUIZ_ANSWERED'; stepId: string; correct: boolean }
  | { type: 'REAL_WORLD_CHECKED'; stepId: string }
  | { type: 'JOURNEY_STARTED'; id: JourneyId }
  | { type: 'JOURNEY_COMPLETED'; id: JourneyId };

export function publish(event: CosmosEvent): void;
export function subscribe(handler: (e: CosmosEvent) => void): () => void;
```

Bus synchrone, sans dépendance externe. Les composants **publient**, ils n'appellent plus `markVisited`.

### 4.2 `src/domain/missionEngine.ts`

S'abonne au bus, fait avancer les `MissionRun`, publie `JOURNEY_COMPLETED`. Aucune dépendance React : testable sans rendu.

Règles :

- une étape ne se valide que si son trajet a `startedAt !== null` (**corrige D1**) ;
- une étape `ordered: true` ne se valide que si toutes les étapes `ordered` précédentes sont validées ;
- une étape déjà validée ne se revalide pas ;
- `JOURNEY_COMPLETED` est publié une seule fois, à la transition.

### 4.3 Câblage minimal exigé

| Événement | Point d'émission |
|---|---|
| `OBJECT_VISITED` | `finishTravel()` **et** l'arrivée par route directe (corrige D4 : aujourd'hui `finishTravel` ne marque rien) |
| `OBJECT_OBSERVED` | sélection maintenue d'un objet dans la scène |
| `SCALE_CHANGED` | `ScaleNavigator` + changement de vue |
| `COMPARISON_COMPLETED` | fermeture de `CompareDialog` avec deux objets valides |
| `QUIZ_ANSWERED` | composant quiz |
| `REAL_WORLD_CHECKED` | case cochée dans le panneau |

---

## 5. Store — `src/store/useCosmosStore.ts`

### 5.1 Nouvelle forme de `MissionState`

```ts
export interface MissionRun {
  readonly startedAt: number | null;
  readonly completedStepIds: readonly string[];
  readonly completedAt: number | null;
}

export interface MissionState {
  /** Conservé : alimente le carnet de découverte, plus la progression. */
  readonly visitedObjectIds: readonly CelestialObjectId[];
  readonly visitedDeepSkyIds: readonly DeepSkyObjectId[];
  readonly visitedConstellationIds: readonly ConstellationAbbr[];
  readonly activeJourneyId: JourneyId | null;
  readonly runs: Readonly<Record<JourneyId, MissionRun>>;
}
```

Les trois listes `visited*` restent, mais **ne pilotent plus la progression des trajets**. Elles alimentent le carnet de découverte (§7.5).

### 5.2 Migration persist v2 → v3

`version: 3`. Dans `migrate` :

- conserver `visitedObjectIds`, `visitedDeepSkyIds`, `visitedConstellationIds` tels quels ;
- `activeMissionId` → `activeJourneyId` avec remappage des anciens `MissionId` vers les nouveaux `JourneyId` ; si l'ancien id n'a pas d'équivalent, `null` ;
- `runs: {}` (pas de reconstruction rétroactive : c'est justement le défaut D1 qu'on supprime) ;
- la migration ne doit jamais jeter. En cas de forme inattendue, retomber sur l'état initial.

Un test doit couvrir v1 → v3 et v2 → v3.

---

## 6. Catalogue — `src/data/journeys.ts`

Sept trajets. Pour chacun, les valeurs ci-dessous sont **indicatives** : applique §0.1.

### J1 — `earth-to-iss` · `done-by-humans` · difficulté 1

- Distance : fixe, altitude ≈ 400–420 km `[À VÉRIFIER]`
- Durées : lumière ≈ 0,0014 s · avion ≈ 27 min si on pouvait monter tout droit (`note` obligatoire : un avion ne peut pas monter là) · Soyouz en rendez-vous rapide ≈ 3 h `[À VÉRIFIER]` · Crew Dragon ≈ 15–30 h `[À VÉRIFIER]`
- Fenêtre de tir : imposée par l'alignement du plan orbital
- Legs : troposphère · ligne de Kármán à 100 km · mise en orbite ≈ 7,8 km/s · rendez-vous
- Hazards : `debris`, `radiation` (réduite par la magnétosphère mais supérieure au sol), `gravity` (microgravité, perte osseuse), `vacuum`
- Humain : oui, occupation continue depuis novembre 2000 `[À VÉRIFIER]`
- Robot : oui, Progress / Cygnus / HTV / Dragon cargo
- Fait marquant : l'équipage voit 16 levers de Soleil par jour `[À VÉRIFIER]`
- Sources : <https://www.nasa.gov/international-space-station/>

### J2 — `earth-to-moon` · `done-by-humans` · difficulté 1

- Distance : fixe ≈ 384 400 km (moyenne) `[À VÉRIFIER]`, lumière ≈ 1,28 s
- Durées : lumière 1,28 s · voiture à 100 km/h ≈ 160 jours · Apollo 11 ≈ 76 h jusqu'à l'orbite lunaire `[À VÉRIFIER]`
- Legs : ceintures de Van Allen · injection translunaire · point d'équigravité · insertion en orbite lunaire
- Hazards : `radiation` (Van Allen puis hors magnétosphère), `temperature` (écart ≈ 300 °C), `gravity` (1/6 g), `landing`, poussière de régolithe abrasive
- Humain : oui. 12 personnes ont marché sur la Lune, dernier alunissage Apollo 17 en décembre 1972 `[À VÉRIFIER]`. **Fait récent à intégrer** : Artemis II a décollé le 1er avril 2026 avec Reid Wiseman, Victor Glover, Christina Koch et Jeremy Hansen, pour un survol lunaire de ≈ 10 jours, premier vol habité au-delà de la magnétosphère depuis Apollo 17 `[À VÉRIFIER sur nasa.gov]`
- Robot : oui, Luna 2 (1959, premier impact), Luna 9 (1966, premier atterrissage en douceur), Chang'e, Chandrayaan-3 (2023) `[À VÉRIFIER]`
- Sources : <https://www.nasa.gov/mission/artemis-ii/>, <https://www.nasa.gov/mission/apollo-11/>

### J3 — `earth-to-mars` · `done-by-robots-only` · difficulté 2

- Distance : **variable**. min ≈ 56 M km, max ≈ 400 M km `[À VÉRIFIER]`. Champ `why` obligatoire : les deux planètes tournent à des vitesses différentes.
- Durées : lumière 3 à 22 min · transfert de Hohmann 6 à 9 mois `[À VÉRIFIER]`
- Fenêtre de tir : une tous les ≈ 26 mois `[À VÉRIFIER]`
- Legs : injection transmartienne · croisière · correction de trajectoire · entrée-descente-atterrissage (« sept minutes de terreur »)
- Hazards : `radiation` (hors magnétosphère), `comms` (aucun pilotage en direct, 3 à 22 min de délai), `supplies`, `isolation`, `landing`, tempêtes de poussière
- Humain : **non**. C'est le point pédagogique central de ce trajet.
- Robot : oui. Mariner 4 (survol, 1965), Viking (atterrissage, 1976), Curiosity (2012), Perseverance + Ingenuity (2021), Zhurong `[À VÉRIFIER]`
- Sources : <https://science.nasa.gov/mars/>, <https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html>

### J4 — `earth-to-outer-planets` · `done-by-robots-only` · difficulté 2

Trajet multi-destinations. Leçon centrale : **l'assistance gravitationnelle**.

- Durées réelles `[À VÉRIFIER toutes]` : Juno → Jupiter ≈ 5 ans · Cassini → Saturne ≈ 7 ans · New Horizons → Pluton ≈ 9 ans et demi
- Legs : ceinture d'astéroïdes · assistance gravitationnelle · ceintures de radiation de Jupiter · arrivée
- Hazards : `radiation` (ceintures joviennes), `temperature`, `comms`, absence de sol sur les géantes gazeuses, énergie solaire insuffisante au-delà de Jupiter donc générateurs à radioisotopes
- Humain : non
- Robot : oui. Voyager 2 reste le seul engin à avoir survolé Uranus (1986) et Neptune (1989) `[À VÉRIFIER]`
- Sources : <https://science.nasa.gov/solar-system/>

### J5 — `milkyway-to-andromeda` · `out-of-reach` · difficulté 3

- Distance : ≈ 2,5 millions d'années-lumière `[À VÉRIFIER]`
- Durées : à la vitesse de Voyager 1, de l'ordre de plusieurs dizaines de milliards d'années, soit **plus que l'âge de l'Univers** (≈ 13,8 milliards d'années) `[À VÉRIFIER : recalculer depuis les vitesses relevées, ne pas recopier ce chiffre]`. Même au pic de Parker Solar Probe : plusieurs milliards d'années.
- Legs : bord de l'héliosphère · nuage de Oort · espace intergalactique
- Hazards : `isolation`, `supplies`, `comms`, durée supérieure à toute civilisation
- Humain : non. Robot : non plus. Aucun engin n'a quitté le nuage de Oort ; Voyager 1 a franchi l'héliopause en 2012 `[À VÉRIFIER]` mais reste à une fraction infime d'une année-lumière.
- **Consolation obligatoire** : la Voie lactée et Andromède se rencontreront dans ≈ 4 à 5 milliards d'années `[À VÉRIFIER]`. Le trajet se fera tout seul.

### J6 — `into-a-black-hole` · `impossible-today` · difficulté 3

Badge `simulated-visualization` **obligatoire** sur la vue 3D associée.

- Sgr A* : ≈ 26 000 années-lumière, ≈ 4,3 millions de masses solaires, rayon de l'horizon ≈ 12,7 millions de km `[À VÉRIFIER]`
- Trou noir stellaire connu le plus proche : ≈ 1 560 années-lumière (Gaia BH1, 2022) `[À VÉRIFIER — ce chiffre évolue avec les découvertes ; si une source plus récente existe, l'utiliser et l'indiquer]`
- Hazards : `tidal-forces` (effet de marée), dilatation du temps, aucun retour possible au-delà de l'horizon
- Humain : non. Robot : non.
- Contenu : on ne voit pas l'objet, on voit son environnement. Images de l'Event Horizon Telescope : M87* en 2019, Sgr A* en 2022 `[À VÉRIFIER]`
- Formulation exigée pour l'enfant : « Personne n'y est jamais allé, et personne ne pourrait revenir pour raconter. »
- Sources : <https://eventhorizontelescope.org/>

### J7 — `constellations-from-earth` · `do-it-tonight` · difficulté 1

Le trajet le plus important du lot : le seul faisable pour de vrai. Il boucle l'application sur le monde réel.

- 88 constellations reconnues par l'UAI `[À VÉRIFIER]`
- **Révélation centrale** : les étoiles d'une constellation ne sont pas voisines. Dans Orion, Bételgeuse ≈ 550 al, Rigel ≈ 860 al, Alnitak ≈ 1 260 al `[À VÉRIFIER depuis Hipparcos, déjà présent dans le dépôt]`
- Hazards (réels et concrets) : `light-pollution`, `weather`, phase de la Lune, saison, latitude, 20 à 30 min d'adaptation à l'obscurité
- Humain : oui, depuis la préhistoire. Robot : oui, tous les télescopes.
- Étapes de type `real-world` : sortir · s'éloigner des lampes · attendre 20 minutes sans regarder son téléphone · trouver une constellation · revenir la cocher
- Le dépôt possède déjà la vue constellations (Hipparcos + d3-celestial). Réutiliser, ne pas refaire.

---

## 7. Interface

### 7.1 Composants à créer

| Composant | Rôle |
|---|---|
| `JourneyListView` | remplace `MissionListView` : cartes de trajet avec badge de faisabilité |
| `JourneyDetailView` | remplace `MissionDetailView` : les cinq axes + les étapes de jeu |
| `TravelTimeComparator` | barres comparées lumière / avion / sonde / mission réelle |
| `FeasibilityBadge` | badge des cinq statuts, avec libellé enfant |
| `PrecedentCard` | « Un humain ? / Un robot ? » avec date, mission, nombre |
| `HazardList` | dangers, chacun dépliable en simple / curieux / expert |
| `JourneyLegTrack` | les étapes physiques du parcours, en frise |
| `QuizStep` | question, options, explication après réponse |
| `RealWorldStep` | checklist cochable, sans minuteur |
| `DiscoveryLog` | carnet de découverte (§7.5) |

`MissionPanel` est conservé comme conteneur, renommé `JourneyPanel`.

### 7.2 Règles d'affichage

- Le `FeasibilityBadge` est visible sans dérouler, sur la carte **et** sur le détail.
- `TravelTimeComparator` utilise une échelle logarithmique quand le rapport entre la plus courte et la plus longue durée dépasse 1000, avec une mention explicite que l'échelle n'est pas linéaire.
- Un champ absent ne s'affiche pas. Pas de « N/A », pas de « inconnu » sauf si l'inconnu **est** l'information (exoplanètes, trous noirs).
- Toute valeur approximative s'affiche avec `≈` ou « environ ».

### 7.3 Responsive (corrige D7)

`.mission-panel` passe de `position: absolute; width: 296px` à :

- ≥ 900 px : panneau latéral, comportement actuel conservé ;
- < 900 px : feuille glissante en bas de l'écran, hauteur ≈ 60 vh, poignée de redimensionnement, la scène 3D reste visible au-dessus.

Ne pas casser `data-scene-obstacle`.

### 7.4 Accessibilité

Tout ce qui est cliquable dans la scène doit rester atteignable au clavier via `AccessibleObjectList`. Le comparateur de durées expose ses valeurs en texte, pas seulement en largeur de barre. `prefers-reduced-motion` supprime l'animation des barres.

### 7.5 Carnet de découverte

Nouvelle route `/carnet`. Alimenté par les listes `visited*` du store. Affiche : objet, date de première visite, catégorie, trajet associé s'il y en a un. Purement local, aucun compte.

---

## 8. Routes

| Route | Vue |
|---|---|
| `/trajets` | liste des sept trajets |
| `/trajets/:journeyId` | détail d'un trajet |
| `/carnet` | carnet de découverte |

Conserver `/explore/...`, `/compare/...`, `/credits`. Une URL rechargée restaure la vue, comme aujourd'hui.

Ajouter des alias anglais si le dépôt en a déjà la convention ; sinon garder les segments français et ne pas inventer un mécanisme de routage i18n pour ce lot.

---

## 9. i18n

Chaque champ textuel de `JourneyDef` est un `LocalizedText` avec `fr` **et** `en` renseignés. Aucun `TODO`, aucune chaîne française recopiée dans le champ `en`. Un test parcourt tout le catalogue et échoue si un `en` est vide, égal au `fr`, ou absent.

---

## 10. Tests exigés

Le dépôt a 13 tests Vitest. Ce lot doit en ajouter au minimum les catégories suivantes.

### Unitaires — `src/domain/travelTime.test.ts`

- `timeAtSpeed` : cas nominal, distance nulle, vitesse nulle (doit lever ou retourner `Infinity` de façon documentée) ;
- `lightTravelSeconds` : Terre-Lune ≈ 1,28 s, Terre-Soleil ≈ 8,3 min ;
- `formatDistanceForKids` : 1,43e9 km → « 1,43 milliard de km » en fr, « 1.43 billion km » en en ;
- `formatDurationForKids` : couvre chaque palier d'unité ;
- aucune sortie ne contient plus de 4 chiffres significatifs hors mode Expert.

### Unitaires — `src/domain/missionEngine.test.ts`

- une étape ne se valide pas si le trajet n'a pas été démarré (**test de non-régression de D1**) ;
- une étape `ordered` ne se valide pas hors séquence ;
- une étape déjà validée ne se duplique pas ;
- `JOURNEY_COMPLETED` est publié exactement une fois ;
- chaque type d'étape (`visit`, `observe`, `compare`, `reach-scale`, `quiz`, `real-world`) a au moins un test de validation et un test de non-validation.

### Store — `src/store/useCosmosStore.test.ts`

- migration v1 → v3 et v2 → v3 ;
- migration résistante à une forme corrompue (ne jette pas) ;
- `partialize` : `runs` et `activeJourneyId` sont persistés, l'état de voyage éphémère ne l'est pas.

### Données — `src/data/journeys.test.ts`

- les 7 `JourneyId` sont présents, sans doublon de `number` ;
- chaque `LocalizedText` a `fr` et `en` non vides et différents ;
- chaque `Precedent` a une `source` avec une URL ;
- toute `Quantity` a une unité ;
- toute `DurationEntry` de `parker-solar-probe` a une `note` ;
- chaque `steps[]` référence des cibles existant dans les catalogues.

### Intégration — `src/app/App.test.tsx`

- ouvrir `/trajets`, entrer dans `earth-to-moon`, démarrer, voyager vers la Lune, l'étape se valide ;
- le même voyage effectué **avant** de démarrer le trajet ne valide rien ;
- le badge de faisabilité de `into-a-black-hole` est présent et le mot « simulation » apparaît dans la vue.

---

## 11. Performance et non-régression

- `src/domain/` ne doit importer ni React ni three.
- Aucun ajout de dépendance npm pour ce lot. L'event bus, le formatage et le moteur s'écrivent à la main.
- Pas de dégradation du temps de build ni de la taille du bundle au-delà de 5 %. Si le catalogue de trajets fait grossir le bundle initial, le charger en `lazy` par route.
- Aucune erreur console critique.

---

## 12. Lots de livraison

Exécuter dans cet ordre. Un lot = un commit. `npm run verify` vert à chaque fin de lot.

### Lot 1 — Calculs

`src/domain/travelTime.ts` + tests. Aucun impact UI.
**Acceptation :** les tests de formatage passent, `npm run verify` vert.

### Lot 2 — Deux trajets et le comparateur

`journeyTypes.ts`, `journeys.ts` limité à `earth-to-iss` et `earth-to-moon`, `TravelTimeComparator`, `FeasibilityBadge`, `PrecedentCard`. Ajouter l'ISS comme objet réel dans `src/data/solarSystem.ts` : elle n'existe aujourd'hui que dans le prototype Claude Design.
**Acceptation :** `/trajets/earth-to-moon` affiche distance, durées comparées, badge, précédents humain et robot, avec toutes les sources vérifiées.

### Lot 3 — Le moteur

`events.ts`, `missionEngine.ts`, nouveau `MissionState`, migration v3, câblage des émetteurs, suppression des appels directs à `markVisited` depuis l'UI.
**Acceptation :** le test de non-régression de D1 passe. Un voyage effectué avant démarrage ne valide rien.

### Lot 4 — Les cinq trajets restants

`earth-to-mars`, `earth-to-outer-planets`, `milkyway-to-andromeda`, `into-a-black-hole`, `constellations-from-earth`, avec `HazardList`, `JourneyLegTrack`, `QuizStep`, `RealWorldStep`.
**Acceptation :** les sept trajets sont navigables ; les statuts `out-of-reach` et `impossible-today` sont visuellement distincts et ne proposent pas de « voyager ».

### Lot 5 — Carnet, responsive, finitions

`DiscoveryLog`, route `/carnet`, panneau responsive < 900 px, revue clavier et contraste.
**Acceptation :** parcours complet testé à 1440×900, tablette et 375 px de large.

### Lot 6 — Éphémérides vivantes (optionnel, à ne lancer qu'après le lot 5)

Propagation képlérienne à partir du snapshot Horizons pour que la distance Terre–Mars affichée évolue avec la date, au lieu d'être figée au 28 août 2026. Documenter la précision et ses limites dans `docs/SCIENTIFIC_MODEL.md`. Ne pas introduire d'appel réseau navigateur.

---

## 13. Hors périmètre

Ne pas faire dans ce chantier :

- comptes utilisateurs, synchronisation serveur, analytics ;
- narration audio ;
- passage en PWA ;
- refonte de la direction artistique : le design Claude reste la source de vérité UX/UI ;
- nouvelles vues 3D au-delà de ce qui existe déjà.

---

## 14. Documentation à mettre à jour en fin de chantier

- `docs/ARCHITECTURE.md` : event bus, moteur de missions, séparation `domain` / `data` / `scene` / `components` ;
- `docs/SCIENTIFIC_MODEL.md` : section « Trajets » expliquant les cinq statuts de faisabilité et la règle des vitesses de pointe ;
- `docs/DATA_SOURCES.md` : toutes les sources ajoutées, avec date de consultation ;
- `README.md` : mention des trajets et du carnet ;
- `PLAN.md` : lots cochés, écarts constatés entre cette spec et les sources.
