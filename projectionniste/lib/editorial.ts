// Ensembles éditoriaux : le même catalogue pour tout le monde (pas de recommandation).
// Sélections sous licence (Criterion, « 1001 films ») volontairement absentes.
// Les films sont retrouvés sur TMDB par titre et année ; les sagas et studios viennent de TMDB
// (leur clé est celle de n'importe quelle saga ou studio : « saga-8091 », « studio-10342 »).

export type EditorialDef = {
  key: string;
  family: "Mouvements" | "Palmarès" | "Studios" | "Sagas";
  kicker: string;
  title: string;
  description: string;
  rule: string;
  /** [titre cherché, année, légende] */
  films?: [string, number, string?][];
  company?: number;
  saga?: number;
};

export const FAMILIES: EditorialDef["family"][] = ["Mouvements", "Palmarès", "Studios", "Sagas"];

const PALMES: [string, number][] = [
  ["Sailor et Lula", 1990], ["Barton Fink", 1991], ["Les Meilleures Intentions", 1992], ["La Leçon de piano", 1993], ["Adieu ma concubine", 1993],
  ["Pulp Fiction", 1994], ["Underground", 1995], ["Secrets et Mensonges", 1996], ["Le Goût de la cerise", 1997], ["L'Anguille", 1997],
  ["L'Éternité et un jour", 1998], ["Rosetta", 1999], ["Dancer in the Dark", 2000], ["La Chambre du fils", 2001], ["Le Pianiste", 2002],
  ["Elephant", 2003], ["Fahrenheit 9/11", 2004], ["L'Enfant", 2005], ["Le vent se lève", 2006], ["4 mois, 3 semaines, 2 jours", 2007],
  ["Entre les murs", 2008], ["Le Ruban blanc", 2009], ["Oncle Boonmee", 2010], ["The Tree of Life", 2011], ["Amour", 2012],
  ["La Vie d'Adèle", 2013], ["Winter Sleep", 2014], ["Dheepan", 2015], ["Moi, Daniel Blake", 2016], ["The Square", 2017],
  ["Une affaire de famille", 2018], ["Parasite", 2019], ["Titane", 2021], ["Sans filtre", 2022], ["Anatomie d'une chute", 2023],
  ["Anora", 2024], ["Un simple accident", 2025],
];

const OSCARS: [string, number][] = [
  ["Danse avec les loups", 1990], ["Le Silence des agneaux", 1991], ["Impitoyable", 1992], ["La Liste de Schindler", 1993], ["Forrest Gump", 1994],
  ["Braveheart", 1995], ["Le Patient anglais", 1996], ["Titanic", 1997], ["Shakespeare in Love", 1998], ["American Beauty", 1999],
  ["Gladiator", 2000], ["Un homme d'exception", 2001], ["Chicago", 2002], ["Le Seigneur des anneaux : Le Retour du roi", 2003], ["Million Dollar Baby", 2004],
  ["Collision", 2005], ["Les Infiltrés", 2006], ["No Country for Old Men", 2007], ["Slumdog Millionaire", 2008], ["Démineurs", 2009],
  ["Le Discours d'un roi", 2010], ["The Artist", 2011], ["Argo", 2012], ["12 Years a Slave", 2013], ["Birdman", 2014],
  ["Spotlight", 2015], ["Moonlight", 2016], ["La Forme de l'eau", 2017], ["Green Book", 2018], ["Parasite", 2019],
  ["Nomadland", 2020], ["CODA", 2021], ["Everything Everywhere All at Once", 2022], ["Oppenheimer", 2023], ["Anora", 2024],
];

