<script lang="ts">
    import type { IRealComment } from '$lib/chords/iRealPro';
    import { IREAL, TEXT_FONT } from '$lib/chords/iRealLayout';
    import { keepBefore } from './svgFit';

    /**
     * Text written on an iReal Pro chart, from its cell at x on the row at y: below the bar unless raised,
     * spaces kept, moved left to stay on the page.
     */
    let { comment, x, y }: { comment: IRealComment, x: number, y: number } = $props();

    // Rhythms are written with ♩ ♪ ♫ ♬ and lined up with spaces, for iOS, which draws these notes
    // about 0.8 em wide: Noto Music's are narrower, so they get the room around them iOS gives.
    const NOTE = /([♩♪♫♬])/;
</script>

<!-- on one line: whitespace between the tags would show -->
<text y={y + 67 - comment.raise} font-family={TEXT_FONT} font-size="18.9" fill="currentColor" class="whitespace-pre" {@attach keepBefore(IREAL.width - 1, IREAL.left - 8)}>{#each comment.lines as line, i}<tspan x={x + 2} dy={i ? IREAL.textLineHeight : 0}>{#each line.split(NOTE) as run, j}{#if j % 2}<tspan dx="0.18em" letter-spacing="0.36em">{run}</tspan>{:else}{run}{/if}{/each}</tspan>{/each}</text>
