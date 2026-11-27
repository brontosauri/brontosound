import { describe, expect, it } from 'vitest';
import { iRealRows, parseIRealLinks, unscramble } from './iRealPro';
import { iRealTimeline } from './chartTimeline';
import { chartHeight, rowTops } from './iRealLayout';

// A made-up blues, two sections, in iReal Pro's music notation
const MUSIC = '{*AT44<*74♩ XyQ♪//x2>C7XyQ|F7XyQ|C7XyQ|C7XyQ}[*BF7XyQ|F7XyQ|C^7XyQ|A-7XyQ|D-7 G7LZC6(A7)XyQZ';
const link = (music: string, title = 'Test Blues', composer = 'Ellington Duke') =>
    'irealb://' + encodeURIComponent(`${title}=${composer}==Medium Swing=C=n=1r34LbKcu7${unscramble(music)}=Jazz=140=3`);

describe('iReal Pro', () => {
    const [song] = parseIRealLinks(`<a href="${link(MUSIC)}">Test Blues</a>`);

    it('reads song details, shown as iReal Pro shows them', () => {
        expect([song.title, song.composer, song.style, song.key, song.bpm]).toEqual(['Test Blues', 'Duke Ellington', 'Medium Swing', 'C', 140]);
        const [the] = parseIRealLinks(link('C7XyQZ', 'Blues, The', 'Composer Unknown'));
        expect([the.title, the.composer]).toEqual(['The Blues', '']);
    });

    it('reads text: raised, on lines, spaces kept', () => {
        expect(song.cells[0].comment).toEqual({ lines: ['♩    ♪', 'x2'], raise: 74 });
    });

    it('puts a one-bar repeat in the bar\'s second cell', () => {
        const [repeat] = parseIRealLinks(link('[C7XyQKcl  Z'));
        expect(repeat.cells.map(cell => cell.chord?.root ?? cell.symbol ?? cell.barStart ?? '')).toEqual(['C', '', '', '', '|', 'repeatBar', '', '']);
    });

    it('reads cells: chords, sections, time, bar lines and alternate chords', () => {
        const [first] = song.cells;
        expect(first).toMatchObject({ section: 'A', timeSignature: '4/4', barStart: '{', chord: { root: 'C', quality: '7' } });
        expect(song.cells[15].barEnd).toBe('}');
        expect(song.cells[16]).toMatchObject({ section: 'B', barStart: '[' });
        const last = song.cells.find(cell => cell.chord?.alternate);
        expect(last?.chord).toEqual({ root: 'C', quality: '6', bass: undefined, alternate: { root: 'A', quality: '7', bass: undefined, alternate: undefined } });
        expect(song.cells.at(-1)?.barEnd).toBe('Z');
    });

    it('lays cells out 16 to a row, 4 to a bar, and plays the repeat twice', () => {
        expect(iRealRows(song.cells).map(row => row.length)).toEqual([16, 16, 8]);
        expect(song.bars.map(bar => bar.cells.length)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
        const timeline = iRealTimeline(song);
        expect(timeline.bars).toBe(14);
        expect(timeline.sections.map(section => [section.name, section.bars.first, section.bars.count])).toEqual([['A', 0, 8], ['B', 8, 6]]);
        expect(timeline.writtenBars?.slice(0, 9)).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 4]);
    });

    it('starts a section where one is written, or where the player goes to another one', () => {
        const sectionsOf = (music: string) => iRealTimeline(parseIRealLinks(link(music))[0]).sections.map(section => `${section.name}${section.bars.count}`);
        expect(sectionsOf('[*AC7XyQ][*AF7XyQ]')).toEqual(['A1', 'A1']);
        expect(sectionsOf('[*AC7XyQ|SF7XyQ]{*BG7XyQ}A7XyQ<D.S. al Fine>Z')).toEqual(['A2', 'B3', 'A1', 'B3']);
    });

    it('places rows a row apart, plus a spacer for each "Y"', () => {
        const rows = iRealRows(song.cells);
        expect(rowTops(rows)).toEqual([60, 134, 208]);
        expect(chartHeight(rows, rowTops(rows))).toBe(278);
        const [spaced] = parseIRealLinks(link('YC7XyQZ'));
        expect(rowTops(iRealRows(spaced.cells))).toEqual([90]);
    });
});
