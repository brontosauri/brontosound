<script lang="ts">
    import { formatDate } from '$lib/dates';
    import { enhance } from "$app/forms";
    import { Alert, Badge, Button, Input, Select, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { HerdRole } from "$lib/dbEntities/user";
    import LinkToPass from "$lib/components/LinkToPass.svelte";
    import UserActions from "./UserActions.svelte";
    import HerdInvites from "./HerdInvites.svelte";

    let { data, form } = $props();
    let search = $state('');
    let filter = $state('all');
    let managing = $state<number | null>(null);

    const filters = [{ value: 'all', name: 'All users' }, { value: 'admins', name: 'Admins' }, { value: 'suspended', name: 'Suspended' }];
    let shown = $derived(data.users.filter(user =>
        [user.name, user.handle, user.email].some(field => field?.toLowerCase().includes(search.trim().toLowerCase()))
        && (filter != 'admins' || user.herdRole == HerdRole.ADMIN) && (filter != 'suspended' || user.suspended)));
</script>

{#if form && 'error' in form}
    <Alert color="red" class="mb-4">{form.error}</Alert>
{:else if form && 'emailed' in form}
    <Alert color="green" class="mb-4">Emailed {form.emailed} a link to set their password.</Alert>
{:else if form?.passwordLink}
    <div class="mb-6">
        <LinkToPass url={form.passwordLink.url}>
            {form.passwordLink.notSent ? "Couldn't email it: check outgoing email in Herd settings. " : ''}Send this link to {form.passwordLink.name}: it sets their password, once, within 7 days, and isn't shown again.
        </LinkToPass>
    </div>
{/if}

<div class="mb-4 flex flex-wrap gap-4">
    <Input type="search" class="max-w-sm" bind:value={search} placeholder="Search by name, handle or email" />
    <Select class="w-48" items={filters} bind:value={filter} placeholder="" />
</div>

{#key form}
<Table>
    <TableHead>
        <TableHeadCell>User</TableHeadCell>
        <TableHeadCell>Email</TableHeadCell>
        <TableHeadCell>Herd role</TableHeadCell>
        <TableHeadCell>Bands</TableHeadCell>
        <TableHeadCell>Sign-in</TableHeadCell>
        <TableHeadCell>Joined</TableHeadCell>
        <TableHeadCell class="w-px"><span class="sr-only">Actions</span></TableHeadCell>
    </TableHead>
    <TableBody>
        {#each shown as user (user.id)}
            <TableBodyRow>
                <TableBodyCell class={user.suspended ? 'text-gray-500' : ''}>
                    {user.name}
                    {#if user.handle}<span class="ms-1 text-sm font-normal text-gray-500">@{user.handle}</span>{/if}
                    {#if user.suspended}<Badge color="red" class="ms-2">Suspended</Badge>{/if}
                </TableBodyCell>
                <TableBodyCell class="font-normal">{user.email ?? '—'}</TableBodyCell>
                <TableBodyCell><Badge color={user.herdRole == HerdRole.ADMIN ? 'dark' : 'primary'}>{user.herdRole}</Badge></TableBodyCell>
                <TableBodyCell class="font-normal">{user.bandCount}</TableBodyCell>
                <TableBodyCell>{#each user.signInMethods as method}<Badge class="me-1" color="none">{method}</Badge>{/each}</TableBodyCell>
                <TableBodyCell class="font-normal">{formatDate(user.creationDate)}</TableBodyCell>
                <TableBodyCell>
                    {#if user.builtIn}
                        <span class="text-sm font-normal text-gray-500" title="Its password is in config/config.json">Built-in</span>
                    {:else if user.id === data.brontoSession?.user.id}
                        <span class="text-sm font-normal text-gray-500">You</span>
                    {:else}
                        <Button size="xs" color="light" onclick={() => managing = managing === user.id ? null : user.id}>Manage</Button>
                    {/if}
                </TableBodyCell>
            </TableBodyRow>
            {#if managing === user.id}
                <TableBodyRow><TableBodyCell colspan={7} class="bg-gray-50"><UserActions {user} /></TableBodyCell></TableBodyRow>
            {/if}
        {/each}
    </TableBody>
</Table>
{/key}
<p class="mt-2 text-[13px] text-gray-500">Suspended people can't sign in; their bands keep working. Removing someone frees their handle; what they added stays with their bands.</p>

<HerdInvites invites={data.invites} emailReady={data.emailReady} {form} />
