<script lang="ts">
    import { faBackwardStep, faChevronUp, faPause, faPlay, faRepeat, faSliders, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import { untrack } from 'svelte';
    import type { PlayerSource } from '$lib/player/loadEngine';
    import { formatTime, PlayerState } from '$lib/player/playerState.svelte';
    import { songFileUrl } from '$lib/songFiles/songFile';
    import type { SoundfontChoice } from '$lib/soundfonts';
    import BottomSheet from '../controls/BottomSheet.svelte';
    import DeleteConfirmRow from '../controls/DeleteConfirmRow.svelte';
    import PinButton from '../controls/PinButton.svelte';
    import ToggleButton from '../controls/ToggleButton.svelte';
    import PlayerExtras from './PlayerExtras.svelte';
    import PlayerSettings from './PlayerSettings.svelte';
    import SourceLabel from './SourceLabel.svelte';
    import Timeline from './Timeline.svelte';

    /**
     * The player, fixed to the bottom of the screen, made for practising (docs/songPage.md):
     * Space plays and pauses, every play starts from the start point, arrows move 5 s (a bar on a chart).
     * Practice settings, pin and delete show with Options. On phones it's a single bar that opens a sheet with every control.
     */
    let { editable, songId, source, autoplay, chartInViewer, transpose = $bindable(), position = $bindable(), pinned, soundfonts, onTogglePin, onClose, onDeleteFile }: {
        editable: boolean, // pin and delete the file
        songId: number,
        source: PlayerSource, // an audio or MIDI file, or a chart's track
        autoplay: boolean, // play `source` once it loads
        chartInViewer: boolean, // `source` is the chart in the viewer, which follows it
        transpose: number, // the chart's key, shared with the viewer
        position: number, // seconds, for the viewer to follow a chart
        pinned: boolean,
        soundfonts: SoundfontChoice, // for MIDI files
        onTogglePin: () => void,
        onClose: () => void, // empty the player
        onDeleteFile: () => Promise<void>, // delete the audio or MIDI file from storage
    } = $props();

    let fileActions = $derived(editable && source.kind == 'file'); // pin and delete
    const player = untrack(() => new PlayerState(songId, () => source, () => autoplay)); // until the player closes
    const transport = player.transport;
    let soundfont = $state(untrack(() => soundfonts.selected)); // kept from file to file
    let optionsOpen = $state(false);
    let sheetOpen = $state(false); // phones
    let confirmingDelete = $state<string | null>(null); // the path of the file asked about

    $effect(() => { position = transport.position; });

    let startLabel = $derived(transport.startPoint === null ? '' : player.isChart ? `Bar ${player.barOf(transport.startPoint)}` : formatTime(transport.startPoint));
    let playedPercent = $derived(transport.duration ? transport.position / transport.duration * 100 : 0);
    let playLabel = $derived(transport.playing ? 'Pause (Space)' : 'Play (Space)');
    let backLabel = $derived(transport.startPoint === null ? 'Go to the beginning' : 'Go to the start point');

    /** Keys work anywhere on the page, except while typing */
    function onKeydown(event: KeyboardEvent) {
        if (!player.loaded || isTyping(event) || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.code == 'Space') transport.togglePlay();
        else if (event.key == 'ArrowLeft') transport.seekBy(-player.step);
        else if (event.key == 'ArrowRight') transport.seekBy(player.step);
        else return;
        event.preventDefault();
    }

    /** A focused button would also take Space as a click */
    function onKeyup(event: KeyboardEvent) {
        if (event.code == 'Space' && !isTyping(event)) event.preventDefault();
    }

    function isTyping(event: KeyboardEvent): boolean {
        const target = event.target as HTMLElement;
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
    }

    // The page scrolls clear of the player: one of the two bars is hidden, 0 px high
    let desktopHeight = $state(0);
    let phoneHeight = $state(0);
    $effect(() => {
        document.body.style.paddingBottom = `${desktopHeight + phoneHeight}px`;
        return () => { document.body.style.paddingBottom = ''; };
    });

    const iconButton = 'inline-flex shrink-0 items-center justify-center rounded-lg focus:outline-none focus:ring-4 focus:ring-primary-300';
    const outline = 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50';
    const sheetRow = 'min-h-[64px] justify-between border-b border-gray-200 py-2';
    const muted = 'text-gray-500 hover:bg-gray-100 hover:text-gray-900';
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} />

