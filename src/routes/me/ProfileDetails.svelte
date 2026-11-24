<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    import { Input, Label, Radio, Select, Textarea, Toggle } from "flowbite-svelte";
    import { Visibility } from "$lib/dbEntities/user";
    import { LOCALES } from "$lib/locales";
    import Avatar from "$lib/components/Avatar.svelte";
    import PictureUpload from "$lib/components/PictureUpload.svelte";
    import SaveForm from "$lib/components/settings/SaveForm.svelte";
    import SettingsCard from "$lib/components/settings/SettingsCard.svelte";

    let { profile }: {
        profile: { name: string, handle: string | null, avatar: string | null, about: string, instruments: string, city: string, website: string, visibility: Visibility, showBands: boolean, locale: string | null },
    } = $props();
</script>

<SettingsCard title="Your details">
    <div class="flex items-center gap-4">
        <Avatar name={profile.name} src={profile.avatar} />
        <PictureUpload action="?/uploadAvatar" label={profile.avatar ? 'Replace picture' : 'Upload picture'} hint="PNG, JPEG or WebP, up to 500 KB." />
    </div>
    <SaveForm action="?/saveDetails">
        <div class="grid gap-4 md:grid-cols-2">
            <Label>Display name<Input name="name" class="mt-2" autocomplete="name" value={profile.name} maxlength={100} required /></Label>
            <Label>Handle
                {#if profile.handle}
                    <Input class="mt-2" value="@{profile.handle}" disabled />
                {:else}
                    <Input name="handle" class="mt-2" autocomplete="off" {...verbatim} placeholder="Pick yours: it can't change later" maxlength={30} />
                {/if}
            </Label>
            <Label>Language and dates<Select name="locale" class="mt-2" items={[{ value: '', name: "The herd's" }, ...LOCALES]} value={profile.locale ?? ''} placeholder="" /></Label>
        </div>
    </SaveForm>
</SettingsCard>

<SettingsCard title="Public profile">
    {#snippet aside()}
        {#if profile.handle}<a href="/@{profile.handle}" class="text-sm font-medium text-primary-800">View it</a>{/if}
    {/snippet}
    <SaveForm action="?/saveProfile">
        <p class="text-sm text-gray-700">Who can open your profile{profile.handle ? `, /@${profile.handle}` : ''}. Your bands' members always can.</p>
        <div class="grid gap-3 md:grid-cols-2">
            <Radio name="visibility" value={Visibility.PUBLIC} group={profile.visibility} class="rounded-lg border border-gray-200 p-4">Public: anyone with the link</Radio>
            <Radio name="visibility" value={Visibility.HIDDEN} group={profile.visibility} class="rounded-lg border border-gray-200 p-4">Hidden: only your bands' members</Radio>
        </div>
        <Label>About you<Textarea name="about" class="mt-2" rows={3} value={profile.about} maxlength={2000} /></Label>
        <div class="grid gap-4 md:grid-cols-2">
            <Label>Instruments<Input name="instruments" class="mt-2" value={profile.instruments} placeholder="Optional" maxlength={100} /></Label>
            <Label>City<Input name="city" class="mt-2" value={profile.city} placeholder="Optional" maxlength={100} /></Label>
        </div>
        <Label>Website<Input name="website" class="mt-2" inputmode="url" autocomplete="url" {...verbatim} value={profile.website} placeholder="Optional: https://…" maxlength={300} /></Label>
        <Toggle name="showBands" checked={profile.showBands}>Show my bands on my profile, and me among their public members</Toggle>
    </SaveForm>
</SettingsCard>
