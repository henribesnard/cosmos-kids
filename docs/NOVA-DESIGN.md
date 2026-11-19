# Nova — interface (design & intégration)

Code : `src/components/assistant/`, styles : `src/styles/assistant-dock.css` (bundle initial, ~5 Ko) et `src/styles/assistant.css` (chargé avec le panneau). Captures : `docs/nova-screens/`.

## Choix de design

- **Personnage** : sonde ronde originale (coque cyan→violet, visière à œil unique, antenne étoilée, deux panneaux solaires, anneau orbital incliné). 13 humeurs (`NovaAvatar`), chacune avec une pose lisible ; toutes les animations sont coupées sous `prefers-reduced-motion`.
- **Dock** : bouton flottant en bas à droite (`data-scene-obstacle`), raccourci **N** (ignoré pendant la saisie, avec Ctrl/Cmd/Alt, ou si une modale est ouverte ; aucun conflit avec Ctrl/Cmd+K).
- **Coexistence avec l’InfoPanel (≥ 1024 px)** : Nova se range contre le bord droit, près de son bouton ; la fiche objet glisse à sa gauche. Les deux restent lisibles, le panneau est non modal (`role="complementary"`).
- **< 1024 px** : bottom sheet modale (`role="dialog"`, focus piégé, focus rendu au bouton à la fermeture, voile cliquable, Échap).
- **Conversation conservée** : le panneau est chargé à la demande puis gardé monté (caché) ; rien n’est persisté (seul un drapeau « Nova s’est présentée » est stocké).
- **Sceau de vérité** : couleur + forme + texte — Vérifié (pilule pleine, bouclier ✓, `--success`), Débattu (ticket à double trait, balance, `--warning`), Mystère (bords en pointillés asymétriques, étoile « ? », `--violet`).
- **Attente** : frise en 4 stations (étapes sautées marquées « – », jamais cochées), « Le savais-tu ? » tiré des faits du catalogue, mini-jeu d’étoiles filantes (bouton stable, utilisable au clavier). Message de patience après 12 s (le vrai serveur peut prendre 30–90 s).
- **Sécurité** : pas d’animation ludique ni de suggestions après un message `safety`.

## Ce qui manque au contrat (`src/assistant/types.ts`) — à arbitrer côté moteur

1. `kind: 'rate-limited'` (et idéalement `retryAfterSeconds`) : aujourd’hui l’UI déduit la recharge de `kind: 'error'` + phase `rate-limited` au moment de l’arrivée, et affiche une recharge de 60 s.
2. Phase `offline` jamais émise : l’UI détecte elle-même `navigator.onLine`.
3. `guessChoices?: string[]` pour proposer 2–3 hypothèses aux plus jeunes (aujourd’hui : champ libre + « Je n’ai pas d’idée »).
4. `readingLevel` partagé : le niveau de Nova et celui de l’InfoPanel sont visuellement identiques mais indépendants ; un niveau dans le store permettrait de les synchroniser.
5. `useRealAssistant` n’empêche une nouvelle question que pendant `checking` ; l’UI bloque l’envoi pendant toutes les phases de recherche.
6. `ASSISTANT_QUESTION_ASKED` est publié par l’UI à chaque envoi (aucun consommateur pour l’instant).
