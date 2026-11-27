/* =====================================================================
   INTERFACE
   Relie la page aux modules : Import (lecture des notes), Generateur
   (textes), Stockage (sauvegarde locale) et REGLES_PAR_DEFAUT (phrases).
   ===================================================================== */
(function () {
  "use strict";

  const G = window.Generateur;
  const I = window.Import;
  const S = window.Stockage;
  const X = window.Export;

  const $ = (sel) => document.querySelector(sel);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const fmt = (v) => (typeof v !== "number" ? "—" : v.toFixed(2).replace(/\.?0+$/, "").replace(".", ","));

  /* ---------- État ---------- */
  let regles = S.lire(S.CLES.regles) || clone(window.REGLES_PAR_DEFAUT);
  let etat = S.lire(S.CLES.session);
  if (!etat || !Array.isArray(etat.eleves)) etat = sessionExemple();

  function nouvelEleve(d, i) {
    return {
      id: "e" + Date.now().toString(36) + "_" + i,
      nom: d.nom,
      moyenne: typeof d.moyenne === "number" ? d.moyenne : null,
      moyennePrec: typeof d.moyennePrec === "number" ? d.moyennePrec : null,
      criteres: Object.assign({}, d.criteres || {}),
      evolution: "auto",
      variante: 0,
      texte: "",
      modifie: false,
      ligne: typeof d.ligne === "number" ? d.ligne : null   // ligne dans le fichier importé (export CSV)
    };
  }

  function sessionVide(reglages) {
    return {
      reglages: reglages || { classe: "", matiere: "", trimestre: "1", longueurMax: regles.longueurMax || 300 },
      eleves: [],
      classe: { climat: "", variante: 0, texte: "", modifie: false },
      source: null,        // fichier importé : { fichier, sep, lignes, entete }, pour l'export CSV
      exemple: false
    };
  }

  function sessionExemple() {
    const s = sessionVide({ classe: "4e B", matiere: "", trimestre: "2", longueurMax: regles.longueurMax || 300 });
    s.eleves = (window.EXEMPLE_ELEVES || []).map(nouvelEleve);
    s.classe.climat = "bavarde";
    s.exemple = true;
    return s;
  }

  let minuterie = null;
  function sauver() {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => S.ecrire(S.CLES.session, etat), 250);
  }

  /* ---------- Génération ---------- */
  function genererEleve(i) {
    const e = etat.eleves[i];
    e.texte = G.genererEleve(e, regles, etat.reglages, i);
    e.modifie = false;
  }

  function genererTous(forcer) {
    etat.eleves.forEach((e, i) => { if (forcer || !e.modifie) genererEleve(i); });
    if (forcer || !etat.classe.modifie) genererClasse();
  }

  function genererClasse() {
    const stats = G.statistiques(etat.eleves, regles.tranches);
    etat.classe.texte = G.genererClasse(stats, etat.classe, regles, etat.reglages);
    etat.classe.modifie = false;
  }

  /* ---------- Copie ---------- */
  function toast(message) {
    const t = $("#toast");
    t.textContent = message;
    t.classList.add("visible");
    clearTimeout(toast.minuterie);
    toast.minuterie = setTimeout(() => t.classList.remove("visible"), 1800);
  }

  function copier(texte, message) {
    const secours = () => {
      const zone = document.createElement("textarea");
      zone.value = texte;
      zone.setAttribute("readonly", "");
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      zone.remove();
      toast(ok ? message : "Copie impossible : sélectionnez le texte et faites Ctrl+C");
    };
    try {
      navigator.clipboard.writeText(texte).then(() => toast(message), secours);
    } catch (e) {
      secours();
    }
  }

  /* ---------- Téléchargement ---------- */
  function telecharger(contenu, nom) {
    const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- Rendu : réglages ---------- */
  function rendreReglages() {
    $("#reg-classe").value = etat.reglages.classe || "";
    $("#reg-matiere").value = etat.reglages.matiere || "";
    $("#reg-trimestre").value = String(etat.reglages.trimestre || "1");
    $("#reg-longueur").value = etat.reglages.longueurMax || regles.longueurMax || 300;
  }

  /* ---------- Rendu : élèves ---------- */
  function optionsSelect(options, valeur, libelleVide) {
    let html = `<option value="">${esc(libelleVide)}</option>`;
    Object.keys(options || {}).forEach((cle) => {
      const o = options[cle];
      html += `<option value="${esc(cle)}"${cle === valeur ? " selected" : ""}>${esc(o.libelle || cle)}</option>`;
    });
    return html;
  }

  function compteurHtml(texte, max) {
    const n = (texte || "").length;
    return `<span class="compteur${max && n > max ? " trop" : ""}">${n} / ${max} car.</span>`;
  }

  function carteEleve(e, i) {
    const tranche = G.trancheDe(e.moyenne, regles.tranches);
    const niveau = tranche ? tranche.niveau : "aucun";
    const evo = G.evolutionDe(e, regles);
    const fleches = { progres: "↗", baisse: "↘", stable: "→" };
    const max = Number(etat.reglages.longueurMax) || regles.longueurMax;

    let meta = tranche ? esc(tranche.libelle) : "Sans moyenne";
    if (typeof e.moyennePrec === "number") {
      meta += ` · trimestre précédent ${fmt(e.moyennePrec)}`;
      if (evo && typeof e.moyenne === "number") meta += ` <span class="evo evo-${evo}" aria-label="${esc((regles.evolution[evo] || {}).libelle || evo)}">${fleches[evo] || ""}</span>`;
    }

    let criteres = "";
    Object.keys(regles.criteres || {}).forEach((cle) => {
      const c = regles.criteres[cle];
      const valeur = (e.criteres || {})[cle] || "";
      const id = `${cle}-${e.id}`;
      criteres += `<div class="champ"><label for="${id}">${esc(c.libelle || cle)}</label>
        <select id="${id}" data-critere="${esc(cle)}" class="${valeur ? "renseigne" : ""}">${optionsSelect(c.options, valeur, "Non précisé")}</select></div>`;
    });
    const idEvo = `evolution-${e.id}`;
    const optEvo = { auto: { libelle: "Automatique" } };
    Object.keys(regles.evolution || {}).forEach((k) => { optEvo[k] = { libelle: regles.evolution[k].libelle || k }; });
    let selectEvo = "";
    Object.keys(optEvo).forEach((k) => {
      selectEvo += `<option value="${esc(k)}"${k === (e.evolution || "auto") ? " selected" : ""}>${esc(optEvo[k].libelle)}</option>`;
    });
    selectEvo += `<option value="aucune"${e.evolution === "aucune" ? " selected" : ""}>Ne pas en parler</option>`;
    criteres += `<div class="champ"><label for="${idEvo}">Évolution</label>
      <select id="${idEvo}" data-evolution="1" class="${e.evolution && e.evolution !== "auto" ? "renseigne" : ""}">${selectEvo}</select></div>`;

    return `<article class="carte carte-eleve niveau-${niveau}" data-i="${i}">
      <div class="carte-info">
        <div class="carte-tete">
          <h3>${esc(e.nom)}</h3>
          <span class="note niveau-${niveau}">${fmt(e.moyenne)}</span>
        </div>
        <p class="carte-meta">${meta}</p>
        <div class="criteres">${criteres}</div>
      </div>
      <div class="carte-texte">
        <label for="txt-${e.id}" class="sr-only">Appréciation de ${esc(e.nom)}</label>
        <textarea id="txt-${e.id}" data-texte="1" rows="4">${esc(e.texte)}</textarea>
        <div class="carte-pied">
          ${compteurHtml(e.texte, max)}
          <span class="pill-modif"${e.modifie ? "" : " hidden"}>Modifiée à la main</span>
          <span class="espace"></span>
          <button type="button" class="btn btn-secondaire btn-petit" data-action="autre">Autre formulation</button>
          <button type="button" class="btn btn-principal btn-petit" data-action="copier">Copier</button>
        </div>
      </div>
    </article>`;
  }

  function rendreEleves() {
    const liste = $("#liste-eleves");
    if (!etat.eleves.length) {
      liste.innerHTML = `<p class="vide">Aucun élève pour l'instant. Collez vos notes dans « Importer les notes » pour commencer.</p>`;
    } else {
      liste.innerHTML = etat.eleves.map(carteEleve).join("");
    }
    rendreCompteur();
    $("#bandeau-exemple").hidden = !etat.exemple;
    $("#badge-eleves").textContent = etat.eleves.length;
  }

  function rendreCarte(i) {
    const ancienne = document.querySelector(`.carte-eleve[data-i="${i}"]`);
    if (!ancienne) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = carteEleve(etat.eleves[i], i);
    ancienne.replaceWith(tmp.firstElementChild);
  }

  function rendreCompteur() {
    const max = Number(etat.reglages.longueurMax) || regles.longueurMax;
    const n = etat.eleves.length;
    const modifiees = etat.eleves.filter((e) => e.modifie).length;
    const tropLongues = etat.eleves.filter((e) => (e.texte || "").length > max).length;
    let t = `${n} élève${n > 1 ? "s" : ""}`;
    if (modifiees) t += ` · ${modifiees} modifiée${modifiees > 1 ? "s" : ""} à la main`;
    if (tropLongues) t += ` · ${tropLongues} trop longue${tropLongues > 1 ? "s" : ""}`;
    $("#compteur").textContent = n ? t : "";
  }

  /* ---------- Rendu : classe ---------- */
  function rendreClasse() {
    const stats = G.statistiques(etat.eleves, regles.tranches);
    const tuiles = [
      ["Moyenne de la classe", stats.n ? fmt(stats.moyenne) : "—"],
      ["Médiane", stats.n ? fmt(stats.mediane) : "—"],
      ["Plus basse – plus haute", stats.n ? `${fmt(stats.min)} – ${fmt(stats.max)}` : "—"],
      ["Écart-type", stats.n ? fmt(stats.ecartType) : "—"],
      ["Élèves notés", `${stats.n} / ${stats.total}`]
    ];
    $("#stats").innerHTML = tuiles.map(([l, v]) =>
      `<div class="tuile"><span class="tuile-valeur">${v}</span><span class="tuile-libelle">${esc(l)}</span></div>`
    ).join("");

    const plusGrand = Math.max(1, ...stats.repartition.map((r) => r.nombre));
    $("#repartition").innerHTML = stats.repartition.slice().reverse().map((r) => {
      const t = r.tranche;
      const bornes = `${fmt(t.min)} à ${fmt(Math.min(t.max, 20))}`;
      return `<div class="barre-ligne niveau-${esc(t.niveau)}">
        <span title="${bornes}">${esc(t.libelle)}</span>
        <div class="barre-fond"><div class="barre-remplie" style="width:${(r.nombre / plusGrand) * 100}%"></div></div>
        <span class="barre-nombre">${r.nombre}</span>
      </div>`;
    }).join("");

    const climat = (regles.classe && regles.classe.climat) || { options: {} };
    $("#classe-climat").innerHTML = optionsSelect(climat.options, etat.classe.climat || "", "Non précisé");
    $("#classe-texte").value = etat.classe.texte || "";
    rendreCompteurClasse();
  }

  function rendreCompteurClasse() {
    const max = (regles.classe && regles.classe.longueurMax) || 0;
    const n = (etat.classe.texte || "").length;
    const c = $("#classe-compteur");
    c.textContent = `${n} / ${max} car.`;
    c.classList.toggle("trop", !!max && n > max);
    $("#classe-modif").hidden = !etat.classe.modifie;
  }

  /* ---------- Rendu : règles ---------- */
  function rendreRegles() {
    $("#regles-json").value = JSON.stringify(regles, null, 2);
    $("#regles-message").textContent = "";
    $("#regles-message").classList.remove("erreur");
  }

  function toutRendre() {
    rendreReglages();
    rendreEleves();
    rendreClasse();
    rendreRegles();
  }

  /* ---------- Événements : onglets ---------- */
  document.querySelectorAll("[data-onglet]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const cible = bouton.dataset.onglet;
      document.querySelectorAll("[data-onglet]").forEach((b) => b.setAttribute("aria-selected", String(b === bouton)));
      document.querySelectorAll(".panneau").forEach((p) => { p.hidden = p.id !== "onglet-" + cible; });
      if (cible === "classe") rendreClasse();
    });
  });

  /* ---------- Événements : réglages ---------- */
  $("#reg-classe").addEventListener("input", (ev) => { etat.reglages.classe = ev.target.value; sauver(); });
  $("#reg-matiere").addEventListener("input", (ev) => { etat.reglages.matiere = ev.target.value; sauver(); });
  $("#reg-trimestre").addEventListener("change", (ev) => {
    etat.reglages.trimestre = ev.target.value;
    genererTous(false); rendreEleves(); rendreClasse(); sauver();
  });
  $("#reg-longueur").addEventListener("change", (ev) => {
    const v = parseInt(ev.target.value, 10);
    etat.reglages.longueurMax = v >= 80 ? v : (regles.longueurMax || 300);
    ev.target.value = etat.reglages.longueurMax;
    genererTous(false); rendreEleves(); sauver();
  });

  /* ---------- Événements : import ---------- */
  function importer(texte, fichier) {
    const msg = $("#import-message");
    const res = I.analyser(texte);
    msg.classList.remove("erreur");
    if (!res.eleves.length) {
      msg.textContent = "Aucun élève reconnu. Vérifiez qu'il y a une ligne par élève avec le nom puis la moyenne.";
      msg.classList.add("erreur");
      return;
    }
    const reglages = etat.exemple ? Object.assign({}, etat.reglages, { classe: "" }) : etat.reglages;
    etat = sessionVide(reglages);
    etat.eleves = res.eleves.map(nouvelEleve);
    etat.source = { fichier: fichier || null, sep: res.sep, lignes: res.lignes, entete: res.entete };
    genererTous(true);
    toutRendre();
    sauver();
    let t = `${res.eleves.length} élève${res.eleves.length > 1 ? "s" : ""} importé${res.eleves.length > 1 ? "s" : ""}.`;
    const sansMoyenne = res.eleves.filter((e) => e.moyenne == null).length;
    if (sansMoyenne) t += ` ${sansMoyenne} sans moyenne.`;
    if (res.ignorees.length) t += ` Lignes ignorées : ${res.ignorees.join(", ")}.`;
    msg.textContent = t;
    $("#import-texte").value = "";
    $("#bloc-import").open = false;
    toast(t);
  }

  $("#btn-importer").addEventListener("click", () => importer($("#import-texte").value));
  $("#import-fichier").addEventListener("change", (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    I.lireFichier(f).then((texte) => importer(texte, f.name)).catch(() => {
      $("#import-message").textContent = "Lecture du fichier impossible. Essayez de copier-coller son contenu.";
      $("#import-message").classList.add("erreur");
    });
    ev.target.value = "";
  });
  $("#btn-exemple").addEventListener("click", () => {
    etat = sessionExemple();
    genererTous(true); toutRendre(); sauver();
    toast("Exemple rechargé");
  });

  /* ---------- Événements : barre d'outils ---------- */
  $("#btn-regenerer").addEventListener("click", () => {
    etat.eleves.forEach((e) => { if (!e.modifie) e.variante = (e.variante || 0) + 1; });
    genererTous(false); rendreEleves(); sauver();
    toast("Nouvelles formulations générées");
  });
  $("#btn-copier-tout").addEventListener("click", () => {
    copier(etat.eleves.map((e) => e.texte).join("\n"), "Appréciations copiées, une par ligne");
  });
  $("#btn-copier-noms").addEventListener("click", () => {
    copier(etat.eleves.map((e) => `${e.nom}\t${e.texte}`).join("\n"), "Noms et appréciations copiés");
  });

  $("#btn-telecharger").addEventListener("click", () => {
    if (!etat.eleves.length) { toast("Aucun élève à exporter"); return; }
    if (!etat.classe.texte) genererClasse();
    const nom = X.nomFichier(etat.source, etat.reglages);
    telecharger(X.versCsv(etat.eleves, etat.classe, etat.reglages, etat.source), nom);
    toast(`Fichier « ${nom} » téléchargé`);
  });

  // Effacement en deux clics, pour éviter les accidents
  const btnEffacer = $("#btn-effacer");
  btnEffacer.addEventListener("click", () => {
    if (!btnEffacer.classList.contains("confirmer")) {
      btnEffacer.classList.add("confirmer");
      btnEffacer.textContent = "Cliquer pour confirmer";
      setTimeout(() => { btnEffacer.classList.remove("confirmer"); btnEffacer.textContent = "Effacer les élèves"; }, 4000);
      return;
    }
    btnEffacer.classList.remove("confirmer");
    btnEffacer.textContent = "Effacer les élèves";
    etat = sessionVide(etat.reglages);
    toutRendre(); sauver();
    $("#bloc-import").open = true;
    toast("Élèves effacés");
  });

  /* ---------- Événements : fiches élèves (délégation) ---------- */
  const liste = $("#liste-eleves");

  liste.addEventListener("change", (ev) => {
    const carte = ev.target.closest(".carte-eleve");
    if (!carte || ev.target.tagName !== "SELECT") return;
    const i = Number(carte.dataset.i);
    const e = etat.eleves[i];
    if (ev.target.dataset.critere) e.criteres[ev.target.dataset.critere] = ev.target.value;
    if (ev.target.dataset.evolution) e.evolution = ev.target.value;
    if (!e.modifie) genererEleve(i);
    const idFocus = ev.target.id;
    rendreCarte(i);
    const el = document.getElementById(idFocus);
    if (el) el.focus();
    rendreCompteur(); sauver();
    if (e.modifie) toast("Texte modifié à la main conservé : cliquez sur « Autre formulation » pour le régénérer");
  });

  liste.addEventListener("input", (ev) => {
    if (!ev.target.dataset.texte) return;
    const carte = ev.target.closest(".carte-eleve");
    const e = etat.eleves[Number(carte.dataset.i)];
    e.texte = ev.target.value;
    e.modifie = true;
    const max = Number(etat.reglages.longueurMax) || regles.longueurMax;
    const c = carte.querySelector(".compteur");
    c.textContent = `${e.texte.length} / ${max} car.`;
    c.classList.toggle("trop", e.texte.length > max);
    carte.querySelector(".pill-modif").hidden = false;
    rendreCompteur(); sauver();
  });

  liste.addEventListener("click", (ev) => {
    const bouton = ev.target.closest("[data-action]");
    if (!bouton) return;
    const i = Number(bouton.closest(".carte-eleve").dataset.i);
    const e = etat.eleves[i];
    if (bouton.dataset.action === "autre") {
      e.variante = (e.variante || 0) + 1;
      genererEleve(i);
      rendreCarte(i); rendreCompteur(); sauver();
    } else if (bouton.dataset.action === "copier") {
      copier(e.texte, `Appréciation de ${e.nom} copiée`);
    }
  });

  /* ---------- Événements : classe ---------- */
  $("#classe-climat").addEventListener("change", (ev) => {
    etat.classe.climat = ev.target.value;
    if (!etat.classe.modifie) genererClasse();
    rendreClasse(); sauver();
  });
  $("#classe-texte").addEventListener("input", (ev) => {
    etat.classe.texte = ev.target.value;
    etat.classe.modifie = true;
    rendreCompteurClasse(); sauver();
  });
  $("#btn-classe-autre").addEventListener("click", () => {
    etat.classe.variante = (etat.classe.variante || 0) + 1;
    genererClasse(); rendreClasse(); sauver();
  });
  $("#btn-classe-copier").addEventListener("click", () => copier(etat.classe.texte || "", "Appréciation de la classe copiée"));

  /* ---------- Événements : règles ---------- */
  function messageRegles(texte, erreur) {
    const m = $("#regles-message");
    m.textContent = texte;
    m.classList.toggle("erreur", !!erreur);
  }

  $("#btn-regles-appliquer").addEventListener("click", () => {
    let nouvelles;
    try {
      nouvelles = JSON.parse($("#regles-json").value);
    } catch (err) {
      messageRegles("Le texte contient une erreur de syntaxe (virgule ou guillemet manquant ?) : " + err.message, true);
      return;
    }
    if (!Array.isArray(nouvelles.tranches) || !nouvelles.tranches.length || typeof nouvelles.criteres !== "object") {
      messageRegles("Les règles doivent contenir au moins « tranches » (une liste) et « criteres ».", true);
      return;
    }
    regles = nouvelles;
    S.ecrire(S.CLES.regles, regles);
    genererTous(false);
    rendreEleves(); rendreClasse(); sauver();
    messageRegles("Règles appliquées et enregistrées dans ce navigateur. Les textes modifiés à la main n'ont pas changé.");
  });
  $("#btn-regles-copier").addEventListener("click", () => copier($("#regles-json").value, "Règles copiées"));
  $("#btn-regles-reinit").addEventListener("click", () => {
    regles = clone(window.REGLES_PAR_DEFAUT);
    S.supprimer(S.CLES.regles);
    genererTous(false);
    toutRendre(); sauver();
    messageRegles("Règles d'origine rétablies.");
  });

  /* ---------- Démarrage ---------- */
  genererTous(false);
  toutRendre();
  $("#bloc-import").open = !etat.eleves.length || etat.exemple;
})();
