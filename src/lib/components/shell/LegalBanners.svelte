<script lang="ts">
    // Above signed-in pages: changes to the herd's legal texts until they take effect, or the person closes them
    import { onMount } from 'svelte';
    import { Alert } from 'flowbite-svelte';
    import Fa from 'svelte-fa';
    import { faXmark } from '@fortawesome/free-solid-svg-icons';
    import { page } from '$app/state';
    import { formatDate } from '$lib/dates';
    import { LEGAL_TITLES, type LegalChange } from '$lib/legal';

    const key = (change: LegalChange) => `legalChangeClosed:${change.document}:${change.effectiveDate}`;
    let closed = $state<string[]>((page.data.legalChanges ?? []).map(key)); // until the browser says otherwise: no flash on load
    onMount(() => {
        try { closed = closed.filter(k => localStorage.getItem(k) !== '1'); } catch { closed = []; }
    });

    function close(change: LegalChange) {
        closed.push(key(change));
        try { localStorage.setItem(key(change), '1'); } catch { /* shown again next time */ }
    }
</script>

{#each (page.data.legalChanges ?? []) as LegalChange[] as change}
    {#if !closed.includes(key(change))}
        <Alert color="yellow" class="mb-4 flex items-start justify-between gap-3">
            <span>
                {page.data.herdName} updates its {LEGAL_TITLES[change.document]} on {formatDate(change.effectiveDate)}.
                <a href="/{change.document}/{change.effectiveDate}" class="font-medium underline">See what changes</a>
            </span>
            <button type="button" onclick={() => close(change)} aria-label="Close" class="rounded p-1 hover:bg-yellow-100"><Fa icon={faXmark} /></button>
        </Alert>
    {/if}
{/each}
