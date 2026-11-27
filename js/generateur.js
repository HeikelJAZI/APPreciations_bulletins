/* =====================================================================
   GÉNÉRATEUR
   Fonctions pures : elles reçoivent des données et des règles, et
   renvoient du texte. Aucun accès à la page ici.
   ===================================================================== */
(function (global) {
  "use strict";

  /* ---------- Hasard reproductible ----------
     Le même élève avec la même « variante » donne toujours le même texte.
     Le bouton « Autre formulation » incrémente simplement la variante. */
  function hash(texte) {
    let h = 2166136261;
    for (let i = 0; i < texte.length; i++) {
      h ^= texte.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function creerAlea(graine) {
    let s = (graine >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function choisir(liste, alea) {
    if (!Array.isArray(liste) || liste.length === 0) return "";
    return liste[Math.floor(alea() * liste.length)];
  }

  /* ---------- Outils de texte ---------- */
  function remplir(texte, vars) {
    return String(texte || "")
      .replace(/\{(\w+)\}/g, (m, cle) => (vars[cle] != null ? vars[cle] : ""))
      .replace(/\s+\./g, ".")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function minusculeInitiale(t) {
    return t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
  }

  /* ---------- Repérages ---------- */
  function trancheDe(moyenne, tranches) {
    if (typeof moyenne !== "number" || !Array.isArray(tranches)) return null;
    return tranches.find((t) => moyenne >= t.min && moyenne < t.max) || null;
  }

  // "auto" : déduite des deux moyennes ; sinon, choix de l'enseignant
  function evolutionDe(eleve, regles) {
    if (eleve.evolution && eleve.evolution !== "auto") return eleve.evolution;
    if (typeof eleve.moyenne !== "number" || typeof eleve.moyennePrec !== "number") return "";
    const ecart = eleve.moyenne - eleve.moyennePrec;
    const seuils = regles.seuilsEvolution || { progres: 1, baisse: -1 };
    if (ecart >= seuils.progres) return "progres";
    if (ecart <= seuils.baisse) return "baisse";
    return "stable";
  }

  /* ---------- Assemblage ----------
     parties : [{ texte, ton, prio }] dans l'ordre d'affichage.
     Ajoute les connecteurs quand le ton change, puis retire les parties
     les moins prioritaires tant que le texte dépasse longueurMax. */
  function assembler(parties, longueurMax, connecteurs, alea) {
    const liste = parties
      .filter((p) => p.texte)
      .map((p) => Object.assign({}, p, {
        versNeg: choisir(connecteurs.versNegatif, alea),
        versPos: choisir(connecteurs.versPositif, alea)
      }));

    function rendre(ps) {
      let tonPrecedent = 0;
      return ps.map((p) => {
        let t = p.texte;
        if (tonPrecedent > 0 && p.ton < 0 && p.versNeg) t = p.versNeg + minusculeInitiale(t);
        else if (tonPrecedent < 0 && p.ton > 0 && p.versPos) t = p.versPos + minusculeInitiale(t);
        if (p.ton) tonPrecedent = p.ton;
        return t;
      }).join(" ");
    }

    let texte = rendre(liste);
    while (longueurMax && texte.length > longueurMax) {
      let indice = -1, pire = 1;
      liste.forEach((p, i) => { if (p.prio > 1 && p.prio >= pire) { pire = p.prio; indice = i; } });
      if (indice < 0) break;
      liste.splice(indice, 1);
      texte = rendre(liste);
    }
    return texte;
  }

  function variables(regles, reglages) {
    return {
      horizon: (regles.horizons || {})[String(reglages.trimestre)] || "",
      matiere: reglages.matiere || ""
    };
  }

  /* ---------- Appréciation d'un élève ---------- */
  function genererEleve(eleve, regles, reglages, index) {
    const alea = creerAlea(hash(eleve.nom || "") + (eleve.variante || 0) * 7919 + (index || 0) * 104729);
    const vars = variables(regles, reglages);
    const max = Number(reglages.longueurMax) || regles.longueurMax || 0;

    if (typeof eleve.moyenne !== "number") return remplir(choisir(regles.absence, alea), vars);

    const tranche = trancheDe(eleve.moyenne, regles.tranches);
    if (!tranche) return "";

    const parties = [{ texte: choisir(tranche.constats, alea), ton: tranche.ton || 0, prio: 1 }];
    const conseilsCibles = [];

    const evo = evolutionDe(eleve, regles);
    const blocEvo = evo && regles.evolution ? regles.evolution[evo] : null;
    if (blocEvo) {
      parties.push({ texte: choisir(blocEvo.phrases, alea), ton: blocEvo.ton || 0, prio: blocEvo.prio || 2 });
      if (blocEvo.conseils) conseilsCibles.push(...blocEvo.conseils);
    }

    const criteres = regles.criteres || {};
    Object.keys(criteres).forEach((cle) => {
      const choix = (eleve.criteres || {})[cle];
      const option = (criteres[cle].options || {})[choix];
      if (!option) return;
      parties.push({ texte: choisir(option.phrases, alea), ton: option.ton || 0, prio: option.prio || 3 });
      if (option.conseils) conseilsCibles.push(...option.conseils);
    });

    // Un conseil ciblé (travail, attitude, baisse) passe avant le conseil général
    const conseil = choisir(conseilsCibles.length ? conseilsCibles : tranche.conseils, alea);
    parties.push({ texte: conseil, ton: 0, prio: 1 });

    parties.forEach((p) => { p.texte = remplir(p.texte, vars); });
    return assembler(parties, max, regles.connecteurs || {}, alea);
  }

  /* ---------- Statistiques de classe ---------- */
  function statistiques(eleves, tranches) {
    const valeurs = eleves.map((e) => e.moyenne).filter((v) => typeof v === "number").sort((a, b) => a - b);
    const n = valeurs.length;
    const repartition = (tranches || []).map((t) => ({
      tranche: t,
      nombre: valeurs.filter((v) => v >= t.min && v < t.max).length
    }));
    if (!n) return { n: 0, total: eleves.length, repartition, valeurs };
    const moyenne = valeurs.reduce((s, v) => s + v, 0) / n;
    const mediane = n % 2 ? valeurs[(n - 1) / 2] : (valeurs[n / 2 - 1] + valeurs[n / 2]) / 2;
    const ecartType = Math.sqrt(valeurs.reduce((s, v) => s + (v - moyenne) ** 2, 0) / n);
    return { n, total: eleves.length, moyenne, mediane, min: valeurs[0], max: valeurs[n - 1], ecartType, repartition, valeurs };
  }

  /* ---------- Appréciation de la classe ---------- */
  function genererClasse(stats, classe, regles, reglages) {
    const R = regles.classe;
    if (!R || !stats.n) return "";
    const alea = creerAlea(hash("classe") + (classe.variante || 0) * 7919 + 17);
    const vars = variables(regles, reglages);

    const tranche = trancheDe(stats.moyenne, R.tranches);
    if (!tranche) return "";

    const partSous = (seuil) => stats.valeurs.filter((v) => v < seuil).length / stats.n;
    const partDessus = (seuil) => stats.valeurs.filter((v) => v >= seuil).length / stats.n;

    const parties = [{ texte: choisir(tranche.constats, alea), ton: tranche.ton || 0, prio: 1 }];

    if (R.tete && partDessus(R.tete.seuil) >= R.tete.part) {
      parties.push({ texte: choisir(R.tete.phrases, alea), ton: R.tete.ton || 0, prio: 3 });
    }
    if (R.difficulte && partSous(R.difficulte.seuil) >= R.difficulte.part) {
      parties.push({ texte: choisir(R.difficulte.phrases, alea), ton: R.difficulte.ton || 0, prio: 2 });
    }

    const h = R.homogeneite || {};
    if (h.homogene && stats.ecartType <= h.homogene.ecartTypeMax) {
      parties.push({ texte: choisir(h.homogene.phrases, alea), ton: h.homogene.ton || 0, prio: 4 });
    } else if (h.heterogene && stats.ecartType >= h.heterogene.ecartTypeMin) {
      parties.push({ texte: choisir(h.heterogene.phrases, alea), ton: h.heterogene.ton || 0, prio: 3 });
    }

    const conseilsCibles = [];
    const optionClimat = R.climat && R.climat.options ? R.climat.options[classe.climat] : null;
    if (optionClimat) {
      parties.push({ texte: choisir(optionClimat.phrases, alea), ton: optionClimat.ton || 0, prio: 2 });
      if (optionClimat.conseils) conseilsCibles.push(...optionClimat.conseils);
    }

    parties.push({ texte: choisir(conseilsCibles.length ? conseilsCibles : tranche.conseils, alea), ton: 0, prio: 1 });

    parties.forEach((p) => { p.texte = remplir(p.texte, vars); });
    return assembler(parties, R.longueurMax || 0, regles.connecteurs || {}, alea);
  }

  global.Generateur = { trancheDe, evolutionDe, genererEleve, statistiques, genererClasse };
})(window);
