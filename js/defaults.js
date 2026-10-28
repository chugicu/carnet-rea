// FICHIER GÉNÉRÉ par tools/build-defaults.js — ne pas modifier à la main.
export const DEFAULTS = {
  "app": {
    "nom": "Carnet Réa",
    "service": "Réanimation Guadeloupe",
    "logo": ""
  },
  "modules": {
    "gestes": true,
    "objectifs": true,
    "radar": true,
    "meteo": true,
    "flash": true,
    "retours": true,
    "badges": true,
    "defis": true,
    "silhouette": true
  },
  "semestres": [
    {
      "id": "2026-11",
      "nom": "Nov. 2026 – Avr. 2027",
      "debut": "2026-11-02",
      "fin": "2027-04-30"
    }
  ],
  "semestreCourant": "2026-11",
  "specialites": [
    "Anesthésie-Réanimation",
    "Médecine intensive-réanimation",
    "Médecine d'urgence",
    "Cardiologie",
    "Pneumologie",
    "Néphrologie",
    "Neurologie",
    "Médecine interne",
    "Médecine générale",
    "Chirurgie",
    "Autre"
  ],
  "gestes": [
    {
      "id": "ktc",
      "nom": "KTC",
      "nomLong": "Cathéter veineux central",
      "couleur": "#FFD84D",
      "actif": true,
      "sites": [
        "Jugulaire",
        "Fémoral",
        "Sous-clavier"
      ],
      "modalites": [
        "Supervisé",
        "À 4 mains",
        "Autonome"
      ],
      "autonomie": {
        "seuil": 5,
        "compte": [
          "Supervisé",
          "À 4 mains"
        ],
        "bloque": "Autonome"
      }
    },
    {
      "id": "kta",
      "nom": "KTA",
      "nomLong": "Cathéter artériel",
      "couleur": "#FFC15C",
      "actif": true,
      "sites": [
        "Radial",
        "Fémoral"
      ],
      "modalites": [
        "Supervisé",
        "À 4 mains",
        "Autonome"
      ],
      "autonomie": {
        "seuil": 5,
        "compte": [
          "Supervisé",
          "À 4 mains"
        ],
        "bloque": "Autonome"
      }
    },
    {
      "id": "iot",
      "nom": "IOT",
      "nomLong": "Intubation orotrachéale",
      "couleur": "#FFA96B",
      "actif": true,
      "resultats": [
        "Réussie",
        "Échec"
      ]
    },
    {
      "id": "drain",
      "nom": "Drain",
      "nomLong": "Drain thoracique",
      "couleur": "#FF8A7A",
      "actif": true
    },
    {
      "id": "fibro",
      "nom": "Fibro",
      "nomLong": "Fibroscopie bronchique",
      "couleur": "#FF6F91",
      "actif": true
    },
    {
      "id": "pl",
      "nom": "PL",
      "nomLong": "Ponction lombaire",
      "couleur": "#F2559A",
      "actif": true
    },
    {
      "id": "trachee",
      "nom": "Trachéo",
      "nomLong": "Trachéotomie",
      "couleur": "#D25FB4",
      "actif": true
    },
    {
      "id": "echo",
      "nom": "Écho",
      "nomLong": "Échographie (EchoLearn)",
      "couleur": "#6EC6E0",
      "actif": true,
      "sites": [
        "Cardiaque",
        "Pleuro-pulmonaire",
        "Abdominale",
        "Echo-Doppler vasculaire",
        "Doppler transcrânien"
      ]
    },
    {
      "id": "autre",
      "nom": "Autre",
      "nomLong": "Autre geste (à préciser)",
      "couleur": "#A86BDB",
      "actif": true,
      "libre": true
    }
  ],
  "radar": {
    "axes": [
      {
        "id": "tech",
        "nom": "Compétences techniques",
        "court": "Technique"
      },
      {
        "id": "theo",
        "nom": "Connaissances théoriques",
        "court": "Théorie"
      },
      {
        "id": "oral",
        "nom": "Présentations orales",
        "court": "Oral"
      },
      {
        "id": "equipe",
        "nom": "Implication et intégration dans l'équipe",
        "court": "Équipe"
      },
      {
        "id": "pec",
        "nom": "Prises en charge",
        "court": "Prises en charge"
      }
    ],
    "echelle": [
      {
        "l": "A",
        "label": "Excellent"
      },
      {
        "l": "B",
        "label": "Très bien"
      },
      {
        "l": "C",
        "label": "Satisfaisant"
      },
      {
        "l": "D",
        "label": "À améliorer"
      },
      {
        "l": "E",
        "label": "Insuffisant"
      }
    ]
  },
  "meteo": {
    "niveaux": [
      {
        "id": "soleil",
        "nom": "Grand soleil",
        "icone": "sun",
        "couleur": "#FFD84D"
      },
      {
        "id": "nuages",
        "nom": "Nuageux",
        "icone": "cloud",
        "couleur": "#9AA4B8"
      },
      {
        "id": "pluie",
        "nom": "Pluie",
        "icone": "rain",
        "couleur": "#7DD3FC"
      },
      {
        "id": "orage",
        "nom": "Orage",
        "icone": "storm",
        "couleur": "#F2559A",
        "alerte": true
      }
    ],
    "mention": "Ta météo peut être vue par l'équipe pédagogique et ton tuteur."
  },
  "badges": [
    {
      "id": "premier-ktc",
      "nom": "Premier KTC",
      "desc": "Ton premier cathéter veineux central.",
      "icone": "drop",
      "couleur": "#FFD84D",
      "actif": true,
      "regle": {
        "type": "count",
        "geste": "ktc",
        "min": 1
      }
    },
    {
      "id": "triple-couronne",
      "nom": "Triple couronne",
      "desc": "Un KTC posé sur chacun des 3 sites.",
      "icone": "crown",
      "couleur": "#FFC15C",
      "actif": true,
      "regle": {
        "type": "sites",
        "geste": "ktc",
        "min": 3
      }
    },
    {
      "id": "intubator",
      "nom": "Intubator",
      "desc": "5 intubations réussies.",
      "icone": "bolt",
      "couleur": "#FFA96B",
      "actif": true,
      "regle": {
        "type": "count",
        "geste": "iot",
        "resultat": "Réussie",
        "min": 5
      }
    },
    {
      "id": "regularite",
      "nom": "Régularité",
      "desc": "Connecté 5 jours ouvrés d'affilée.",
      "icone": "calendar",
      "couleur": "#FF8A7A",
      "actif": true,
      "regle": {
        "type": "login_streak",
        "min": 5
      }
    },
    {
      "id": "envol",
      "nom": "Envol",
      "desc": "5 KTC supervisés : le mode autonome se débloque.",
      "icone": "feather",
      "couleur": "#FF6F91",
      "actif": true,
      "regle": {
        "type": "count",
        "geste": "ktc",
        "modalites": [
          "Supervisé",
          "À 4 mains"
        ],
        "min": 5
      }
    },
    {
      "id": "arteriel",
      "nom": "Artériel",
      "desc": "Un KTA radial et un KTA fémoral.",
      "icone": "activity",
      "couleur": "#F2559A",
      "actif": true,
      "regle": {
        "type": "sites_all",
        "geste": "kta",
        "sites": [
          "Radial",
          "Fémoral"
        ]
      }
    },
    {
      "id": "premier-drain",
      "nom": "Premier drain",
      "desc": "Ton premier drain thoracique.",
      "icone": "star",
      "couleur": "#D25FB4",
      "actif": true,
      "regle": {
        "type": "count",
        "geste": "drain",
        "min": 1
      }
    },
    {
      "id": "premier-fibro",
      "nom": "Premier fibro",
      "desc": "Ta première fibroscopie bronchique.",
      "icone": "star",
      "couleur": "#A86BDB",
      "actif": true,
      "regle": {
        "type": "count",
        "geste": "fibro",
        "min": 1
      }
    },
    {
      "id": "premiere-pl",
      "nom": "Première PL",
      "desc": "Ta première ponction lombaire.",
      "icone": "star",
      "couleur": "#FFD84D",
      "actif": true,
      "regle": {
        "type": "count",
        "geste": "pl",
        "min": 1
      }
    },
    {
      "id": "premiere-trachee",
      "nom": "Première trachéo",
      "desc": "Ta première trachéotomie.",
      "icone": "star",
      "couleur": "#FFA96B",
      "actif": true,
      "regle": {
        "type": "count",
        "geste": "trachee",
        "min": 1
      }
    },
    {
      "id": "couteau-suisse",
      "nom": "Couteau suisse",
      "desc": "Au moins un geste de chaque catégorie.",
      "icone": "grid",
      "couleur": "#FF6F91",
      "actif": true,
      "regle": {
        "type": "types",
        "exclure": [
          "autre"
        ]
      }
    },
    {
      "id": "soufriere",
      "nom": "Soufrière",
      "desc": "50 gestes sur le semestre.",
      "icone": "mountain",
      "couleur": "#F2559A",
      "actif": true,
      "regle": {
        "type": "total",
        "min": 50
      }
    },
    {
      "id": "miroir",
      "nom": "Miroir",
      "desc": "Une auto-évaluation complète (radar).",
      "icone": "eye",
      "couleur": "#D25FB4",
      "actif": true,
      "regle": {
        "type": "autoeval"
      }
    },
    {
      "id": "meteorologue",
      "nom": "Météorologue",
      "desc": "Météo remplie 4 semaines d'affilée.",
      "icone": "cloud",
      "couleur": "#7DD3FC",
      "actif": true,
      "regle": {
        "type": "meteo_streak",
        "min": 4
      }
    },
    {
      "id": "mi-chemin",
      "nom": "Mi-chemin",
      "desc": "Entretien de mi-stage réalisé.",
      "icone": "flag",
      "couleur": "#A86BDB",
      "actif": true,
      "regle": {
        "type": "entretien",
        "entretien": "mi"
      }
    },
    {
      "id": "papillon",
      "nom": "Papillon",
      "desc": "Tous tes objectifs sont acquis.",
      "icone": "butterfly",
      "couleur": "#FFD84D",
      "actif": true,
      "regle": {
        "type": "objectifs_acquis"
      }
    }
  ],
  "defis": [
    {
      "id": "ktc",
      "nom": "Cent KTC",
      "desc": "La promo pose 100 KTC.",
      "type": "geste_count",
      "geste": "ktc",
      "cible": 100,
      "actif": true
    },
    {
      "id": "meteo",
      "nom": "Grand beau temps",
      "desc": "Toutes les météos de la promo remplies la même semaine.",
      "type": "meteo_semaine",
      "actif": true
    },
    {
      "id": "flash",
      "nom": "Retours pour tous",
      "desc": "Chaque interne reçoit au moins un feedback flash dans le mois.",
      "type": "flash_mois",
      "actif": true
    },
    {
      "id": "iot",
      "nom": "Cinquante intubations",
      "desc": "La promo réussit 50 intubations.",
      "type": "geste_count",
      "geste": "iot",
      "resultat": "Réussie",
      "cible": 50,
      "actif": true
    }
  ],
  "textes": {
    "accueil": "",
    "gestes": "Ne saisis jamais de donnée patient (nom, IPP, date de naissance), même dans les commentaires.",
    "rgpd": "Carnet Réa est un outil interne au service de réanimation. Il enregistre ton identité, ta spécialité, tes gestes, tes objectifs, tes évaluations d'entretien, ta météo hebdomadaire et les retours laissés par les seniors. Tes gestes, objectifs, évaluations et météo sont visibles par toi, ton tuteur et l'équipe pédagogique. Les seniors voient uniquement ton nombre de gestes. Tes badges restent privés. Les retours confidentiels des seniors ne sont visibles que de l'équipe pédagogique et de ton tuteur, jamais de toi. Aucune donnée patient n'est enregistrée. Les données sont archivées 5 ans puis effacées. Tu peux corriger tes données ou supprimer ton compte à tout moment : tes données personnelles sont alors effacées et tes gestes sont conservés de façon anonyme pour les statistiques du service."
  },
  "securite": {
    "sessionJours": 14,
    "mdpMin": 8,
    "inscriptionOuverte": true
  },
  "feries": [],
  "echo": {
    "actif": true,
    "url": "",
    "etabService": false,
    "etabs": [
      "CHU de la Guadeloupe",
      "CHU de la Martinique",
      "CHU de la Guyane",
      "CHBT"
    ],
    "services": [
      "Réanimation",
      "Urgences",
      "Cardiologie",
      "Médecine interne",
      "Anesthésie"
    ]
  },
  "echoCatalogue": {
    "v": 1,
    "modules": [
      {
        "id": "cardio",
        "name": "Cardiaque",
        "icon": "🫀",
        "accent": "#6ee7f7",
        "tabs": [
          {
            "id": "coupes",
            "label": "Coupes",
            "items": [
              {
                "id": "paxp",
                "name": "Petit axe parasternale",
                "desc": "Vue transversale VG, valve aortique, valve pulmonaire, piliers mitraux, DTDVG, SIVd et PPVG"
              },
              {
                "id": "gaxp",
                "name": "Grand axe parasternale",
                "desc": "VG, VD, valve mitrale, aorte ascendante, SIV, sinus de Valsalva, aorte ascendante"
              },
              {
                "id": "4c",
                "name": "4 cavités apicale",
                "desc": "4 chambres, septum inter-auriculaire et inter-ventriculaire, paroi antéro-latérale, paroi inféro-septale"
              },
              {
                "id": "5c",
                "name": "5 cavités apicale",
                "desc": "4 cavités + voie d'éjection aortique (LVOT)"
              },
              {
                "id": "2c",
                "name": "2 cavités apicale",
                "desc": "VG et OG, valve mitrale, paroi inférieure et antérieure"
              },
              {
                "id": "3c",
                "name": "3 cavités apicale",
                "desc": "VG, LVOT, aorte ascendante en apical, paroi antéro-septale, paroi inféro-latérale"
              },
              {
                "id": "sc",
                "name": "Sous-costale 4 cavités",
                "desc": "Vue sous-xyphoïdienne, septum interauriculaire, VCI, péricarde"
              },
              {
                "id": "vci_sc",
                "name": "VCI sous-costale",
                "desc": "Veine cave inférieure, variabilité respiratoire"
              },
              {
                "id": "supra",
                "name": "Suprasternale",
                "desc": "Arche aortique, vaisseaux du médiastin supérieur"
              }
            ]
          },
          {
            "id": "clinique",
            "label": "Situations cliniques",
            "items": [
              {
                "id": "normal",
                "name": "Cœur normal",
                "desc": "Fonction systolique et diastolique conservée, FE > 55%"
              },
              {
                "id": "cmd",
                "name": "CMD — Cardiomyopathie dilatée",
                "desc": "Dilatation VG, FE effondrée, hypokinésie globale"
              },
              {
                "id": "cmh",
                "name": "CMH — Cardiomyopathie hypertrophique",
                "desc": "HVG asymétrique, obstruction LVOT, SAM mitral"
              },
              {
                "id": "cdr",
                "name": "Cœur droit dilaté",
                "desc": "Dilatation VD, déviation septale, HTAP suspectée"
              },
              {
                "id": "ep",
                "name": "Épanchement péricardique",
                "desc": "Lame liquidienne péricardique, tamponnade"
              },
              {
                "id": "tamp",
                "name": "Tamponnade",
                "desc": "Collapsus VD/OD en diastole, signe du balancier"
              },
              {
                "id": "isc",
                "name": "Ischémie / Infarctus",
                "desc": "Anomalie de cinétique segmentaire, hypokinésie, akinésie"
              },
              {
                "id": "rao",
                "name": "Rétrécissement aortique",
                "desc": "Épaississement valvulaire, gradient élevé, réduction ouverture"
              },
              {
                "id": "im",
                "name": "Insuffisance mitrale",
                "desc": "Régurgitation mitrale au Doppler couleur, jet excentrique"
              },
              {
                "id": "dys",
                "name": "Dysfonction diastolique",
                "desc": "E/A inversé, E/e' élevé, dilatation OG"
              }
            ]
          },
          {
            "id": "mesures",
            "label": "Mesures",
            "items": [
              {
                "id": "ea",
                "name": "Ratio E/A",
                "desc": "Rapport flux mitral E/A — fonction diastolique"
              },
              {
                "id": "eep",
                "name": "E/e'",
                "desc": "E mitral / e' TDI anneau mitral — pression de remplissage"
              },
              {
                "id": "itv",
                "name": "ITV sous-aortique",
                "desc": "Intégrale temps-vitesse LVOT — débit cardiaque"
              },
              {
                "id": "fe",
                "name": "Fraction d'éjection (FE)",
                "desc": "Simpson biplan ou visuelle — fonction systolique VG"
              },
              {
                "id": "tapse",
                "name": "TAPSE",
                "desc": "Excursion systolique anneau tricuspide — fonction VD"
              },
              {
                "id": "vci_d",
                "name": "Diamètre VCI",
                "desc": "VCI en sous-costal expiration — estimation pression OD"
              },
              {
                "id": "vci_c",
                "name": "Collapsibilité VCI",
                "desc": "Variation inspiratoire VCI — estimation volémie"
              },
              {
                "id": "dpap",
                "name": "PAPs estimée",
                "desc": "4V²(IT) + POD — pression artérielle pulmonaire systolique"
              },
              {
                "id": "septum",
                "name": "Épaisseur septum IV",
                "desc": "Épaisseur diastolique septum inter-ventriculaire"
              },
              {
                "id": "dtdvg",
                "name": "DTD VG",
                "desc": "Diamètre télédiastolique VG en parasternale grand axe"
              },
              {
                "id": "ppvg",
                "name": "Épaisseur VG (PPVG)",
                "desc": "Épaisseur paroi postérieure du ventricule gauche en diastole"
              },
              {
                "id": "ep_peri",
                "name": "Épanchement péricardique",
                "desc": "Épaisseur de l'épanchement péricardique"
              },
              {
                "id": "sp_vd",
                "name": "Onde S' VD",
                "desc": "Vélocité systolique de l'anneau tricuspide au TDI — fonction longitudinale VD"
              },
              {
                "id": "ra_val",
                "name": "Rétrécissement aortique",
                "desc": "Surface aortique, gradient moyen, gradient max — sévérité du RAo"
              },
              {
                "id": "dtdvg_m",
                "name": "DTD VG",
                "desc": "Diamètre télédiastolique VG en parasternale grand axe"
              },
              {
                "id": "sivd",
                "name": "Épaisseur septale (SIVd)",
                "desc": "Épaisseur du septum inter-ventriculaire en diastole"
              }
            ]
          },
          {
            "id": "expert",
            "label": "Expert",
            "items": [
              {
                "id": "vegetation",
                "name": "Végétation",
                "desc": "Masse mobile hyperéchogène sur valve — endocardite infectieuse"
              },
              {
                "id": "abces_trigone",
                "name": "Abcès du trigone",
                "desc": "Collection péri-annulaire — complication endocardite"
              },
              {
                "id": "rupture_pilier",
                "name": "Rupture de pilier",
                "desc": "Insuffisance mitrale aiguë sévère — urgence chirurgicale"
              },
              {
                "id": "fop",
                "name": "FOP",
                "desc": "Foramen ovale perméable — passage de bulles au Doppler couleur"
              },
              {
                "id": "tako",
                "name": "Tako Tsubo",
                "desc": "Ballonnisation apicale VG, dysfonction systolique apicale réversible"
              },
              {
                "id": "ia",
                "name": "Insuffisance aortique",
                "desc": "Régurgitation aortique — jet Doppler couleur, PHT, vena contracta"
              },
              {
                "id": "dissection",
                "name": "Dissection aortique",
                "desc": "Flap intimal mobile — urgence chirurgicale, dilatation aortique"
              },
              {
                "id": "thrombus_vg",
                "name": "Thrombus intra-VG",
                "desc": "Masse apicale hypoéchogène — complication IDM, CMD"
              },
              {
                "id": "autres_expert",
                "name": "Autres",
                "desc": "Situations échographiques rares ou non classées"
              }
            ]
          }
        ]
      },
      {
        "id": "pleuro",
        "name": "Pleuro-pulmonaire",
        "icon": "🫁",
        "accent": "#a78bfa",
        "tabs": [
          {
            "id": "norm_pp",
            "label": "Signes normaux",
            "items": [
              {
                "id": "bat",
                "name": "Signe de la chauve-souris",
                "desc": "Lignes pleurales entre 2 côtes, aspect normal"
              },
              {
                "id": "glisse",
                "name": "Glissement pleural",
                "desc": "Mouvement en temps réel de la plèvre viscérale"
              },
              {
                "id": "mer",
                "name": "Signe du bord de mer (M-mode)",
                "desc": "Aspect sableux sous-pleural, poumon aéré normal"
              },
              {
                "id": "lineA",
                "name": "Lignes A",
                "desc": "Artéfacts horizontaux de répétition, signe d'aération"
              },
              {
                "id": "lineB",
                "name": "Lignes B (comètes)",
                "desc": "Artéfacts verticaux hyperéchogènes, œdème interstitiel"
              }
            ]
          },
          {
            "id": "patho_pp",
            "label": "Situations pathologiques",
            "items": [
              {
                "id": "pneumo",
                "name": "Pneumothorax",
                "desc": "Abolition glissement pleural, stratosphère M-mode, point pulmonaire"
              },
              {
                "id": "pleur_ep",
                "name": "Épanchement pleural",
                "desc": "Image anéchogène entre feuillets, signe de la méduse"
              },
              {
                "id": "conso",
                "name": "Consolidation pulmonaire",
                "desc": "Hépatisation, bronchogramme aérique dynamique"
              },
              {
                "id": "oedem",
                "name": "Œdème pulmonaire",
                "desc": "Lignes B diffuses bilatérales, profil B"
              },
              {
                "id": "sdr",
                "name": "Syndrome interstitiel",
                "desc": "Lignes B > 3 par espace intercostal"
              },
              {
                "id": "abces",
                "name": "Abcès / Masse",
                "desc": "Image hétérogène intra-parenchymateuse"
              }
            ]
          }
        ]
      },
      {
        "id": "abdo",
        "name": "Abdominale",
        "icon": "🫃",
        "accent": "#f97316",
        "tabs": [
          {
            "id": "organes",
            "label": "Organes & Structures",
            "items": [
              {
                "id": "foie",
                "name": "Foie",
                "desc": "Échogénicité, homogénéité, bords, segments de Couinaud"
              },
              {
                "id": "vbil",
                "name": "Vésicule biliaire",
                "desc": "Paroi, lithiases, cône d'ombre, Murphy écho"
              },
              {
                "id": "rate",
                "name": "Rate",
                "desc": "Taille (< 12 cm), échogénicité, splénomégalie"
              },
              {
                "id": "rein_d",
                "name": "Rein droit",
                "desc": "Taille, cortex, bassinet, dilatation pyélocalicielle"
              },
              {
                "id": "rein_g",
                "name": "Rein gauche",
                "desc": "Taille, cortex, bassinet, dilatation pyélocalicielle"
              },
              {
                "id": "aorte_ab",
                "name": "Aorte abdominale",
                "desc": "Diamètre (< 30 mm), anévrysme, dissection"
              },
              {
                "id": "pancreas",
                "name": "Pancréas",
                "desc": "Tête, corps, queue, canal de Wirsung"
              },
              {
                "id": "ascite",
                "name": "Ascite / FAST",
                "desc": "Morrison, Douglas, espaces péri-spléniques"
              }
            ]
          },
          {
            "id": "patho_ab",
            "label": "Situations pathologiques",
            "items": [
              {
                "id": "chol",
                "name": "Cholécystite",
                "desc": "Paroi > 3 mm, Murphy écho +, péri-cholécystite"
              },
              {
                "id": "hydro",
                "name": "Hydronéphrose",
                "desc": "Dilatation calicielle, grade I à IV"
              },
              {
                "id": "aaa",
                "name": "Anévrysme aorte abdominale",
                "desc": "Diamètre > 30 mm, calcifications, thrombus mural"
              },
              {
                "id": "stea",
                "name": "Stéatose hépatique",
                "desc": "Hyperéchogénicité hépatique, gradient foie/rein"
              },
              {
                "id": "fast",
                "name": "Épanchement libre (FAST)",
                "desc": "Protocole FAST, morrison, spléno-rénal, Douglas"
              },
              {
                "id": "ileus",
                "name": "Occlusion / Iléus",
                "desc": "Anses dilatées > 25 mm, péristaltisme absent"
              }
            ]
          }
        ]
      },
      {
        "id": "vascu",
        "name": "Echo-Doppler vasculaire",
        "icon": "🩸",
        "accent": "#f43f5e",
        "tabs": [
          {
            "id": "arteres",
            "label": "Artères",
            "items": [
              {
                "id": "caro",
                "name": "Carotides (TSA)",
                "desc": "IMT, plaques, sténose, Doppler couleur et pulsé"
              },
              {
                "id": "aorte_v",
                "name": "Aorte abdominale",
                "desc": "Diamètre, vitesses, résistances"
              },
              {
                "id": "fem",
                "name": "Artère fémorale commune",
                "desc": "Flux triphasique, sténose, pseudo-anévrysme"
              },
              {
                "id": "popl",
                "name": "Artère poplitée",
                "desc": "Flux, compressions, pièges poplités"
              },
              {
                "id": "ips",
                "name": "Index de pression systolique",
                "desc": "Rapport cheville/bras, AOMI"
              }
            ]
          },
          {
            "id": "veines",
            "label": "Veines",
            "items": [
              {
                "id": "tvp_prox",
                "name": "TVP proximale",
                "desc": "Fémorale commune, superficielle, poplitée — compressibilité"
              },
              {
                "id": "tvp_dist",
                "name": "TVP distale",
                "desc": "Veines jambières, tibiales, fibulaires"
              },
              {
                "id": "varic",
                "name": "Varices / Insuffisance veineuse",
                "desc": "Reflux saphénien, jonctions, points de fuite"
              },
              {
                "id": "vci_v",
                "name": "VCI",
                "desc": "Perméabilité, filtre cave, extension thrombotique"
              }
            ]
          }
        ]
      },
      {
        "id": "dtc",
        "name": "Doppler transcrânien",
        "icon": "🧠",
        "accent": "#8b5cf6",
        "tabs": [
          {
            "id": "norm_dtc",
            "label": "Situations normales",
            "items": [
              {
                "id": "dtc_norm",
                "name": "DTC normal",
                "desc": "Vélocités normales : ACM 55-80 cm/s, ACA 50-80 cm/s, ACP 40-60 cm/s"
              },
              {
                "id": "acm",
                "name": "ACM — artère cérébrale moyenne",
                "desc": "Profondeur 50-60 mm, flux rapide vers la sonde"
              },
              {
                "id": "aca",
                "name": "ACA — artère cérébrale antérieure",
                "desc": "Profondeur 60-75 mm, flux s'éloignant de la sonde"
              },
              {
                "id": "acp",
                "name": "ACP — artère cérébrale postérieure",
                "desc": "Profondeur 60-70 mm, P1 vers sonde, P2 s'éloigne"
              },
              {
                "id": "siphon",
                "name": "Siphon carotidien",
                "desc": "Profondeur 60-70 mm, flux bidirectionnel"
              },
              {
                "id": "vb_dtc",
                "name": "Système vertébro-basilaire",
                "desc": "Fenêtre sous-occipitale, basilaire, vertébrales"
              }
            ]
          },
          {
            "id": "patho_dtc",
            "label": "Situations pathologiques",
            "items": [
              {
                "id": "vasospasme",
                "name": "Vasospasme",
                "desc": "ACM > 120 cm/s, index de Lindegaard > 3, post-HSA"
              },
              {
                "id": "htic",
                "name": "HTIC",
                "desc": "PPC insuffisante / hypovolémie / hypocapnie — IP élevé > 1.4 et VTD < 25 cm/s"
              },
              {
                "id": "mort_cereb",
                "name": "Arrêt circulatoire cérébral",
                "desc": "Flux oscillant, pic systolique isolé, silence"
              },
              {
                "id": "autoregul",
                "name": "Test d'autorégulation",
                "desc": "Réponse à la variation de PAM, index d'autorégulation"
              }
            ]
          }
        ]
      }
    ]
  }
};
