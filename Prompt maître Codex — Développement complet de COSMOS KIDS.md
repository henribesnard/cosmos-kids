# COSMOS KIDS — PROMPT MAÎTRE DE DÉVELOPPEMENT

Tu es responsable du développement complet de **COSMOS KIDS**, depuis la maquette créée avec Claude Design jusqu'à une véritable application web fonctionnelle, performante, maintenable et alimentée par des données astronomiques réelles.

Tu dois travailler comme une équipe composée à la fois de :

- Lead Software Engineer
- architecte frontend
- architecte backend
- ingénieur Three.js/WebGL
- data engineer
- développeur UX
- spécialiste visualisation scientifique
- spécialiste performances web
- QA engineer

Tu dois **développer réellement le produit**, pas produire une simple démonstration ou quelques écrans statiques.

---

# 0. CONTEXTE

COSMOS KIDS est une application éducative immersive destinée principalement aux enfants de 7 à 14 ans.

Le concept peut être résumé ainsi :

> « Google Earth, mais pour explorer l'Univers. »

L'utilisateur commence sur Terre puis peut progressivement explorer :

Terre  
→ Lune  
→ Système solaire  
→ planètes  
→ planètes naines  
→ astéroïdes  
→ comètes  
→ étoiles proches  
→ exoplanètes  
→ nébuleuses  
→ amas stellaires  
→ pulsars  
→ trous noirs  
→ Voie lactée  
→ galaxies  
→ Groupe local  
→ amas de galaxies  
→ superamas  
→ toile cosmique  
→ Univers observable.

La caractéristique fondamentale du produit est la sensation de **voyage continu à travers les différentes échelles de l'Univers**.

L'application doit combiner :

- véritable 3D temps réel ;
- données scientifiques ;
- visualisation pédagogique ;
- exploration libre ;
- missions éducatives ;
- comparaisons d'échelles ;
- informations adaptées aux enfants ;
- transitions cinématographiques.

---

# 1. CLAUDE DESIGN EST LA RÉFÉRENCE VISUELLE

Le repository contient ou contiendra les fichiers produits par Claude Design.

COMMENCE IMPÉRATIVEMENT PAR :

1. inspecter l'ensemble du repository ;
2. identifier les écrans conçus par Claude ;
3. identifier les composants existants ;
4. comprendre les dimensions, espacements, couleurs, typographies et états ;
5. identifier les interactions prévues ;
6. établir une correspondance entre composants de design et composants applicatifs ;
7. ne pas remplacer arbitrairement le design par une autre direction artistique.

Le design fourni par Claude constitue la **source de vérité pour l'UX/UI**.

Tu peux améliorer les détails techniques ou les comportements nécessaires au fonctionnement réel, mais conserve :

- identité visuelle ;
- composition ;
- hiérarchie ;
- animations ;
- panneaux ;
- boutons ;
- navigation ;
- positionnement ;
- expérience générale.

Ne transforme surtout pas COSMOS KIDS en dashboard classique.

La scène spatiale doit rester l'élément dominant.

---

# 2. NE PAS FAIRE UNE FAUSSE 3D

L'application finale ne doit PAS simplement simuler l'espace avec :

- images de fond ;
- vidéos ;
- captures statiques ;
- GIF ;
- animations CSS représentant des planètes.

Les principaux environnements doivent être de véritables scènes 3D interactives.

Utiliser de préférence :

- React
- TypeScript
- Three.js
- React Three Fiber
- Drei

Utiliser les dernières versions stables compatibles.

Si le projet Claude utilise déjà un framework React compatible, le préserver autant que possible.

Si aucune architecture applicative solide n'existe, utiliser une architecture moderne TypeScript adaptée au SSR/SPA, avec rendu 3D exclusivement côté client lorsque nécessaire.

---

# 3. PRINCIPES TECHNIQUES DU MOTEUR COSMIQUE

Un problème fondamental doit être résolu :

les dimensions astronomiques sont impossibles à représenter naïvement dans une seule scène Three.js.

Ne jamais utiliser :

1 mètre réel = 1 unité Three.js

pour l'ensemble de l'Univers.

Implémenter un système multi-échelle.

Créer conceptuellement :

Universe
├── ObservableUniverseFrame
├── LocalGroupFrame
├── MilkyWayFrame
├── StellarNeighborhoodFrame
├── SolarSystemFrame
└── PlanetaryFrame

Chaque niveau possède son propre référentiel spatial.

---

# 4. FLOATING ORIGIN

Mettre en place un système de **floating origin**.

La caméra reste numériquement proche de l'origine de la scène.

Lorsque l'utilisateur voyage, les objets sont repositionnés relativement au référentiel actuel.

Objectif :

éviter les problèmes de précision des nombres flottants dans Three.js/WebGL.

Les coordonnées scientifiques originales doivent cependant être conservées séparément.

Exemple :

scientificCoordinates

≠

renderCoordinates.

---

# 5. TROIS TYPES DE DISTANCE

Le moteur doit gérer trois notions différentes :

### scientificDistance

Distance astronomique réelle.

Exemple :

149 597 870 km Terre-Soleil environ.

### sceneDistance

Distance utilisée dans la scène 3D.

### displayDistance

Valeur présentée pédagogiquement à l'utilisateur.

Ne jamais modifier scientificDistance pour faciliter le rendu.

---

# 6. SYSTÈME D'ÉCHELLE

Créer un système du type :

ScaleLevel

PLANETARY  
SOLAR_SYSTEM  
LOCAL_STARS  
MILKY_WAY  
LOCAL_GROUP  
GALAXY_CLUSTER  
COSMIC_WEB  
OBSERVABLE_UNIVERSE

Les transitions peuvent utiliser :

- interpolation ;
- échelle logarithmique ;
- transformation progressive ;
- changement de référentiel ;
- Level of Detail.

