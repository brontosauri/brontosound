/** Song time `from` plays at context time `startedAt` */
export interface Segment {
    from: number;
    startedAt: number;
}

/** Where playback continues once it reaches song time `at` */
export interface Jump extends Segment {
    at: number;
}

/**
 * Maps song time to AudioContext time while playing at a rate,
 * so engines know where playback is and when to schedule sounds.
 */
export class MediaClock {
    private segment: Segment = { from: 0, startedAt: 0 }; // what plays now; startedAt maybe in the future (count-in)
    private jump: Jump | null = null; // what plays next, from a set context time
    private rate = 1;
    private isRunning = false;

    constructor(private context: AudioContext) {}

    /** Play from song time `from` at `rate`, `delay` seconds from now: forgets any jump */
    start(from: number, rate: number, delay = 0) {
        this.segment = { from, startedAt: this.context.currentTime + delay };
        this.jump = null;
        this.rate = rate;
        this.isRunning = true;
    }

    /** Continue from `to` once playback reaches `at`, to the sample */
    jumpAt(at: number, to: number) {
        if (!this.isRunning) return;
        this.settle();
        this.jump = { at, from: to, startedAt: this.contextTimeOf(at, this.segment) };
    }

    /** The jump playback hasn't reached yet */
    get pendingJump(): Jump | null {
        this.settle();
        return this.jump;
    }

    /** Playing, or counting in */
    get running() {
        return this.isRunning;
    }

    /** Stay where playback is */
    stop() {
        this.segment = { from: this.position(), startedAt: 0 };
        this.jump = null;
        this.isRunning = false;
    }

    /** Play faster or slower from here on, keeping a jump at the same song time */
    setRate(rate: number) {
        if (this.isRunning) {
            this.settle();
            this.segment = { from: this.position(), startedAt: Math.max(this.segment.startedAt, this.context.currentTime) };
        }
        this.rate = rate;
        if (this.jump) this.jump.startedAt = this.contextTimeOf(this.jump.at, this.segment);
    }

    /** The song time playing now */
    position(): number {
        return this.positionAt(this.context.currentTime);
    }

    /** The song time playing at `contextTime`: past the jump once it's reached */
    positionAt(contextTime: number): number {
        if (!this.isRunning) return this.segment.from;
        const segment = this.segmentAt(contextTime);
        return segment.from + Math.max(0, contextTime - segment.startedAt) * this.rate;
    }

    /** What plays at `contextTime`: before or after the jump */
    segmentAt(contextTime: number): Segment {
        return this.jump && contextTime >= this.jump.startedAt ? this.jump : this.segment;
    }

    /** When `songTime` plays, in `segment` */
    contextTimeOf(songTime: number, segment: Segment): number {
        return segment.startedAt + (songTime - segment.from) / this.rate;
    }

    /** Once the jump is reached, it's what plays now */
    private settle() {
        if (this.jump && this.context.currentTime >= this.jump.startedAt) {
            this.segment = this.jump;
            this.jump = null;
        }
    }
}

const LOOKAHEAD = 0.12; // seconds of sound scheduled ahead of playback
const INTERVAL = 25; // ms between scheduling rounds

/** Schedules the sounds starting in [from, to) of song time, at `contextTimeOf` them */
export type Schedule = (from: number, to: number, contextTimeOf: (songTime: number) => number) => void;

/** While playing, hands out consecutive windows of song time a little ahead of playback, to schedule sounds on time */
export class LookaheadScheduler {
    private timer: ReturnType<typeof setInterval> | undefined;
    private scheduledUntil = 0;
    private crossed: Jump | null = null; // the pending jump, once scheduled past

    constructor(private context: AudioContext, private clock: MediaClock, private schedule: Schedule) {}

    /** Schedule from song time `from` on, until stopped */
    start(from: number) {
        this.stop();
        this.scheduledUntil = from;
        this.crossed = null;
        this.tick();
        this.timer = setInterval(() => this.tick(), INTERVAL);
    }

    /** Stay where playback is */
    /** Schedule nothing more: what's scheduled still plays */
    stop() {
        clearInterval(this.timer);
    }

    /** Schedule up to LOOKAHEAD ahead; across a jump, up to it, then on from its target */
    private tick() {
        const horizon = this.context.currentTime + LOOKAHEAD;
        const jump = this.clock.pendingJump;
        if (!jump) this.crossed = null;
        else if (jump != this.crossed && jump.startedAt <= horizon) {
            if (!this.crossed) this.scheduleUntil(jump.at, this.context.currentTime); // a replaced jump scheduled this already
            this.scheduledUntil = jump.from;
            this.crossed = jump;
        }
        this.scheduleUntil(this.clock.positionAt(horizon), horizon);
    }

    /** Schedule up to song time `until`, timed as what plays at `contextTime` */
    private scheduleUntil(until: number, contextTime: number) {
        if (until <= this.scheduledUntil) return;
        const segment = this.clock.segmentAt(contextTime);
        this.schedule(this.scheduledUntil, until, songTime => this.clock.contextTimeOf(songTime, segment));
        this.scheduledUntil = until;
    }
}
