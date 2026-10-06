import type { Character } from '../entities/Character';
import type { CharacterDefinition, CharacterRig } from '../entities/animation/CharacterRig';
import { SoundFX } from './SoundFX';

/**
 * The thud of a felled foe's body reaching the ground (`SoundFX.playBodyFall`), once a death. When the body lands is
 * not authored: it is read off the death clip itself, the first moment its hips are down at the height the clip ends at
 * (`CharacterRig.measureLanding`), once for each character definition, with its strike windows as the model loads
 * (`Character.fitProps`). A body still in the air (struck off a ledge, flung) is waited for until it is grounded; one
 * that fell out of the world never sounds.
 */
export class BodyFall {
  /** Seconds into a definition's death state at which its body lands (the clip's own, scaled to the state's rate). */
  private static readonly landing = new WeakMap<CharacterDefinition, number | null>();
  private static readonly sounded = new WeakSet<Character>();

  /** Measures a definition's death clip, once. */
  public static measure(definition: CharacterDefinition, rig: CharacterRig): void {
    if (this.landing.has(definition)) return;
    const dead = definition.states.DEAD;
    const at = dead ? rig.measureLanding(dead.clip) : undefined;
    this.landing.set(definition, at === undefined || !dead ? null : Math.max(0, at - (dead.startAt ?? 0)) / (dead.timeScale ?? 1));
  }

  /** Once per simulation step (Character.update): the thud, when a dead foe's body has landed. */
  public static step(c: Character): void {
    // Foes only (the hero's fall and the cast's are scenes of their own): an Enemy has `isBoss`, nothing else does.
    if (c.stateMachine.currentState !== 'DEAD' || !('isBoss' in c) || !c.rig || !c.group.visible || this.sounded.has(c)) return;
    const at = this.landing.get(c.rig.definition);
    if (at === undefined || at === null || c.stateMachine.stateTime < at || (c.motor && !c.motor.grounded)) return;
    this.sounded.add(c);
    SoundFX.getInstance().playBodyFall((c as { isBoss?: boolean }).isBoss ? 1 : 0.8);
  }
}
