import type { KitId } from './Progression';
import type { ChapterStory } from '../cinematics/Scene';
import { PROLOGUE_STORY } from './stories/Prologue';
import { BAOLI_STORY } from './stories/Baoli';
import { AKHADA_STORY } from './stories/Akhada';
import { ISLAND_STORY } from './stories/Island';
import type { Expedition } from './Expedition';
import { ISLAND_EXPEDITION } from './IslandExpedition';
import { DWARKA_STORY } from './stories/Dwarka';
import { SUMMIT_STORY } from './stories/Summit';

/**
 * The campaign, in order. `level` is the LevelManager index of the arena it is fought in. Ids run on from 0 (the
 * prologue); the saved progress (`Progress.unlocked`) is the highest id the player may start.
 */
export interface Chapter {
  id: number;
  level: number;
  /** What the hero carries and can do here (see Progression). */
  kit: KitId;
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
  /** Its story scenes and in-fight lines (src/game/Story.ts). */
  story?: ChapterStory;
  /** The intro shows the place and nothing else: its opponents arrive later, in the story (the prologue's raid). */
  introPlaceOnly?: boolean;
  /** Once over, the campaign runs straight on into the next chapter's intro (no chapter-complete screen). */
  continues?: boolean;
  /** An explorable chapter: encounters along the map and a goal to reach (src/game/Expedition.ts). */
  expedition?: Expedition;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 0,
    level: 0,
    kit: 'prologue',
    numeral: '',
    name: 'The Last Lesson',
    native: 'अंतिम पाठ',
    place: 'His village, at the edge of the desert',
    line: 'One more lesson before the light goes.',
    clearedLine: 'The village is quiet. The guru is gone.',
    defeatLine: 'The village burns.',
    story: PROLOGUE_STORY,
    introPlaceOnly: true,
    continues: true,
  },
  {
    id: 1,
    level: 1,
    kit: 'baoli',
    numeral: 'I',
    name: 'The Moonlit Baoli',
    native: 'चाँदनी बावड़ी',
    place: 'A stepwell below the falls',
    line: 'Something old keeps the water here.',
    clearedLine: 'The water is still again.',
    defeatLine: 'The stepwell keeps its guardian.',
    story: BAOLI_STORY,
    // The Guardian rises in the opening scene, not the intro.
    introPlaceOnly: true,
  },
  {
    id: 2,
    level: 2,
    kit: 'akhada',
    numeral: 'II',
    name: 'Hanuman Akhada',
    native: 'हनुमान अखाड़ा',
    place: 'A courtyard under an open sky',
    line: 'The akhada asks one thing: whether you will stand.',
    clearedLine: 'The courtyard falls quiet.',
    defeatLine: 'The akhada still stands against you.',
    story: AKHADA_STORY,
    introPlaceOnly: true,
  },
  {
    id: 3,
    level: 5,
    kit: 'island',
    numeral: 'III',
    name: 'The Island',
    native: 'द्वीप',
    place: 'The caves under the island',
    line: 'Something blessed is kept in the dark. Something keeps it.',
    clearedLine: 'The blessed mace is his.',
    defeatLine: 'The dark keeps the mace.',
    story: ISLAND_STORY,
    introPlaceOnly: true,
    expedition: ISLAND_EXPEDITION,
  },
  {
    id: 4,
    level: 3,
    kit: 'dwarka',
    numeral: 'IV',
    name: 'Dwarka',
    native: 'द्वारका',
    place: "Krishna's city, at the edge of the sea",
    line: 'The sea is taking the city back. Someone came to finish the work.',
    clearedLine: 'The tide comes in over a quiet city.',
    defeatLine: 'Dwarka sinks a little further.',
    story: DWARKA_STORY,
  },
  {
    id: 5,
    level: 4,
    kit: 'summit',
    numeral: 'V',
    name: 'Kailasha Summit',
    native: 'कैलाश शिखर',
    place: 'The charnel ridge, under the eclipse',
    line: "Under the eclipse, on Shiva's stair, a crown waits for the one who would wear it.",
    clearedLine: 'The summit is silent.',
    defeatLine: 'The rakshasas hold the summit.',
    story: SUMMIT_STORY,
  },
];

export function chapterById(id: number): Chapter {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
}

/** The last chapter's id (the saved progress goes one past it once the campaign is complete). */
export const LAST_CHAPTER = CHAPTERS[CHAPTERS.length - 1].id;

/** "Prologue", or "Chapter II": how cards, menus and loading screens name a chapter. */
export function chapterTitle(chapter: Chapter): string {
  return chapter.numeral ? `Chapter ${chapter.numeral}` : 'Prologue';
}
