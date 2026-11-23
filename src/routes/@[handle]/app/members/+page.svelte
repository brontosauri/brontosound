<script lang="ts">
    import { Alert, Badge, Heading } from "flowbite-svelte";
    import PageTitle from "$lib/components/PageTitle.svelte";
    import InviteByHandle from "./InviteByHandle.svelte";
    import InviteLinkCard from "./InviteLinkCard.svelte";
    import MembersTable from "./MembersTable.svelte";
    import SeatsMeter from "./SeatsMeter.svelte";

    let { data, form } = $props();
</script>

<PageTitle title="Members">
    {#snippet actions()}
        {#if data.seats && data.seats.limit !== null}<SeatsMeter taken={data.seats.taken} limit={data.seats.limit} />{/if}
    {/snippet}
</PageTitle>

{#if form && 'error' in form}
    <Alert color="red" class="mb-4">{form.error}</Alert>
{/if}

<!-- Drawn again after each change: a refused change shows what was kept -->
{#key form}
    <MembersTable members={data.members} invites={data.invites ?? []} manages={!!data.seats} userId={data.brontoSession?.user.id} />

    {#if data.seats && data.validUntil}
        <div class="mt-10 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
            <InviteByHandle full={data.seats.left === 0} />
            <InviteLinkCard link={data.link ?? null} seatsLeft={data.seats.left} validUntil={data.validUntil} herdMembersOnly={!!data.herdMembersOnly} />
        </div>
    {/if}
{/key}

<section class="mt-12 max-w-2xl space-y-2 text-sm text-gray-700">
    <Heading tag="h2" class="mb-2 text-xl">What each role can do</Heading>
    <div><Badge class="me-2">owner</Badge>Everything editors do, plus members, band settings and storage. A band can have several owners.</div>
    <div><Badge class="me-2">editor</Badge>Adds and changes songs, gigs, venues and contacts. Uses Backline.</div>
    <div><Badge class="me-2">viewer</Badge>Reads everything and plays along. Changes nothing.</div>
</section>
