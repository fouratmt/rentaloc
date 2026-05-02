# Progression - shell francais

## Objectif

Mettre en place le shell initial en francais du simulateur one-page de projet locatif, en respectant le PRD existant dans `docs/prd.md`.

## Avancement

- [x] Lecture du PRD et identification des sections principales.
- [x] Creation du fichier de suivi dedie dans `docs/`.
- [x] Mise en place d'une structure statique minimale.
- [x] Interface en francais avec zones d'entree, resultats, sensibilite et methodologie.
- [x] Calculs client de base pour alimenter le shell avec des valeurs coherentes.
- [x] Verification syntaxique JavaScript avec `node --check src/app.js`.
- [x] Ajout d'un `justfile` pour les commandes projet courantes.
- [x] Passage de la vacance locative en jours par an dans l'interface.
- [x] Ajout d'infobulles au survol et au focus sur les champs et resultats calcules.
- [x] Mise en avant du loyer d'equilibre permettant un cash-flow apres impot egal a zero.
- [x] Audit des equations et correction du loyer d'equilibre avant impot avec frais variables.
- [x] Affichage des equations et substitutions numeriques dans l'interface.
- [x] Ajout d'un panneau de simulations sauvegardees avec persistance locale.
- [x] Passe UI globale : palette, grille responsive, panneaux, boutons et etats visuels.
- [x] Ajout d'un panneau UI expliquant la decomposition du score financier et du score de risque qualitatif.
- [x] Alignement PRD/app sur les equations de vacance en jours, cash investi plafonne et loyers d'equilibre avec frais variables.

## Fichiers crees

- `index.html` : structure de la page et libelles francais.
- `src/styles.css` : mise en page responsive, etats positifs/negatifs, tableaux et panneaux.
- `src/app.js` : calculs, decomposition du score, validations simples et copie du resume.
- `justfile` : recettes `check`, `serve`, `status` et `clean`.

## Notes de portee

- Le shell fonctionne sans build ni serveur applicatif.
- Les calculs fiscaux restent volontairement simplifies, comme demande dans le PRD.
- Le score final reste sur 100 points : 70 points financiers et 30 points de risque qualitatif.
- Les scenarios de sensibilite utilisent les variantes du PRD : optimiste, base et stress.

## Prochaines etapes proposees

- Ajouter des tests unitaires pour les formules principales si le projet evolue vers une stack JavaScript avec runner.
- Remplacer les controles natifs par des composants de design system si une stack front-end est choisie.
- Affiner les libelles d'aide apres un test utilisateur court.