L'utilisateur doit avoir l'impression de dézoomer continuellement même lorsqu'en réalité le moteur change de référentiel.

---

# 7. NAVIGATION

Implémenter réellement les interactions prévues par Claude Design.

## Souris

Clic + drag :
rotation.

Molette :
zoom.

Double clic sur objet :
focus / voyage vers l'objet.

Clic :
sélection.

Hover :
halo + label + résumé.

## Touch

Pinch :
zoom.

Drag :
rotation.

Tap :
sélection.

Double tap :
voyage.

---

# 8. MOTEUR DE VOYAGE

Créer un véritable :

TravelEngine

Exemple :

travelTo("mars")

doit produire :

CURRENT_POSITION

→ préparation

→ camera departure

→ accélération

→ changement éventuel de ScaleLevel

→ interpolation

→ apparition progressive destination

→ décélération

→ orbital approach

→ camera lock

→ information panel.

Créer une state machine explicite.

Exemple :

IDLE  
PREPARING  
DEPARTING  
CRUISING  
SCALE_TRANSITION  
APPROACHING  
ARRIVED

---

# 9. NE PAS BLOQUER LE VOYAGE SUR LES DISTANCES RÉELLES

Voyager vers Proxima Centauri ne doit évidemment pas durer 4,24 ans.

Créer un temps cinématique pédagogique.

Exemple :

Terre → Lune : 2-3 s

Terre → Mars : 4-6 s

Terre → Jupiter : 5-7 s

Système solaire → Proxima : 6-8 s

Voie lactée → Andromède : 7-10 s.

Pendant le déplacement afficher la distance réelle.

---

# 10. DONNÉES : RÈGLE ABSOLUE

**Aucune donnée scientifique ne doit être inventée.**

Si une donnée est inconnue :

null

ou

unknown

mais jamais une valeur fabriquée.

Chaque donnée scientifique doit pouvoir être associée à :

source

sourceId

retrievedAt

licence

citation

confidence éventuellement.

---

# 11. ARCHITECTURE DES SOURCES

Ne construis PAS Cosmos Kids autour d'une seule API.

Créer un :

AstronomyDataProvider

et plusieurs adapters.

Exemple :

providers/
    jpl/
    nasa-exoplanet/
    gaia/
    simbad/
    openngc/
    nasa-assets/
    usgs/
    local-curated/

Chaque provider transforme ses données vers le modèle Cosmos Kids.

Le frontend ne doit jamais dépendre directement du format d'une API externe.

---

# 12. SOURCE N°1 — JPL HORIZONS

Utiliser en priorité **NASA/JPL Horizons** pour le Système solaire.

Horizons doit fournir lorsque pertinent :

- positions ;
- coordonnées ;
- vitesses ;
- vecteurs ;
- éphémérides ;
- éléments orbitaux ;
- données temporelles.

Utiliser les identifiants officiels JPL/Horizons.

Exemples :

Soleil

Mercure

Vénus

Terre

Lune

Mars

Jupiter

Saturne

Uranus

Neptune

Pluton

et leurs principaux satellites.

Ne jamais calculer les positions actuelles des planètes à partir de simples orbites circulaires décoratives lorsque des données Horizons peuvent être utilisées.

---

# 13. DATE D'OBSERVATION

Ajouter au moteur :

simulationDate.

Par défaut :

NOW.

L'utilisateur pourra plus tard modifier le temps.

Lorsqu'une simulationDate change :

les positions du Système solaire doivent être recalculées depuis les données astronomiques ou un modèle orbital fiable basé sur celles-ci.

---

# 14. CACHE DES ÉPHÉMÉRIDES

Ne pas interroger Horizons 60 fois par seconde.

Créer un pipeline serveur.

Précharger des éphémérides.

Exemple :

positions toutes les 6 heures ou 24 heures.

Interpoler entre deux points.

Stocker dans :

EphemerisSample.

Exemple :

objectId  
timestamp  
x  
y  
z  
vx  
vy  
vz  
referenceFrame  
source.

---

# 15. ASTÉROÏDES ET COMÈTES

Utiliser :

**JPL Small-Body Database / SBDB**

pour :

- astéroïdes ;
- comètes ;
- objets géocroiseurs ;
- propriétés physiques disponibles ;
- éléments orbitaux.

Ne pas afficher des millions d'astéroïdes simultanément.

Créer des niveaux :

educational

featured

extended.

Featured pourra contenir par exemple :

Cérès  
Vesta  
Pallas  
Bennu  
Ryugu  
Éros  
Halley  
67P  
etc.

---

# 16. EXOPLANÈTES

Utiliser :

**NASA Exoplanet Archive**.

Utiliser en priorité son interface TAP actuelle.

Tables importantes :

ps

pscomppars

Récupérer lorsque disponible :

pl_name  
hostname  
ra  
dec  
distance  
planet radius  
planet mass  
orbital period  
semi-major axis  
eccentricity  
equilibrium temperature  
discovery year  
discovery method  
stellar radius  
stellar mass  
stellar temperature.

Ne jamais présenter une exoplanète comme habitable simplement parce qu'elle ressemble à la Terre.

Créer des statuts prudents comme :

unknown

potentially_temperate

habitable_zone_candidate

extreme_environment.

Afficher clairement :

« Nous ne savons pas si une vie existe sur cette planète. »

---

# 17. ÉTOILES

Deux stratégies sont possibles.

## Source scientifique principale

ESA Gaia.

Utiliser les catalogues Gaia publiquement accessibles pour :

- position ;
- parallaxe ;
- distance estimable lorsque pertinente ;
- mouvement propre ;
- magnitude ;
- couleur ;
- paramètres stellaires disponibles.

Ne jamais charger des milliards de lignes Gaia dans le navigateur.

Créer un pipeline de preprocessing.

---

# 18. CATALOGUE STELLAIRE OPTIMISÉ

Construire plusieurs datasets.

stars-nearby.bin

