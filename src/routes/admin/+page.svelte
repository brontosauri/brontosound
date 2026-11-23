<script lang="ts">
    import { formatDate } from '$lib/dates';
    import { faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
    import { enhance } from '$app/forms';
    import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
    import StatPanel from '$lib/components/StatPanel.svelte';

    let { data } = $props();
</script>

<p class="mb-8 text-gray-700">The herd at a glance: people and bands, never what's inside a band.</p>

{#if !data.emailReady}
    <div class="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900">
        <span>Outgoing email isn't set up: invites and password links are passed on by hand, and there are no password resets.</span>
        <a href="/admin/settings" class="font-medium text-primary-800">Set up email</a>
    </div>
{/if}

{#each data.reports as report (report.id)}
    <div class="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary-300 bg-primary-50 px-5 py-4 text-sm text-gray-900">
        <span><a href="/@{report.handle}" class="font-medium text-primary-800">@{report.handle}</a> was reported{report.reporter ? ` by ${report.reporter}` : ''} on {formatDate(report.date)}: "{report.reason}"</span>
        <span class="flex gap-2">
            <form method="POST" action="?/dismissReport" use:enhance><input type="hidden" name="report" value={report.id} /><Button type="submit" size="xs" color="light">Dismiss</Button></form>
            <form method="POST" action="?/hideProfile" use:enhance><input type="hidden" name="report" value={report.id} /><Button type="submit" size="xs" color="red" outline>Hide profile</Button></form>
        </span>
    </div>
{/each}

<div class="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
    <StatPanel title="Users" icon={faUser} href="/admin/users" stats={[
        { label: "Users", value: data.people.users },
        { label: "Admins", value: data.people.admins },
        { label: "Joined this month", value: data.people.joinedThisMonth },
    ]}>
        {#if data.people.suspended > 0}
            <p class="text-sm text-gray-700">{data.people.suspended} suspended</p>
        {/if}
    </StatPanel>
    <StatPanel title="Bands" icon={faUsers} href="/admin/bands" stats={[
        { label: "Bands", value: data.bands.bands },
        { label: "Created this month", value: data.bands.createdThisMonth },
        { label: "On their own WebDAV", value: data.bands.onWebdav },
    ]}>
        {#if data.bands.suspended > 0}
            <p class="text-sm text-gray-700">{data.bands.suspended} suspended</p>
        {/if}
    </StatPanel>
</div>

<h2 class="mb-4 mt-12 text-xl font-bold text-gray-900">Recently in the herd</h2>
{#if data.recent.length == 0}
    <p class="text-sm text-gray-700">Nothing yet: add people in Users, or let them create bands.</p>
{:else}
    <Table>
        <TableHead><TableHeadCell>Date</TableHeadCell><TableHeadCell>What happened</TableHeadCell></TableHead>
        <TableBody>
            {#each data.recent as event}
                <TableBodyRow>
                    <TableBodyCell class="font-normal">{formatDate(event.date)}</TableBodyCell>
                    <TableBodyCell class="font-normal">{event.what}</TableBodyCell>
                </TableBodyRow>
            {/each}
        </TableBody>
    </Table>
{/if}
