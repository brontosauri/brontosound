<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    import { formatDate } from '$lib/dates';
    import { enhance } from "$app/forms";
    import { Alert, Badge, Button, Input, Select, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { BandStorage } from "$lib/dbEntities/band";

    let { data, form } = $props();
    let search = $state('');
    let filter = $state('all');
    let managing = $state<number | null>(null);

    const filters = [{ value: 'all', name: 'All bands' }, { value: 'herd', name: 'Herd storage' }, { value: 'webdav', name: 'Own WebDAV' }, { value: 'suspended', name: 'Suspended' }];
    let shown = $derived(data.bands.filter(band =>
        [band.name, band.handle].some(field => field.toLowerCase().includes(search.trim().toLowerCase()))
        && (filter == 'all' || filter == band.storage || (filter == 'suspended' && band.suspended))));
</script>

<p class="mb-6 text-gray-700">You see what each band is, not what's inside it: songbooks, gigs and contacts stay private to its members.</p>

{#if form && 'error' in form}
    <Alert color="red" class="mb-4">{form.error}</Alert>
{/if}

<div class="mb-4 flex flex-wrap gap-4">
    <Input type="search" class="max-w-sm" bind:value={search} placeholder="Search by name or handle" />
    <Select class="w-48" items={filters} bind:value={filter} placeholder="" />
</div>

{#key form}
<Table>
    <TableHead>
        <TableHeadCell>Band</TableHeadCell>
        <TableHeadCell>Owners</TableHeadCell>
        <TableHeadCell>Members</TableHeadCell>
        <TableHeadCell>Storage</TableHeadCell>
        <TableHeadCell>Created</TableHeadCell>
        <TableHeadCell class="w-px"><span class="sr-only">Actions</span></TableHeadCell>
    </TableHead>
    <TableBody>
        {#each shown as band (band.id)}
            <TableBodyRow>
                <TableBodyCell class={band.suspended ? 'text-gray-500' : ''}>
                    {band.name}<span class="ms-1 text-sm font-normal text-gray-500">@{band.handle}</span>
                    {#if band.suspended}<Badge color="red" class="ms-2">Suspended</Badge>{/if}
                </TableBodyCell>
                <TableBodyCell class="font-normal">{band.owners.join(', ')}</TableBodyCell>
                <TableBodyCell class="font-normal">{band.memberCount}</TableBodyCell>
                <TableBodyCell class="font-normal">{band.storage == BandStorage.WEBDAV ? 'Own WebDAV' : 'Herd storage'}</TableBodyCell>
                <TableBodyCell class="font-normal">{formatDate(band.creationDate)}</TableBodyCell>
                <TableBodyCell><Button size="xs" color="light" onclick={() => managing = managing === band.id ? null : band.id}>Manage</Button></TableBodyCell>
            </TableBodyRow>
            {#if managing === band.id}
                <TableBodyRow>
                    <TableBodyCell colspan={6} class="bg-gray-50">
                        <div class="flex flex-wrap items-end gap-6 py-2">
                            <form method="POST" action="?/rename" class="flex items-end gap-2" use:enhance>
                                <input type="hidden" name="band" value={band.id} />
                                <label class="text-sm font-medium text-gray-900">Handle<Input name="handle" size="sm" class="mt-1 w-44" autocomplete="off" {...verbatim} value={band.handle} required /></label>
                                <Button type="submit" size="xs" color="light">Rename</Button>
                            </form>
                            <form method="POST" action={band.suspended ? '?/restore' : '?/suspend'} use:enhance>
                                <input type="hidden" name="band" value={band.id} />
                                <Button type="submit" size="xs" color="light">{band.suspended ? 'Restore' : 'Suspend'}</Button>
                            </form>
                            <form method="POST" action="?/delete" class="flex items-end gap-2" use:enhance>
                                <input type="hidden" name="band" value={band.id} />
                                <label class="text-sm font-medium text-gray-900">To delete, type its handle<Input name="confirmation" size="sm" class="mt-1 w-44" autocomplete="off" {...verbatim} placeholder={band.handle} required /></label>
                                <Button type="submit" size="xs" color="red">Delete permanently</Button>
                            </form>
                        </div>
                    </TableBodyCell>
                </TableBodyRow>
            {/if}
        {/each}
    </TableBody>
</Table>
{/key}
<p class="mt-2 text-[13px] text-gray-500">Suspending locks a band for its members; nothing is deleted. Deleting removes its songbook, gigs, venues and contacts, and empties its herd storage.</p>
