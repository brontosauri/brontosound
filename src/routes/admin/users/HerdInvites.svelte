<script lang="ts">
    // Inviting people into the herd, and the invitations not accepted yet
    import { formatDate } from '$lib/dates';
    import { enhance } from "$app/forms";
    import { Alert, Badge, Button, Input, Label, Select, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { HerdRole } from "$lib/dbEntities/user";
    import LinkToPass from "$lib/components/LinkToPass.svelte";
    import type { HerdInviteItem } from "$lib/server/herdInvites";
    import type { ActionData } from "./$types";

    let { invites, emailReady, form }: { invites: HerdInviteItem[], emailReady: boolean, form: ActionData } = $props();
    const roles = Object.values(HerdRole).map(role => ({ value: role, name: role }));
    const expired = (invite: HerdInviteItem) => new Date(invite.expiresDate) < new Date();
</script>

<section class="mt-12 max-w-3xl space-y-4">
    <h2 class="text-xl font-bold text-gray-900">Invite someone</h2>
    <p class="text-sm text-gray-700">
        They pick their display name, handle and password. By email, their account gets that address.
        A link has no email: send it yourself, and whoever opens it signs in with their handle.
        {#if !emailReady}Outgoing email isn't set up in Herd settings: until it is, invitations by email wait below.{/if}
    </p>
    <form method="POST" action="?/invite" class="flex flex-wrap items-end gap-4" use:enhance>
        <Label>Email<Input name="email" type="email" class="mt-2 w-72" placeholder="name@example.com" required /></Label>
        <Label>Herd role<Select name="herdRole" class="mt-2 w-32" items={roles} value={HerdRole.USER} placeholder="" /></Label>
        <Button type="submit">Send invitation</Button>
        <Button type="submit" color="light" formaction="?/inviteLink" formnovalidate>Make a link instead</Button>
    </form>

    {#if form && 'inviteError' in form}
        <Alert color="red">{form.inviteError}</Alert>
    {:else if form && 'invited' in form}
        <Alert color="green">Emailed an invitation to {form.invited}.</Alert>
    {:else if form && 'inviteNotSent' in form}
        <Alert color="red">Couldn't email the invitation to {form.inviteNotSent}. Check outgoing email in Herd settings, then send it again below.</Alert>
    {:else if form?.inviteLink}
        {#key form.inviteLink}
            <LinkToPass url={form.inviteLink}>Send this link to who you invite. It works once, for 14 days, and isn't shown again.</LinkToPass>
        {/key}
    {/if}

    {#if invites.length > 0}
        <h3 class="pt-4 text-lg font-bold text-gray-900">Invitations not accepted yet</h3>
        <Table>
            <TableHead>
                <TableHeadCell>Invited</TableHeadCell>
                <TableHeadCell>Herd role</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Expires</TableHeadCell>
                <TableHeadCell class="w-px"><span class="sr-only">Actions</span></TableHeadCell>
            </TableHead>
            <TableBody>
                {#each invites as invite (invite.id)}
                    <TableBodyRow>
                        <TableBodyCell class="font-normal">{invite.email ?? 'Whoever has the link'}</TableBodyCell>
                        <TableBodyCell><Badge color={invite.herdRole == HerdRole.ADMIN ? 'dark' : 'primary'}>{invite.herdRole}</Badge></TableBodyCell>
                        <TableBodyCell class="font-normal">
                            {#if expired(invite)}<Badge color="none">Expired</Badge>
                            {:else if invite.notSent}<Badge color="red">Not sent</Badge>
                            {:else}{invite.email ? 'Emailed' : 'Link'}{/if}
                        </TableBodyCell>
                        <TableBodyCell class="font-normal">{formatDate(invite.expiresDate)}</TableBodyCell>
                        <TableBodyCell class="flex gap-2 whitespace-nowrap">
                            <form method="POST" action={invite.email ? '?/sendAgain' : '?/newInviteLink'} use:enhance>
                                <input type="hidden" name="invite" value={invite.id} />
                                <Button type="submit" size="xs" color="light">{invite.email ? 'Send again' : 'New link'}</Button>
                            </form>
                            <form method="POST" action="?/withdrawInvite" use:enhance>
                                <input type="hidden" name="invite" value={invite.id} />
                                <Button type="submit" size="xs" color="red" outline>Withdraw</Button>
                            </form>
                        </TableBodyCell>
                    </TableBodyRow>
                {/each}
            </TableBody>
        </Table>
        <p class="text-[13px] text-gray-500">Sending again, or a new link, gives 14 more days; the earlier link stops working.</p>
    {/if}
</section>
