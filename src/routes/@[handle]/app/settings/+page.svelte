<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button, Checkbox, Input, Label, Radio, Textarea } from "flowbite-svelte";
    import { BandStorage } from "$lib/dbEntities/band";
    import { Visibility } from "$lib/dbEntities/user";
    import { can } from "$lib/permissions";
    import StorageMeter from "./StorageMeter.svelte";
    import BandLogo from "$lib/components/BandLogo.svelte";
    import PictureUpload from "$lib/components/PictureUpload.svelte";
    import FormStatus from "$lib/components/FormStatus.svelte";
    import SaveForm from "$lib/components/settings/SaveForm.svelte";
    import SettingsCard from "$lib/components/settings/SettingsCard.svelte";

    let { data, form } = $props();
    const owner = $derived(can(data.brontoSession, 'band.manage'));
    let storage = $state(BandStorage.HERD);
    let savedStorage: BandStorage | undefined;
    $effect.pre(() => { // follow the saved choice, but not other reloads: a connection test keeps the unsaved one
        if (data.settings.storage != savedStorage) storage = savedStorage = data.settings.storage;
    });
</script>

<p class="mb-6 text-gray-700">{owner ? 'Owners change these.' : 'Owners change these; editors and viewers can read them.'}</p>

<div class="max-w-3xl space-y-6">
    <SettingsCard title="General">
        <div class="flex items-center gap-4">
            <BandLogo src={data.band.logo} size="lg" />
            {#if owner}
                <PictureUpload action="?/uploadLogo" label={data.band.logo ? 'Replace logo' : 'Upload logo'} hint="A dark logo on a transparent background, PNG or WebP up to 500 KB: the header shows it white." />
            {:else}
                <p class="text-sm text-gray-700">The band's logo. Owners change it.</p>
            {/if}
        </div>
        <SaveForm action="?/rename" canSave={owner}>
            <Label>Band name<Input name="name" class="mt-2" value={data.settings.name} maxlength={100} disabled={!owner} required /></Label>
            <Label>Handle
                <Input class="mt-2" value="@{data.band.handle}" disabled />
                <p class="mt-1 text-[13px] font-normal text-gray-500">Permanent: it will identify the band across herds. The herd's admins can change it.</p>
            </Label>
        </SaveForm>
    </SettingsCard>

    <SettingsCard title="Public profile">
        {#snippet aside()}<a href="/@{data.band.handle}" class="text-sm font-medium text-primary-800">View it</a>{/snippet}
        <SaveForm action="?/saveProfile" canSave={owner}>
            <p class="text-sm text-gray-700">What the herd and the web see at /@{data.band.handle}. Songs, gigs in pursuit and contacts are never shown.</p>
            <div class="grid gap-3 md:grid-cols-2">
                <Radio name="visibility" value={Visibility.PUBLIC} group={data.profile.visibility} disabled={!owner} class="rounded-lg border border-gray-200 p-4">Public: anyone with the link</Radio>
                <Radio name="visibility" value={Visibility.HIDDEN} group={data.profile.visibility} disabled={!owner} class="rounded-lg border border-gray-200 p-4">Hidden: members only</Radio>
            </div>
            <Label>About the band<Textarea name="about" class="mt-2" rows={3} value={data.profile.about} maxlength={2000} disabled={!owner} /></Label>
            <div class="grid gap-4 md:grid-cols-2">
                <Label>Genres<Input name="genres" class="mt-2" value={data.profile.genres} placeholder="post-punk, indie rock" disabled={!owner} /></Label>
                <Label>City<Input name="city" class="mt-2" value={data.profile.city} placeholder="Optional" disabled={!owner} /></Label>
                <Label>Public email<Input name="publicEmail" type="email" class="mt-2" value={data.profile.publicEmail} placeholder="Optional" disabled={!owner} /></Label>
            </div>
            <Label>Links, one per line<Textarea name="links" class="mt-2" rows={3} value={data.profile.links.join('\n')} placeholder="https://…" disabled={!owner} /></Label>
            <Checkbox name="showGigs" checked={data.profile.showGigs} disabled={!owner}>Show upcoming gigs: date, venue and city of confirmed gigs</Checkbox>
            <Checkbox name="showMembers" checked={data.profile.showMembers} disabled={!owner}>Show members whose own profile allows it</Checkbox>
        </SaveForm>
    </SettingsCard>

    <SettingsCard title="Storage">
        <SaveForm action="?/saveStorage" canSave={owner}>
            <p class="text-sm text-gray-700">Where your songs live: readmes, charts, recordings.</p>
            <div class="grid gap-3 md:grid-cols-2">
                <Radio name="storage" value={BandStorage.HERD} bind:group={storage} disabled={!owner} class="rounded-lg border border-gray-200 p-4">Herd storage, on this herd's server</Radio>
                {#if data.webdavAllowed}
                    <Radio name="storage" value={BandStorage.WEBDAV} bind:group={storage} disabled={!owner} class="rounded-lg border border-gray-200 p-4">Your own WebDAV: Nextcloud or any WebDAV server</Radio>
                {:else}
                    <p class="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">Your own WebDAV: not on this herd.</p>
                {/if}
            </div>
            {#if storage == BandStorage.HERD}
                {#if data.herdStorage}
                    <StorageMeter used={data.herdStorage.used} limit={data.herdStorage.limit} />
                    <p class="text-[13px] text-gray-500">The herd's admins set this limit. Need more? Ask them, or use your own WebDAV.</p>
                {/if}
            {:else}
                <div class="grid gap-4 md:grid-cols-2">
                    <Label>Server<Input name="webdavServer" class="mt-2" value={data.settings.webdavServer} placeholder="https://cloud.example.com/remote.php/dav/files/band" disabled={!owner} required /></Label>
                    <Label>Songs folder<Input name="webdavSongsFolder" class="mt-2" value={data.settings.webdavSongsFolder} disabled={!owner} required /></Label>
                    {#if owner}
                        <Label>Username<Input name="webdavUsername" class="mt-2" value={data.settings.webdavUsername} /></Label>
                        <Label>Password<Input name="webdavPassword" type="password" class="mt-2" autocomplete="off" placeholder="Saved: type to replace it" /></Label>
                    {/if}
                </div>
                {#if owner}
                    <div class="flex flex-wrap items-center gap-4">
                        <Button type="submit" formaction="?/testStorage" color="light">Test connection</Button>
                        {#if form?.test}
                            {#each [['Read', form.test.read], ['Write', form.test.write]] as [check, problem]}
                                <span class="flex items-center gap-1 text-sm"><span class="h-2.5 w-2.5 rounded-full {problem ? 'bg-red-700' : 'bg-green-500'}"></span>{check}{problem ? `: ${problem}` : ''}</span>
                            {/each}
                        {/if}
                    </div>
                    <p class="text-[13px] text-gray-500">Brontosound reads and writes only inside the songs folder.</p>
                {/if}
            {/if}
            {#if owner}
                <p class="rounded-lg border border-primary-300 bg-primary-50 p-3 text-sm text-gray-900">Switching doesn't move your files: copy the songs folder to the new place first, then switch.</p>
            {/if}
        </SaveForm>
    </SettingsCard>

    {#if owner}
        <form method="POST" action="?/delete" class="space-y-4 border-t border-gray-200 pt-6" use:enhance>
            <h2 class="text-xl font-bold text-gray-900">Delete the band</h2>
            <p class="text-sm text-gray-700">Deletes the songbook, gigs, venues and contacts of {data.band.name} for all its members, and empties its herd storage. Files on your own WebDAV stay where they are. This can't be undone.</p>
            <div class="flex flex-wrap items-end gap-4">
                <Label>Type its handle to confirm<Input name="confirmation" class="mt-2 w-56" placeholder={data.band.handle} required /></Label>
                <Button type="submit" color="red">Delete {data.band.name}</Button>
                {#if form?.deleteError}<FormStatus status={{ state: 'failed', message: form.deleteError }} />{/if}
            </div>
        </form>
    {/if}
</div>
