import { chapterTitle, type Chapter } from '../game/Chapters';

const $ = (id: string) => document.getElementById(id)!;

/** The cutscene overlay: letterbox bars, the fade, the chapter and name cards and the skip prompt (subtitles: Dialogue). */
export class Cinema {
  private readonly root = $('cinema');
  private readonly fadeEl = $('fade');
  private readonly chapterCardEl = $('chapter-card');
  private readonly nameCardEl = $('name-card');
  private readonly captionEl = $('scene-caption');
  private readonly skipEl = $('skip');
  private readonly skipFill = $('skip-fill');
  private timers: number[] = [];
  private fadeValue = -1;
  private active = false;
  private hideTimer = 0;

  /** `letterbox` false: a scene played full frame (the skip prompt and cards still show). */
  public setActive(on: boolean, letterbox = true): void {
    this.active = on;
    clearTimeout(this.hideTimer);
    if (on) this.root.classList.toggle('bare', !letterbox);
    if (on) {
      this.root.hidden = false;
      // Lay out the bars at zero height first, so they slide in.
      void this.root.offsetWidth;
      this.root.classList.add('on');
    } else {
      this.root.classList.remove('on');
      this.clearCards();
      this.skip(0, false);
      // Hidden once the bars have slid away.
      this.hideTimer = window.setTimeout(() => { if (!this.active) this.root.hidden = true; }, 750);
    }
  }

  /** How black the screen is now (0 clear .. 1 black). */
  public get fade(): number {
    return Math.max(0, this.fadeValue);
  }

  /** 0 clear .. 1 black. */
  public setFade(alpha: number): void {
    if (Math.abs(alpha - this.fadeValue) < 0.002) return;
    this.fadeValue = alpha;
    this.fadeEl.style.opacity = alpha.toFixed(3);
  }

  public chapterCard(chapter: Chapter, holdSeconds = 5): void {
    $('card-kicker').textContent = chapterTitle(chapter);
    $('card-title').textContent = chapter.name;
    $('card-native').textContent = chapter.native;
    $('card-line').textContent = chapter.line;
    this.flash(this.chapterCardEl, holdSeconds);
  }

  /**
   * The big lower-left name card (bosses), or a smaller one (`small`) for ordinary enemies. `native`: the name in
   * Devanagari, set small over the title (as the chapter card's).
   */
  public nameCard(name: string, epithet: string, holdSeconds: number, small = false, native = ''): void {
    $('name-title').textContent = name;
    $('name-epithet').textContent = epithet;
    const nativeEl = $('name-native');
    nativeEl.textContent = native;
    nativeEl.hidden = !native;
    this.nameCardEl.classList.toggle('small', small);
    this.nameCardEl.classList.remove('show');
    // Restart the transition when names follow each other.
    void this.nameCardEl.offsetWidth;
    this.flash(this.nameCardEl, holdSeconds);
  }

  /**
   * A quiet line over the picture, centred low, held for `holdSeconds`: words a scene says without a speaker (the
   * prologue's cleared line over the village at night, where no chapter-complete screen follows).
   */
  public caption(text: string, holdSeconds: number): void {
    this.captionEl.textContent = text;
    this.captionEl.classList.remove('show');
    void this.captionEl.offsetWidth;
    this.flash(this.captionEl, holdSeconds);
  }

  public clearCards(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    this.chapterCardEl.classList.remove('show');
    this.nameCardEl.classList.remove('show');
    this.captionEl.classList.remove('show');
  }

  /** The "hold to skip" prompt and how far the hold has got (0..1). */
  public skip(progress: number, visible: boolean): void {
    this.skipEl.classList.toggle('show', visible);
    this.skipFill.style.transform = `scaleX(${progress.toFixed(3)})`;
  }

  private flash(el: HTMLElement, holdSeconds: number): void {
    el.classList.add('show');
    this.later(() => el.classList.remove('show'), holdSeconds * 1000);
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(window.setTimeout(fn, ms));
  }
}
