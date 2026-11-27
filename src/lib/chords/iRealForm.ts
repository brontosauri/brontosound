import type { IRealBar } from './iRealPro';

/** "D.S. al Coda": back to the top (D.C.) or the segno (D.S.), and on to where */
interface Jump {
    from: 'top' | 'segno';
    to: 'coda' | 'fine' | '1st' | '2nd' | '3rd';
}

/**
 * The order iReal Pro's player plays a chart's bars in, as indexes into its bars, for one pass of the form:
 * - a repeat plays twice, or as many times as a text before its end says ("3x"); with a first ending,
 *   the second time skips it;
 * - a D.C. or D.S. text jumps at the next double, repeat or final bar line, to the top or the segno:
 *   al Coda plays to the bar with the first coda sign and goes on after the jump, al Fine (or al 1st) to
 *   the "Fine" text or the jump, al 2nd to the first ending and then from the second;
 * - with two coda signs and no jump, the second starts an outro: the form goes there after the first;
 * - the end sign (U) is the last bar.
 * Bars with nothing to play are left out, as iReal Pro does. Positions count the bars played so far.
 */
export function iRealPlayOrder(bars: IRealBar[]): number[] {
    const played: number[] = [];
    const at = { repeat: 0, firstEnding: 0, secondEnding: 0, segno: 0, coda: 0, outro: 0, fine: 0, end: 0 }; // 0: none, or the top
    let times = 2;
    let codas = 0;
    let jump: Jump | 'done' | 'done to coda' | undefined;

    /** Play again what was played from..to, and the end sign moves with its bar */
    const replay = (from: number, to: number) => {
        if (at.end && at.end >= from && at.end < to) at.end += played.length - from;
        played.push(...played.slice(from, to));
    };

    const repeatBack = () => {
        if (at.firstEnding > at.repeat) {
            replay(at.repeat, at.firstEnding); // the second time skips the first ending
        } else {
            const end = played.length;
            for (let time = 1; time < times; time++) replay(at.repeat, end);
            times = 2;
        }
    };

    const takeJump = () => {
        if (typeof jump != 'object') return;
        const start = jump.from == 'top' ? 0 : at.segno;
        if (jump.to == 'coda') {
            replay(start, at.coda);
            jump = 'done to coda';
            return;
        }
        if (jump.to == '2nd') {
            if (at.fine < at.secondEnding) at.fine = played.length;
            replay(start, at.firstEnding);
            replay(at.secondEnding, at.fine);
        } else if (jump.to == '3rd') {
            replay(start, at.firstEnding);
        } else {
            replay(start, at.fine || played.length);
        }
        jump = 'done';
    };

    bars.forEach((bar, index) => {
        const here = played.length;
        let toPlay = isPlayable(bars, index);
        const play = () => {
            if (toPlay) played.push(index);
            toPlay = false;
        };

        for (const sign of bar.signs) {
            if (sign == '{') at.repeat = here;
            else if (sign == 'N1') at.firstEnding = here;
            else if (sign == 'N2') at.secondEnding = here;
            else if (sign == 'S') at.segno = here;
            else if (sign == 'U') at.end = here;
            else if (sign == 'Q') {
                codas++;
                if (!at.coda) at.coda = here + 1; // after this bar
                else if (jump != 'done to coda') at.outro = here;
            } else if (sign[0] == '<') {
                const text = sign.slice(1, -1);
                const instruction = readJump(text);
                if (instruction) jump = instruction;
                else if (/fine/i.test(text)) at.fine = here + 1;
                else times = readTimes(text) ?? times;
            } else if (sign == '}' || sign == ']' || sign == 'Z') {
                play();
                if (sign == '}') repeatBack();
                takeJump();
            }
        }
        play();
    });

    if (codas == 1 && at.coda) at.outro = at.coda = at.coda - 1; // a lone coda sign starts an outro
    let last = at.coda && at.outro ? at.coda : played.length;
    if (at.end && (at.outro > at.end || !at.outro)) last = at.end + 1;
    const order = played.slice(0, last);
    if (at.outro && (!at.end || at.end >= at.outro)) order.push(...played.slice(at.outro, at.end ? at.end + 1 : undefined));
    return order;
}

/** iReal Pro plays bars with a chord or a sign for one (/, %, N.C.), and the empty bar a two-bar repeat sign spans */
function isPlayable(bars: IRealBar[], i: number): boolean {
    const hasMusic = (bar: IRealBar) => bar.cells.some(cell => cell.chord?.root || cell.symbol);
    return hasMusic(bars[i]) || !!bars[i - 1]?.cells.some(cell => cell.symbol == 'repeatTwoBars');
}

const JUMP = /(D\.C\.|D\.S\.) al (Coda|Fine|1st|2nd|3rd)/i;

function readJump(text: string): Jump | undefined {
    const match = JUMP.exec(text);
    if (!match) return undefined;
    return { from: match[1].toUpperCase() == 'D.C.' ? 'top' : 'segno', to: match[2].toLowerCase() as Jump['to'] };
}

/** "repeat 3x": how many times the next repeat plays */
function readTimes(text: string): number | undefined {
    const count = (word: string) => parseInt(word.replace(/x/gi, ''));
    const word = text.replace(/^\*\d\d/, '').split(/[\s,]+|\/\//).find(word => word.length > 1 && /x/i.test(word) && !isNaN(count(word)));
    return word ? Math.min(count(word), 100) : undefined;
}
