/* =====================================================================
   IMPORT DES NOTES
   Lit un texte collé (depuis Pronote, un tableur) ou un fichier CSV.
   Format attendu, une ligne par élève :
     Nom [Prénom]   Moyenne   [Moyenne du trimestre précédent]
   Séparateurs acceptés : tabulation, point-virgule, virgule ou espaces.
   Décimales avec virgule ou point. « Abs », « N.Not », « Disp » ou une
   case vide = pas de moyenne.
   ===================================================================== */
(function (global) {
  "use strict";

  const ABSENCE = /^(abs\.?|absent\.?e?|n\.?\s?not\.?|nn|disp\.?|dispens[ée]\.?e?|-|—)$/i;
  const ENTETE = /\b(nom|élève|eleve|moy|moyenne|prénom|prenom)\b/i;
  // Ligne « Appréciation de la classe » ajoutée par l'export CSV : à ne pas lire comme un élève
  const LIGNE_CLASSE = /^"?appréciation (générale )?de la classe/i;

  // Renvoie un nombre entre 0 et 20, ou undefined si ce n'est pas une note
  function lireNote(brut) {
    const s = String(brut).trim().replace(/\s/g, "").replace(",", ".");
    if (!/^\d{1,2}(\.\d+)?$/.test(s)) return undefined;
    const v = parseFloat(s);
    return v >= 0 && v <= 20 ? Math.round(v * 100) / 100 : undefined;
  }

  function nettoyer(c) {
    return String(c).trim().replace(/^"(.*)"$/, "$1").trim();
  }

  function detecterSeparateur(texte) {
    if (texte.includes("\t")) return "\t";
    if (texte.includes(";")) return ";";
    if (/,[^\d\s]/.test(texte)) return ",";   // « Dupont,Marie,12.5 » ; sinon la virgule est décimale
    return null;                              // espaces
  }

  function decouper(ligne, sep) {
    const noms = [], notes = [];
    if (sep) {
      ligne.split(sep).map(nettoyer).forEach((c) => {
        const v = lireNote(c);
        if (v !== undefined) notes.push(v);
        else if (noms.length && (c === "" || ABSENCE.test(c))) notes.push(null);
        else if (!notes.length && c !== "") noms.push(c);
      });
    } else {
      const jetons = ligne.trim().split(/\s+/);
      while (jetons.length > 1) {
        const dernier = jetons[jetons.length - 1];
        const v = lireNote(dernier);
        if (v !== undefined) notes.unshift(v);
        else if (ABSENCE.test(dernier)) notes.unshift(null);
        else break;
        jetons.pop();
      }
      noms.push(...jetons);
    }
    return { nom: noms.join(" ").replace(/\s+/g, " ").trim(), notes };
  }

  // Renvoie aussi les lignes brutes, le séparateur et la ligne d'en-tête,
  // pour pouvoir réécrire le fichier d'origine à l'export (voir export.js).
  function analyser(texte) {
    const lignes = String(texte).replace(/^\uFEFF/, "").split(/\r?\n/);
    const sep = detecterSeparateur(lignes.join("\n"));
    const eleves = [], ignorees = [];
    let entete = -1;
    lignes.forEach((ligne, i) => {
      if (!ligne.trim()) return;
      if (LIGNE_CLASSE.test(ligne.trim())) { lignes[i] = ""; return; }   // vient d'un export précédent
      const { nom, notes } = decouper(ligne, sep);
      if (!notes.length && ENTETE.test(ligne)) {                // ligne d'en-tête
        if (entete < 0) entete = i;
        return;
      }
      if (!nom) { ignorees.push(i + 1); return; }
      eleves.push({
        nom,
        moyenne: notes.length ? notes[0] : null,
        moyennePrec: notes.length > 1 ? notes[1] : null,
        ligne: i
      });
    });
    return { eleves, ignorees, sep, lignes, entete };
  }

  // Lit un fichier ; réessaie en Windows-1252 si l'UTF-8 donne des caractères illisibles
  function lireFichier(fichier) {
    const lire = (encodage) => new Promise((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = () => ko(r.error);
      r.readAsText(fichier, encodage);
    });
    return lire("utf-8").then((t) => (t.includes("�") ? lire("windows-1252") : t));
  }

  global.Import = { analyser, lireFichier, lireNote };
})(window);
