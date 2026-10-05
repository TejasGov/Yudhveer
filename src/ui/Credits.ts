import './credits.css';

/** Seconds the roll takes from the foot of the screen to the last line gone off the top. */
const ROLL_SECONDS = 48;

/** The credits, in order: a heading (small, saffron) over its names (the serif). */
const CREDITS: [string, string[]][] = [
  ['Created by', ['TejasGov']],
  ['Built with', ['Three.js', 'Rapier', 'Vite']],
  ['Characters', ['Meshy', 'Mixamo']],
  ['Voices, sound and music', ['ElevenLabs']],
  ['Places', ['Blender', 'Poly Haven']],
];

/**
 * The credits after the campaign's last scene: a slow roll over black in the title's type, then `onDone` (back to the
 * title). Its own screen (`#credits`, built here) in the ScreenStack, with one button to leave early.
 */
export class Credits {
  public readonly root: HTMLElement;
  private readonly roll: HTMLElement;
  private timer = 0;
  private running = false;
  /** The roll is over, or the player left it. */
  public onDone: (() => void) | null = null;

  constructor() {
    this.root = document.createElement('section');
    this.root.id = 'credits';
    this.root.className = 'screen';
    this.root.hidden = true;
    this.roll = document.createElement('div');
    this.roll.className = 'credits-roll';
    const block = (cls: string, text: string, lang?: string) => {
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = text;
      if (lang) el.lang = lang;
      return el;
    };
    this.roll.append(block('credits-native', 'युद्धवीर', 'hi'), block('credits-title', 'Yudhveer'));
    for (const [heading, names] of CREDITS) {
      const group = document.createElement('div');
      group.className = 'credits-group';
      group.append(block('credits-heading', heading), ...names.map((n) => block('credits-name', n)));
      this.roll.append(group);
    }
    this.roll.append(block('credits-close', 'Thank you for playing.'), block('credits-mark', 'हर हर महादेव', 'hi'));

    const nav = document.createElement('nav');
    nav.className = 'menu credits-menu';
    const leave = document.createElement('button');
    leave.dataset.action = 'leave';
    leave.textContent = 'Return to the title';
    leave.addEventListener('click', () => this.finish());
    nav.append(leave);
    this.root.append(this.roll, nav);
    document.body.append(this.root);
  }

  /** Starts the roll from the foot of the screen (the ScreenStack shows the section). */
  public start(): void {
    this.stop();
    this.running = true;
    this.roll.style.animation = 'none';
    void this.roll.offsetWidth; // restart the animation
    this.roll.style.animation = `credits-roll ${ROLL_SECONDS}s linear forwards`;
    // The roll's end, plus a breath on black.
    this.timer = window.setTimeout(() => this.finish(), (ROLL_SECONDS + 1.5) * 1000);
  }

  /** Over: the roll's end, or the player chose to leave. */
  public finish(): void {
    if (!this.running) return;
    this.stop();
    this.onDone?.();
  }

  /** Stops the roll without going anywhere (the game has already moved on). */
  public stop(): void {
    this.running = false;
    clearTimeout(this.timer);
  }
}
