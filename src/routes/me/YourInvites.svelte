<script lang="ts">
    import { formatDate } from '$lib/dates';
    import { enhance } from "$app/forms";
    import { Button, Heading } from "flowbite-svelte";

    let { invites }: { invites: { id: number, role: string, expiresDate: Date, bandName: string, by: string | null }[] } = $props();
</script>

{#if invites.length > 0}
    <section class="space-y-3">
        <Heading tag="h2" class="text-xl">Invites</Heading>
        {#each invites as invite (invite.id)}
            <div class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary-300 bg-primary-50 px-5 py-4">
                <div>
                    <p class="text-gray-900"><strong>{invite.bandName}</strong> invites you as {invite.role}</p>
                    <p class="text-[13px] text-gray-500">{invite.by ? `From ${invite.by} · ` : ''}expires on {formatDate(invite.expiresDate)}</p>
                </div>
                <div class="flex gap-2">
                    <form method="POST" action="?/declineInvite" use:enhance>
                        <input type="hidden" name="invite" value={invite.id} />
                        <Button type="submit" size="sm" color="light">Decline</Button>
                    </form>
                    <form method="POST" action="?/acceptInvite" use:enhance>
                        <input type="hidden" name="invite" value={invite.id} />
                        <Button type="submit" size="sm">Join {invite.bandName}</Button>
                    </form>
                </div>
            </div>
        {/each}
    </section>
{/if}
