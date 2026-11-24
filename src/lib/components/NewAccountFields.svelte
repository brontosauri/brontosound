<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    // What everyone picks for a new account (registration.ts): display name, handle and password; and the herd's rules
    import { Checkbox, Input, Label } from "flowbite-svelte";
    import slugify from "slugify";
    import { MIN_PASSWORD_LENGTH } from "$lib/passwordPolicy";

    let { rules }: { rules: string[] } = $props();
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
{#if rules.length}
    <div class="space-y-2 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
        {#each rules as rule}<p>{rule}</p>{/each}
    </div>
    <Checkbox name="rules" required>I've read the herd's rules.</Checkbox>
{/if}
