# Progression - shell français

## Objectif

Mettre en place RentaLoc, le simulateur one-page de projet locatif en français, en respectant le PRD existant dans `docs/prd.md`.

## Avancement

- [x] Lecture du PRD et identification des sections principales.
- [x] Création du fichier de suivi dédié dans `docs/`.
- [x] Mise en place d'une structure statique minimale.
- [x] Interface en français avec zones d'entrée, résultats, sensibilité et méthodologie.
- [x] Calculs client de base pour alimenter le shell avec des valeurs cohérentes.
- [x] Verification syntaxique JavaScript avec `node --check src/app.js`.
- [x] Ajout d'un `justfile` pour les commandes projet courantes.
- [x] Passage de la vacance locative en jours par an dans l'interface.
- [x] Ajout d'infobulles au survol et au focus sur les champs et résultats calculés.
- [x] Mise en avant du loyer d'équilibre permettant un cash-flow après impôt égal à zéro.
- [x] Audit des équations et correction du loyer d'équilibre avant impôt avec frais variables.
- [x] Affichage des équations et substitutions numériques dans l'interface.
- [x] Ajout d'un panneau de simulations sauvegardées avec persistance locale.
- [x] Passe UI globale : palette, grille responsive, panneaux, boutons et états visuels.
- [x] Ajout d'un panneau UI expliquant la décomposition du score financier et du score de risque qualitatif.
- [x] Alignement PRD/app sur les équations de vacance en jours, cash investi plafonné et loyers d'équilibre avec frais variables.
- [x] Correction fiscale : régimes LMNP réel, micro-BIC, micro-foncier et manuel pris en compte dans les calculs.
- [x] Ajout TEOM récupérable, CFE, relocation/diagnostics et plafonnement de score lié au DPE réglementaire.
- [x] Ajout d'un overlay d'aide détaillé expliquant formules, hypothèses et compromis de calcul.
- [x] Complétion du guide avec les formules du panneau équations et densification de la mise en page pour limiter le scroll vertical.
- [x] Remplacement des scrolls internes par des widgets détaillés ouvrables au clic.
- [x] Adoption du nom RentaLoc dans l'app, le manifest, les icônes et le texte copié.
- [x] Passe de grammaire et d'orthographe française sur les libellés, infobulles, alertes et textes d'aide.
- [x] Clarification des libellés de champs avec fréquence et nature des montants : €/mois, €/an, total initial, estimation ou pourcentage.

## Fichiers créés

- `index.html` : structure de la page et libellés français.
- `src/styles.css` : mise en page responsive, états positifs/négatifs, tableaux et panneaux.
- `src/app.js` : calculs, décomposition du score, validations simples et copie du résumé.
- `justfile` : recettes `check`, `serve`, `status` et `clean`.
- `site.webmanifest` : métadonnées PWA de RentaLoc.
- `sw.js` : cache applicatif hors ligne.
- `assets/icons/` : icônes d'installation.
- `README.md` : documentation projet courte.

## Notes de portée

- Le shell fonctionne sans build ni serveur applicatif.
- Les calculs fiscaux restent volontairement simplifiés, comme demandé dans le PRD, mais le régime sélectionné pilote maintenant la base taxable.
- Le score final reste sur 100 points : 70 points financiers et 30 points de risque qualitatif.
- Les scénarios de sensibilité utilisent les variantes du PRD : optimiste, base et stress.
- Les simulations sont sauvegardées dans `localStorage` sous `rentaloc-projects-v1`.

## Prochaines étapes proposées

- Ajouter des tests unitaires pour les formules principales si le projet évolue vers une stack JavaScript avec runner.
- Remplacer les contrôles natifs par des composants de design system si une stack front-end est choisie.
- Affiner les libellés d'aide après un test utilisateur court.