stars-bright.bin

stars-galactic-medium.bin

stars-galactic-background.bin

Exemple :

### nearby

< 100 années-lumière

haute précision.

### bright

étoiles visibles remarquables.

### medium

quelques dizaines ou centaines de milliers d'étoiles.

### galactic-background

échantillonnage statistique / visuel beaucoup plus important.

---

# 19. ALTERNATIVE HYG

Évaluer **HYG Star Database** comme dataset simplifié pour la couche pédagogique / étoiles nommées.

Avant toute intégration :

- vérifier sa version actuelle ;
- vérifier sa licence ;
- enregistrer attribution ;
- documenter provenance.

Ne jamais copier un dataset dont la licence n'est pas compatible avec le projet.

---

# 20. SIMBAD

Utiliser **SIMBAD / CDS** pour résoudre et enrichir les objets astronomiques nommés.

Usage particulièrement utile pour :

- Sirius ;
- Betelgeuse ;
- Rigel ;
- Vega ;
- Polaris ;
- Sagittarius A* ;
- M87 ;
- M31 ;
- M42 ;
- Crab Nebula ;
- pulsars ;
- objets remarquables.

Utiliser l'API/TAP adaptée à un usage programmatique.

Ne pas parser les pages HTML.

---

# 21. DEEP SKY OBJECTS

Utiliser **OpenNGC** pour les objets NGC/IC lorsque sa licence convient.

Exemples :

galaxies

nébuleuses

amas globulaires

amas ouverts

nébuleuses planétaires.

Importer :

catalog identifier  
name  
type  
RA  
DEC  
magnitude  
size lorsque disponible  
constellation  
major/minor axis.

---

# 22. OBJETS EMBLÉMATIQUES

Créer un catalogue éditorial spécial :

featured_objects.

Exemple :

Earth  
Moon  
Mars  
Jupiter  
Saturn  
Sun  
Proxima Centauri  
Sirius  
Betelgeuse  
TRAPPIST-1  
Kepler-186f  
Orion Nebula  
Crab Nebula  
Pillars of Creation  
Pleiades  
Sagittarius A*  
M87*  
Andromeda Galaxy  
Large Magellanic Cloud.

Ces objets auront davantage de contenu pédagogique.

---

# 23. TROUS NOIRS

Il n'existe pas nécessairement une API publique unique regroupant toutes les propriétés éducatives nécessaires.

Créer donc un catalogue CURATED.

Mais chaque propriété doit avoir une provenance scientifique.

Exemple :

blackholes.json

id  
name  
aliases  
type  
ra  
dec  
distance  
mass  
hostGalaxy  
description  
references[].

Commencer avec quelques objets fiables :

Sagittarius A*

M87*

Cygnus X-1

et éventuellement quelques autres objets bien documentés.

---

# 24. REPRÉSENTATION D'UN TROU NOIR

Ne pas prétendre afficher une photographie réelle.

Créer un shader ou une simulation visuelle inspirée physiquement :

- event horizon ;
- photon ring ;
- accretion disk ;
- gravitational lensing approximatif ;
- Doppler brightness asymmetry ;
- background distortion ;
- relativistic jets lorsque pertinent.

Afficher discrètement :

« Visualisation simulée »

lorsque nécessaire.

---

# 25. PULSARS

Créer également un catalogue pédagogique de pulsars.

Utiliser des données astronomiques fiables.

Afficher :

position

distance lorsque connue

rotation period

type

associated nebula éventuellement.

Animation :

étoile à neutrons

+

deux faisceaux

+

rotation.

La vitesse d'animation peut être ralentie visuellement tout en affichant la véritable fréquence.

---

# 26. GALAXIES

Pour les galaxies :

OpenNGC + SIMBAD + éventuellement une source scientifique complémentaire vérifiée.

Ne jamais inventer une distance lorsque seul un redshift est disponible.

Le modèle doit accepter :

distanceValue

distanceUnit

distanceMethod

distanceUncertainty.

---

# 27. ASSETS VISUELS

Chercher en priorité des ressources provenant de :

NASA 3D Resources

NASA Scientific Visualization Studio

NASA Planetary Data System

NASA mission imagery

USGS Astrogeology.

Pour chaque asset sauvegarder :

assetId  
source  
originalUrl  
authorAgency  
licence  
credit  
downloadedAt  
objectId.

---

# 28. PLANÈTES : TEXTURES

Utiliser de véritables cartes planétaires lorsque disponibles.

Prévoir :

diffuse / albedo  
normal/bump  
clouds  
night lights  
rings  
height map.

Exemple Terre :

earth_day

earth_clouds

earth_night

earth_normal.

Ne jamais intégrer une texture trouvée aléatoirement sur Google Images.

---

# 29. NASA 3D RESOURCES

Vérifier en priorité si un asset existe dans la collection NASA 3D Resources.

Cette source peut notamment fournir :

- modèles 3D ;
- textures ;
- objets de mission ;
- ISS ;
- astéroïdes ;
- engins spatiaux.

Optimiser ensuite les modèles pour le web.

Convertir en :

GLB / GLTF

si nécessaire.

---

# 30. PIPELINE ASSETS

Créer :

scripts/assets/

download-assets

validate-assets

optimize-textures

generate-thumbnails

compress-gltf.

Les assets originaux ne doivent pas nécessairement tous être embarqués en production.

Créer des versions web optimisées.

Utiliser lorsque pertinent :

WebP

AVIF

KTX2

Basis

Draco

Meshopt.

---

# 31. MANIFESTE DES SOURCES

Créer obligatoirement :

DATA_SOURCES.md

Ce fichier doit documenter pour chaque source :

- nom ;
- organisme ;
- usage ;
- méthode d'accès ;
- tables/endpoints ;
- licence ;
- attribution requise ;
- date de vérification ;
- limitations.

---

# 32. ATTRIBUTIONS

Créer également :

