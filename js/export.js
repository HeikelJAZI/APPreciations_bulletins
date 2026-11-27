/* =====================================================================
   EXPORT CSV
   Reconstruit le fichier importé en ajoutant une colonne « Appréciation »
   et une dernière ligne avec l'appréciation générale de la classe.
   Sans fichier d'origine (exemple, notes collées avec des espaces), un
   tableau Nom ; Moyenne ; Moyenne précédente ; Appréciation est produit.
   Sortie : séparateur point-virgule, UTF-8 avec BOM, fins de ligne CRLF
   (ce qu'Excel en français ouvre correctement).
   Fonctions pures : aucun accès à la page.
   ===================================================================== */
(function (global) {
  "use strict";

  const SEP = ";";

  // Met une cellule entre guillemets si elle contient ; " ou un retour à la ligne
  function champ(v) {
    const s = String(v == null ? "" : v);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function sansGuillemets(c) {
    return String(c).replace(/^\s*"(.*)"\s*$/, "$1").replace(/""/g, '"');
  }

  function note(v) {
    return typeof v === "number" ? String(v).replace(".", ",") : "";
  }

  function completer(cellules, n) {
    const c = cellules.slice();
    while (c.length < n) c.push("");
    return c;
  }

  // Le fichier d'origine est-il utilisable pour retrouver chaque élève ?
  function sourceFidele(eleves, source) {
    return !!(source && source.sep && Array.isArray(source.lignes) && eleves.length &&
      eleves.every((e) => typeof e.ligne === "number" && e.ligne < source.lignes.length));
  }

  function versCsv(eleves, classe, reglages, source) {
    const titreClasse = "Appréciation de la classe" + (reglages && reglages.classe ? " " + reglages.classe : "");
    let lignes;   // tableaux de cellules déjà échappées, sans la colonne Appréciation
    let textes;   // texte de la colonne Appréciation, ligne par ligne

    if (sourceFidele(eleves, source)) {
      const parLigne = new Map(eleves.map((e) => [e.ligne, e]));
      lignes = []; textes = [];
      source.lignes.forEach((l, i) => {
        if (!l.trim()) return;
        lignes.push(l.split(source.sep).map((c) => champ(sansGuillemets(c))));
        if (i === source.entete) textes.push("Appréciation");
        else textes.push(parLigne.has(i) ? parLigne.get(i).texte || "" : "");
      });
    } else {
      lignes = [["Nom", "Moyenne", "Moyenne précédente"].map(champ)];
      textes = ["Appréciation"];
      eleves.forEach((e) => {
        lignes.push([champ(e.nom), note(e.moyenne), note(e.moyennePrec)]);
        textes.push(e.texte || "");
      });
    }

    // La colonne Appréciation est placée après la colonne la plus à droite du fichier
    const n = Math.max(1, ...lignes.map((c) => c.length));
    const sortie = lignes.map((c, i) => completer(c, n).concat(champ(textes[i])));
    sortie.push(completer([champ(titreClasse)], n).concat(champ((classe && classe.texte) || "")));
    return "﻿" + sortie.map((c) => c.join(SEP)).join("\r\n") + "\r\n";
  }

  // « notes_4eB.csv » → « notes_4eB_appreciations.csv »
  function nomFichier(source, reglages) {
    if (source && source.fichier) return source.fichier.replace(/\.[^.]*$/, "") + "_appreciations.csv";
    const r = reglages || {};
    const morceaux = ["appreciations", r.classe, r.trimestre ? "T" + r.trimestre : ""]
      .filter(Boolean).join("_");
    return morceaux.replace(/[\\/:*?"<>|\s]+/g, "_") + ".csv";
  }

  global.Export = { versCsv, nomFichier };
})(window);
