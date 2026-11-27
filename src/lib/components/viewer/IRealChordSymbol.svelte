<script lang="ts">
    import type { IRealChord } from '$lib/chords/iRealPro';
    import { CHORD_FONT } from '$lib/chords/iRealLayout';
    import { squeezeTo } from './svgFit';

    /**
     * A chord the iReal Pro way, at full size, in its cell's units (origin at the top of the bar line):
     * the root large with its accidental raised, the quality low beside it, the bass under a slash.
     * Small and alternate chords are this, transformed.
     */
    let { chord, transpose }: {
        chord: IRealChord,
        transpose: (note: string) => string,
    } = $props();

    // Noto Music's, sized and raised to where iReal Pro draws its own
    const ACCIDENTALS: Record<string, { sign: string, y: number, size: number }> = {
        b: { sign: '♭', y: 23.4, size: 34.6 },
        '#': { sign: '♯', y: 17.8, size: 31 },
    };
    const QUALITY_SIGNS: Record<string, string> = { '^': '△', '-': '−', h: 'ø', o: '°', b: '♭', '#': '♯' };
    const prettyQuality = (quality: string) => quality.replace(/[\^\-hob#]/g, sign => QUALITY_SIGNS[sign]);

    let root = $derived(chord.root == 'W' ? '' : transpose(chord.root)); // W: an invisible root
    let bass = $derived(chord.bass && transpose(chord.bass));
</script>

<!-- A note name in a 32 × 42 box: the letter fills its height, the accidental raised at its right -->
{#snippet noteName(note: string, transform: string)}
    <g {transform}>
        <text x="-0.8" y="41.6" font-size="43.3" font-weight="700" transform="scale(0.86 1)">{note[0]}</text>
        {#if note[1]}
            {@const { sign, y, size } = ACCIDENTALS[note[1]]}
            <text x="19" {y} font-size={size} stroke="currentColor" stroke-width="0.9">{sign}</text><!-- stroked: iReal Pro's are bolder -->
        {/if}
    </g>
{/snippet}

<g font-family={CHORD_FONT} fill="currentColor">
    {#if root}{@render noteName(root, 'translate(3 0)')}{/if}
    {#if chord.quality || chord.custom}
        <text x="24.5" y="43.5" font-size="24" {@attach squeezeTo(32)}>{prettyQuality(chord.quality)}{chord.custom ?? ''}</text>
    {/if}
    {#if bass}
        <polygon points="12.5,55.5 14.7,55.5 25.3,41.7 23.1,41.7" />
        {@render noteName(bass, 'translate(22 38) scale(0.595)')}
    {/if}
</g>