ATTRIBUTIONS.md

et une page accessible depuis l'application :

/credits

Afficher les crédits nécessaires.

IMPORTANT :

ne jamais utiliser le logo NASA de manière laissant penser que COSMOS KIDS est un produit officiel ou sponsorisé par la NASA.

---

# 33. MODÈLE DE DONNÉES PRINCIPAL

Créer un modèle générique.

CelestialObject

id  
slug  
name  
aliases  
type  
subtype  
description  
kidDescription  
parentId  
coordinateSystem  
raDeg  
decDeg  
distance  
distanceUnit  
distanceParsec  
radiusKm  
massKg  
temperatureK  
absoluteMagnitude  
apparentMagnitude  
spectralType  
discoveredBy  
discoveryYear  
sourceIds  
featured  
renderConfig  
educationalContent.

Tous les champs ne sont pas obligatoires.

---

# 34. TYPES D'OBJETS

Créer une enum extensible :

STAR

PLANET

DWARF_PLANET

MOON

ASTEROID

COMET

EXOPLANET

NEBULA

STAR_CLUSTER

GALAXY

GALAXY_CLUSTER

BLACK_HOLE

NEUTRON_STAR

PULSAR

QUASAR

SUPERNOVA_REMNANT

COSMIC_STRUCTURE.

---

# 35. SÉPARER SCIENCE ET RENDER

Créer :

ScientificObject

et :

RenderDescriptor.

Exemple RenderDescriptor :

geometryType  
texture  
shader  
radiusScale  
emissive  
colorTemperature  
particleCount  
lod  
labelPriority.

Une valeur scientifique ne doit jamais être modifiée pour améliorer le rendu.

---

# 36. BACKEND

Mettre en place une véritable couche serveur.

Fonctions :

- agrégation APIs ;
- normalisation ;
- cache ;
- recherche ;
- missions ;
- contenu pédagogique ;
- catalogue ;
- attribution ;
- éventuellement progression.

Éviter les appels directement depuis le navigateur vers toutes les APIs scientifiques.

---

# 37. DATABASE

Utiliser une base SQL robuste, de préférence PostgreSQL.

Prévoir éventuellement une extension géospatiale uniquement si réellement utile.

Tables possibles :

celestial_objects

object_aliases

scientific_properties

ephemeris_samples

exoplanets

stars

deep_sky_objects

assets

data_sources

citations

missions

mission_steps

educational_facts

featured_objects.

---

# 38. PROVENANCE DES DONNÉES

Créer :

DataSource

id  
name  
agency  
dataset  
licence  
retrievedAt  
datasetVersion  
citationText.

Créer également :

ScientificPropertySource

objectId  
property  
value  
sourceId  
sourceRecordId  
retrievedAt.

Objectif :

être capable de savoir d'où vient une information.

---

# 39. CACHE

Les services scientifiques externes ne doivent pas devenir des dépendances runtime critiques.

Implémenter :

cache local

+

base de données

+

refresh jobs.

Le site doit continuer à fonctionner si une API externe est momentanément indisponible.

---

# 40. INGESTION

Créer des commandes explicites.

Exemple conceptuel :

data:sync:solar-system

data:sync:exoplanets

data:sync:stars

data:sync:deep-sky

data:sync:featured

data:validate

data:report.

---

# 41. NE PAS TOUT SYNCHRONISER

Gaia contient énormément de données.

Ne surtout pas télécharger naïvement toute la base.

Définir des requêtes ciblées et des datasets d'affichage.

Pour l'expérience enfant :

qualité > quantité.

Afficher 100 000 étoiles correctement vaut mieux que tenter d'afficher des milliards d'entrées.

---

# 42. RENDU DES ÉTOILES

Utiliser :

InstancedMesh

ou

BufferGeometry / Points

ou shaders custom.

Ne pas créer un composant React par étoile.

La scène doit pouvoir afficher des centaines de milliers d'étoiles sans exploser le DOM ou le scene graph.

---

# 43. COULEURS DES ÉTOILES

Déduire la couleur depuis la température effective lorsque disponible.

Utiliser une conversion physiquement plausible température → RGB.

Ne pas stocker arbitrairement :

Sirius = "#ffffff"

si une donnée scientifique permet de calculer la couleur.

---

# 44. TAILLES

La taille réelle des étoiles doit être disponible pédagogiquement.

Mais la taille de rendu doit utiliser un système adapté afin que les étoiles restent visibles.

Créer :

physicalRadius

renderRadius.

---

# 45. SYSTÈME SOLAIRE

Créer une vue réellement interactive.

Afficher :

Soleil

8 planètes

principales lunes

planètes naines sélectionnées

ceinture d'astéroïdes simplifiée.

Options :

Orbites  
Labels  
Trajectoires  
Échelle  
Vitesses.

---

# 46. ORBITES

Les orbites ne doivent pas simplement être des cercles décoratifs.

À partir des éléments orbitaux disponibles, générer des ellipses plausibles.

Pour les positions temporelles utiliser les données scientifiques appropriées.

---

# 47. ROTATION PLANÉTAIRE

Utiliser lorsque disponible :

rotation period

axial tilt.

Cela doit affecter :

rotation animation

inclinaison.

---

# 48. ANNEAUX

Saturne doit disposer d'une représentation dédiée.

Créer plusieurs textures/couches ou un shader transparent.

Prévoir aussi la possibilité de représenter les anneaux d'autres planètes.

---

# 49. ATMOSPHÈRES

Créer un composant générique :

Atmosphere.

Shader permettant :

Rayleigh scattering approximatif

halo atmosphérique

sun direction.

Terre doit être particulièrement soignée.

---

# 50. SOLEIL

Ne pas représenter le Soleil comme une simple sphère jaune.

Créer :

surface noise

granulation approximative

emissive shader

corona

subtle flare.

Limiter les effets afin de conserver de bonnes performances.

---

