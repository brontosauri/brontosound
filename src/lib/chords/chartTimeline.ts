import { isChord } from './chordSymbols';
import { sectionName, type ChartLine, type ChordChart } from './chordChart';
import { iRealPlayOrder } from './iRealForm';
import type { IRealSong } from './iRealPro';

/**
 * How a chart plays when it drives the player (docs/songPage.md): a count of bars at a tempo,
 * split into named sections, with the written bars each line (or iReal cell) covers.
 */
export interface ChartTimeline {
    tempo: number; // bpm
    beatsPerBar: number;
    bars: number; // played
    sections: TimelineSection[]; // in bars played
    barsOf: Map<object, BarRange>; // written bars, keyed by chart lines and iReal cells
    writtenBars?: number[]; // the written bar each played bar is, when repeats and jumps are followed
}

export interface TimelineSection {
    name: string;
    bars: BarRange;
}

export interface BarRange {
    first: number;
    count: number;
}

const DEFAULT_TEMPO = 120;

export const secondsPerBar = (timeline: ChartTimeline) => timeline.beatsPerBar * 60 / timeline.tempo;
export const isInRange = (bar: number, range: BarRange | undefined) => !!range && bar >= range.first && bar < range.first + range.count;
/** Whether the player's bar plays an item: a chart line or an iReal cell */
export const isPlaying = (timeline: ChartTimeline | null | undefined, bar: number | null, item: object) =>
    !!timeline && bar !== null && isInRange(timeline.writtenBars?.[bar] ?? bar, timeline.barsOf.get(item));

/** For OnSong and chords over lyrics: a lyrics line lasts one bar per chord, or one bar if it has none. The charts don't say more. */
export function chordChartTimeline(chart: ChordChart): ChartTimeline {
    const barsOf = new Map<object, BarRange>();
    let nextBar = 0;
    const take = (key: object, count: number) => {
        barsOf.set(key, { first: nextBar, count });
        nextBar += count;
    };

    const sections = chart.sections.map(section => {
        const first = nextBar;
        for (const line of section.lines) {
            if (lineBars(line) > 0) take(line, lineBars(line));
        }
        return { name: sectionName(section), bars: { first, count: nextBar - first } };
    });

    return {
        tempo: chart.meta.tempo ?? DEFAULT_TEMPO,
        beatsPerBar: beatsPerBar(chart.meta.time),
        bars: nextBar,
        sections: sections.filter(section => section.bars.count > 0),
        barsOf,
    };
}

function lineBars(line: ChartLine): number {
    if (line.kind != 'lyrics') return 0;
    return Math.max(1, line.segments.filter(segment => segment.chord && isChord(segment.chord)).length);
}

function beatsPerBar(time: string | undefined): number {
    return parseInt(time ?? '') || 4;
}

/** An iReal Pro chart plays as iReal Pro's player plays one pass of it: repeats, endings, D.C., D.S. and codas followed */
export function iRealTimeline(song: IRealSong): ChartTimeline {
    const barsOf = new Map<object, BarRange>();
    song.bars.forEach((bar, i) => bar.cells.forEach(cell => barsOf.set(cell, { first: i, count: 1 })));

    let name = '';
    const sectionOf = song.bars.map(bar => name = bar.cells.find(cell => cell.section)?.section ?? name);
    const isWritten = (written: number) => song.bars[written].cells.some(cell => cell.section);
    const writtenBars = iRealPlayOrder(song.bars);
    const sections: TimelineSection[] = [];
    let sectionStart = 0; // the written bar the current section started at
    writtenBars.forEach((written, played) => {
        // A section starts where one is written, or where the player goes to another one.
        // Playing it again, as a repeat does, keeps it one section.
        const goesBack = written <= writtenBars[played - 1];
        const starts = played == 0 || (goesBack
            ? written < sectionStart
            : isWritten(written) || sectionOf[written] != sections.at(-1)!.name);
        if (starts) {
            sections.push({ name: sectionOf[written], bars: { first: played, count: 0 } });
            sectionStart = written;
        }
        sections.at(-1)!.bars.count++;
    });

    const time = song.cells.find(cell => cell.timeSignature)?.timeSignature;
    return { tempo: song.bpm ?? DEFAULT_TEMPO, beatsPerBar: beatsPerBar(time), bars: writtenBars.length, sections, barsOf, writtenBars };
}
