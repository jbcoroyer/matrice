// Ensembles éditoriaux : le même catalogue pour tout le monde (pas de recommandation).
// Sélections sous licence (Criterion, « 1001 films ») volontairement absentes.
// Les films sont retrouvés sur TMDB par titre et année ; les sagas et studios viennent de TMDB
// (leur clé est celle de n'importe quelle saga ou studio : « saga-8091 », « studio-10342 »).

export type EditorialDef = {
  key: string;
  family: "Mouvements" | "Cinémas du monde" | "Saisons" | "Palmarès" | "Studios" | "Sagas";
  /** mois (1-12) où Découvrir le met en avant : « Ce mois-ci » */
  months?: number[];
  kicker: string;
  title: string;
  description: string;
  rule: string;
  /** [titre cherché, année, légende] */
  films?: [string, number, string?][];
  company?: number;
  saga?: number;
};

export const FAMILIES: EditorialDef["family"][] = ["Mouvements", "Cinémas du monde", "Saisons", "Palmarès", "Studios", "Sagas"];

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
    key: "expressionnisme-allemand",
    family: "Mouvements",
    kicker: "Mouvement",
    title: "L'Expressionnisme allemand",
    description: "Berlin après 1918 : décors peints, ombres démesurées, savants fous et vampires. Le cinéma découvre qu'il peut filmer l'angoisse.",
    rule: "Une sélection de films de 1920 à 1931, dont L'Aurore tourné par Murnau à Hollywood.",
    films: [
      ["Das Cabinet des Dr. Caligari", 1920], ["Der Golem, wie er in die Welt kam", 1920], ["Der müde Tod", 1921], ["Nosferatu", 1922], ["Dr. Mabuse, der Spieler", 1922],
      ["Der letzte Mann", 1924], ["Orlacs Hände", 1924], ["Das Wachsfigurenkabinett", 1924], ["Faust", 1926], ["Metropolis", 1927],
      ["Sunrise: A Song of Two Humans", 1927], ["M - Eine Stadt sucht einen Mörder", 1931],
    ],
  },
  {
    key: "film-noir",
    family: "Mouvements",
    kicker: "Genre",
    title: "Le Film noir",
    description: "Détectives fatigués, femmes fatales, villes la nuit : l'Amérique des années 1940 et 1950 vue par l'ombre.",
    rule: "Une sélection, du Faucon maltais à La Soif du mal (1941–1958).",
    films: [
      ["The Maltese Falcon", 1941], ["Double Indemnity", 1944], ["Laura", 1944], ["Murder, My Sweet", 1944], ["The Big Sleep", 1946], ["The Killers", 1946],
      ["Gilda", 1946], ["Out of the Past", 1947], ["The Lady from Shanghai", 1947], ["The Third Man", 1949], ["The Asphalt Jungle", 1950], ["Sunset Boulevard", 1950],
      ["In a Lonely Place", 1950], ["Kiss Me Deadly", 1955], ["Sweet Smell of Success", 1957], ["Touch of Evil", 1958],
    ],
  },
  {
    key: "neorealisme-italien",
    family: "Mouvements",
    kicker: "Mouvement",
    title: "Le Néoréalisme italien",
    description: "L'Italie en ruines, tournée dans la rue avec des acteurs souvent non professionnels : Rossellini, De Sica, Visconti, puis Fellini.",
    rule: "Une sélection de films de 1945 à 1957.",
    films: [
      ["Roma città aperta", 1945], ["Paisà", 1946], ["Sciuscià", 1946], ["Germania anno zero", 1948], ["Ladri di biciclette", 1948], ["La terra trema", 1948],
      ["Riso amaro", 1949], ["Stromboli", 1950], ["Miracolo a Milano", 1951], ["Bellissima", 1951], ["Umberto D.", 1952], ["Viaggio in Italia", 1954],
      ["La strada", 1954], ["Le notti di Cabiria", 1957],
    ],
  },
  {
    key: "nouvel-hollywood",
    family: "Mouvements",
    kicker: "Mouvement",
    title: "Le Nouvel Hollywood",
    description: "Quand les studios laissent les clés à une génération de cinéastes : Penn, Coppola, Scorsese, Altman, Cassavetes. Des héros abîmés, une Amérique qui doute.",
    rule: "Une sélection de films de 1967 à 1979.",
    films: [
      ["Bonnie and Clyde", 1967], ["The Graduate", 1967], ["Easy Rider", 1969], ["Midnight Cowboy", 1969], ["The Wild Bunch", 1969], ["Five Easy Pieces", 1970],
      ["The Last Picture Show", 1971], ["The Godfather", 1972], ["Mean Streets", 1973], ["The Conversation", 1974], ["Chinatown", 1974], ["A Woman Under the Influence", 1974],
      ["Nashville", 1975], ["Taxi Driver", 1976], ["Network", 1976], ["Days of Heaven", 1978], ["The Deer Hunter", 1978], ["Apocalypse Now", 1979],
    ],
  },
  {
    key: "japon-age-d-or",
    family: "Cinémas du monde",
    kicker: "Japon",
    title: "L'Âge d'or japonais",
    description: "Kurosawa, Ozu, Mizoguchi, Naruse, Kobayashi : en quinze ans, le cinéma japonais signe une bonne part des chefs-d'œuvre du siècle.",
    rule: "Une sélection de films de 1950 à 1964.",
    films: [
      ["Rashomon", 1950], ["Ikiru", 1952], ["Tokyo Story", 1953], ["Ugetsu", 1953], ["Seven Samurai", 1954], ["Sansho the Bailiff", 1954], ["Floating Clouds", 1955],
      ["The Burmese Harp", 1956], ["Floating Weeds", 1959], ["Harakiri", 1962], ["An Autumn Afternoon", 1962], ["High and Low", 1963], ["Woman in the Dunes", 1964], ["Onibaba", 1964],
    ],
  },
  {
    key: "hong-kong",
    family: "Cinémas du monde",
    kicker: "Hong Kong",
    title: "Hong Kong, 1986–2004",
    description: "Les fusillades chorégraphiées de John Woo, les néons et les chagrins de Wong Kar-wai, les polars de la rétrocession.",
    rule: "Une sélection, du Syndicat du crime à 2046.",
    films: [
      ["A Better Tomorrow", 1986], ["The Killer", 1989], ["Days of Being Wild", 1990], ["Once Upon a Time in China", 1991], ["Hard Boiled", 1992], ["Chungking Express", 1994],
      ["Fallen Angels", 1995], ["Comrades: Almost a Love Story", 1996], ["Happy Together", 1997], ["In the Mood for Love", 2000], ["Infernal Affairs", 2002], ["2046", 2004],
    ],
  },
  {
    key: "cinema-iranien",
    family: "Cinémas du monde",
    kicker: "Iran",
    title: "Le Cinéma iranien",
    description: "Kiarostami, Makhmalbaf, Panahi, Farhadi : des enfants, des routes, des voitures, et une manière unique de mêler fiction et réel.",
    rule: "Une sélection de films de 1987 à 2016.",
    films: [
      ["Where Is the Friend's House?", 1987], ["Close-Up", 1990], ["And Life Goes On", 1992], ["Through the Olive Trees", 1994], ["The White Balloon", 1995],
      ["A Moment of Innocence", 1996], ["Taste of Cherry", 1997], ["Children of Heaven", 1997], ["The Apple", 1998], ["The Wind Will Carry Us", 1999],
      ["The Circle", 2000], ["Ten", 2002], ["Offside", 2006], ["A Separation", 2011], ["Taxi Tehran", 2015], ["The Salesman", 2016],
    ],
  },
  {
    key: "cinema-coreen",
    family: "Cinémas du monde",
    kicker: "Corée du Sud",
    title: "Le Renouveau coréen",
    description: "Park Chan-wook, Bong Joon-ho, Lee Chang-dong, Na Hong-jin : vingt ans de polars, de vengeances et de lutte des classes, jusqu'à la Palme d'or.",
    rule: "Une sélection de films de 2000 à 2019.",
    films: [
      ["Joint Security Area", 2000], ["Sympathy for Mr. Vengeance", 2002], ["Memories of Murder", 2003], ["Oldboy", 2003], ["A Tale of Two Sisters", 2003],
      ["Spring, Summer, Fall, Winter... and Spring", 2003], ["The Host", 2006], ["Secret Sunshine", 2007], ["The Chaser", 2008], ["Mother", 2009], ["Poetry", 2010],
      ["I Saw the Devil", 2010], ["The Handmaiden", 2016], ["Train to Busan", 2016], ["The Wailing", 2016], ["Burning", 2018], ["Parasite", 2019],
    ],
  },
  {
    key: "frissons",
    family: "Saisons",
    kicker: "Octobre",
    title: "Frissons d'octobre",
    description: "Maisons hantées, exorcismes et nuits sans lune : quinze films qui font peur depuis un siècle, du muet à aujourd'hui.",
    rule: "Une sélection de films d'épouvante, de 1922 à 2018.",
    months: [10],
    films: [
      ["Nosferatu", 1922], ["Psycho", 1960], ["Les Yeux sans visage", 1960], ["Rosemary's Baby", 1968], ["Night of the Living Dead", 1968], ["The Exorcist", 1973],
      ["Suspiria", 1977], ["Halloween", 1978], ["The Shining", 1980], ["The Evil Dead", 1981], ["The Thing", 1982], ["Candyman", 1992],
      ["Ringu", 1998], ["Let the Right One In", 2008], ["Hereditary", 2018],
    ],
  },
  {
    key: "noel",
    family: "Saisons",
    kicker: "Décembre",
    title: "Noël au cinéma",
    description: "Des classiques de la veillée aux Noëls qui grincent : douze films pour les derniers jours de l'année.",
    rule: "Une sélection de films de Noël, de 1946 à 2005.",
    months: [12],
    films: [
      ["It's a Wonderful Life", 1946], ["Fanny och Alexander", 1982], ["Gremlins", 1984], ["Die Hard", 1988], ["Scrooged", 1988], ["Home Alone", 1990],
      ["Edward Scissorhands", 1990], ["The Nightmare Before Christmas", 1993], ["Love Actually", 2003], ["Bad Santa", 2003], ["Elf", 2003], ["Joyeux Noël", 2005],
    ],
  },
  {
    key: "ete",
    family: "Saisons",
    kicker: "Été",
    title: "L'Été au cinéma",
    description: "Plages, route des vacances, chaleur qui écrase : onze films où l'été est un personnage.",
    rule: "Une sélection de films d'été, de 1953 à 2017.",
    months: [6, 7, 8],
    films: [
      ["Les Vacances de Monsieur Hulot", 1953], ["Plein soleil", 1960], ["Jaws", 1975], ["Pauline à la plage", 1983], ["Le Rayon vert", 1986], ["Stand by Me", 1986],
      ["Do the Right Thing", 1989], ["Conte d'été", 1996], ["Y tu mamá también", 2001], ["Moonrise Kingdom", 2012], ["Call Me by Your Name", 2017],
    ],
  },
  {
    key: "palmes-d-or",
    family: "Palmarès",
    months: [5],
    kicker: "Palmarès",
    title: "Palmes d'or",
    description: "Les films récompensés par la Palme d'or au Festival de Cannes, depuis 1990.",
    rule: "Chaque Palme d'or depuis 1990, ex æquo compris (pas de festival en 2020).",
    films: PALMES.map(([t, y]) => [t, y, `Palme d'or ${y}`]),
  },
  {
    key: "oscar-meilleur-film",
    family: "Palmarès",
    months: [2, 3],
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
  {
    key: "saga-8091",
    family: "Sagas",
    kicker: "Saga",
    title: "Alien",
    description: "Du Nostromo à Romulus.",
    rule: "Les sept films Alien, dans l'ordre de sortie (sans les crossovers Alien vs. Predator).",
    // TMDB sépare les quatre premiers des préquelles : on réunit toute la saga
    films: [
      ["Alien, le huitième passager", 1979], ["Aliens, le retour", 1986], ["Alien 3", 1992], ["Alien, la résurrection", 1997],
      ["Prometheus", 2012], ["Alien: Covenant", 2017], ["Alien: Romulus", 2024],
    ],
  },
  { key: "saga-230", family: "Sagas", kicker: "Saga", title: "Le Parrain", description: "La trilogie de Francis Ford Coppola.", rule: "Les trois films, dans l'ordre de sortie.", saga: 230 },
  { key: "saga-264", family: "Sagas", kicker: "Saga", title: "Retour vers le futur", description: "Robert Zemeckis, 1985–1990.", rule: "Les trois films, dans l'ordre de sortie.", saga: 264 },
  { key: "saga-119", family: "Sagas", kicker: "Saga", title: "Le Seigneur des anneaux", description: "La trilogie de Peter Jackson.", rule: "Tous les films de la saga, dans l'ordre de sortie.", saga: 119 },
  { key: "saga-84", family: "Sagas", kicker: "Saga", title: "Indiana Jones", description: "Des Aventuriers de l'arche perdue au Cadran de la destinée.", rule: "Tous les films de la saga, dans l'ordre de sortie.", saga: 84 },
];
