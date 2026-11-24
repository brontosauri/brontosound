<script lang="ts">
    import { faPlay } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import { fileTypeLabel } from '$lib/songFiles/fileTypes';
    import type { PlayerSource } from '$lib/player/loadEngine';

    /** What the player plays: the file's name, and its type, or Metronome for a chart */
    let { source, class: className = '' }: { source: PlayerSource, class?: string } = $props();
</script>

<div class="flex min-w-0 items-center gap-2.5 {className}">
    <span class="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-charcoal text-[9px] text-white"><Fa icon={faPlay} size="xs" /></span>
    <div class="flex min-w-0 flex-col">
        <span class="truncate text-[15px] font-medium text-gray-900">{source.file.name}</span>
        <span class="text-[13px] text-gray-500">{source.kind == 'chart' ? 'Metronome' : fileTypeLabel(source.file)}</span>
    </div>
</div>
