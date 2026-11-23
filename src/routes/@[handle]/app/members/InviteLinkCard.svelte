<script lang="ts">
    // The band's invite link, for viewers: made with its people and day; while it works, copied, changed (saved as
    // changed) or revoked
    import { enhance } from "$app/forms";
    import type { SubmitFunction } from "@sveltejs/kit";
    import { Badge, Button, Input, Label } from "flowbite-svelte";
    import Fa from "svelte-fa";
    import { faCheck, faCopy, faXmark } from "@fortawesome/free-solid-svg-icons";
    import ConfirmBar from "$lib/components/controls/ConfirmBar.svelte";

    type Link = { url: string, places: number, joined: number, until: string };
    let { link, seatsLeft, validUntil, herdMembersOnly }: {
        link: Link | null,
        seatsLeft: number | null, // null: no limit
        validUntil: { min: string, max: string, initial: string },
        herdMembersOnly: boolean, // registrations are closed
    } = $props();

    let copied = $state(false);
    let revoking = $state(false);

    function copy(url: string) {
        navigator.clipboard.writeText(url).then(() => {
            copied = true;
            setTimeout(() => copied = false, 2000);
        });
    }
    const submitOnChange = (e: Event) => (e.currentTarget as HTMLInputElement).form?.requestSubmit();
    const keepValues: SubmitFunction = () => async ({ update }) => update({ reset: false });
</script>

{#snippet linkFields(action: string, places: number, until: string, min: number, max: number | null, saveOnChange: boolean)}
    <form method="POST" {action} class="flex flex-wrap items-end gap-4" use:enhance={keepValues}>
        <Label class="w-28">People
            <Input type="number" name="places" class="mt-2" {min} max={max ?? undefined} value={places} required onchange={saveOnChange ? submitOnChange : undefined} />
        </Label>
        <Label class="w-44">Valid until
            <Input type="date" name="until" class="mt-2" min={validUntil.min} max={validUntil.max} value={until} required onchange={saveOnChange ? submitOnChange : undefined} />
        </Label>
        {#if !saveOnChange}<Button type="submit">Create link</Button>{/if}
    </form>
{/snippet}

<section class="space-y-4 rounded-lg border border-gray-200 p-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-xl font-bold text-gray-900">Invite by link</h2>
        <span class="text-sm text-gray-600">as <Badge>viewer</Badge></span>
    </div>

    {#if herdMembersOnly && seatsLeft !== 0}
        <p class="text-sm text-gray-600">The herd is closed to new accounts: only people already in it can join with the link.</p>
    {/if}

    {#if link && revoking}
        <ConfirmBar action="?/revokeLink" confirm="Revoke link" onCancel={() => revoking = false}>Revoke the link?</ConfirmBar>
    {:else if link}
        <div class="flex gap-2">
            <Input readonly value={link.url} aria-label="Invite link" class="min-w-0 font-mono text-sm" />
            <Button class="w-[42px] shrink-0 !p-0" aria-label={copied ? 'Copied' : 'Copy link'} title={copied ? 'Copied' : 'Copy link'} onclick={() => copy(link.url)}>
                <Fa icon={copied ? faCheck : faCopy} />
            </Button>
            <Button color="red" outline class="w-[42px] shrink-0 !p-0" aria-label="Revoke link" title="Revoke link" onclick={() => revoking = true}>
                <Fa icon={faXmark} />
            </Button>
        </div>
        {@render linkFields('?/updateLink', link.places, link.until, Math.max(1, link.joined), seatsLeft === null ? null : link.places + seatsLeft, true)}
        <p class="text-[13px] text-gray-500">{link.joined} / {link.places} joined</p>
    {:else if seatsLeft === 0}
        <Badge color="dark">No seats left</Badge>
    {:else}
        {@render linkFields('?/createLink', 1, validUntil.initial, 1, seatsLeft, false)}
    {/if}
</section>
