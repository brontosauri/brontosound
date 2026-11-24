<script lang="ts" module>
    import type { ChartTimeline } from '$lib/chords/chartTimeline';
    import type { TrackLane } from '$lib/player/loadEngine';

    /** What the timeline draws: an audio file's waveform, a MIDI file's tracks, a chart's sections */
    export type TimelineView =
        | { kind: 'waveform', peaks: number[] }
        | { kind: 'tracks', lanes: { blocks: TrackLane, enabled: boolean }[] }
        | { kind: 'sections', timeline: ChartTimeline };
</script>

<script lang="ts">
    import { secondsPerBar } from '$lib/chords/chartTimeline';
    import type { Snap } from '$lib/player/snap';

    /**
     * The song from start to end: click to set the start point, drag to loop a part; hovering shows where a click lands.
     * Where a waiting jump goes blinks on the beat, as a launched clip does in a DAW: the playhead's mark, and the section.
     */
    let { view, duration, position, startPoint, startLabel, loopRange, waitingFor, snap, onSetStart, onSetLoop }: {
        view: TimelineView,
        duration: number,
        position: number,
        startPoint: number | null,
        startLabel: string,
        loopRange: [number, number] | null, // shown when looping
        waitingFor: number | null, // where a waiting jump goes
        snap: Snap,
        onSetStart: (time: number) => void,
        onSetLoop: (from: number, to: number) => void,
    } = $props();

    let element: HTMLButtonElement;
    let drag = $state<{ x: number, from: number, to: number | null } | null>(null);
    let hover = $state<number | null>(null); // with a mouse

    const percent = (time: number) => duration ? Math.min(100, Math.max(0, time / duration * 100)) : 0;
    let playedPercent = $derived(percent(position));
    let lit = $derived(snap.beat(position) % 2 == 0); // blinking, on the beat

    /** `time` is in [from, to), give or take rounding */
    const isWithin = (time: number, from: number, to: number) => time > from - 1e-6 && time < to - 1e-6;

    /** The section playing is highlighted; the one a jump waits for is outlined, and blinks */
    function sectionLook(from: number, to: number): string {
        const look = isWithin(position, from, to) ? 'bg-primary-200 text-gray-900' : 'bg-gray-100 text-gray-600';
        if (waitingFor === null || !isWithin(waitingFor, from, to)) return look;
        return `${look} ring-2 ring-inset ring-primary-700 ${lit ? 'motion-safe:bg-primary-700 motion-safe:text-white' : ''}`;
    }

    function timeAt(event: PointerEvent): number {
        const rect = element.getBoundingClientRect();
        return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * duration;
    }

    function startDrag(event: PointerEvent) {
        element.setPointerCapture(event.pointerId);
        drag = { x: event.clientX, from: timeAt(event), to: null };
    }

    function moveDrag(event: PointerEvent) {
        if (drag && Math.abs(event.clientX - drag.x) > 4) drag.to = timeAt(event);
        hover = event.pointerType == 'mouse' ? timeAt(event) : null;
    }

    function endDrag() {
        if (!drag) return;
        if (drag.to === null) onSetStart(snap.start(drag.from));
        else onSetLoop(snap.start(Math.min(drag.from, drag.to)), snap.end(Math.max(drag.from, drag.to)));
        drag = null;
    }

    /** With the keyboard, the start point goes where the playhead is */
    function setStartFromKeyboard(event: MouseEvent) {
        if (event.detail == 0) onSetStart(snap.start(position));
    }

    let shownRange = $derived(drag?.to != null ? [snap.start(Math.min(drag.from, drag.to)), snap.end(Math.max(drag.from, drag.to))] : loopRange);
    let landing = $derived(hover !== null && !drag ? snap.start(hover) : null);
</script>

{#snippet waveform(peaks: number[], color: string)}
    {#each peaks as peak}<span class="flex-1 rounded-[1px] {color}" style="height: {Math.max(10, peak * 100)}%"></span>{/each}
{/snippet}

<button type="button" bind:this={element} aria-label="Set the start point" title="Click to set where every play starts, again to clear it; drag to loop a part"
    class="relative block h-[60px] min-w-0 flex-[1_1_360px] touch-none text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
    onpointerdown={startDrag} onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={() => drag = null} onpointerleave={() => hover = null} onclick={setStartFromKeyboard}>

    {#if shownRange}
        <span class="absolute bottom-0 top-5 border-x border-primary-400 bg-primary-50"
            style="left: {percent(shownRange[0])}%; width: {percent(shownRange[1]) - percent(shownRange[0])}%"></span>
    {/if}

    <span class="absolute inset-x-0 bottom-0 top-5 block">
        {#if view.kind == 'waveform'}
            <!-- grey, and orange up to the playhead -->
            <span class="absolute inset-0 flex items-center gap-0.5">{@render waveform(view.peaks, 'bg-gray-300')}</span>
            <span class="absolute inset-0 flex items-center gap-0.5" style="clip-path: inset(0 {100 - playedPercent}% 0 0)">{@render waveform(view.peaks, 'bg-primary-700')}</span>
        {:else if view.kind == 'tracks'}
            <span class="flex h-full flex-col justify-center gap-0.5">
                {#each view.lanes as lane}
                    <span class="relative block h-2">
                        {#each lane.blocks as block}
                            <span class="absolute inset-y-0 rounded-sm {lane.enabled ? 'bg-primary-700' : 'bg-gray-200'}" style="left: {block.left}%; width: {block.width}%"></span>
                        {/each}
                    </span>
                {/each}
            </span>
        {:else}
            <!-- placed by time, as the playhead is, 3 px apart -->
            {@const bar = secondsPerBar(view.timeline)}
            {#each view.timeline.sections as section}
                {@const from = section.bars.first * bar}
                {@const to = from + section.bars.count * bar}
                <span class="absolute inset-y-[3px] flex items-center overflow-hidden rounded text-[13px] font-medium {sectionLook(from, to)}"
                    style="left: calc({percent(from)}% + 1.5px); width: calc({percent(to) - percent(from)}% - 3px)">
                    <span class="truncate px-2.5">{section.name}</span>
                </span>
            {/each}
        {/if}
    </span>

    {#if landing !== null}
        <span class="absolute inset-y-0 border-l border-dashed border-gray-600" style="left: {percent(landing)}%"></span>
        <span class="absolute top-0 h-[18px] whitespace-nowrap rounded border border-gray-300 bg-white px-1.5 text-xs font-medium leading-4 text-gray-700"
            style="left: {percent(landing)}%">{snap.label(landing)}</span>
    {/if}
    {#if startPoint !== null}
        <span class="absolute inset-y-0 -ml-px w-0.5 bg-primary-700" style="left: {percent(startPoint)}%"></span>
        <span class="absolute top-0 h-[18px] whitespace-nowrap rounded border border-primary-300 bg-primary-100 px-1.5 text-xs font-bold leading-4 text-primary-900"
            style="left: {percent(startPoint)}%">{startLabel}</span>
    {/if}
    {#if waitingFor !== null}
        <span class="absolute bottom-0 top-5 -ml-px w-0.5 bg-gray-900 {lit ? '' : 'motion-safe:invisible'}" style="left: {percent(waitingFor)}%"></span>
    {/if}
    <span class="absolute bottom-0 top-5 -ml-px w-0.5 bg-gray-900" style="left: {playedPercent}%"></span>
</button>