# 51. VOIE LACTÉE

La Voie lactée ne peut pas être représentée étoile par étoile intégralement.

Construire plusieurs couches :

1. étoiles réelles proches ;
2. étoiles Gaia échantillonnées ;
3. densité galactique procédurale ;
4. poussières ;
5. glow galactique ;
6. bras spiraux approximés.

Afficher clairement la position :

« Nous sommes ici ».

---

# 52. GALAXIES LOINTAINES

Pour les galaxies extrêmement lointaines :

utiliser des techniques LOD.

Très loin :

sprites / billboards.

Distance intermédiaire :

impostor.

Proche :

modèle volumétrique/procédural.

---

# 53. TOILE COSMIQUE

La toile cosmique ne doit pas prétendre montrer chaque galaxie réelle.

Créer une visualisation éducative basée sur des structures réalistes et clairement signalée comme représentation.

Ne jamais présenter du bruit procédural comme données d'observation réelles.

---

# 54. RECHERCHE

Créer une recherche universelle.

Recherche par :

nom

alias

catalogue

type.

Exemples :

Mars

Jupiter

M31

Andromeda

Sagittarius A*

Proxima Centauri

TRAPPIST-1.

Créer un index local afin que la recherche soit rapide.

---

# 55. RÉSULTATS DE RECHERCHE

Afficher :

nom

type

distance

thumbnail

parent context.

Cliquer :

sélection.

Double clic ou CTA :

Voyager.

---

# 56. FIL D'ARIANE COSMIQUE

Implémenter :

Univers
› Groupe local
› Voie lactée
› Bras d'Orion
› Système solaire
› Terre.

Chaque niveau est interactif.

---

# 57. SCALE NAVIGATOR

Créer le composant imaginé par Claude Design :

ScaleNavigator.

Il montre :

Terre  
Système solaire  
Étoiles proches  
Voie lactée  
Groupe local  
Univers observable.

Le niveau courant est visible.

---

# 58. INFO PANEL

Créer un composant générique :

CelestialInfoPanel.

Exemple planète :

nom

type

diamètre

masse

gravité

température

distance

jour

année

lunes

fun fact.

Les données absentes ne doivent simplement pas apparaître.

---

# 59. EXPLICATIONS PAR NIVEAU

Créer :

Simple

Curieux

Expert.

Le contenu doit être séparé des données brutes.

Exemple :

educationalContent.simple

educationalContent.curious

educationalContent.expert.

---

# 60. LANGUE

L'application initiale est en français.

Mais préparer l'internationalisation dès maintenant.

Utiliser des clés i18n.

Pas de longues chaînes françaises dispersées dans les composants.

Préparer au minimum :

fr

en.

---

# 61. CONTENU PÉDAGOGIQUE

Les contenus destinés aux enfants doivent être :

- exacts ;
- courts ;
- engageants ;
- sans exagération trompeuse.

Exemple acceptable :

« Jupiter pourrait contenir environ 1 300 Terres en volume. »

Mais vérifier la donnée avant utilisation.

---

# 62. INCERTITUDE SCIENTIFIQUE

Lorsque les scientifiques ne connaissent pas précisément une donnée, le dire.

Utiliser éventuellement :

≈

« environ »

« estimé »

« pourrait ».

Exemple exoplanètes.

---

# 63. MISSIONS

Créer un véritable MissionEngine.

Mission :

id  
title  
description  
difficulty  
steps  
reward.

Step :

VISIT_OBJECT

DISCOVER_TYPE

COMPARE_OBJECTS

ZOOM_TO_SCALE

ANSWER_QUIZ.

---

# 64. MISSION EXEMPLE

Mission :

« Notre voisinage spatial »

Étapes :

1. quitter la Terre ;
2. trouver la Lune ;
3. visiter Mars ;
4. observer Jupiter ;
5. trouver les anneaux de Saturne.

Le système doit détecter réellement ces événements.

---

# 65. EVENT BUS

Créer des événements applicatifs :

OBJECT_SELECTED

OBJECT_VISITED

SCALE_CHANGED

COMPARISON_COMPLETED

MISSION_STARTED

MISSION_STEP_COMPLETED

DISCOVERY_UNLOCKED.

Le système de missions ne doit pas dépendre directement des composants UI.

---

# 66. CARNET DE DÉCOUVERTE

Même s'il n'a pas été prioritaire dans la première maquette, préparer son architecture.

Lorsqu'un objet est visité :

DiscoveryEntry.

Afficher plus tard :

objets découverts

date de découverte

catégorie.

---

# 67. PAS DE COMPTE OBLIGATOIRE EN MVP

COSMOS KIDS cible les enfants.

Ne pas imposer de compte utilisateur pour explorer.

Stocker la progression locale dans un premier temps.

Architecture compatible avec synchronisation serveur ultérieure.

---

# 68. PRIVACY BY DESIGN

Ne pas intégrer :

tracking publicitaire

profilage enfant

publicité ciblée

collecte inutile de données personnelles.

Les analytics éventuelles devront respecter cette philosophie.

---

# 69. COMPARATEUR

Créer un outil :

Compare.

Exemple :

Terre vs Jupiter

Jupiter vs Soleil

Soleil vs Betelgeuse.

Deux modes :

TRUE_SCALE

PEDAGOGICAL_SCALE.

---

# 70. TRUE SCALE

Dans TRUE_SCALE :

les tailles doivent être réellement proportionnelles.

Afficher éventuellement une barre d'échelle.

---

# 71. TEMPS

Créer TimeControls.

Pause

Play

×10

×100

×1 000

×10 000.

Le temps simulé modifie :

rotation

positions orbitales

positions pertinentes.

Ne pas recalculer des requêtes HTTP en permanence.

---

# 72. VITESSE DE LA LUMIÈRE

Créer une expérience pédagogique dédiée.

Données calculées depuis les distances réelles.

Afficher par exemple :

