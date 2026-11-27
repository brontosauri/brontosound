<script lang="ts">
    import type { IRealCell } from '$lib/chords/iRealPro';
    import { CHORD_FONT, IREAL, TEXT_FONT } from '$lib/chords/iRealLayout';
    import IRealBarLine from './IRealBarLine.svelte';
    import IRealChordSymbol from './IRealChordSymbol.svelte';
    import { squeezeTo } from './svgFit';

    /** One cell of an iReal Pro chart, drawn in the chart's units where iReal Pro draws it; its text is drawn by the chart */
    let { cell, x, y, barEnd, transpose }: {
        cell: IRealCell,
        x: number,
        y: number, // the top of the bar line
        barEnd?: IRealCell['barEnd'],
        transpose: (note: string) => string,
    } = $props();

    const SMALL = 'translate(3 0) scale(0.6875 1) translate(-3 0)'; // as tall, narrower
    const ALTERNATE = 'translate(4.2 -24) scale(0.6)'; // above the bar
    const SECTION_LABELS: Record<string, string> = { In: 'in', Verse: 'V' };
    // Signs from Noto Music, sized to the boxes iReal Pro draws them in
    const MARKS = {
        segno: { sign: '\u{1D10B}', x: 15.6, y: 7.9, size: 33.8 },
        coda: { sign: '\u{1D10C}', x: 15.5, y: 14.5, size: 46 },
        fermata: { sign: '\u{1D110}', x: 16, y: 27, size: 39 },
    };
    const REPEATS = {
        repeatBar: { sign: '\u{1D10E}', y: 51, size: 50 },
        repeatTwoBars: { sign: '\u{1D10F}', y: 49, size: 42 },
    };
</script>

<g transform="translate({x} {y})" fill="currentColor">
    {#if cell.barStart}<IRealBarLine kind={cell.barStart} />{/if}
    {#if barEnd}<IRealBarLine kind={barEnd} x={IREAL.cellWidth} />{/if}

    {#if cell.section}
        <rect x="-11" y="-19" width="16" height="15" rx="1.5" />
        <text x="-3" y="-7.6" font-family={TEXT_FONT} font-size="12.5" font-weight="700" text-anchor="middle" fill="white">{SECTION_LABELS[cell.section] ?? cell.section}</text>
    {/if}
    {#if cell.timeSignature}
        <g font-family={CHORD_FONT} font-size="24" font-weight="700" text-anchor="middle">
            {#each cell.timeSignature.split('/') as part, i}<text x="-7.5" y={21 + i * 24} {@attach squeezeTo(11)}>{part}</text>{/each}
        </g>
    {/if}
    {#if cell.ending}
        <path d="M3.5 -3V-18H78" fill="none" stroke="currentColor" stroke-width="1.2" />
        <text x="7" y="-6.5" font-family={TEXT_FONT} font-size="12">{cell.ending}.</text>
    {/if}
    {#each cell.marks as mark}
        {@const { sign, x, y, size } = MARKS[mark]}
        <text {x} {y} font-family="'Noto Music'" font-size={size} text-anchor="middle">{sign}</text>
    {/each}

    {#if cell.chord}
        {#if cell.chord.alternate}<g transform={ALTERNATE}><IRealChordSymbol chord={cell.chord.alternate} {transpose} /></g>{/if}
        <g transform={cell.small ? SMALL : undefined}><IRealChordSymbol chord={cell.chord} {transpose} /></g>
    {:else if cell.symbol == 'slash'}
        <polygon points="11.9,39.9 15.1,39.9 27.1,13 23.9,13" />
    {:else if cell.symbol == 'noChord'}
        <text x={cell.small ? 2.5 : 10.8} y="36.3" font-family={CHORD_FONT} font-size="27.7" font-weight="700" {@attach squeezeTo(cell.small ? 25 : 33)}>N.C.</text>
    {:else if cell.symbol}
        {@const { sign, y, size } = REPEATS[cell.symbol]}
        <text x={cell.small && cell.symbol == 'repeatBar' ? 15.5 : 30} {y} font-family="'Noto Music'" font-size={size} text-anchor="middle">{sign}</text>
    {/if}
</g>
