# Nova — interface (design & intégration)

Code : `src/components/assistant/`, styles : `src/styles/assistant-dock.css` (bundle initial, ~5 Ko) et `src/styles/assistant.css` (chargé avec le panneau). Captures : `docs/nova-screens/`.

## Choix de design

- **Personnage** : sonde ronde originale (coque cyan→violet, visière à œil unique, antenne étoilée, deux panneaux solaires, anneau orbital incliné). 13 humeurs (`NovaAvatar`), chacune avec une pose lisible ; toutes les animations sont coupées sous `prefers-reduced-motion`.
- **Dock** : bouton flottant en bas à droite (`data-scene-obstacle`), raccourci **N** (ignoré pendant la saisie, avec Ctrl/Cmd/Alt, ou si une modale est ouverte ; aucun conflit avec Ctrl/Cmd+K).
- **Coexistence avec l’InfoPanel (≥ 1024 px)** : Nova se range contre le bord droit, près de son bouton ; la fiche objet glisse à sa gauche. Les deux restent lisibles, le panneau est non modal (`role="complementary"`).
- **< 1024 px** : bottom sheet modale (`role="dialog"`, focus piégé, focus rendu au bouton à la fermeture, voile cliquable, Échap).
- **Taille (lot 2)** : bouton « Agrandir » dans l’en-tête, trois états — *compact* (404 px), *large* (≈ 60 % de la fenêtre, 880 px max, la scène 3D reste visible et la fiche objet glisse à gauche), *plein écran* (toute la fenêtre, scène floutée derrière un voile, colonne de lecture centrée de ~70 caractères, corps de texte 20 px). En plein écran : `role="dialog"` + `aria-modal`, focus piégé, Échap revient à l’état précédent (sans fermer) et le focus revient au bouton. `aria-expanded` et libellés FR/EN qui décrivent l’action suivante (« Agrandir Nova », « Passer Nova en plein écran », « Réduire Nova »). Sur tablette et mobile, la bottom sheet monte en pleine hauteur (`100dvh`) avec le même bouton ou la poignée (tap ou glisser vers le haut / le bas). Taille mémorisée pour la session (`sessionStorage`), transitions coupées sous `prefers-reduced-motion`.
- **Lecture depuis la première ligne (lot 2)** : à chaque nouvelle réponse — et quand une réponse « Devine d’abord » est révélée — la liste défile jusqu’au **début** de cette réponse, pas jusqu’en bas. Le dégagement de 144 px sous le conteneur (hérité d’avant le défilement limité à la liste) est remplacé par un dégagement de 24 px dans la liste elle-même : la zone de lecture gagne ~130 px.
- **Conversation conservée** : le panneau est chargé à la demande puis gardé monté (caché) ; rien n’est persisté (seul un drapeau « Nova s’est présentée » est stocké).
- **Sceau de vérité** : couleur + forme + texte — Vérifié (pilule pleine, bouclier ✓, `--success`), Débattu (ticket à double trait, balance, `--warning`), Mystère (bords en pointillés asymétriques, étoile « ? », `--violet`).
- **Attente** : frise en 4 stations (étapes sautées marquées « – », jamais cochées), « Le savais-tu ? » tiré des faits du catalogue, mini-jeu d’étoiles filantes (bouton stable, utilisable au clavier). Message de patience après 10 s : le seuil était calibré sur 30–90 s d’attente ; la latence réelle mesurée est maintenant de 5 à 7 s (p90 ≈ 7 s), le message n’apparaît donc que pour une attente anormale.
- **Sécurité** : pas d’animation ludique ni de suggestions après un message `safety`.
- **Recharge (lot 2)** : le compte à rebours « Nova recharge ses panneaux solaires… encore 12 min 05 s » utilise le délai réel du serveur (`retryAfterSeconds`, en-tête `Retry-After`) au lieu de 60 s fixes ; à la fin, « Panneaux solaires rechargés ». L’interface ne bloque plus l’envoi sur « réserve vide » : c’est le serveur qui décide (429 + délai réel).
- **Hors ligne (lot 2)** : la phase `offline` vient uniquement du hook (navigateur hors ligne ou requête échouée pour cause réseau) ; bannière « Pas de connexion », envoi bloqué, « Réessayer » disponible, sortie automatique au retour du signal.
- **Devine d’abord avec choix (lot 2)** : au niveau *Simple* (7–9 ans), les 2–3 hypothèses du serveur s’affichent en gros boutons (56 px, 19 px gras) avec « Ce sont des idées, pas encore des réponses » ; aux niveaux *Curieux* et *Expert*, le champ libre reste et les idées sont proposées en petits boutons. Aucune hypothèse n’est jamais marquée juste ou fausse : seule la réponse vérifiée révélée ensuite le dit (« Compare avec ce que disent les scientifiques »).
- **Niveau de lecture partagé (lot 2)** : un seul réglage dans le store persistant (v5) ; changer de niveau dans Nova le change dans la fiche objet et inversement, et le choix est conservé entre deux visites.
- **Prénom (lot 2)** : si l’enfant donne seulement son prénom, la réponse est normale avec un bref rappel 🔒 au-dessus (`privacyNote`) ; le prénom est masqué avant l’envoi au fournisseur.
- **Texte brut (lot 2)** : le serveur ne renvoie que du texte brut (aucun astérisque Markdown) ; l’interface n’interprète pas de Markdown.

## Contrat (`src/assistant/types.ts`) — état après le lot 2

Réglés (évolutions rétrocompatibles, voir `docs/NOVA.md`) :

1. ~~`kind: 'rate-limited'` + `retryAfterSeconds`~~ — livré ; l’UI n’infère plus la recharge à partir de `kind: 'error'` (encore accepté pour les anciens messages).
2. ~~Phase `offline` jamais émise~~ — émise par le hook, `useOnline` retiré de l’interface.
3. ~~`guessChoices`~~ — livré (hypothèses, jamais vérifiées).
4. ~~`readingLevel` partagé~~ — dans le store persistant (migration v4 → v5).
5. ~~`useRealAssistant` ne bloque que pendant `checking`~~ — le hook refuse une nouvelle question tant qu’une requête est en cours (verrou interne), quelle que soit la phase.

Reste ouvert :

6. `ASSISTANT_QUESTION_ASKED` est publié par l’UI à chaque envoi (aucun consommateur pour l’instant).

## Captures du lot 2

`docs/nova-screens/lot2/` — mode simulé, page Saturne, `prefers-reduced-motion: reduce`, 1440×900 (`desktop`), 834×1194 (`tablet`), 375×812 (`mobile`), FR et EN :

| Fichier | Point |
|---------|-------|
| `*-01-rate-limited-countdown` | 1 — compte à rebours avec le délai réel (42 s simulées) |
| `*-03a-guess-choices-simple` / `*-03b-guess-revealed` | 3 — gros boutons au niveau Simple, puis réponse révélée |
| `*-03c-guess-expert-free-field` | 3 — niveau Expert : champ libre + idées en petits boutons |
| `*-04a-level-expert-in-nova` / `*-04b-infopanel-expert` | 4 — Expert choisi dans Nova, repris par la fiche |
| `*-04c-simple-kept-after-reload` | 4 — Simple choisi dans la fiche, conservé après rechargement |
| `desktop-*-09a-wide` / `desktop-*-09b-fullscreen` | 9 — large et plein écran |
| `tablet/mobile-*-09a-sheet-full-height` | 9 — feuille en pleine hauteur |
