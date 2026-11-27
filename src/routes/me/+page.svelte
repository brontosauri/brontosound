<script lang="ts">
    import { onMount } from "svelte";
    import { replaceState } from "$app/navigation";
    import { page } from "$app/state";
    import { Button, Input, Label } from "flowbite-svelte";
    import SignOut from "../signin/SignOut.svelte";
    import BacklineLinks from "./BacklineLinks.svelte";
    import TwoStepSettings from "./TwoStepSettings.svelte";
    import { MIN_PASSWORD_LENGTH } from "$lib/passwordPolicy";
    import YourBands from "./YourBands.svelte";
    import YourInvites from "./YourInvites.svelte";
    import ProfileDetails from "./ProfileDetails.svelte";
    import DeleteAccount from "./DeleteAccount.svelte";
    import SaveForm from "$lib/components/settings/SaveForm.svelte";
    import SettingsCard from "$lib/components/settings/SettingsCard.svelte";

    let { data, form } = $props();

    // Just joined with an invite link (/join/<token>): said once, then the address forgets it
    // svelte-ignore state_referenced_locally
    const joined = data.bands.find(band => band.handle === page.url.searchParams.get('joined'));
    onMount(() => { if (joined) replaceState(page.url.pathname, {}); });
</script>

<p class="mb-6 text-gray-700">Signed in as {data.profile.login} ({data.profile.herdRole})</p>

<div class="max-w-3xl space-y-6">
    {#if joined}
        <p class="flex items-start gap-3 rounded-lg border border-primary-300 bg-primary-50 px-4 py-3 text-sm text-gray-900">
            <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-700"></span><span>You joined <strong>{joined.name}</strong>.</span>
        </p>
    {/if}

    <YourInvites invites={data.invites} />

    <YourBands bands={data.bands} onlyOwnedBandIds={data.onlyOwnedBandIds} {form} />

    <ProfileDetails profile={data.profile} />

    <SettingsCard title="Password">
        {#if data.profile.isDefaultAdmin}
            <p class="text-sm text-gray-700">This account's password is set in <code>config.json</code> (<code>adminPasswordHash</code>).</p>
        {:else}
            <SaveForm action="?/changePassword" label={data.profile.hasPassword ? 'Change password' : 'Set password'}>
                {#if data.profile.hasPassword}
                    <Label>Current password<Input name="currentPassword" type="password" class="mt-2" autocomplete="current-password" required /></Label>
                {/if}
                <div class="grid gap-4 md:grid-cols-2">
                    <Label>New password<Input name="newPassword" type="password" class="mt-2" autocomplete="new-password" minlength={MIN_PASSWORD_LENGTH} required /></Label>
                    <Label>Repeat new password<Input name="confirmPassword" type="password" class="mt-2" autocomplete="new-password" minlength={MIN_PASSWORD_LENGTH} required /></Label>
                </div>
                <p class="text-[13px] text-gray-500">You will be signed out on all devices.</p>
            </SaveForm>
        {/if}
    </SettingsCard>

    <TwoStepSettings enabled={data.profile.twoStepEnabled} setup={data.twoStepSetup} hasPassword={data.profile.hasPassword} error={form?.twoStepError} />

    <BacklineLinks links={data.backlineLinks} />

    <SettingsCard title="Sign out">
        <div class="flex flex-wrap gap-3">
            <SignOut options={{ redirectTo: '/signin' }} />
            <form method="POST" action="?/signOutEverywhere">
                <Button color="light" type="submit">Sign out everywhere</Button>
            </form>
        </div>
    </SettingsCard>

    <SettingsCard title="Your data">
        <p class="text-sm text-gray-700">Your account, profile, bands and what you added, as JSON. Band owners export each band's content in its settings.</p>
        <Button href="/me/data" color="light" class="w-fit" download data-sveltekit-reload>Download your data</Button>
    </SettingsCard>

    {#if !data.profile.isDefaultAdmin}
        <DeleteAccount error={form?.deleteError} />
    {/if}
</div>
