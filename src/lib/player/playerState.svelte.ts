import { secondsPerBar } from '$lib/chords/chartTimeline';
import type { TimelineView } from '$lib/components/player/Timeline.svelte';
import { loadEngine, type LoadedEngine, type PlayerSource } from './loadEngine';
import { chartGrid, defaultSnapUnit, Snap, snapUnits, type SnapGrid, type SnapUnit } from './snap';
import { Transport } from './transport.svelte';

/**
 * What the player plays and how (docs/songPage.md): the source's engine once loaded, the transport,
 * and the practice settings, back to the file's own for every file. Create it while a component initialises.
 */
export class PlayerState {
    readonly transport = new Transport(time => this.snap.boundary(time));
    loaded = $state.raw<LoadedEngine | null>(null);
    loadError = $state<string | null>(null);

    speed = $state(100); // %, audio files
    tempo = $state(120); // bpm, MIDI files and charts
    semitones = $state(0); // transpose, audio and MIDI files
    cents = $state(0); // fine pitch, on top of `semitones`
    tracksOn = $state<boolean[]>([]); // MIDI files
    click = $state(true); // charts
    countIn = $state(true);
    snapUnit = $state<SnapUnit>('none');

    isChart = $derived(this.loaded?.kind == 'chart');
    usesTempo = $derived(this.loaded?.kind == 'midi' || this.loaded?.kind == 'chart');
    barSeconds = $derived(this.loaded?.kind == 'chart' ? secondsPerBar(this.loaded.timeline) : 0);
    grid = $derived(this.loaded && snapGrid(this.loaded));
    snapUnits = $derived(snapUnits(this.grid));
    /** Where clicks, drags and arrows land on the timeline, and how those times read */
    snap = $derived(new Snap(this.grid, this.snapUnit));
    /** A practice setting is off the source's own */
    changed = $derived(!!this.loaded && (this.speed != 100 || this.semitones != 0 || this.cents != 0 || this.tempo != baseTempo(this.loaded)
        || this.tracksOn.includes(false) || (this.isChart && !(this.click && this.countIn)) || this.snapUnit != defaultSnapUnit(this.grid)));

    view = $derived.by((): TimelineView | null => {
        const loaded = this.loaded;
        if (loaded?.kind == 'audio') return { kind: 'waveform', peaks: loaded.peaks };
        if (loaded?.kind == 'midi') return { kind: 'tracks', lanes: loaded.lanes.map((blocks, i) => ({ blocks, enabled: this.tracksOn[i] })) };
        if (loaded?.kind == 'chart') return { kind: 'sections', timeline: loaded.timeline };
        return null;
    });

    /** `autoplay`: play each source as soon as it loads */
    constructor(songId: number, source: () => PlayerSource | null, autoplay: () => boolean) {
        $effect(() => {
            const current = source();
            if (!current) return;
            let cancelled = false;
            this.loaded = null;
            this.loadError = null;
            loadEngine(songId, current).then(engine => {
                if (cancelled) return engine.engine.dispose();
                this.resetSettings(engine);
                this.transport.attach(engine.engine);
                this.loaded = engine;
                if (autoplay()) this.transport.play();
            }, e => this.loadError = (e as Error).message);
            return () => {
                cancelled = true;
                this.transport.attach(null);
                this.loaded?.engine.dispose();
            };
        });

        $effect(() => {
            const loaded = this.loaded;
            if (!loaded) return;
            loaded.engine.setSpeed(this.usesTempo ? this.tempo / baseTempo(loaded) : this.speed / 100);
        });
        $effect(() => this.loaded?.engine.setTranspose(this.semitones + this.cents / 100));
        $effect(() => {
            const metronome = this.loaded?.kind == 'chart' ? this.loaded.engine : null;
            if (!metronome) return;
            metronome.click = this.click;
            metronome.countIn = this.countIn;
        });
        $effect(() => {
            const midi = this.loaded?.kind == 'midi' ? this.loaded.engine : null;
            this.tracksOn.forEach((on, i) => midi?.setTrackEnabled(i, on));
        });
    }

    barOf(seconds: number): number {
        return Math.floor(seconds / this.barSeconds) + 1;
    }

    private resetSettings(engine: LoadedEngine) {
        this.speed = 100;
        this.semitones = 0;
        this.cents = 0;
        this.tempo = baseTempo(engine);
        this.tracksOn = engine.kind == 'midi' ? engine.engine.tracks.map(() => true) : [];
        this.snapUnit = defaultSnapUnit(snapGrid(engine));
    }
}

const baseTempo = (engine: LoadedEngine) => engine.kind == 'midi' ? engine.engine.tempo : engine.kind == 'chart' ? engine.timeline.tempo : 120;

/** Audio files have no beats to snap to */
const snapGrid = (engine: LoadedEngine): SnapGrid | null => engine.kind == 'chart' ? chartGrid(engine.timeline) : engine.kind == 'midi' ? engine.engine.grid : null;
