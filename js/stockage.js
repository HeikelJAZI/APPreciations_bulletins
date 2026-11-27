/* =====================================================================
   STOCKAGE LOCAL
   Tout reste dans le navigateur (localStorage). Rien n'est envoyé.
   Si le stockage est indisponible, l'application fonctionne quand même,
   mais rien n'est conservé à la fermeture.
   ===================================================================== */
(function (global) {
  "use strict";

  const CLES = {
    regles: "appreciations.regles.v1",
    session: "appreciations.session.v1"
  };

  function lire(cle) {
    try {
      const v = localStorage.getItem(cle);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  }

  function ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (e) {
      return false;
    }
  }

  function supprimer(cle) {
    try { localStorage.removeItem(cle); } catch (e) { /* rien */ }
  }

  global.Stockage = { CLES, lire, ecrire, supprimer };
})(window);
