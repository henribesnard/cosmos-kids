# Critères d’acceptation V1

| Critère | État | Preuve |
| --- | --- | --- |
| Soleil, Lune et huit planètes disponibles | OK | catalogue de 10 objets + recherche |
| Lune visible dans la vue globale | OK | satellite imbriqué dans l’orbite de la Terre, échelle visuelle simplifiée |
| Sélection sans maillage technique | OK | halo de contour discret, sans wireframe ni axe permanent |
| Textures réalistes locales | OK | 16 fichiers, dimensions et SHA‑256 validés |
| Terre multicouche | OK | jour, normal, spéculaire, nuages et nuit masquée |
| Anneaux de Saturne séparés | OK | géométrie annulaire + texture RGBA radiale |
| Vraie scène React Three Fiber | OK | Canvas, meshes, lumières, orbites et contrôles |
| Routes directes | OK | Terre, Système solaire, détails et crédits |
| Clic simple sur un astre | OK | voyage puis ouverture de sa vue détaillée ; équivalent clavier disponible |
| Mission et comparaison fonctionnelles | OK | état persistant et composants testés |
| Provenance et licence visibles | OK | page crédits, manifestes et attributions générées |
| Données scientifiques sourcées | OK | provenance au niveau de chaque quantité |
| Éphémérides sans API navigateur | OK | snapshot JPL au build et fallback cache |
| Clavier et alternative DOM | OK | recherche `Ctrl/Cmd + K`, boutons et catalogue accessible |
| Mouvement réduit et fallback WebGL | OK | média CSS, état store et Error Boundary |
| Responsive | OK structurel | panneaux transformés en bottom sheets sous 820 px |
| Vérification automatisée | OK | assets, lint, 13 tests, typage et build |

L’inspection visuelle pilotée depuis le navigateur intégré reste à rejouer quand ce navigateur est connecté à la session de développement.
