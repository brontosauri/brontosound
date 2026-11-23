<script lang="ts">
    import { enhance } from '$app/forms';
    import { Alert, Button, Label, Select } from 'flowbite-svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import BandLogo from '$lib/components/BandLogo.svelte';
    import { BandRole } from '$lib/dbEntities/band';
    import { formatDate } from '$lib/dates';
    import type { UserProfile } from '$lib/server/publicProfiles';
    import ProfileHero from './ProfileHero.svelte';

    let { profile, herdDomain, form }: { profile: UserProfile, herdDomain: string, form: { error?: string, invited?: string } | null } = $props();
    let inviting = $state(false);
    const roles = Object.values(BandRole).map(role => ({ value: role, name: role }));
</script>

<ProfileHero name={profile.name} handle={profile.handle} {herdDomain} tags={profile.instruments} city={profile.city}>
    {#snippet picture()}<Avatar name={profile.name} src={profile.avatar} size="lg" />{/snippet}
    {#snippet actions()}
        {#if profile.invitableBands.length}<Button onclick={() => inviting = !inviting}>Invite to your band</Button>{/if}
    {/snippet}
</ProfileHero>

{#if form?.error}
    <Alert color="red">{form.error}</Alert>
{:else if form?.invited}
    <Alert color="green">Invited {form.invited}: they find it in their profile.</Alert>
{/if}
{#if inviting}
    <form method="POST" action="?/invite" class="flex flex-wrap items-end gap-4 rounded-lg border border-primary-300 bg-primary-50 p-5" use:enhance>
        <Label>Band<Select name="band" class="mt-2 w-56" items={profile.invitableBands} value={profile.invitableBands[0].value} placeholder="" /></Label>
        <Label>Role<Select name="role" class="mt-2 w-40" items={roles} value={BandRole.EDITOR} placeholder="" /></Label>
        <Button type="submit">Send invite</Button>
        <p class="basis-full text-[13px] text-gray-500">{profile.name} sees it in their profile and decides. Invites expire after 14 days.</p>
    </form>
{/if}

<div class="flex flex-wrap items-start gap-10">
    <div class="flex min-w-0 flex-[999_1_520px] flex-col gap-10">
        {#if profile.about}
            <section class="space-y-3">
                <h2 class="text-xl font-bold text-gray-900">About</h2>
                <p class="max-w-2xl whitespace-pre-line text-gray-700">{profile.about}</p>
            </section>
        {/if}
        {#if profile.bands.length}
            <section class="space-y-3">
                <h2 class="text-xl font-bold text-gray-900">Bands</h2>
                <div class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                    {#each profile.bands as band}
                        <a href="/@{band.handle}" class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 font-medium text-gray-900">
                            <BandLogo src={band.logo} />{band.name}
                        </a>
                    {/each}
                </div>
            </section>
        {/if}
    </div>
    <aside class="flex min-w-0 flex-[1_1_280px] flex-col gap-2 text-sm text-gray-500">
        <p>In the herd since {formatDate(profile.since)}</p>
        {#if profile.website}<a href={profile.website} rel="nofollow noopener" class="font-medium text-primary-800">{profile.website.replace(/^https?:\/\//, '')}</a>{/if}
    </aside>
</div>
