/* =====================================================================
   RÈGLES ET PHRASES-TYPES
   ---------------------------------------------------------------------
   C'est le seul fichier à modifier pour adapter les textes produits.
   Vous pouvez aussi modifier ces règles depuis l'onglet « Phrases et
   règles » de l'application : elles sont alors enregistrées dans le
   navigateur, sans toucher à ce fichier.

   Repères :
   - {horizon} est remplacé selon le trimestre (voir « horizons »).
   - ton : 1 = positif, 0 = neutre, -1 = négatif. Quand le ton change
     d'une phrase à l'autre, un connecteur (« Cependant, »...) est ajouté.
   - prio : 1 = toujours gardée ; plus le nombre est grand, plus la
     phrase est retirée tôt si le texte dépasse la longueur maximale.
   - Les tranches vont de min (inclus) à max (exclu).
   - niveau : couleur affichée (critique, alerte, moyen, bon, excellent).
   ===================================================================== */

window.REGLES_PAR_DEFAUT = {
  version: 1,

  // Longueur maximale proposée par défaut (en caractères)
  longueurMax: 300,

  // Écart (en points) entre deux trimestres pour parler de progrès ou de baisse
  seuilsEvolution: { progres: 1, baisse: -1 },

  horizons: {
    "1": "au deuxième trimestre",
    "2": "au troisième trimestre",
    "3": "l'an prochain"
  },

  connecteurs: {
    versNegatif: ["Cependant, ", "Toutefois, ", "En revanche, "],
    versPositif: ["Néanmoins, ", "Toutefois, "]
  },

  /* ---------- Tranches de moyenne (élèves) ---------- */
  tranches: [
    {
      id: "tres_insuffisant", libelle: "Très insuffisant", min: 0, max: 7, niveau: "critique", ton: -1,
      constats: [
        "Les résultats sont très insuffisants et traduisent de grandes difficultés.",
        "Le trimestre est très préoccupant : les bases ne sont pas acquises.",
        "Les résultats sont alarmants ; les notions essentielles ne sont pas maîtrisées."
      ],
      conseils: [
        "Un travail régulier et une aide ciblée sont indispensables {horizon}.",
        "Il faut reprendre les bases avec méthode et ne pas hésiter à solliciter de l'aide.",
        "Un sursaut est nécessaire {horizon} : les leçons doivent être revues chaque jour."
      ]
    },
    {
      id: "insuffisant", libelle: "Insuffisant", min: 7, max: 10, niveau: "alerte", ton: -1,
      constats: [
        "Les résultats sont insuffisants.",
        "Le trimestre est fragile : plusieurs notions restent mal maîtrisées.",
        "Les résultats restent en deçà des attentes."
      ],
      conseils: [
        "Un apprentissage plus approfondi des leçons doit permettre de progresser {horizon}.",
        "Il faut s'investir davantage pour consolider les acquis.",
        "Des efforts réguliers sont nécessaires pour atteindre la moyenne {horizon}."
      ]
    },
    {
      id: "fragile", libelle: "Fragile", min: 10, max: 12, niveau: "moyen", ton: 0,
      constats: [
        "Les résultats sont justes et les acquis encore fragiles.",
        "Le trimestre est passable ; l'ensemble manque encore de solidité.",
        "Les résultats sont corrects sans plus ; des progrès sont possibles."
      ],
      conseils: [
        "Un travail plus régulier permettra de consolider les connaissances {horizon}.",
        "Il faut gagner en rigueur pour progresser.",
        "Avec davantage d'approfondissement, les résultats peuvent s'améliorer {horizon}."
      ]
    },
    {
      id: "assez_bien", libelle: "Assez bien", min: 12, max: 14, niveau: "bon", ton: 1,
      constats: [
        "Les résultats sont satisfaisants.",
        "Le trimestre est encourageant : les notions sont globalement maîtrisées.",
        "C'est un trimestre correct, avec des acquis solides."
      ],
      conseils: [
        "Il faut poursuivre ainsi en visant davantage de précision.",
        "En approfondissant le travail, les résultats peuvent encore progresser {horizon}.",
        "Il faut persévérer dans cette voie {horizon}."
      ]
    },
    {
      id: "bien", libelle: "Bien", min: 14, max: 16, niveau: "bon", ton: 1,
      constats: [
        "C'est un bon trimestre.",
        "Les résultats sont bons et témoignent d'un travail efficace.",
        "Les connaissances sont bien maîtrisées."
      ],
      conseils: [
        "Il faut continuer sur cette lancée {horizon}.",
        "Ces bons résultats sont à confirmer {horizon}.",
        "Il faut garder ce niveau d'exigence."
      ]
    },
    {
      id: "tres_bien", libelle: "Très bien", min: 16, max: 18, niveau: "excellent", ton: 1,
      constats: [
        "C'est un très bon trimestre.",
        "Les résultats sont très satisfaisants.",
        "Le travail est de grande qualité."
      ],
      conseils: [
        "Il faut poursuivre avec la même rigueur {horizon}.",
        "Bravo, il faut continuer ainsi.",
        "Ces très bons résultats sont à maintenir {horizon}."
      ]
    },
    {
      id: "excellent", libelle: "Excellent", min: 18, max: 21, niveau: "excellent", ton: 1,
      constats: [
        "C'est un excellent trimestre.",
        "Les résultats sont remarquables.",
        "Le travail fourni est excellent et les notions parfaitement maîtrisées."
      ],
      conseils: [
        "Félicitations, il faut continuer ainsi.",
        "Bravo pour ce parcours remarquable.",
        "Il faut garder cette belle dynamique {horizon}."
      ]
    }
  ],

  /* ---------- Évolution par rapport au trimestre précédent ---------- */
  evolution: {
    progres: {
      libelle: "En progrès", ton: 1, prio: 2,
      phrases: [
        "Les progrès sont nets par rapport au trimestre précédent.",
        "La progression depuis le trimestre dernier est encourageante.",
        "Les résultats sont en hausse, ce qui est encourageant."
      ]
    },
    stable: {
      libelle: "Stable", ton: 0, prio: 5,
      // Vide par défaut pour ne pas alourdir les textes ; ajoutez une phrase si vous le souhaitez
      phrases: []
    },
    baisse: {
      libelle: "En baisse", ton: -1, prio: 2,
      phrases: [
        "Les résultats sont en baisse par rapport au trimestre précédent.",
        "Un fléchissement est à noter depuis le trimestre dernier.",
        "Le niveau a baissé depuis le trimestre précédent."
      ],
      conseils: [
        "Il faut retrouver le niveau du trimestre précédent {horizon}.",
        "Un effort est attendu pour inverser cette tendance {horizon}."
      ]
    }
  },

  /* ---------- Critères choisis par l'enseignant pour chaque élève ----------
     Vous pouvez ajouter un critère (ex. « autonomie ») sur le même modèle :
     il apparaîtra automatiquement comme un menu dans chaque fiche élève. */
  criteres: {
    travail: {
      libelle: "Travail",
      options: {
        serieux: {
          libelle: "Sérieux", ton: 1, prio: 3,
          phrases: [
            "Le travail est sérieux et régulier.",
            "Le travail fourni est sérieux.",
            "L'investissement dans le travail est constant."
          ]
        },
        irregulier: {
          libelle: "Irrégulier", ton: -1, prio: 2,
          phrases: [
            "Le travail est irrégulier.",
            "L'investissement manque de régularité.",
            "Le travail personnel reste trop irrégulier."
          ],
          conseils: [
            "Un travail plus régulier est attendu {horizon}.",
            "Il faut travailler de façon plus constante {horizon}."
          ]
        },
        insuffisant: {
          libelle: "Insuffisant", ton: -1, prio: 2,
          phrases: [
            "Le travail fourni est insuffisant.",
            "Le travail personnel est nettement insuffisant.",
            "Le manque de travail pénalise les résultats."
          ],
          conseils: [
            "Un vrai travail personnel est indispensable {horizon}.",
            "Il faut se mettre au travail sans attendre."
          ]
        }
      }
    },
    attitude: {
      libelle: "Attitude",
      options: {
        exemplaire: {
          libelle: "Exemplaire", ton: 1, prio: 3,
          phrases: [
            "L'attitude en classe est exemplaire.",
            "Le comportement est irréprochable.",
            "L'attitude en classe est très positive."
          ]
        },
        correcte: {
          libelle: "Correcte", ton: 0, prio: 5,
          phrases: ["L'attitude en classe est correcte."]
        },
        bavarde: {
          libelle: "Bavardages", ton: -1, prio: 2,
          phrases: [
            "Les bavardages nuisent à la concentration.",
            "Les bavardages sont trop fréquents.",
            "Le manque de concentration pénalise le travail en classe."
          ],
          conseils: ["Il faut gagner en concentration en classe {horizon}."]
        },
        perturbatrice: {
          libelle: "Perturbatrice", ton: -1, prio: 2,
          phrases: [
            "Le comportement en classe n'est pas acceptable.",
            "L'attitude perturbe le déroulement des cours.",
            "Le comportement doit impérativement changer."
          ],
          conseils: ["Un changement d'attitude est impératif {horizon}."]
        }
      }
    },
    participation: {
      libelle: "Participation",
      options: {
        active: {
          libelle: "Active", ton: 1, prio: 4,
          phrases: [
            "La participation orale est active et pertinente.",
            "La participation en classe est très appréciée.",
            "L'implication à l'oral est remarquable."
          ]
        },
        discrete: {
          libelle: "Discrète", ton: -1, prio: 4,
          phrases: [
            "La participation orale reste discrète.",
            "La prise de parole en classe reste rare."
          ]
        },
        passive: {
          libelle: "Passive", ton: -1, prio: 3,
          phrases: [
            "La participation est trop rare.",
            "Une plus grande implication à l'oral est attendue."
          ]
        }
      }
    }
  },

  /* ---------- Élève sans moyenne ---------- */
  absence: [
    "Les évaluations sont insuffisantes pour établir une moyenne ce trimestre.",
    "Pas de moyenne ce trimestre, faute d'un nombre suffisant d'évaluations."
  ],

  /* ---------- Appréciation générale de la classe ---------- */
  classe: {
    longueurMax: 450,

    tranches: [
      {
        id: "tres_faible", libelle: "Très faible", min: 0, max: 9, ton: -1,
        constats: [
          "Le niveau général de la classe est très préoccupant.",
          "Les résultats de la classe sont faibles ce trimestre."
        ],
        conseils: [
          "Un investissement collectif beaucoup plus important est indispensable {horizon}.",
          "La classe doit se mobiliser pour reprendre les bases."
        ]
      },
      {
        id: "fragile", libelle: "Fragile", min: 9, max: 11, ton: -1,
        constats: [
          "Les résultats d'ensemble sont fragiles.",
          "Le bilan de la classe est mitigé."
        ],
        conseils: [
          "Chacun doit s'investir davantage dans le travail personnel {horizon}.",
          "Un travail plus régulier permettra à la classe de progresser."
        ]
      },
      {
        id: "correct", libelle: "Correct", min: 11, max: 13, ton: 0,
        constats: [
          "Le bilan de la classe est correct.",
          "La classe obtient des résultats satisfaisants dans l'ensemble."
        ],
        conseils: [
          "La classe peut progresser en approfondissant le travail personnel {horizon}.",
          "Il faut poursuivre les efforts pour consolider ces résultats."
        ]
      },
      {
        id: "bon", libelle: "Bon", min: 13, max: 15, ton: 1,
        constats: [
          "C'est un bon trimestre pour la classe.",
          "Les résultats de la classe sont bons."
        ],
        conseils: [
          "Il faut maintenir cette dynamique {horizon}.",
          "La classe doit poursuivre dans cette voie."
        ]
      },
      {
        id: "tres_bon", libelle: "Très bon", min: 15, max: 21, ton: 1,
        constats: [
          "C'est un très bon trimestre pour la classe.",
          "Les résultats d'ensemble sont très satisfaisants."
        ],
        conseils: [
          "Bravo à la classe, il faut continuer ainsi {horizon}.",
          "Félicitations à la classe pour ce travail."
        ]
      }
    ],

    // Écart-type des moyennes (en points)
    homogeneite: {
      homogene: { ecartTypeMax: 2.5, ton: 1, phrases: ["Le niveau est assez homogène."] },
      heterogene: {
        ecartTypeMin: 4, ton: -1,
        phrases: [
          "Les écarts de niveau restent importants entre les élèves.",
          "La classe est hétérogène, avec des niveaux très contrastés."
        ]
      }
    },

    // Part d'élèves sous le seuil (0,25 = 25 %)
    difficulte: {
      seuil: 10, part: 0.25, ton: -1,
      phrases: [
        "Plusieurs élèves sont en difficulté et doivent fournir davantage d'efforts.",
        "Un groupe d'élèves rencontre des difficultés importantes."
      ]
    },

    // Part d'élèves au-dessus du seuil
    tete: {
      seuil: 16, part: 0.2, ton: 1,
      phrases: [
        "Plusieurs élèves obtiennent d'excellents résultats.",
        "Une tête de classe solide se dégage."
      ]
    },

    climat: {
      libelle: "Climat de classe",
      options: {
        agreable: {
          libelle: "Agréable", ton: 1,
          phrases: [
            "L'ambiance de travail est agréable.",
            "La classe est agréable et participe volontiers."
          ]
        },
        bavarde: {
          libelle: "Bavarde", ton: -1,
          phrases: [
            "Les bavardages freinent trop souvent le travail.",
            "Le climat de classe est trop dissipé."
          ],
          conseils: ["La classe doit gagner en concentration {horizon}."]
        },
        difficile: {
          libelle: "Difficile", ton: -1,
          phrases: [
            "Le comportement d'une partie de la classe nuit au travail de tous.",
            "L'attitude en classe n'est pas satisfaisante."
          ],
          conseils: ["Une attitude plus respectueuse du travail de chacun est indispensable {horizon}."]
        }
      }
    }
  }
};
