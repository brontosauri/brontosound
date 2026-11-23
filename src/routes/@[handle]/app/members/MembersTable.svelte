<script lang="ts">
    // The band's members, then (for owners) who is invited by handle, each with their role
    import { enhance } from "$app/forms";
    import { Badge, Button, Select, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { formatDate } from '$lib/dates';
    import { BandRole } from "$lib/dbEntities/band";
    import ConfirmBar from "$lib/components/controls/ConfirmBar.svelte";

    type Member = { id: number, role: BandRole, joinedDate: Date, userId: number, name: string, handle: string | null };
    type PendingInvite = { id: number, role: BandRole, name: string, handle: string | null };
    let { members, invites, manages, userId }: { members: Member[], invites: PendingInvite[], manages: boolean, userId?: number } = $props();

    const roles = Object.values(BandRole).map(role => ({ value: role, name: role }));
    const submitOnChange = (e: Event) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit();
    let revoking = $state<number | null>(null);
</script>

{#snippet who(name: string, handle: string | null)}
    {name}
    {#if handle}<span class="ms-2 text-sm font-normal text-gray-500">@{handle}</span>{/if}
{/snippet}

{#snippet roleSelect(action: string, field: string, id: number, role: BandRole, name: string)}
    <form method="POST" {action} use:enhance>
        <input type="hidden" name={field} value={id} />
        <Select name="role" size="sm" class="w-32" items={roles} value={role} placeholder="" aria-label="Role of {name}" onchange={submitOnChange} />
    </form>
{/snippet}

<Table>
    <TableHead>
        <TableHeadCell>Member</TableHeadCell>
        <TableHeadCell>Role</TableHeadCell>
        <TableHeadCell>Joined</TableHeadCell>
        {#if manages}<TableHeadCell class="w-px"><span class="sr-only">Actions</span></TableHeadCell>{/if}
    </TableHead>
    <TableBody>
        {#each members as member (member.id)}
            <TableBodyRow>
                <TableBodyCell>
                    {@render who(member.name, member.handle)}
                    {#if member.userId === userId}<span class="ms-2 text-sm font-normal text-gray-500">You</span>{/if}
                </TableBodyCell>
                <TableBodyCell>
                    {#if manages}{@render roleSelect('?/setRole', 'member', member.id, member.role, member.name)}{:else}<Badge>{member.role}</Badge>{/if}
                </TableBodyCell>
                <TableBodyCell>{formatDate(member.joinedDate)}</TableBodyCell>
                {#if manages}
                    <TableBodyCell>
                        <form method="POST" action="?/remove" use:enhance={({ cancel }) => { if (!confirm(`Remove ${member.name} from the band? They lose the songbook, gigs and contacts; what they added stays.`)) cancel(); }}>
                            <input type="hidden" name="member" value={member.id} />
                            <Button type="submit" size="xs" color="red" outline>Remove</Button>
                        </form>
                    </TableBodyCell>
                {/if}
            </TableBodyRow>
        {/each}
        {#each invites as invite (invite.id)}
            <TableBodyRow>
                {#if revoking === invite.id}
                    <TableBodyCell colspan={4} class="p-2">
                        <ConfirmBar action="?/revokeInvite" fields={{ invite: invite.id }} confirm="Revoke invite" onCancel={() => revoking = null}>
                            Revoke the invite for <strong>{invite.name}</strong>?
                        </ConfirmBar>
                    </TableBodyCell>
                {:else}
                    <TableBodyCell>{@render who(invite.name, invite.handle)}</TableBodyCell>
                    <TableBodyCell>{@render roleSelect('?/setInviteRole', 'invite', invite.id, invite.role, invite.name)}</TableBodyCell>
                    <TableBodyCell><Badge color="dark">invitation pending</Badge></TableBodyCell>
                    <TableBodyCell><Button size="xs" color="red" outline onclick={() => revoking = invite.id}>Revoke</Button></TableBodyCell>
                {/if}
            </TableBodyRow>
        {/each}
    </TableBody>
</Table>
