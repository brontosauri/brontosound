<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    // What everyone picks for a new account (registration.ts): display name, handle and password; and the Terms
    import { Input, Label } from "flowbite-svelte";
    import TermsCheckboxes from "./TermsCheckboxes.svelte";
    import slugify from "slugify";
    import { MIN_PASSWORD_LENGTH } from "$lib/passwordPolicy";

    let { terms }: { terms: { minimumAge: number, consent: string } } = $props();
    let name = $state('');
    let handle = $state('');
    let handleEdited = $state(false);
    $effect(() => {
        if (!handleEdited) handle = slugify(name, { lower: true, strict: true }).slice(0, 30);
    });
</script>

<Label>Display name<Input name="name" class="mt-2" bind:value={name} autocomplete="name" maxlength={100} required /></Label>
<Label>Handle
    <div class="mt-2 flex">
        <span class="inline-flex items-center rounded-s-lg border border-e-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-700">@</span>
        <Input name="handle" class="rounded-s-none" bind:value={handle} oninput={() => handleEdited = true} autocomplete="username" {...verbatim} maxlength={30} required />
    </div>
    <p class="mt-1 text-[13px] font-normal text-gray-500">You sign in with it, and it's your public address, at /@{handle || 'handle'}. People and bands share these names, and a handle can't change later.</p>
</Label>
<Label>Password
    <Input name="password" type="password" class="mt-2" minlength={MIN_PASSWORD_LENGTH} autocomplete="new-password" required />
    <p class="mt-1 text-[13px] font-normal text-gray-500">At least {MIN_PASSWORD_LENGTH} characters. Passwords found in data breaches are refused.</p>
</Label>
<TermsCheckboxes {terms} />
