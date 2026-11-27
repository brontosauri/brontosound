<script lang="ts">
    import { IREAL } from '$lib/chords/iRealLayout';

    /** A bar line as iReal Pro draws it, at x: single, double, final, or a repeat bracket with its dots */
    let { kind, x = 0 }: { kind: '|' | '[' | ']' | '{' | '}' | 'Z', x?: number } = $props();

    // Strokes as [offset from x, width]
    const STROKES: Record<string, [number, number][]> = {
        '|': [[0, 1.5]],
        '[': [[-1.5, 1.5], [1.5, 1.5]],
        ']': [[-0.5, 1.5], [2.5, 1.5]],
        Z: [[-1, 1.5], [2, 3]],
    };
    const height = IREAL.barHeight;
</script>

<g fill="currentColor">
    {#if kind == '{' || kind == '}'}
        <!-- a thick stroke whose ends curl round the dots; a closing one is the opening one mirrored -->
        <g transform="translate({x} 0) scale({kind == '{' ? 1 : -1} 1)">
            <rect x="-2" y="-2" width="3.2" height={height + 4} />
            <path d="M-2 -2C1 -2 3 -2.6 4.6 -4.6L5.4 -3.8C4 -1.2 2.6 0.4 1.2 0.6Z" />
            <path d="M-2 {height + 2}C1 {height + 2} 3 {height + 2.6} 4.6 {height + 4.6}L5.4 {height + 3.8}C4 {height + 1.2} 2.6 {height - 0.4} 1.2 {height - 0.6}Z" />
            <circle cx="2.9" cy={height / 2 - 4} r="1.2" />
            <circle cx="2.9" cy={height / 2 + 4} r="1.2" />
        </g>
    {:else}
        {#each STROKES[kind] as [offset, width]}<rect x={x + offset} {width} {height} />{/each}
    {/if}
</g>
