import type { IRealCell } from './iRealPro';

/**
 * Where things go on an iReal Pro chart, in its own units: a page 480 wide, scaled to fit,
 * rows of 16 cells, each cell's origin at the top of its bar line. Measured on iReal Pro's charts.
 */
export const IREAL = {
    width: 480,
    left: 14, // the first bar line
    firstRow: 60, // below the title
    cellWidth: 28.7,
    rowHeight: 74,
    spacer: 30, // a vertical spacer, "Y"
    barHeight: 50,
    textLineHeight: 21,
};

/** iReal Pro's text is Arial: chart authors line rhythms up with spaces, so text needs Arial's widths (Arimo's) */
export const TEXT_FONT = "Arimo, Arial, 'Noto Sans Sundanese', 'Noto Music', sans-serif";
export const CHORD_FONT = "'Roboto Condensed', 'Noto Music', sans-serif";

export const cellX = (column: number) => IREAL.left + column * IREAL.cellWidth;

/** Each row's top: rows are a row height apart, plus a spacer for each "Y" before them */
export function rowTops(rows: IRealCell[][]): number[] {
    let top = IREAL.firstRow - IREAL.rowHeight;
    return rows.map(row => (top += IREAL.rowHeight + row[0].spaceAbove * IREAL.spacer));
}

/** The chart's height: below the last bar, or below the lowest text when it hangs further */
export function chartHeight(rows: IRealCell[][], tops: number[]): number {
    const textBottoms = rows.flatMap((row, i) => row.map(cell => cell.comment
        ? tops[i] + IREAL.rowHeight + (cell.comment.lines.length - 1) * IREAL.textLineHeight
        : 0));
    return Math.max((tops.at(-1) ?? 0) + IREAL.barHeight + 20, ...textBottoms);
}
