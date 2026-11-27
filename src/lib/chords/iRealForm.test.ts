import { describe, expect, it } from 'vitest';
import { iRealPlayOrder } from './iRealForm';
import { parseIRealLinks, unscramble } from './iRealPro';

/** The written bars a chart plays, by their first chord */
function played(music: string): string[] {
    const [song] = parseIRealLinks('irealb://' + encodeURIComponent(`Form=Me==Swing=C=n=1r34LbKcu7${unscramble(music)}=Jazz=120=0`));
    return iRealPlayOrder(song.bars).map(i => song.bars[i].cells.find(cell => cell.chord)?.chord?.root ?? '-');
}

describe('iReal Pro form', () => {
    it('repeats twice, or as many times as written', () => {
        expect(played('{C7XyQ|F7XyQ}[G7XyQZ')).toEqual(['C', 'F', 'C', 'F', 'G']);
        expect(played('{C7XyQ|F7XyQ<3x>}')).toEqual(['C', 'F', 'C', 'F', 'C', 'F']);
    });

    it('skips the first ending the second time', () => {
        expect(played('{C7XyQ|N1F7XyQ}XyQ|N2G7XyQZ')).toEqual(['C', 'F', 'C', 'G']);
    });

    it('goes back for D.C. al Fine, at the next double or final bar line', () => {
        expect(played('[C7XyQ|F7XyQ<Fine>]G7XyQ|A7XyQ<D.C. al Fine>Z')).toEqual(['C', 'F', 'G', 'A', 'C', 'F']);
    });

    it('goes back to the segno for D.S. al Coda, then on to the coda', () => {
        expect(played('[C7XyQ|SF7XyQ|G7XyQQ]A7XyQ<D.S. al Coda>][QB7XyQZ')).toEqual(['C', 'F', 'G', 'A', 'F', 'G', 'B']);
    });

    it('takes the coda after the first sign when no jump leads there: the outro', () => {
        expect(played('[C7XyQ|F7XyQQ]G7XyQ|A7XyQZ[QB7XyQZ')).toEqual(['C', 'F', 'B']);
    });

    it('ends at the end sign, and leaves out bars with nothing to play', () => {
        expect(played('[C7XyQ|XyQ|F7XyQ|UG7XyQ|A7XyQZ')).toEqual(['C', 'F', 'G']);
    });
});