Terre → Lune

Terre → Soleil

Terre → Neptune

Terre → Proxima Centauri

Terre → Andromède.

Calculer les valeurs plutôt que les hardcoder lorsque possible.

---

# 73. REGARDER DANS LE PASSÉ

Lorsqu'un objet se trouve à N années-lumière :

afficher :

« La lumière que tu vois est partie il y a environ N ans. »

Utiliser la distance scientifique.

---

# 74. NOVA

Implémenter le compagnon NOVA prévu dans le design.

NOVA est contextuel.

Exemples :

sur Mars :
« Pourquoi Mars est-elle rouge ? »

près d'un trou noir :
« Même la lumière ne peut pas s'en échapper après l'horizon des événements. »

NOVA ne doit jamais bloquer l'écran.

---

# 75. MODE EXPLORATION LIBRE

Créer un mode immersif.

Masquer la majorité du HUD.

Conserver :

recherche

labels essentiels

navigation

bouton de sortie.

---

# 76. LABEL MANAGEMENT

Un problème classique des cartes spatiales est la saturation visuelle.

Créer :

LabelManager.

Priorité basée sur :

importance

distance caméra

taille apparente

objet sélectionné

objet mission

zoom level.

Éviter les collisions de labels.

---

# 77. LEVEL OF DETAIL

Mettre en place un LOD agressif.

Un objet extrêmement éloigné :

point.

Plus proche :

sprite.

Encore plus proche :

low-poly sphere.

Très proche :

high-detail sphere + textures + atmosphère.

---

# 78. FRUSTUM / OCCLUSION

Ne pas mettre à jour inutilement les objets hors caméra.

Utiliser :

frustum culling

LOD

batching

instancing.

---

# 79. PERFORMANCE TARGET

Desktop moderne :

viser 60 FPS.

Machine plus faible :

maintenir expérience fluide avec qualité réduite.

Créer QualityManager :

ULTRA  
HIGH  
MEDIUM  
LOW  
AUTO.

AUTO par défaut.

---

# 80. QUALITÉ AUTOMATIQUE

Mesurer :

FPS

devicePixelRatio

GPU capability approximative

memory pressure lorsque disponible.

Adapter :

nombre de particules

shadow quality

postprocessing

texture resolution

star count

volumetric effects.

---

# 81. MOBILE

Sur mobile :

réduire densité d'étoiles

désactiver certains shaders coûteux

réduire postprocessing.

Ne pas supprimer l'exploration.

---

# 82. CHARGEMENT

Le premier écran doit être disponible rapidement.

Ne pas télécharger toutes les textures de l'Univers au lancement.

Utiliser :

lazy loading

route-based loading

asset streaming

preload destination.

---

# 83. TRAVEL PRELOADING

Lorsque l'utilisateur clique sur Saturne :

commencer immédiatement le voyage.

Pendant les premières secondes :

précharger Saturne.

Le voyage sert également de transition de chargement.

---

# 84. PLACEHOLDERS

Si une texture manque temporairement :

créer un fallback procédural propre.

Mais garder :

assetStatus = placeholder.

Ne jamais masquer le fait qu'il s'agit d'un placeholder dans les données internes.

---

# 85. ACCESSIBILITÉ

Même si la scène est 3D :

les boutons doivent être accessibles clavier.

Prévoir :

ARIA

focus states

contraste

reduced motion.

Si :

prefers-reduced-motion

réduire les voyages cinématographiques.

---

# 86. AUDIO

Préparer une architecture :

NarrationEngine.

Mais ne pas rendre la lecture audio obligatoire pour le MVP.

Prévoir :

play

pause

subtitles.

---

# 87. ROUTING

L'état de l'Univers doit pouvoir être partagé.

Exemple conceptuel :

/explore/solar-system/mars

/explore/milky-way/sagittarius-a-star

/compare/earth/jupiter

/missions/solar-neighborhood.

Une URL rechargée doit restaurer la vue.

---

# 88. STATE MANAGEMENT

Séparer clairement :

navigationState

cameraState

simulationState

selectedObject

UIState

missionState

discoveryState.

Éviter un énorme state React monolithique.

---

# 89. COMPONENTS

Créer notamment :

UniverseViewport  
CosmicScene  
CameraController  
TravelController  
CelestialObject  
Planet  
Star  
Moon  
BlackHole  
Nebula  
Galaxy  
OrbitPath  
Atmosphere  
StarField  
ObjectLabel  
ObjectTooltip  
CelestialInfoPanel  
SearchOverlay  
CosmicBreadcrumb  
ScaleNavigator  
UniverseMinimap  
MissionPanel  
ComparePanel  
TravelOverlay  
TimeControls  
DisplayControls  
NovaAssistant.

---

# 90. DESIGN SYSTEM

Extraire depuis Claude Design :

colors

spacing

radius

glass effects

typography

shadows

animations

z-index layers.

Créer des tokens centralisés.

Ne pas reproduire les mêmes valeurs CSS à la main dans 50 fichiers.

---

# 91. TESTS

Créer des tests.

Unit tests :

unit conversion

coordinate conversion

scale conversion

data normalization

mission state.

Integration tests :

search

select

travel

compare

missions.

E2E :

Landing → Earth → Mars

Earth → Solar system → Saturn

Search → Sagittarius A*

Mission completion.

---

# 92. TESTS VISUELS

Utiliser des screenshots de référence du design Claude.

Créer des visual regression tests lorsque pertinent.

Les principaux écrans doivent rester visuellement proches du design.

---

# 93. DATA VALIDATION

Chaque pipeline d'import doit être validé.

Exemple :

radius >= 0

distance >= 0

RA 0..360

DEC -90..90

temperature positive

source mandatory.

Les valeurs aberrantes doivent être loguées.

---

# 94. UNITÉS

Ne pas stocker des nombres sans unité implicite ambiguë.

Créer une convention centrale.

