/**
 * Attachments that keep SVG text inside the room it has, once web fonts are in
 * (widths measured before they load would be the fallback font's).
 */

/** Squeeze the text to at most `width` */
export function squeezeTo(width: number) {
    return (text: SVGTextElement) => afterFonts(() => {
        text.removeAttribute('textLength');
        if (text.getComputedTextLength() <= width) return;
        text.setAttribute('textLength', String(width));
        text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    });
}

/** Move the text left until it ends before `right`, but not past `left` */
export function keepBefore(right: number, left: number) {
    return (text: SVGTextElement) => afterFonts(() => {
        text.removeAttribute('transform');
        const box = text.getBBox();
        const shift = Math.min(Math.max(0, box.x + box.width - right), Math.max(0, box.x - left));
        if (shift) text.setAttribute('transform', `translate(${-shift} 0)`);
    });
}

function afterFonts(fit: () => void) {
    let done = false;
    document.fonts.ready.then(() => !done && fit());
    return () => { done = true; };
}
