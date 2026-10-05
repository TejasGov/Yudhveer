/**
 * What Yudhveer can do in each chapter (docs/STORY.md, "Weapon progression"). He starts with almost nothing and earns
 * every weapon and skill on the road, so a chapter does not inherit the hero of the one before it: it names a *kit*,
 * and the kit decides his weapon and which moves are allowed. Replaying an early chapter gives back its early kit.
 *
 * The campaign save (`Progress.unlocked`) is the highest chapter reached; the kit follows from the chapter. What a
 * fight teaches him mid-chapter (the guru's lessons, in Chapter I) is saved on top, per kit, by `learn`.
 */

export type WeaponId = 'lathi' | 'sword' | 'mace' | 'khanda';

/**
 * Moves that can be locked away. Striking, walking, sprinting and jumping are always his; the rest are earned.
 * `block` and `parry` also need a shield in hand (see `WeaponSet.shield`).
 */
export type Ability = 'dodge' | 'combo' | 'block' | 'parry' | 'charge' | 'leap';

export type KitId = 'prologue' | 'baoli' | 'akhada' | 'island' | 'dwarka' | 'summit';

/**
 * What he wears (docs/STORY.md, "The divya kavach"): the village boy's white and dark-orange training clothes with a
 * bamboo kavach (`yodha_training.glb`), until the Devi of the baoli grants him the divya kavach, his armour from then
 * on (`yodha.glb`). The same clips, sockets and weapons either way; only the model changes.
 */
export type Attire = 'training' | 'kavach';

export interface HeroKit {
  id: KitId;
  weapon: WeaponId;
  /** Allowed from the first second of the chapter. */
  abilities: readonly Ability[];
  /** Still to be learned in the chapter's fight: locked until `learn` is called (the guru's teachings). */
  taught: readonly Ability[];
  /** What he wears as the chapter starts. */
  attire: Attire;
  /**
   * What the chapter's story changes him into (`Player.wear`): loaded with the chapter so the change is instant
   * (Chapter I: the divya kavach, granted at the Devi's shrine before the fight).
   */
  becomes?: Attire;
}

export const KITS: Record<KitId, HeroKit> = {
  // The village boy at his lessons: the lathi, one blow at a time, and the slide. No chained blows yet.
  prologue: { id: 'prologue', weapon: 'lathi', abilities: ['dodge'], taught: [], attire: 'training' },
  // The lathi only, no shield. Strike and slide; the rest the guru's voice teaches him as the fight asks for it.
  // He comes to the baoli in his training clothes; the Devi at its shrine clothes him in the divya kavach before the fight.
  baoli: { id: 'baoli', weapon: 'lathi', abilities: ['dodge', 'combo'], taught: ['charge'], attire: 'training', becomes: 'kavach' },
  // A very basic sword, and the dhal from the vanara mentor: block, then parry, taught in his sparring.
  akhada: { id: 'akhada', weapon: 'sword', abilities: ['dodge', 'combo'], taught: ['block', 'parry'], attire: 'kavach' },
  // The island: he goes down into the caves with the akhada's sword and dhal (block and parry learned there); the
  // mace is what he comes up with.
  island: { id: 'island', weapon: 'sword', abilities: ['dodge', 'combo', 'block', 'parry'], taught: [], attire: 'kavach' },
  // The blessed mace in both hands, no shield: heavy blows, and the slam from a run.
  dwarka: { id: 'dwarka', weapon: 'mace', abilities: ['dodge', 'combo', 'leap'], taught: [], attire: 'kavach' },
  // The magical sword from Takshaka, with the dhal: the full kit.
  summit: { id: 'summit', weapon: 'khanda', abilities: ['dodge', 'combo', 'block', 'parry', 'charge', 'leap'], taught: [], attire: 'kavach' },
};

const LEARNED_KEY = 'yudhveer.learned.v1';

function readLearned(): Partial<Record<KitId, Ability[]>> {
  try {
    const raw = localStorage.getItem(LEARNED_KEY);
    if (raw) return JSON.parse(raw) as Partial<Record<KitId, Ability[]>>;
  } catch {
    // Private mode, blocked storage or a damaged save: nothing learned yet.
  }
  return {};
}

/** What the hero can do right now: a kit plus what he has learned in it. */
export class Skills {
  private learned = new Set<Ability>();

  constructor(public kit: HeroKit) {
    this.setKit(kit);
  }

  /** Starts a chapter's kit, with whatever was already learned in it kept. */
  public setKit(kit: HeroKit): void {
    this.kit = kit;
    this.learned = new Set((readLearned()[kit.id] ?? []).filter((a) => kit.taught.includes(a)));
  }

  /** Whether `ability` is allowed (the caller adds the shield requirement for block and parry). */
  public has(ability: Ability): boolean {
    return this.kit.abilities.includes(ability) || this.learned.has(ability);
  }

  /** Teaches a move the chapter withheld; saved. Returns whether it was new. */
  public learn(ability: Ability): boolean {
    if (this.has(ability) || !this.kit.taught.includes(ability)) return false;
    this.learned.add(ability);
    const all = readLearned();
    all[this.kit.id] = [...this.learned];
    try {
      localStorage.setItem(LEARNED_KEY, JSON.stringify(all));
    } catch {
      // Not persisted; still known this session.
    }
    return true;
  }
}
