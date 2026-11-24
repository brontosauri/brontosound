import { secondsPerBar, type ChartTimeline } from '$lib/chords/chartTimeline';

/** Where a song's beats, bars and sections start, in seconds at its own tempo */
export interface SnapGrid {
    duration: number;
    beats: number[];
    bars: number[];
    sections: { name: string, bar: number }[]; // charts: the bar each one starts on
}

/** What the start point and loops snap to (docs/songPage.md) */
export type SnapUnit = 'none' | 'beat' | 'bar' | 'section';

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const range = (count: number) => Array.from({ length: count }, (_, i) => i);
const EPSILON = 1e-6;
const ARROW_SECONDS = 5;

export function chartGrid(timeline: ChartTimeline): SnapGrid {
    const bar = secondsPerBar(timeline);
    const beat = bar / timeline.beatsPerBar;
    return {
        duration: timeline.bars * bar,
        beats: range(timeline.bars * timeline.beatsPerBar).map(i => i * beat),
        bars: range(timeline.bars).map(i => i * bar),
        sections: timeline.sections.map(section => ({ name: section.name, bar: section.bars.first })),
    };
}

/** The units a grid offers: none without one (audio files), sections only on charts */
export function snapUnits(grid: SnapGrid | null): SnapUnit[] {
    if (!grid) return [];
    return grid.sections.length ? ['none', 'beat', 'bar', 'section'] : ['none', 'beat', 'bar'];
}

export function defaultSnapUnit(grid: SnapGrid | null): SnapUnit {
    if (!grid) return 'none';
    return grid.sections.length > 1 ? 'section' : 'bar';
}

/** Times on the timeline, snapped to a unit of the grid */
export class Snap {
    constructor(private grid: SnapGrid | null, private unit: SnapUnit) {}

    /** Where a click at `time` sets the start point: the start of its unit */
    start(time: number): number {
        const starts = this.starts();
        return starts ? starts[lastAtOrBefore(starts, time)] : Math.round(time * 10) / 10;
    }

    /** Where a loop dragged to `time` ends: the end of its unit */
    end(time: number): number {
        const starts = this.starts();
        return starts ? starts[lastAtOrBefore(starts, time) + 1] ?? this.grid!.duration : Math.round(time * 10) / 10;
    }

    /** Where a jump while playing waits for: the end of the unit playing, none without units */
    boundary(time: number): number | null {
        return this.starts() ? this.end(time) : null;
    }

    /** Where an arrow key goes: one unit back or on, else 5 s */
    step(time: number, by: 1 | -1): number {
        const starts = this.starts();
        if (!starts) return time + by * ARROW_SECONDS;
        return starts[Math.max(0, lastAtOrBefore(starts, time) + by)] ?? this.grid!.duration;
    }

    /** The beat playing at `time`, counting from 0; 0 without beats */
    beat(time: number): number {
        return this.grid ? lastAtOrBefore(this.grid.beats, time) : 0;
    }

    label(time: number): string {
        const grid = this.grid;
        if (!grid || this.unit == 'none') return formatTime(time);
        const bar = lastAtOrBefore(grid.bars, time);
        if (this.unit == 'bar') return `Bar ${bar + 1}`;
        if (this.unit == 'beat') return `Bar ${bar + 1} · beat ${lastAtOrBefore(grid.beats, time) - lastAtOrBefore(grid.beats, grid.bars[bar]) + 1}`;
        const section = grid.sections[lastAtOrBefore(this.sectionStarts(grid), time)];
        return section.name ? `${section.name} · bar ${section.bar + 1}` : `Bar ${section.bar + 1}`;
    }

    private starts(): number[] | null {
        const grid = this.grid;
        if (!grid?.bars.length || this.unit == 'none') return null;
        if (this.unit == 'beat') return grid.beats;
        if (this.unit == 'bar') return grid.bars;
        return this.sectionStarts(grid);
    }

    private sectionStarts(grid: SnapGrid): number[] {
        return grid.sections.map(section => grid.bars[section.bar]);
    }
}

/** The index of the last of the sorted `times` at or before `time`, or 0 */
function lastAtOrBefore(times: number[], time: number): number {
    let low = 0, high = times.length - 1;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (times[middle] <= time + EPSILON) low = middle;
        else high = middle - 1;
    }
    return low;
}