Exemple interne :

distance SI ou parsec selon domaine avec type explicite.

Affichage :

km

AU

light-minutes

light-years

parsecs.

Choisir automatiquement l'unité pédagogique appropriée.

---

# 95. CONVERSIONS

Créer une bibliothèque centrale :

kmToAU

auToKm

pcToLightYears

lightYearsToPc

kelvinToCelsius

earthMassesToKg

jupiterMassesToKg.

Tests obligatoires.

---

# 96. ÉVITER LES NOMBRES ILLISIBLES

Pour enfant :

1.43 milliard km

plutôt que :

1 430 000 000 km

Afficher la notation scientifique seulement dans mode Expert.

---

# 97. REPRODUCTIBILITÉ

Les datasets générés doivent pouvoir être reconstruits.

Ne pas modifier manuellement un CSV produit par un import.

Pipeline :

source

→ raw

→ normalize

→ validate

→ curate

→ export.

---

# 98. DOSSIERS DATA

Architecture suggérée :

data/
    raw/
    normalized/
    curated/
    generated/
    manifests/

Ne pas committer des datasets gigantesques inutilement.

---

# 99. SOURCES DANS L'INTERFACE

Chaque fiche peut avoir :

« Sources scientifiques »

dans un panneau secondaire.

Exemple :

NASA/JPL  
NASA Exoplanet Archive  
ESA/Gaia  
CDS/SIMBAD.

---

# 100. OBSERVABILITÉ

Logger :

API failures

data sync

asset failures

shader errors

WebGL context loss.

Ne jamais exposer des erreurs techniques aux enfants.

Afficher plutôt :

« Impossible de charger cet objet pour le moment. »

---

# 101. FALLBACK WEBGL

Détecter WebGL.

Si non disponible :

proposer une version simplifiée 2D/informative.

Ne pas afficher simplement une page blanche.

---

# 102. PWA

Préparer le projet pour devenir éventuellement une PWA.

Mais ne pas sacrifier le MVP pour cela.

---

# 103. PREMIÈRE VERSION FONCTIONNELLE

La première release réellement utilisable doit comprendre au minimum :

### Landing

### Terre

- vraie sphère ;
- vraie texture ;
- atmosphère ;
- rotation ;
- sélection.

### Lune

### Système solaire

- Soleil ;
- 8 planètes ;
- orbites ;
- positions réalistes ;
- voyage.

### Planètes détaillées

au minimum :

Mercure  
Vénus  
Terre  
Mars  
Jupiter  
Saturne  
Uranus  
Neptune.

### étoiles proches

### quelques exoplanètes

### quelques nébuleuses

### quelques galaxies

### Sagittarius A*

### M87*

### recherche

### comparateur

### missions

### zoom multi-échelle.

---

# 104. DEUXIÈME COUCHE DE CONTENU

Ajouter ensuite :

Pluton

Cérès

principales lunes

astéroïdes

comètes

plus d'exoplanètes

plus d'étoiles

pulsars

amas

objets Messier

NGC.

---

# 105. LANDING

Reproduire le design Claude.

CTA principal :

« Commencer depuis la Terre »

doit réellement lancer la scène Terre.

Éviter une page marketing déconnectée de l'application.

---

# 106. TERRE → SYSTÈME SOLAIRE

C'est la transition la plus importante du MVP.

Elle doit être extrêmement soignée.

Terre proche

→ recul caméra

→ apparition Lune

→ orbite Terre

→ Soleil

→ autres planètes

→ Système solaire complet.

Aucun changement brutal de page.

---

# 107. SYSTÈME SOLAIRE → VOIE LACTÉE

Deuxième transition signature.

En dézoomant :

orbites disparaissent

Soleil devient étoile

étoiles proches apparaissent

densité augmente

structure Voie lactée apparaît

label :

« Nous sommes ici ».

---

# 108. UNIVERS OBSERVABLE

Il s'agit d'une représentation éducative.

Ne pas prétendre disposer d'une véritable carte 3D complète de toutes les galaxies de l'Univers observable.

Expliquer les simplifications.

---

# 109. ACCURACY BADGE

Prévoir éventuellement un petit système :

Observed

Calculated

Catalogued

Estimated

Simulated visualization.

Exemple trou noir :

données = Observed/Estimated

rendu visuel = Simulated visualization.

---

# 110. README

Créer un README de très bonne qualité.

Inclure :

installation

architecture

commands

environment

data sync

asset sync

tests

production build

deployment.

---

# 111. ARCHITECTURE DOCUMENT

Créer :

docs/ARCHITECTURE.md

Expliquer :

rendering architecture

coordinate systems

floating origin

ScaleLevels

data providers

travel engine

state architecture

caching.

---

# 112. SCIENCE DOCUMENT

Créer :

docs/SCIENTIFIC_MODEL.md

Expliquer :

distances

coordinate systems

sources

simplifications

render scaling

uncertainty.

---

# 113. NE PAS UTILISER DE CLÉS SECRÈTES FRONTEND

Toute API nécessitant éventuellement une clé doit passer par le serveur.

Créer :

.env.example

sans secret.

---

# 114. DATA LICENCES

Avant de télécharger ou redistribuer une source :

vérifier sa licence actuelle.

Créer un script ou fichier :

data-sources.manifest.json

avec :

name  
dataset  
license  
attribution  
redistributionAllowed  
commercialUseAllowed  
shareAlike  
sourceCheckedAt.

Si la licence est ambiguë :

ne pas importer automatiquement.

Documenter le blocage.

---

# 115. LICENCES SHARE-ALIKE

Si un dataset CC BY-SA ou ODbL est utilisé :

identifier précisément les obligations.

Ne pas supposer que « gratuit » signifie « sans conditions ».

Préparer les attributions et les fichiers nécessaires.

---

# 116. PRIORITÉ SOURCES

Ordre général de confiance :

