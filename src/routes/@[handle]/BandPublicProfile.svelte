<script lang="ts">
    import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import BandLogo from '$lib/components/BandLogo.svelte';
    import { formatDate } from '$lib/dates';
    import type { BandProfile } from '$lib/server/publicProfiles';
    import ProfileHero from './ProfileHero.svelte';

    let { profile, herdDomain }: { profile: BandProfile, herdDomain: string } = $props();
</script>

<ProfileHero name={profile.name} handle={profile.handle} {herdDomain} tags={profile.genres} city={profile.city}>
    {#snippet picture()}<BandLogo src={profile.logo} size="lg" />{/snippet}
    {#snippet actions()}
        {#if profile.publicEmail}<Button color="light" href="mailto:{profile.publicEmail}">Email the band</Button>{/if}
    {/snippet}
</ProfileHero>

<div class="flex flex-wrap items-start gap-10">
    <div class="flex min-w-0 flex-[999_1_520px] flex-col gap-10">
        {#if profile.about}
            <section class="space-y-3">
                <h2 class="text-xl font-bold text-gray-900">About</h2>
                <p class="max-w-2xl whitespace-pre-line text-gray-700">{profile.about}</p>
            </section>
        {/if}
        {#if profile.gigs.length}
            <section class="space-y-3">
                <h2 class="text-xl font-bold text-gray-900">Upcoming gigs</h2>
                <Table>
                    <TableHead><TableHeadCell>Date</TableHeadCell><TableHeadCell>Venue</TableHeadCell><TableHeadCell>City</TableHeadCell></TableHead>
                    <TableBody>
                        {#each profile.gigs as gig}
                            <TableBodyRow>
                                <TableBodyCell>{formatDate(gig.date)}</TableBodyCell>
                                <TableBodyCell class="font-normal">{gig.venue}</TableBodyCell>
                                <TableBodyCell class="font-normal">{gig.city}</TableBodyCell>
                            </TableBodyRow>
                        {/each}
                    </TableBody>
                </Table>
            </section>
        {/if}
    </div>

    <aside class="flex min-w-0 flex-[1_1_280px] flex-col gap-8">
        {#if profile.members.length || profile.hiddenMembers}
            <section class="space-y-3">
                <h2 class="text-xl font-bold text-gray-900">Members</h2>
                {#each profile.members as member}
                    <a href={member.handle ? `/@${member.handle}` : undefined} class="flex items-center gap-3 text-gray-900">
                        <Avatar name={member.name} src={member.avatar} size="sm" />
                        <span class="flex flex-col"><span class="font-medium">{member.name}</span><span class="text-[13px] text-gray-500">{member.instruments}</span></span>
                    </a>
                {/each}
                {#if profile.hiddenMembers}
                    <p class="text-[13px] text-gray-500">{profile.hiddenMembers} more member{profile.hiddenMembers == 1 ? ' keeps their' : 's keep their'} profile private.</p>
                {/if}
            </section>
        {/if}
        {#if profile.links.length}
            <section class="space-y-2">
                <h2 class="text-xl font-bold text-gray-900">Links</h2>
                {#each profile.links as link}
                    <a href={link} rel="nofollow noopener" class="block truncate text-sm font-medium text-primary-800">{link.replace(/^https?:\/\//, '')}</a>
                {/each}
            </section>
        {/if}
        <p class="text-sm text-gray-500">In the herd since {formatDate(profile.since)}</p>
    </aside>
</div>