export const EDITORIAL: EditorialDef[] = [
  {
    key: "nouvelle-vague",
    family: "Mouvements",
    kicker: "Mouvement",
    title: "La Nouvelle Vague",
    description: "La fin des années 1950 : caméras légères, tournages dans la rue, jeunes critiques des Cahiers passés derrière la caméra.",
    rule: "Une sélection de vingt films essentiels, de 1958 à 1965.",
    films: [
      ["Le Beau Serge", 1958], ["Les Quatre Cents Coups", 1959], ["Hiroshima mon amour", 1959], ["Les Cousins", 1959], ["À bout de souffle", 1960],
      ["Tirez sur le pianiste", 1960], ["Paris nous appartient", 1961], ["Lola", 1961], ["Une femme est une femme", 1961], ["L'Année dernière à Marienbad", 1961],
      ["Jules et Jim", 1962], ["Cléo de 5 à 7", 1962], ["Vivre sa vie", 1962], ["Le Signe du Lion", 1962], ["La Jetée", 1962],
      ["Le Mépris", 1963], ["Les Carabiniers", 1963], ["Bande à part", 1964], ["Le Bonheur", 1965], ["Pierrot le fou", 1965],
    ],
  },
  {
    key: "dogme-95",
    family: "Mouvements",
    kicker: "Mouvement",
    title: "Dogme 95",
    description: "Le « vœu de chasteté » de Lars von Trier et Thomas Vinterberg : caméra à l'épaule, lumière naturelle, pas de musique ajoutée.",
    rule: "Les films certifiés Dogme les plus marquants (sélection).",
    films: [
      ["Festen", 1998, "Dogme #1"], ["Les Idiots", 1998, "Dogme #2"], ["Mifune", 1999, "Dogme #3"], ["The King Is Alive", 2000, "Dogme #4"],
      ["Lovers", 1999, "Dogme #5"], ["Julien Donkey-Boy", 1999, "Dogme #6"], ["Italian for Beginners", 2000], ["Open Hearts", 2002],
    ],
  },
  {
    key: "palmes-d-or",
    family: "Palmarès",
    kicker: "Palmarès",
    title: "Palmes d'or",
    description: "Les films récompensés par la Palme d'or au Festival de Cannes, depuis 1990.",
    rule: "Chaque Palme d'or depuis 1990, ex æquo compris (pas de festival en 2020).",
    films: PALMES.map(([t, y]) => [t, y, `Palme d'or ${y}`]),
  },
  {
    key: "oscar-meilleur-film",
    family: "Palmarès",
    kicker: "Palmarès",
    title: "Oscar du meilleur film",
    description: "Les films couronnés par l'Académie, depuis 1990.",
    rule: "Chaque Oscar du meilleur film, films sortis de 1990 à 2024.",
    films: OSCARS.map(([t, y]) => [t, y, `Film de ${y}`]),
  },
  {
    key: "studio-10342",
    family: "Studios",
    kicker: "Studio",
    title: "Studio Ghibli",
    description: "Miyazaki, Takahata et leurs héritiers : quarante ans d'animation dessinée à la main.",
    rule: "Les longs métrages du studio (au moins 20 votes sur TMDB).",
    company: 10342,
  },
  { key: "saga-8091", family: "Sagas", kicker: "Saga", title: "Alien", description: "Du Nostromo à Romulus.", rule: "Tous les films de la saga, dans l'ordre de sortie.", saga: 8091 },
  { key: "saga-230", family: "Sagas", kicker: "Saga", title: "Le Parrain", description: "La trilogie de Francis Ford Coppola.", rule: "Les trois films, dans l'ordre de sortie.", saga: 230 },
  { key: "saga-264", family: "Sagas", kicker: "Saga", title: "Retour vers le futur", description: "Robert Zemeckis, 1985–1990.", rule: "Les trois films, dans l'ordre de sortie.", saga: 264 },
  { key: "saga-119", family: "Sagas", kicker: "Saga", title: "Le Seigneur des anneaux", description: "La trilogie de Peter Jackson.", rule: "Tous les films de la saga, dans l'ordre de sortie.", saga: 119 },
  { key: "saga-84", family: "Sagas", kicker: "Saga", title: "Indiana Jones", description: "Des Aventuriers de l'arche perdue au Cadran de la destinée.", rule: "Tous les films de la saga, dans l'ordre de sortie.", saga: 84 },
];