{#snippet playButton(size: string)}
    <button type="button" class="{iconButton} {size} bg-primary-700 text-white hover:bg-primary-800" disabled={!player.loaded}
        onclick={() => transport.togglePlay()} aria-label={playLabel} title={playLabel}>
        <Fa icon={transport.playing ? faPause : faPlay} size="lg" />
    </button>
{/snippet}

{#snippet backButton(size: string)}
    <button type="button" class="{iconButton} {size} {outline}" disabled={!player.loaded} onclick={() => transport.goToStart()} aria-label={backLabel} title={backLabel}>
        <Fa icon={faBackwardStep} />
    </button>
{/snippet}

{#snippet timeline()}
    {#if player.view}
        <Timeline view={player.view} duration={transport.duration} position={transport.position} startPoint={transport.startPoint} {startLabel}
            loopRange={transport.loop ? transport.loopRange : null} snap={player.snap}
            onSetStart={time => transport.setStartPoint(time)} onSetLoop={(from, to) => transport.setLoop(from, to)} />
    {:else if player.loadError}
        <p class="flex-[1_1_360px] text-sm text-gray-600">
            Your browser can't play this file ({player.loadError}).
            {#if source.kind == 'file'}<a href={songFileUrl(songId, source.file, true)} class="font-medium text-primary-800 hover:text-primary-900">Download it</a>{/if}
        </p>
    {:else}
        <p class="flex-[1_1_360px] text-sm text-gray-500">Loading…</p>
    {/if}
{/snippet}

{#snippet startPoint(layout = '')}
    {#if transport.startPoint !== null}
        <span class="{layout} inline-flex h-9 shrink-0 whitespace-nowrap items-center gap-1 rounded-lg border border-primary-300 bg-primary-100 pl-3 pr-1 text-sm font-medium text-primary-900">
            Plays from {player.label(transport.startPoint)}
            <button type="button" class="{iconButton} h-7 w-7 rounded-md" onclick={() => transport.clearStartPoint()} aria-label="Play from the start" title="Play from the start"><Fa icon={faXmark} size="sm" /></button>
        </span>
    {/if}
{/snippet}

{#snippet optionsButton(layout: string)}
    <ToggleButton on={optionsOpen} onclick={() => optionsOpen = !optionsOpen} class="relative shrink-0 gap-2 text-sm {layout}">
        <Fa icon={faSliders} size="sm" />Options
        {#if player.changed && !optionsOpen}
            <span class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-700"><span class="sr-only">, a setting is changed</span></span>
        {/if}
    </ToggleButton>
{/snippet}

{#snippet closeButton(layout: string)}
    <button type="button" class="{iconButton} {layout} {muted}" onclick={onClose} aria-label="Close the player" title="Close the player"><Fa icon={faXmark} /></button>
{/snippet}

{#snippet deleteButton(layout: string)}
    <button type="button" aria-expanded={confirmingDelete == source.file.path} onclick={() => confirmingDelete = source.file.path}
        class="{iconButton} {layout} gap-2 border border-red-300 px-3 text-[13px] font-medium text-red-700 hover:bg-red-50">
        <Fa icon={faTrashCan} size="xs" />Delete
    </button>
{/snippet}

{#snippet confirmDelete()}
    {#if confirmingDelete == source.file.path}
        <DeleteConfirmRow name={source.file.name} onCancel={() => confirmingDelete = null} onConfirm={onDeleteFile} />
    {/if}
{/snippet}

<!-- From tablets up: the controls, then the options -->
<section aria-label="Player" bind:offsetHeight={desktopHeight}
    class="fixed inset-x-0 bottom-0 z-30 hidden flex-col border-t border-gray-200 bg-white md:flex">
    {@render confirmDelete()}
    <div class="flex flex-col gap-3 px-6 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            <SourceLabel {source} class="flex-[0_1_280px]" />
            <div class="flex items-center gap-3">
                {@render playButton('h-14 w-14')}
                {@render backButton('h-12 w-12')}
                <span class="w-[100px] text-center font-medium tabular-nums text-gray-900">
                    {formatTime(transport.position)} / {formatTime(transport.duration)}
                    {#if player.loaded?.kind == 'chart'}<span class="block text-[13px] font-normal text-gray-500">Bar {Math.min(player.barOf(transport.position), player.loaded.timeline.bars)} of {player.loaded.timeline.bars}</span>{/if}
                </span>
            </div>
            {@render timeline()}
            <div class="flex shrink-0 items-center gap-2">
                {@render startPoint()}
                <ToggleButton on={transport.loop} onclick={() => transport.loop = !transport.loop} class="h-[42px] shrink-0 gap-2 px-4 text-sm"><Fa icon={faRepeat} size="sm" />Loop</ToggleButton>
                {@render optionsButton('h-[42px] px-4')}
                {@render closeButton('ml-2 h-[42px] w-[42px]')}
            </div>
        </div>

        {#if optionsOpen}
            <div class="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <PlayerExtras {player} soundfonts={soundfonts.soundfonts} bind:soundfont />
                </div>
                <div class="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
                    <PlayerSettings {player} {source} {chartInViewer} bind:transpose />
                    {#if fileActions}
                        <div class="flex gap-2">
                            <PinButton {pinned} onToggle={onTogglePin} />
                            {@render deleteButton('h-9')}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</section>

<!-- Phones: one bar, which opens the sheet -->
<section aria-label="Player" bind:offsetHeight={phoneHeight}
    class="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
    <span class="absolute -top-px left-0 h-[3px] bg-primary-700" style="width: {playedPercent}%"></span>
    <div class="flex items-center gap-1 py-3 pl-4 pr-2">
        {@render playButton('h-12 w-12')}
        <button type="button" class="ml-2 flex min-w-0 flex-1 flex-col gap-0.5 py-1 text-left" onclick={() => sheetOpen = true} aria-label="Open the player">
            <span class="w-full truncate text-[15px] font-medium text-gray-900">{source.file.name}</span>
            <span class="text-[13px] tabular-nums text-gray-500">{formatTime(transport.position)} / {formatTime(transport.duration)}</span>
        </button>
        <button type="button" class="{iconButton} h-11 w-11 text-gray-700" onclick={() => sheetOpen = true} aria-label="Open the player"><Fa icon={faChevronUp} /></button>
        {@render closeButton('h-11 w-11')}
    </div>
</section>

{#if sheetOpen}
    <BottomSheet label="Player" onClose={() => sheetOpen = false}>
        {#snippet corner()}{@render closeButton('h-11 w-11')}{/snippet}
        <SourceLabel {source} class="mt-1" />

        <div class="mt-4 flex flex-col">
            <div class="flex">{@render timeline()}</div>
            <div class="mt-2 flex justify-between text-[13px] tabular-nums text-gray-500">
                <span>{formatTime(transport.position)}</span><span>{formatTime(transport.duration)}</span>
            </div>
        </div>

        <div class="mt-4 flex items-center gap-2">
            {@render playButton('h-16 w-16')}
            {@render backButton('h-[52px] w-[52px]')}
            <span class="flex-1"></span>
            <ToggleButton on={transport.loop} onclick={() => transport.loop = !transport.loop} class="h-11 shrink-0 gap-2 text-sm"><Fa icon={faRepeat} size="sm" />Loop</ToggleButton>
            {@render optionsButton('h-11')}
        </div>
        {@render startPoint('mt-4 self-center')}

        {#if optionsOpen}
            <div class="mt-5 flex flex-col border-t border-gray-200">
                <PlayerSettings {player} {source} {chartInViewer} bind:transpose itemClass={sheetRow} />
                <PlayerExtras {player} soundfonts={soundfonts.soundfonts} bind:soundfont itemClass={sheetRow} />
            </div>
            {#if fileActions}
                <div class="-mx-6 mt-5 flex flex-col">
                    <div class="grid grid-cols-2 gap-2 px-6">
                        <PinButton {pinned} onToggle={onTogglePin} class="h-11 justify-center gap-2" />
                        {@render deleteButton('h-11')}
                    </div>
                    <div class="mt-3">{@render confirmDelete()}</div>
                </div>
            {/if}
        {/if}
    </BottomSheet>
{/if}
