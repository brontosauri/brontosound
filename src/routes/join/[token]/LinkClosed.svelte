<script lang="ts">
    // An invite link that no longer works, and why when it helps
    import { page } from "$app/state";
    import { Button, Heading, P } from "flowbite-svelte";
    import Fa from "svelte-fa";
    import { faLink } from "@fortawesome/free-solid-svg-icons";
    import type { LinkEnd } from "$lib/server/inviteLinks";

    let { reason, bandName }: { reason: LinkEnd | null, bandName: string | null } = $props();
    const why: Record<LinkEnd, string> = $derived({
        'expired': '',
        'used up': 'All places are taken.',
        'revoked': `Revoked by ${bandName}.`,
        'band full': `${bandName} is full.`,
    });
</script>

<div class="flex flex-col items-center gap-6 text-center">
    <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl text-gray-500"><Fa icon={faLink} /></span>
    <Heading tag="h1" class="text-3xl">{reason === 'expired' ? 'This invite link has expired' : 'This invite link no longer works'}</Heading>
    {#if reason && why[reason]}<P>{why[reason]}</P>{/if}
    <Button color="light" href="/">Go to {page.data.herdName}</Button>
</div>