1. source scientifique officielle ;
2. archive NASA/ESA/USGS ;
3. observatoire ou centre scientifique ;
4. catalogue académique ;
5. catalogue communautaire libre vérifié.

Éviter :

blogs

sites d'astronomie grand public

Wikipedia comme source primaire

données copiées sans provenance.

---

# 117. SOURCES À ÉVALUER EN PRIORITÉ

Vérifie toi-même leurs documentations actuelles avant implémentation :

### Solar system
NASA/JPL Horizons

### Asteroids/comets
NASA/JPL SBDB

### Exoplanets
NASA Exoplanet Archive TAP

### Stars
ESA Gaia Archive

### Named astronomical objects
CDS SIMBAD TAP

### NGC/IC deep sky
OpenNGC

### Planetary mission data
NASA Planetary Data System

### Planetary maps
USGS Astrogeology

### textures/models
NASA 3D Resources

### scientific visualizations
NASA Scientific Visualization Studio.

N'utilise jamais cette liste aveuglément : contrôle les conditions d'utilisation et la documentation actuelle.

---

# 118. DONNÉES NON DISPONIBLES PAR API

Pour les données pédagogiques qui nécessitent une curation manuelle :

créer des fichiers versionnés.

Exemple :

curated/black-holes.json

Chaque valeur contient obligatoirement :

value

source

sourceRecord

retrievedAt.

---

# 119. AUCUNE HALLUCINATION

Tu ne dois jamais remplir une fiche en inventant une valeur simplement pour que l'interface paraisse complète.

Exemple :

si aucune température fiable n'existe :

ne pas afficher température.

---

# 120. TRAVAIL AUTONOME

Tu dois être autonome.

Ne m'arrête pas à chaque petit choix technique.

Lorsque plusieurs solutions existent :

1. analyse ;
2. choisis la plus robuste ;
3. documente brièvement ta décision ;
4. implémente.

Pose une question uniquement si une décision est réellement bloquante et impossible à déduire du design ou du repository.

---

# 121. NE PAS S'ARRÊTER AU SCAFFOLDING

Le travail n'est PAS terminé lorsque :

- les dossiers existent ;
- les routes existent ;
- quelques composants placeholder existent.

Le travail est terminé lorsque les parcours principaux fonctionnent réellement.

---

# 122. CRITÈRES DE FIN

Je dois pouvoir :

1. ouvrir COSMOS KIDS ;
2. voir la Terre tourner ;
3. la manipuler à la souris ;
4. dézoomer ;
5. voir la Lune ;
6. atteindre le Système solaire ;
7. sélectionner Mars ;
8. voyager vers Mars ;
9. lire ses vraies informations ;
10. revenir au Système solaire ;
11. chercher Saturne ;
12. visiter Saturne ;
13. dézoomer vers les étoiles ;
14. voir de vraies étoiles issues d'un catalogue ;
15. sélectionner Proxima Centauri ;
16. découvrir une exoplanète ;
17. atteindre la représentation de la Voie lactée ;
18. localiser notre Soleil ;
19. observer Sagittarius A* ;
20. comprendre qu'il s'agit d'une simulation visuelle ;
21. visiter Andromède ;
22. comparer Terre et Jupiter ;
23. effectuer une mission ;
24. accéder aux sources et crédits scientifiques.

---

# 123. QUALITÉ

Avant de déclarer une fonctionnalité terminée :

- lancer lint ;
- typecheck ;
- tests ;
- build production ;
- vérifier console ;
- tester interaction ;
- tester responsive ;
- vérifier les erreurs réseau.

Aucune erreur console critique.

---

# 124. PHASES D'IMPLÉMENTATION

Travaille dans cet ordre.

## PHASE 0 — Audit

Analyser Claude Design + repository.

Créer un plan d'implémentation.

## PHASE 1 — Architecture

Routing  
state  
design system  
data models  
3D engine.

## PHASE 2 — Terre

Scène Terre réellement interactive.

## PHASE 3 — Système solaire

Planètes + orbites + Horizons.

## PHASE 4 — Travel Engine

Voyages fluides.

## PHASE 5 — Data Platform

Providers + DB + cache + provenance.

## PHASE 6 — Recherche

Catalogue multi-source.

## PHASE 7 — Stars

Catalogue + rendu massif.

## PHASE 8 — Voie lactée

Multi-échelle.

## PHASE 9 — Deep sky

Galaxies + nébuleuses + clusters.

## PHASE 10 — Exoplanètes

NASA Exoplanet Archive.

## PHASE 11 — Extreme objects

Black holes + pulsars.

## PHASE 12 — Education

Info panels + Nova + missions.

## PHASE 13 — Compare

Comparaison d'échelles.

## PHASE 14 — Performance

LOD + quality manager.

## PHASE 15 — QA

Tests + visual regression + responsive.

---

# 125. APRÈS CHAQUE PHASE

Après chaque phase :

- vérifier que l'application compile ;
- ne pas laisser l'application cassée ;
- supprimer le code mort ;
- documenter décisions structurantes ;
- mettre à jour TODO/roadmap.

---

# 126. PREMIÈRE ACTION À EFFECTUER

Commence maintenant par :

1. analyser tous les fichiers produits par Claude Design ;
2. afficher l'arborescence utile du repository ;
3. identifier le framework et les dépendances ;
4. identifier les composants à conserver ;
5. identifier ce qui n'est que simulé ;
6. créer `docs/IMPLEMENTATION_PLAN.md` ;
7. créer `docs/DATA_SOURCES.md` avec les sources astronomiques réelles à vérifier ;
8. proposer l'architecture technique concrète ;
9. commencer immédiatement l'implémentation de la PHASE 1 ;
10. poursuivre ensuite le développement sans t'arrêter au simple plan.

Ne reconstruis pas le design à partir de zéro si le code Claude est exploitable.

**Transforme le prototype Claude Design en véritable COSMOS KIDS.**