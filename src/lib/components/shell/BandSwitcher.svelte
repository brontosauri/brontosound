<script lang="ts">
    // The band you're in, opening a menu of your other bands and your profile
    import Fa from 'svelte-fa';
    import { faChevronDown, faPlus, faUser } from '@fortawesome/free-solid-svg-icons';
    import type { BandSummary } from '$lib/dbEntities/band';
    import { bandAppUrl } from '$lib/misc';

    let { band, bands }: { band: BandSummary, bands: BandSummary[] } = $props();
    let open = $state(false);
    const item = 'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-900 hover:bg-gray-100';
</script>

<div class="mb-4">
    <button type="button" aria-expanded={open} onclick={() => open = !open}
        class="flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left hover:bg-gray-100">
        <span class="flex min-w-0 flex-col">
            <span class="truncate font-medium text-gray-900">{band.name}</span>
            <span class="text-[13px] text-gray-500">{band.role}</span>
        </span>
        <Fa icon={faChevronDown} size="xs" class="ms-auto" />
    </button>
    {#if open}
        <nav class="mt-2 flex flex-col gap-0.5 rounded-lg border border-gray-200 p-2" aria-label="Your bands">
            {#each bands.filter(other => other.id !== band.id) as other (other.id)}
                <a href={bandAppUrl(other.handle)} class={item}>{other.name}<span class="ms-auto text-[13px] text-gray-500">{other.role}</span></a>
            {/each}
            <a href="/me/new-band" class={item}><Fa icon={faPlus} size="sm" />Create a band</a>
            <a href="/me" class={item}><Fa icon={faUser} size="sm" />Your profile</a>
        </nav>
    {/if}
</div>
