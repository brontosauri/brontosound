import { describe, expect, it } from 'vitest';
import { chordChartTimeline } from './chartTimeline';
import { parseOnSong } from './onSong';

describe('chord chart timeline', () => {
    it('gives a lyrics line one bar per chord, or one without chords', () => {
        const chart = parseOnSong('Song\nTempo: 90\nTime: 3/4\n\nVerse:\n[G]Glory, [C]glory\nhallelujah\n\nChorus:\n[D]Amen');
        const timeline = chordChartTimeline(chart);
        expect([timeline.tempo, timeline.beatsPerBar, timeline.bars]).toEqual([90, 3, 4]);
        expect(timeline.sections).toEqual([
            { name: 'Verse', bars: { first: 0, count: 3 } },
            { name: 'Chorus', bars: { first: 3, count: 1 } },
        ]);
        expect(timeline.barsOf.get(chart.sections[0].lines[1])).toEqual({ first: 2, count: 1 });
    });
});
