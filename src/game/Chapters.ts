/** The campaign, in order. `level` is the LevelManager index of the arena it is fought in. */
export interface Chapter {
  id: number;
  level: number;
  numeral: string;
  name: string;
  /** Devanagari name, shown on the chapter card. */
  native: string;
  place: string;
  /** One line on the chapter card. */
  line: string;
  /** Shown when the chapter is cleared. */
  clearedLine: string;
  /** The defeat screen's line when no boss is standing (bosses get "<name> still stands."). */
  defeatLine: string;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    level: 1,
    numeral: 'I',
    name: 'The Moonlit Baoli',
    native: 'चाँदनी बावड़ी',
    place: 'A stepwell below the falls',
    line: 'Something old keeps the water here.',
    clearedLine: 'The water is still again.',
    defeatLine: 'The stepwell keeps its guardian.',
  },
  {
    id: 2,
    level: 2,
    numeral: 'II',
    name: 'Hanuman Akhada',
    native: 'हनुमान अखाड़ा',
    place: 'A courtyard under an open sky',
    line: 'The akhada asks one thing: whether you will stand.',
    clearedLine: 'The courtyard falls quiet.',
    defeatLine: 'The akhada still stands against you.',
  },
  {
    id: 3,
    level: 3,
    numeral: 'III',
    name: 'Dwarka',
    native: 'द्वारका',
    place: "Krishna's city, at the edge of the sea",
    line: 'The sea is taking the city back. Someone came to finish the work.',
    clearedLine: 'The tide comes in over a quiet city.',
    defeatLine: 'Dwarka sinks a little further.',
  },
  {
    id: 4,
    level: 4,
    numeral: 'IV',
    name: 'Kailasha Summit',
    native: 'कैलाश शिखर',
    place: 'The charnel ridge, under the eclipse',
    line: "Under the eclipse, on Shiva's stair, a crown waits for the one who would wear it.",
    clearedLine: 'The summit is silent.',
    defeatLine: 'The rakshasas hold the summit.',
  },
];

export function chapterById(id: number): Chapter {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
}
