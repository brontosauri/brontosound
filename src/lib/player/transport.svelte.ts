import type { PlaybackEngine } from './engine';

/**
 * The practice controls over whatever the player plays (docs/songPage.md):
 * play and pause, a start point that every play starts from, and a loop from the start point.
 * While playing, jumps wait for the beat, bar or section playing to end.
 */
export class Transport {
    playing = $state(false);
    position = $state(0);
    duration = $state(0);
    startPoint = $state<number | null>(null);
    loop = $state(false);
    loopEnd = $state<number | null>(null); // null: the end of the song

    private engine: PlaybackEngine | null = null;
    private frame = 0;
    private jump = $state.raw<{ at: number, to: number } | null>(null); // waiting for playback to reach `at`

    /** `boundary`: where a jump from `time` waits for, null for none */
    constructor(private boundary: (time: number) => number | null = () => null) {}

    /** Where a waiting jump goes, null for none */
    get waitingFor(): number | null {
        return this.jump?.to ?? null;
    }

    /** Where playback is headed: a waiting jump's target, else where it is */
    get target(): number {
        return this.waitingFor ?? this.position;
    }

    /** Play this engine from now on, from the top, with no start point */
    attach(engine: PlaybackEngine | null) {
        this.pause();
        this.engine = engine;
        this.duration = engine?.duration ?? 0;
        this.position = 0;
        this.startPoint = null;
        this.loopEnd = null;
        this.loop = false;
    }

    get loopRange(): [number, number] {
        return [this.startPoint ?? 0, this.loopEnd ?? this.duration];
    }

    togglePlay() {
        if (this.playing) this.pause();
        else this.play();
    }

    play() {
        if (!this.engine) return;
        const from = this.startPoint ?? (this.position >= this.duration ? 0 : this.position);
        this.engine.play(from);
        this.position = from;
        this.jump = null;
        this.playing = true;
        this.frame = requestAnimationFrame(this.follow);
    }

    pause() {
        this.engine?.pause();
        this.playing = false;
        this.jump = null;
        cancelAnimationFrame(this.frame);
    }

    seekTo(time: number) {
        this.position = this.clamp(time);
        this.jump = null;
        if (this.playing) this.engine?.seek(this.position);
    }

    /** Go to `time`: at once when paused, else once the beat, bar or section playing ends */
    jumpTo(time: number) {
        const at = this.playing && this.engine?.jumpAt ? this.boundary(this.position) : null;
        if (at === null) return this.seekTo(time);
        this.jump = { at, to: this.clamp(time) };
        this.engine!.jumpAt!(at, this.jump.to);
    }

    goToStart() {
        this.jumpTo(this.startPoint ?? 0);
    }

    /** Every play starts from `time`; the start point again clears it */
    setStartPoint(time: number) {
        if (time === this.startPoint) return this.clearStartPoint();
        this.startPoint = time;
        this.loopEnd = null;
        this.jumpTo(time);
    }

    /** Plays go on from where playback is, and a waiting jump is called off */
    private clearStartPoint() {
        this.startPoint = null;
        this.loopEnd = null;
        if (this.jump) this.engine!.jumpAt!(this.jump.at, this.jump.at); // on from the boundary: no jump
        this.jump = null;
    }

    /** Loop between two points: the first becomes the start point */
    setLoop(from: number, to: number) {
        this.startPoint = from;
        this.loopEnd = to;
        this.loop = true;
        this.jumpTo(from);
    }

    private clamp(time: number): number {
        return Math.min(Math.max(time, 0), this.duration);
    }

    /** Track the engine's position every frame, looping and stopping at the end */
    private follow = () => {
        if (!this.engine || !this.playing) return;
        const position = this.engine.position();
        if (this.jump && (position >= this.jump.at || position < this.position)) this.jump = null; // it happened
        this.position = position;
        const [loopStart, loopEnd] = this.loopRange;
        if (this.loop && !this.jump && this.position >= loopEnd) {
            this.seekTo(loopStart);
        } else if (this.position >= this.duration) {
            this.pause();
            this.position = this.startPoint ?? 0;
            return;
        }
        this.frame = requestAnimationFrame(this.follow);
    };
}
