<script lang="ts">
    import { enhance } from "$app/forms";
    import { Badge, Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import Fa from "svelte-fa";
    import { faPlus } from "@fortawesome/free-solid-svg-icons";
    import { bandAppUrl } from "$lib/misc";
    import type { BandSummary } from "$lib/dbEntities/band";
    import FormStatus from "$lib/components/FormStatus.svelte";
    import SettingsCard from "$lib/components/settings/SettingsCard.svelte";

    let { bands, onlyOwnedBandIds, form }: { bands: BandSummary[], onlyOwnedBandIds: number[], form: { bandError?: string, leftBand?: string } | null } = $props();
</script>

<SettingsCard title="Your bands">
    {#snippet aside()}<Button href="/me/new-band"><Fa icon={faPlus} class="me-2" />Create a band</Button>{/snippet}
    {#if form?.bandError}
        <FormStatus status={{ state: 'failed', message: form.bandError }} />
    {:else if form?.leftBand}
        <FormStatus status={{ state: 'done', message: `You left ${form.leftBand}.` }} />
    {/if}
    {#if bands.length == 0}
        <p class="text-sm text-gray-700">You're in no band yet: create one, or open the invite link a band sent you.</p>
    {:else}
        <Table>
            <TableHead>
                <TableHeadCell>Band</TableHeadCell>
                <TableHeadCell>Your role</TableHeadCell>
                <TableHeadCell class="w-px"><span class="sr-only">Actions</span></TableHeadCell>
            </TableHead>
            <TableBody>
                {#each bands as band (band.id)}
                    <TableBodyRow>
                        <TableBodyCell>
                            <a href={bandAppUrl(band.handle)} class="font-medium text-gray-900">{band.name}</a>
                            <span class="ms-2 text-sm font-normal text-gray-500">@{band.handle}</span>
                        </TableBodyCell>
                        <TableBodyCell><Badge>{band.role}</Badge></TableBodyCell>
                        <TableBodyCell class="whitespace-nowrap">
                            {#if onlyOwnedBandIds.includes(band.id)}
                                <span class="text-sm font-normal text-gray-500">Only owner: hand over to leave</span>
                            {:else}
                                <form method="POST" action="?/leaveBand" use:enhance>
                                    <input type="hidden" name="band" value={band.id} />
                                    <Button type="submit" size="xs" color="red" outline>Leave band</Button>
                                </form>
                            {/if}
                        </TableBodyCell>
                    </TableBodyRow>
                {/each}
            </TableBody>
        </Table>
    {/if}
</SettingsCard>
