<script lang="ts">
    // Free fonts standing in for iReal Pro's: Arial's widths for text, a condensed sans for chords, music signs
    import '@fontsource/arimo/latin-400.css';
    import '@fontsource/arimo/latin-700.css';
    import '@fontsource/roboto-condensed/latin-400.css';
    import '@fontsource/roboto-condensed/latin-700.css';
    import '@fontsource/noto-music/music-400.css';
    import '@fontsource/noto-sans-sundanese/sundanese-400.css';
    import { isPlaying, type ChartTimeline } from '$lib/chords/chartTimeline';
    import { chordTransposer } from '$lib/chords/chordSymbols';
    import { iRealRows, type IRealSong } from '$lib/chords/iRealPro';
    import { cellX, chartHeight, IREAL, rowTops, TEXT_FONT } from '$lib/chords/iRealLayout';
    import IRealCellView from './IRealCellView.svelte';
    import IRealText from './IRealText.svelte';
    import { squeezeTo } from './svgFit';

    /** An iReal Pro chart as iReal Pro draws it: a page of rows of 16 cells, scaled to the width */
    let { song, timeline, transpose, activeBar }: {
        song: IRealSong,
        timeline: ChartTimeline,
        transpose: number,
        activeBar: number | null,
    } = $props();

    let rows = $derived(iRealRows(song.cells));
    let tops = $derived(rowTops(rows));
    let transposeNote = $derived(chordTransposer(song.key, transpose));

    /** A bar line written between rows is drawn at both: the end of one row and the start of the next */
    const barEndOf = (r: number, i: number) => rows[r][i].barEnd
        ?? (i == rows[r].length - 1 && rows[r + 1]?.[0].barStart == '|' ? '|' : undefined);
</script>

<div class="px-1 pb-6 pt-3 sm:px-4">
    <svg viewBox="0 0 {IREAL.width} {chartHeight(rows, tops)}" class="mx-auto block w-full max-w-3xl text-gray-900" role="img" aria-label={song.title}>
        <g font-family={TEXT_FONT} fill="currentColor">
            <text x={IREAL.width / 2} y="22" font-size="18" font-weight="700" text-anchor="middle" {@attach squeezeTo(IREAL.width)}>{song.title}</text>
            {#if song.style}<text x="3" y="36" font-size="16">({song.style})</text>{/if}
            <text x={IREAL.width - 5} y="36" font-size="16" text-anchor="end">{song.composer}</text>
        </g>
        {#each rows as row, r}
            {#each row as cell, i (cell)}
                {#if isPlaying(timeline, activeBar, cell)}<rect x={cellX(i)} y={tops[r]} width={IREAL.cellWidth} height={IREAL.barHeight} class="fill-primary-200" />{/if}
            {/each}
        {/each}
        {#each rows as row, r}
            {#each row as cell, i (cell)}
                <IRealCellView {cell} x={cellX(i)} y={tops[r]} barEnd={barEndOf(r, i)} transpose={transposeNote} />
                {#if cell.comment}<IRealText comment={cell.comment} x={cellX(i)} y={tops[r]} />{/if}
            {/each}
        {/each}
    </svg>
</div>
