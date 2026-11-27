# CLAUDE.md — Application « Appréciations de fin de trimestre »

## Objectif du projet

Outil destiné à un professeur de collège pour **générer automatiquement les appréciations de bulletin** :

1. **Une appréciation par élève**, calculée à partir de sa moyenne du trimestre, de son évolution par rapport au trimestre précédent et de quelques critères qualitatifs choisis par l'enseignant (travail, attitude, participation).
2. **Une appréciation générale de la classe**, calculée à partir de la moyenne de la classe et de statistiques (dispersion, part d'élèves en difficulté, tête de classe), complétée par un « climat de classe » choisi par l'enseignant.

Le professeur colle ses notes (depuis Pronote ou un tableur), relit et ajuste les textes, puis les copie dans son logiciel de vie scolaire.

**Langue** : toute l'interface, les textes générés, les identifiants de code (variables, fonctions, clés) et les commentaires sont **en français**. Conserver cette convention.

## Origine

Le code provient de l'artifact claude.ai « Appréciations de fin de trimestre » (https://claude.ai/artifact/CSdo2r7FeuBKHcpMLeG8z8, version `1794930937-29c8`), récupéré le 27/11/2026. Les fichiers de ce dossier sont désormais la source de référence.

## Stack technique

- **HTML + CSS + JavaScript « vanilla »**, sans framework, sans bundler, sans dépendance npm, sans étape de build.
- Scripts classiques (pas de modules ES) : chaque fichier est une IIFE qui expose un objet global sur `window`.
- Seule ressource externe : les polices Google Fonts (*Atkinson Hyperlegible* pour le texte, *Bricolage Grotesque* pour les titres), avec repli sur les polices système.
- **100 % côté client** : aucune donnée n'est envoyée sur internet ; la persistance se fait dans `localStorage`.
- Le fichier `app_appreciation.Rproj` (et `.Rproj.user/`, `.Rhistory`) n'est qu'un projet RStudio servant de conteneur ; **il n'y a aucun code R** pour l'instant.
- Le dossier n'est pas (encore) un dépôt git.

## Lancer l'application

Ouvrir simplement `index.html` dans un navigateur (le protocole `file://` fonctionne, car il n'y a pas de modules ES). Optionnellement, servir le dossier :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

Il n'y a ni tests automatisés, ni linter, ni build.

## Arborescence

```
app_appreciation/
├── index.html          # Structure de la page : en-tête/réglages, 3 onglets, ordre de chargement des scripts
├── css/style.css       # Thème « cahier de notes » (clair/sombre), mise en page responsive
├── js/regles.js        # REGLES_PAR_DEFAUT : toutes les phrases-types, tranches et seuils (données pures)
├── js/exemple.js       # EXEMPLE_ELEVES : 14 élèves fictifs affichés à la première ouverture
├── js/stockage.js      # Stockage : lecture/écriture JSON dans localStorage (tolérant aux erreurs)
├── js/import.js        # Import : analyse du texte collé / fichier CSV → liste d'élèves
├── js/generateur.js    # Generateur : fonctions pures qui produisent les textes et les statistiques
├── js/export.js        # Export : fichier CSV d'origine + colonne « Appréciation » + ligne de la classe
├── js/app.js           # Interface : état, rendu HTML, gestion des événements
├── app_appreciation.Rproj
└── CLAUDE.md
```

**Ordre de chargement** (dans `index.html`, à respecter) : `regles.js` → `exemple.js` → `stockage.js` → `import.js` → `generateur.js` → `export.js` → `app.js`.

## Architecture et responsabilités

| Global `window.*`     | Fichier          | Rôle | Accès au DOM |
|-----------------------|------------------|------|--------------|
| `REGLES_PAR_DEFAUT`   | `regles.js`      | Configuration : phrases, tranches, seuils | Non |
| `EXEMPLE_ELEVES`      | `exemple.js`     | Données de démonstration | Non |
| `Stockage`            | `stockage.js`    | `CLES`, `lire`, `ecrire`, `supprimer` | Non |
| `Import`              | `import.js`      | `analyser`, `lireFichier`, `lireNote` | Non (FileReader seulement) |
| `Generateur`          | `generateur.js`  | `trancheDe`, `evolutionDe`, `genererEleve`, `statistiques`, `genererClasse` | **Non — fonctions pures** |
| `Export`              | `export.js`      | `versCsv`, `nomFichier` | **Non — fonctions pures** |
| *(aucun export)*      | `app.js`         | État de l'application, rendu, événements | Oui |

Principe : **séparer données (règles), logique (générateur, import) et interface (app.js)**. Le générateur ne touche jamais à la page ; il reçoit des objets et renvoie du texte.

## Modèle de données

### État de session (`etat`, dans `app.js`, persisté sous `appreciations.session.v1`)

```js
{
  reglages: { classe: "4e B", matiere: "", trimestre: "1"|"2"|"3", longueurMax: 300 },
  eleves: [{
    id: "e<horodatage base36>_<index>",
    nom: "Dupont Marie",
    moyenne: 12.5 | null,          // null = pas de moyenne (absent, non noté…)
    moyennePrec: 11 | null,        // moyenne du trimestre précédent
    criteres: { travail: "serieux", attitude: "bavarde", participation: "active" }, // clés de regles.criteres
    evolution: "auto" | "progres" | "stable" | "baisse" | "aucune",
    variante: 0,                   // incrémentée par « Autre formulation »
    texte: "…",                    // appréciation affichée
    modifie: false,                // true si le professeur a édité le texte à la main
    ligne: 3 | null                // index de la ligne dans source.lignes
  }],
  classe: { climat: "" | "agreable" | "bavarde" | "difficile", variante: 0, texte: "", modifie: false },
  source: null | { fichier, sep, lignes[], entete },  // fichier importé, pour l'export CSV
  exemple: true | false            // true tant que ce sont les données fictives
}
```

### Règles (`regles`, persistées sous `appreciations.regles.v1` si modifiées dans l'onglet dédié)

Structure de `REGLES_PAR_DEFAUT` (voir `js/regles.js`, entièrement commenté) :

- `longueurMax` (300) : longueur max. par défaut d'une appréciation élève, en caractères.
- `seuilsEvolution` : `{ progres: 1, baisse: -1 }` — écart en points entre les deux trimestres.
- `horizons` : texte substitué à `{horizon}` selon le trimestre (`"1"` → « au deuxième trimestre », `"2"` → « au troisième trimestre », `"3"` → « l'an prochain »).
- `connecteurs` : `versNegatif` (« Cependant, », « Toutefois, », « En revanche, ») et `versPositif` (« Néanmoins, », « Toutefois, »).
- `tranches` (élèves) : 7 tranches `{ id, libelle, min, max, niveau, ton, constats[], conseils[] }` :

  | Tranche | Intervalle | `niveau` (couleur) | `ton` |
  |---|---|---|---|
  | Très insuffisant | [0 ; 7[ | critique | -1 |
  | Insuffisant | [7 ; 10[ | alerte | -1 |
  | Fragile | [10 ; 12[ | moyen | 0 |
  | Assez bien | [12 ; 14[ | bon | 1 |
  | Bien | [14 ; 16[ | bon | 1 |
  | Très bien | [16 ; 18[ | excellent | 1 |
  | Excellent | [18 ; 21[ | excellent | 1 |

  `min` inclus, `max` exclu (d'où `max: 21` pour inclure 20).
- `evolution` : `progres` (ton 1, prio 2), `stable` (ton 0, prio 5, **phrases vides par défaut**), `baisse` (ton -1, prio 2, avec `conseils` ciblés).
- `criteres` : dictionnaire extensible. Chaque critère = `{ libelle, options: { cle: { libelle, ton, prio, phrases[], conseils[]? } } }`. Par défaut :
  - `travail` : serieux / irregulier / insuffisant
  - `attitude` : exemplaire / correcte / bavarde / perturbatrice
  - `participation` : active / discrete / passive
  
  **Ajouter un critère dans `regles.criteres` suffit** : un menu déroulant apparaît automatiquement dans chaque fiche élève.
- `absence` : phrases pour un élève sans moyenne.
- `classe` : règles de l'appréciation générale :
  - `longueurMax` (450)
  - `tranches` sur la moyenne de classe : Très faible [0;9[, Fragile [9;11[, Correct [11;13[, Bon [13;15[, Très bon [15;21[
  - `homogeneite` : `homogene` si écart-type ≤ 2,5 ; `heterogene` si écart-type ≥ 4
  - `difficulte` : déclenchée si ≥ 25 % des élèves ont une moyenne < 10
  - `tete` : déclenchée si ≥ 20 % des élèves ont une moyenne ≥ 16
  - `climat` : options agreable / bavarde / difficile (avec conseils ciblés pour les deux dernières)

Conventions dans les règles :
- **`ton`** : 1 = positif, 0 = neutre, -1 = négatif.
- **`prio`** : 1 = toujours conservée ; plus le nombre est grand, plus la phrase est supprimée tôt si le texte dépasse la longueur max.
- **`{horizon}`** et **`{matiere}`** sont des variables substituées dans toutes les phrases.

## Algorithme de génération (`js/generateur.js`)

### Hasard reproductible
- Graine = `hash FNV-1a(nom) + variante × 7919 + index × 104729`, puis générateur **xorshift32**.
- Conséquence : **même élève + même variante ⇒ même texte**. « Autre formulation » / « Régénérer » incrémentent simplement `variante`.
- Pour la classe, la graine est `hash("classe") + variante × 7919 + 17`.

### Appréciation d'un élève (`genererEleve`)
1. Pas de moyenne numérique → une phrase de `absence`.
2. Sinon, détermination de la tranche (`trancheDe`), puis construction d'une liste ordonnée de « parties » `{ texte, ton, prio }` :
   1. un **constat** de la tranche (prio 1) ;
   2. une phrase d'**évolution** si applicable (`evolutionDe` : choix manuel de l'enseignant, sinon déduite de l'écart `moyenne - moyennePrec` comparé à `seuilsEvolution`) ;
   3. une phrase par **critère renseigné**, dans l'ordre des clés de `regles.criteres` ;
   4. un **conseil** final (prio 1) : un conseil **ciblé** (issu de l'évolution ou d'un critère ayant des `conseils`) est prioritaire sur le conseil générique de la tranche.
3. Substitution des variables (`remplir`), nettoyage des espaces.
4. **Assemblage** (`assembler`) : quand le ton passe de positif à négatif (ou l'inverse), un connecteur est préfixé et l'initiale de la phrase passe en minuscule. Ensuite, tant que le texte dépasse `longueurMax`, la partie de plus grande `prio` (> 1) est retirée (la dernière en cas d'égalité).

### Statistiques de classe (`statistiques`)
Sur les seules moyennes numériques : effectif noté `n`, `total`, moyenne, médiane, min, max, **écart-type (population)**, et répartition par **tranches élèves**.

### Appréciation de la classe (`genererClasse`)
Constat selon `classe.tranches` (moyenne de classe) → phrase « tête de classe » éventuelle (prio 3) → phrase « difficulté » éventuelle (prio 2) → homogène (prio 4) **ou** hétérogène (prio 3) → phrase de climat (prio 2) → conseil (ciblé par le climat sinon générique de la tranche, prio 1). Même assemblage avec `classe.longueurMax`.

## Import des notes (`js/import.js`)

- Une ligne par élève : `Nom [Prénom]  Moyenne  [Moyenne précédente]`.
- Séparateur détecté automatiquement, par ordre : tabulation → point-virgule → virgule (seulement si suivie d'un caractère non numérique, sinon c'est une décimale) → espaces.
- Décimales avec virgule ou point ; une note valide est un nombre entre 0 et 20 (arrondi au centième).
- Valeurs d'absence reconnues : `Abs`, `Absent(e)`, `N.Not`, `NN`, `Disp`, `Dispensé(e)`, `-`, `—`, ou case vide → `null`.
- Les lignes d'en-tête (contenant « nom », « élève », « moyenne », « prénom »… et aucune note) sont ignorées ; les lignes sans nom sont signalées comme ignorées.
- Fichiers : lecture en UTF-8, puis nouvel essai en **Windows-1252** si des caractères `�` apparaissent (exports Excel/Pronote).
- `analyser` renvoie aussi `sep`, `lignes` (lignes brutes), `entete` (index de la ligne d'en-tête ou -1) et, pour chaque élève, `ligne`. Les lignes « Appréciation de la classe… » (issues d'un export) sont ignorées.
- **Un import remplace entièrement la session** (élèves, textes, climat). Les réglages sont conservés, sauf le nom de classe s'il venait de l'exemple.

## Interface (`index.html` + `js/app.js`)

**En-tête – réglages** : Classe, Matière, Trimestre (1/2/3, modifie `{horizon}` et régénère), Caractères max. (≥ 80, sinon valeur par défaut).

**Onglet « Élèves »** :
- Bandeau « Données d'exemple » tant que `etat.exemple` est vrai.
- Bloc repliable « Importer les notes » : zone de collage, choix de fichier CSV, « Recharger l'exemple ».
- Barre d'outils : compteur (élèves, modifiées à la main, trop longues), **Régénérer** (nouvelle variante pour les textes non modifiés à la main), **Copier toutes les appréciations** (une par ligne), **Copier avec les noms** (nom ⇥ texte, pour un tableur), **Télécharger le CSV** (voir ci-dessous), **Effacer les élèves** (confirmation par un second clic dans les 4 s).
- Une **fiche par élève** : nom, moyenne colorée selon le `niveau` de la tranche, tranche et moyenne précédente avec flèche ↗ → ↘, menus des critères + menu « Évolution » (Automatique / En progrès / Stable / En baisse / Ne pas en parler), zone de texte éditable, compteur de caractères (rouge si dépassement), badge « Modifiée à la main », boutons « Autre formulation » et « Copier ».

**Onglet « Appréciation de la classe »** : tuiles (moyenne, médiane, min–max, écart-type, élèves notés), histogramme de répartition par tranche, menu « Climat de classe », texte éditable, « Autre formulation », « Copier ».

**Onglet « Phrases et règles »** : éditeur JSON de l'ensemble des règles ; « Appliquer » (validation : JSON correct, `tranches` non vide, `criteres` objet), « Copier les règles », « Revenir aux règles d'origine ».

**Comportements clés** :
- Un texte **modifié à la main est protégé** : changer un critère ou cliquer sur « Régénérer » ne l'écrase pas (un toast le signale). Seul « Autre formulation » sur la fiche le régénère.
- Sauvegarde automatique dans `localStorage` avec un délai (debounce) de 250 ms.
- Copie via `navigator.clipboard`, avec repli `document.execCommand("copy")`.
- Rendu par chaînes HTML ; **toute donnée utilisateur passe par `esc()`** (échappement HTML). Délégation d'événements sur `#liste-eleves` ; `rendreCarte(i)` re-rend une seule fiche et restaure le focus.
- Formatage des nombres à la française (`fmt` : virgule décimale, zéros inutiles retirés, « — » si absent).

## Export CSV (`js/export.js`)

- Si la session vient d'un import (fichier ou collage avec séparateur), le fichier d'origine est réécrit ligne par ligne : mêmes cellules, puis une colonne **« Appréciation »** placée après la colonne la plus à droite (en-tête « Appréciation » sur la ligne d'en-tête).
- Sinon (exemple, collage séparé par des espaces) : tableau `Nom;Moyenne;Moyenne précédente;Appréciation`.
- Dernière ligne : `Appréciation de la classe <classe>` puis le texte de la classe dans la colonne Appréciation.
- Sortie : séparateur `;`, cellules entre guillemets si besoin, UTF-8 avec BOM, CRLF. Nom : `<fichier>_appreciations.csv` ou `appreciations_<classe>_T<trimestre>.csv`.
- Téléchargement local via `Blob` + lien `download` (aucun envoi réseau).

## Style (`css/style.css`)

- Direction artistique « cahier de notes » : papier gris-bleu, encre bleue, rouge réservé aux alertes.
- Variables CSS dans `:root` ; thème sombre automatique (`prefers-color-scheme`) ou forcé via `data-theme="dark|light"` sur `<html>`.
- Couleurs de niveau : `--n-critique`, `--n-alerte`, `--n-moyen`, `--n-bon`, `--n-excellent`, appliquées par les classes `.niveau-*`.
- Responsive : fiches sur une colonne sous 820 px ; critères sur une colonne sous 420 px. Respect de `prefers-reduced-motion`.
- Accessibilité : onglets ARIA (`role="tab"`, `aria-selected`), libellés `sr-only`, zones `role="status"` / `aria-live`.

## Points d'attention pour le développement

- **Les règles enregistrées dans le navigateur masquent `regles.js`** : si l'enseignant a cliqué sur « Appliquer » une fois, `appreciations.regles.v1` est utilisé à la place de `REGLES_PAR_DEFAUT`. Après avoir modifié `js/regles.js`, cliquer sur « Revenir aux règles d'origine » (ou vider le `localStorage`) pour voir les changements. Le champ `version: 1` existe mais **aucune migration** n'est implémentée.
- De même, la session enregistrée (`appreciations.session.v1`) est rechargée au démarrage ; l'exemple n'apparaît que si aucune session n'existe.
- La répartition de l'onglet classe utilise les **tranches élèves**, alors que le texte de classe utilise **`classe.tranches`** (seuils différents).
- Les tranches doivent couvrir [0 ; 20] sans trou : une moyenne hors tranche donne un texte vide.
- La troncature ne retire jamais les parties `prio: 1` : un texte peut donc rester plus long que la limite (le compteur passe alors en rouge).
- Garder `generateur.js` et `import.js` **sans accès au DOM** (fonctions pures, testables isolément).
- Modifier le contenu des textes = modifier `js/regles.js` (données), pas le générateur.
- Les données des élèves sont personnelles : ne jamais ajouter d'envoi réseau ou d'analytics ; l'application doit rester locale.

## Pistes d'évolution possibles

- Tests unitaires de `Generateur` et `Import` (ex. Node + jsdom ou simple page de tests).
- Impression des appréciations.
- Gestion de plusieurs classes et matières (une session par classe).
- Migration versionnée des règles stockées (`version`).
- Prise en compte de compétences du socle ou d'appréciations par compétence.
