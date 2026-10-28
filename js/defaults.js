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
  "feries": []
};
